import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import {
  Lock,
  User,
  Store,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  LayoutDashboard,
  PackageCheck,
  Wallet,
  BarChart3,
  Languages,
  Sun,
  Moon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// i18n — dictionary + provider, inlined here so this page is a single file
// (same pattern as the landing page)
// ---------------------------------------------------------------------------

type Lang = 'en' | 'bn';

const dict = {
  en: {
    nav_login: 'Login',
    nav_signup: 'Sign up',
    nav_home_label: 'Regantify home',
    theme_to_light: 'Switch to day mode',
    theme_to_dark: 'Switch to night mode',
    toggle_lang_label: 'Toggle language',

    pitch_tag: 'Vendor dashboard',
    pitch_title_1: 'Welcome',
    pitch_title_accent: 'back',
    pitch_title_2: '. Your shop is waiting.',
    pitch_sub: 'Log in to see new orders, check your payments, and keep your shop running from one screen.',

    perk1_title: 'One screen for everything',
    perk1_detail: 'Orders, payments, and stock in one place.',
    perk2_title: 'Orders & delivery in sync',
    perk2_detail: 'Print labels and track every parcel.',
    perk3_title: 'See payments land',
    perk3_detail: 'bKash and Nagad, all in your wallet.',
    perk4_title: 'Know how you are doing',
    perk4_detail: 'Sales and customers at a glance.',

    form_title: 'Log in',
    form_sub: 'Log in with your phone number or email and password',
    label_identifier: 'Phone number or email',
    ph_identifier: '017XXXXXXXX or you@example.com',
    label_password: 'Password',
    show_password: 'Show password',
    hide_password: 'Hide password',
    btn_signin: 'Sign in',
    btn_signing_in: 'Signing in…',
    forgot: 'Forgot password?',
    new_here: 'New here?',

    err_identifier_required: 'Phone number or email is required',
    err_identifier_invalid: 'Enter a valid phone number or email address',
    err_password_required: 'Password is required',
    err_login_failed: 'Invalid phone/email or password.',
  },
  bn: {
    nav_login: 'লগইন',
    nav_signup: 'সাইন আপ',
    nav_home_label: 'Regantify হোম',
    theme_to_light: 'দিনের মোডে যান',
    theme_to_dark: 'রাতের মোডে যান',
    toggle_lang_label: 'ভাষা বদলান',

    pitch_tag: 'ভেন্ডর ড্যাশবোর্ড',
    pitch_title_1: '',
    pitch_title_accent: 'স্বাগতম ,',
    pitch_title_2: 'আপনার দোকান অপেক্ষা করছে।',
    pitch_sub: 'লগইন করে নতুন অর্ডার দেখুন, পেমেন্ট চেক করুন, আর এক স্ক্রিন থেকেই দোকান চালান।',

    perk1_title: 'সব কিছুর জন্য এক স্ক্রিন',
    perk1_detail: 'অর্ডার, পেমেন্ট, স্টক — সব এক জায়গায়।',
    perk2_title: 'অর্ডার আর ডেলিভারি মিলে থাকে',
    perk2_detail: 'লেবেল প্রিন্ট করুন, প্রতিটা পার্সেল ট্র্যাক করুন।',
    perk3_title: 'পেমেন্ট আসা দেখুন',
    perk3_detail: 'bKash আর Nagad, সব আপনার ওয়ালেটে।',
    perk4_title: 'কেমন চলছে জানুন',
    perk4_detail: 'বিক্রি আর কাস্টমার এক নজরে।',

    form_title: 'লগইন',
    form_sub: 'ফোন নম্বর বা ইমেইল আর পাসওয়ার্ড দিয়ে লগইন করুন',
    label_identifier: 'ফোন নম্বর বা ইমেইল',
    ph_identifier: '017XXXXXXXX বা you@example.com',
    label_password: 'পাসওয়ার্ড',
    show_password: 'পাসওয়ার্ড দেখান',
    hide_password: 'পাসওয়ার্ড লুকান',
    btn_signin: 'সাইন ইন',
    btn_signing_in: 'সাইন ইন হচ্ছে…',
    forgot: 'পাসওয়ার্ড ভুলে গেছেন?',
    new_here: 'নতুন এসেছেন?',

    err_identifier_required: 'ফোন নম্বর বা ইমেইল দিতে হবে',
    err_identifier_invalid: 'সঠিক ফোন নম্বর বা ইমেইল ঠিকানা দিন',
    err_password_required: 'পাসওয়ার্ড দিতে হবে',
    err_login_failed: 'ফোন/ইমেইল বা পাসওয়ার্ড ভুল।',
  },
} as const;

type Key = keyof typeof dict.en;

const LangContext = createContext<{
  lang: Lang;
  toggle: () => void;
  t: (key: Key) => string;
}>({
  lang: 'en',
  toggle: () => {},
  t: (key) => dict.en[key],
});

function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const toggle = () => setLang((l) => (l === 'en' ? 'bn' : 'en'));
  const t = (key: Key) => dict[lang][key];
  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      <div lang={lang} className={lang === 'bn' ? 'font-bn' : ''}>
        {children}
      </div>
    </LangContext.Provider>
  );
}

