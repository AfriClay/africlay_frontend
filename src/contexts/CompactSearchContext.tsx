import { createContext, useContext } from 'react';

type CompactSearchContextValue = {
  open: () => void;
};

export const CompactSearchContext = createContext<CompactSearchContextValue | undefined>(undefined);

export const useCompactSearch = (): CompactSearchContextValue => {
  const context = useContext(CompactSearchContext);
  if (!context) throw new Error('useCompactSearch must be used within CompactSearchContext.Provider');
  return context;
};
