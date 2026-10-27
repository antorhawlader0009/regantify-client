/**
 * The "ask Claude for this code" guide on Store > Design > Custom CSS / Custom Head Scripts / JavaScript Code
 * (components/store/CustomCodeAiHelper.tsx). A seller copies it with their own request and pastes it into Claude (or any
 * AI chat), which then writes code that fits this store. Everything it promises lives in the storefront and must stay
 * true there; **keep the two in step**, and never rename a hook a store may already use:
 * - the `data-rg="..."` and `data-rg-section="..."` names in the StorePal components (HOOKS below);
 * - `<html data-rg-store / data-rg-page>`, `window.Regantify` and the `regantify:event` events
 *   (storefront components/StoreCodeHooks.tsx, lib/customCodeEvents.ts, lib/ecommerceEvents.ts);
 * - how each kind of code is loaded (storefront app/store/[subdomain]/layout.tsx, CustomCodeInjector.tsx);
 * - the size limits (server store-settings/dto/custom-code.dto.ts).
 */

export type CustomCodeKind = 'css' | 'head' | 'js';

/** Stable names on the page parts, `data-rg="..."`. */
export const HOOKS: { name: string; what: string; where: string }[] = [
  { name: 'announcement-bar', what: 'The thin banner above the header (Site Banner)', where: 'every page, when the store has one' },
  { name: 'header', what: 'The whole top header (sticky)', where: 'every page' },
  { name: 'top-menu', what: 'The small link rows above the header', where: 'every page, larger screens' },
  { name: 'logo', what: 'Logo picture and store name (a link to home)', where: 'every page' },
  { name: 'search', what: 'The search box (one for computers, one for phones)', where: 'every page' },
  { name: 'cart-button', what: 'The bag icon that opens the cart', where: 'every page' },
  { name: 'menu', what: 'The site menu row under the header', where: 'every page, when the store set one' },
  { name: 'hero', what: 'The big picture slider at the top of the home page', where: 'home' },
  { name: 'product-card', what: 'One product box in a list (also has data-rg-product="<product link name>")', where: 'home, category, search, collection' },
  { name: 'product-card-title', what: 'Product name inside a card', where: 'inside product-card' },
  { name: 'product-card-price', what: 'Price line inside a card', where: 'inside product-card' },
  { name: 'product-card-add-to-cart', what: '"Add to Cart" button on a card', where: 'inside product-card' },
  { name: 'product-card-buy-now', what: '"Buy Now" button on a card', where: 'inside product-card' },
  { name: 'product-gallery', what: 'Photos of the product', where: 'product page' },
  { name: 'product-title', what: 'Product name (the h1)', where: 'product page' },
  { name: 'product-price', what: 'The price box', where: 'product page' },
  { name: 'product-buttons', what: 'The row with Add to Cart and Buy Now', where: 'product page' },
  { name: 'add-to-cart', what: '"Add to Cart" button', where: 'product page' },
  { name: 'buy-now', what: '"Buy Now" button', where: 'product page' },
  { name: 'product-summary', what: 'The short text under the buttons', where: 'product page' },
  { name: 'product-tabs', what: 'Description / reviews / questions tabs', where: 'product page' },
  { name: 'cart-drawer', what: 'The cart panel that slides in from the right', where: 'every page, when open' },
  { name: 'checkout-button', what: '"Checkout" button in the cart panel', where: 'inside cart-drawer' },
  { name: 'footer', what: 'The whole footer', where: 'every page' },
  { name: 'chat-button', what: 'The round WhatsApp / Messenger button', where: 'every page, when on' },
];

/** Home page sections, each in a box with `data-rg-section="..."`. */
export const HOME_SECTIONS = [
  'hero',
  'flash-sale',
  'campaigns',
  'top-selling',
  'category-shortcuts',
  'category-sections',
  'highlights',
  'faq',
  'social-feed',
  'magazine',
  'reviews',
];

/** `<html data-rg-page="...">`. */
export const PAGE_TYPES = [
  'home',
  'category',
  'search',
  'product',
  'collection',
  'campaign',
  'cart',
  'checkout',
  'payment',
  'thank-you',
  'order-tracking',
  'account',
  'wishlist',
  'compare',
  'blog',
  'page',
  'faq',
  'contact',
  'locations',
  'gift-card',
  'landing',
  'other',
];

