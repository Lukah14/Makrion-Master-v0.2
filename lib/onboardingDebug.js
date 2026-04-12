/**
 * Dev-only logs for onboarding save + navigation (search console for "[Onboarding]").
 */
export function onboardingLog(...args) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[Onboarding]', ...args);
  }
}

/**
 * Critical path (save + guard + navigate) — logs in all builds so release builds are diagnosable.
 */
export function onboardingFlowLog(...args) {
  // eslint-disable-next-line no-console
  console.log('[OnboardingFlow]', ...args);
}

/** App startup: auth + profile listener + navigation gate (always on). */
export function bootLog(...args) {
  // eslint-disable-next-line no-console
  console.log('[Bootstrap]', ...args);
}

/** Structured stage tag for tracing where startup paused (search "[Bootstrap]" + stage). */
export function bootStage(stage, detail) {
  // eslint-disable-next-line no-console
  console.log('[Bootstrap]', `stage:${stage}`, detail ?? '');
}
