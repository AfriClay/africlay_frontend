import { delay } from '../utils/delay';

export const simulateNetwork = async <T>(value: T, errorChance = 0.02): Promise<T> => {
  await delay(500 + Math.floor(Math.random() * 300));
  if (Math.random() < errorChance) {
    throw new Error('Network request failed.');
  }
  return value;
};
