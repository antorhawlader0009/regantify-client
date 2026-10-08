import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Store, Sun } from 'lucide-react';

// ---------------------------------------------------------------------------
// The one top bar shared by the marketing home and the vendor login / sign up
// pages. Keep it the single source of truth: change it here, not per page.
// ---------------------------------------------------------------------------

export type NavLang = 'en' | 'bn';

const LANG_STORAGE_KEY = 'regantify-lang';

/** The chosen language follows the visitor from Home to Login to Sign up. */
export function readStoredLang(): NavLang {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (v === 'en' || v === 'bn') return v;
  } catch {
    /* storage blocked: fall through to the default */
  }
  return 'en';
}

export function storeLang(lang: NavLang) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* storage blocked: the language still works for this page view */
  }
}

// Day / night is one choice for the whole public side: Home, Login and Sign up
// read the same key (the auth pages already used it).
const THEME_STORAGE_KEY = 'regantify-auth-theme';

export function readStoredNight(): boolean {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'night';
  } catch {
    return false;
  }
}

export function storeNight(night: boolean) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, night ? 'night' : 'day');
  } catch {
    /* storage blocked: the theme still works for this page view */
  }
}

const labels = {
  en: {
    toDay: 'Switch to day mode',
    toNight: 'Switch to night mode',
    who: 'Designs',
    services: 'Services',
    features: 'Features',
    pricing: 'Pricing',
    faq: 'FAQ',
    login: 'Sign In',
    start: 'Start for free',
    home: 'Regantify home',
    language: 'Language',
  },
  bn: {
    toDay: 'দিনের মোডে যান',
    toNight: 'রাতের মোডে যান',
    who: 'ডিজাইন',
    services: 'সেবাসমূহ',
    features: 'ফিচার',
    pricing: 'মূল্য',
    faq: 'প্রশ্ন',
    login: 'লগইন',
    start: 'ফ্রি শুরু করুন',
    home: 'Regantify হোম',
    language: 'ভাষা',
  },
} as const;

// Dock-style hover for the links: the ones near the pointer spring a little
// wider and lower, more the closer they are. Tuned with the numbers from
// ThreeUI's "Sable" dock (our own spring, not their source).
const DOCK = { proximity: 122, spring: 0.19, damping: 0.7, widthGrowth: 17, heightGrowth: 16, drop: 3.5 };

function useDockHover<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const nav = ref.current;
    if (!nav || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = Array.from(nav.querySelectorAll<HTMLElement>('[data-dock-item]'));
    const state = items.map(() => ({ x: 0, v: 0, target: 0 }));
    let pointerX: number | null = null;
    let frame = 0;

    const apply = (el: HTMLElement, k: number) => {
      el.style.paddingInline = `${12 + (DOCK.widthGrowth * k) / 2}px`;
      el.style.paddingBlock = `${6 + (DOCK.heightGrowth * k) / 2}px`;
      el.style.transform = `translateY(${DOCK.drop * k}px)`;
      // The hover chip is white on a dark bar, dark on a light bar.
      const light = nav.dataset.tone === 'light';
      el.style.backgroundColor = light
        ? `rgba(26,26,26,${0.08 * Math.min(1, k)})`
        : `rgba(255,255,255,${0.12 * Math.min(1, k)})`;
    };

    const tick = () => {
      let moving = false;
      items.forEach((el, i) => {
        const s = state[i];
        s.v = (s.v + (s.target - s.x) * DOCK.spring) * DOCK.damping;
        s.x += s.v;
        if (Math.abs(s.v) > 0.001 || Math.abs(s.target - s.x) > 0.001) moving = true;
        else s.x = s.target;
        apply(el, Math.max(0, s.x));
      });
      frame = moving ? requestAnimationFrame(tick) : 0;
    };

    const retarget = () => {
      items.forEach((el, i) => {
        if (pointerX === null) {
          state[i].target = 0;
          return;
        }
        const r = el.getBoundingClientRect();
        const k = Math.max(0, 1 - Math.abs(pointerX - (r.left + r.width / 2)) / DOCK.proximity);
        state[i].target = k * k * (3 - 2 * k);
      });
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointerX = e.clientX;
      retarget();
    };
    const onLeave = () => {
      pointerX = null;
      retarget();
    };
    nav.addEventListener('pointermove', onMove, { passive: true });
    nav.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      nav.removeEventListener('pointermove', onMove);
      nav.removeEventListener('pointerleave', onLeave);
      items.forEach((el) => el.removeAttribute('style'));
    };
  }, []);
  return ref;
}

const LINK_CLASS = 'rounded-full px-3 py-1.5 transition-colors will-change-transform';

// The two looks of the bar: white-on-dark (default, and over the dark hero) and
// dark-on-white (Home in day mode, where the hero is light).
const TONES = {
  dark: {
    ink: 'text-white',
    glass: 'bg-[#1A1A1A]/70 border-white/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]',
    chip: 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20',
    track: 'bg-white/10 ring-1 ring-white/20 hover:bg-white/15',
    thumb: 'bg-white',
    thumbInk: 'text-[#1A1A1A]',
    idleInk: 'text-white/80',
    soft: 'hover:bg-white/15',
    current: 'text-white bg-white/15',
  },
  light: {
    ink: 'text-[#1A1A1A]',
    glass: 'bg-white/75 border-black/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)]',
    chip: 'bg-black/5 text-[#1A1A1A] ring-1 ring-black/10 hover:bg-black/10',
    track: 'bg-black/5 ring-1 ring-black/10 hover:bg-black/[0.08]',
    thumb: 'bg-[#1A1A1A]',
    thumbInk: 'text-white',
    idleInk: 'text-[#1A1A1A]/70',
    soft: 'hover:bg-black/5',
    current: 'text-[#1A1A1A] bg-black/5',
  },
} as const;

