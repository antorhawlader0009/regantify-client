import { useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bluetooth, Cable, Camera, MonitorSmartphone, Printer, ScanBarcode, Usb } from 'lucide-react';
import { PosPage } from '../../../components/pos/PosLayout';
import { Field, Panel, PosButton, PosInput } from '../../../components/pos/ui';
import { CameraScanner } from '../../../components/pos/sell/CameraScanner';
import { RECEIPT_PROFILE_KEY } from '../../../components/pos/receipt/useReceiptPrinter';
import { posApi } from '../../../lib/posApi';
import { openCustomerDisplay } from '../../../lib/posDisplay';
import {
  connectedPrinter,
  connectPrinter,
  disconnectPrinter,
  kickDrawer,
  onPrinterChange,
  printerSupport,
  printSlip,
  readPrinterPrefs,
  readScannerSettings,
  SCANNER_DEFAULTS,
  writePrinterPrefs,
  writeScannerSettings,
  type PrinterKind,
} from '../../../lib/posHardware';
import { toast } from '../../../lib/toast';

/*
 * POS > Hardware (POS-system-plan.md Step 12): the receipt printer and cash drawer, the barcode
 * scanner, the camera and the customer screen. Everything here is for THIS device (browser);
 * set it up on each counter.
 */

export default function PosHardwarePage() {
  return <PosPage title="Hardware">{() => <HardwareBody />}</PosPage>;
}

function Section({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <Panel>
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 text-pos-muted">{icon}</span>
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-pos-muted">{text}</p>
        </div>
      </div>
      {children}
    </Panel>
  );
}

function HardwareBody() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-pos-muted">These settings are kept on this computer or tablet only. Set them up on each counter.</p>
      <PrinterSection />
      <ScannerSection />
      <CameraSection />
      <Section icon={<MonitorSmartphone size={18} />} title="Customer screen" text="A second window that shows the customer what you ring up, the total, the shop’s Bangla QR when they pay by QR, and their change.">
        <PosButton onClick={() => openCustomerDisplay() || toast.error('The browser blocked the new window. Allow pop-ups for this site.')}>Open the customer screen</PosButton>
        <p className="mt-2 text-xs text-pos-muted">Drag the window to the monitor facing the customer and press F11 for full screen. It follows the counter screen open in this same browser. The counter also has a “Customer screen” button.</p>
      </Section>
    </div>
  );
}

