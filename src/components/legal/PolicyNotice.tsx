import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomSheet } from '../ui/BottomSheet';
import { POLICY_NOTICE_VERSION } from '../../content/policies';
import type { PolicyAudience } from '../../content/policies';

const noticeKey = `@africlay/policy-notice/${POLICY_NOTICE_VERSION}`;

export const PolicyNotice = ({ audience, enabled, onReview }: { audience?: PolicyAudience; enabled: boolean; onReview: (audience?: PolicyAudience) => void }) => {
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
    onReview(audience);
  };

  const description = audience === 'buyer'
    ? "Review AfriClay's Shipping & Delivery Policy for marketplace purchases."
    : audience === 'seller'
      ? "Review AfriClay's Partner General Terms and Seller Commission Policy."
      : 'Choose the buyer or seller policy collection that applies to how you use AfriClay.';

  return <BottomSheet
    visible={visible}
    onClose={dismiss}
    title="Terms and policies are available"
    description={description}
    actionLabel="Review policies"
    onAction={review}
    secondaryActionLabel="Not now"
    onSecondaryAction={dismiss}
  />;
};
