import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

const DAILY_VALUES = {
  fat: 78,
  saturatedFat: 20,
  cholesterol: 300,
  sodium: 2300,
  carbs: 275,
  fiber: 28,
  sugar: 50,
  protein: 50,
};

function getDV(value, nutrient) {
  if (value == null || !DAILY_VALUES[nutrient]) return null;
  return Math.round((value / DAILY_VALUES[nutrient]) * 100);
}

function NutrientRow({ label, value, unit, bold, dvPercent, indent }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <View style={[styles.row, indent && styles.rowIndent]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, bold && styles.rowLabelBold, indent && styles.rowLabelIndent]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, bold && styles.rowValueBold, indent && styles.rowValueIndent]}>
          {value}{unit}
        </Text>
      </View>
      {dvPercent != null && (
        <Text style={[styles.dvText, bold && styles.dvTextBold]}>{dvPercent}%</Text>
      )}
    </View>
  );
}

export default function NutritionFacts({ recipe }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  if (!recipe) return null;

  const nps = recipe.nutritionPerServing || {};
  const {
    calories = nps.kcal || nps.calories || 0,
    protein = nps.protein || 0,
    carbs = nps.carbs || 0,
    fat = nps.fat || 0,
    saturatedFat = 0, transFat = 0, polyunsaturatedFat, monounsaturatedFat,
    fiber = 0, sugar = 0, cholesterol = 0, sodium = 0, salt,
    servingSize, servings = 1,
  } = recipe;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nutrition Facts</Text>
      <View style={styles.thickDivider} />

      <View style={styles.servingRow}>
        <Text style={styles.servingLabel}>Serving Size</Text>
        <Text style={styles.servingValue}>{servingSize || '1 serving'}</Text>
      </View>
      {servings > 1 && (
        <Text style={styles.servingsPerContainer}>{servings} servings per recipe</Text>
      )}

      <View style={styles.thickDivider} />

      <View style={styles.calorieRow}>
        <Text style={styles.calorieLabel}>Calories</Text>
        <Text style={styles.calorieValue}>{calories}</Text>
      </View>

      <View style={styles.thickDivider} />

      <View style={styles.dvHeaderRow}>
        <Text style={styles.dvHeader}>% Daily Value*</Text>
      </View>

      <View style={styles.thinDivider} />
      <NutrientRow label="Total Fat" value={fat} unit="g" bold dvPercent={getDV(fat, 'fat')} />

      <View style={styles.thinDividerIndent} />
      <NutrientRow label="Saturated Fat" value={saturatedFat} unit="g" indent dvPercent={getDV(saturatedFat, 'saturatedFat')} />

      <View style={styles.thinDividerIndent} />
      <NutrientRow label="Trans Fat" value={transFat} unit="g" indent />

      {polyunsaturatedFat != null && (
        <>
          <View style={styles.thinDividerIndent} />
          <NutrientRow label="Polyunsaturated Fat" value={polyunsaturatedFat} unit="g" indent />
        </>
      )}

      {monounsaturatedFat != null && (
        <>
          <View style={styles.thinDividerIndent} />
          <NutrientRow label="Monounsaturated Fat" value={monounsaturatedFat} unit="g" indent />
        </>
      )}

      <View style={styles.thinDivider} />
      <NutrientRow label="Cholesterol" value={cholesterol} unit="mg" bold dvPercent={getDV(cholesterol, 'cholesterol')} />

      <View style={styles.thinDivider} />
      <NutrientRow label="Sodium" value={sodium} unit="mg" bold dvPercent={getDV(sodium, 'sodium')} />

      {salt != null && (
        <>
          <View style={styles.thinDivider} />
          <NutrientRow label="Salt" value={salt} unit="g" bold />
        </>
      )}

      <View style={styles.thinDivider} />
      <NutrientRow label="Total Carbohydrate" value={carbs} unit="g" bold dvPercent={getDV(carbs, 'carbs')} />

      <View style={styles.thinDividerIndent} />
      <NutrientRow label="Dietary Fiber" value={fiber} unit="g" indent dvPercent={getDV(fiber, 'fiber')} />

      <View style={styles.thinDividerIndent} />
      <NutrientRow label="Sugars" value={sugar} unit="g" indent dvPercent={getDV(sugar, 'sugar')} />

      <View style={styles.thinDivider} />
      <NutrientRow label="Protein" value={protein} unit="g" bold dvPercent={getDV(protein, 'protein')} />

      <View style={styles.thickDivider} />

      <Text style={styles.footnote}>
        * Percent Daily Values are based on a 2,000 calorie diet.
      </Text>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1A1A2E',
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: '#1A1A2E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  thickDivider: {
    height: 8,
    backgroundColor: '#1A1A2E',
    marginVertical: 4,
    borderRadius: 1,
  },
  thinDivider: {
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  thinDividerIndent: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },
  servingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  servingLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
  },
  servingValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#1A1A2E',
  },
  servingsPerContainer: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 8,
  },
  calorieLabel: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: '#1A1A2E',
  },
  calorieValue: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: '#1A1A2E',
    lineHeight: 40,
  },
  dvHeaderRow: {
    alignItems: 'flex-end',
    paddingVertical: 4,
  },
  dvHeader: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 0,
  },
  rowIndent: {
    paddingLeft: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#374151',
  },
  rowLabelBold: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
  },
  rowLabelIndent: {
    fontSize: 13,
    color: '#6B7280',
  },
  rowValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#374151',
  },
  rowValueBold: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
  },
  rowValueIndent: {
    fontSize: 13,
    color: '#6B7280',
  },
  dvText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#374151',
    minWidth: 36,
    textAlign: 'right',
  },
  dvTextBold: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
  },
  footnote: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    lineHeight: 16,
    marginTop: 4,
  },
});
