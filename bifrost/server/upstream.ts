/// <reference types="node" />
import { Readable } from "node:stream";
import type { Dispatcher } from "undici";

/** A backend response whose body hasn't been read */
export interface Upstream {
  status: number;
  headers: Headers;
  body: Readable;
}

// Per connection, so they aren't forwarded either way. undici also rejects some of them in requests.
const hopByHopHeaders = [
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "http2-settings",
  "te",
  "trailer",
];
const notForwardedRequestHeaders = new Set([...hopByHopHeaders, "host", "expect"]);

export async function requestUpstream(
  dispatcher: Dispatcher,
  request: {
    origin: URL;
    path: string;
    method: string;
    headers: Record<string, string>;
    body: ReadableStream<Uint8Array> | null;
    signal: AbortSignal;
  }
): Promise<Upstream> {
  const { statusCode, headers, body } = await dispatcher.request({
    origin: request.origin.origin,
    path: request.path,
    method: request.method as Dispatcher.HttpMethod,
    headers: request.headers,
    body: request.body && Readable.fromWeb(request.body as any),
    signal: request.signal,
  });
  return { status: statusCode, headers: toHeaders(headers), body };
}

export function forwardableRequestHeaders(headers: Headers): Record<string, string> {
  const forwarded: Record<string, string> = {};
  headers.forEach((value, name) => {
    if (!notForwardedRequestHeaders.has(name)) forwarded[name] = value;
  });
  return forwarded;
}

export function withoutHopByHopHeaders(headers: Headers, alsoRemove: readonly string[] = []): Headers {
  const result = new Headers(headers);
  for (const name of [...hopByHopHeaders, ...alsoRemove]) result.delete(name);
  return result;
}

/** Headers as a plain object, like Node.js and Fastify give them: lowercase names, Set-Cookie as an array */
export function headersToObject(headers: Headers): Record<string, string | string[]> {
  const object: Record<string, string | string[]> = {};
  headers.forEach((value, name) => {
    object[name] = value;
  });
  const setCookie = headers.getSetCookie();
  if (setCookie.length) object["set-cookie"] = setCookie;
  return object;
}

/** Throws away a backend response, reading its body so the keep-alive connection can be reused */
export function discardBody(body: Readable) {
  // Without a listener, an error here is an uncaught exception, e.g. destroy() on an unread undici body
  body.on("error", () => {});
  // undici's dump() reads up to 128 KiB, then closes the connection rather than downloading a large page
  const { dump } = body as Readable & { dump?: () => Promise<void> };
  if (dump) dump.call(body).catch(() => {});
  else body.resume();
}

function toHeaders(raw: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      headers.append(name, item);
    }
  }
  return headers;
}
