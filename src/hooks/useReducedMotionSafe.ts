import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const useReducedMotionSafe = () => {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);
    return () => subscription.remove();
  }, []);

  return reduceMotionEnabled;
};
