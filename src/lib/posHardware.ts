import { printElement } from './printElement';
import { KICK, printJob, rasterFromPixels } from './escpos';

/*
 * Counter hardware (POS-system-plan.md Step 12), all per device (this browser), nothing on the server.
 *
 * - Scanner tuning: how fast keystrokes must come to count as a scan (useBarcodeScanner).
 * - Direct printing, Chrome/Edge only: a receipt printer connected over USB-serial (Web Serial, the
 *   usual Windows route: the printer's driver gives it a COM port), plain USB (Web USB; Android,
 *   Mac, Linux, or Windows without the maker's driver) or Bluetooth (Web Bluetooth, the common
 *   cheap BLE printers). The slip is drawn as a picture and sent as ESC/POS raster, so Bangla,
 *   the logo and the QR print exactly as on screen whatever the printer's code pages are, and the
 *   cash drawer (plugged into the printer) is opened with the ESC p pulse.
 * - Anything not connected falls back to the OS print dialog (printElement), as before.
 */

// ---------------------------------------------------------------------------------------------
// Scanner

export interface ScannerSettings {
  /** Longest gap between two keystrokes of one scan, in ms. Scanners type a code in a few ms per key. */
  maxGapMs: number;
  /** Shortest code that counts as a scan. */
  minLength: number;
}
const SCANNER_KEY = 'pos.scanner';
export const SCANNER_DEFAULTS: ScannerSettings = { maxGapMs: 50, minLength: 4 };

export function readScannerSettings(): ScannerSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SCANNER_KEY) ?? 'null') as Partial<ScannerSettings> | null;
    return {
      maxGapMs: clamp(raw?.maxGapMs ?? SCANNER_DEFAULTS.maxGapMs, 10, 300),
      minLength: clamp(raw?.minLength ?? SCANNER_DEFAULTS.minLength, 1, 30),
    };
  } catch {
    return { ...SCANNER_DEFAULTS };
  }
}

export function writeScannerSettings(s: ScannerSettings) {
  try {
    localStorage.setItem(SCANNER_KEY, JSON.stringify(s));
  } catch {
    // Private window: it applies until the page is reloaded.
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(Number(n) || min)));
}

// ---------------------------------------------------------------------------------------------
// Direct printer

export type PrinterKind = 'serial' | 'usb' | 'bluetooth';

export interface PrinterPrefs {
  kind: PrinterKind | null;
  /** Open the cash drawer after a sale paid (partly) in cash. */
  kickOnCash: boolean;
  /** Serial speed; most USB-serial thermal printers use 9600 or 115200 (the driver ignores it). */
  baudRate: number;
}
const PRINTER_KEY = 'pos.printer';
const PRINTER_DEFAULTS: PrinterPrefs = { kind: null, kickOnCash: true, baudRate: 9600 };

export function readPrinterPrefs(): PrinterPrefs {
  try {
    return { ...PRINTER_DEFAULTS, ...(JSON.parse(localStorage.getItem(PRINTER_KEY) ?? 'null') ?? {}) };
  } catch {
    return { ...PRINTER_DEFAULTS };
  }
}

export function writePrinterPrefs(p: PrinterPrefs) {
  try {
    localStorage.setItem(PRINTER_KEY, JSON.stringify(p));
  } catch {
    // Not remembered in a private window.
  }
}

/** What this browser can do. Web Serial/USB/Bluetooth exist in Chrome and Edge, only on https or localhost. */
export function printerSupport() {
  const nav = navigator as Navigator & { serial?: unknown; usb?: unknown; bluetooth?: unknown };
  return { serial: !!nav.serial, usb: !!nav.usb, bluetooth: !!nav.bluetooth, secure: window.isSecureContext };
}

// Minimal shapes of the three Web APIs (they aren't in TypeScript's DOM lib).
interface SerialPortLike {
  open(o: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}
interface UsbDeviceLike {
  open(): Promise<void>;
  close(): Promise<void>;
  opened: boolean;
  configuration: { configurationValue: number; interfaces: Array<{ interfaceNumber: number; alternate: { interfaceClass: number; endpoints: Array<{ direction: string; endpointNumber: number }> } }> } | null;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: Uint8Array): Promise<unknown>;
  productName?: string;
}
interface BleCharacteristicLike {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithoutResponse?(data: Uint8Array): Promise<void>;
  writeValue(data: Uint8Array): Promise<void>;
}
interface BleDeviceLike {
  name?: string;
  gatt?: { connected: boolean; connect(): Promise<{ getPrimaryServices(): Promise<Array<{ getCharacteristics(): Promise<BleCharacteristicLike[]> }>> }>; disconnect(): void };
}

