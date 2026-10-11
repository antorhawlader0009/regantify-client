// Ready policy pages (TellMe idea 80): Store > Pages > Add Page > "Start from a ready text". The texts live here, the
// store's own facts are filled in, and the page is opened in the editor as a Draft. General samples, not legal advice.

export type PolicyKind = 'RETURN' | 'DELIVERY' | 'PRIVACY' | 'TERMS' | 'ABOUT';
export type PolicyLang = 'en' | 'bn';

export const POLICY_KINDS: { id: PolicyKind; label: string }[] = [
  { id: 'RETURN', label: 'Return and refund policy' },
  { id: 'DELIVERY', label: 'Delivery policy' },
  { id: 'PRIVACY', label: 'Privacy policy' },
  { id: 'TERMS', label: 'Terms and conditions' },
  { id: 'ABOUT', label: 'About us' },
];

export interface PolicyFacts {
  storeName: string;
  address: string | null;
  phone: string | null;
  returnDays: number | null;
  returnCondition: string | null;
  insideCharge: number | null;
  outsideCharge: number | null;
  insideDays: number | null;
  outsideDays: number | null;
  /** "Sat-Thu 10:00-20:00" style summary, or null. */
  hours: string | null;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const blank = (lang: PolicyLang, what: string) => `[${lang === 'bn' ? 'এখানে লিখুন' : 'fill in'}: ${what}]`;

const TITLES: Record<PolicyLang, Record<PolicyKind, string>> = {
  en: { RETURN: 'Return and Refund Policy', DELIVERY: 'Delivery Policy', PRIVACY: 'Privacy Policy', TERMS: 'Terms and Conditions', ABOUT: 'About Us' },
  bn: { RETURN: 'রিটার্ন ও রিফান্ড নীতি', DELIVERY: 'ডেলিভারি নীতি', PRIVACY: 'প্রাইভেসি নীতি', TERMS: 'শর্তাবলী', ABOUT: 'আমাদের সম্পর্কে' },
};

const NOTE: Record<PolicyLang, string> = {
  en: 'This is a general sample text, not legal advice. Read it, change it to match how your store really works, and have it checked if you need to.',
  bn: 'এটি একটি সাধারণ নমুনা লেখা, আইনি পরামর্শ নয়। প্রকাশ করার আগে পড়ে আপনার দোকানের আসল নিয়ম অনুযায়ী বদলে নিন, প্রয়োজনে যাচাই করিয়ে নিন।',
};

export function policyTitle(kind: PolicyKind, lang: PolicyLang): string {
  return TITLES[lang][kind];
}

function contact(f: PolicyFacts, lang: PolicyLang): string {
  const bits = [esc(f.storeName)];
  bits.push(f.address ? esc(f.address) : blank(lang, lang === 'bn' ? 'ঠিকানা' : 'address'));
  bits.push(f.phone ? esc(f.phone) : blank(lang, lang === 'bn' ? 'ফোন নম্বর' : 'phone number'));
  if (f.hours) bits.push(`${lang === 'bn' ? 'কাজের সময়' : 'Hours'}: ${esc(f.hours)}`);
  return `<p>${bits.join('<br>')}</p>`;
}

const taka = (n: number | null, lang: PolicyLang, what: string) => (n == null ? blank(lang, what) : `৳${n}`);
const days = (n: number | null, lang: PolicyLang) => (n == null ? blank(lang, lang === 'bn' ? 'কর্মদিবস' : 'working days') : lang === 'bn' ? `${n} কর্মদিবস` : `${n} working days`);

/** The page's HTML (headings, paragraphs, lists) for the editor. */
export function policyHtml(kind: PolicyKind, lang: PolicyLang, f: PolicyFacts): string {
  const bn = lang === 'bn';
  const name = esc(f.storeName);
  const note = `<p><em>${NOTE[lang]}</em></p>`;
  let body = '';
  if (kind === 'RETURN') {
    const d = f.returnDays;
    const cond = f.returnCondition ? esc(f.returnCondition) : null;
    body = bn
      ? `<h2>রিটার্ন ও রিফান্ড নীতি</h2>
<p>${name}-এ কেনা পণ্যে সমস্যা থাকলে নিচের নিয়মে ফেরত বা বদল করা যাবে।</p>
<h3>কত দিনের মধ্যে</h3>
<p>${d === 0 ? 'আমরা সাধারণত পণ্য ফেরত বা বদল নিই না, তবে ভুল বা ক্ষতিগ্রস্ত পণ্য এলে জানাবেন।' : d == null ? `পণ্য হাতে পাওয়ার ${blank(lang, 'কত দিন')} দিনের মধ্যে জানাতে হবে।` : `পণ্য হাতে পাওয়ার ${d} দিনের মধ্যে আমাদের জানাতে হবে।`}</p>
<h3>শর্ত</h3>
<ul><li>${cond ? `পণ্যের অবস্থা: ${cond}।` : 'পণ্য অব্যবহৃত ও আসল প্যাকেটে থাকতে হবে।'}</li><li>ভুল পণ্য বা ক্ষতিগ্রস্ত পণ্য এলে ডেলিভারির সময়ের ছবি বা ভিডিও সহ জানালে দ্রুত সমাধান হবে।</li></ul>
<h3>টাকা ফেরত</h3>
<p>ফেরত নেওয়া পণ্য পরীক্ষার পর পণ্যের দাম ${blank(lang, 'কত দিনের মধ্যে')} দিনের মধ্যে আপনার পেমেন্টের মাধ্যমে ফেরত দেওয়া হবে। ডেলিভারি চার্জ ফেরতযোগ্য কিনা: ${blank(lang, 'হ্যাঁ/না')}।</p>
<h3>যোগাযোগ</h3>${contact(f, lang)}`
      : `<h2>Return and Refund Policy</h2>
<p>If something is wrong with an order from ${name}, you can return or exchange it under these rules.</p>
<h3>Time limit</h3>
<p>${d === 0 ? 'We do not normally take returns or exchanges, but please tell us if you receive a wrong or damaged item.' : d == null ? `Tell us within ${blank(lang, 'number of days')} days of receiving the item.` : `Tell us within ${d} days of receiving the item.`}</p>
<h3>Conditions</h3>
<ul><li>${cond ? `Condition of the item: ${cond}.` : 'The item must be unused and in its original packaging.'}</li><li>For a wrong or damaged item, a photo or video taken when you opened the parcel helps us sort it out quickly.</li></ul>
<h3>Refunds</h3>
<p>After we check a returned item, the price is refunded to your payment method within ${blank(lang, 'number of days')} days. Delivery charge refundable: ${blank(lang, 'yes/no')}.</p>
<h3>Contact</h3>${contact(f, lang)}`;
  } else if (kind === 'DELIVERY') {
    body = bn
      ? `<h2>ডেলিভারি নীতি</h2>
<p>${name} সারা বাংলাদেশে ${blank(lang, 'কুরিয়ারের নাম')} কুরিয়ারে পণ্য পাঠায়।</p>
<h3>ডেলিভারি চার্জ ও সময়</h3>
<ul><li>ঢাকার ভেতরে: ${taka(f.insideCharge, lang, 'চার্জ')}, প্রায় ${days(f.insideDays, lang)}।</li><li>ঢাকার বাইরে: ${taka(f.outsideCharge, lang, 'চার্জ')}, প্রায় ${days(f.outsideDays, lang)}।</li></ul>
<p>সময়ের হিসাব অর্ডার নিশ্চিত হওয়ার পর থেকে। ছুটির দিন ও কুরিয়ারের দেরিতে সময় কিছুটা বাড়তে পারে।</p>
<h3>পণ্য নেওয়ার সময়</h3>
<p>ক্যাশ অন ডেলিভারি হলে পণ্য হাতে পেয়ে দাম পরিশোধ করুন। ডেলিভারির সময় ফোন ধরার জন্য প্রস্তুত থাকুন।</p>
<h3>যোগাযোগ</h3>${contact(f, lang)}`
      : `<h2>Delivery Policy</h2>
<p>${name} sends orders across Bangladesh by ${blank(lang, 'courier name')} courier.</p>
<h3>Delivery charge and time</h3>
<ul><li>Inside Dhaka: ${taka(f.insideCharge, lang, 'charge')}, about ${days(f.insideDays, lang)}.</li><li>Outside Dhaka: ${taka(f.outsideCharge, lang, 'charge')}, about ${days(f.outsideDays, lang)}.</li></ul>
<p>The time counts from when your order is confirmed. Holidays and courier delays can add a little.</p>
<h3>Receiving your order</h3>
<p>For cash on delivery, pay when you receive the parcel. Please keep your phone on during delivery.</p>
<h3>Contact</h3>${contact(f, lang)}`;
  } else if (kind === 'PRIVACY') {
    body = bn
      ? `<h2>প্রাইভেসি নীতি</h2>
<p>${name} আপনার তথ্যের গোপনীয়তাকে গুরুত্ব দেয়।</p>
<h3>কী তথ্য নিই</h3>
<p>অর্ডার দেওয়ার সময় আপনার নাম, ফোন নম্বর ও ঠিকানা নিই। অ্যাকাউন্ট খুললে পাসওয়ার্ডও (সুরক্ষিতভাবে) সংরক্ষিত হয়।</p>
<h3>কীভাবে ব্যবহার করি</h3>
<ul><li>অর্ডার প্রক্রিয়া ও ডেলিভারি করতে।</li><li>অর্ডারের খবর SMS বা ফোনে জানাতে।</li><li>আমাদের সেবা ভালো করতে।</li></ul>
<h3>কার সাথে ভাগ করি</h3>
<p>ডেলিভারির জন্য কুরিয়ার ও পেমেন্টের জন্য পেমেন্ট গেটওয়ের সাথে প্রয়োজনীয় তথ্য ভাগ করি। এর বাইরে আপনার তথ্য কারও কাছে বিক্রি করি না।</p>
<h3>আপনার অধিকার</h3>
<p>আপনার তথ্য দেখতে, ঠিক করতে বা মুছে ফেলতে চাইলে আমাদের জানান।</p>
<h3>যোগাযোগ</h3>${contact(f, lang)}`
      : `<h2>Privacy Policy</h2>
<p>${name} takes your privacy seriously.</p>
<h3>What we collect</h3>
<p>When you order we collect your name, phone number and address. If you create an account, your password is stored securely.</p>
<h3>How we use it</h3>
<ul><li>To process and deliver your order.</li><li>To tell you about your order by SMS or phone.</li><li>To improve our service.</li></ul>
<h3>Who we share it with</h3>
<p>We share what is needed with the courier (to deliver) and the payment gateway (to take payment). We do not sell your information.</p>
<h3>Your rights</h3>
<p>Ask us if you want to see, correct or delete your information.</p>
<h3>Contact</h3>${contact(f, lang)}`;
  } else if (kind === 'TERMS') {
    body = bn
      ? `<h2>শর্তাবলী</h2>
<p>${name}-এর ওয়েবসাইট ব্যবহার করে বা অর্ডার করে আপনি নিচের শর্তে রাজি হচ্ছেন।</p>
<ul><li>পণ্যের দাম ও স্টক বদলাতে পারে। অর্ডার নিশ্চিত হওয়ার সময়ের দামই প্রযোজ্য।</li><li>ভুল দাম বা স্টক না থাকার কারণে আমরা অর্ডার বাতিল করার অধিকার রাখি, এ ক্ষেত্রে আপনাকে জানানো হবে।</li><li>অর্ডারের সময় সঠিক নাম, ফোন ও ঠিকানা দিতে হবে।</li><li>ভুয়া বা বারবার ফেরত দেওয়া অর্ডারের ক্ষেত্রে আমরা পরবর্তী অর্ডার সীমিত করতে পারি।</li><li>রিটার্ন ও ডেলিভারির নিয়ম আমাদের রিটার্ন ও ডেলিভারি নীতিতে দেওয়া আছে।</li></ul>
<h3>যোগাযোগ</h3>${contact(f, lang)}`
      : `<h2>Terms and Conditions</h2>
<p>By using the ${name} website or placing an order, you agree to these terms.</p>
<ul><li>Prices and stock can change. The price when your order is confirmed applies.</li><li>We may cancel an order for a wrong price or an item out of stock, and we will tell you.</li><li>Give a correct name, phone number and address when you order.</li><li>We may limit later orders from customers with fake orders or many refused parcels.</li><li>Returns and delivery follow our Return and Delivery policies.</li></ul>
<h3>Contact</h3>${contact(f, lang)}`;
  } else {
    body = bn
      ? `<h2>আমাদের সম্পর্কে</h2>
<p>${name} একটি অনলাইন দোকান। আমরা ${blank(lang, 'কী বিক্রি করেন')} বিক্রি করি এবং চেষ্টা করি ভালো পণ্য, ন্যায্য দাম ও দ্রুত ডেলিভারি দিতে।</p>
<p>${blank(lang, 'আপনার দোকানের গল্প: কবে শুরু, কেন শুরু')}</p>
<h3>যোগাযোগ</h3>${contact(f, lang)}`
      : `<h2>About Us</h2>
<p>${name} is an online store. We sell ${blank(lang, 'what you sell')} and try to give good products, fair prices and quick delivery.</p>
<p>${blank(lang, 'Your store story: when and why you started')}</p>
<h3>Contact</h3>${contact(f, lang)}`;
  }
  return note + body;
}
