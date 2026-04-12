import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { flowLog } from '@/lib/flowLog';

const Ctx = createContext(null);

/**
 * Lets onboarding signal "save succeeded" before Firestore snapshot reaches the gate.
 * Uses a ref so NavigationGate sees success in the same tick as router.replace (state alone can lag one frame).
 */
export function OnboardingNavProvider({ children }) {
  const { user } = useAuth();
  const [savedThisSession, setSaved] = useState(false);
  /** Bumps on each successful save so NavigationGate effects always re-run (refs alone do not). */
  const [gateRevision, setGateRevision] = useState(0);
  const saveSucceededRef = useRef(false);

  useEffect(() => {
    setSaved(false);
    saveSucceededRef.current = false;
    setGateRevision(0);
  }, [user?.uid]);

  const notifyProfileSaved = useCallback(() => {
    flowLog('PROFILE_COMPLETE_FLAG_SET', { source: 'notifyProfileSaved', localLatch: true });
    saveSucceededRef.current = true;
    setSaved(true);
    setGateRevision((n) => n + 1);
  }, []);

  const clearSavedFlag = useCallback(() => {
    saveSucceededRef.current = false;
    setSaved(false);
  }, []);

  const value = useMemo(
    () => ({
      savedThisSession,
      gateRevision,
      saveSucceededRef,
      notifyProfileSaved,
      clearSavedFlag,
    }),
    [savedThisSession, gateRevision, notifyProfileSaved, clearSavedFlag],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboardingNav() {
  const x = useContext(Ctx);
  if (!x) {
    return {
      savedThisSession: false,
      gateRevision: 0,
      saveSucceededRef: { current: false },
      notifyProfileSaved: () => {},
      clearSavedFlag: () => {},
    };
  }
  return x;
}
