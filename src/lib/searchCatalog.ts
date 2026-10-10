/*
 * The settings and features that live INSIDE dashboard pages, so the top-bar search can find them by what they do
 * ("low stock limit", "block fake orders", "bkash", "quiet hours") and not only by the page's menu name. Each entry
 * opens its page (a `#section` hash scrolls to a section that has that id). `keywords` carries other words a seller
 * might type: synonyms, Banglish (dam, bondho, charge) and Bangla script.
 *
 * Keep it in step with the pages: when a setting is added to a page, add a line here. Who may open an entry is not
 * stored here; the palette checks the entry's path with canOpenPath, like the sidebar.
 */

export interface CatalogEntry {
  /** What it is, in the words the page uses. */
  title: string;
  /** Breadcrumb shown under it, e.g. "Store > Stock Settings". */
  where: string;
  /** Page route, optionally with a `#section` hash or a `?query`. */
  path: string;
  /** Other words people type for it. */
  keywords?: string;
}

const STOCK = '/vendor/store/stock-settings';
const COD = '/vendor/store/cod-guard';
const DELIVERY = '/vendor/store/delivery-charge';
const NOTIF = '/vendor/notifications?settings=alerts';
const LMS = '/vendor/lms/settings';
const POS = '/vendor/pos/settings';

