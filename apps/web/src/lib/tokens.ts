import "server-only";

/**
 * Token generator for Àríyá guest RSVP invitations.
 * Generates cryptographically secure, unguessable Base62 tokens (>= 131 bits of entropy).
 * Uses rejection sampling to eliminate modulo bias (discards bytes >= 248 so % 62 is unbiased).
 */

const BASE62_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateToken(length: number = 22): string {
  if (length < 22) {
    throw new Error(
      "Token length must be at least 22 characters for >= 128 bits of entropy"
    );
  }

  let result = "";
  // 62 * 4 = 248. Bytes 0..247 map uniformly to 0..61. Bytes 248..255 are discarded.
  const batchSize = length * 2;
  const buffer = new Uint8Array(batchSize);

  while (result.length < length) {
    globalThis.crypto.getRandomValues(buffer);
    for (let i = 0; i < buffer.length && result.length < length; i++) {
      const byte = buffer[i];
      if (byte < 248) {
        result += BASE62_CHARS[byte % 62];
      }
    }
  }

  return result;
}