type SiteNavProps = {
  lang: NavLang;
  onToggleLang: () => void;
  /** hero: fixed, transparent over the hero, dark glass once scrolled (Home).
      solid: sticky, dark glass all the time (login / sign up, which have no hero). */
  variant: 'hero' | 'solid';
  /** The page we are on, so its button shows as "you are here". */
  active?: 'login' | 'signup';
  /** Page-specific extras shown before the language switch (e.g. the auth pages' day/night button). */
  extra?: ReactNode;
  /** Pass both to show the built-in day / night button. */
  night?: boolean;
  onToggleTheme?: () => void;
  /** Light bar (dark text on white glass), for a light hero. Default: white on dark. */
  light?: boolean;
};

export default function SiteNav({ lang, onToggleLang, variant, active, extra, night, onToggleTheme, light }: SiteNavProps) {
  const navigate = useNavigate();
  const t = labels[lang];
  const c = light ? TONES.light : TONES.dark;
  const dockRef = useDockHover<HTMLElement>();
  const hero = variant === 'hero';

  // Over a hero the bar starts fully transparent; elsewhere it is always glass.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!hero) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hero]);
  const glass = !hero || scrolled;

  // On Home the links scroll the page; from the auth pages they go Home first.
  const sectionLink = (id: string, text: string) =>
    hero ? (
      <a href={`#${id}`} data-dock-item className={`${LINK_CLASS} ${c.ink}`}>{text}</a>
    ) : (
      <Link to={{ pathname: '/', hash: id }} data-dock-item className={`${LINK_CLASS} ${c.ink}`}>{text}</Link>
    );

  return (
    <header className={`${hero ? 'fixed' : 'sticky'} top-0 inset-x-0 z-30 px-3 sm:px-4 pt-3 sm:pt-4 font-nav`}>
      <div
        className={`max-w-6xl mx-auto h-[60px] flex items-center justify-between gap-2 pl-4 sm:pl-5 pr-2.5 rounded-2xl
          border transition-all duration-300 ${
            glass ? `backdrop-blur-xl ${c.glass}` : 'bg-transparent border-transparent'
          }`}
      >
        {hero ? (
          <a href="#" aria-label={t.home} className="flex items-center gap-2.5 shrink-0">
            <Store className="text-[#95BF47]" size={24} strokeWidth={2} />
            <span className={`${c.ink} text-xl font-semibold leading-none max-[399px]:hidden`}>Regantify</span>
          </a>
        ) : (
          <Link to="/" aria-label={t.home} className="flex items-center gap-2.5 shrink-0">
            <Store className="text-[#95BF47]" size={24} strokeWidth={2} />
            <span className={`${c.ink} text-xl font-semibold leading-none max-[399px]:hidden`}>Regantify</span>
          </Link>
        )}

        <nav
          ref={dockRef}
          data-tone={light ? 'light' : 'dark'}
          className="hidden md:flex items-center gap-1 py-2 text-sm font-medium"
        >
          {sectionLink('categories', t.who)}
          {sectionLink('run', t.services)}
          {sectionLink('features', t.features)}
          {sectionLink('pricing', t.pricing)}
          {sectionLink('faq', t.faq)}
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {extra}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={night ? t.toDay : t.toNight}
              title={night ? t.toDay : t.toNight}
              className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${c.chip}`}
            >
              {night ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}
          {/* One small switch: the thumb sits under the current language. */}
          <button
            type="button"
            role="switch"
            aria-checked={lang === 'bn'}
            aria-label={t.language}
            title={lang === 'bn' ? 'English' : 'বাংলা'}
            onClick={onToggleLang}
            className={`relative grid h-8 w-[68px] grid-cols-2 items-center rounded-full text-[11px] font-semibold transition-colors ${c.track}`}
          >
            <span
              aria-hidden="true"
              className={`absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-2px)] rounded-full ${c.thumb} shadow
                transition-transform duration-300 ease-out ${lang === 'bn' ? 'translate-x-0' : 'translate-x-full'}`}
            />
            <span className={`relative z-10 text-center transition-colors ${lang === 'bn' ? c.thumbInk : c.idleInk}`}>
              বা
            </span>
            <span className={`relative z-10 text-center transition-colors ${lang === 'en' ? c.thumbInk : c.idleInk}`}>
              EN
            </span>
          </button>
          {active === 'login' ? (
            <span
              aria-current="page"
              className={`hidden sm:inline-flex px-3.5 py-2 rounded-lg text-sm font-medium cursor-default ${c.current}`}
            >
              {t.login}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/vendor/login')}
              className={`hidden sm:inline-flex px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${c.ink} ${c.soft}`}
            >
              {t.login}
            </button>
          )}
          <button
            type="button"
            onClick={() => active !== 'signup' && navigate('/vendor/signup')}
            aria-current={active === 'signup' ? 'page' : undefined}
            className="ml-0.5 sm:ml-1 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#95BF47] text-[#1A1A1A]
              hover:bg-[#84AD3D] transition-colors whitespace-nowrap"
          >
            {t.start}
          </button>
        </div>
      </div>
    </header>
  );
}
