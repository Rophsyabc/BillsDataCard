import { createContext, useContext, useState, useCallback } from 'react';

const KycContext = createContext();

export function KycProvider({ children }) {
  const [kycOpen, setKycOpen] = useState(false);

  const openKyc = useCallback(() => setKycOpen(true), []);
  const closeKyc = useCallback(() => setKycOpen(false), []);

  return (
    <KycContext.Provider value={{ kycOpen, openKyc, closeKyc }}>
      {children}
    </KycContext.Provider>
  );
}

export function useKyc() {
  return useContext(KycContext);
}
