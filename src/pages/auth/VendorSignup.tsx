import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import {
  Phone,
  Lock,
  Store,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Wallet,
  Sparkles,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
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

    pitch_tag: 'All kinds of shops, 1 app',
    pitch_title_1: 'Start selling in',
    pitch_title_accent: 'minutes',
    pitch_title_2: ', not weeks.',
    pitch_sub: 'One phone number is all it takes to open your shop, take payments, and manage orders.',

    perk1_title: 'Live in minutes',
    perk1_detail: 'Add one product and your shop page is live.',
    perk2_title: 'bKash & Nagad built in',
    perk2_detail: 'No merchant account, no paperwork.',
    perk3_title: 'No card needed',
    perk3_detail: 'Free 14-day trial. Cancel any time.',

    // Sign up (default)
    form_title: 'Sign up',
    form_sub: 'Enter your phone number to create your vendor account',
    label_phone: 'Phone number',
    ph_phone: '017XXXXXXXX',
    btn_send_otp: 'Send OTP',
    btn_sending: 'Sending code…',
    otp_note: "We'll text a 6-digit code and set up your account automatically.",
    have_account: 'Already have an account?',
    login_link: 'Log in',

    // Account already exists
    exists_title: 'Account already exists',
    exists_mid: 'is already registered. Log in below, or reset your password.',
    label_password: 'Password',
    show_password: 'Show password',
    hide_password: 'Hide password',
    btn_login: 'Log in',
    btn_signing_in: 'Signing in…',
    reset_password: 'Reset password',
    different_number: 'Use a different number',

    err_phone_required: 'Phone number is required',
    err_phone_invalid: 'Enter a valid Bangladeshi number, e.g. 017XXXXXXXX',
    err_password_required: 'Enter your password',
    err_generic: 'Something went wrong. Please try again.',
    err_bad_password: 'Invalid password.',
  },
  bn: {
    nav_login: 'লগইন',
    nav_signup: 'সাইন আপ',
    nav_home_label: 'Regantify হোম',
    theme_to_light: 'দিনের মোডে যান',
    theme_to_dark: 'রাতের মোডে যান',
    toggle_lang_label: 'ভাষা বদলান',

    pitch_tag: 'সব ধরনের দোকান, ১টা অ্যাপ',
    pitch_title_1: 'সপ্তাহ নয়, মাত্র',
    pitch_title_accent: 'কয়েক মিনিটে',
    pitch_title_2: ' বিক্রি শুরু করুন।',
    pitch_sub: 'দোকান খুলতে, পেমেন্ট নিতে আর অর্ডার সামলাতে শুধু একটা ফোন নম্বরই যথেষ্ট।',

    perk1_title: 'কয়েক মিনিটেই লাইভ',
    perk1_detail: 'একটা প্রোডাক্ট যোগ করুন, দোকান লাইভ হয়ে যাবে।',
    perk2_title: 'bKash আর Nagad বিল্ট-ইন',
    perk2_detail: 'মার্চেন্ট অ্যাকাউন্ট নেই, কাগজপত্র নেই।',
    perk3_title: 'কার্ড লাগবে না',
    perk3_detail: '১৪ দিন ফ্রি ট্রায়াল। যেকোনো সময় বাতিল করুন।',

    // Sign up (default)
    form_title: 'সাইন আপ',
    form_sub: 'ভেন্ডর অ্যাকাউন্ট খুলতে আপনার ফোন নম্বর দিন',
    label_phone: 'ফোন নম্বর',
    ph_phone: '017XXXXXXXX',
    btn_send_otp: 'OTP পাঠান',
    btn_sending: 'কোড পাঠানো হচ্ছে…',
    otp_note: 'আমরা একটা ৬ ডিজিটের কোড এসএমএস করব আর আপনার অ্যাকাউন্ট নিজেই সেট আপ করে দেব।',
    have_account: 'আগে থেকেই অ্যাকাউন্ট আছে?',
    login_link: 'লগইন করুন',

    // Account already exists
    exists_title: 'অ্যাকাউন্ট আগে থেকেই আছে',
    exists_mid: 'আগেই রেজিস্টার করা আছে। নিচে লগইন করুন, অথবা পাসওয়ার্ড রিসেট করুন।',
    label_password: 'পাসওয়ার্ড',
    show_password: 'পাসওয়ার্ড দেখান',
    hide_password: 'পাসওয়ার্ড লুকান',
    btn_login: 'লগইন',
    btn_signing_in: 'সাইন ইন হচ্ছে…',
    reset_password: 'পাসওয়ার্ড রিসেট করুন',
    different_number: 'অন্য নম্বর ব্যবহার করুন',

    err_phone_required: 'ফোন নম্বর দিতে হবে',
    err_phone_invalid: 'সঠিক বাংলাদেশি নম্বর দিন, যেমন 017XXXXXXXX',
    err_password_required: 'আপনার পাসওয়ার্ড দিন',
    err_generic: 'কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।',
    err_bad_password: 'পাসওয়ার্ড ভুল।',
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
    navBtnBorder: 'text-white/85 border border-white/25 hover:border-white/50 hover:text-white',
    activeTab: 'bg-[#95BF47] text-[#1A1A1A]',
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
    linkPlain: 'text-white/60 hover:text-white',
    muted: 'text-white/50',
    accentLink: 'text-[#95BF47] hover:text-[#A6D054]',
    accentText: 'text-[#95BF47]',
    primaryBtn: 'bg-[#95BF47] text-[#1A1A1A] hover:bg-[#A6D054]',
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
    navBtnBorder: 'text-[#1A1A1A]/80 border border-black/15 hover:border-black/35 hover:text-[#1A1A1A]',
    activeTab: 'bg-[#008060] text-white',
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
    linkPlain: 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]',
    muted: 'text-[#1A1A1A]/55',
    accentLink: 'text-[#008060] hover:text-[#006B51]',
    accentText: 'text-[#008060]',
    primaryBtn: 'bg-[#008060] text-white hover:bg-[#006B51]',
    iconChip: 'bg-[#008060] text-white',
    ringColor: '0,128,96',
  },
} as const;

