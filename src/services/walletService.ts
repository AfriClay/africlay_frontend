import { simulateNetwork } from './api';

export const walletService = {
  fetchBalance: async (): Promise<{ balance: number; pending: number }> => {
    return simulateNetwork({ balance: 12500, pending: 1500 });
  },
};
