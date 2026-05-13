/**
 * UUID v4 generation for idempotency keys and request IDs
 * Simple implementation without external dependency
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a UUID v4 (random)
 * Used for idempotency keys, correlation IDs, etc.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Check if a string looks like a valid UUID
 */
export function isLikelyUUID(value: string | null | undefined): boolean {
  if (value == null || typeof value !== 'string') return false;
  return UUID_RE.test(value.trim());
}
