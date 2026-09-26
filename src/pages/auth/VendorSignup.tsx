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
  KeyRound,
  Eye,
  EyeOff,
  Languages,
  Sun,
  Moon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// i18n — dictionary + provider, inlined here so this page is a single file
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

    form_title: 'Sign up',
    form_sub: 'Enter your phone number to create your vendor account',
    label_phone: 'Phone number',
    ph_phone: '017XXXXXXXX',
    btn_send_otp: 'Send OTP',
    btn_sending: 'Sending code…',
    otp_note: "We'll text a 6-digit code and set up your account automatically.",
    have_account: 'Already have an account?',
    login_link: 'Log in',

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

    form_title: 'সাইন আপ',
    form_sub: 'ভেন্ডর অ্যাকাউন্ট খুলতে আপনার ফোন নম্বর দিন',
    label_phone: 'ফোন নম্বর',
    ph_phone: '017XXXXXXXX',
    btn_send_otp: 'OTP পাঠান',
    btn_sending: 'কোড পাঠানো হচ্ছে…',
    otp_note: 'আমরা একটা ৬ ডিজিটের কোড এসএমএস করব আর আপনার অ্যাকাউন্ট নিজেই সেট আপ করে দেব।',
    have_account: 'আগে থেকেই অ্যাকাউন্ট আছে?',
    login_link: 'লগইন করুন',

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
// Day / Night theme — flat, no blur/glow, same green accents.
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
  return 'day';
}

const themes = {
  night: {
    page: 'bg-[#1A1A1A] text-white',
    nav: 'bg-[#1A1A1A] border-b border-white/10',
    brand: 'text-white',
    navText: 'text-white/85 hover:text-white',
    navBtnBorder: 'text-white/85 border border-white/25 hover:border-white/50 hover:text-white',
    activeTab: 'bg-[#95BF47] text-[#1A1A1A]',
    tag: 'text-white bg-[#008060]',
    headline: 'text-white',
    sub: 'text-white/75',
    perkCard: 'bg-white/[0.05] border border-white/10',
    perkTitle: 'text-white',
    perkDetail: 'text-white/60',
    cardInner: 'bg-[#232323] border border-white/10',
    formTitle: 'text-white',
    formSub: 'text-white/60',
    label: 'text-white/85',
    input:
      'bg-white/[0.07] text-white border border-white/15 placeholder:text-white/35 ' +
      'focus:border-[#95BF47] focus:bg-white/[0.1] focus:ring-2 focus:ring-[#95BF47]/25',
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
  },
  day: {
    page: 'bg-[#F6F8F2] text-[#1A1A1A]',
    nav: 'bg-white border-b border-black/10',
    brand: 'text-[#1A1A1A]',
    navText: 'text-[#1A1A1A]/75 hover:text-[#1A1A1A]',
    navBtnBorder: 'text-[#1A1A1A]/80 border border-black/15 hover:border-black/35 hover:text-[#1A1A1A]',
    activeTab: 'bg-[#008060] text-white',
    tag: 'text-white bg-[#008060]',
    headline: 'text-[#1A1A1A]',
    sub: 'text-[#1A1A1A]/65',
    perkCard: 'bg-white border border-black/10',
    perkTitle: 'text-[#1A1A1A]',
    perkDetail: 'text-[#1A1A1A]/60',
    cardInner: 'bg-white border border-black/10',
    formTitle: 'text-[#1A1A1A]',
    formSub: 'text-[#1A1A1A]/60',
    label: 'text-[#1A1A1A]/80',
    input:
      'bg-[#F1F1F1] text-[#1A1A1A] border border-black/10 placeholder:text-[#1A1A1A]/35 ' +
      'focus:border-[#008060] focus:bg-white focus:ring-2 focus:ring-[#008060]/20',
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
  },
} as const;

const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;

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
 * Small animated shop-icon loader shown only while an API call is in
 * flight (send-OTP / login). This is the one deliberate motion moment
 * on the page — everything else is static for fast, low-jank rendering
 * on low-end devices.
 */
function ShopLoader({ className = '' }: { className?: string }) {
  return (
    <span className={`rg-shop-loader inline-flex ${className}`}>
      <Store size={18} strokeWidth={2.4} />
    </span>
  );
}

/**
 * Vendor Sign up — phone number, then OTP verification, then set a new
 * password (skippable — see VendorSetPassword). Reached via the "Sign up"
 * button in the top-right corner of the auth header.
 *
 * If the phone number already belongs to a vendor, sendOtp doesn't send
 * an OTP at all (see AuthService.sendOtp) — instead this shows an
 * inline "this account already exists" state right here: a password
 * field to log in directly, or a link into the forgot-password flow.
 *
 * Design note: this version is intentionally flat/minimal (no blur,
 * no continuous background animation, no rotating borders) so it stays
 * light to render on lower-end phones. The only motion is the shop-icon
 * loader shown while a request is in flight.
 */
