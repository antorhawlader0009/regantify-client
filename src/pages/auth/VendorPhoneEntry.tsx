import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { GoogleButton } from '../../components/auth/GoogleButton';
import { TWO_STEP_PATH } from '../../lib/twoStepApi';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginAccountChoice } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { AuthShell, AuthHeading } from '../../components/auth/AuthShell';
import SiteNav, { readStoredLang, storeLang } from '../../components/marketing/SiteNav';
import {
  Lock,
  User,
  Store,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// i18n - dictionary + provider, inlined here so this page is a single file
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
    perk3_detail: 'Mobile banking and card payments, all in your wallet.',
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
    choose_account: 'This number has more than one account. Which one do you want to open?',
    account_turned_off: 'turned off',
    choose_back: 'Use a different number',
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
    perk1_detail: 'অর্ডার, পেমেন্ট, স্টক - সব এক জায়গায়।',
    perk2_title: 'অর্ডার আর ডেলিভারি মিলে থাকে',
    perk2_detail: 'লেবেল প্রিন্ট করুন, প্রতিটা পার্সেল ট্র্যাক করুন।',
    perk3_title: 'পেমেন্ট আসা দেখুন',
    perk3_detail: 'মোবাইল ব্যাংকিং আর কার্ড পেমেন্ট, সব আপনার ওয়ালেটে।',
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
    choose_account: 'এই নম্বরে একাধিক অ্যাকাউন্ট আছে। কোনটি খুলতে চান?',
    account_turned_off: 'বন্ধ করা',
    choose_back: 'অন্য নম্বর দিয়ে লগইন',
  },
} as const;


const SLIDES = {
  en: [
    { before: 'Set up your online store ', highlight: 'in minutes' },
    { before: 'Let AI answer ', highlight: 'your customers' },
    { before: 'Block fake COD orders ', highlight: 'before they ship' },
    { before: 'All business orders ', highlight: 'in one place' },
  ],
  bn: [
    { before: 'অনলাইন দোকান সাজান ', highlight: 'কয়েক মিনিটে' },
    { before: 'AI দিয়ে উত্তর দিন ', highlight: 'আপনার কাস্টমারকে' },
    { before: 'ভুয়া COD অর্ডার আটকান ', highlight: 'পাঠানোর আগেই' },
    { before: 'ব্যবসার সব অর্ডার ', highlight: 'এক জায়গায়' },
  ],
};

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
  const [lang, setLang] = useState<Lang>(readStoredLang);
  const toggle = () =>
    setLang((l) => {
      const next: Lang = l === 'en' ? 'bn' : 'en';
      storeLang(next);
      return next;
    });
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
// Day / Night theme - flat, no blur/glow, same green accents.
// ---------------------------------------------------------------------------

type Mode = 'night' | 'day';

const THEME_STORAGE_KEY = 'regantify-auth-theme';

function readStoredMode(): Mode {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'day' || v === 'night') return v;
  } catch {
    /* storage blocked - fall through to default */
  }
  return 'day';
}

