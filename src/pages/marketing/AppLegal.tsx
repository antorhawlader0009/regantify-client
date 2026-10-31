import type { ReactNode } from 'react';

/**
 * The Regantify app's public pages that Google Play asks for (STORE-APP-plan.md Step 10): the privacy policy (/legal/app-privacy) and the
 * way to ask for account deletion without the app (/legal/delete-account, the link given in Play's Data safety form). English and Bangla.
 * DRAFT: the parts marked [LEGAL REVIEW] must be checked by a lawyer before the Play listing goes live (STORE-APP-plan.md, lawyer check).
 */

const UPDATED = '31 October 2026';
const CONTACT = '[LEGAL REVIEW: support email and address]';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-700">{children}</div>
    </section>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs uppercase tracking-wide text-green-700">Regantify</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">Last updated {UPDATED}. Draft, pending legal review.</p>
        {children}
      </div>
    </main>
  );
}

export function AppPrivacy() {
  return (
    <Shell title="Regantify app: Privacy Policy">
      <div lang="en">
        <Section title="1. What the app is">
          <p>The Regantify app lets you open the online shops hosted by Regantify, follow your orders, get notifications about them and talk to a shop&rsquo;s AI assistant by voice. The shops belong to their owners. Each shop is shown inside the app with its owner&rsquo;s permission.</p>
        </Section>
        <Section title="2. What we collect, and why">
          <p><strong>Account:</strong> your phone number (or your Google account&rsquo;s ID, name and email if you sign in with Google), to sign you in once for every shop. We keep a sign-in token for the app on your phone and, in a hashed form, on our server.</p>
          <p><strong>Orders and delivery:</strong> when you order from a shop, your name, phone number, delivery address and what you ordered go to that shop and to Regantify, to deliver the order and show its status. Shops see only their own customers.</p>
          <p><strong>Notifications:</strong> a notification token for your phone, which we use only to send you order updates and, if you did not turn them off for a shop, that shop&rsquo;s offers.</p>
          <p><strong>Voice call with the AI assistant:</strong> only when you start a call. Your phone&rsquo;s speech service turns what you say into text. <strong>The app does not record or upload audio.</strong> Only that text is sent to the shop&rsquo;s AI assistant, like a typed message. The speech service is provided by your phone (usually Google) under its own terms.</p>
          <p><strong>Shops you open</strong> are kept on your phone only, as a short list of recent shops.</p>
        </Section>
        <Section title="3. Who receives it">
          <p>The shop you order from, our delivery and payment partners that the shop chooses, our SMS provider (for codes), Google (sign-in, notifications) and Anthropic (the shop&rsquo;s AI assistant writes its answers from your typed or spoken text). We do not sell your data and we do not show ads. [LEGAL REVIEW: processors list and data-processing terms.]</p>
        </Section>
        <Section title="4. Keeping and deleting your data">
          <p>You can delete your account in the app (Home, then &ldquo;Delete my account&rdquo;) or without the app at <a className="underline" href="/legal/delete-account">/legal/delete-account</a>. See that page for what is removed and what stays.</p>
        </Section>
        <Section title="5. Your rights">
          <p>You can ask to see, correct or delete your data. Contact us below. For an order, the shop that took it also holds a copy as its sales record. [LEGAL REVIEW: Bangladesh data-protection law and response time.]</p>
        </Section>
        <Section title="6. Children">
          <p>The app is for people who can make a purchase on their own. It is not directed at children under 13.</p>
        </Section>
        <Section title="7. Contact">
          <p>{CONTACT}</p>
        </Section>
      </div>
    </Shell>
  );
}

export function AppDeleteAccount() {
  return (
    <Shell title="Delete your Regantify account">
      <div lang="en">
        <Section title="In the app">
          <p>Open the Regantify app, sign in, and on the home screen choose <strong>Delete my account</strong>. We send a code to your phone (or ask you to sign in with Google again), then delete the account.</p>
        </Section>
        <Section title="Without the app">
          <p>Open any shop that uses Regantify, sign in, open the account menu and choose <strong>Delete my account</strong>, or go to <code>/account/delete</code> on that shop&rsquo;s address. We send a code to your phone number to confirm it is you. If your account was made with Google and has no phone number, add a phone number first (Account, Edit profile), or delete it from the app.</p>
          <p>Cannot do either? Contact us: {CONTACT}. We will check it is you before deleting.</p>
        </Section>
        <Section title="What is deleted">
          <p>Your sign-ins on every shop and in the app, your saved addresses, carts, wishlist, per-shop profiles, notification devices and the link to your Google account. This happens right away.</p>
        </Section>
        <Section title="What stays, and why">
          <p>Orders you already placed stay with the shop that took them (your name, phone and address, kept as the shop&rsquo;s sales and delivery records, with the amounts and items). So do the shop&rsquo;s own notes, the points and coupon uses tied to your phone number, and the texts it sent you. Reviews and questions you wrote stay on the shop&rsquo;s page without your name or contact details. We keep one count-only record that an account was deleted.</p>
        </Section>
      </div>
    </Shell>
  );
}
