import type { SupportCategory } from './supportApi';

// Contact details shown on Vendor > Support. Placeholders until the real
// numbers are decided: change them here, nowhere else. An empty string
// hides that row.
export const SUPPORT_CONTACT = {
  whatsapp: '01XXXXXXXXX',
  phone: '01XXXXXXXXX',
  email: 'support@regantify.com',
  hours: 'Saturday to Thursday, 10am to 8pm',
  replyTime: 'We usually reply within a few hours during working hours.',
};

export const CATEGORY_LABEL: Record<SupportCategory, string> = {
  ORDERS: 'Orders',
  PAYMENTS: 'Payments & withdrawals',
  BILLING: 'Plan & billing',
  COURIER: 'Courier',
  STOREFRONT: 'Storefront & design',
  ACCOUNT: 'Account & staff',
  OTHER: 'Something else',
};

export interface HelpTopic {
  question: string;
  answer: string;
  /** Where in the dashboard this is done. */
  link?: { label: string; to: string };
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    question: 'How do I change my delivery charge?',
    answer: 'Set Inside Dhaka, Outside Dhaka and a flat VAT in one place. Checkout uses these numbers right away.',
    link: { label: 'Open Delivery Charge', to: '/vendor/store/delivery-charge' },
  },
  {
    question: 'When does a withdrawal reach me?',
    answer:
      'The amount is set aside from your balance as soon as you request it. Once our team approves it, we send it to your bKash, Nagad or bank account. The minimum is ৳100.',
    link: { label: 'Open Withdraw', to: '/vendor/finance/withdraw' },
  },
  {
    question: 'How do I upgrade my plan?',
    answer: 'Pick a plan on Billing and pay online. Your new plan starts as soon as the payment goes through.',
    link: { label: 'Open Billing', to: '/vendor/billing' },
  },
  {
    question: 'How do I connect Pathao or SteadFast?',
    answer:
      'Add your courier account once, then book parcels from any order. Pathao needs your Client ID and Client Secret from the Pathao merchant panel.',
    link: { label: 'Open Pathao', to: '/vendor/courier/pathao' },
  },
  {
    question: 'Why can I only use the StorePal theme?',
    answer: 'The Free plan includes StorePal. Paid plans unlock more themes, and your earlier choice comes back when you upgrade.',
    link: { label: 'Open Themes', to: '/vendor/store/themes' },
  },
  {
    question: 'Can I use my own domain?',
    answer: 'Yes, on plans that include a custom domain. Add it on the Domain page and point your DNS to us.',
    link: { label: 'Open Domain', to: '/vendor/store/domain' },
  },
];