const themes = {
  night: {
    page: 'bg-[#241812] text-white',
    nav: 'bg-[#241812] border-b border-white/10',
    brand: 'text-white',
    navText: 'text-white/85 hover:text-white',
    navActive: 'bg-white/15 text-white',
    navBtnBorder: 'text-white/85 border border-white/25 hover:border-white/50 hover:text-white',
    tag: 'text-white bg-[#C2531F]',
    headline: 'text-white',
    sub: 'text-white/75',
    perkCard: 'bg-white/[0.05] border border-white/10',
    perkTitle: 'text-white',
    perkDetail: 'text-white/60',
    cardInner: 'bg-[#2E2019] border border-white/10',
    formTitle: 'text-white',
    formSub: 'text-white/60',
    label: 'text-white/85',
    input:
      'bg-white/[0.07] text-white border border-white/15 placeholder:text-white/35 ' +
      'focus:border-[#F4A261] focus:bg-white/[0.1] focus:ring-2 focus:ring-[#F4A261]/25',
    inputIcon: 'text-white/40 group-focus-within:text-[#F4A261]',
    eyeBtn: 'text-white/45 hover:text-white hover:bg-white/10',
    error: 'text-red-400',
    errorBox: 'text-red-400 bg-red-500/10 border border-red-500/20',
    link: 'text-white/60 hover:text-[#F4A261]',
    muted: 'text-white/50',
    accentLink: 'text-[#F4A261] hover:text-[#F7B27E]',
    accentText: 'text-[#F4A261]',
    primaryBtn: 'bg-[#F4A261] text-[#241812] hover:bg-[#F7B27E]',
    signupBtn: 'bg-[#F4A261] text-[#241812] hover:bg-[#E08A4B]',
    iconChip: 'bg-[#F4A261] text-[#241812]',
  },
  day: {
    page: 'bg-[#FBF4EC] text-[#241812]',
    nav: 'bg-white border-b border-black/10',
    brand: 'text-[#241812]',
    navText: 'text-[#241812]/75 hover:text-[#241812]',
    navActive: 'bg-black/[0.07] text-[#241812]',
    navBtnBorder: 'text-[#241812]/80 border border-black/15 hover:border-black/35 hover:text-[#241812]',
    tag: 'text-white bg-[#C2531F]',
    headline: 'text-[#241812]',
    sub: 'text-[#241812]/65',
    perkCard: 'bg-white border border-black/10',
    perkTitle: 'text-[#241812]',
    perkDetail: 'text-[#241812]/60',
    cardInner: 'bg-white border border-black/10',
    formTitle: 'text-[#241812]',
    formSub: 'text-[#241812]/60',
    label: 'text-[#241812]/80',
    input:
      'bg-[#F6EADD] text-[#241812] border border-black/10 placeholder:text-[#241812]/35 ' +
      'focus:border-[#C2531F] focus:bg-white focus:ring-2 focus:ring-[#C2531F]/20',
    inputIcon: 'text-[#241812]/40 group-focus-within:text-[#C2531F]',
    eyeBtn: 'text-[#241812]/45 hover:text-[#241812] hover:bg-black/[0.06]',
    error: 'text-red-600',
    errorBox: 'text-red-700 bg-red-50 border border-red-200',
    link: 'text-[#241812]/60 hover:text-[#C2531F]',
    muted: 'text-[#241812]/55',
    accentLink: 'text-[#C2531F] hover:text-[#A8441A]',
    accentText: 'text-[#C2531F]',
    primaryBtn: 'bg-[#C2531F] text-white hover:bg-[#A8441A]',
    signupBtn: 'bg-[#C2531F] text-white hover:bg-[#A8441A]',
    iconChip: 'bg-[#C2531F] text-white',
  },
} as const;

const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Small animated shop-icon loader shown only while an API call is in
 * flight (sign-in). This is the one deliberate motion moment on the
 * page - everything else is static for fast, low-jank rendering on
 * low-end devices.
 */
function ShopLoader({ className = '' }: { className?: string }) {
  return (
    <span className={`rg-shop-loader inline-flex ${className}`}>
      <Store size={18} strokeWidth={2.4} />
    </span>
  );
}

/**
 * Vendor Login - phone number or email + password. Reached via the "Login"
 * button in the top-right corner of the auth header. New vendors use the
 * "Sign up" button instead, which starts the phone + OTP flow in
 * VendorSignup.
 *
 * Design note: this version is intentionally flat/minimal (no blur,
 * no continuous background animation, no rotating borders) so it stays
 * light to render on lower-end phones. The only motion is the shop-icon
 * loader shown while a request is in flight.
 */
