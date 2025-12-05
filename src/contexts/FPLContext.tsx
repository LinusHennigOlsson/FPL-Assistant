import { createContext, useContext, ReactNode } from 'react';
import { useFPLData } from '@/hooks/useFPLData';
import { Player } from '@/data/mockPlayers';

interface FPLContextType {
  players: Player[];
  currentGameweek: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const FPLContext = createContext<FPLContextType | undefined>(undefined);

export function FPLProvider({ children }: { children: ReactNode }) {
  const fplData = useFPLData();

  return (
    <FPLContext.Provider value={fplData}>
      {children}
    </FPLContext.Provider>
  );
}

export function useFPL() {
  const context = useContext(FPLContext);
  if (context === undefined) {
    throw new Error('useFPL must be used within a FPLProvider');
  }
  return context;
}
