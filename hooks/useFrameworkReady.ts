import { useEffect } from 'react';
import { Platform } from 'react-native';

declare global {
  // eslint-disable-next-line no-var
  var frameworkReady: (() => void) | undefined;
}

/**
 * Web-only hook: signals to the host page (e.g. when running in StackBlitz / WebContainer)
 * that the React framework has finished mounting. On native (`Platform.OS !== 'web'`) the
 * `window` global does not exist, so we must short-circuit or release Android crashes
 * immediately on launch with `ReferenceError: window is not defined`.
 */
export function useFrameworkReady() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof globalThis !== 'undefined') {
      const w = globalThis as unknown as { frameworkReady?: () => void };
      if (typeof w.frameworkReady === 'function') {
        try {
          w.frameworkReady();
        } catch {
          /* noop — host hook is best-effort */
        }
      }
    }
  });
}
