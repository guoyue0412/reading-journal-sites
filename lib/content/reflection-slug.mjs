const versionSuffix = /^(?:[2-9]|[1-9]\d+)$/;

export function reflectionSlugSequence(slug, date) {
  if (slug === date) return 1;
  const prefix = `${date}-`;
  if (!slug.startsWith(prefix)) return null;
  const suffix = slug.slice(prefix.length);
  return versionSuffix.test(suffix) ? Number(suffix) : null;
}

export function isReflectionSlugForDate(slug, date) {
  return reflectionSlugSequence(slug, date) !== null;
}
