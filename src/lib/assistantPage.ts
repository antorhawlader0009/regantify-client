import { isNavGroup, navLinks, vendorNav } from './navConfig';
import type { AssistantField, AssistantFieldKind, AssistantFill, AssistantRoute } from './assistantApi';

/*
 * What the "Ask AI" panel can see of the dashboard page the seller has open:
 * its visible inputs (read before each question) and a way to type values
 * into them (after the seller presses Apply). It only fills fields; saving
 * the page is always the seller's own click. Password, file and secret-like
 * fields are never read or filled.
 */

const ID_ATTR = 'data-assistant-id';
const MAX_FIELDS = 60;
const SKIP_TYPES = new Set(['password', 'file', 'hidden', 'checkbox', 'radio', 'submit', 'button', 'reset', 'image', 'range', 'color', 'search']);
const KIND_BY_TYPE: Record<string, AssistantFieldKind> = { number: 'number', email: 'email', tel: 'tel', url: 'url', date: 'date' };
const SECRET = /pass|secret|token|api.?key|otp|\bpin\b|cvv|card|private|credential/i;

/** Dashboard pages the assistant may link to: the sidebar's own entries (not the LMS, which opens in its own tab). */
export function assistantRoutes(): AssistantRoute[] {
  const out: AssistantRoute[] = [];
  for (const s of vendorNav) {
    if (s.newWindow) continue;
    if (s.path) out.push({ path: s.path, label: s.label });
    for (const child of s.children ?? []) {
      const links = isNavGroup(child) ? child.children : navLinks([child]);
      for (const l of links) out.push({ path: l.path, label: `${s.label} > ${l.label}` });
    }
  }
  return out;
}

const clean = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').replace(/\*/g, '').trim();

function labelFor(el: HTMLElement): string {
  const aria = clean(el.getAttribute('aria-label'));
  if (aria) return aria.slice(0, 100);

  const labels = (el as HTMLInputElement).labels;
  if (labels?.length) return clean(labels[0].textContent).slice(0, 100);

  const wrapping = el.closest('label');
  if (wrapping) {
    const text = clean(wrapping.textContent);
    if (text) return text.slice(0, 100);
  }

  const placeholder = clean(el.getAttribute('placeholder'));
  if (placeholder) return placeholder.slice(0, 100);

  // Rich-text editors and custom inputs: the nearest label/heading in a surrounding box.
  let box: HTMLElement | null = el.parentElement;
  for (let depth = 0; box && depth < 5; depth++, box = box.parentElement) {
    const found = Array.from(box.querySelectorAll<HTMLElement>('label, legend, h2, h3, h4')).find((n) => !el.contains(n) && clean(n.textContent));
    if (found) return clean(found.textContent).slice(0, 100);
  }
  return clean(el.getAttribute('name') || el.id) || 'Field';
}

function isVisible(el: HTMLElement): boolean {
  if (!el.getClientRects().length) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

function pageRoot(): HTMLElement | null {
  return document.querySelector('main');
}

/** The open page's visible, editable fields. Tags each element so applyFills can find it again. */
export function collectPageFields(): AssistantField[] {
  const root = pageRoot();
  if (!root) return [];
  root.querySelectorAll(`[${ID_ATTR}]`).forEach((n) => n.removeAttribute(ID_ATTR));

  const fields: AssistantField[] = [];
  const nodes = root.querySelectorAll<HTMLElement>('input, textarea, select, [contenteditable="true"]');
  for (const el of Array.from(nodes)) {
    if (fields.length >= MAX_FIELDS) break;
    if (!isVisible(el)) continue;

    let kind: AssistantFieldKind;
    let value = '';
    let options: string[] | undefined;
    if (el instanceof HTMLInputElement) {
      const type = (el.type || 'text').toLowerCase();
      if (SKIP_TYPES.has(type) || el.disabled || el.readOnly) continue;
      kind = KIND_BY_TYPE[type] ?? 'text';
      value = el.value;
    } else if (el instanceof HTMLTextAreaElement) {
      if (el.disabled || el.readOnly) continue;
      kind = 'textarea';
      value = el.value;
    } else if (el instanceof HTMLSelectElement) {
      if (el.disabled) continue;
      kind = 'select';
      options = Array.from(el.options).filter((o) => o.value !== '' && clean(o.textContent)).map((o) => clean(o.textContent).slice(0, 80)).slice(0, 40);
      value = el.value ? clean(el.selectedOptions[0]?.textContent) : '';
    } else {
      kind = 'richtext';
      value = clean(el.innerText);
    }

    const label = labelFor(el);
    if (SECRET.test(label) || SECRET.test(el.getAttribute('name') ?? '')) continue;

    const id = `f${fields.length + 1}`;
    el.setAttribute(ID_ATTR, id);
    fields.push({ id, label, kind, value: value.slice(0, 300), ...(options ? { options } : {}) });
  }
  return fields;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  // React tracks the value itself; going through the prototype setter makes it see the change.
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLSelectElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillRichText(el: HTMLElement, value: string) {
  el.focus();
  document.execCommand('selectAll');
  const lines = value.split('\n');
  let ok = true;
  lines.forEach((line, i) => {
    if (i > 0) ok = document.execCommand('insertParagraph') && ok;
    if (line) ok = document.execCommand('insertText', false, line) && ok;
  });
  if (!ok) {
    el.textContent = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/** Types the values into the page. Returns how many fields were found and filled. */
export function applyFills(fills: AssistantFill[]): { applied: number; missing: number } {
  const root = pageRoot();
  let applied = 0;
  let missing = 0;
  for (const f of fills) {
    const el = root?.querySelector<HTMLElement>(`[${ID_ATTR}="${f.id}"]`);
    if (!el || !el.isConnected) {
      missing++;
      continue;
    }
    if (el instanceof HTMLSelectElement) {
      const option = Array.from(el.options).find((o) => clean(o.textContent).toLowerCase() === f.value.toLowerCase() || o.value.toLowerCase() === f.value.toLowerCase());
      if (!option) {
        missing++;
        continue;
      }
      setNativeValue(el, option.value);
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      setNativeValue(el, f.value);
    } else {
      fillRichText(el, f.value);
    }
    applied++;
  }
  return { applied, missing };
}