function VendorSignupInner() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t, lang, toggle } = useLang();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [existingPhone, setExistingPhone] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    `w-full pl-11 pr-4 py-3.5 rounded-xl focus:outline-none transition-colors ${th.input}`;

  const phoneError = otpForm.formState.errors.phone;
  const passwordError = loginForm.formState.errors.password;
  const errText = (m?: string) => (m ? t(m as Key) : '');

  return (
    <div className={`min-h-screen ${th.page}`}>
      <style>{`
        @keyframes rg-shop-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-3px) rotate(-6deg); }
        }
        .rg-shop-loader { animation: rg-shop-bounce 0.7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .rg-shop-loader { animation: none !important; }
        }
      `}</style>

      {/* Header */}
      <header className={`sticky top-0 z-30 ${th.nav}`}>
        <div className="max-w-6xl mx-auto h-[68px] flex items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5"
            aria-label={t('nav_home_label')}
          >
            <Store className={th.accentText} size={24} strokeWidth={2} />
            <span className={`${th.brand} text-lg font-semibold leading-none`}>Regantify</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleMode}
              aria-label={mode === 'night' ? t('theme_to_light') : t('theme_to_dark')}
              title={mode === 'night' ? t('theme_to_light') : t('theme_to_dark')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${th.navBtnBorder}`}
            >
              {mode === 'night' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
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
      <main className="max-w-6xl mx-auto px-6 py-14 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Left — pitch */}
        <section className="hidden lg:block">
          <span className={`inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-full mb-6 ${th.tag}`}>
            {t('pitch_tag')}
          </span>
          <h1 className={`text-4xl xl:text-5xl font-bold leading-[1.15] max-w-md ${th.headline}`}>
            {t('pitch_title_1')}{' '}
            <span className={th.accentText}>{t('pitch_title_accent')}</span>
            {t('pitch_title_2')}
          </h1>
          <p className={`mt-5 text-lg max-w-md leading-relaxed ${th.sub}`}>{t('pitch_sub')}</p>

          <ul className="mt-10 space-y-4 max-w-md">
            {perks.map((perk, i) => (
              <li
                key={i}
                className={`flex items-start gap-4 p-4 rounded-2xl ${th.perkCard}`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${th.iconChip}`}>
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
          <div className={`rounded-2xl p-7 sm:p-9 ${th.cardInner}`}>
            {existingPhone ? (
              /* ---------- Existing account: log in with password ---------- */
              <div key="existing">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${th.iconChip}`}>
                  <KeyRound size={22} strokeWidth={2.2} />
                </div>
                <h2 className={`mt-5 text-2xl font-bold ${th.formTitle}`}>{t('exists_title')}</h2>
                <p className={`mt-2 text-sm leading-relaxed ${th.formSub}`}>
                  <span className={`font-medium ${th.accentText}`}>{existingPhone}</span> {t('exists_mid')}
                </p>

                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="mt-7 space-y-5">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${th.label}`}>
                      {t('label_password')}
                    </label>
                    <div className="relative group">
                      <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${th.inputIcon}`} size={18} />
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
                    {passwordError && <p className={`text-sm mt-1.5 ${th.error}`}>{errText(passwordError.message)}</p>}
                  </div>

                  {loginError && (
                    <p className={`text-sm rounded-lg px-3 py-2 ${th.errorBox}`}>{loginError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loginSubmitting}
                    className={`w-full py-3.5 rounded-xl font-semibold transition-colors
                      disabled:opacity-60 inline-flex items-center justify-center gap-2 ${th.primaryBtn}`}
                  >
                    {loginSubmitting ? (
                      <>
                        <ShopLoader />
                        {t('btn_signing_in')}
                      </>
                    ) : (
                      <>
                        {t('btn_login')}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/vendor/forgot-password', { state: { phone: existingPhone } })}
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
                    className={`w-full inline-flex items-center justify-center gap-1.5 text-sm transition-colors ${th.linkPlain}`}
                  >
                    <ArrowLeft size={15} />
                    {t('different_number')}
                  </button>
                </form>
              </div>
            ) : (
              /* ---------- Default: phone number -> Send OTP ---------- */
              <div key="signup">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${th.iconChip}`}>
                  <Store size={22} strokeWidth={2.2} />
                </div>
                <h2 className={`mt-5 text-2xl font-bold ${th.formTitle}`}>{t('form_title')}</h2>
                <p className={`mt-2 text-sm leading-relaxed ${th.formSub}`}>{t('form_sub')}</p>

                <form onSubmit={otpForm.handleSubmit(handleSendOtp)} className="mt-7 space-y-5">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${th.label}`}>{t('label_phone')}</label>
                    <div className="relative group">
                      <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${th.inputIcon}`} size={18} />
                      <input
                        type="tel"
                        placeholder={t('ph_phone')}
                        className={inputBase}
                        {...otpForm.register('phone')}
                      />
                    </div>
                    {phoneError && <p className={`text-sm mt-1.5 ${th.error}`}>{errText(phoneError.message)}</p>}
                  </div>

                  {serverError && (
                    <p className={`text-sm rounded-lg px-3 py-2 ${th.errorBox}`}>{serverError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3.5 rounded-xl font-semibold transition-colors
                      disabled:opacity-60 inline-flex items-center justify-center gap-2 ${th.primaryBtn}`}
                  >
                    {submitting ? (
                      <>
                        <ShopLoader />
                        {t('btn_sending')}
                      </>
                    ) : (
                      <>
                        {t('btn_send_otp')}
                        <ArrowRight size={18} />
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