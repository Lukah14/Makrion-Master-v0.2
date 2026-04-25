import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarTotalHeight } from '@/constants/tabBar';

/**
 * Shared layout helper for every screen that lives behind the bottom tab bar.
 *
 * Returns measurements that screens can plug directly into:
 *  - `tabBarHeight`         -> total visual height of the tab bar (incl. safe area).
 *  - `scrollPaddingBottom`  -> ScrollView/FlatList `contentContainerStyle.paddingBottom`
 *                              so the last item never hides behind the tab bar.
 *  - `floatingBottom`       -> `bottom` for absolutely-positioned overlays such as
 *                              FABs and sticky CTAs so they sit above the tab bar.
 *  - `insets`               -> raw safe-area insets in case a screen needs them
 *                              for other edges.
 *
 * The numbers stay in sync with `(tabs)/_layout.jsx`, which uses the same
 * `getTabBarTotalHeight` helper, so screens never need to hardcode magic numbers.
 */
export function useTabBarLayout() {
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const tabBarHeight = getTabBarTotalHeight(insets.bottom);
    return {
      insets,
      tabBarHeight,
      scrollPaddingBottom: tabBarHeight + 24,
      floatingBottom: tabBarHeight + 16,
    };
  }, [insets]);
}

export default useTabBarLayout;
