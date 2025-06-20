'use client';

import { useSearchParams as useNextSearchParams } from 'next/navigation';
import { createContext, useContext, ReactNode } from 'react';

const SearchParamsContext = createContext<URLSearchParams | null>(null);

export function SearchParamsProvider({ children }: { children: ReactNode }) {
  const searchParams = useNextSearchParams();
  
  return (
    <SearchParamsContext.Provider value={searchParams}>
      {children}
    </SearchParamsContext.Provider>
  );
}

export function useSearchParams() {
  const context = useContext(SearchParamsContext);
  if (context === null) {
    throw new Error('useSearchParams must be used within a SearchParamsProvider');
  }
  return context;
}
