import { siteAsset } from '../../lib/siteAssets';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SiteNav, { readStoredLang, storeLang, readStoredNight, storeNight } from '../../components/marketing/SiteNav';
import HeroScrollStory from '../../components/marketing/HeroScrollStory';
import { useQuery } from '@tanstack/react-query';
import { storefrontStoreUrl } from '../../lib/storefrontUrl';
import TemplateShowcase from '../../components/marketing/TemplateShowcase';
import FaqChat from '../../components/marketing/FaqChat';
import {
  Store,
  ArrowUpRight,
  Check,
  X,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Zap,
  ArrowRight,
  Star,
} from 'lucide-react';
import { pick, publicSiteApi } from '../../lib/marketingCmsApi';
import { usePageMeta } from '../../lib/pageMeta';

// ---------------------------------------------------------------------------
// i18n - dictionary + provider, inlined here so this page is a single file
// ---------------------------------------------------------------------------

type Lang = 'en' | 'bn';

const dict = {
  en: {

    hero_title: 'We handle everything for growing your business.',
    hero_sub: 'Free setup and payment to orders and delivery, all in one place.',
    hero_cta: 'Start free',
    hero_carousel_label: 'What Regantify does',
    hero_f1_title: 'Add products by chatting',
    hero_f1_detail: 'Describe it in plain Bangla; AI fills the listing.',
    hero_f1_p1: 'Name, price, colours, sizes',
    hero_f1_p2: 'Photo and description ready',
    hero_f1_p3: 'Works with Add Product form',
    hero_f1_p4: 'Edit anything before saving',
    hero_f2_title: 'Handle every order with confidence',
    hero_f2_detail: 'Catch fake orders, track every order to delivery.',
    hero_f2_p1: 'Risk score, fake order check',
    hero_f2_p2: 'Customer order history',
    hero_f2_p3: 'Return or cancel in a tap',
    hero_f2_p4: 'Every status in one place',
    hero_f3_title: 'Send to any courier',
    hero_f3_detail: 'Book Pathao, SteadFast and RedX from your order list.',
    hero_f3_p1: 'Live tracking in dashboard',
    hero_f3_p2: 'COD collected and recorded',
    hero_f3_p3: 'Returns and refunds handled',
    hero_f3_p4: 'Bulk booking in one click',
    hero_f4_title: 'Landing pages in minutes',
    hero_f4_detail: 'Drag sections, publish a page that sells.',
    hero_f4_p1: 'Drag and drop builder',
    hero_f4_p2: 'Ready-made shop designs',
    hero_f4_p3: 'AI drafts from your product',
    hero_f4_p4: 'Order button and reviews',
    hero_f5_title: 'POS and LMS in one dashboard',
    hero_f5_detail: 'Sell at the counter and manage leads, all in Regantify.',
    hero_f5_p1: 'Receipt printer, barcode scanner',
    hero_f5_p2: 'Leads and follow-ups',
    hero_f5_p3: 'Same products, stock, customers',
    hero_f5_p4: 'Cashier PIN and shift reports',
    hero_f6_title: 'Get paid, safely',
    hero_f6_detail: 'Wallet, card or COD; money lands in your wallet.',
    hero_f6_p1: 'Mobile banking, card, COD',
    hero_f6_p2: 'Instant payment updates',
    hero_f6_p3: 'Daily earnings at a glance',
    hero_f6_p4: 'Safe checkout for shoppers',

    who_title: 'Premium store designs',
    who_sub: 'Pick a design that fits what you sell, then make it yours.',
    tpl_cta: 'Start for free',
    tpl1: 'Jewelry Store',
    tpl2: 'Grocery & Food',
    tpl3: 'Baby Care',
    tpl4: 'Furniture',
    tpl5: 'Books',
    tpl6: 'Pet Shop',
    tpl7: 'Medical & Care',
    tpl8: 'Gadgets',

    run_title: 'Everything a new shop needs, built in',
    run_sub: 'Payments, delivery, and product listing used to be three headaches. Now they are just part of the app.',
    run_chip: 'Built in',
    run_learn: 'Learn more',

    f1_eyebrow: 'Orders & delivery',
    f1_title: 'Run the whole business from one screen',
    f1_detail: 'See every order, every payment, and every delivery in one place. Print a label, mark a parcel picked up, watch the payment come in - no more switching between apps.',
    f1_b1: 'Order and delivery, always in sync',
    f1_b2: 'See when each payment lands',
    f1_b3: 'Find any past order by customer name',

    f2_eyebrow: 'Payments',
    f2_title: 'A wallet that already speaks mobile banking',
    f2_detail: 'Regantify comes with one wallet built in. Customers pay with mobile banking, a card or QR - it all lands in the same place. No merchant account. No paperwork. Start taking payments today.',
    f2_b1: 'Mobile banking payments from day one',
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
    feat1_detail: 'Orders, payments, and stock - all in one place. No more spreadsheets.',
    feat2_title: 'Options that fit what you sell',
    feat2_detail: 'Size, color, weight - set up only what makes sense for your shop.',
    feat3_title: 'A shop page, ready to go',
    feat3_detail: 'The moment you add your first product, your shop is live. No website needed.',
    feat4_title: 'Made for Bangladesh',
    feat4_detail: 'Mobile payments and courier handoff, ready from the start.',

    pricing_title: 'Simple pricing',
    pricing_sub: 'Start for free. Pay only when your shop grows.',
    pricing_toggle_monthly: 'Monthly',
    pricing_toggle_yearly: 'Yearly',
    pricing_per_month: '/month',
    pricing_per_year: '/year',
    pricing_sub_monthly: 'Billed monthly',
    pricing_sub_yearly: 'Billed yearly',
    pricing_equiv_month: 'Only',
    pricing_equiv_month_suffix: '/month',
    pricing_feature_col: 'Feature',
    pricing_view_chart: 'View comparison chart',
    pricing_chart_title: 'Compare all plans',
    pricing_chart_sub: 'Every feature, side by side.',
    pricing_close: 'Close',
    pricing_save: 'Save',
    pricing_key_features: 'Highlights',

    plan1_name: 'Free',
    plan1_tag: 'Try it with your first few products.',
    plan1_cta: 'Start free',

    plan2_name: 'Basic',
    plan2_tag: 'For shops just getting going.',
    plan2_cta: 'Choose Basic',

    plan3_name: 'Starter',
    plan3_badge: 'Most popular',
    plan3_tag: 'For shops ready to sell full time.',
    plan3_cta: 'Choose Starter',

    plan4_name: 'Advance',
    plan4_tag: 'For big or multi-shop sellers.',
    plan4_cta: 'Choose Advance',

    feat_row_product: 'Product',
    feat_row_order: 'Order',
    feat_row_visit: 'Monthly Visit',
    feat_row_theme: 'Theme',
    feat_row_domain: 'Custom Domain',
    feat_row_image: 'Image Upload',
    feat_row_aichat: 'Store AI Chat',
    feat_row_subdomain: 'Free Sub Domain',
    feat_row_courier: 'Courier Integration',
    feat_row_staff: 'Staff',
    feat_row_gateway: 'Payment Gateway',
    feat_row_custom_gateway: 'Custom Payment Gateway',
    feat_row_lms: 'LMS System',
    feat_row_pos: 'POS System',

    val_product_free: '5',
    val_product_unlimited: 'Unlimited',
    val_order_free: '5 per day',
    val_order_unlimited: 'Unlimited',
    val_visit_free: '900',
    val_visit_basic: '80,000',
    val_visit_starter: '200,000',
    val_visit_advance: 'Unlimited',
    val_theme_free: '1',
    val_theme_basic: '5',
    val_theme_starter: '10',
    val_theme_advance: 'All',
    val_image_free: '5',
    val_image_unlimited: 'Unlimited',
    val_aichat_free: '5 msg/day',
    val_aichat_basic: '100 msg/day',
    val_aichat_starter: '500 msg/day',
    val_aichat_advance: 'Unlimited',
    val_courier_free: '✓ (1 courier)',
    val_courier_paid: '✓',
    val_staff_free: '1',
    val_staff_basic: '2',
    val_staff_starter: '4',
    val_staff_advance: 'Unlimited',
    val_gateway_free: 'Free Payment Gateway - Per Transaction Fee: +10৳',
    val_gateway_basic: 'Free Payment Gateway - Per Transaction Fee: +7৳',
    val_gateway_starter: 'Free Payment Gateway - Per Transaction Fee: +5৳',
    val_gateway_advance: 'Free Payment Gateway - Per Transaction Fee: +5৳',
    val_custom_gateway_option: 'Option available',
    val_yes: '✓',
    val_no: '-',

    faq_title: 'Questions, answered',
    faq_reset: 'Start over',
    faq1_q: 'Do I need my own website?',
    faq1_a: 'No. Your shop page goes live the moment you add your first product. You can add your own domain name later if you want.',
    faq2_q: 'Do I need a merchant account to get paid?',
    faq2_a: 'No. The built-in wallet handles mobile banking and card payments for you. Nothing else to set up.',
    faq3_q: 'Can I change plans later?',
    faq3_a: 'Yes, any time, from Settings. The change starts on your next billing date. You keep everything you had.',
    faq4_q: 'What kind of shops is this for?',
    faq4_a: 'Any shop selling real products - gadgets, clothes, food, and more. The product options change to fit what you sell.',
    faq5_q: 'How does the free trial work?',
    faq5_a: 'Growth and Business plans include a 14-day free trial. No card needed to start, and we remind you before it ends.',

    closing_title: 'Your shop, live today.',
    closing_sub: 'Start free. No card needed.',
    closing_cta: 'Start free trial',

    footer_privacy: 'Privacy Policy',
    footer_terms: 'Terms of Service',
    footer_vendor: 'Vendor login',
    footer_admin: 'Admin login',
  },
  bn: {

    hero_title: 'আপনার ব্যবসা বড় করার পুরো দায়িত্ব আমাদের।',
    hero_sub: 'ফ্রি সেটআপ থেকে পেমেন্ট, অর্ডার ও ডেলিভারি সব এক জায়গায়।',
    hero_cta: 'ফ্রি শুরু করুন',
    hero_carousel_label: 'Regantify যা যা করে',
    hero_f1_title: 'চ্যাট করেই প্রোডাক্ট যোগ করুন',
    hero_f1_detail: 'সহজ বাংলায় বলুন, লিস্টিং AI সাজিয়ে দেবে।',
    hero_f1_p1: 'নাম, দাম, রং, সাইজ',
    hero_f1_p2: 'ছবি ও বিবরণ তৈরি',
    hero_f1_p3: 'Add Product ফর্মে কাজ করে',
    hero_f1_p4: 'সেভের আগে সব এডিট করা যায়',
    hero_f2_title: 'প্রতিটি অর্ডার সামলান নিশ্চিন্তে',
    hero_f2_detail: 'ভুয়া অর্ডার ধরুন, ডেলিভারি পর্যন্ত ট্র্যাক করুন।',
    hero_f2_p1: 'রিস্ক স্কোর ও ভুয়া অর্ডার শনাক্ত',
    hero_f2_p2: 'কাস্টমারের অর্ডার হিস্টরি',
    hero_f2_p3: 'এক ট্যাপে রিটার্ন ও ক্যানসেল',
    hero_f2_p4: 'সব স্ট্যাটাস এক জায়গায়',
    hero_f3_title: 'যেকোনো কুরিয়ারে পাঠান',
    hero_f3_detail: 'অর্ডার লিস্ট থেকেই Pathao, SteadFast, RedX-এ বুক করুন।',
    hero_f3_p1: 'ড্যাশবোর্ডে লাইভ ট্র্যাকিং',
    hero_f3_p2: 'COD-এর টাকা হিসাবে ওঠে',
    hero_f3_p3: 'রিটার্ন ও রিফান্ড সামলানো',
    hero_f3_p4: 'এক ক্লিকে বাল্ক বুকিং',
    hero_f4_title: 'মিনিটেই ল্যান্ডিং পেজ',
    hero_f4_detail: 'সেকশন টেনে বসান, বিক্রি বাড়ানো পেজ পাবলিশ করুন।',
    hero_f4_p1: 'ড্র্যাগ-অ্যান্ড-ড্রপ বিল্ডার',
    hero_f4_p2: 'রেডিমেড দোকানের ডিজাইন',
    hero_f4_p3: 'প্রোডাক্ট থেকে AI খসড়া',
    hero_f4_p4: 'অর্ডার বাটন ও রিভিউ',
    hero_f5_title: 'একই ড্যাশবোর্ডে POS আর LMS',
    hero_f5_detail: 'দোকানে বিক্রি আর লিড সামলান, Regantify-তেই।',
    hero_f5_p1: 'রসিদ প্রিন্টার ও বারকোড স্ক্যানার',
    hero_f5_p2: 'লিড ও ফলো-আপ',
    hero_f5_p3: 'একই প্রোডাক্ট, স্টক ও কাস্টমার',
    hero_f5_p4: 'ক্যাশিয়ার পিন ও শিফট রিপোর্ট',
    hero_f6_title: 'নিরাপদে পেমেন্ট নিন',
    hero_f6_detail: 'ওয়ালেট, কার্ড বা COD-এ পেমেন্ট, টাকা আপনার ওয়ালেটে।',
    hero_f6_p1: 'মোবাইল ব্যাংকিং, কার্ড, COD',
    hero_f6_p2: 'পেমেন্টের সাথে সাথে আপডেট',
    hero_f6_p3: 'প্রতিদিনের আয় এক নজরে',
    hero_f6_p4: 'ক্রেতার জন্য নিরাপদ চেকআউট',

    who_title: 'তৈরি স্টোর ডিজাইন',
    who_sub: 'আপনি যা বিক্রি করেন তার সাথে মানানসই ডিজাইন বেছে নিন, তারপর নিজের মতো সাজান।',
    tpl_cta: 'ফ্রি শুরু করুন',
    tpl1: 'জুয়েলারি স্টোর',
    tpl2: 'মুদি ও খাবার',
    tpl3: 'বেবি কেয়ার',
    tpl4: 'ফার্নিচার',
    tpl5: 'বই',
    tpl6: 'পোষা প্রাণীর দোকান',
    tpl7: 'মেডিকেল ও কেয়ার',
    tpl8: 'গ্যাজেট',

    run_title: 'নতুন দোকানের সব দরকার, একসাথে',
    run_sub: 'পেমেন্ট, ডেলিভারি, আর প্রোডাক্ট লিস্টিং - আগে তিনটা আলাদা ঝামেলা ছিল। এখন সব এক অ্যাপেই আছে।',
    run_chip: 'অ্যাপেই আছে',
    run_learn: 'আরও জানুন',

    f1_eyebrow: 'অর্ডার ও ডেলিভারি',
    f1_title: 'পুরো ব্যবসা চালান এক স্ক্রিন থেকে',
    f1_detail: 'সব অর্ডার, সব পেমেন্ট, আর সব ডেলিভারি - এক জায়গায় দেখুন। লেবেল প্রিন্ট করুন, পার্সেল পিকআপ মার্ক করুন, পেমেন্ট আসা দেখুন - আলাদা আলাদা অ্যাপে যাওয়ার দরকার নেই।',
    f1_b1: 'অর্ডার আর ডেলিভারি সবসময় মিলে থাকে',
    f1_b2: 'কখন পেমেন্ট এলো দেখুন',
    f1_b3: 'কাস্টমারের নাম দিয়ে পুরনো অর্ডার খুঁজুন',

    f2_eyebrow: 'পেমেন্ট',
    f2_title: 'একটা ওয়ালেট, যা মোবাইল ব্যাংকিং বোঝে',
    f2_detail: 'Regantify তে একটা ওয়ালেট আগে থেকেই আছে। কাস্টমার মোবাইল ব্যাংকিং, কার্ড বা QR দিয়ে পে করুক - সব একই জায়গায় জমা হবে। মার্চেন্ট অ্যাকাউন্ট লাগবে না। কাগজপত্র লাগবে না। আজই টাকা নেওয়া শুরু করুন।',
    f2_b1: 'প্রথম দিন থেকেই মোবাইল ব্যাংকিং পেমেন্ট',
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
    feat1_detail: 'অর্ডার, পেমেন্ট, স্টক - সব এক জায়গায়। আর স্প্রেডশিট লাগবে না।',
    feat2_title: 'যা বিক্রি করেন তার সাথে মেলে এমন অপশন',
    feat2_detail: 'সাইজ, রং, ওজন - শুধু যেটা আপনার দোকানের জন্য দরকার সেটাই সেট করুন।',
    feat3_title: 'দোকানের পেজ, রেডি',
    feat3_detail: 'প্রথম প্রোডাক্ট যোগ করার সাথে সাথেই দোকান লাইভ হয়ে যায়। ওয়েবসাইট লাগে না।',
    feat4_title: 'বাংলাদেশের জন্য তৈরি',
    feat4_detail: 'মোবাইল পেমেন্ট আর কুরিয়ার হ্যান্ডঅফ - শুরু থেকেই রেডি।',

    pricing_title: 'সহজ মূল্য',
    pricing_sub: 'ফ্রি শুরু করুন। দোকান বড় হলে তখন দিন।',
    pricing_toggle_monthly: 'মাসিক',
    pricing_toggle_yearly: 'বাৎসরিক',
    pricing_per_month: '/মাস',
    pricing_per_year: '/বছর',
    pricing_sub_monthly: 'মাসিক বিল',
    pricing_sub_yearly: 'বাৎসরিক বিল',
    pricing_equiv_month: 'মাত্র',
    pricing_equiv_month_suffix: '/মাস',
    pricing_feature_col: 'ফিচার',
    pricing_view_chart: 'তুলনা চার্ট দেখুন',
    pricing_chart_title: 'সব প্ল্যানের তুলনা',
    pricing_chart_sub: 'সব ফিচার, পাশাপাশি।',
    pricing_close: 'বন্ধ করুন',
    pricing_save: 'সাশ্রয়',
    pricing_key_features: 'মূল সুবিধা',

    plan1_name: 'ফ্রি',
    plan1_tag: 'প্রথম কয়েকটা প্রোডাক্ট দিয়ে চেষ্টা করুন।',
    plan1_cta: 'ফ্রি শুরু করুন',

    plan2_name: 'বেসিক',
    plan2_tag: 'যারা মাত্র শুরু করছেন তাদের জন্য।',
    plan2_cta: 'বেসিক নিন',

    plan3_name: 'স্টার্টার',
    plan3_badge: 'সবচেয়ে জনপ্রিয়',
    plan3_tag: 'পুরোদমে বিক্রি শুরু করতে চান যারা।',
    plan3_cta: 'স্টার্টার নিন',

    plan4_name: 'অ্যাডভান্স',
    plan4_tag: 'বড় বা একাধিক দোকানের জন্য।',
    plan4_cta: 'অ্যাডভান্স নিন',

    feat_row_product: 'প্রোডাক্ট',
    feat_row_order: 'অর্ডার',
    feat_row_visit: 'মাসিক ভিজিট',
    feat_row_theme: 'থিম',
    feat_row_domain: 'কাস্টম ডোমেইন',
    feat_row_image: 'ছবি আপলোড',
    feat_row_aichat: 'স্টোর AI চ্যাট',
    feat_row_subdomain: 'ফ্রি সাব ডোমেইন',
    feat_row_courier: 'কুরিয়ার ইন্টিগ্রেশন',
    feat_row_staff: 'স্টাফ',
    feat_row_gateway: 'পেমেন্ট গেটওয়ে',
    feat_row_custom_gateway: 'কাস্টম পেমেন্ট গেটওয়ে',
    feat_row_lms: 'LMS সিস্টেম',
    feat_row_pos: 'POS সিস্টেম',

    val_product_free: '5',
    val_product_unlimited: 'আনলিমিটেড',
    val_order_free: 'দৈনিক 5টা',
    val_order_unlimited: 'আনলিমিটেড',
    val_visit_free: '900',
    val_visit_basic: '80,000',
    val_visit_starter: '2,00,000',
    val_visit_advance: 'আনলিমিটেড',
    val_theme_free: '1',
    val_theme_basic: '5',
    val_theme_starter: '10',
    val_theme_advance: 'সবগুলো',
    val_image_free: '5',
    val_image_unlimited: 'আনলিমিটেড',
    val_aichat_free: 'দৈনিক 5 মেসেজ',
    val_aichat_basic: 'দৈনিক 100 মেসেজ',
    val_aichat_starter: 'দৈনিক 500 মেসেজ',
    val_aichat_advance: 'আনলিমিটেড',
    val_courier_free: '✓ (1 courier)',
    val_courier_paid: '✓',
    val_staff_free: '1',
    val_staff_basic: '2',
    val_staff_starter: '4',
    val_staff_advance: 'আনলিমিটেড',
    val_gateway_free: 'ফ্রি পেমেন্ট গেটওয়ে - প্রতি ট্রানজেকশনে +10৳',
    val_gateway_basic: 'ফ্রি পেমেন্ট গেটওয়ে - প্রতি ট্রানজেকশনে +7৳',
    val_gateway_starter: 'ফ্রি পেমেন্ট গেটওয়ে - প্রতি ট্রানজেকশনে +5৳',
    val_gateway_advance: 'ফ্রি পেমেন্ট গেটওয়ে - প্রতি ট্রানজেকশনে +5৳',
    val_custom_gateway_option: 'অপশন আছে',
    val_yes: '✓',
    val_no: '-',

    faq_title: 'প্রশ্ন, উত্তর সহ',
    faq_reset: 'আবার শুরু করুন',
    faq1_q: 'নিজের ওয়েবসাইট লাগবে কি?',
    faq1_a: 'না। প্রথম প্রোডাক্ট যোগ করার সাথে সাথেই আপনার দোকান লাইভ হয়ে যায়। পরে চাইলে নিজের ডোমেইন নাম যোগ করতে পারবেন।',
    faq2_q: 'টাকা নিতে মার্চেন্ট অ্যাকাউন্ট লাগবে কি?',
    faq2_a: 'না। বিল্ট-ইন ওয়ালেট মোবাইল ব্যাংকিং আর কার্ড পেমেন্ট সামলায়। আর কিছু সেট আপ করতে হয় না।',
    faq3_q: 'পরে প্ল্যান বদলাতে পারব?',
    faq3_a: 'হ্যাঁ, যেকোনো সময়, সেটিংস থেকে। পরের বিলিং তারিখ থেকে বদল শুরু হবে। আগের সব কিছু থেকে যাবে।',
    faq4_q: 'এটা কোন ধরনের দোকানের জন্য?',
    faq4_a: 'যেকোনো দোকান যারা আসল পণ্য বিক্রি করে - গ্যাজেট, পোশাক, খাবার, আরও অনেক কিছু। প্রোডাক্ট অপশন আপনার পণ্য অনুযায়ী বদলে যায়।',
    faq5_q: 'ফ্রি ট্রায়াল কীভাবে কাজ করে?',
    faq5_a: 'গ্রোথ আর বিজনেস প্ল্যানে 14 দিনের ফ্রি ট্রায়াল আছে। শুরু করতে কার্ড লাগে না, আর শেষ হওয়ার আগে আমরা মনে করিয়ে দেব।',

    closing_title: 'আপনার দোকান, আজই লাইভ।',
    closing_sub: 'ফ্রি শুরু করুন। কার্ড লাগবে না।',
    closing_cta: 'ফ্রি ট্রায়াল শুরু করুন',

    footer_privacy: 'গোপনীয়তা নীতি',
    footer_terms: 'ব্যবহারের শর্তাবলি',
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
// Small animation helpers (pure React + CSS, no extra dependency)
// ---------------------------------------------------------------------------

/** Returns [ref, visible] - visible flips to true once the element scrolls into view. */
function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible] as const;
}

