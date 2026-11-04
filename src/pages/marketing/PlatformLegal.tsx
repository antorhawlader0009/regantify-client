/**
 * The platform's own public legal pages (2026-11-04): /legal/privacy and /legal/terms. They cover the whole Regantify platform
 * (the seller dashboard, every store, the Regantify Shop and "Sign in with Google"), and are the links given to Google's OAuth
 * consent screen. The app and the Chrome extension keep their own pages (AppLegal.tsx, ChatExtensionPrivacy.tsx).
 * Plain English, no long dashes. Marked as a draft until a lawyer has read it.
 */
import { Section, Shell } from './AppLegal';

const SUPPORT_EMAIL = 'antorhawlader0009@gmail.com';

function Contact() {
  return (
    <p>
      Email <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, or open a ticket from Support in your
      Regantify dashboard. Shoppers with a question about an order should first contact the shop they bought from.
    </p>
  );
}

export function PlatformPrivacy() {
  return (
    <Shell title="Privacy Policy">
      <div lang="en">
        <Section title="1. Who we are">
          <p>Regantify (regantify.com) is a platform that lets sellers in Bangladesh run their own online shop. It has a dashboard for sellers, a website for each shop, the Regantify Shop marketplace and the Regantify app. This policy explains what we collect, why, and who we share it with. The app and the Chat Order Saver extension have their own pages: <a className="underline" href="/legal/app-privacy">app privacy policy</a>, <a className="underline" href="/legal/chat-extension-privacy">extension privacy policy</a>.</p>
          <p>Each shop belongs to its seller. When you buy from a shop, that seller decides how your order is handled; Regantify runs the system for them.</p>
        </Section>
        <Section title="2. What we collect">
          <p><strong>Sellers and their staff:</strong> name, phone number, email, password (stored only as a one-way hash), shop details, and the records of running the shop: products, orders, customers, payments, plan and usage. We also keep a sign-in history (time, browser, and the address you signed in from with its last part hidden) so we can warn you about a new device.</p>
          <p><strong>Shoppers:</strong> to place an order, your name, phone number, delivery address and what you ordered. If you make an account: your phone number or your Google account details (see section 3), saved addresses, cart, wishlist and reviews. A shop sees only its own customers and their orders.</p>
          <p><strong>Technical data:</strong> the address your device connects from, browser type, and pages visited, used to keep the service secure, stop fake orders and count visits. Counts of visits and feature use are kept without names.</p>
          <p><strong>Cookies:</strong> we use cookies only to keep you signed in, to remember a device for security, and to remember your choices (for example language or cart). We do not use advertising cookies. A shop may add its own tracking tools (for example a Facebook pixel); those are the shop&rsquo;s choice and under its own terms.</p>
        </Section>
        <Section title="3. Sign in with Google">
          <p>If you choose &ldquo;Continue with Google&rdquo;, Google sends us your Google account ID, your name, your email address and whether that email is verified. We ask for nothing more: no access to your Gmail, Drive, contacts or any other Google data.</p>
          <p>We use this only to create your account and sign you in, and to show your name and email in your own account. We do not sell it, do not use it for advertising, and do not share it with anyone except as needed to run the service described here. Regantify&rsquo;s use of information received from Google APIs follows the <a className="underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
          <p>Sellers can disconnect Google in Settings, Security. Anyone can remove Regantify&rsquo;s access at any time from your Google account (Security, Third-party apps).</p>
        </Section>
        <Section title="4. Why we use it">
          <p>To run the shops and deliver orders; to send order updates and sign-in codes by SMS; to take and confirm payments; to prevent fraud and fake orders; to give support; to bill sellers for their plan; and to improve the service. When a seller turns on the AI assistant, what a shopper types or says in the chat is sent to our AI provider to write the answer.</p>
        </Section>
        <Section title="5. Who receives it">
          <p>Only the services we need to run the platform: the shop you order from; the courier and payment service the shop uses for your order; our SMS provider; our hosting and file storage providers (servers and pictures); Google (sign-in and app notifications); Anthropic (the AI assistant&rsquo;s answers, only when a shop uses it); and our email provider (messages to sellers only). We do not sell personal data and we do not show ads. We give data to authorities only when the law requires it.</p>
        </Section>
        <Section title="6. How long we keep it">
          <p>We keep account and order records while the account is active and as long as the law requires sellers to keep sales records. Security logs and similar records are deleted on a schedule (for example, sign-in history after 90 days). Backups are encrypted and replaced on a rolling basis.</p>
        </Section>
        <Section title="7. Security">
          <p>Connections are encrypted (HTTPS), passwords are stored only as hashes, sensitive keys and documents are encrypted in our database, and access inside the team is limited by role. No system is perfectly safe; if we learn of a breach that affects you, we will tell you.</p>
        </Section>
        <Section title="8. Your choices and rights">
          <p>You can see and correct your account details in your account. You can ask us to give you a copy of your data or to delete it. Shoppers can delete their account from their account page or at <a className="underline" href="/legal/delete-account">/legal/delete-account</a>. A shop keeps its own copy of orders you placed with it as its sales record.</p>
        </Section>
        <Section title="9. Children">
          <p>Regantify is not directed at children under 13, and we do not knowingly collect their data.</p>
        </Section>
        <Section title="10. Changes">
          <p>We will update this page when our practices change and show the new date at the top. For a big change we will tell sellers in their dashboard.</p>
        </Section>
        <Section title="11. Contact">
          <Contact />
        </Section>
      </div>
    </Shell>
  );
}

