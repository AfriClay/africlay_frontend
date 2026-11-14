export const priceUnitSuffix = (unit?: string): string => {
  const label = unit?.trim();
  if (!label) return '';
  return /^per\b/i.test(label) ? ` ${label}` : ` per ${label}`;
};
