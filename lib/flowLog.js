/**
 * Search `[Flow]` + tag. Stable tags (grep filters):
 * APP_BOOT_START, FIREBASE_INIT,
 * AUTH_START, AUTH_LISTENER_ATTACH, AUTH_USER_FOUND, AUTH_NO_USER,
 * PROFILE_GET_START, PROFILE_GET_SUCCESS, PROFILE_GET_FAILED,
 * PROFILE_LOAD_START, PROFILE_LOAD_SUCCESS, PROFILE_LOAD_FAILED, PROFILE_SAVE_*,
 * PROFILE_LISTENER_ATTACH, PROFILE_LISTENER_UNSUBSCRIBE,
 * ONBOARDING_GUARD_RUN, DASHBOARD_ROUTE, ONBOARDING_ROUTE, NAVIGATE_*,
 * LOADING_START, LOADING_END.
 */
export function flowLog(tag, detail) {
  if (detail !== undefined && detail !== null && detail !== '') {
    // eslint-disable-next-line no-console
    console.log('[Flow]', tag, detail);
  } else {
    // eslint-disable-next-line no-console
    console.log('[Flow]', tag);
  }
}
