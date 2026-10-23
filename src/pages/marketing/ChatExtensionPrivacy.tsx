import type { ReactNode } from 'react';

/**
 * Public privacy policy of the Regantify Chat Order Saver Chrome extension (/legal/chat-extension-privacy), English and
 * Bangla. Linked from the extension's consent screen, the Chrome Web Store listing and Orders > Chat orders.
 * DRAFT: the parts marked [LEGAL REVIEW] must be checked by a lawyer before the store listing goes live.
 */

const UPDATED = '21 October 2026';
const CONTACT = '[LEGAL REVIEW: support email and address]';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-700">{children}</div>
    </section>
  );
}

export default function ChatExtensionPrivacy() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs uppercase tracking-wide text-green-700">Regantify</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Chat Order Saver: Privacy Policy</h1>
        <p className="mt-1 text-sm text-neutral-500">Last updated {UPDATED}. Draft, pending legal review.</p>

        <div lang="en">
          <Section title="1. What the extension is for">
            <p>The Regantify Chat Order Saver has one purpose: to help a shop on Regantify save order details from a customer chat (Facebook Messenger, messenger.com, the Meta Business Suite inbox or WhatsApp Web) that is open on its own screen, and draft a reply text that the shop copies and sends itself.</p>
          </Section>
          <Section title="2. What it reads, and when">
            <p>It reads only when a shop user presses “Save order info” or “Suggest reply”, and only the messages the page has already loaded in the chat that is open at that moment (at most the last 30, or the number the shop chose, up to 50). It never scrolls or asks the site to load older messages. It never reads other chats, never runs in the background, never clicks, types, scrolls or sends anything on Facebook or WhatsApp. To know the same chat again later it uses the chat’s id (from the address bar on Facebook and Messenger, from the open chat on WhatsApp Web, where it is usually the customer’s number), which Regantify stores only as a one-way hash.</p>
          </Section>
          <Section title="3. What is sent and stored">
            <p>Before anything is sent, the shop user sees exactly what will be sent and can change or remove any part. When they save, Regantify stores for that shop: the customer’s name, phone number, delivery address, district, the items and a note, and, only if the user ticks them, the messages that were read. While writing a reply draft, the customer’s name, phone number, address and district found in the chat are also saved for that chat (one record per conversation, encrypted), so they fill the order form and checkout link; the shop can turn this off in the extension’s settings. Phone number, address and messages are encrypted at rest. Each shop can see only its own records.</p>
            <p>For “Suggest reply”, the messages that were read are sent with phone numbers, email addresses, long numbers and addresses replaced by placeholders. They are used to write a draft and are not stored. With each draft the AI also writes a short note about that customer (what they want, sizes, prices quoted, open questions; never a name, phone number or address), kept encrypted for that chat so the next draft remembers earlier talks, and deleted with the shop’s keeping period. The amount of AI used is recorded for billing, never the text.</p>
            <p>Photos: a photo the customer sent is shown to the AI only as the words “the customer sent a photo”. Only when the shop user presses “Find product” or “Read text” on one photo is that photo (made small first) sent, to match it with the shop’s own products or read the text on it; it is not stored. A shop user may choose to keep a photo with a saved order (for example a complaint photo): it is encrypted, visible only in the shop’s dashboard, and deleted automatically 90 days later. Shops are told not to send ID card or face photos.</p>
          </Section>
          <Section title="4. Third parties">
            <p>Reply drafts are written by Anthropic (Claude), which processes the masked messages on Regantify’s behalf under its commercial terms. [LEGAL REVIEW: confirm the Anthropic data-processing terms and retention.] Data is not sold, not used for advertising and not shared with anyone else. Use of data received from the extension follows the Chrome Web Store User Data Policy, including the Limited Use requirements.</p>
          </Section>
          <Section title="5. How long it is kept">
            <p>Saved records are deleted automatically after the shop’s keeping period (90 days unless the shop picks between 7 and 365 days). A shop can delete any record, or all of them, at any time, and download a copy of all of them from Orders &gt; Chat orders.</p>
          </Section>
          <Section title="6. Your rights">
            <p>Shops: you can view, correct, export and delete your records in the dashboard, and disconnect any browser. Customers whose details a shop saved: ask that shop to delete them, or contact Regantify and we will pass the request to the shop and delete the record. [LEGAL REVIEW: response time and applicable Bangladesh data-protection law.]</p>
          </Section>
          <Section title="7. Contact">
            <p>{CONTACT}</p>
          </Section>
        </div>

        <hr className="my-10 border-neutral-200" />

        <div lang="bn">
          <h1 className="text-2xl font-semibold text-neutral-900">চ্যাট অর্ডার সেভার: গোপনীয়তা নীতি</h1>
          <Section title="১. এক্সটেনশনটি কী জন্য">
            <p>Regantify Chat Order Saver এর একটাই কাজ: Regantify এর কোনো শপ নিজের স্ক্রিনে খোলা কাস্টমার চ্যাট (ফেসবুক মেসেঞ্জার, messenger.com, মেটা বিজনেস স্যুট ইনবক্স বা হোয়াটসঅ্যাপ ওয়েব) থেকে অর্ডারের তথ্য সেভ করতে পারবে, আর একটা উত্তরের খসড়া পাবে যা শপ নিজে কপি করে পাঠাবে।</p>
          </Section>
          <Section title="২. কী পড়ে, কখন পড়ে">
            <p>শপের কেউ “Save order info” বা “Suggest reply” চাপলেই শুধু পড়ে, আর শুধু সেই মুহূর্তে খোলা চ্যাটের স্ক্রিনে দেখা মেসেজগুলো (সর্বোচ্চ শেষ ১০টি, বা শপ যত ঠিক করে, ৩০টি পর্যন্ত)। অন্য কোনো চ্যাট পড়ে না, পেছনে চলে না, ফেসবুক বা হোয়াটসঅ্যাপে কিছু ক্লিক, টাইপ, স্ক্রল বা পাঠায় না। একই চ্যাট পরে চিনতে চ্যাটের আইডি নেয় (ফেসবুকে ঠিকানা বার থেকে, হোয়াটসঅ্যাপে খোলা চ্যাট থেকে, যা সাধারণত কাস্টমারের নম্বর), যা Regantify শুধু একমুখী হ্যাশ হিসেবে রাখে।</p>
          </Section>
          <Section title="৩. কী পাঠানো ও রাখা হয়">
            <p>কিছু পাঠানোর আগে শপের ব্যবহারকারী ঠিক কী যাবে তা দেখেন, যেকোনো অংশ বদলাতে বা বাদ দিতে পারেন। সেভ করলে Regantify সেই শপের জন্য রাখে: কাস্টমারের নাম, ফোন নম্বর, ডেলিভারির ঠিকানা, জেলা, পণ্য ও নোট, আর টিক দিলে শুধু তখনই দেখা মেসেজগুলো। ফোন, ঠিকানা ও মেসেজ এনক্রিপ্ট করে রাখা হয়। প্রতিটি শপ শুধু নিজের তথ্য দেখতে পায়।</p>
            <p>“Suggest reply” এর জন্য দেখা মেসেজগুলো পাঠানো হয়, ফোন নম্বর, ইমেইল, লম্বা নম্বর ও ঠিকানা লুকিয়ে। খসড়া লিখতে একবার ব্যবহার হয়, রাখা হয় না। বিলিংয়ের জন্য শুধু কতটা AI ব্যবহার হলো তা রাখা হয়, লেখা নয়।</p>
            <p>ছবি: কাস্টমারের পাঠানো ছবির কথা AI কে শুধু “কাস্টমার একটা ছবি পাঠিয়েছে” লেখা হিসেবে জানানো হয়। শপের কেউ নির্দিষ্ট একটা ছবিতে “Find product” বা “Read text” চাপলে তবেই শুধু সেই ছবিটা (ছোট করে) পাঠানো হয়, শপের নিজের পণ্যের সাথে মেলাতে বা ছবির লেখা পড়তে; রাখা হয় না। শপ চাইলে কোনো ছবি (যেমন অভিযোগের ছবি) অর্ডারের সাথে রাখতে পারে: এনক্রিপ্ট করা থাকে, শুধু শপের ড্যাশবোর্ডে দেখা যায়, আর ৯০ দিন পর নিজে থেকে মুছে যায়। শপকে NID বা মুখের ছবি না পাঠাতে বলা হয়।</p>
          </Section>
          <Section title="৪. তৃতীয় পক্ষ">
            <p>উত্তরের খসড়া লেখে Anthropic (Claude), যারা Regantify এর পক্ষে লুকানো মেসেজগুলো প্রসেস করে। [আইনি যাচাই: Anthropic এর ডেটা প্রসেসিং শর্ত ও সংরক্ষণকাল নিশ্চিত করুন।] তথ্য বিক্রি হয় না, বিজ্ঞাপনে ব্যবহার হয় না, আর কাউকে দেওয়া হয় না। এক্সটেনশন থেকে পাওয়া তথ্যের ব্যবহার Chrome Web Store User Data Policy, Limited Use শর্তসহ, মেনে চলে।</p>
          </Section>
          <Section title="৫. কতদিন রাখা হয়">
            <p>সেভ করা তথ্য শপের ঠিক করা সময় পর নিজে থেকে মুছে যায় (শপ ৭ থেকে ৩৬৫ দিন না বাছলে ৯০ দিন)। শপ যেকোনো সময় যেকোনোটা বা সব মুছতে পারে, আর Orders &gt; Chat orders থেকে সবগুলোর কপি নামাতে পারে।</p>
          </Section>
          <Section title="৬. আপনার অধিকার">
            <p>শপ: ড্যাশবোর্ডে নিজের তথ্য দেখা, ঠিক করা, নামানো ও মোছা যায়, আর যেকোনো ব্রাউজার বিচ্ছিন্ন করা যায়। যে কাস্টমারের তথ্য কোনো শপ রেখেছে: সেই শপকে মুছতে বলুন, অথবা Regantify কে জানান, আমরা শপকে জানিয়ে তথ্য মুছে দেব। [আইনি যাচাই: উত্তরের সময়সীমা ও প্রযোজ্য বাংলাদেশের আইন।]</p>
          </Section>
          <Section title="৭. যোগাযোগ">
            <p>{CONTACT}</p>
          </Section>
        </div>
      </div>
    </main>
  );
}