const CSS_VARS = [
  ['--color-accent', 'the store colour (buttons, prices)'],
  ['--color-accent-dark', 'darker store colour (hover)'],
  ['--color-accent-light', 'very light store colour (soft backgrounds)'],
  ['--color-ink', 'main text colour'],
  ['--color-muted', 'grey secondary text'],
  ['--color-canvas', 'page background'],
  ['--color-surface', 'card / panel background (white)'],
  ['--color-line', 'light border'],
  ['--font-display', 'heading font'],
  ['--font-sans', 'body font'],
];

const EVENTS = [
  ['page_view', '{ page, path }: every page the shopper opens (also after in-page navigation)'],
  ['view_item_list', '{ item_list_name, items }: a list of products was shown (home, a category, search results...)'],
  ['select_item', '{ item_list_name, items }: a product card in a list was clicked'],
  ['view_item', 'a product page was shown'],
  ['add_to_cart', 'a product went into the cart'],
  ['remove_from_cart', 'a product was taken out of the cart'],
  ['view_cart', 'the cart was opened'],
  ['add_to_wishlist', 'heart pressed on a product'],
  ['search', '{ search_term }'],
  ['begin_checkout', 'the checkout form opened'],
  ['add_shipping_info', '{ shipping_tier }: the delivery details were filled in at "Place order"'],
  ['add_payment_info', 'a payment method was chosen'],
  ['purchase', '{ transaction_id, value, shipping, tax, items }: on the thank-you page, once per order'],
  ['sign_up', 'a shopper made an account'],
  ['login', '{ method }: a shopper signed in'],
];

const TASK_BY_KIND: Record<CustomCodeKind, string> = {
  css: `## Where the code goes: Store > Design > Custom CSS
- Write plain CSS only. No <style> tag, no HTML, no JavaScript. At most 60,000 characters in the box (it already may hold earlier CSS: write only the new part, the owner adds it at the end).
- It is added to every page of the store, after the theme's own styles. An attribute selector like [data-rg="buy-now"] has the same weight as one theme class and comes later, so it usually wins without !important. Use !important only if a rule really does not apply.
- Limit a rule to one kind of page with the page type, for example: html[data-rg-page="product"] [data-rg="buy-now"] { ... }
- Phones first: most shoppers use a phone. Phone-only rules: @media (max-width: 639px) { ... }. Computer-only: @media (min-width: 640px) { ... }.
- Do not hide or cover the price, Buy buttons, the cart or checkout in a way that stops people from buying.`,
  head: `## Where the code goes: Store > Design > Custom Head Scripts
- Paste-ready HTML tags (<script>, <link>, <meta>, <noscript>) or plain JavaScript on its own. At most 30,000 characters.
- It runs once per full page load, inside <head>, a moment after the page has loaded (so it never slows the first tap). The store does NOT reload when a shopper moves between pages, so code that must react to every page should use Regantify.on('page_view', ...).
- An external <script src> without async/defer is waited for before the next tag, so a library tag followed by code that uses it works.
- A <meta> verification tag added here is placed by script after load, so Google and Bing may not see it. For Google Search Console / Bing verification tell the owner to use Store > SEO instead. For Facebook Pixel, Google Analytics 4, Google Tag Manager and TikTok Pixel the store has ready settings under Store > Integrations; suggest those first and only write code if the owner wants something they don't do.`,
  js: `## Where the code goes: Store > Design > JavaScript Code (Add New)
- Plain JavaScript only, no <script> tags, no HTML. At most 60,000 characters. The owner gives it a name and picks Position: "Head" or "Body" (Body runs last; choose Body unless there is a reason).
- It runs once per full page load, a moment after the page has loaded. The store does NOT reload when a shopper moves between pages, so code that must react to every page should use Regantify.on('page_view', ...), and code for elements that appear later (cart panel, more product cards while scrolling) should use a MutationObserver.
- A script with a syntax error is skipped, so test it mentally before answering.`,
};

const ANSWER_RULES = `## How to answer
1. One code block, complete and ready to paste into the box above. No placeholders the owner must fill, unless something only they know is needed (then say exactly what to replace, e.g. their Pixel ID).
2. Then a short explanation in plain words, in the same language the owner used for the request (Bangla if they wrote Bangla, English otherwise): what it does, where to paste it, and how to undo it (delete the code and save).
3. If the request cannot be done with this kind of code, or belongs in another box (Custom CSS / Custom Head Scripts / JavaScript Code) or a ready setting of the store, say so clearly and give the code for the right box.
4. If the request is unclear, make a sensible small version and say what you assumed; do not ask many questions.`;