function PrinterSection() {
  const printer = useSyncExternalStore(onPrinterChange, connectedPrinterSnapshot);
  const support = printerSupport();
  const profile = useQuery({ queryKey: RECEIPT_PROFILE_KEY, queryFn: posApi.receiptProfile, staleTime: 60_000 });
  const [prefs, setPrefs] = useState(readPrinterPrefs);
  const [busy, setBusy] = useState(false);
  const testRef = useRef<HTMLDivElement>(null);
  const width = profile.data?.widthMm ?? 80;

  const savePrefs = (patch: Partial<typeof prefs>) => {
    const next = { ...readPrinterPrefs(), ...patch };
    writePrinterPrefs(next);
    setPrefs(next);
  };

  async function connect(kind: PrinterKind) {
    setBusy(true);
    try {
      const p = await connectPrinter(kind);
      setPrefs(readPrinterPrefs());
      toast.success(`Connected: ${p.name}`);
    } catch (err) {
      // Closing the browser's picker isn't an error worth a message.
      if (!(err instanceof DOMException && err.name === 'NotFoundError')) toast.error(err instanceof Error ? err.message : 'Couldn’t connect to the printer.');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!testRef.current) return;
    setBusy(true);
    try {
      const how = await printSlip(testRef.current, 'Printer test', width);
      if (how === 'direct') toast.success('Sent to the printer');
    } finally {
      setBusy(false);
    }
  }

  async function drawer() {
    try {
      if (!(await kickDrawer())) toast.error('Connect the printer first. Without it, set “open cash drawer” in the printer’s Windows driver.');
      else toast.success('Drawer opened');
    } catch {
      toast.error('The drawer didn’t open. Check the cable from the drawer to the printer.');
    }
  }

  const supported = support.serial || support.usb || support.bluetooth;
  return (
    <Section
      icon={<Printer size={18} />}
      title="Receipt printer and cash drawer"
      text="Connect the printer to print without the print dialog and open the drawer by itself. Without a connection everything still prints through the print dialog."
    >
      {!support.secure ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Direct printing needs the dashboard on https (or localhost). On this address it prints through the print dialog.</p>
      ) : !supported ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">This browser can’t talk to printers directly. Use Chrome or Microsoft Edge for that; until then it prints through the print dialog.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-pos-page px-3 py-2.5 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${printer ? 'bg-pos-go' : 'bg-pos-line'}`} aria-hidden />
            {printer ? (
              <>
                Connected: <span className="font-medium">{connectedPrinter()?.name}</span>
              </>
            ) : prefs.kind ? (
              'Not connected right now. Plug the printer in and connect again.'
            ) : (
              'No printer connected. Printing uses the print dialog.'
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {support.serial && (
              <PosButton onClick={() => connect('serial')} disabled={busy}>
                <Cable size={15} aria-hidden />
                USB printer (port)
              </PosButton>
            )}
            {support.usb && (
              <PosButton onClick={() => connect('usb')} disabled={busy}>
                <Usb size={15} aria-hidden />
                USB printer (direct)
              </PosButton>
            )}
            {support.bluetooth && (
              <PosButton onClick={() => connect('bluetooth')} disabled={busy}>
                <Bluetooth size={15} aria-hidden />
                Bluetooth printer
              </PosButton>
            )}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-pos-muted">
            <li>
              <b>Windows with the printer’s driver installed</b> (Xprinter and most others): choose <b>USB printer (port)</b> and pick the printer’s COM port.
            </li>
            <li>
              <b>Android tablet, Mac, or no driver</b>: <b>USB printer (direct)</b>. On Windows this only works when the maker’s driver isn’t holding the printer.
            </li>
            <li>
              <b>Bluetooth</b>: pair isn’t needed; pick the printer in the list. Needs a click again after the page reloads.
            </li>
          </ul>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Port speed (USB printer, port)" hint="Leave at 9600 unless the printer’s manual says otherwise.">
              <select value={prefs.baudRate} onChange={(e) => savePrefs({ baudRate: Number(e.target.value) })} className="h-10 w-full rounded-md border border-pos-line bg-pos-surface px-3 text-sm">
                {[9600, 19200, 38400, 57600, 115200].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-start gap-2.5 pt-6 text-sm">
              <input type="checkbox" checked={prefs.kickOnCash} onChange={(e) => savePrefs({ kickOnCash: e.target.checked })} className="mt-0.5" />
              <span>
                Open the cash drawer after a cash sale
                <span className="block text-xs text-pos-muted">Also for due paid in cash. The drawer plugs into the printer.</span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <PosButton variant="primary" onClick={test} disabled={busy}>
              Print a test
            </PosButton>
            <PosButton onClick={drawer} disabled={!printer}>
              Open the drawer
            </PosButton>
            {(printer || prefs.kind) && (
              <PosButton
                variant="quiet"
                onClick={() => {
                  void disconnectPrinter();
                  setPrefs(readPrinterPrefs());
                }}
              >
                Stop using it
              </PosButton>
            )}
          </div>
        </div>
      )}

      {/* The test slip, drawn off screen and printed like a receipt. */}
      <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0">
        <div ref={testRef} className="bg-white text-black" style={{ width: `${width - (width === 58 ? 6 : 8)}mm`, padding: '2mm 0 4mm', fontFamily: "'Hind Siliguri', Arial, sans-serif", fontSize: '9pt' }}>
          <p className="text-center font-bold" style={{ fontSize: '12pt' }}>
            {profile.data?.storeName ?? 'Printer test'}
          </p>
          <p className="text-center">Printer test · {width} mm</p>
          <p className="text-center">বাংলা লেখা ঠিকঠাক ছাপা হচ্ছে</p>
          <div className="my-[1.5mm] border-t border-dashed border-black" />
          <div className="flex justify-between">
            <span>Left edge</span>
            <span>Right edge</span>
          </div>
          <p>{new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</p>
        </div>
      </div>
    </Section>
  );
}

function connectedPrinterSnapshot() {
  const p = connectedPrinter();
  return p ? `${p.kind}:${p.name}` : '';
}

function ScannerSection() {
  const [settings, setSettings] = useState(readScannerSettings);
  const [keys, setKeys] = useState<Array<{ key: string; gap: number }>>([]);
  const [result, setResult] = useState<{ code: string; scan: boolean; slowest: number } | null>(null);
  const last = useRef(0);

  function onKey(e: ReactKeyboardEvent<HTMLInputElement>) {
    const now = performance.now();
    const gap = last.current ? Math.round(now - last.current) : 0;
    last.current = now;
    if (e.key === 'Enter') {
      e.preventDefault();
      const typed = keys.filter((k) => k.key.length === 1);
      const slowest = Math.max(0, ...typed.slice(1).map((k) => k.gap));
      const code = typed.map((k) => k.key).join('');
      setResult({ code, scan: code.length >= settings.minLength && slowest <= settings.maxGapMs, slowest });
      setKeys([]);
      last.current = 0;
      return;
    }
    if (e.key.length === 1) setKeys((k) => [...k, { key: e.key, gap }]);
  }

  const save = () => {
    writeScannerSettings(settings);
    setSettings(readScannerSettings());
    toast.success('Saved for this counter. Reopen the counter screen to use it.');
  };

  return (
    <Section
      icon={<ScanBarcode size={18} />}
      title="Barcode scanner"
      text="A USB or Bluetooth scanner types the code very fast and presses Enter. The counter tells a scan from normal typing by that speed."
    >
      <div className="space-y-4">
        <Field label="Scanner test" hint="Click the box, then scan any barcode.">
          <PosInput onKeyDown={onKey} placeholder="Click here and scan" autoComplete="off" spellCheck={false} />
        </Field>
        {result && (
          <div className={`rounded-lg px-3 py-2.5 text-sm ${result.scan ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            <p>
              Read <span className="font-mono font-semibold">{result.code || '(nothing)'}</span>, slowest key gap {result.slowest} ms.
            </p>
            <p className="mt-0.5">
              {result.scan
                ? 'This counts as a scan. The scanner is set up right.'
                : result.code.length < settings.minLength
                  ? `Shorter than ${settings.minLength} characters, so it doesn’t count as a scan. Lower “Shortest code” if your codes are this short.`
                  : `Slower than ${settings.maxGapMs} ms between keys. Raise “Longest gap” to about ${Math.min(300, result.slowest + 20)} ms (a Bluetooth scanner is often slower).`}
            </p>
          </div>
        )}
        <ul className="list-disc space-y-1 pl-5 text-xs text-pos-muted">
          <li>Nothing appears: the scanner isn’t typing into this computer. Check its cable or Bluetooth pairing.</li>
          <li>The code appears but the counter doesn’t add the item: the scanner must send Enter after the code (its “suffix” setting, in the scanner’s manual: scan the “Add CR” or “Enter” setup barcode).</li>
          <li>Wrong letters or numbers: set the scanner to the US keyboard layout, and keep the computer’s keyboard on English.</li>
        </ul>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Longest gap between keys (ms)" hint={`Default ${SCANNER_DEFAULTS.maxGapMs}.`}>
            <PosInput inputMode="numeric" value={String(settings.maxGapMs)} onChange={(e) => setSettings((s) => ({ ...s, maxGapMs: Number(e.target.value.replace(/\D/g, '')) || 0 }))} />
          </Field>
          <Field label="Shortest code" hint={`Default ${SCANNER_DEFAULTS.minLength}.`}>
            <PosInput inputMode="numeric" value={String(settings.minLength)} onChange={(e) => setSettings((s) => ({ ...s, minLength: Number(e.target.value.replace(/\D/g, '')) || 0 }))} />
          </Field>
          <div className="flex items-end gap-2">
            <PosButton variant="primary" onClick={save}>
              Save
            </PosButton>
            <PosButton
              variant="quiet"
              onClick={() => {
                writeScannerSettings(SCANNER_DEFAULTS);
                setSettings({ ...SCANNER_DEFAULTS });
              }}
            >
              Default
            </PosButton>
          </div>
        </div>
      </div>
    </Section>
  );
}

function CameraSection() {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  return (
    <Section icon={<Camera size={18} />} title="Camera" text="On a phone or tablet the counter can scan barcodes with the camera: the barcode button in the search box.">
      <PosButton onClick={() => setOpen(true)}>Try the camera</PosButton>
      {codes.length > 0 && <p className="mt-2 text-sm">Read: {codes.slice(-5).join(', ')}</p>}
      <p className="mt-2 text-xs text-pos-muted">Needs https (or localhost) and the camera permission. A USB scanner is much faster at a busy counter.</p>
      {open && <CameraScanner onCode={(c) => setCodes((x) => [...x, c])} onClose={() => setOpen(false)} />}
    </Section>
  );
}
