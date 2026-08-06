import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface SideMenuContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const SideMenuContext = createContext<SideMenuContextValue | undefined>(undefined);

export const SideMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [close, isOpen, open]);
  return <SideMenuContext.Provider value={value}>{children}</SideMenuContext.Provider>;
};

export const useSideMenu = (): SideMenuContextValue => {
  const context = useContext(SideMenuContext);
  if (!context) throw new Error('useSideMenu must be used within SideMenuProvider');
  return context;
};