const SAFETY = `## Rules (always)
- Use ONLY the stable names below (data-rg, data-rg-section, data-rg-page, the CSS variables, window.Regantify). Never use the theme's class names (like "rounded-xl px-4 text-ink"): they change with every design update and the code would silently stop working. If no stable name fits, say which part is not reachable and offer the closest option.
- You cannot see the store. Do not guess other element ids or structure.
- Never break buying: no code that blocks clicks, reloads the page, redirects, uses document.write, alert() or confirm(), or changes prices.
- Never read, store or send the shopper's personal details (name, phone, address, passwords) anywhere.
- Load outside scripts only from well-known providers (Google, Meta, TikTok, Microsoft Clarity, Hotjar and similar) and only when the request needs them.
- Wrap JavaScript in a function or block so its variables don't leak, and in try { } catch { } so one mistake can't stop the rest of the page.`;

function table(rows: string[][]): string {
  return rows.map((r) => `- ${r[0]}: ${r[1]}`).join('\n');
}

export function customCodeGuide(opts: { kind: CustomCodeKind; request: string; storeName?: string | null; storeUrl?: string | null }): string {
  const request = opts.request.trim() || '(Write what you want here, in Bangla or English.)';
  const parts = [
    `# Write custom code for my online store`,
    `I run an online shop on Regantify (template: StorePal). I can paste code into one box in my store's dashboard. Please write that code for me.`,
    `## What I want\n${request}`,
    TASK_BY_KIND[opts.kind],
    ANSWER_RULES,
    SAFETY,
    `## About the store
- ${opts.storeName ? `Store name: ${opts.storeName}. ` : ''}${opts.storeUrl ? `Address: ${opts.storeUrl}` : ''}
- Built with Next.js and React. Prices are in Bangladeshi taka (৳). Text may be in Bangla or English.
- Every page part below has the same names on every store and is promised not to change.`,
    `## Stable names on the page: [data-rg="NAME"]
${HOOKS.map((h) => `- ${h.name}: ${h.what} (${h.where})`).join('\n')}
Example CSS: [data-rg="add-to-cart"] { border-radius: 999px; }
Example JS: document.querySelectorAll('[data-rg="product-card"]')`,
    `## Home page sections: [data-rg-section="NAME"]
${HOME_SECTIONS.join(', ')} (a section appears only when the store has it turned on).`,
    `## Page type: <html data-rg-page="TYPE" data-rg-store="${opts.storeUrl ? 'store address name' : 'store'}">
${PAGE_TYPES.join(', ')}. It updates when the shopper moves to another page.
Example: html[data-rg-page="home"] [data-rg="footer"] { ... }`,
    `## Colours and fonts (CSS variables on the page)
${table(CSS_VARS)}
Use them so the code follows the store's own colours: color: var(--color-accent);`,
  ];
  if (opts.kind !== 'css') {
    parts.push(`## JavaScript you can use
- window.Regantify.page: the current page type (same list as above). window.Regantify.store: the store's address name.
- window.Regantify.on(NAME, function (e) { ... }) runs your function for an event; NAME "*" means every event. It also replays the events that already happened on this page before your code started. It returns a function that stops listening.
- Each event is { name, params }; params follow Google Analytics 4's names (currency "BDT", value, items: [{ item_id, item_name, item_variant, price, quantity }]). They never contain the shopper's personal details.
- Events:
${table(EVENTS)}
- The same events also arrive as window events: window.addEventListener('regantify:event', function (e) { e.detail.name, e.detail.params }).
Example:
Regantify.on('add_to_cart', function (e) {
  try { console.log('Added', e.params.items[0].item_name); } catch (err) {}
});`);
  }
  return parts.join('\n\n');
}

/** A few starting ideas per kind, for the helper's example chips (the seller can edit them). */
export const EXAMPLES: Record<CustomCodeKind, string[]> = {
  css: [
    'Make the Buy Now buttons round and a bit bigger on phones.',
    'Hide the product summary text on product pages.',
    'Put a light background behind the Top Selling section.',
    'প্রোডাক্ট কার্ডের নাম দুই লাইনের বদলে এক লাইনে দেখাও।',
  ],
  head: [
    'Add Microsoft Clarity to see how shoppers use my store. My Clarity ID is: ',
    'Add a Google Font "Hind Siliguri" for Bangla text across the store.',
    'Add the Hotjar tracking code. My Hotjar site ID is: ',
  ],
  js: [
    'Show a small "Free delivery over ৳1,500" note under the Add to Cart button on product pages.',
    'When someone adds a product to the cart, briefly shake the cart icon.',
    'চেকআউট বাটনের উপরে "ক্যাশ অন ডেলিভারি পাওয়া যায়" লেখা দেখাও।',
  ],
};
