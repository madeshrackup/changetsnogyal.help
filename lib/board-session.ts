const COOKIE_NAME = "chan_board_session";

function getSecretMaterial(): string {
  const p = process.env.BOARD_PASSWORD;
  const extra = process.env.BOARD_AUTH_SECRET ?? "";
  if (!p && !extra) return "";
  return `${p ?? ""}::chan-love-board::${extra}`;
}

async function importHmacKey(): Promise<CryptoKey | null> {
  const material = getSecretMaterial();
  if (!material) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(material),
  );
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function bytesToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function isBoardAuthConfigured(): boolean {
  return Boolean(process.env.BOARD_PASSWORD?.length);
}

export { COOKIE_NAME };

export async function createSessionToken(): Promise<string | null> {
  const key = await importHmacKey();
  if (!key) return null;
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload = JSON.stringify({ exp });
  const raw = new TextEncoder().encode(payload);
  const data = bytesToBase64url(
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return `${data}.${bytesToBase64url(sig)}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const key = await importHmacKey();
  if (!key) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const data = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  let sig: ArrayBuffer;
  try {
    sig = base64urlToBytes(sigPart).buffer as ArrayBuffer;
  } catch {
    return false;
  }
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sig,
    new TextEncoder().encode(data),
  );
  if (!ok) return false;
  let payload: { exp?: number };
  try {
    const json = new TextDecoder().decode(base64urlToBytes(data));
    payload = JSON.parse(json) as { exp?: number };
  } catch {
    return false;
  }
  if (typeof payload.exp !== "number") return false;
  return payload.exp > Math.floor(Date.now() / 1000);
}
