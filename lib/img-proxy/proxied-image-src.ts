/** Client-safe base64url (no Node Buffer — DealImage runs in the browser too). */
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(input, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);

  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  return Buffer.from(base64, "base64").toString("utf8");
}

/** Same-origin proxy src for next/image (path token, no query string). */
export function proxiedImageSrc(remoteUrl: string): string {
  return `/api/img/${toBase64Url(remoteUrl)}`;
}

export function decodeProxiedImageParam(encoded: string): string | null {
  try {
    const decoded = fromBase64Url(encoded);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}
