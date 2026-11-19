import { useEffect } from 'react';

const PROJECT_ID = 'zg9qfr6s13';
const PREVIOUS_CONSENT_KEY = 'africlay:clarity-consent:v1';
type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] };
type ClarityWindow = Window & { clarity?: Clarity };

const startClarity = () => {
  if (document.getElementById('africlay-clarity')) return;
  // Keep a visitor's earlier explicit rejection even though new visits have no prompt.
  try { if (window.localStorage.getItem(PREVIOUS_CONSENT_KEY) === 'declined') return; } catch { /* Storage may be disabled. */ }
  // Mask all visible content, including checkout, wallet, and operations pages.
  document.getElementById('root')?.setAttribute('data-clarity-mask', 'true');

  const clarityWindow = window as ClarityWindow;
  clarityWindow.clarity ??= Object.assign(((...args: unknown[]) => {
    const queue = clarityWindow.clarity?.q ?? [];
    queue.push(args);
    if (clarityWindow.clarity) clarityWindow.clarity.q = queue;
  }) as Clarity, { q: [] as unknown[][] });

  // No visitor has granted cookie or advertising storage consent here.
  clarityWindow.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
  const script = document.createElement('script');
  script.id = 'africlay-clarity';
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${PROJECT_ID}`;
  document.head.appendChild(script);
};

export const WebAnalytics = () => {
  useEffect(startClarity, []);
  return null;
};
