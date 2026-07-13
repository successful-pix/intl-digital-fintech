import { describe, expect, it } from "vitest";
import {
  REGISTRATION_DRAFT_KEY,
  clearRegistrationDraft,
  loadRegistrationDraft,
  resendCodeLabel,
  saveRegistrationDraft,
  shouldRedirectToDashboard,
  type RegistrationDraft,
} from "./auth-flow";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    raw: values,
  };
}

describe("OTP registration flow helpers", () => {
  it("preserves all registration data before moving to verification", () => {
    const storage = memoryStorage();
    const draft: RegistrationDraft = {
      fullName: "Hoang Thi",
      email: " HoangThi3000@Gmail.com ",
      phone: "+1 555 0100",
      password: "secure-pass-123",
      currency: "CAD",
    };

    saveRegistrationDraft(draft, storage);

    expect(storage.raw.has(REGISTRATION_DRAFT_KEY)).toBe(true);
    expect(loadRegistrationDraft(storage)).toEqual({ ...draft, email: "hoangthi3000@gmail.com" });
  });

  it("supports resend countdown copy", () => {
    expect(resendCodeLabel(30)).toBe("Resend code in 30s");
    expect(resendCodeLabel(1)).toBe("Resend code in 1s");
    expect(resendCodeLabel(0)).toBe("Didn't get it? Resend code");
  });

  it("redirects to dashboard only after OTP returns a session", () => {
    expect(shouldRedirectToDashboard({ access_token: "token", refresh_token: "refresh" })).toBe(true);
    expect(shouldRedirectToDashboard({ ok: true })).toBe(false);
    expect(shouldRedirectToDashboard(null)).toBe(false);
  });

  it("clears preserved registration data after successful verification", () => {
    const storage = memoryStorage();
    saveRegistrationDraft({ fullName: "A", email: "a@example.com", phone: "", password: "password123", currency: "USD" }, storage);
    clearRegistrationDraft(storage);
    expect(loadRegistrationDraft(storage)).toBeNull();
  });
});
