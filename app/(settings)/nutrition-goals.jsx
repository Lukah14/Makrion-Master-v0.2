import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { useUser } from '@/hooks/useUser';
import { validateCalories, validateMacroGrams } from '@/lib/settingsValidation';

export default function NutritionGoalsScreen() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const { userData, patchUser } = useUser();

  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const g = userData?.goals || {};
    const c = g.calories ?? g.calorieTarget;
    setCalories(c != null && Number.isFinite(Number(c)) ? String(Math.round(Number(c))) : '');
    setProtein(g.protein != null ? String(g.protein) : '');
    setCarbs(g.carbs != null ? String(g.carbs) : '');
    setFat(g.fat != null ? String(g.fat) : '');
  }, [userData?.goals]);

  const onSave = async () => {
    const vc = validateCalories(calories);
    if (!vc.ok) {
      Alert.alert('Calories', vc.error);
      return;
    }
    const vp = validateMacroGrams(protein);
    const vcb = validateMacroGrams(carbs);
    const vf = validateMacroGrams(fat);
    if (!vp.ok) {
      Alert.alert('Protein', vp.error);
      return;
    }
    if (!vcb.ok) {
      Alert.alert('Carbs', vcb.error);
      return;
    }
    if (!vf.ok) {
      Alert.alert('Fat', vf.error);
      return;
    }

    const prevG = userData?.goals || {};
    setSaving(true);
    try {
      await patchUser(
        {
          goals: {
            ...prevG,
            calories: vc.value,
            calorieTarget: vc.value,
            protein: vp.value,
            carbs: vcb.value,
            fat: vf.value,
          },
        },
        {
          dailyCaloriesTarget: vc.value,
          proteinGoalG: vp.value,
          carbsGoalG: vcb.value,
          fatGoalG: vf.value,
        },
      );
      Alert.alert('Saved', 'Nutrition targets updated.');
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.hint}>Daily targets used on Nutrition and Home. Values are in kcal and grams.</Text>

        <Field label="Daily calories (kcal)" value={calories} onChangeText={setCalories} keyboardType="number-pad" Colors={Colors} s={s} />
        <Field label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" Colors={Colors} s={s} />
        <Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" Colors={Colors} s={s} />
        <Field label="Fat (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" Colors={Colors} s={s} />

        <TouchableOpacity style={s.saveBtn} onPress={() => void onSave()} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={s.saveText}>Save</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, keyboardType, Colors, s }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType || 'default'}
        selectionColor={Colors.textPrimary}
      />
    </View>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    scroll: { flex: 1 },
    content: { padding: Layout.screenPadding, paddingBottom: 32 },
    hint: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-Regular',
      color: Colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    field: { marginBottom: 14 },
    label: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Layout.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textPrimary,
      backgroundColor: Colors.cardBackground,
    },
    saveBtn: {
      marginTop: 20,
      backgroundColor: Colors.textPrimary,
      borderRadius: Layout.borderRadius.lg,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveText: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.onPrimary,
    },
  });