// The services most cheap Bluetooth thermal printers expose.
const BLE_SERVICES = ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455'];

interface Connection {
  kind: PrinterKind;
  name: string;
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

let connection: Connection | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** For React: re-render when the printer connects or goes away. */
export function onPrinterChange(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function connectedPrinter(): { kind: PrinterKind; name: string } | null {
  return connection && { kind: connection.kind, name: connection.name };
}

async function openSerial(port: SerialPortLike, baudRate: number): Promise<Connection> {
  await port.open({ baudRate }).catch((err: unknown) => {
    // Already open in this tab (a second connect): use it as it is.
    if (!(err instanceof DOMException && err.name === 'InvalidStateError')) throw err;
  });
  const info = port.getInfo();
  return {
    kind: 'serial',
    name: info.usbVendorId ? `USB serial printer (${info.usbVendorId.toString(16)}:${(info.usbProductId ?? 0).toString(16)})` : 'Serial printer',
    async write(data) {
      if (!port.writable) throw new Error('The printer port is closed.');
      const writer = port.writable.getWriter();
      try {
        await writer.write(data);
      } finally {
        writer.releaseLock();
      }
    },
    close: () => port.close(),
  };
}

async function openUsb(device: UsbDeviceLike): Promise<Connection> {
  if (!device.opened) await device.open();
  if (!device.configuration) await device.selectConfiguration(1);
  // The printer-class interface (7), or else the first one with an OUT endpoint.
  const interfaces = device.configuration!.interfaces;
  const iface =
    interfaces.find((i) => i.alternate.interfaceClass === 7 && i.alternate.endpoints.some((e) => e.direction === 'out')) ??
    interfaces.find((i) => i.alternate.endpoints.some((e) => e.direction === 'out'));
  if (!iface) throw new Error('This USB device has no way to send it data.');
  await device.claimInterface(iface.interfaceNumber);
  const endpoint = iface.alternate.endpoints.find((e) => e.direction === 'out')!.endpointNumber;
  return { kind: 'usb', name: device.productName || 'USB printer', write: async (data) => void (await device.transferOut(endpoint, data)), close: () => device.close() };
}

async function openBluetooth(device: BleDeviceLike): Promise<Connection> {
  const server = await device.gatt!.connect();
  let target: BleCharacteristicLike | null = null;
  for (const service of await server.getPrimaryServices()) {
    for (const c of await service.getCharacteristics()) {
      if (c.properties.writeWithoutResponse || c.properties.write) {
        target = c;
        break;
      }
    }
    if (target) break;
  }
  if (!target) throw new Error('This Bluetooth device has nothing to print to.');
  const char = target;
  return {
    kind: 'bluetooth',
    name: device.name || 'Bluetooth printer',
    // BLE takes small packets: 180 bytes at a time.
    async write(data) {
      for (let i = 0; i < data.length; i += 180) {
        const part = data.slice(i, i + 180);
        if (char.properties.writeWithoutResponse && char.writeValueWithoutResponse) await char.writeValueWithoutResponse(part);
        else await char.writeValue(part);
      }
    },
    close: async () => device.gatt?.disconnect(),
  };
}

/** Ask the browser to pick a printer (needs a click). Remembers the kind for this device. */
export async function connectPrinter(kind: PrinterKind) {
  const nav = navigator as unknown as {
    serial: { requestPort(o?: object): Promise<SerialPortLike> };
    usb: { requestDevice(o: object): Promise<UsbDeviceLike> };
    bluetooth: { requestDevice(o: object): Promise<BleDeviceLike> };
  };
  await disconnectPrinter(false);
  const prefs = readPrinterPrefs();
  if (kind === 'serial') connection = await openSerial(await nav.serial.requestPort(), prefs.baudRate);
  else if (kind === 'usb') connection = await openUsb(await nav.usb.requestDevice({ filters: [] }));
  else connection = await openBluetooth(await nav.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_SERVICES }));
  writePrinterPrefs({ ...prefs, kind });
  notify();
  return connectedPrinter()!;
}

