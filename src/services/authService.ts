import { currentUser } from '../mock/currentUser';
import { simulateNetwork } from './api';
import { delay } from '../utils/delay';
import { User } from '../types/user';

export interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  login: async (identifier: string, password: string): Promise<AuthResponse> => {
    if (!identifier || password.length < 6) {
      throw new Error('Invalid credentials');
    }
    const user: User = { ...currentUser };
    return simulateNetwork({ user, token: 'mock-session-token' }, 0);
  },

  register: async (name: string, identifier: string, password: string): Promise<AuthResponse> => {
    if (!name || !identifier || password.length < 6) {
      throw new Error('Invalid registration data');
    }
    const user: User = { ...currentUser, name };
    return simulateNetwork({ user, token: 'mock-session-token' }, 0);
  },

  verifyOtp: async (code: string): Promise<boolean> => {
    await delay(600);
    return code === '123456';
  },

  sendPasswordReset: async (identifier: string): Promise<boolean> => {
    await delay(600);
    return true;
  },
};
