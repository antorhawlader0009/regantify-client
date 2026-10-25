import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, MousePointerClick, Send } from 'lucide-react';
import { PageHeader, PageSection } from '../../../components/ui/PageKit';
import { InstantLinksList } from '../../../components/order/InstantLinksList';

// Orders > Checkout links: the instant checkout feature on its own page (it was only a button on Orders and a tab on
// the Extension page). The shop picks the products and the customer's details, sends one link, and the customer opens
// a checkout that is already filled in. Server: server/src/instant-checkout/. `?new=1` opens "New link" at once.

const STEPS = [
  { icon: ClipboardCheck, title: 'Pick the products', text: 'Choose the items, sizes and quantity, and type the customer’s name, phone and address if you have them.' },
  { icon: Send, title: 'Send the link', text: 'Copy it into Messenger, WhatsApp or an SMS. It works for 1, 3 or 7 days.' },
  { icon: MousePointerClick, title: 'They confirm', text: 'The customer opens a checkout already filled in and places the order with one tap. Price and stock are today’s.' },
];

export default function InstantCheckout() {
  const [params] = useSearchParams();
  return (
    <div className="space-y-3">
      <PageSection>
        <PageHeader
          title="Checkout links"
          description="Send a customer a link with their order ready, so they only press Confirm. Each link gives one order."
          back={{ to: '/vendor/orders', label: 'Orders' }}
        />
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.title} className="flex gap-3 rounded-xl border border-line bg-white p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                <s.icon size={17} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-regantify-text">{s.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-neutral-500">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </PageSection>
      <InstantLinksList title="Your links" autoOpen={params.get('new') === '1'} />
    </div>
  );
}
