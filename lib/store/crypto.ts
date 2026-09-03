/**
 * Encryption at rest for user state. AES-256-GCM with a key from
 * DATA_ENCRYPTION_KEY (64 hex chars = 32 bytes). Without the key, state is
 * stored as plain JSON; with it, every put() is sealed and every get() opened.
 * Legacy plaintext rows still decode, so the key can be introduced later.
 *
 *   openssl rand -hex 32   # generate one
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc1:";

function key(): Buffer | null {
  const hex = process.env.DATA_ENCRYPTION_KEY;
  if (!hex) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("DATA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  return Buffer.from(hex, "hex");
}

export function seal(plain: string): string {
  const k = key();
  if (!k) return plain;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, body]).toString("base64");
}

export function open(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const k = key();
  if (!k) throw new Error("Stored data is encrypted but DATA_ENCRYPTION_KEY is not set");
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), body = raw.subarray(28);
  const d = createDecipheriv("aes-256-gcm", k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

export const encryptionEnabled = () => !!process.env.DATA_ENCRYPTION_KEY;
