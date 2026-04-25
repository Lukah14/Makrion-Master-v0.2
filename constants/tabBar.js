import { Platform } from 'react-native';

/**
 * Single source of truth for the bottom tab bar geometry.
 *
 * Two pieces of vertical space combine to make the visible tab bar:
 *  - `TAB_BAR_CONTENT_HEIGHT` is the icon + label area (constant across devices).
 *  - The OS bottom inset reported by `react-native-safe-area-context` accounts
 *    for the iPhone home indicator and the Android gesture / 3-button nav bar.
 *    On Android with `edgeToEdgeEnabled: true` the system nav draws over our
 *    content, so we must add this inset ourselves.
 *
 * Screens reuse `getTabBarTotalHeight` to compute scroll padding and floating
 * button offsets so nothing ever sits underneath the system nav bar or the
 * tab bar itself.
 */
export const TAB_BAR_CONTENT_HEIGHT = 52;
export const TAB_BAR_TOP_PADDING = 8;

/** Minimum bottom padding for the tab bar even when the OS reports no inset
 *  (Android 3-button nav, small phones with no gesture area, some emulators). */
const MIN_TAB_BAR_BOTTOM_PADDING = Platform.OS === 'ios' ? 16 : 10;

export function getTabBarBottomPadding(bottomInset) {
  const safe = Number.isFinite(bottomInset) ? Math.max(0, bottomInset) : 0;
  return Math.max(safe, MIN_TAB_BAR_BOTTOM_PADDING);
}

export function getTabBarTotalHeight(bottomInset) {
  return TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + getTabBarBottomPadding(bottomInset);
}
