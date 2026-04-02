import { View, Text, Image, StyleSheet } from 'react-native';
import ProgressRing from '@/components/common/ProgressRing';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';

const ICON_PROTEIN = require('@/src/Icons/Proteins.png');
const ICON_CARBS = require('@/src/Icons/Carbohydrates.png');
const ICON_FAT = require('@/src/Icons/Fats.png');

function MacroCard({ label, consumed, target, unit, color, icon }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const remaining = target - consumed;
  const progress = consumed / target;

  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>
        {remaining > 0 ? remaining : 0}
        <Text style={styles.unit}>{unit}</Text>
      </Text>
      <Text style={styles.label}>{label} left</Text>
      <View style={styles.ringContainer}>
        <ProgressRing
          radius={24}
          strokeWidth={5}
          progress={Math.min(progress, 1)}
          color={color}
          bgColor={Colors.border}
        >
          <Image source={icon} style={[styles.macroIcon, { tintColor: color }]} resizeMode="contain" />
        </ProgressRing>
      </View>
    </View>
  );
}

export default function MacroCards({ protein, carbs, fat }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={styles.container}>
      <MacroCard
        label="Protein"
        consumed={protein.consumed}
        target={protein.target}
        unit="g"
        color={Colors.proteinRing}
        icon={ICON_PROTEIN}
      />
      <MacroCard
        label="Carbs"
        consumed={carbs.consumed}
        target={carbs.target}
        unit="g"
        color={Colors.carbsRing}
        icon={ICON_CARBS}
      />
      <MacroCard
        label="Fat"
        consumed={fat.consumed}
        target={fat.target}
        unit="g"
        color={Colors.fatRing}
        icon={ICON_FAT}
      />
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 14,
    ...Layout.cardShadow,
  },
  value: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  unit: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  label: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
    marginBottom: 10,
  },
  ringContainer: {
    alignItems: 'flex-start',
  },
  macroIcon: {
    width: 18,
    height: 18,
  },
});
