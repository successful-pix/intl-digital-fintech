export async function hashTransferPin(pin: string, userId: string) {
  const buf = new TextEncoder().encode(`${pin}${userId}`);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
