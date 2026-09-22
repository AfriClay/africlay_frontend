import { z } from 'zod';

export class CommerceDataError extends Error {
  constructor() {
    super('The commerce response could not be read. Please try again.');
  }
}

export const parseCommerce = <T extends z.ZodTypeAny>(schema: T, raw: unknown): z.infer<T> => {
  const result = schema.safeParse(raw);
  if (!result.success) throw new CommerceDataError();
  return result.data;
};

export const parseCommerceList = <T extends z.ZodTypeAny>(schema: T, raw: unknown): z.infer<T>[] => {
  const values = Array.isArray(raw) ? raw :
    raw && typeof raw === 'object' && 'results' in raw ? (raw as { results: unknown }).results : undefined;
  return parseCommerce(z.array(schema), values);
};

export const parseAmount = (value: string | number): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new CommerceDataError();
  return amount;
};
