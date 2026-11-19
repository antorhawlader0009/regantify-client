import { useEffect, useState, type ReactNode } from 'react';
import { Bot, Check, Package, Send, ShieldCheck, ShoppingBag, Store, TriangleAlert, User, Wallet } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared two-panel card for the vendor Login and Sign up pages: a carousel panel
// on the left, the form on the right. The pages keep their own day/night switch,
// so the shell takes `night` and adds Tailwind's `dark` class itself.
// Colours are the dashboard's green (#C2531F / #F4A261), nothing new.
// ---------------------------------------------------------------------------

export type AuthSlide = { before: string; highlight: string };

const FRAME =
  'relative w-full max-w-[270px] rounded-2xl border border-black/10 bg-white p-3.5 shadow-[0_24px_50px_-20px_rgba(194,83,31,0.35)] dark:border-white/10 dark:bg-[#2E2019]';
const BAR = 'rounded-full bg-black/10 dark:bg-white/15';

function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`absolute grid h-10 w-10 place-items-center rounded-full text-white shadow-lg ring-4 ring-white dark:ring-[#2E2019] ${className}`}
    >
      {children}
    </span>
  );
}

function StoreScene() {
  const tiles = ['#C2531F', '#F4A261', '#F59E0B'];
  return (
    <div className={FRAME}>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#C2531F]" />
        <span className={`h-2 w-16 ${BAR}`} />
        <span className={`ml-auto h-2 w-10 ${BAR}`} />
      </div>
      <div className="mt-3 grid h-20 place-items-center rounded-xl bg-gradient-to-br from-[#C2531F] to-[#F4A261] text-center">
        <div>
          <span className="block h-2.5 w-24 rounded-full bg-white/90" />
          <span className="mx-auto mt-2 block h-1.5 w-14 rounded-full bg-white/60" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {tiles.map((c) => (
          <div key={c} className="rounded-xl border border-black/5 p-2 dark:border-white/10">
            <div className="grid h-14 place-items-center rounded-lg" style={{ background: `${c}22` }}>
              <ShoppingBag size={20} style={{ color: c }} />
            </div>
            <span className={`mt-2 block h-1.5 w-full ${BAR}`} />
            <span className="mt-2 block h-5 rounded-md bg-[#C2531F]" />
          </div>
        ))}
      </div>
      <Badge className="-right-3 -top-3 bg-emerald-500">
        <Check size={20} strokeWidth={3} />
      </Badge>
    </div>
  );
}

function ChatScene() {
  return (
    <div className={FRAME}>
      <div className="flex items-center gap-2 border-b border-black/5 pb-3 dark:border-white/10">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#C2531F] text-white">
          <Bot size={17} />
        </span>
        <span className={`h-2 w-20 ${BAR}`} />
      </div>
      <div className="mt-3 space-y-2.5">
        <div className="flex items-end gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black/10 dark:bg-white/15">
            <User size={13} className="opacity-60" />
          </span>
          <div className="rounded-2xl rounded-bl-sm bg-black/[0.06] px-3 py-2 dark:bg-white/10">
            <span className={`block h-1.5 w-28 ${BAR}`} />
            <span className={`mt-1.5 block h-1.5 w-16 ${BAR}`} />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-br-sm bg-[#C2531F] px-3 py-2">
            <span className="block h-1.5 w-32 rounded-full bg-white/80" />
            <span className="mt-1.5 block h-1.5 w-24 rounded-full bg-white/60" />
            <span className="mt-1.5 block h-1.5 w-12 rounded-full bg-white/60" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black/10 dark:bg-white/15">
            <User size={13} className="opacity-60" />
          </span>
          <div className="rounded-2xl rounded-bl-sm bg-black/[0.06] px-3 py-2 dark:bg-white/10">
            <span className={`block h-1.5 w-20 ${BAR}`} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
        <span className={`h-1.5 w-24 ${BAR}`} />
        <Send size={15} className="ml-auto text-[#C2531F] dark:text-[#F4A261]" />
      </div>
      <Badge className="-left-3 -top-3 bg-[#C2531F]">
        <Bot size={19} />
      </Badge>
    </div>
  );
}

function OrdersScene() {
  const rows = [
    { ok: true, w: 'w-20' },
    { ok: false, w: 'w-24' },
    { ok: true, w: 'w-16' },
  ];
  return (
    <div className={FRAME}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-20 ${BAR}`} />
        <span className="ml-auto rounded-full bg-[#C2531F]/10 px-2.5 py-1 text-[10px] font-semibold text-[#C2531F] dark:text-[#F4A261]">
          COD
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {rows.map((r, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
              r.ok ? 'border-black/5 dark:border-white/10' : 'border-red-500/30 bg-red-500/[0.06]'
            }`}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-lg ${
                r.ok ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-500'
              }`}
            >
              {r.ok ? <Package size={17} /> : <TriangleAlert size={17} />}
            </span>
            <span className="flex-1">
              <span className={`block h-2 ${r.w} ${BAR}`} />
              <span className={`mt-1.5 block h-1.5 w-12 ${BAR}`} />
            </span>
            <span className={`text-[10px] font-bold ${r.ok ? 'text-emerald-600' : 'text-red-500'}`}>
              {r.ok ? 'SAFE' : 'RISK'}
            </span>
          </div>
        ))}
      </div>
      <Badge className="-right-3 -top-3 bg-[#C2531F]">
        <ShieldCheck size={20} />
      </Badge>
    </div>
  );
}

function InboxScene() {
  const tints = ['#C2531F', '#F59E0B', '#10B981'];
  return (
    <div className={FRAME}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#C2531F]" />
        <span className={`h-2 w-16 ${BAR}`} />
      </div>
      <div className="mt-3 space-y-2.5">
        {tints.map((c, i) => (
          <div
            key={c}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              i === 1 ? 'bg-[#C2531F]/10' : 'border border-black/5 dark:border-white/10'
            }`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: c }}>
              <User size={15} />
            </span>
            <span className="flex-1">
              <span className={`block h-2 w-24 ${BAR}`} />
              <span className={`mt-1.5 block h-1.5 w-32 ${BAR}`} />
            </span>
            <span className={`h-1.5 w-6 ${BAR}`} />
          </div>
        ))}
      </div>
      <Badge className="-left-3 -top-3 bg-emerald-500">
        <Wallet size={19} />
      </Badge>
    </div>
  );
}

