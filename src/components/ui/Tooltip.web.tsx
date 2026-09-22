import type { PropsWithChildren } from 'react';

export const Tooltip = ({ children, label }: PropsWithChildren<{ label: string }>) => (
  <div title={label} style={{ display: 'contents' }}>{children}</div>
);
