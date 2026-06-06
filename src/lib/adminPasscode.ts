// Owner-only passcode check. Only the SHA-256 hex of the chosen passcode is
// embedded — the passcode itself never appears in this code or anywhere in
// the repository. SHA-256 is one-way, so even with full source access the
// passcode can't be recovered without a brute-force attack on a strong
// secret.
//
// To set/rotate: pick a passcode locally, compute its SHA-256 hex digest,
// and paste it into ADMIN_HASH. The zeroed placeholder below disables
// unlock until a real digest is set.
const ADMIN_HASH: string =
  "0849ca4e1828db9c7561d2ae7d04ea3c043677313ceb083f87e4d1452a840aa0";
const PLACEHOLDER =
  "0000000000000000000000000000000000000000000000000000000000000000";

export async function checkPasscode(input: string): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (ADMIN_HASH === PLACEHOLDER) return false;
  if (typeof crypto === "undefined" || !crypto.subtle) return false;
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(trimmed),
  );
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === ADMIN_HASH.toLowerCase();
}
