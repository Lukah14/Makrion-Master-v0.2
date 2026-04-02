import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Defs, ClipPath, Path, LinearGradient, Stop, Rect, Ellipse, Line, G } from 'react-native-svg';
import { Droplets } from 'lucide-react-native';
import Card from '@/components/common/Card';
import { useTheme } from '@/context/ThemeContext';

function WaterGlass({ fillPercent, idx, strokeColor }) {
  const pct = Math.max(0, Math.min(100, fillPercent));

  const iTop = 17;
  const iBot = 72;
  const iH = iBot - iTop;

  const fillH = iH * pct / 100;
  const fillY = iBot - fillH;

  const stroke = strokeColor;
  const cid = `wgc${idx}`;
  const gid = `wgg${idx}`;

  return (
    <Svg width="32" height="43" viewBox="0 0 60 84" fill="none">
      <Defs>
        <ClipPath id={cid}>
          <Path d="M 9 17 L 14 72 Q 30 77 46 72 L 51 17 Q 30 21 9 17 Z" />
        </ClipPath>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#0369A1" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {pct > 0 && (
        <G clipPath={`url(#${cid})`}>
          <Rect x="0" y={fillY} width="60" height={fillH + 14} fill={`url(#${gid})`} />
          {pct < 97 && (
            <Ellipse cx="30" cy={fillY} rx="19" ry="2.2" fill="#BAE6FD" opacity="0.55" />
          )}
          <Rect
            x="13"
            y={Math.max(fillY + 5, iTop + 1)}
            width="4"
            height={Math.max(fillH - 12, 0)}
            rx="2"
            fill="white"
            opacity="0.18"
          />
        </G>
      )}

      <Line x1="5"  y1="11" x2="13" y2="74" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" />
      <Line x1="55" y1="11" x2="47" y2="74" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" />
      <Ellipse cx="30" cy="11" rx="25" ry="8"   stroke={stroke} strokeWidth="4.5" fill="none" />
      <Ellipse cx="30" cy="11" rx="20" ry="5.5" stroke={stroke} strokeWidth="2"   fill="none" opacity="0.45" />
      <Ellipse cx="30" cy="74" rx="17" ry="5"   stroke={stroke} strokeWidth="4.5" fill="none" />
    </Svg>
  );
}

export default function WaterTracker({ consumed, target }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [glasses, setGlasses] = useState(Math.round((consumed / target) * 6));
  const totalGlasses = 6;
  const currentL = ((glasses / totalGlasses) * target).toFixed(2);

  const addWater = (amount) => {
    const glassEquiv = Math.round((amount / 1000) / (target / totalGlasses));
    setGlasses(Math.max(0, Math.min(totalGlasses, glasses + glassEquiv)));
  };

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Droplets size={20} color={Colors.water} />
          <Text style={styles.title}>Water</Text>
        </View>
        <Text style={[styles.count, { color: Colors.primary }]}>
          {currentL}L / {target}L
        </Text>
      </View>

      <View style={styles.glassesRow}>
        {Array.from({ length: totalGlasses }).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setGlasses(i < glasses ? i : i + 1)}
            activeOpacity={0.7}
          >
            <WaterGlass fillPercent={i < glasses ? 100 : 0} idx={i} strokeColor={Colors.textPrimary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.waterButton, styles.waterButtonOutline]}
          onPress={() => addWater(-250)}
          activeOpacity={0.7}
        >
          <Text style={styles.waterButtonTextDark}>- 250</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.waterButton, styles.waterButtonTeal]}
          onPress={() => addWater(250)}
          activeOpacity={0.7}
        >
          <Text style={styles.waterButtonTextColor}>+250</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.waterButton, styles.waterButtonTeal]}
          onPress={() => addWater(500)}
          activeOpacity={0.7}
        >
          <Text style={styles.waterButtonTextColor}>+500</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.waterButton, styles.waterButtonTeal]}
          onPress={() => addWater(750)}
          activeOpacity={0.7}
        >
          <Text style={styles.waterButtonTextColor}>+750</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  count: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  glassesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  waterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterButtonOutline: {
    backgroundColor: Colors.background,
  },
  waterButtonTeal: {
    backgroundColor: Colors.primaryLight,
  },
  waterButtonTextDark: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  waterButtonTextColor: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
});