function useLang() {
  return useContext(LangContext);
}

// ---------------------------------------------------------------------------
// Day / Night theme — self-contained (no tailwind `dark:` variant, no config
// change needed). Night = the original dark look; Day = light counterpart
// using the same green accents. Choice is remembered in localStorage.
// ---------------------------------------------------------------------------

type Mode = 'night' | 'day';

const THEME_STORAGE_KEY = 'regantify-auth-theme';

function readStoredMode(): Mode {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'day' || v === 'night') return v;
  } catch {
    /* storage blocked — fall through to default */
  }
  return 'night';
}

/** Every colour that differs between day and night lives here. */
const themes = {
  night: {
    page: 'bg-[#1A1A1A] text-white',
    overlay: 'bg-gradient-to-br from-[#1A1A1A]/95 via-[#1A1A1A]/85 to-[#1A1A1A]/70',
    blobA: 'bg-[#95BF47]/20',
    blobB: 'bg-[#008060]/30',
    blobC: 'bg-[#95BF47]/10',
    navScrolled:
      'bg-[#1A1A1A]/70 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]',
    navIdle: 'bg-transparent border-b border-transparent',
    brand: 'text-white',
    navText: 'text-white/85 hover:text-white',
    navActive: 'bg-white/15 text-white',
    navBtnBorder: 'text-white/85 border border-white/25 hover:border-white/50 hover:text-white',
    tag: 'text-white bg-[#008060]',
    headline: 'text-white',
    sub: 'text-white/75',
    perkCard:
      'bg-white/[0.05] border border-white/10 hover:bg-white/[0.09] hover:border-[#95BF47]/40',
    perkTitle: 'text-white',
    perkDetail: 'text-white/60',
    cardInner: 'bg-[#1A1A1A]/90',
    formTitle: 'text-white',
    formSub: 'text-white/60',
    label: 'text-white/85',
    input:
      'bg-white/[0.07] text-white border border-white/15 placeholder:text-white/35 ' +
      'focus:border-[#95BF47] focus:bg-white/[0.1] focus:ring-[#95BF47]/20',
    inputIcon: 'text-white/40 group-focus-within:text-[#95BF47]',
    eyeBtn: 'text-white/45 hover:text-white hover:bg-white/10',
    error: 'text-red-400',
    errorBox: 'text-red-400 bg-red-500/10 border border-red-500/20',
    link: 'text-white/60 hover:text-[#95BF47]',
    muted: 'text-white/50',
    accentLink: 'text-[#95BF47] hover:text-[#A6D054]',
    accentText: 'text-[#95BF47]',
    primaryBtn: 'bg-[#95BF47] text-[#1A1A1A] hover:bg-[#A6D054]',
    signupBtn: 'bg-[#95BF47] text-[#1A1A1A] hover:bg-[#84AD3D]',
    iconChip: 'bg-[#95BF47] text-[#1A1A1A]',
    ringColor: '149,191,71',
  },
  day: {
    page: 'bg-[#F6F8F2] text-[#1A1A1A]',
    overlay: 'bg-gradient-to-br from-[#F6F8F2]/95 via-[#F6F8F2]/88 to-[#F6F8F2]/70',
    blobA: 'bg-[#95BF47]/30',
    blobB: 'bg-[#008060]/15',
    blobC: 'bg-[#95BF47]/20',
    navScrolled:
      'bg-white/75 backdrop-blur-xl border-b border-black/10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)]',
    navIdle: 'bg-transparent border-b border-transparent',
    brand: 'text-[#1A1A1A]',
    navText: 'text-[#1A1A1A]/75 hover:text-[#1A1A1A]',
    navActive: 'bg-black/[0.07] text-[#1A1A1A]',
    navBtnBorder: 'text-[#1A1A1A]/80 border border-black/15 hover:border-black/35 hover:text-[#1A1A1A]',
    tag: 'text-white bg-[#008060]',
    headline: 'text-[#1A1A1A]',
    sub: 'text-[#1A1A1A]/65',
    perkCard:
      'bg-white/70 border border-black/10 hover:bg-white hover:border-[#008060]/40 shadow-sm',
    perkTitle: 'text-[#1A1A1A]',
    perkDetail: 'text-[#1A1A1A]/60',
    cardInner: 'bg-white/95',
    formTitle: 'text-[#1A1A1A]',
    formSub: 'text-[#1A1A1A]/60',
    label: 'text-[#1A1A1A]/80',
    input:
      'bg-[#F1F1F1] text-[#1A1A1A] border border-black/10 placeholder:text-[#1A1A1A]/35 ' +
      'focus:border-[#008060] focus:bg-white focus:ring-[#008060]/15',
    inputIcon: 'text-[#1A1A1A]/40 group-focus-within:text-[#008060]',
    eyeBtn: 'text-[#1A1A1A]/45 hover:text-[#1A1A1A] hover:bg-black/[0.06]',
    error: 'text-red-600',
    errorBox: 'text-red-700 bg-red-50 border border-red-200',
    link: 'text-[#1A1A1A]/60 hover:text-[#008060]',
    muted: 'text-[#1A1A1A]/55',
    accentLink: 'text-[#008060] hover:text-[#006B51]',
    accentText: 'text-[#008060]',
    primaryBtn: 'bg-[#008060] text-white hover:bg-[#006B51]',
    signupBtn: 'bg-[#008060] text-white hover:bg-[#006B51]',
    iconChip: 'bg-[#008060] text-white',
    ringColor: '0,128,96',
  },
} as const;

