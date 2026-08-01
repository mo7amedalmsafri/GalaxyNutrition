import { createHash, timingSafeEqual } from "crypto";

/* The owner's key — the one secret behind the private dashboard.
 *
 * Derived from the service-role key instead of stored anywhere: no new env
 * var to configure, nothing extra to leak, and it rotates automatically the
 * day the service key rotates. Same scheme as the operator dashboard on the
 * owner's other platform, with its own salt so the two links never match.
 *
 * The comparison is constant-time and a wrong key renders a plain 404 — to
 * anyone probing, the page simply does not exist. */

export function ownerKey(): string | null {
  /* An explicit key wins. Vercel stores this project's secrets as
     sensitive/encrypted — unreadable even to the owner's own CLI — so a key
     DERIVED from the service secret could never be computed anywhere except
     inside a deployed function, and the owner could never be handed their
     own link. DIETAK_OWNER_KEY is random, set once, and known to the owner. */
  const explicit = process.env.DIETAK_OWNER_KEY;
  if (explicit && explicit.length >= 24) return explicit;

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHash("sha256").update(`${secret}::dietak-owner-v1`).digest("hex").slice(0, 48);
}

export function isOwnerKey(candidate: string | undefined | null): boolean {
  const real = ownerKey();
  if (!real || !candidate || candidate.length !== real.length) return false;
  try {
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(real));
  } catch {
    return false;
  }
}
