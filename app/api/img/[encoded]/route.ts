import { decodeProxiedImageParam } from "@/lib/img-proxy/proxied-image-src";
import { validateRemoteImageUrl } from "@/lib/img-proxy/validate-remote-image-url";

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

// Align with next.config images.minimumCacheTTL (31 days) so Vercel
// Image Optimization does not re-transform stable deal art every day.
const CACHE_CONTROL =
  "public, max-age=2678400, s-maxage=2678400, stale-while-revalidate=604800";

function badRequest(message: string): Response {
  return new Response(message, { status: 400 });
}

function contentTypeAllowed(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const mime = header.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_TYPES.has(mime)) {
    return null;
  }
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

async function readBodyCapped(
  body: ReadableStream<Uint8Array>,
): Promise<Uint8Array | Response> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      return badRequest("image too large");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

async function fetchUpstreamImage(upstream: URL): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(upstream, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        "User-Agent": "BrokeGamerImageProxy/1.0",
      },
    });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  if (response.status >= 300 && response.status < 400) {
    return badRequest("redirects are not allowed");
  }
  if (!response.ok) {
    return new Response("upstream error", { status: 502 });
  }

  const contentType = contentTypeAllowed(response.headers.get("content-type"));
  if (!contentType) {
    return badRequest("unsupported content type");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (!Number.isFinite(length) || length > MAX_BYTES) {
      return badRequest("image too large");
    }
  }

  if (!response.body) {
    return new Response("empty body", { status: 502 });
  }

  const bodyOrError = await readBodyCapped(response.body);
  if (bodyOrError instanceof Response) {
    return bodyOrError;
  }

  // Copy into a real ArrayBuffer — TS lib DOM rejects Uint8Array<ArrayBufferLike> as BodyInit.
  const payload = new ArrayBuffer(bodyOrError.byteLength);
  new Uint8Array(payload).set(bodyOrError);

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ encoded: string }> },
): Promise<Response> {
  const { encoded } = await context.params;
  const raw = decodeProxiedImageParam(encoded);
  if (raw === null) {
    return badRequest("invalid image token");
  }

  const validated = await validateRemoteImageUrl(raw);
  if (!validated.ok) {
    return badRequest(`invalid image url (${validated.error})`);
  }

  return fetchUpstreamImage(validated.url);
}
