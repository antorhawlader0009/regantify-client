/*
 * Address check (TellMe idea 144). Plain rules, no AI and no Nest or Prisma import: does a delivery address give a rider something to find?
 * The same code lives in three places, kept in step by hand: here (the risk badge), storefront/src/lib/addressCheck.ts (the soft hint at
 * checkout) and client/src/lib/addressCheck.ts (the "Address incomplete?" mark in the Orders list). It only ever warns; nothing is refused.
 */
export type AddressProblem = 'SHORT' | 'AREA_ONLY' | 'NO_LANDMARK' | 'JUNK';

/** Words that point to a place: a road, a house, a village, a market, "near the mosque"... English (whole words) and Bangla (anywhere in the text). */
const EN_WORDS = [
  'road', 'rd', 'house', 'flat', 'floor', 'block', 'sector', 'lane', 'village', 'vill', 'para', 'bazar', 'bazaar', 'market', 'ghat', 'ward', 'union',
  'post', 'po', 'building', 'tower', 'plaza', 'mor', 'goli', 'near', 'opposite', 'beside', 'behind', 'mosque', 'school', 'college', 'madrasa',
  'hospital', 'office', 'shop', 'avenue', 'sarani', 'sarak', 'bari', 'basa', 'gram', 'mohalla', 'colony', 'station', 'stand', 'bridge', 'chowrasta',
  'cantonment', 'hall', 'campus', 'tola', 'mahalla', 'residential', 'apartment', 'complex', 'center', 'centre', 'bus', 'gate',
];
const BN_WORDS = [
  'রোড', 'রাস্তা', 'সড়ক', 'বাড়ি', 'বাড়ী', 'বাসা', 'ফ্ল্যাট', 'ফ্লাট', 'তলা', 'ব্লক', 'সেক্টর', 'লেন', 'গলি', 'গ্রাম', 'পাড়া', 'বাজার', 'মার্কেট',
  'ঘাট', 'ওয়ার্ড', 'ইউনিয়ন', 'পোস্ট', 'ডাকঘর', 'ভবন', 'টাওয়ার', 'প্লাজা', 'মোড়', 'কাছে', 'পাশে', 'সামনে', 'পেছনে', 'মসজিদ', 'স্কুল', 'কলেজ',
  'মাদ্রাসা', 'হাসপাতাল', 'অফিস', 'দোকান', 'কলোনি', 'মহল্লা', 'স্টেশন', 'স্ট্যান্ড', 'ব্রিজ', 'চৌরাস্তা', 'বিল্ডিং', 'সরণি', 'এভিনিউ', 'হাউস',
  'গেট', 'বিশ্ববিদ্যালয়', 'ক্যাম্পাস', 'আবাসিক', 'অ্যাপার্টমেন্ট',
];
const EN_RE = new RegExp(`(^|[^a-z])(${EN_WORDS.join('|')})([^a-z]|$)`);
const DIGIT = /[0-9০-৯]/;

const words = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * What is missing from this address, or null when it looks fine. `areas` are the district, thana or city already chosen next to it: an
 * address that only repeats them tells the rider nothing new. Order of checks: too short, only the area, junk, no place word.
 */
export function addressProblem(address: string | null | undefined, areas: Array<string | null | undefined> = []): AddressProblem | null {
  const text = (address ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null; // an empty address is the form's own error, not ours
  const lettersAndDigits = (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
  if (lettersAndDigits < 10) return 'SHORT';

  const w = words(text);
  const areaWords = new Set(areas.flatMap((a) => words(a ?? '')));
  if (w.length > 0 && areaWords.size > 0 && w.every((x) => areaWords.has(x))) return 'AREA_ONLY';

  const distinct = new Set(text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
  const counts = new Map<string, number>();
  for (const x of w) if (x.length >= 2) counts.set(x, (counts.get(x) ?? 0) + 1);
  if (distinct.size <= 3 || lettersAndDigits / text.length < 0.5 || [...counts.values()].some((n) => n >= 3)) return 'JUNK';

  if (text.length < 30 && !DIGIT.test(text)) {
    const lower = text.toLowerCase();
    if (!EN_RE.test(lower) && !BN_WORDS.some((b) => lower.includes(b))) return 'NO_LANDMARK';
  }
  return null;
}

export const ADDRESS_PROBLEM_TEXT: Record<AddressProblem, string> = {
  SHORT: 'The address is very short.',
  AREA_ONLY: 'The address only repeats the area name.',
  JUNK: 'The address looks like repeated or random text.',
  NO_LANDMARK: 'No house, road, village or landmark in the address.',
};
