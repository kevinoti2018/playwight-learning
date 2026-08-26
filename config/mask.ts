
// Trade-off: an explicit allow-list of secret keys, rather than trying to
// pattern-match "anything that looks like a password." Explicit is safer —
// a regex-based guess can miss a secret or accidentally redact something
// harmless. Add new sensitive keys here as the schema grows.
const SECRET_KEYS = ['TEST_PWD'] as const;

export function maskSecrets<T extends Record<string, unknown>>(obj: T): T {
  const masked = { ...obj };
  for (const key of SECRET_KEYS) {
    if (key in masked) {
      (masked as Record<string, unknown>)[key] = '***';
    }
  }
  return masked;
}
