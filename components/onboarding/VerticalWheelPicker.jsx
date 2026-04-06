import { useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

const ITEM_H = 52;
const PAD_ROWS = 2;

/**
 * Vertical scroll wheel (snap to row).
 * @param {object} props
 * @param {number[]} props.values ascending numbers
 * @param {number} props.value current selection (must exist in values)
 * @param {(n: number) => void} props.onChange
 * @param {string} [props.suffix] e.g. "yrs", "cm"
 */
export default function VerticalWheelPicker({ values, value, onChange, suffix }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const listRef = useRef(null);
  const selIndex = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const i = values.indexOf(value);
    if (i < 0 || !listRef.current) return;
    listRef.current.scrollToOffset({ offset: i * ITEM_H, animated: false });
  }, [value, values]);

  const onScrollEnd = useCallback(
    (e) => {
      const y = e.nativeEvent.contentOffset.y;
      const i = Math.round(y / ITEM_H);
      const clamped = Math.min(values.length - 1, Math.max(0, i));
      const next = values[clamped];
      if (next !== undefined && next !== value) onChange(next);
    },
    [values, value, onChange],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const d = Math.abs(values.indexOf(item) - selIndex);
      const opacity = d === 0 ? 1 : d === 1 ? 0.5 : d === 2 ? 0.28 : 0.12;
      const fontSize = d === 0 ? 32 : d === 1 ? 22 : 16;
      const isSel = item === value;
      return (
        <View style={[styles.row, { height: ITEM_H }]}>
          <View style={styles.rowInner}>
            <Text style={[styles.num, { fontSize, opacity: isSel ? 1 : opacity }]}>{item}</Text>
            {suffix ? (
              <Text style={[styles.suf, { opacity: isSel ? 0.55 : Math.max(0.2, opacity) }]}>
                {suffix}
              </Text>
            ) : null}
          </View>
        </View>
      );
    },
    [values, selIndex, value, suffix, styles],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.centerBar} pointerEvents="none" />
      <FlatList
        ref={listRef}
        data={values}
        keyExtractor={(n) => String(n)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: ITEM_H,
          offset: ITEM_H * index,
          index,
        })}
        contentContainerStyle={{ paddingVertical: ITEM_H * PAD_ROWS }}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        renderItem={renderItem}
      />
    </View>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    wrap: {
      height: ITEM_H * (1 + PAD_ROWS * 2),
      position: 'relative',
    },
    centerBar: {
      position: 'absolute',
      left: '6%',
      right: '6%',
      top: '50%',
      marginTop: -ITEM_H / 2,
      height: ITEM_H,
      borderRadius: 12,
      backgroundColor: Colors.border + '44',
      borderWidth: 1,
      borderColor: Colors.border,
      zIndex: 1,
    },
    row: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowInner: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    num: {
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    suf: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textTertiary,
    },
  });
