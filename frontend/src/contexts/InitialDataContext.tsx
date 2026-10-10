import { createContext, useContext } from 'react';

interface InitialDataContextValue {
  data: unknown;
}

export const InitialDataContext = createContext<InitialDataContextValue>({
  data: null,
});

export function useInitialData() {
  return useContext(InitialDataContext);
}