/** Smoothly counts from the previous value to `value` (ease-out cubic). */
function AnimatedNumber({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = to;
    };
  }, [value, duration]);

  return <>{display.toLocaleString('en-US')}</>;
}



// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function HomeInner() {
  const navigate = useNavigate();
  const { t, lang, toggle } = useLang();
  // Banner line and featured stores, set by Super Admin in Marketing (super-admin-plan.md Step 17).
  const { data: marketing } = useQuery({
    queryKey: ['public-marketing'],
    queryFn: publicSiteApi.marketing,
    staleTime: 60_000,
    retry: false,
  });
  // Text and pictures Super Admin set in Marketing > Homepage content (super-admin-new.md Step 14); an empty part keeps the built-in text below.
  const cms = marketing?.content;
  usePageMeta(cms?.seo.title || undefined, cms?.seo.description || undefined, cms?.seo.imageUrl ?? undefined);

  // Day / night for the whole page. The hero, pricing and closing sections are
  // dark by design in both modes; the rest of the page follows this.
  const [night, setNight] = useState(readStoredNight);
  const toggleTheme = () =>
    setNight((v) => {
      storeNight(!v);
      return !v;
    });

  // Arriving from the login / sign up bar with /#pricing and the like: scroll
  // to that section once the page is drawn.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  // Store design screenshots (tall, full-page), in public/images/designs/.
  // Eight cards = two rows of four.
  const templates = [
    { name: t('tpl1'), image: '/images/designs/jewelry.jpg' },
    { name: t('tpl2'), image: '/images/designs/grocery.jpg' },
    { name: t('tpl3'), image: '/images/designs/baby.jpg' },
    { name: t('tpl4'), image: '/images/designs/furniture.jpg' },
    { name: t('tpl5'), image: '/images/designs/books.jpg' },
    { name: t('tpl6'), image: '/images/designs/pet.jpg' },
    { name: t('tpl7'), image: '/images/designs/medical.jpg' },
    { name: t('tpl8'), image: '/images/designs/gadgets.jpg' },
  ];

  const features = [
    { title: t('feat1_title'), detail: t('feat1_detail') },
    { title: t('feat2_title'), detail: t('feat2_detail') },
    { title: t('feat3_title'), detail: t('feat3_detail') },
    { title: t('feat4_title'), detail: t('feat4_detail') },
  ];

  // The six landscape pictures of the hero scroll story, in the order they are met.
  const builtInSlides = [
    { image: '/site/hero-feat-1.jpg', alt: 'A seller adding a product through the AI assistant chat', title: t('hero_f1_title'), detail: t('hero_f1_detail'), points: [t('hero_f1_p1'), t('hero_f1_p2'), t('hero_f1_p3'), t('hero_f1_p4')] },
    { image: '/site/hero-feat-2.jpg', alt: 'A seller checking orders with a fake order risk score and order flow', title: t('hero_f2_title'), detail: t('hero_f2_detail'), points: [t('hero_f2_p1'), t('hero_f2_p2'), t('hero_f2_p3'), t('hero_f2_p4')] },
    { image: '/site/hero-feat-3.jpg', alt: 'Parcels handed to couriers from the Regantify order list', title: t('hero_f3_title'), detail: t('hero_f3_detail'), points: [t('hero_f3_p1'), t('hero_f3_p2'), t('hero_f3_p3'), t('hero_f3_p4')] },
    { image: '/site/hero-feat-4.jpg', alt: 'A seller building a landing page with the drag and drop builder', title: t('hero_f4_title'), detail: t('hero_f4_detail'), points: [t('hero_f4_p1'), t('hero_f4_p2'), t('hero_f4_p3'), t('hero_f4_p4')] },
    { image: '/site/hero-feat-5.jpg', alt: 'A shop counter with POS on one side and LMS on the other, around the dashboard', title: t('hero_f5_title'), detail: t('hero_f5_detail'), points: [t('hero_f5_p1'), t('hero_f5_p2'), t('hero_f5_p3'), t('hero_f5_p4')] },
    { image: '/site/hero-feat-6.jpg', alt: 'A shopper paying on a phone while the seller sees the payment arrive', title: t('hero_f6_title'), detail: t('hero_f6_detail'), points: [t('hero_f6_p1'), t('hero_f6_p2'), t('hero_f6_p3'), t('hero_f6_p4')] },
  ];

  const heroSlides = cms?.hero.slides.length
    ? cms.hero.slides.map((s) => ({ image: s.imageUrl, alt: pick(s.title, lang) || 'Regantify', title: pick(s.title, lang), detail: pick(s.detail, lang) }))
    : builtInSlides;

  // Mirrors the real 4 subscription tiers (Free/Basic/Starter/Advance -
  // see server/prisma/seed-plans.ts, the actual source of truth).
  // Billing: Monthly and Yearly are two different per-month rates (Yearly
  // is the cheaper rate). No first-month discount - the toggle just picks
  // which per-month rate applies, and the total for 12 months at that
  // rate is shown underneath.
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [chartOpen, setChartOpen] = useState(false);

  // Monthly prices come from Admin > Plans (GET v1/public/marketing planPrices); the numbers here are only the
  // defaults shown until that answer arrives. The yearly per-month rate is about 8% less, rounded to ৳10.
  const monthlyOf = (code: 'BASIC' | 'STARTER' | 'ADVANCE', fallback: number) => marketing?.planPrices?.[code] ?? fallback;
  const yearlyOf = (monthly: number) => Math.round((monthly * 0.92) / 10) * 10;
  const basicPrice = monthlyOf('BASIC', 490);
  const starterPrice = monthlyOf('STARTER', 1190);
  const advancePrice = monthlyOf('ADVANCE', 2190);

  const plans = [
    {
      key: 'free',
      name: t('plan1_name'),
      tagline: t('plan1_tag'),
      cta: t('plan1_cta'),
      highlighted: false,
      badge: undefined as string | undefined,
      monthlyPrice: 0,
      yearlyPrice: 0,
    },
    {
      key: 'basic',
      name: t('plan2_name'),
      tagline: t('plan2_tag'),
      cta: t('plan2_cta'),
      highlighted: false,
      badge: undefined as string | undefined,
      monthlyPrice: basicPrice,
      yearlyPrice: yearlyOf(basicPrice),
    },
    {
      key: 'starter',
      name: t('plan3_name'),
      tagline: t('plan3_tag'),
      cta: t('plan3_cta'),
      highlighted: true,
      badge: t('plan3_badge') as string | undefined,
      monthlyPrice: starterPrice,
      yearlyPrice: yearlyOf(starterPrice),
    },
    {
      key: 'advance',
      name: t('plan4_name'),
      tagline: t('plan4_tag'),
      cta: t('plan4_cta'),
      highlighted: false,
      badge: undefined as string | undefined,
      monthlyPrice: advancePrice,
      yearlyPrice: yearlyOf(advancePrice),
    },
  ];

  // Feature comparison rows - one row per feature, one value per plan
  // (free, basic, starter, advance), matching the table structure supplied.
  const featureRows = [
    {
      label: t('feat_row_product'),
      values: [t('val_product_free'), t('val_product_unlimited'), t('val_product_unlimited'), t('val_product_unlimited')],
    },
    {
      label: t('feat_row_order'),
      values: [t('val_order_free'), t('val_order_unlimited'), t('val_order_unlimited'), t('val_order_unlimited')],
    },
    {
      label: t('feat_row_visit'),
      values: [t('val_visit_free'), t('val_visit_basic'), t('val_visit_starter'), t('val_visit_advance')],
    },
    {
      label: t('feat_row_theme'),
      values: [t('val_theme_free'), t('val_theme_basic'), t('val_theme_starter'), t('val_theme_advance')],
    },
    {
      label: t('feat_row_domain'),
      values: [t('val_no'), t('val_yes'), t('val_yes'), t('val_yes')],
    },
    {
      label: t('feat_row_image'),
      values: [t('val_image_free'), t('val_image_unlimited'), t('val_image_unlimited'), t('val_image_unlimited')],
    },
    {
      label: t('feat_row_aichat'),
      values: [t('val_aichat_free'), t('val_aichat_basic'), t('val_aichat_starter'), t('val_aichat_advance')],
    },
    {
      label: t('feat_row_subdomain'),
      values: [t('val_yes'), t('val_yes'), t('val_yes'), t('val_yes')],
    },
    {
      label: t('feat_row_courier'),
      values: [t('val_courier_free'), t('val_courier_paid'), t('val_courier_paid'), t('val_courier_paid')],
    },
    {
      label: t('feat_row_staff'),
      values: [t('val_staff_free'), t('val_staff_basic'), t('val_staff_starter'), t('val_staff_advance')],
    },
    {
      label: t('feat_row_gateway'),
      values: [t('val_gateway_free'), t('val_gateway_basic'), t('val_gateway_starter'), t('val_gateway_advance')],
    },
    {
      label: t('feat_row_custom_gateway'),
      values: [t('val_no'), t('val_custom_gateway_option'), t('val_custom_gateway_option'), t('val_custom_gateway_option')],
    },
    {
      label: t('feat_row_lms'),
      values: [t('val_no'), t('val_no'), t('val_no'), t('val_yes')],
    },
    {
      label: t('feat_row_pos'),
      values: [t('val_no'), t('val_no'), t('val_no'), t('val_yes')],
    },
  ];

  // Short highlight list shown on each animated pricing card
  // (the full comparison lives in the popup chart).
  const highlightRows = [
    { label: t('feat_row_product'), idx: 0 },
    { label: t('feat_row_order'), idx: 1 },
    { label: t('feat_row_staff'), idx: 9 },
    { label: t('feat_row_aichat'), idx: 6 },
  ];

  // Super Admin's questions replace the built-in five once at least one is switched on (super-admin-new.md Step 14).
  const faqs = cms?.faq.length ? cms.faq.map((f) => ({ q: pick(f.q, lang), a: pick(f.a, lang) })) : [
    { q: t('faq1_q'), a: t('faq1_a') },
    { q: t('faq2_q'), a: t('faq2_a') },
    { q: t('faq3_q'), a: t('faq3_a') },
    { q: t('faq4_q'), a: t('faq4_a') },
    { q: t('faq5_q'), a: t('faq5_a') },
  ];

  // Scroll-reveal for the pricing block
  const [pricingRef, pricingVisible] = useInView<HTMLDivElement>(0.1);

  // Lock body scroll + Escape-to-close while the chart popup is open
  useEffect(() => {
    if (!chartOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setChartOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [chartOpen]);

  return (
    // `dark:` variants only match INSIDE an element that has the class, so the class sits on a wrapper.
    <div className={night ? 'dark' : ''}>
    <div className="bg-white text-[#241812] transition-colors duration-300 dark:bg-[#1E1410] dark:text-white">
      {/* Local keyframes for the animated pricing section + chart popup */}
      <style>{`
        @keyframes rg-fade-up {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rg-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes rg-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244,162,97,0.45), 0 20px 50px -12px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 0 10px rgba(244,162,97,0), 0 20px 50px -12px rgba(0,0,0,0.5); }
        }
        @keyframes rg-shimmer {
          0%   { transform: translateX(-120%) skewX(-18deg); }
          100% { transform: translateX(320%) skewX(-18deg); }
        }
        @keyframes rg-blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(30px, -20px) scale(1.12); }
          66%      { transform: translate(-24px, 18px) scale(0.94); }
        }
        @keyframes rg-pop-in {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rg-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rg-row-in {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes rg-badge-bounce {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50%      { transform: translateY(-3px) rotate(2deg); }
        }
        .rg-fade-up   { animation: rg-fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rg-float     { animation: rg-float 4.5s ease-in-out infinite; }
        .rg-glow      { animation: rg-glow 2.6s ease-in-out infinite; }
        .rg-blob      { animation: rg-blob 14s ease-in-out infinite; }
        .rg-pop-in    { animation: rg-pop-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .rg-backdrop  { animation: rg-backdrop-in 0.3s ease-out both; }
        .rg-row-in    { animation: rg-row-in 0.4s ease-out both; }
        .rg-badge     { animation: rg-badge-bounce 2.4s ease-in-out infinite; }
        .rg-shimmer::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: rg-shimmer 2.8s ease-in-out infinite;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .rg-fade-up, .rg-float, .rg-glow, .rg-blob, .rg-pop-in,
          .rg-backdrop, .rg-row-in, .rg-badge { animation: none !important; }
          .rg-shimmer::after { animation: none !important; }
        }
      `}</style>

      {/* Header: shared with the login / sign up pages. Transparent over the hero,
          dark glass once scrolled. */}
      <SiteNav lang={lang} onToggleLang={toggle} variant="hero" glassAfter="categories" night={night} onToggleTheme={toggleTheme} light={!night} />

      {/* Hero: dark theme background, copy on top, the 4 product pictures in a
          looping 3D rail underneath. The navbar is fixed and transparent, hence
          the extra top padding. */}
      <section className="relative overflow-x-clip bg-[#FCF3E8] dark:bg-[#241812] transition-colors duration-300">

        <HeroScrollStory
          slides={heroSlides}
          label={t('hero_carousel_label')}
          header={(
        <div className="relative max-w-6xl mx-auto px-6 pt-[144px] flex flex-col items-center text-center">
          {marketing?.banner && (
            <div className="mb-5 max-w-full">
              {marketing.banner.link ? (
                marketing.banner.link.startsWith('/') ? (
                  <a href={marketing.banner.link} onClick={(e) => { e.preventDefault(); navigate(marketing.banner!.link!); }} className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#C2531F] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#A8441A]">
                    <span className="truncate">{marketing.banner.text}</span>
                    <ArrowRight size={14} className="shrink-0" />
                  </a>
                ) : (
                  <a href={marketing.banner.link} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#C2531F] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#A8441A]">
                    <span className="truncate">{marketing.banner.text}</span>
                    <ArrowRight size={14} className="shrink-0" />
                  </a>
                )
              ) : (
                <span className="inline-flex max-w-full items-center rounded-full bg-[#C2531F] px-4 py-1.5 text-sm font-medium text-white"><span className="truncate">{marketing.banner.text}</span></span>
              )}
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold leading-[1.2] text-[#241812] dark:text-white max-w-3xl">
            {pick(cms?.hero.title, lang) || t('hero_title')}
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-[#C2531F] dark:text-[#F4A261] font-medium">
            {pick(cms?.hero.sub, lang) || t('hero_sub')}
          </p>
        </div>
          )}
        />
      </section>

      {/* Ready-made store designs (nav link: #categories) */}
      <section
        id="categories"
        className="relative overflow-hidden border-y border-black/10 bg-[#FCF3E8] dark:border-white/10 dark:bg-[#1B1210]"
      >
        <div className="relative max-w-[68rem] mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-2">{t('who_title')}</h2>
          <p className="text-[#241812]/60 dark:text-white/60 mb-10 max-w-lg">{t('who_sub')}</p>
          <TemplateShowcase
            templates={templates}
            ctaLabel={t('tpl_cta')}
            onCta={() => navigate('/vendor/signup')}
          />
        </div>
      </section>

      {/* Stores that run on Regantify, picked by Super Admin (Marketing). Hidden until at least one is picked. */}
      {marketing && marketing.featured.length > 0 && (
        <section id="stores" className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-[#1E1410]">
          <div className="max-w-6xl mx-auto px-6 py-14">
            <h2 className="text-2xl font-bold mb-8">{pick(cms?.showcaseTitle, lang) || (lang === 'bn' ? 'Regantify-তে চলছে যেসব দোকান' : 'Stores running on Regantify')}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {marketing.featured.map((f) => (
                <a key={f.subdomain} href={storefrontStoreUrl(f.subdomain)} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl border border-black/10 p-4 transition-colors hover:border-[#C2531F] dark:border-white/10">
                  {f.logoUrl ? (
                    <img src={f.logoUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FCF3E8] text-lg font-bold text-[#C2531F] dark:bg-[#241812]">{f.name.slice(0, 1).toUpperCase()}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{f.name}</span>
                    <span className="flex items-center gap-1 text-xs text-[#C2531F]">{lang === 'bn' ? 'দোকান দেখুন' : 'Visit store'}<ArrowUpRight size={12} /></span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* What sellers say: testimonials from Admin > Marketing (super-admin-new.md Step 14). Hidden until one is switched on. */}
      {cms && cms.testimonials.items.length > 0 && (
        <section id="testimonials" className="border-b border-black/10 bg-[#FCF3E8] dark:border-white/10 dark:bg-[#1B1210]">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-bold mb-8">{pick(cms.testimonials.title, lang) || (lang === 'bn' ? 'বিক্রেতারা যা বলছেন' : 'What sellers say')}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cms.testimonials.items.map((item) => (
                <figure key={item.id} className="flex flex-col rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#241812]">
                  {item.rating && (
                    <div className="mb-3 flex gap-0.5" aria-label={`${item.rating} of 5`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={15} className={i < item.rating! ? 'fill-[#F5A623] text-[#F5A623]' : 'text-black/15 dark:text-white/20'} />
                      ))}
                    </div>
                  )}
                  <blockquote className="flex-1 whitespace-pre-line text-[15px] leading-relaxed text-[#241812]/80 dark:text-white/80">{pick(item.quote, lang)}</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FCF3E8] text-sm font-bold text-[#C2531F] dark:bg-white/10">{item.name.slice(0, 1).toUpperCase()}</span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.name}</span>
                      {pick(item.role, lang) && <span className="block truncate text-xs text-[#241812]/50 dark:text-white/50">{pick(item.role, lang)}</span>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing - highly animated. Dark stage with drifting glow blobs,
          scroll-reveal cards, sliding billing toggle, rolling price
          numbers, hover-lift, shimmer on the popular plan. The full
          feature comparison chart is hidden and opens in a popup. */}
      <section id="pricing" className="relative overflow-hidden bg-[#241812]">

        <div ref={pricingRef} className="relative max-w-6xl mx-auto px-6 py-24">
          <div className={pricingVisible ? 'rg-fade-up' : 'opacity-0'}>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">{t('pricing_title')}</h2>
            <p className="mt-3 text-white/60 max-w-lg">{t('pricing_sub')}</p>
            {pick(cms?.pricingNote, lang) && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-white/80">{pick(cms?.pricingNote, lang)}</p>}
          </div>

          {/* Sliding billing toggle */}
          <div
            className={`mt-8 ${pricingVisible ? 'rg-fade-up' : 'opacity-0'}`}
            style={{ animationDelay: '0.1s' }}
          >
            <div className="relative inline-grid grid-cols-2 p-1 rounded-full bg-white/10 backdrop-blur border border-white/10">
              <span
                aria-hidden
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[#F4A261] shadow-lg
                  transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: billing === 'yearly' ? 'translateX(100%)' : 'translateX(0)' }}
              />
              <button
                onClick={() => setBilling('monthly')}
                className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
                  billing === 'monthly' ? 'text-[#241812]' : 'text-white/70 hover:text-white'
                }`}
              >
                {t('pricing_toggle_monthly')}
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
                  billing === 'yearly' ? 'text-[#241812]' : 'text-white/70 hover:text-white'
                }`}
              >
                {t('pricing_toggle_yearly')}
              </button>
            </div>
          </div>

          {/* Animated plan cards */}
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {plans.map((plan, i) => {
              // Monthly mode  -> big number = per-month price
              // Yearly mode   -> big number = full year price (rate x 12)
              const isYearly = billing === 'yearly';
              const displayPrice = isYearly ? plan.yearlyPrice * 12 : plan.monthlyPrice;
              const savePerYear = (plan.monthlyPrice - plan.yearlyPrice) * 12;
              const hi = plan.highlighted;

              return (
                <div
                  key={plan.key}
                  className={pricingVisible ? 'rg-fade-up' : 'opacity-0'}
                  style={{ animationDelay: `${0.2 + i * 0.12}s` }}
                >
                  <div className={hi ? 'rg-float h-full' : 'h-full'}>
                    <div
                      className={`group relative h-full flex flex-col rounded-3xl p-6 overflow-hidden
                        transition-all duration-500 ease-out hover:-translate-y-2 ${
                          hi
                            ? 'rg-glow rg-shimmer bg-gradient-to-b from-[#F4A261] to-[#D9803F] text-[#241812]'
                            : 'bg-white/[0.06] backdrop-blur border border-white/10 text-white hover:bg-white/[0.1] hover:border-white/25 hover:shadow-[0_24px_60px_-20px_rgba(244,162,97,0.35)]'
                        }`}
                    >
                      {/* Popular badge */}
                      {hi && plan.badge && (
                        <span className="rg-badge absolute top-4 right-4 inline-flex items-center gap-1 text-[11px] font-semibold bg-[#241812] text-[#F4A261] px-2.5 py-1 rounded-full">
                          <Sparkles size={12} />
                          {plan.badge}
                        </span>
                      )}

                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className={`mt-1 text-xs leading-relaxed ${hi ? 'text-[#241812]/70' : 'text-white/55'}`}>
                        {plan.tagline}
                      </p>

                      {/* Rolling price - monthly rate in Monthly mode, full-year price in Yearly mode */}
                      <div className="mt-6 flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-4xl font-bold tracking-tight">
                          ৳<AnimatedNumber value={displayPrice} />
                        </span>
                        {displayPrice !== 0 && (
                          <span className={`text-xs ${hi ? 'text-[#241812]/65' : 'text-white/55'}`}>
                            {isYearly ? t('pricing_per_year') : t('pricing_per_month')}
                          </span>
                        )}
                      </div>

                      {/* Billing note + savings */}
                      <div className="mt-2 min-h-[38px]">
                        {displayPrice !== 0 && (
                          <>
                            <p className={`text-xs ${hi ? 'text-[#241812]/65' : 'text-white/45'}`}>
                              {isYearly ? t('pricing_sub_yearly') : t('pricing_sub_monthly')}
                              {isYearly && (
                                <>
                                  {' · '}
                                  {t('pricing_equiv_month')} ৳
                                  <AnimatedNumber value={plan.yearlyPrice} />
                                  {t('pricing_equiv_month_suffix')}
                                </>
                              )}
                            </p>
                            {isYearly && savePerYear > 0 && (
                              <p
                                className={`mt-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  hi ? 'bg-[#241812] text-[#F4A261]' : 'bg-[#F4A261]/20 text-[#F4A261]'
                                }`}
                              >
                                {t('pricing_save')} ৳{savePerYear.toLocaleString('en-US')}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* CTA */}
                      <button
                        onClick={() => navigate('/vendor/signup')}
                        className={`mt-5 w-full py-2.5 rounded-full text-sm font-semibold transition-all duration-300
                          hover:scale-[1.03] active:scale-95 inline-flex items-center justify-center gap-1.5 ${
                            hi
                              ? 'bg-[#241812] text-white hover:bg-black'
                              : 'bg-[#F4A261] text-[#241812] hover:bg-[#F7B27E]'
                          }`}
                      >
                        {plan.cta}
                        <ArrowUpRight
                          size={16}
                          className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </button>

                      {/* Highlights */}
                      <div className={`mt-6 pt-5 border-t ${hi ? 'border-[#241812]/15' : 'border-white/10'}`}>
                        <p className={`text-[11px] uppercase tracking-wider font-semibold mb-3 ${hi ? 'text-[#241812]/60' : 'text-white/40'}`}>
                          {t('pricing_key_features')}
                        </p>
                        <ul className="space-y-2.5">
                          {highlightRows.map((row, r) => (
                            <li
                              key={row.label}
                              className={`flex items-start gap-2 text-sm ${pricingVisible ? 'rg-row-in' : 'opacity-0'}`}
                              style={{ animationDelay: `${0.5 + i * 0.12 + r * 0.08}s` }}
                            >
                              <Check
                                size={15}
                                className={`mt-0.5 shrink-0 ${hi ? 'text-[#241812]' : 'text-[#F4A261]'}`}
                              />
                              <span className={hi ? 'text-[#241812]/85' : 'text-white/80'}>
                                <span className={hi ? 'text-[#241812]/60' : 'text-white/45'}>{row.label}: </span>
                                {featureRows[row.idx].values[i]}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View chart button - chart itself is hidden until clicked */}
          <div
            className={`mt-12 flex justify-center ${pricingVisible ? 'rg-fade-up' : 'opacity-0'}`}
            style={{ animationDelay: '0.9s' }}
          >
            <button
              onClick={() => setChartOpen(true)}
              className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full border border-white/25 text-white font-medium
                bg-white/5 backdrop-blur hover:bg-[#F4A261] hover:text-[#241812] hover:border-[#F4A261]
                hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <BarChart3 size={18} className="transition-transform duration-300 group-hover:rotate-12" />
              {t('pricing_view_chart')}
            </button>
          </div>
        </div>
      </section>

      {/* Everything to run your shop: six pictures with a title and a line each, then the four promises. */}
      <section
        id="features"
        className="relative border-y border-black/10 bg-[#F6EADD] dark:border-white/10 dark:bg-[#241812]"
      >
        <span id="run" className="absolute left-0 top-0" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="mb-12 max-w-2xl text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl">{t('feat_title')}</h2>

          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {builtInSlides.map((slide) => (
              <figure key={slide.image}>
                <img
                  src={slide.image}
                  alt={slide.alt}
                  width={1280}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[16/10] w-full rounded-2xl object-cover shadow-[0_14px_30px_-18px_rgba(70,30,15,0.45)]"
                />
                <figcaption className="mt-4">
                  <h3 className="text-lg font-bold leading-snug">{slide.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#241812]/65 dark:text-white/65">{slide.detail}</p>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-16 grid gap-x-8 gap-y-6 border-t border-[#241812]/20 pt-8 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/20">
            {features.map((f) => (
              <div key={f.title}>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#241812]/65 dark:text-white/65">{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison chart popup */}
      {chartOpen && (
        <div
          className="rg-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
          onClick={() => setChartOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('pricing_chart_title')}
        >
          <div
            className="rg-pop-in relative w-full max-w-5xl max-h-[88vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden dark:bg-[#271A14] dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popup header */}
            <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 pb-4 border-b border-black/10 dark:border-white/10">
              <div>
                <h3 className="text-xl font-bold">{t('pricing_chart_title')}</h3>
                <p className="mt-1 text-sm text-[#241812]/60 dark:text-white/60">{t('pricing_chart_sub')}</p>
              </div>
              <button
                onClick={() => setChartOpen(false)}
                aria-label={t('pricing_close')}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[#F6EADD] dark:bg-white/10
                  hover:bg-[#241812] hover:text-white dark:hover:bg-white/20 hover:rotate-90 transition-all duration-300"
              >
                <X size={18} />
              </button>
            </div>

            {/* Popup body - same table as before, scrollable */}
            <div className="overflow-auto">
              <table className="w-full text-sm border-collapse min-w-[720px] table-fixed">
                <colgroup>
                  <col className="w-[22%]" />
                  {plans.map((plan) => (
                    <col key={plan.key} className="w-[19.5%]" />
                  ))}
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#F6EADD] dark:bg-[#2E2019]">
                    <th className="text-left font-semibold px-5 py-3.5 border-b border-black/10 dark:border-white/10">
                      {t('pricing_feature_col')}
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.key}
                        className={`text-left font-semibold px-5 py-3.5 border-b border-black/10 dark:border-white/10 ${
                          plan.highlighted ? 'bg-[#241812] text-white dark:bg-black/50' : ''
                        }`}
                      >
                        {plan.highlighted && plan.badge && (
                          <div className="text-[10px] font-medium text-[#F4A261] mb-0.5">{plan.badge}</div>
                        )}
                        {plan.name}
                        <div className={`mt-0.5 text-xs font-medium ${plan.highlighted ? 'text-white/60' : 'text-[#241812]/50 dark:text-white/50'}`}>
                          {plan.monthlyPrice === 0
                            ? '৳0'
                            : billing === 'yearly'
                              ? `৳${(plan.yearlyPrice * 12).toLocaleString('en-US')}${t('pricing_per_year')}`
                              : `৳${plan.monthlyPrice.toLocaleString('en-US')}${t('pricing_per_month')}`}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureRows.map((row, i) => (
                    <tr
                      key={row.label}
                      className={`rg-row-in ${i % 2 === 1 ? 'bg-[#F6EADD]/40 dark:bg-white/[0.03]' : ''}`}
                      style={{ animationDelay: `${0.1 + i * 0.035}s` }}
                    >
                      <td className="px-5 py-3.5 border-b border-black/10 dark:border-white/10 text-[#241812]/80 dark:text-white/80 font-medium">
                        {row.label}
                      </td>
                      {row.values.map((val, j) => (
                        <td
                          key={j}
                          className={`px-5 py-3.5 border-b border-black/10 dark:border-white/10 ${
                            plans[j].highlighted ? 'bg-[#241812]/[0.03] dark:bg-white/[0.04]' : ''
                          } ${val === '✓' ? 'text-[#C2531F] dark:text-[#F4A261] font-medium' : val === '-' ? 'text-[#241812]/30 dark:text-white/30' : 'text-[#241812]/75 dark:text-white/75'}`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Popup footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-3 bg-white dark:bg-[#271A14]">
              <button
                onClick={() => setChartOpen(false)}
                className="px-5 py-2.5 rounded-full text-sm font-medium border border-black/15 hover:border-black/40 dark:border-white/20 dark:hover:border-white/50 transition-colors"
              >
                {t('pricing_close')}
              </button>
              <button
                onClick={() => {
                  setChartOpen(false);
                  navigate('/vendor/signup');
                }}
                className="px-5 py-2.5 rounded-full text-sm font-medium bg-[#C2531F] text-white hover:bg-[#A8441A] transition-colors inline-flex items-center gap-1.5"
              >
                {t('hero_cta')}
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ as a chat: the title on the left, a thread of questions and replies on the right. */}
      <section id="faq" className="bg-white border-y border-black/10 dark:bg-[#1E1410] dark:border-white/10">
        <div className="max-w-6xl mx-auto grid gap-10 px-6 py-20 lg:grid-cols-12 lg:gap-16">
          <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:col-span-4">{t('faq_title')}</h2>
          <div className="lg:col-span-8">
            <FaqChat key={lang + faqs.length} items={faqs} resetLabel={t('faq_reset')} />
          </div>
        </div>
      </section>

      {/* Closing CTA - full section bg uses the CDN's site/closing.webp */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={siteAsset('site/closing.webp')} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#241812]/90" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('closing_title')}</h2>
            <p className="mt-2 text-white/70">{t('closing_sub')}</p>
          </div>
          <button
            onClick={() => navigate('/vendor/signup')}
            className="px-6 py-3.5 rounded-full bg-[#F4A261] hover:bg-[#E08A4B]
              text-[#241812] font-medium transition-colors inline-flex items-center gap-2 shrink-0"
          >
            {t('closing_cta')}
            <ArrowUpRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer: dark, picks up from the closing banner above it. */}
      <footer className="bg-[#1B1210] text-white/60">
        <div className="max-w-6xl mx-auto grid gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-2.5 text-white">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F4A261] text-[#241812]">
                <Store size={18} />
              </span>
              <span className="text-xl font-extrabold tracking-tight">Regantify</span>
            </div>
          </div>
          <nav className="flex flex-col gap-3 text-sm lg:col-span-3" aria-label="Legal">
            <a href="/legal/privacy" className="w-fit transition-colors hover:text-white">
              {t('footer_privacy')}
            </a>
            <a href="/legal/terms" className="w-fit transition-colors hover:text-white">
              {t('footer_terms')}
            </a>
          </nav>
          <nav className="flex flex-col gap-3 text-sm lg:col-span-3" aria-label="Sign in">
            <button onClick={() => navigate('/vendor/login')} className="w-fit transition-colors hover:text-white">
              {t('footer_vendor')}
            </button>
            <button onClick={() => navigate('/admin/login')} className="w-fit transition-colors hover:text-white">
              {t('footer_admin')}
            </button>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <p className="max-w-6xl mx-auto px-6 py-5 text-xs text-white/40">© {new Date().getFullYear()} Regantify</p>
        </div>
      </footer>
    </div>
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