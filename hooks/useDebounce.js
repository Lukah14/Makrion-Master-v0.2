import { useState, useCallback, useRef } from 'react';

/**
 * Debounces updates to a value (same pattern as Nutrition Food Search).
 * @param {string} initialValue
 * @param {number} [delay]
 * @returns {[string, (v: string) => void, (v: string) => void]}
 */
export function useDebounce(initialValue = '', delay = 300) {
  const [debounced, setDebounced] = useState(initialValue);
  const timer = useRef(null);
  const update = useCallback((v) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(v), delay);
  }, [delay]);
  /** Clears pending debounce and sets value immediately (logout / clear field). */
  const setDebouncedImmediate = useCallback((v) => {
    clearTimeout(timer.current);
    setDebounced(v);
  }, []);
  return [debounced, update, setDebouncedImmediate];
}
