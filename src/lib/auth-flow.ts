export type RegistrationDraft = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  currency: "USD" | "CAD" | "VND" | "BRL";
};

export const REGISTRATION_DRAFT_KEY = "international-digital-registration-draft";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function saveRegistrationDraft(draft: RegistrationDraft, storage: Pick<Storage, "setItem"> = localStorage) {
  storage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify({ ...draft, email: normalizeEmail(draft.email) }));
}

export function loadRegistrationDraft(storage: Pick<Storage, "getItem"> = localStorage): RegistrationDraft | null {
  const raw = storage.getItem(REGISTRATION_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RegistrationDraft;
    if (!parsed.email || !parsed.fullName || !parsed.password || !parsed.currency) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRegistrationDraft(storage: Pick<Storage, "removeItem"> = localStorage) {
  storage.removeItem(REGISTRATION_DRAFT_KEY);
}

export function resendCodeLabel(cooldown: number) {
  return cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't get it? Resend code";
}

export function shouldRedirectToDashboard(result: unknown): result is { access_token: string; refresh_token: string } {
  return !!result && typeof result === "object" && "access_token" in result && "refresh_token" in result && !!(result as { access_token?: string }).access_token;
}
