import { createContext, useContext, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Boxes,
  Shirt,
  Apple,
  ArrowUpRight,
  Check,
  Plus,
  Minus,
  Languages,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// i18n — dictionary + provider, inlined here so this page is a single file
// ---------------------------------------------------------------------------

type Lang = 'en' | 'bn';

const dict = {
  en: {
    nav_who: "Who it's for",
    nav_services: 'Services',
    nav_features: 'Features',
    nav_pricing: 'Pricing',
    nav_faq: 'FAQ',
    nav_login: 'Login',
    nav_start: 'Start free',

    hero_title: 'Sell anything. Run it from one screen.',
    hero_sub: 'Regantify gives you a shop, an order list, and a way to get paid — all in one simple app.',
    hero_cta: 'Start free',
    hero_cta_2: 'See pricing',
    hero_note: 'No card needed · Free 14-day trial',
    hero_tag: 'All kinds of shops, 1 app',

    who_title: 'Made for every kind of shop',
    who_sub: 'Pick what you sell. The app sets itself up around it.',
    cat1_name: 'Gadgets',
    cat1_detail: 'Color and storage options for each item',
    cat2_name: 'Clothes',
    cat2_detail: 'Size and color options, easy to browse',
    cat3_name: 'Food',
    cat3_detail: 'Weight, pack size, and expiry dates',

    run_title: 'Everything a new shop needs, built in',
    run_sub: 'Payments, delivery, and product listing used to be three headaches. Now they are just part of the app.',

    f1_eyebrow: 'Orders & delivery',
    f1_title: 'Run the whole business from one screen',
    f1_detail: 'See every order, every payment, and every delivery in one place. Print a label, mark a parcel picked up, watch the payment come in — no more switching between apps.',
    f1_b1: 'Order and delivery, always in sync',
    f1_b2: 'See when each payment lands',
    f1_b3: 'Find any past order by customer name',

    f2_eyebrow: 'Payments',
    f2_title: 'A wallet that already speaks bKash and Nagad',
    f2_detail: 'Regantify comes with one wallet built in. Customers pay with bKash, Nagad, Rocket, or a card — it all lands in the same place. No merchant account. No paperwork. Start taking payments today.',
    f2_b1: 'bKash and Nagad from day one',
    f2_b2: 'No merchant account needed',
    f2_b3: 'No developer or setup required',

    f3_eyebrow: 'Product listings',
    f3_title: 'Upload a photo, get a finished listing',
    f3_detail: 'Take a photo of your product. Regantify writes the title, the description, and the details for you. Change what you want, publish the rest as it is.',
    f3_b1: 'Written for your product type',
    f3_b2: 'Details filled in from the photo',
    f3_b3: 'Edit and publish in one step',

    feat_title: 'Everything to run your shop, nothing extra',
    feat1_title: 'One screen for everything',
    feat1_detail: 'Orders, payments, and stock — all in one place. No more spreadsheets.',
    feat2_title: 'Options that fit what you sell',
    feat2_detail: 'Size, color, weight — set up only what makes sense for your shop.',
    feat3_title: 'A shop page, ready to go',
    feat3_detail: 'The moment you add your first product, your shop is live. No website needed.',
    feat4_title: 'Made for Bangladesh',
    feat4_detail: 'bKash, Nagad, and courier handoff, ready from the start.',

    pricing_title: 'Simple pricing',
    pricing_sub: 'Start for free. Pay only when your shop grows.',
    plan1_name: 'Starter',
    plan1_tag: 'Try it with your first few products.',
    plan1_cta: 'Start free',
    plan1_f1: 'Up to 50 products',
    plan1_f2: '1 staff account',
    plan1_f3: '20,000 visits a month',
    plan1_f4: 'Unlimited photos',
    plan1_f5: '15+ free add-ons',

    plan2_name: 'Growth',
    plan2_badge: 'Most popular',
    plan2_tag: 'For shops ready to sell full time.',
    plan2_cta: 'Start free trial',
    plan2_f1: '500 products',
    plan2_f2: '5 staff accounts',
    plan2_f3: '150,000 visits a month',
    plan2_f4: 'Unlimited photos',
    plan2_f5: 'bKash & Nagad wallet built in',
    plan2_f6: 'AI-written product listings',
    plan2_f7: '25+ free add-ons',

    plan3_name: 'Business',
    plan3_tag: 'For big or multi-shop sellers.',
    plan3_cta: 'Talk to us',
    plan3_f1: 'Unlimited products',
    plan3_f2: '15 staff accounts',
    plan3_f3: '300,000+ visits a month',
    plan3_f4: 'Unlimited photos',
    plan3_f5: 'More than one shop page',
    plan3_f6: 'API access',
    plan3_f7: 'A person to help you, always',

    faq_title: 'Questions, answered',
    faq1_q: 'Do I need my own website?',
    faq1_a: 'No. Your shop page goes live the moment you add your first product. You can add your own domain name later if you want.',
    faq2_q: 'Do I need a merchant account to get paid?',
    faq2_a: 'No. The built-in wallet handles bKash, Nagad, and card payments for you. Nothing else to set up.',
    faq3_q: 'Can I change plans later?',
    faq3_a: 'Yes, any time, from Settings. The change starts on your next billing date. You keep everything you had.',
    faq4_q: 'What kind of shops is this for?',
    faq4_a: 'Any shop selling real products — gadgets, clothes, food, and more. The product options change to fit what you sell.',
    faq5_q: 'How does the free trial work?',
    faq5_a: 'Growth and Business plans include a 14-day free trial. No card needed to start, and we remind you before it ends.',

    closing_title: 'Your shop, live today.',
    closing_sub: 'Start free. No card needed.',
    closing_cta: 'Start free trial',

    footer_vendor: 'Vendor login',
    footer_admin: 'Admin login',
  },
  bn: {
    nav_who: 'কাদের জন্য',
    nav_services: 'সেবাসমূহ',
    nav_features: 'ফিচার',
    nav_pricing: 'মূল্য',
    nav_faq: 'প্রশ্ন',
    nav_login: 'লগইন',
    nav_start: 'ফ্রি শুরু করুন',

    hero_title: 'যেকোনো কিছু বিক্রি করুন। এক স্ক্রিন থেকেই সব চালান।',
    hero_sub: 'Regantify দিচ্ছে একটা দোকান, অর্ডার লিস্ট, আর টাকা নেওয়ার সহজ উপায় — সব এক অ্যাপে।',
    hero_cta: 'ফ্রি শুরু করুন',
    hero_cta_2: 'মূল্য দেখুন',
    hero_note: 'কার্ড লাগবে না · ১৪ দিন ফ্রি ট্রায়াল',
    hero_tag: '৩ ধরনের দোকান, ১টা অ্যাপ',

    who_title: 'সব ধরনের দোকানের জন্য তৈরি',
    who_sub: 'আপনি কী বিক্রি করেন বলুন। অ্যাপ নিজেই সাজিয়ে নেবে।',
    cat1_name: 'গ্যাজেট',
    cat1_detail: 'প্রতিটা পণ্যের রং আর মেমরি অপশন',
    cat2_name: 'পোশাক',
    cat2_detail: 'সাইজ আর রং অপশন, সহজে দেখা যায়',
    cat3_name: 'খাবার',
    cat3_detail: 'ওজন, প্যাক সাইজ, আর মেয়াদ তারিখ',

    run_title: 'নতুন দোকানের সব দরকার, একসাথে',
    run_sub: 'পেমেন্ট, ডেলিভারি, আর প্রোডাক্ট লিস্টিং — আগে তিনটা আলাদা ঝামেলা ছিল। এখন সব এক অ্যাপেই আছে।',

    f1_eyebrow: 'অর্ডার ও ডেলিভারি',
    f1_title: 'পুরো ব্যবসা চালান এক স্ক্রিন থেকে',
    f1_detail: 'সব অর্ডার, সব পেমেন্ট, আর সব ডেলিভারি — এক জায়গায় দেখুন। লেবেল প্রিন্ট করুন, পার্সেল পিকআপ মার্ক করুন, পেমেন্ট আসা দেখুন — আলাদা আলাদা অ্যাপে যাওয়ার দরকার নেই।',
    f1_b1: 'অর্ডার আর ডেলিভারি সবসময় মিলে থাকে',
    f1_b2: 'কখন পেমেন্ট এলো দেখুন',
    f1_b3: 'কাস্টমারের নাম দিয়ে পুরনো অর্ডার খুঁজুন',

    f2_eyebrow: 'পেমেন্ট',
    f2_title: 'একটা ওয়ালেট, যা bKash আর Nagad বোঝে',
    f2_detail: 'Regantify তে একটা ওয়ালেট আগে থেকেই আছে। কাস্টমার bKash, Nagad, Rocket, বা কার্ড দিয়ে পে করুক — সব একই জায়গায় জমা হবে। মার্চেন্ট অ্যাকাউন্ট লাগবে না। কাগজপত্র লাগবে না। আজই টাকা নেওয়া শুরু করুন।',
    f2_b1: 'প্রথম দিন থেকেই bKash আর Nagad',
    f2_b2: 'মার্চেন্ট অ্যাকাউন্ট লাগে না',
    f2_b3: 'ডেভেলপার বা সেটআপ লাগে না',

    f3_eyebrow: 'প্রোডাক্ট লিস্টিং',
    f3_title: 'ছবি দিন, রেডি লিস্টিং পান',
    f3_detail: 'আপনার পণ্যের একটা ছবি তুলুন। Regantify নিজেই টাইটেল, ডেসক্রিপশন, আর ডিটেইলস লিখে দেবে। যা বদলাতে চান বদলান, বাকিটা যেমন আছে তেমন পাবলিশ করুন।',
    f3_b1: 'আপনার প্রোডাক্টের ধরন অনুযায়ী লেখা',
    f3_b2: 'ছবি থেকেই ডিটেইলস বসে যায়',
    f3_b3: 'এডিট করুন, এক ক্লিকে পাবলিশ',

    feat_title: 'দোকান চালানোর সব কিছু, বাড়তি কিছু না',
    feat1_title: 'সব কিছুর জন্য এক স্ক্রিন',
    feat1_detail: 'অর্ডার, পেমেন্ট, স্টক — সব এক জায়গায়। আর স্প্রেডশিট লাগবে না।',
    feat2_title: 'যা বিক্রি করেন তার সাথে মেলে এমন অপশন',
    feat2_detail: 'সাইজ, রং, ওজন — শুধু যেটা আপনার দোকানের জন্য দরকার সেটাই সেট করুন।',
    feat3_title: 'দোকানের পেজ, রেডি',
    feat3_detail: 'প্রথম প্রোডাক্ট যোগ করার সাথে সাথেই দোকান লাইভ হয়ে যায়। ওয়েবসাইট লাগে না।',
    feat4_title: 'বাংলাদেশের জন্য তৈরি',
    feat4_detail: 'bKash, Nagad, আর কুরিয়ার হ্যান্ডঅফ — শুরু থেকেই রেডি।',

    pricing_title: 'সহজ মূল্য',
    pricing_sub: 'ফ্রি শুরু করুন। দোকান বড় হলে তখন দিন।',
    plan1_name: 'স্টার্টার',
    plan1_tag: 'প্রথম কয়েকটা প্রোডাক্ট দিয়ে চেষ্টা করুন।',
    plan1_cta: 'ফ্রি শুরু করুন',
    plan1_f1: '৫০টা পর্যন্ত প্রোডাক্ট',
    plan1_f2: '১টা স্টাফ অ্যাকাউন্ট',
    plan1_f3: 'মাসে ২০,০০০ ভিজিট',
    plan1_f4: 'আনলিমিটেড ছবি',
    plan1_f5: '১৫+ ফ্রি অ্যাড-অন',

    plan2_name: 'গ্রোথ',
    plan2_badge: 'সবচেয়ে জনপ্রিয়',
    plan2_tag: 'পুরোদমে বিক্রি শুরু করতে চান যারা।',
    plan2_cta: 'ফ্রি ট্রায়াল শুরু করুন',
    plan2_f1: '৫০০টা প্রোডাক্ট',
    plan2_f2: '৫টা স্টাফ অ্যাকাউন্ট',
    plan2_f3: 'মাসে ১,৫০,০০০ ভিজিট',
    plan2_f4: 'আনলিমিটেড ছবি',
    plan2_f5: 'bKash ও Nagad ওয়ালেট বিল্ট-ইন',
    plan2_f6: 'AI দিয়ে লেখা প্রোডাক্ট লিস্টিং',
    plan2_f7: '২৫+ ফ্রি অ্যাড-অন',

    plan3_name: 'বিজনেস',
    plan3_tag: 'বড় বা একাধিক দোকানের জন্য।',
    plan3_cta: 'কথা বলুন',
    plan3_f1: 'আনলিমিটেড প্রোডাক্ট',
    plan3_f2: '১৫টা স্টাফ অ্যাকাউন্ট',
    plan3_f3: 'মাসে ৩,০০,০০০+ ভিজিট',
    plan3_f4: 'আনলিমিটেড ছবি',
    plan3_f5: 'একাধিক দোকান পেজ',
    plan3_f6: 'API অ্যাক্সেস',
    plan3_f7: 'সবসময় সাহায্যের জন্য একজন মানুষ',

    faq_title: 'প্রশ্ন, উত্তর সহ',
    faq1_q: 'নিজের ওয়েবসাইট লাগবে কি?',
    faq1_a: 'না। প্রথম প্রোডাক্ট যোগ করার সাথে সাথেই আপনার দোকান লাইভ হয়ে যায়। পরে চাইলে নিজের ডোমেইন নাম যোগ করতে পারবেন।',
    faq2_q: 'টাকা নিতে মার্চেন্ট অ্যাকাউন্ট লাগবে কি?',
    faq2_a: 'না। বিল্ট-ইন ওয়ালেট bKash, Nagad, আর কার্ড পেমেন্ট সামলায়। আর কিছু সেট আপ করতে হয় না।',
    faq3_q: 'পরে প্ল্যান বদলাতে পারব?',
    faq3_a: 'হ্যাঁ, যেকোনো সময়, সেটিংস থেকে। পরের বিলিং তারিখ থেকে বদল শুরু হবে। আগের সব কিছু থেকে যাবে।',
    faq4_q: 'এটা কোন ধরনের দোকানের জন্য?',
    faq4_a: 'যেকোনো দোকান যারা আসল পণ্য বিক্রি করে — গ্যাজেট, পোশাক, খাবার, আরও অনেক কিছু। প্রোডাক্ট অপশন আপনার পণ্য অনুযায়ী বদলে যায়।',
    faq5_q: 'ফ্রি ট্রায়াল কীভাবে কাজ করে?',
    faq5_a: 'গ্রোথ আর বিজনেস প্ল্যানে ১৪ দিনের ফ্রি ট্রায়াল আছে। শুরু করতে কার্ড লাগে না, আর শেষ হওয়ার আগে আমরা মনে করিয়ে দেব।',

    closing_title: 'আপনার দোকান, আজই লাইভ।',
    closing_sub: 'ফ্রি শুরু করুন। কার্ড লাগবে না।',
    closing_cta: 'ফ্রি ট্রায়াল শুরু করুন',

    footer_vendor: 'ভেন্ডর লগইন',
    footer_admin: 'অ্যাডমিন লগইন',
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
// Page
// ---------------------------------------------------------------------------

function HomeInner() {
  const navigate = useNavigate();
  const { t, lang, toggle } = useLang();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const categories = [
    { icon: Boxes, name: t('cat1_name'), detail: t('cat1_detail') },
    { icon: Shirt, name: t('cat2_name'), detail: t('cat2_detail') },
    { icon: Apple, name: t('cat3_name'), detail: t('cat3_detail') },
  ];

  const features = [
    { title: t('feat1_title'), detail: t('feat1_detail') },
    { title: t('feat2_title'), detail: t('feat2_detail') },
    { title: t('feat3_title'), detail: t('feat3_detail') },
    { title: t('feat4_title'), detail: t('feat4_detail') },
  ];

  const runYourBusiness = [
    {
      eyebrow: t('f1_eyebrow'),
      title: t('f1_title'),
      detail: t('f1_detail'),
      bullets: [t('f1_b1'), t('f1_b2'), t('f1_b3')],
      image: '/img3.png',
      alt: 'Vendor managing orders and courier pickup from one screen',
    },
    {
      eyebrow: t('f2_eyebrow'),
      title: t('f2_title'),
      detail: t('f2_detail'),
      bullets: [t('f2_b1'), t('f2_b2'), t('f2_b3')],
      image: '/img2.png',
      alt: 'Built-in wallet accepting bKash and Nagad payments',
    },
    {
      eyebrow: t('f3_eyebrow'),
      title: t('f3_title'),
      detail: t('f3_detail'),
      bullets: [t('f3_b1'), t('f3_b2'), t('f3_b3')],
      image: '/img1.png',
      alt: 'Product photo turning into a finished listing automatically',
    },
  ];

  const plans = [
    {
      name: t('plan1_name'),
      price: '৳0',
      period: 'forever',
      tagline: t('plan1_tag'),
      cta: t('plan1_cta'),
      highlighted: false,
      features: [t('plan1_f1'), t('plan1_f2'), t('plan1_f3'), t('plan1_f4'), t('plan1_f5')],
    },
    {
      name: t('plan2_name'),
      price: '৳12,900',
      period: '/year',
      tagline: t('plan2_tag'),
      cta: t('plan2_cta'),
      highlighted: true,
      badge: t('plan2_badge'),
      features: [
        t('plan2_f1'), t('plan2_f2'), t('plan2_f3'), t('plan2_f4'),
        t('plan2_f5'), t('plan2_f6'), t('plan2_f7'),
      ],
    },
    {
      name: t('plan3_name'),
      price: '৳27,900',
      period: '/year',
      tagline: t('plan3_tag'),
      cta: t('plan3_cta'),
      highlighted: false,
      features: [
        t('plan3_f1'), t('plan3_f2'), t('plan3_f3'), t('plan3_f4'),
        t('plan3_f5'), t('plan3_f6'), t('plan3_f7'),
      ],
    },
  ];

  const faqs = [
    { q: t('faq1_q'), a: t('faq1_a') },
    { q: t('faq2_q'), a: t('faq2_a') },
    { q: t('faq3_q'), a: t('faq3_a') },
    { q: t('faq4_q'), a: t('faq4_a') },
    { q: t('faq5_q'), a: t('faq5_a') },
  ];

  return (
    <div className="bg-white text-[#1A1A1A]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-black/10">
        <div className="max-w-6xl mx-auto h-[76px] flex items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <Store className="text-[#008060]" size={26} strokeWidth={2} />
            <span className="text-[#1A1A1A] text-xl font-semibold leading-none">Regantify</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-[#1A1A1A]/70">
            <a href="#categories" className="hover:text-[#1A1A1A] transition-colors">{t('nav_who')}</a>
            <a href="#run" className="hover:text-[#1A1A1A] transition-colors">{t('nav_services')}</a>
            <a href="#features" className="hover:text-[#1A1A1A] transition-colors">{t('nav_features')}</a>
            <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors">{t('nav_pricing')}</a>
            <a href="#faq" className="hover:text-[#1A1A1A] transition-colors">{t('nav_faq')}</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle language"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-[#1A1A1A]/75
                border border-black/15 hover:border-black/30 hover:text-[#1A1A1A] transition-colors"
            >
              <Languages size={15} />
              {lang === 'en' ? 'বাংলা' : 'English'}
            </button>
            <button
              onClick={() => navigate('/vendor/login')}
              className="hidden sm:inline-flex px-3.5 py-2 rounded-full text-sm font-medium text-[#1A1A1A]/75 hover:text-[#1A1A1A] transition-colors"
            >
              {t('nav_login')}
            </button>
            <button
              onClick={() => navigate('/vendor/signup')}
              className="px-4 py-2 rounded-full text-sm font-medium bg-[#1A1A1A] text-white hover:bg-black transition-colors"
            >
              {t('nav_start')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero — full-bleed background image, copy overlaid */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/hero.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/90 via-[#1A1A1A]/70 to-[#1A1A1A]/20" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-28">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-white bg-[#008060] px-3 py-1.5 rounded-full mb-6">
            {t('hero_tag')}
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.15] text-white max-w-xl">
            {t('hero_title')}
          </h1>
          <p className="mt-5 text-lg text-white/85 max-w-md leading-relaxed">
            {t('hero_sub')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/vendor/signup')}
              className="px-6 py-3.5 rounded-full bg-[#95BF47] text-[#1A1A1A] font-medium
                hover:bg-[#84AD3D] transition-colors inline-flex items-center gap-2"
            >
              {t('hero_cta')}
              <ArrowUpRight size={18} />
            </button>
            <a
              href="#pricing"
              className="px-6 py-3.5 rounded-full border border-white/40 text-white font-medium
                hover:border-white/70 transition-colors"
            >
              {t('hero_cta_2')}
            </a>
          </div>
          <p className="mt-4 text-sm text-white/70">{t('hero_note')}</p>
        </div>
      </section>

      {/* Who it's for */}
      <section id="categories" className="bg-white border-y border-black/10">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-2">{t('who_title')}</h2>
          <p className="text-[#1A1A1A]/60 mb-10 max-w-lg">{t('who_sub')}</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <div key={cat.name} className="p-6 rounded-2xl bg-[#F1F1F1]">
                <cat.icon size={26} strokeWidth={1.75} className="text-[#008060]" />
                <h3 className="mt-4 font-semibold">{cat.name}</h3>
                <p className="mt-1.5 text-sm text-[#1A1A1A]/60">{cat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Run your business — editorial image strip */}
      <section id="run" className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold">{t('run_title')}</h2>
          <p className="mt-3 text-[#1A1A1A]/60">{t('run_sub')}</p>
        </div>

        <div className="mt-14 space-y-4">
          {runYourBusiness.map((item, i) => {
            const imageFirst = i % 2 === 1;
            return (
              <div
                key={item.title}
                className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden bg-white border border-black/10"
              >
                <div className={`p-8 md:p-10 flex flex-col justify-center ${imageFirst ? 'md:order-2' : ''}`}>
                  <span className="text-xs font-medium text-[#008060]">{item.eyebrow}</span>
                  <h3 className="mt-2 text-xl font-semibold leading-snug">{item.title}</h3>
                  <p className="mt-3 text-sm text-[#1A1A1A]/60 leading-relaxed max-w-md">{item.detail}</p>
                  <ul className="mt-5 space-y-2.5">
                    {item.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm">
                        <Check size={16} className="text-[#008060] mt-0.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`relative min-h-[280px] ${imageFirst ? 'md:order-1' : ''}`}>
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#F1F1F1] border-y border-black/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold mb-10">{t('feat_title')}</h2>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-10">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="mt-1 w-8 h-8 shrink-0 rounded-lg bg-[#95BF47] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-[#1A1A1A]/60">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold mb-2">{t('pricing_title')}</h2>
        <p className="text-[#1A1A1A]/60 mb-10 max-w-lg">{t('pricing_sub')}</p>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-7 flex flex-col ${
                plan.highlighted ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#1A1A1A] border border-black/10'
              }`}
            >
              {plan.highlighted && (
                <span className="text-xs font-medium text-[#95BF47] mb-2">{plan.badge}</span>
              )}
              <h3 className="font-semibold">{plan.name}</h3>
              <p className={`mt-1.5 text-sm ${plan.highlighted ? 'text-white/60' : 'text-[#1A1A1A]/60'}`}>
                {plan.tagline}
              </p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className={plan.highlighted ? 'text-white/60 text-sm' : 'text-[#1A1A1A]/60 text-sm'}>
                  {plan.period}
                </span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm">
                    <Check
                      size={16}
                      className={plan.highlighted ? 'text-white/70 mt-0.5 shrink-0' : 'text-[#1A1A1A]/50 mt-0.5 shrink-0'}
                    />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/vendor/signup')}
                className={`mt-7 w-full py-3 rounded-full font-medium transition-colors ${
                  plan.highlighted ? 'bg-[#95BF47] hover:bg-[#84AD3D] text-[#1A1A1A]' : 'bg-[#008060] text-white hover:bg-[#006B51]'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white border-y border-black/10">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold mb-10">{t('faq_title')}</h2>
          <div className="divide-y divide-black/10 border-t border-b border-black/10">
            {faqs.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="font-medium">{item.q}</span>
                    {open ? (
                      <Minus size={18} className="shrink-0 text-[#1A1A1A]/50" />
                    ) : (
                      <Plus size={18} className="shrink-0 text-[#1A1A1A]/50" />
                    )}
                  </button>
                  {open && <p className="pb-5 text-sm text-[#1A1A1A]/60 max-w-xl leading-relaxed">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Closing CTA — full section bg uses hero.png */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/hero.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#1A1A1A]/90" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('closing_title')}</h2>
            <p className="mt-2 text-white/70">{t('closing_sub')}</p>
          </div>
          <button
            onClick={() => navigate('/vendor/signup')}
            className="px-6 py-3.5 rounded-full bg-[#95BF47] hover:bg-[#84AD3D]
              text-[#1A1A1A] font-medium transition-colors inline-flex items-center gap-2 shrink-0"
          >
            {t('closing_cta')}
            <ArrowUpRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#1A1A1A]/60">
        <div className="flex items-center gap-2">
          <Store size={18} />
          <span>Regantify</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/vendor/login')} className="hover:text-[#1A1A1A]">
            {t('footer_vendor')}
          </button>
          <button onClick={() => navigate('/admin/login')} className="hover:text-[#1A1A1A]">
            {t('footer_admin')}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <LangProvider>
      <HomeInner />
    </LangProvider>
  );
}