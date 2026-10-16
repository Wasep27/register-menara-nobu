export type Consent = { necessary: true; preferences: boolean; analytics: boolean; decided: boolean };
const KEY = "nobu-cookie-consent";
export const EVENT = "nobu-consent-change";

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as Consent) : null;
  } catch {
    return null;
  }
}

export function saveConsent(c: Omit<Consent, "necessary" | "decided">) {
  const full: Consent = { necessary: true, decided: true, ...c };
  localStorage.setItem(KEY, JSON.stringify(full));
  window.dispatchEvent(new Event(EVENT));
}
