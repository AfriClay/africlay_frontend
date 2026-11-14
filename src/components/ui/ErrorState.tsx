import React from 'react';
import { AppErrorPage, type ErrorKind } from './AppErrorPage';

export const ErrorState: React.FC<{ message: string; onRetry?: () => void; kind?: ErrorKind }> = ({ message, onRetry, kind = 'unavailable' }) => (
  <AppErrorPage kind={kind} title={kind === 'forbidden' ? 'Access required' : 'We could not load this'} message={message} onRetry={onRetry} />
);