const SCENES = [StoreScene, ChatScene, OrdersScene, InboxScene];

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Store className="text-[#C2531F] dark:text-[#F4A261]" size={28} strokeWidth={2} />
      <span className="text-xl font-semibold leading-none text-[#241812] dark:text-white">Regantify</span>
    </span>
  );
}

/** Left carousel panel + right form panel. `start` picks the first slide. */
export function AuthShell({
  night,
  slides,
  start = 0,
  children,
}: {
  night: boolean;
  slides: AuthSlide[];
  start?: number;
  children: ReactNode;
}) {
  const [idx, setIdx] = useState(start % slides.length);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => setIdx((i) => (i + 1) % slides.length), 4500);
    return () => clearTimeout(id);
  }, [idx, slides.length]);

  const Scene = SCENES[idx % SCENES.length];
  const slide = slides[idx];

  return (
    <div className={night ? 'dark' : ''}>
      <style>{`
        @keyframes rg-auth-up { from { opacity: 0; transform: translateY(24px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes rg-auth-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .rg-auth-up { animation: rg-auth-up .6s cubic-bezier(.22,1,.36,1) both; }
        .rg-auth-float { animation: rg-auth-float 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .rg-auth-up, .rg-auth-float { animation: none !important; } }
      `}</style>
      <main className="flex min-h-screen items-center justify-center bg-[#FBF4EC] px-4 pb-6 pt-[84px] md:pb-[84px] transition-colors duration-300 dark:bg-[#241812]">
        <div className="rg-auth-up grid w-full max-w-[960px] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_30px_70px_-30px_rgba(194,83,31,0.35)] dark:border-white/10 dark:bg-[#2E2019] md:grid-cols-2">
          <aside className="relative hidden flex-col items-center border-r border-black/5 bg-[#F9E8D6] px-8 py-7 dark:border-white/10 dark:bg-[#33241C] md:flex">
            <Logo />
            <h2
              key={`t${idx}`}
              className="rg-auth-up mt-8 max-w-[340px] text-center text-[22px] font-bold leading-tight tracking-tight text-[#241812]/75 dark:text-white/85"
            >
              {slide.before}
              <span className="text-[#C2531F] dark:text-[#F4A261]">{slide.highlight}</span>
            </h2>
            <div key={`i${idx}`} className="rg-auth-up flex w-full flex-1 items-center justify-center py-6">
              <div className="rg-auth-float flex w-full justify-center">
                <Scene />
              </div>
            </div>
            <div className="flex items-center gap-2" role="tablist" aria-label="Slides">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === idx}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === idx ? 'w-7 bg-[#C2531F] dark:bg-[#F4A261]' : 'w-2 bg-black/20 hover:bg-black/30 dark:bg-white/25'
                  }`}
                />
              ))}
            </div>
          </aside>

          <section className="flex flex-col justify-center px-6 py-7 sm:px-10">
            <div className="mb-6 md:hidden">
              <Logo />
            </div>
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}

/** Title + sub line + a thin rule, like the reference. */
export function AuthHeading({ title, sub }: { title: string; sub: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold leading-tight text-[#241812] dark:text-white">{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-[#241812]/60 dark:text-white/60">{sub}</p>
      <hr className="mt-4 border-black/10 dark:border-white/10" />
    </div>
  );
}