function VendorPhoneEntryInner() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t, lang, toggle } = useLang();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState<Mode>(readStoredMode);
  const th = themes[mode];
  const toggleMode = () =>
    setMode((m) => {
      const next: Mode = m === 'night' ? 'day' : 'night';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* storage blocked - theme still works for this session */
      }
      return next;
    });

  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  // One phone can be on several staff accounts (and one owner account). When the password
  // matches more than one, the server lists them and the person picks which store to open.
  const [accountChoices, setAccountChoices] = useState<LoginAccountChoice[] | null>(null);

  const handlePasswordLogin = async (values: PasswordFormValues, accountId?: string) => {
    setServerError(null);
    setSubmitting(true);
    try {
      // Guard against accidental whitespace/newlines picked up when a
      // vendor pastes the temporary password straight from the SMS app.
      const res = await authApi.vendorLogin(values.identifier.trim(), values.password.trim(), accountId);

      if ('chooseAccount' in res) {
        setAccountChoices(res.accounts);
        return;
      }

      if (res.mustSetPassword) {
        // Still on the temporary password - no real session was issued.
        // Setting a real password is mandatory here (unlike right after
        // signup), so send them to the non-skippable setup screen.
        navigate('/vendor/complete-setup', { replace: true, state: { setupToken: res.setupToken } });
        return;
      }

      if ('twoFactorRequired' in res) {
        // Two-step sign-in on: the password only opened the code step.
        navigate(TWO_STEP_PATH, { replace: true, state: { challengeToken: res.challengeToken } });
        return;
      }

      setAuth(res.accessToken, res.user);
      navigate('/vendor/dashboard', { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? t('err_login_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase =
    `w-full pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 transition-colors ${th.input}`;

  const identifierError = passwordForm.formState.errors.identifier;
  const passwordError = passwordForm.formState.errors.password;
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

      {/* Header: the same bar as Home and Sign up */}
      <SiteNav
        lang={lang}
        onToggleLang={toggle}
        variant="solid"
        transparent
        active="login"
        night={mode === 'night'}
        onToggleTheme={toggleMode}
        light={mode === 'day'}
      />

      <AuthShell night={mode === 'night'} slides={SLIDES[lang]} start={0}>
        {/* Right - form card */}
        <div>
            <AuthHeading title={t('form_title')} sub={t('form_sub')} />

            {accountChoices ? (
              <div className="mt-5 space-y-3">
                <p className={`text-sm font-medium ${th.label}`}>{t('choose_account')}</p>
                {accountChoices.map((a) => (
                  <button
                    key={a.accountId}
                    type="button"
                    disabled={submitting || a.turnedOff}
                    onClick={() => handlePasswordLogin(passwordForm.getValues(), a.accountId)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-colors disabled:opacity-50
                      flex items-center justify-between gap-3 ${th.input}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold truncate">{a.storeName || '-'}</span>
                      <span className={`block text-sm ${th.muted}`}>
                        {a.roleName}
                        {a.turnedOff && ` · ${t('account_turned_off')}`}
                      </span>
                    </span>
                    <ArrowRight size={18} className="shrink-0" />
                  </button>
                ))}
                {serverError && (
                  <p className={`text-sm rounded-lg px-3 py-2 ${th.errorBox}`}>{serverError}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAccountChoices(null);
                    setServerError(null);
                  }}
                  className={`w-full text-sm underline underline-offset-4 transition-colors ${th.link}`}
                >
                  {t('choose_back')}
                </button>
              </div>
            ) : (
            <form onSubmit={passwordForm.handleSubmit((v) => handlePasswordLogin(v))} className="mt-5 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${th.label}`}>
                  {t('label_identifier')}
                </label>
                <div className="relative group">
                  <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${th.inputIcon}`} size={18} />
                  <input
                    type="text"
                    placeholder={t('ph_identifier')}
                    className={inputBase}
                    {...passwordForm.register('identifier')}
                  />
                </div>
                {identifierError && (
                  <p className={`text-sm mt-1.5 ${th.error}`}>{errText(identifierError.message)}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${th.label}`}>
                  {t('label_password')}
                </label>
                <div className="relative group">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${th.inputIcon}`} size={18} />
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
                  <p className={`text-sm mt-1.5 ${th.error}`}>{errText(passwordError.message)}</p>
                )}
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
                    {t('btn_signing_in')}
                  </>
                ) : (
                  <>
                    {t('btn_signin')}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <GoogleButton lang={lang} orAbove />

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
            )}
        </div>
      </AuthShell>
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