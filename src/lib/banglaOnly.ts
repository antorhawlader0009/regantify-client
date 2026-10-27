/**
 * Texts the store AI chat and voice call say for the store (assistant name, greeting, ready questions, the call's first
 * line) must be in Bangla: the AI answers in Bangla and the voice reads Bangla letters only. English letters (A-Z) are
 * refused; digits, Bangla, punctuation and emoji are fine. The server checks the same (store-settings/ai-assistant-look.ts).
 */
export function hasEnglishLetters(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

export const BANGLA_ONLY_MESSAGE = 'Write this in Bangla. English letters (A-Z) are not allowed here, because the AI speaks Bangla.';