/**
 * Reconnect to the printer picked before, without asking (the browser remembers the permission
 * for Serial and USB). Bluetooth always needs a click, so it isn't restored. Quiet on failure.
 */
export async function restorePrinter() {
  if (connection) return connectedPrinter();
  const prefs = readPrinterPrefs();
  const nav = navigator as unknown as { serial?: { getPorts(): Promise<SerialPortLike[]> }; usb?: { getDevices(): Promise<UsbDeviceLike[]> } };
  try {
    if (prefs.kind === 'serial' && nav.serial) {
      const [port] = await nav.serial.getPorts();
      if (port) connection = await openSerial(port, prefs.baudRate);
    } else if (prefs.kind === 'usb' && nav.usb) {
      const [device] = await nav.usb.getDevices();
      if (device) connection = await openUsb(device);
    }
  } catch {
    connection = null;
  }
  notify();
  return connectedPrinter();
}

/** `forget`: also stop using direct printing on this device. */
export async function disconnectPrinter(forget = true) {
  const c = connection;
  connection = null;
  if (c) await c.close().catch(() => undefined);
  if (forget) writePrinterPrefs({ ...readPrinterPrefs(), kind: null });
  notify();
}

// ---------------------------------------------------------------------------------------------
// ESC/POS

/** Printable dots across: 80 mm paper = 576 dots, 58 mm = 384 (203 dpi heads). */
export const dotsFor = (widthMm: number) => (widthMm === 58 ? 384 : 576);


/** A canvas as black-and-white raster (escpos.ts). */
function rasterBytes(canvas: HTMLCanvasElement): Uint8Array {
  const { width, height } = canvas;
  return rasterFromPixels(canvas.getContext('2d')!.getImageData(0, 0, width, height).data, width, height);
}

/** Draw an element (a slip already in the page) as a canvas exactly `dots` wide. */
async function elementToCanvas(el: HTMLElement, dots: number) {
  const { toCanvas } = await import('html-to-image');
  const cssWidth = el.offsetWidth || el.getBoundingClientRect().width;
  // Web fonts are left to the browser: copying them in fails on cross-site font files.
  const canvas = await toCanvas(el, { pixelRatio: dots / cssWidth, backgroundColor: '#ffffff', skipFonts: true, cacheBust: false });
  if (canvas.width === dots) return canvas;
  // Scale onto exactly the printer's width (pixelRatio can round by a dot).
  const fit = document.createElement('canvas');
  fit.width = dots;
  fit.height = Math.round((canvas.height * dots) / canvas.width);
  const ctx = fit.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, fit.width, fit.height);
  ctx.drawImage(canvas, 0, 0, fit.width, fit.height);
  return fit;
}

/** Send bytes to the connected printer. Throws when none is connected or it fails. */
async function send(bytes: Uint8Array) {
  if (!connection) throw new Error('No printer is connected.');
  try {
    await connection.write(bytes);
  } catch (err) {
    // A printer that went away (unplugged, out of range): forget the connection, keep the choice.
    await disconnectPrinter(false);
    throw err;
  }
}

/** Open the cash drawer through the connected printer. False when no printer is connected. */
export async function kickDrawer() {
  if (!connection) return false;
  await send(new Uint8Array(KICK));
  return true;
}

/**
 * Print a slip that's in the page: straight to the connected printer when there is one (no dialog,
 * the drawer opened first when asked), otherwise the OS print dialog on the store's paper width.
 * Falls back to the dialog if direct printing fails.
 */
export async function printSlip(el: HTMLElement, title: string, widthMm: number, opts: { kick?: boolean } = {}) {
  if (connection) {
    try {
      const canvas = await elementToCanvas(el, dotsFor(widthMm));
      await send(printJob(rasterBytes(canvas), !!opts.kick));
      return 'direct' as const;
    } catch {
      // Fall through to the dialog so the customer still gets a receipt.
    }
  }
  await printElement(el, title, { size: `${widthMm}mm auto`, padding: '0' });
  return 'dialog' as const;
}

