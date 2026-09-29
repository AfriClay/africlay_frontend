const normalizeToken = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8) || 'item';

export const slugifyProductName = (name: string): string => name
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 180);

export const productIdentifiers = (name: string, token: string): { slug: string; sku: string } => {
  const suffix = normalizeToken(token);
  const base = slugifyProductName(name) || 'product';
  return {
    slug: `${base}-${suffix}`.slice(0, 200),
    sku: `AF-${suffix.toUpperCase()}`,
  };
};
