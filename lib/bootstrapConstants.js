/** Single source of truth for startup timeouts (auth, profile, gate, absolute). */

export const AUTH_BOOT_FAILSAFE_MS = 6000;
/** After this, run getDoc recovery (may take several seconds of Target-ID retries on RN). */
export const PROFILE_BOOT_FAILSAFE_MS = 9000;
/** Log-only / secondary flags; navigation booting no longer depends on this (see _layout). */
export const GATE_BOOT_FAILSAFE_MS = 6000;
/** Last resort: spinner must never outlive this — allow time for profile getDoc recovery. */
export const ABSOLUTE_BOOT_FAILSAFE_MS = 14000;