const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;

// Validation messages are translation keys (not raw strings) so the error
// text follows the language toggle live; they are resolved with t() at render.
const otpSchema = z.object({
  phone: z
    .string()
    .min(1, 'err_phone_required')
    .regex(bdPhoneRegex, 'err_phone_invalid'),
});

const loginSchema = z.object({
  password: z.string().min(1, 'err_password_required'),
});

type OtpFormValues = z.infer<typeof otpSchema>;
type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Vendor Sign up — phone number, then OTP verification, then set a new
 * password (skippable — see VendorSetPassword). Reached via the "Sign up"
 * button in the top-right corner of the auth header.
 *
 * If the phone number already belongs to a vendor, sendOtp doesn't send
 * an OTP at all (see AuthService.sendOtp) — instead this shows an
 * inline "this account already exists" state right here: a password
 * field to log in directly, or a link into the forgot-password flow.
 * Avoids the old behavior of silently sending a signup OTP that
 * verify-otp would've just redirected into a forced password reset
 * anyway, with no explanation of why.
 *
 * This page renders its own full-bleed layout (same transparent navbar +
 * hero.png as the landing page and VendorPhoneEntry) instead of wrapping
 * in AuthShell. It also carries its own English/Bangla toggle and
 * Day/Night toggle, both self-contained in this file. All form logic,
 * validation rules, API calls and navigation targets are unchanged.
 */
