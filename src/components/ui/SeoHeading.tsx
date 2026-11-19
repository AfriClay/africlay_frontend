import React from 'react';
import { Platform } from 'react-native';

/** A real page heading for the web DOM without changing the marketplace layout. */
export const SeoHeading = ({ children }: { children: string }) => {
  if (Platform.OS !== 'web') return null;
  return React.createElement('h1', {
    style: {
      position: 'absolute',
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: 0,
    },
  }, children);
};