const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation messages are translation keys (not raw strings) so the error
// text follows the language toggle live; they are resolved with t() at render.
const passwordSchema = z.object({
  identifier: z
    .string()
    .min(1, 'err_identifier_required')
    .refine(
      (v) => bdPhoneRegex.test(v.trim()) || emailRegex.test(v.trim()),
      'err_identifier_invalid',
    ),
  password: z.string().min(1, 'err_password_required'),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

/**
 * Vendor Login — phone number or email + password. Reached via the "Login"
 * button in the top-right corner of the auth header. New vendors use the
 * "Sign up" button instead, which starts the phone + OTP flow in
 * VendorSignup.
 *
 * This page renders its own full-bleed layout (same transparent navbar +
 * hero.png as the landing page and VendorSignup) instead of wrapping in
 * AuthShell. It also carries its own English/Bangla toggle and Day/Night
 * toggle, both self-contained in this file. All form logic, validation
 * rules, API calls and navigation targets are unchanged.
 */
function VendorPhoneEntryInner() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t, lang, toggle } = useLang();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Day / Night
  const [mode, setMode] = useState<Mode>(readStoredMode);
  const th = themes[mode];
  const toggleMode = () =>
    setMode((m) => {
      const next: Mode = m === 'night' ? 'day' : 'night';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* storage blocked — theme still works for this session */
      }
      return next;
    });

  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  // Navbar: fully transparent at the top, glass blur once the page scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handlePasswordLogin = async (values: PasswordFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      // Guard against accidental whitespace/newlines picked up when a
      // vendor pastes the temporary password straight from the SMS app.
      const res = await authApi.vendorLogin(values.identifier.trim(), values.password.trim());

      if (res.mustSetPassword) {
        // Still on the temporary password — no real session was issued.
        // Setting a real password is mandatory here (unlike right after
        // signup), so send them to the non-skippable setup screen.
        navigate('/vendor/complete-setup', { replace: true, state: { setupToken: res.setupToken } });
        return;
      }

      setAuth(res.accessToken, res.user);
      navigate('/vendor/dashboard', { replace: true });
    } catch (err: any) {
      // A message coming from the server is shown as-is; only our own
      // fallback is translated.
      setServerError(err?.response?.data?.message ?? t('err_login_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const perks = [
    { icon: LayoutDashboard, title: t('perk1_title'), detail: t('perk1_detail') },
    { icon: PackageCheck, title: t('perk2_title'), detail: t('perk2_detail') },
    { icon: Wallet, title: t('perk3_title'), detail: t('perk3_detail') },
    { icon: BarChart3, title: t('perk4_title'), detail: t('perk4_detail') },
  ];

  const inputBase =
    `w-full pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 ${th.input}`;

  // zod messages are translation keys — resolve them at render time
  const identifierError = passwordForm.formState.errors.identifier;
  const passwordError = passwordForm.formState.errors.password;
  const errText = (m?: string) => (m ? t(m as Key) : '');

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${th.page}`}>
      {/* Local keyframes — same animation language as the landing page */}
      <style>{`
        @keyframes rg-fade-left {
          from { opacity: 0; transform: translateX(-26px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes rg-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(34px, -24px) scale(1.12); }
          66%      { transform: translate(-28px, 20px) scale(0.94); }
        }
        @keyframes rg-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes rg-pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(var(--rg-ring),0.55); }
          70%  { box-shadow: 0 0 0 16px rgba(var(--rg-ring),0); }
          100% { box-shadow: 0 0 0 0 rgba(var(--rg-ring),0); }
        }
        @keyframes rg-shimmer {
          0%   { transform: translateX(-120%) skewX(-18deg); }
          100% { transform: translateX(340%) skewX(-18deg); }
        }
        @keyframes rg-card-in {
          from { opacity: 0; transform: translateY(34px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rg-swap-in {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes rg-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        @keyframes rg-border-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes rg-icon-swap {
          from { opacity: 0; transform: rotate(-90deg) scale(0.5); }
          to   { opacity: 1; transform: rotate(0) scale(1); }
        }
        .rg-fade-left { animation: rg-fade-left 0.75s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rg-blob      { animation: rg-blob 14s ease-in-out infinite; }
        .rg-float     { animation: rg-float 5s ease-in-out infinite; }
        .rg-pulse     { animation: rg-pulse-ring 2.4s ease-out infinite; }
        .rg-card-in   { animation: rg-card-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rg-swap-in   { animation: rg-swap-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rg-shake     { animation: rg-shake 0.45s ease-in-out; }
        .rg-icon-swap { animation: rg-icon-swap 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rg-border-spin { animation: rg-border-spin 8s linear infinite; }
        .rg-shimmer-btn { position: relative; overflow: hidden; }
        .rg-shimmer-btn::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
          animation: rg-shimmer 2.8s ease-in-out infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .rg-fade-left, .rg-blob, .rg-float, .rg-pulse, .rg-card-in,
          .rg-swap-in, .rg-shake, .rg-border-spin, .rg-icon-swap { animation: none !important; }
          .rg-shimmer-btn::after { animation: none !important; }
        }
      `}</style>

      {/* Background: hero.png + tinted gradient + drifting glow blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* <img src="/hero.png" alt="" className="w-full h-full object-cover" /> */}
        <div className={`absolute inset-0 transition-colors duration-500 ${th.overlay}`} />
        <div className={`rg-blob absolute -top-28 -left-24 w-[440px] h-[440px] rounded-full blur-3xl transition-colors duration-500 ${th.blobA}`} />
        <div
          className={`rg-blob absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full blur-3xl transition-colors duration-500 ${th.blobB}`}
          style={{ animationDelay: '-5s' }}
        />
        <div
          className={`rg-blob absolute -bottom-36 left-1/3 w-[400px] h-[400px] rounded-full blur-3xl transition-colors duration-500 ${th.blobC}`}
          style={{ animationDelay: '-9s' }}
        />
      </div>

      {/* Header — fixed + transparent, glass blur after scroll (same as landing page) */}
      <header
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-300 ${
          scrolled ? th.navScrolled : th.navIdle
        }`}
      >
        <div className="max-w-6xl mx-auto h-[76px] flex items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 group"
            aria-label={t('nav_home_label')}
          >
            <Store
              className={`${th.accentText} transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110`}
              size={26}
              strokeWidth={2}
            />
            <span className={`${th.brand} text-xl font-semibold leading-none`}>Regantify</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Day / Night toggle */}
            <button
              onClick={toggleMode}
              aria-label={mode === 'night' ? t('theme_to_light') : t('theme_to_dark')}
              title={mode === 'night' ? t('theme_to_light') : t('theme_to_dark')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${th.navBtnBorder}`}
            >
              <span key={mode} className="rg-icon-swap flex">
                {mode === 'night' ? <Sun size={16} /> : <Moon size={16} />}
              </span>
            </button>
            {/* Language toggle (same control as landing page) */}
            <button
              onClick={toggle}
              aria-label={t('toggle_lang_label')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${th.navBtnBorder}`}
            >
              <Languages size={15} />
              {lang === 'en' ? 'বাংলা' : 'English'}
            </button>
            {/* Active tab: Login */}
            <span
              className={`px-3.5 py-2 rounded-full text-sm font-medium cursor-default ${th.navActive}`}
              aria-current="page"
            >
              {t('nav_login')}
            </span>
            <button
              onClick={() => navigate('/vendor/signup')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${th.signupBtn}`}
            >
              {t('nav_signup')}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 min-h-screen max-w-6xl mx-auto px-6 pt-[120px] pb-16 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Left — pitch */}
        <section className="hidden lg:block">
          <span
            className={`rg-fade-left inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full mb-6 ${th.tag}`}
            style={{ animationDelay: '0.05s' }}
          >
            <Store size={14} />
            {t('pitch_tag')}
          </span>
          <h1
            className={`rg-fade-left text-4xl xl:text-5xl font-bold leading-[1.15] max-w-md ${th.headline}`}
            style={{ animationDelay: '0.15s' }}
          >
            {t('pitch_title_1')}{' '}
            <span className={th.accentText}>{t('pitch_title_accent')}</span>
            {t('pitch_title_2')}
          </h1>
          <p
            className={`rg-fade-left mt-5 text-lg max-w-md leading-relaxed ${th.sub}`}
            style={{ animationDelay: '0.25s' }}
          >
            {t('pitch_sub')}
          </p>

          <ul className="mt-10 space-y-3.5 max-w-md">
            {perks.map((perk, i) => (
              <li
                key={i}
                className={`rg-fade-left group flex items-start gap-4 p-4 rounded-2xl backdrop-blur
                  hover:translate-x-1.5 transition-all duration-300 ${th.perkCard}`}
                style={{ animationDelay: `${0.4 + i * 0.12}s` }}
              >
                <div
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                    transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${th.iconChip}`}
                >
                  <perk.icon size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className={`font-semibold ${th.perkTitle}`}>{perk.title}</h3>
                  <p className={`mt-0.5 text-sm ${th.perkDetail}`}>{perk.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Right — form card */}
        <section className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
          <div className="rg-card-in relative" style={{ animationDelay: '0.1s' }}>
            <div className="rg-float">
              {/* Rotating gradient border */}
              <div className="relative rounded-3xl p-[1.5px] overflow-hidden">
                <div
                  aria-hidden
                  className="rg-border-spin absolute -inset-[60%]"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, #95BF47 70deg, transparent 140deg, #008060 220deg, transparent 300deg)',
                  }}
                />
                <div
                  className={`relative rounded-[22px] backdrop-blur-xl p-7 sm:p-9 transition-colors duration-500 ${th.cardInner}`}
                >
                  <div className="rg-swap-in">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center rg-pulse ${th.iconChip}`}
                      style={{ ['--rg-ring' as string]: th.ringColor }}
                    >
                      <Lock size={22} strokeWidth={2.2} />
                    </div>
                    <h2 className={`mt-5 text-2xl font-bold ${th.formTitle}`}>{t('form_title')}</h2>
                    <p className={`mt-2 text-sm leading-relaxed ${th.formSub}`}>{t('form_sub')}</p>

                    <form
                      onSubmit={passwordForm.handleSubmit(handlePasswordLogin)}
                      className="mt-7 space-y-5"
                    >
                      <div>
                        <label className={`block text-sm font-medium mb-1.5 ${th.label}`}>
                          {t('label_identifier')}
                        </label>
                        <div className="relative group">
                          <User
                            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${th.inputIcon}`}
                            size={18}
                          />
                          <input
                            type="text"
                            placeholder={t('ph_identifier')}
                            className={inputBase}
                            {...passwordForm.register('identifier')}
                          />
                        </div>
                        {identifierError && (
                          <p className={`rg-shake text-sm mt-1.5 ${th.error}`}>
                            {errText(identifierError.message)}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-1.5 ${th.label}`}>
                          {t('label_password')}
                        </label>
                        <div className="relative group">
                          <Lock
                            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${th.inputIcon}`}
                            size={18}
                          />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className={`${inputBase} pr-12`}
                            {...passwordForm.register('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? t('hide_password') : t('show_password')}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${th.eyeBtn}`}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {passwordError && (
                          <p className={`rg-shake text-sm mt-1.5 ${th.error}`}>
                            {errText(passwordError.message)}
                          </p>
                        )}
                      </div>

                      {serverError && (
                        <p className={`rg-shake text-sm rounded-lg px-3 py-2 ${th.errorBox}`}>
                          {serverError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className={`rg-shimmer-btn group w-full py-3.5 rounded-xl font-semibold
                          hover:scale-[1.02] active:scale-[0.98]
                          transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100
                          inline-flex items-center justify-center gap-2 ${th.primaryBtn}`}
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            {t('btn_signing_in')}
                          </>
                        ) : (
                          <>
                            {t('btn_signin')}
                            <ArrowRight
                              size={18}
                              className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/vendor/forgot-password')}
                        className={`w-full text-sm underline underline-offset-4 transition-colors ${th.link}`}
                      >
                        {t('forgot')}
                      </button>

                      <p className={`text-xs text-center ${th.muted}`}>
                        {t('new_here')}{' '}
                        <button
                          type="button"
                          onClick={() => navigate('/vendor/signup')}
                          className={`font-medium underline underline-offset-4 transition-colors ${th.accentLink}`}
                        >
                          {t('nav_signup')}
                        </button>
                      </p>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function VendorPhoneEntry() {
  return (
    <LangProvider>
      <VendorPhoneEntryInner />
    </LangProvider>
  );
}