function VendorSignupInner() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t, lang, toggle } = useLang();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set once sendOtp reports accountExists: true — switches the form
  // below from "send OTP" to "log in with password", still keyed to
  // the same phone number the vendor just typed.
  const [existingPhone, setExistingPhone] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
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

  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });
  const loginForm = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  // Navbar: fully transparent at the top, glass blur once the page scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSendOtp = async (values: OtpFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const res = await authApi.sendOtp(values.phone.trim());
      if (res.accountExists) {
        setExistingPhone(values.phone.trim());
        return;
      }
      navigate('/vendor/verify-otp', {
        state: { phone: values.phone },
      });
    } catch (err: any) {
      // A message coming from the server is shown as-is; only our own
      // fallback is translated.
      setServerError(err?.response?.data?.message ?? t('err_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (values: LoginFormValues) => {
    if (!existingPhone) return;
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const res = await authApi.vendorLogin(existingPhone, values.password.trim());
      if (res.mustSetPassword) {
        navigate('/vendor/complete-setup', { replace: true, state: { setupToken: res.setupToken } });
        return;
      }
      if (res.accessToken && res.user) {
        setAuth(res.accessToken, res.user);
        navigate('/vendor/dashboard', { replace: true });
      }
    } catch (err: any) {
      setLoginError(err?.response?.data?.message ?? t('err_bad_password'));
    } finally {
      setLoginSubmitting(false);
    }
  };

  const perks = [
    { icon: Zap, title: t('perk1_title'), detail: t('perk1_detail') },
    { icon: Wallet, title: t('perk2_title'), detail: t('perk2_detail') },
    { icon: ShieldCheck, title: t('perk3_title'), detail: t('perk3_detail') },
  ];

  const inputBase =
    `w-full pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 ${th.input}`;

  // zod messages are translation keys — resolve them at render time
  const phoneError = otpForm.formState.errors.phone;
  const passwordError = loginForm.formState.errors.password;
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
            <button
              onClick={() => navigate('/vendor/login')}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${th.navText}`}
            >
              {t('nav_login')}
            </button>
            {/* Active tab: Sign up */}
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium cursor-default ${th.activeTab}`}
              aria-current="page"
            >
              {t('nav_signup')}
            </span>
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
            <Sparkles size={14} />
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

          <ul className="mt-10 space-y-4 max-w-md">
            {perks.map((perk, i) => (
              <li
                key={i}
                className={`rg-fade-left group flex items-start gap-4 p-4 rounded-2xl backdrop-blur
                  hover:translate-x-1.5 transition-all duration-300 ${th.perkCard}`}
                style={{ animationDelay: `${0.4 + i * 0.13}s` }}
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
                  {existingPhone ? (
                    /* ---------- Existing account: log in with password ---------- */
                    <div key="existing" className="rg-swap-in">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center rg-pulse ${th.iconChip}`}
                        style={{ ['--rg-ring' as string]: th.ringColor }}
                      >
                        <KeyRound size={22} strokeWidth={2.2} />
                      </div>
                      <h2 className={`mt-5 text-2xl font-bold ${th.formTitle}`}>{t('exists_title')}</h2>
                      <p className={`mt-2 text-sm leading-relaxed ${th.formSub}`}>
                        <span className={`font-medium ${th.accentText}`}>{existingPhone}</span>{' '}
                        {t('exists_mid')}
                      </p>

                      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="mt-7 space-y-5">
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
                              autoFocus
                              className={`${inputBase} pr-12`}
                              {...loginForm.register('password')}
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

                        {loginError && (
                          <p className={`rg-shake text-sm rounded-lg px-3 py-2 ${th.errorBox}`}>
                            {loginError}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={loginSubmitting}
                          className={`rg-shimmer-btn group w-full py-3.5 rounded-xl font-semibold
                            hover:scale-[1.02] active:scale-[0.98]
                            transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100
                            inline-flex items-center justify-center gap-2 ${th.primaryBtn}`}
                        >
                          {loginSubmitting ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              {t('btn_signing_in')}
                            </>
                          ) : (
                            <>
                              {t('btn_login')}
                              <ArrowRight
                                size={18}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                              />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate('/vendor/forgot-password', { state: { phone: existingPhone } })
                          }
                          className={`w-full text-sm underline underline-offset-4 transition-colors ${th.link}`}
                        >
                          {t('reset_password')}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setExistingPhone(null);
                            setLoginError(null);
                            setShowPassword(false);
                            loginForm.reset();
                          }}
                          className={`group w-full inline-flex items-center justify-center gap-1.5 text-sm transition-colors ${th.linkPlain}`}
                        >
                          <ArrowLeft
                            size={15}
                            className="transition-transform duration-300 group-hover:-translate-x-1"
                          />
                          {t('different_number')}
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* ---------- Default: phone number -> Send OTP ---------- */
                    <div key="signup" className="rg-swap-in">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center rg-pulse ${th.iconChip}`}
                        style={{ ['--rg-ring' as string]: th.ringColor }}
                      >
                        <Store size={22} strokeWidth={2.2} />
                      </div>
                      <h2 className={`mt-5 text-2xl font-bold ${th.formTitle}`}>{t('form_title')}</h2>
                      <p className={`mt-2 text-sm leading-relaxed ${th.formSub}`}>{t('form_sub')}</p>

                      <form onSubmit={otpForm.handleSubmit(handleSendOtp)} className="mt-7 space-y-5">
                        <div>
                          <label className={`block text-sm font-medium mb-1.5 ${th.label}`}>
                            {t('label_phone')}
                          </label>
                          <div className="relative group">
                            <Phone
                              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${th.inputIcon}`}
                              size={18}
                            />
                            <input
                              type="tel"
                              placeholder={t('ph_phone')}
                              className={inputBase}
                              {...otpForm.register('phone')}
                            />
                          </div>
                          {phoneError && (
                            <p className={`rg-shake text-sm mt-1.5 ${th.error}`}>
                              {errText(phoneError.message)}
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
                              {t('btn_sending')}
                            </>
                          ) : (
                            <>
                              {t('btn_send_otp')}
                              <ArrowRight
                                size={18}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                              />
                            </>
                          )}
                        </button>

                        <p className={`text-xs text-center ${th.muted}`}>{t('otp_note')}</p>

                        <p className={`text-xs text-center ${th.muted}`}>
                          {t('have_account')}{' '}
                          <button
                            type="button"
                            onClick={() => navigate('/vendor/login')}
                            className={`font-medium underline underline-offset-4 transition-colors ${th.accentLink}`}
                          >
                            {t('login_link')}
                          </button>
                        </p>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function VendorSignup() {
  return (
    <LangProvider>
      <VendorSignupInner />
    </LangProvider>
  );
}