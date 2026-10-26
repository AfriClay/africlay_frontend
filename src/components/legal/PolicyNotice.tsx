import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomSheet } from '../ui/BottomSheet';
import { POLICY_NOTICE_VERSION } from '../../content/policies';

const noticeKey = `@africlay/policy-notice/${POLICY_NOTICE_VERSION}`;

export const PolicyNotice = ({ enabled, onReview }: { enabled: boolean; onReview: () => void }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }
    let active = true;
    void AsyncStorage.getItem(noticeKey)
      .then(value => { if (active && !value) setVisible(true); })
      .catch(() => { /* A notification preference must never block the marketplace. */ });
    return () => { active = false; };
  }, [enabled]);

  const dismiss = () => {
    setVisible(false);
    void AsyncStorage.setItem(noticeKey, 'dismissed').catch(() => {});
  };

  const review = () => {
    dismiss();
    onReview();
  };

  return <BottomSheet
    visible={visible}
    onClose={dismiss}
    title="Terms and policies are available"
    description="Review AfriClay's marketplace partner terms, shipping and delivery policy, and seller commission policy in one place."
    actionLabel="Review policies"
    onAction={review}
    secondaryActionLabel="Not now"
    onSecondaryAction={dismiss}
  />;
};