export function PlatformTerms() {
  return (
    <Shell title="Terms of Service">
      <div lang="en">
        <Section title="1. About these terms">
          <p>These terms apply to everyone who uses Regantify (regantify.com): sellers who run a shop, their staff, and shoppers who visit or buy from a shop or the Regantify Shop. By using Regantify you agree to them. Our <a className="underline" href="/legal/privacy">Privacy Policy</a> explains how we handle personal data.</p>
        </Section>
        <Section title="2. What Regantify is">
          <p>Regantify provides software for sellers to run online shops. Each shop, its products, prices, delivery and returns belong to its seller. When you buy from a shop, your purchase contract is with that seller, not with Regantify.</p>
        </Section>
        <Section title="3. Accounts">
          <p>Give true details and keep your password and sign-in codes private. You are responsible for what happens in your account, including what your staff do. Tell us at once if you think someone else has used it.</p>
        </Section>
        <Section title="4. Sellers">
          <p>Sellers must sell only lawful goods, describe them honestly, honour the prices and terms they show, deliver what was ordered, handle returns and refunds with their customers, and follow the laws of Bangladesh, including tax and consumer law. Sellers are responsible for the content they upload and must have the right to use it.</p>
          <p>Plans, add-ons, SMS and AI credits are paid as shown in the dashboard. Platform charges on orders are shown before they apply. Fees already paid are not refunded except where the law or a written offer says so.</p>
        </Section>
        <Section title="5. Shoppers">
          <p>Place only real orders, give a correct phone number and address, and pay as agreed. Questions about an order, delivery, returns or refunds go to the shop you bought from.</p>
        </Section>
        <Section title="6. Not allowed">
          <p>Fake or abusive orders; selling illegal, stolen, counterfeit or dangerous goods; misleading people; sending spam; trying to break, overload or get around the platform&rsquo;s security; copying the platform; or using someone else&rsquo;s account or data without permission.</p>
        </Section>
        <Section title="7. Suspension and closing">
          <p>We may limit, suspend or close an account or a shop that breaks these terms or the law, or that puts shoppers or the platform at risk. Where we can, we will tell the seller first and give a reason. A seller can stop using Regantify at any time.</p>
        </Section>
        <Section title="8. The service">
          <p>We work to keep Regantify running, but it is provided as it is, and it may sometimes be unavailable or change. Services run by others (couriers, payment gateways, SMS, Google) follow their own terms.</p>
        </Section>
        <Section title="9. Liability">
          <p>As far as the law allows, Regantify is not responsible for a seller&rsquo;s goods or conduct, or for indirect losses such as lost profit. Our total responsibility to a seller is limited to the fees that seller paid us in the three months before the claim.</p>
        </Section>
        <Section title="10. Law">
          <p>These terms are governed by the laws of Bangladesh.</p>
        </Section>
        <Section title="11. Changes">
          <p>We may update these terms. The date at the top shows the latest version; for a big change we will tell sellers in their dashboard. Using Regantify after a change means you accept it.</p>
        </Section>
        <Section title="12. Contact">
          <Contact />
        </Section>
      </div>
    </Shell>
  );
}
