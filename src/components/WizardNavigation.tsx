'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { usePathname } from '@/i18n/routing';

const PreviousWizardPath = createContext<string | null>(null);

/** Kept only while the wizard layout is mounted; a fresh visit must offer recovery. */
export function WizardNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visit, setVisit] = useState({ current: pathname, previous: null as string | null });
  if (visit.current !== pathname) setVisit({ current: pathname, previous: visit.current });
  return (
    <PreviousWizardPath.Provider value={visit.previous}>{children}</PreviousWizardPath.Provider>
  );
}

export const usePreviousWizardPath = () => useContext(PreviousWizardPath);
