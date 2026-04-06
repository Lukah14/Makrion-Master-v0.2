/**
 * Dev-only logs for onboarding save + navigation (search console for "[Onboarding]").
 */
export function onboardingLog(...args) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[Onboarding]', ...args);
  }
}