export const SETTINGS_CATALOG: CatalogEntry[] = [
  // ------------------------------------------------------------------ Store > Checkout
  { title: 'Delivery charge', where: 'Store > Delivery Charge', path: DELIVERY, keywords: 'shipping fee cost inside dhaka outside dhaka free delivery courier charge delivery khoroch ডেলিভারি চার্জ ডেলিভারি খরচ' },
  { title: 'Around Dhaka delivery zone', where: 'Store > Delivery Charge', path: DELIVERY, keywords: 'savar gazipur narayanganj third zone nearby suburb ঢাকার আশেপাশে সাভার গাজীপুর নারায়ণগঞ্জ' },
  { title: 'Delivery time estimate', where: 'Store > Delivery Charge', path: DELIVERY, keywords: 'days working days off days friday holiday estimated delivery date processing days ডেলিভারি সময় কত দিন' },
  { title: 'VAT on orders', where: 'Store > Delivery Charge', path: DELIVERY, keywords: 'tax vat charge flat every order ভ্যাট ট্যাক্স' },
  { title: 'Payment methods (COD, online payment)', where: 'Store > Payment Gateway', path: '/vendor/store/payment-gateway', keywords: 'cash on delivery cod online payment card mobile banking pay checkout পেমেন্ট ক্যাশ অন ডেলিভারি' },
  { title: 'bKash, Nagad, Rocket, SSLCommerz', where: 'Store > Payment Gateway', path: '/vendor/store/payment-gateway', keywords: 'bkash nagad rocket ssl commerz sslcommerz custom gateway connect payment gateway বিকাশ নগদ রকেট' },
  { title: 'Payment fee: who pays, hide the fee', where: 'Store > Payment Gateway', path: '/vendor/store/payment-gateway', keywords: 'platform charge gateway fee customer pays vendor pays hidden charge ফি চার্জ' },
  { title: 'Show or hide out-of-stock products', where: 'Store > Stock Settings', path: STOCK, keywords: 'sold out hide badge shop pages stock out অ্যাভেইলেবল স্টক শেষ' },
  { title: 'Allow backorders (sell without stock)', where: 'Store > Stock Settings', path: STOCK, keywords: 'backorder pre order out of stock order allow negative popup message স্টক নাই তবুও অর্ডার' },
  { title: 'Reduce stock when a COD order is placed', where: 'Store > Stock Settings', path: STOCK, keywords: 'cod stock deduct processing deferred stock reduce when স্টক কমবে' },
  { title: 'Returned stock: put back after check-in', where: 'Store > Stock Settings', path: STOCK, keywords: 'return restock returned parcels check in stock back ফেরত স্টক' },
  { title: 'Low stock alert limit', where: 'Store > Stock Settings', path: STOCK, keywords: 'low stock threshold minimum quantity alert warning running out কম স্টক সতর্কতা' },
  { title: 'Block fake or bad customers (auto block)', where: 'Store > COD Guard', path: COD, keywords: 'blacklist fake order cod block auto block blocked customer ব্ল্যাকলিস্ট ভুয়া অর্ডার' },
  { title: 'SMS code to verify COD orders', where: 'Store > COD Guard', path: COD, keywords: 'otp verification phone verify code before after checkout fake order sms ভেরিফিকেশন ওটিপি' },
  { title: 'Cancel or hold orders never verified', where: 'Store > COD Guard', path: COD, keywords: 'verification expiry time allowed enter code on hold cancel unverified' },
  { title: 'Take an advance on COD (delivery charge)', where: 'Store > COD Guard', path: COD, keywords: 'advance payment delivery charge in advance cod minimum order অগ্রিম অ্যাডভান্স' },
  { title: 'Pre-order advance percentage', where: 'Store > COD Guard', path: COD, keywords: 'preorder advance percent 30 50 deposit অগ্রিম প্রি-অর্ডার' },
  { title: 'Hold possible duplicate orders', where: 'Store > COD Guard', path: COD, keywords: 'duplicate double order same phone same product on hold ডুপ্লিকেট' },
  { title: 'Let customers cancel their own order', where: 'Store > COD Guard', path: COD, keywords: 'customer cancel button tracking page self cancel অর্ডার বাতিল' },
  { title: 'Let customers fix their delivery address', where: 'Store > COD Guard', path: COD, keywords: 'customer edit address change phone correct address ঠিকানা ঠিক' },
  { title: 'Store away / holiday mode', where: 'Store > Store Away', path: '/vendor/store/store-away', keywords: 'closed vacation eid break not taking orders return date pause store banner ছুটি দোকান বন্ধ ঈদ' },
  { title: 'Order tracking page and customer status SMS', where: 'Store > Order Tracking', path: '/vendor/store/order-tracking', keywords: 'tracking sms customer order update message confirmed shipped delivered টেমপ্লেট ট্র্যাকিং এসএমএস' },
  { title: 'Order tracking SMS quiet hours', where: 'Store > Order Tracking', path: '/vendor/store/order-tracking', keywords: 'quiet hours night no sms 10pm 8am রাত' },

  // ------------------------------------------------------------------ Store > Design & content
  { title: 'Store theme / template', where: 'Store > Templates', path: '/vendor/store/themes', keywords: 'theme template storepal medium minimal change look design থিম টেমপ্লেট' },
  { title: 'Logo, favicon and brand colours', where: 'Store > Design > Branding', path: '/vendor/store/branding', keywords: 'logo favicon color colour brand store name icon লোগো রঙ' },
  { title: 'Store language (Bangla / English)', where: 'Store > Design > Layout Settings', path: '/vendor/store/layout-settings', keywords: 'bangla bengali english language translate store labels বাংলা ভাষা' },
  { title: 'Homepage sections and layout', where: 'Store > Design > Customize', path: '/vendor/store/customize', keywords: 'home page sections banner slider categories featured products reorder হোম পেজ' },
  { title: 'Menu and header', where: 'Store > Design > Header Editor', path: '/vendor/store/header-editor', keywords: 'navigation menu links header announcement top bar মেনু হেডার' },
  { title: 'Footer', where: 'Store > Design > Footer', path: '/vendor/store/footer', keywords: 'footer links contact address about payment icons social ফুটার' },
  { title: 'Announcement bar / site banner', where: 'Store > Design > Site Banner', path: '/vendor/store/site-banner', keywords: 'banner announcement top strip offer message ব্যানার' },
  { title: 'WhatsApp / Messenger chat button', where: 'Store > Design > Chat Button', path: '/vendor/store/chat-button', keywords: 'chat bubble whatsapp messenger floating button contact হোয়াটসঅ্যাপ মেসেঞ্জার' },
  { title: 'Product page display options', where: 'Store > Design > Product Display', path: '/vendor/store/product-display', keywords: 'product page sku stock countdown share related reviews tabs show hide' },
  { title: 'Product card (grid) options', where: 'Store > Design > Product Card', path: '/vendor/store/product-card', keywords: 'card grid sale badge price quick add to cart rating show' },
  { title: 'Pages (About, Contact, Privacy)', where: 'Store > Content > Pages', path: '/vendor/store/pages', keywords: 'about us contact privacy policy terms refund return policy page cms পেজ' },
  { title: 'Landing pages', where: 'Store > Content > Landing Page', path: '/vendor/store/landing-pages', keywords: 'landing page builder one product sales page facebook ad ল্যান্ডিং পেজ' },
  { title: 'Media library (uploaded images)', where: 'Store > Content > Media', path: '/vendor/store/media', keywords: 'images photos upload gallery files delete unused মিডিয়া ছবি' },
  { title: 'Custom domain', where: 'Store > Store Settings > Domain', path: '/vendor/store/domain', keywords: 'domain name dns record connect website url .com ডোমেইন' },
  { title: 'Social media links', where: 'Store > Store Settings > Social', path: '/vendor/store/social', keywords: 'facebook instagram youtube tiktok whatsapp number link page সোশ্যাল ফেসবুক' },
  { title: 'Cookie / GDPR prompt', where: 'Store > Store Settings > GDPR Prompt', path: '/vendor/store/gdpr', keywords: 'cookie consent privacy banner gdpr' },
  { title: 'Facebook Pixel', where: 'Store > Integrations', path: '/vendor/store/integrations/facebook-pixel', keywords: 'meta pixel facebook ads tracking conversion ফেসবুক পিক্সেল' },
  { title: 'Meta Conversions API', where: 'Store > Integrations', path: '/vendor/store/integrations/meta-conversions-api', keywords: 'capi facebook server side events token' },
  { title: 'TikTok Pixel', where: 'Store > Integrations', path: '/vendor/store/integrations/tiktok-pixel', keywords: 'tiktok ads tracking' },
  { title: 'Google Analytics', where: 'Store > Integrations', path: '/vendor/store/integrations/google-analytics', keywords: 'ga4 analytics measurement id traffic visitors' },
  { title: 'Google Tag Manager', where: 'Store > Integrations', path: '/vendor/store/integrations/google-tag-manager', keywords: 'gtm tag manager container' },
  { title: 'Webhooks', where: 'Store > Integrations', path: '/vendor/store/integrations/webhooks', keywords: 'webhook events url notify other apps order created' },
  { title: 'External API key', where: 'Store > Integrations', path: '/vendor/store/integrations/external-api', keywords: 'api key developer token integration leads orders create' },
  { title: 'Custom CSS', where: 'Store > Custom Code', path: '/vendor/store/custom-css', keywords: 'css style code design override' },
  { title: 'Head scripts', where: 'Store > Custom Code', path: '/vendor/store/head-scripts', keywords: 'script tag head html code verification meta tag' },
  { title: 'JavaScript code', where: 'Store > Custom Code', path: '/vendor/store/javascript', keywords: 'js javascript custom code snippet' },

  // ------------------------------------------------------------------ Orders & couriers
  { title: 'Add an order by hand', where: 'Orders > Add Order', path: '/vendor/orders/add', keywords: 'manual order phone order facebook order whatsapp new order create অর্ডার যোগ' },
  { title: 'Import orders from Excel / CSV', where: 'Orders > Import', path: '/vendor/orders/import', keywords: 'bulk upload spreadsheet excel csv many orders xlsx' },
  { title: 'Packing list and pick list (for packers)', where: 'Orders > select orders > Packing list', path: '/vendor/orders', keywords: 'pack packing slip pick list shelf print box items without price প্যাকিং লিস্ট' },
  { title: 'Profit on each order', where: 'Orders > Order detail / Show profit', path: '/vendor/orders', keywords: 'order profit margin loss making loss orders cost per order লাভ লোকসান' },
  { title: 'Courier handover sheet', where: 'Orders > Courier Handover', path: '/vendor/orders/handover', keywords: 'pickup sheet rider sign parcels give courier print scan handover' },
  { title: 'Return check-in (count returned parcels)', where: 'Orders > Return check-in', path: '/vendor/orders/return-check-in', keywords: 'returned parcel damaged missing stock back scan return received ফেরত পার্সেল' },
  { title: 'Abandoned carts (incomplete checkouts)', where: 'Orders > Abandoned Cart', path: '/vendor/orders?tab=abandoned-cart', keywords: 'incomplete orders recover left cart reminder ছেড়ে যাওয়া' },
  { title: 'Order status tabs (customize)', where: 'Orders', path: '/vendor/orders', keywords: 'tabs pending processing shipping completed customize status columns' },
  { title: 'Possible duplicate orders', where: 'Orders', path: '/vendor/orders?possibleDuplicate=true', keywords: 'duplicate filter same phone' },
  { title: 'Pathao courier', where: 'Courier Integration > Pathao', path: '/vendor/courier/pathao', keywords: 'pathao connect client id secret book parcel auto book webhook status পাঠাও' },
  { title: 'Pathao shipping labels', where: 'Courier Integration > Pathao', path: '/vendor/courier/pathao', keywords: 'label print sticker consignment' },
  { title: 'SteadFast courier', where: 'Courier Integration > Steadfast', path: '/vendor/courier/steadfast', keywords: 'steadfast stead fast connect api key secret book parcel স্টেডফাস্ট' },
  { title: 'RedX courier', where: 'Courier Integration > RedX', path: '/vendor/courier/redx', keywords: 'redx connect token book parcel রেডএক্স' },
  { title: 'Track a parcel', where: 'Courier Integration > Tracking', path: '/vendor/shipping/tracking', keywords: 'tracking consignment courier status where is my parcel' },

  // ------------------------------------------------------------------ Products & stock
  { title: 'Add a product', where: 'Product > Add Product', path: '/vendor/product/add', keywords: 'new product create item variants sizes colours ai generate পণ্য যোগ' },
  { title: 'Change prices of many products', where: 'Product > All Products', path: '/vendor/product/all', keywords: 'bulk price change increase decrease percent undo sale price dam bariye komano দাম পরিবর্তন' },
  { title: 'Import products from CSV', where: 'Product > All Products', path: '/vendor/product/all', keywords: 'bulk upload csv excel import products' },
  { title: 'Schedule a product to go live', where: 'Product > All Products', path: '/vendor/product/all', keywords: 'publish later schedule hide date time draft public' },
  { title: 'Stock history of a product', where: 'Product > Edit Product > Stock', path: '/vendor/product/all', keywords: 'stock movement log who changed received damaged count history' },
  { title: 'Categories', where: 'Product > Categories', path: '/vendor/product/categories', keywords: 'category sub category group products ক্যাটাগরি' },
  { title: 'Brands', where: 'Product > Brands', path: '/vendor/product/brands', keywords: 'brand logo ব্র্যান্ড' },
  { title: 'Collections', where: 'Product > Collections', path: '/vendor/product/collections', keywords: 'collection group featured set কালেকশন' },
  { title: 'Size guides', where: 'Product > Size Guides', path: '/vendor/product/size-guides', keywords: 'size chart measurement table সাইজ চার্ট' },
  { title: 'Low stock products', where: 'Product > Low Stock', path: '/vendor/product/low-stock', keywords: 'running out restock reorder কম স্টক' },
  { title: 'Words people also search a product by', where: 'Product > Edit Product', path: '/vendor/product/all', keywords: 'search keywords synonyms also found as hidden words searched but not found' },
  { title: 'Customer reviews', where: 'Reviews', path: '/vendor/reviews', keywords: 'review rating reply approve hide রিভিউ' },

  // ------------------------------------------------------------------ Marketing
  { title: 'Coupons', where: 'Marketing > Coupons', path: '/vendor/marketing/coupons', keywords: 'coupon code discount code promo voucher first order new customers only limit কুপন' },
  { title: 'Coupon: once per customer', where: 'Marketing > Coupons > Add / Edit coupon', path: '/vendor/marketing/coupons', keywords: 'coupon limit per customer one time use once each same phone times per customer reuse প্রতি কাস্টমার একবার' },
  { title: 'Discounts (automatic)', where: 'Marketing > Discounts', path: '/vendor/marketing/discounts', keywords: 'automatic discount percent off buy more minimum cart free shipping ডিসকাউন্ট ছাড়' },
  { title: 'Flash sale', where: 'Marketing > Flash Sale', path: '/vendor/marketing/flash-sale', keywords: 'countdown timer limited time sale offer ফ্ল্যাশ সেল' },
  { title: 'Gift cards', where: 'Marketing > Gift Cards', path: '/vendor/marketing/gift-cards', keywords: 'voucher balance store credit gift code গিফট কার্ড' },
  { title: 'Campaigns (product pages)', where: 'Marketing > Campaigns', path: '/vendor/marketing/campaigns', keywords: 'campaign offer page eid sale special prices ক্যাম্পেইন' },
  { title: 'Popups and messages on the store', where: 'Marketing > Campaigns > Popups', path: '/vendor/marketing/campaigns', keywords: 'popup dialog toast announcement offer pop up modal পপআপ' },

  // ------------------------------------------------------------------ SMS
  { title: 'Buy SMS credits', where: 'SMS', path: '/vendor/sms', keywords: 'sms balance recharge top up package credits এসএমএস কিনুন' },
  { title: 'Send an SMS to customers', where: 'SMS > Send to customers', path: '/vendor/sms', keywords: 'bulk sms offer marketing everyone vip returning win back schedule later audience tag' },
  { title: 'Sent SMS logs', where: 'SMS > Sent logs', path: '/vendor/sms', keywords: 'sms history delivered failed log' },
  { title: 'Send a test SMS', where: 'SMS > Test', path: '/vendor/sms', keywords: 'test sms check sender' },
  { title: 'Reminder SMS for abandoned checkouts', where: 'Orders > Abandoned Cart', path: '/vendor/orders?tab=abandoned-cart', keywords: 'abandoned reminder sms wait hours automatic' },

  // ------------------------------------------------------------------ Customers
  { title: 'Customer groups (New, Returning, VIP, Sleeping)', where: 'Customers > Group settings', path: '/vendor/customers', keywords: 'vip returning sleeping new segment loyalty best customers limit orders spent days inactive কাস্টমার গ্রুপ' },
  { title: 'Blacklist a customer', where: 'Customers', path: '/vendor/customers', keywords: 'block fake blacklisted number ban ব্ল্যাকলিস্ট' },
  { title: 'Customer tags and notes', where: 'Customers', path: '/vendor/customers', keywords: 'tag label note wholesale vip remark' },
  { title: 'Customers who owe money (due / baki)', where: 'Customers', path: '/vendor/customers', keywords: 'due baki credit owed pos balance বাকি' },
  { title: 'Export customers to CSV', where: 'Customers', path: '/vendor/customers', keywords: 'download excel export list' },
  { title: 'Import customers', where: 'Customers', path: '/vendor/customers/bulk-upload', keywords: 'bulk upload csv add many customers' },

  // ------------------------------------------------------------------ Analytics & finance
  { title: 'Sales and profit report', where: 'Analytics > Sales', path: '/vendor/analytics?tab=sales', keywords: 'revenue profit margin expenses net sales daily লাভ বিক্রি' },
  { title: 'Why orders were cancelled or returned', where: 'Analytics > Orders', path: '/vendor/analytics?tab=orders', keywords: 'cancel reasons failed return rate team work confirm time who confirmed staff report delivery success' },
  { title: 'What shoppers searched for', where: 'Analytics > Products', path: '/vendor/analytics?tab=products', keywords: 'search terms not found keywords popular products best sellers' },
  { title: 'Marketing and coupon results', where: 'Analytics > Marketing', path: '/vendor/analytics?tab=marketing', keywords: 'coupon usage campaign traffic sources visits' },
  { title: 'Customer analytics', where: 'Analytics > Customers', path: '/vendor/analytics?tab=customers', keywords: 'repeat customers new customers lifetime value locations' },
  { title: 'Wallet balance and withdraw', where: 'Finance > Wallet / Withdraw', path: '/vendor/finance/wallet', keywords: 'balance cash out bkash bank payout money earnings withdraw request টাকা উত্তোলন' },
  { title: 'Transactions history', where: 'Finance > Transactions', path: '/vendor/finance/transactions', keywords: 'ledger credit debit statement' },
  { title: 'Expenses', where: 'Finance > Expenses', path: '/vendor/finance/expenses', keywords: 'cost rent ads salary spending profit after expenses খরচ' },
  { title: 'Platform fees summary', where: 'Finance > Fee Summary', path: '/vendor/finance/fee-summary', keywords: 'charges fees deducted commission' },

  // ------------------------------------------------------------------ Notifications, account, plan
  { title: 'Phone push notifications', where: 'Notifications > Alert settings', path: NOTIF, keywords: 'push notification phone browser new order alert home screen install নোটিফিকেশন' },
  { title: 'Telegram alerts and /confirm bot', where: 'Notifications > Alert settings', path: NOTIF, keywords: 'telegram bot connect group chat alerts confirm order টেলিগ্রাম' },
  { title: 'Daily summary at night', where: 'Notifications > Alert settings', path: NOTIF, keywords: 'daily report summary sales evening hour' },
  { title: 'Text me when a new order comes (SMS alerts)', where: 'Notifications > Alert settings', path: NOTIF, keywords: 'sms alert new order text owner phone quiet hours low stock plan ending' },
  { title: 'Notification sound and desktop pop-up', where: 'Notifications > Alert settings', path: NOTIF, keywords: 'sound ring bell desktop popup this device' },
  { title: 'Store name, URL and address', where: 'Settings', path: '/vendor/settings', keywords: 'store details subdomain rename shop name address দোকানের নাম' },
  { title: 'Change password', where: 'Settings', path: '/vendor/settings', keywords: 'password reset change login security পাসওয়ার্ড' },
  { title: 'Your profile', where: 'Profile', path: '/vendor/profile', keywords: 'my profile photo name email phone account' },
  { title: 'Plan, upgrade and invoices', where: 'Billing', path: '/vendor/billing', keywords: 'subscription upgrade renew advance starter basic free plan limits usage pay প্ল্যান' },
  { title: 'Staff and roles', where: 'Staff', path: '/vendor/staff', keywords: 'team member add staff role permission manager viewer password suspend ip স্টাফ' },
  { title: 'Support tickets', where: 'Support', path: '/vendor/support', keywords: 'help contact us problem complaint ticket সাপোর্ট সাহায্য' },
  { title: 'AI chat bot credits', where: 'AI & Automation > AI Chat Bot', path: '/vendor/ai-automation/ai-chat-bot', keywords: 'ai credits tokens buy store chatbot assistant ask ai চ্যাটবট' },

  // ------------------------------------------------------------------ LMS (lead management)
  { title: 'LMS: turn it on or off', where: 'LMS > Settings', path: `${LMS}#status`, keywords: 'lead management enable disable status' },
  { title: 'LMS: team and agents', where: 'LMS > Settings > Team', path: `${LMS}#team`, keywords: 'agent manager add call team members round robin daily cap' },
  { title: 'LMS: shifts and attendance', where: 'LMS > Settings > Attendance', path: `${LMS}#attendance`, keywords: 'shift on off duty clock in attendance' },
  { title: 'LMS: where leads come from', where: 'LMS > Settings > Sources', path: `${LMS}#sources`, keywords: 'sources cod orders abandoned landing page forms api auto capture' },
  { title: 'LMS: retry rules (no answer)', where: 'LMS > Settings > Retry rules', path: `${LMS}#retries`, keywords: 'no answer retry call again hours attempts follow up' },
  { title: 'LMS: stage names', where: 'LMS > Settings > Stages', path: `${LMS}#stages`, keywords: 'new trying in talks won lost rename pipeline' },
  { title: 'LMS: lost reasons', where: 'LMS > Settings > Lost reasons', path: `${LMS}#lost-reasons`, keywords: 'why lost reason list' },
  { title: 'LMS: message templates', where: 'LMS > Settings > Message templates', path: `${LMS}#templates`, keywords: 'sms whatsapp template canned reply' },
  { title: 'LMS: call script', where: 'LMS > Settings > Call script', path: `${LMS}#script`, keywords: 'script what to say agents' },
  { title: 'LMS: extra lead fields', where: 'LMS > Settings > Extra fields', path: `${LMS}#extra-fields`, keywords: 'custom fields lead form' },
  { title: 'LMS: automations', where: 'LMS > Settings > Automations', path: `${LMS}#automations`, keywords: 'automatic rules task sms webhook when' },
  { title: 'LMS: privacy and deleting a person', where: 'LMS > Settings > Privacy', path: `${LMS}#privacy`, keywords: 'erase delete leads data keep days' },
  { title: 'LMS: import leads', where: 'LMS > Leads > Import', path: '/vendor/lms/leads/import', keywords: 'upload csv excel leads' },
  { title: 'LMS: call desk', where: 'LMS > Call Desk', path: '/vendor/lms/desk', keywords: 'confirm cod orders calls queue phone' },
  { title: 'LMS: follow-up tasks', where: 'LMS > Tasks', path: '/vendor/lms/tasks', keywords: 'reminder callback due overdue today' },
  { title: 'LMS: reports', where: 'LMS > Reports', path: '/vendor/lms/reports', keywords: 'conversion agent performance calls' },

  // ------------------------------------------------------------------ POS (counter selling)
  { title: 'POS: receipt text and logo', where: 'POS > Settings > Receipt', path: POS, keywords: 'receipt header footer logo vat number print counter' },
  { title: 'POS: VAT and prices include VAT', where: 'POS > Settings', path: POS, keywords: 'vat tax percent included counter' },
  { title: 'POS: returns window', where: 'POS > Settings > Returns', path: POS, keywords: 'return days refund counter void' },
  { title: 'POS: cash and shift closing', where: 'POS > Settings > Cash', path: POS, keywords: 'cash drawer difference close shift float' },
  { title: 'POS: registers (counters)', where: 'POS > Registers', path: '/vendor/pos/registers', keywords: 'register counter till add' },
  { title: 'POS: cashiers and PIN', where: 'POS > Staff', path: '/vendor/pos/staff', keywords: 'cashier pin manager discount limit lock' },
  { title: 'POS: receipt printer, barcode scanner, cash drawer', where: 'POS > Hardware', path: '/vendor/pos/hardware', keywords: 'printer usb bluetooth scanner camera drawer escpos' },
  { title: 'POS: sales and returns list', where: 'POS > Sales', path: '/vendor/pos/sales', keywords: 'counter sales refund return exchange store credit' },
  { title: 'POS: shifts (sessions) and Z report', where: 'POS > Sessions', path: '/vendor/pos/sessions', keywords: 'shift z report x report close open cash' },
  { title: 'POS: reports', where: 'POS > Reports', path: '/vendor/pos/reports', keywords: 'counter sales report cashier tender' },
  { title: 'POS: open the counter', where: 'POS', path: '/vendor/pos/sell', keywords: 'sell now billing screen checkout counter walk in দোকানে বিক্রি' },
  { title: 'POS: customer display screen', where: 'POS', path: '/vendor/pos/display', keywords: 'second screen customer facing display' },
];
