import { createContext, useContext } from 'react';
import { useNutritionDate } from '@/context/NutritionDateContext';
import { useDomainStreaks } from '@/hooks/useDomainStreaks';

const DomainStreaksContext = createContext(null);

export function DomainStreaksProvider({ children }) {
  const { calendarRefreshKey } = useNutritionDate();
  const streaks = useDomainStreaks(calendarRefreshKey);

  return (
    <DomainStreaksContext.Provider value={streaks}>
      {children}
    </DomainStreaksContext.Provider>
  );
}

export function useDomainStreaksContext() {
  const ctx = useContext(DomainStreaksContext);
  if (!ctx) {
    throw new Error('useDomainStreaksContext must be used within DomainStreaksProvider');
  }
  return ctx;
}
