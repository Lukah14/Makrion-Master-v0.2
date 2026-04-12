import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/hooks/useUser';
import { validateMacroGrams } from '@/lib/settingsValidation';
import { kcalFromMacros } from '@/lib/healthProfile';
import { syncUserHealthGoals } from '@/services/userGoalSyncService';

const MACRO_MAX_G = 1000;

function clampMacroG(n) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return 0;
  return Math.min(MACRO_MAX_G, Math.max(0, x));
}

function readGoalsGrams(g) {
  const protein = Math.round(Number(g.protein ?? g.proteinGoal));
  const carbs = Math.round(Number(g.carbs ?? g.carbsGoal));
  const fat = Math.round(Number(g.fat ?? g.fatGoal));
  return {
    proteinG: Number.isFinite(protein) ? protein : 0,
    carbsG: Number.isFinite(carbs) ? carbs : 0,
    fatG: Number.isFinite(fat) ? fat : 0,
  };
}

export default function NutritionGoalsScreen() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const { user } = useAuth();
  const { userData, resolvedGoals } = useUser();

  const [proteinG, setProteinG] = useState(0);
  const [carbsG, setCarbsG] = useState(0);
  const [fatG, setFatG] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  const hydrateFromRemote = useCallback(() => {
    const g = resolvedGoals ?? userData?.goals ?? {};
    const { proteinG: p, carbsG: c, fatG: f } = readGoalsGrams(g);
    setProteinG(p);
    setCarbsG(c);
    setFatG(f);
    setEditingKey(null);
    setEditDraft('');
  }, [resolvedGoals, userData?.goals]);

  useFocusEffect(
    useCallback(() => {
      hydrateFromRemote();
      return () => {};
    }, [hydrateFromRemote]),
  );

  const gramsForKcal = useCallback(
    (key, g) => {
      if (editingKey !== key) return g;
      const cur = parseFloat(String(editDraft).replace(',', '.').trim());
      return clampMacroG(Number.isFinite(cur) ? cur : g);
    },
    [editingKey, editDraft],
  );

  const dailyKcal = kcalFromMacros(
    gramsForKcal('protein', proteinG),
    gramsForKcal('carbs', carbsG),
    gramsForKcal('fat', fatG),
  );

  const startEdit = useCallback(
    (key) => {
      const v = key === 'protein' ? proteinG : key === 'carbs' ? carbsG : fatG;
      setEditingKey(key);
      setEditDraft(String(v));
    },
    [proteinG, carbsG, fatG],
  );

  const commitEdit = useCallback(() => {
    const parsed = parseFloat(String(editDraft).replace(',', '.').trim());
    const next = clampMacroG(Number.isFinite(parsed) ? parsed : 0);
    if (editingKey === 'protein') setProteinG(next);
    else if (editingKey === 'carbs') setCarbsG(next);
    else if (editingKey === 'fat') setFatG(next);
    setEditingKey(null);
    setEditDraft('');
  }, [editDraft, editingKey]);

  const adjustMacro = useCallback(
    (key, step) => {
      if (editingKey === key) {
        const cur = parseFloat(String(editDraft).replace(',', '.').trim());
        const fallback = key === 'protein' ? proteinG : key === 'carbs' ? carbsG : fatG;
        const base = clampMacroG(Number.isFinite(cur) ? cur : fallback);
        setEditDraft(String(clampMacroG(base + step)));
        return;
      }
      if (key === 'protein') setProteinG((v) => clampMacroG(v + step));
      else if (key === 'carbs') setCarbsG((v) => clampMacroG(v + step));
      else setFatG((v) => clampMacroG(v + step));
    },
    [editingKey, editDraft, proteinG, carbsG, fatG],
  );

  const onSave = async () => {
    if (!user?.uid) {
      Alert.alert('Sign in', 'You need to be signed in to save.');
      return;
    }
    const vp = validateMacroGrams(String(proteinG));
    const vcb = validateMacroGrams(String(carbsG));
    const vf = validateMacroGrams(String(fatG));
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

    const kcal = kcalFromMacros(vp.value, vcb.value, vf.value);
    if (kcal < 400) {
      Alert.alert(
        'Calories too low',
        'These macros add up to fewer than 400 kcal per day. Increase at least one macro.',
      );
      return;
    }

    setSaving(true);
    try {
      await syncUserHealthGoals(user.uid, 'nutrition', {
        nutrition: {
          edited: 'macros',
          calories: kcal,
          proteinG: vp.value,
          carbsG: vcb.value,
          fatG: vf.value,
        },
      });
      hydrateFromRemote();
      Alert.alert('Saved', 'Your daily macro goals and calorie target were updated.');
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.hint}>
          Daily calories follow your macros (4 kcal/g protein & carbs, 9 kcal/g fat). Changes here sync to your profile
          and across the app after you save.
        </Text>

        <View style={s.kcalCard}>
          <Text style={s.kcalLabel}>Daily calorie target</Text>
          <Text style={s.kcalValue}>{dailyKcal.toLocaleString()} kcal</Text>
          <Text style={s.kcalSub}>From protein, carbs & fat</Text>
        </View>

        <MacroRow
          label="Protein"
          macroKey="protein"
          grams={proteinG}
          color={Colors.proteinRing}
          editingKey={editingKey}
          editDraft={editDraft}
          onEditDraft={setEditDraft}
          onStartEdit={startEdit}
          onCommitEdit={commitEdit}
          decrementDisabled={
            editingKey === 'protein'
              ? clampMacroG(parseFloat(String(editDraft).replace(',', '.')) || proteinG) <= 0
              : proteinG <= 0
          }
          onDecrement={() => adjustMacro('protein', -1)}
          onIncrement={() => adjustMacro('protein', 1)}
          Colors={Colors}
          s={s}
        />
        <MacroRow
          label="Carbs"
          macroKey="carbs"
          grams={carbsG}
          color={Colors.carbsRing}
          editingKey={editingKey}
          editDraft={editDraft}
          onEditDraft={setEditDraft}
          onStartEdit={startEdit}
          onCommitEdit={commitEdit}
          decrementDisabled={
            editingKey === 'carbs'
              ? clampMacroG(parseFloat(String(editDraft).replace(',', '.')) || carbsG) <= 0
              : carbsG <= 0
          }
          onDecrement={() => adjustMacro('carbs', -1)}
          onIncrement={() => adjustMacro('carbs', 1)}
          Colors={Colors}
          s={s}
        />
        <MacroRow
          label="Fat"
          macroKey="fat"
          grams={fatG}
          color={Colors.fatRing}
          editingKey={editingKey}
          editDraft={editDraft}
          onEditDraft={setEditDraft}
          onStartEdit={startEdit}
          onCommitEdit={commitEdit}
          decrementDisabled={
            editingKey === 'fat'
              ? clampMacroG(parseFloat(String(editDraft).replace(',', '.')) || fatG) <= 0
              : fatG <= 0
          }
          onDecrement={() => adjustMacro('fat', -1)}
          onIncrement={() => adjustMacro('fat', 1)}
          Colors={Colors}
          s={s}
        />

        <TouchableOpacity style={s.saveBtn} onPress={() => void onSave()} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={s.saveText}>Save to profile</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroRow({
  label,
  macroKey,
  grams,
  color,
  editingKey,
  editDraft,
  onEditDraft,
  onStartEdit,
  onCommitEdit,
  decrementDisabled,
  onDecrement,
  onIncrement,
  Colors,
  s,
}) {
  const active = editingKey === macroKey;
  return (
    <View style={s.macroRow}>
      <View style={s.macroRowTop}>
        <View style={[s.macroDot, { backgroundColor: color }]} />
        <Text style={s.macroName}>{label}</Text>
      </View>
      <View style={s.macroControls}>
        <TouchableOpacity
          style={s.stepBtn}
          onPress={onDecrement}
          disabled={decrementDisabled}
          activeOpacity={0.7}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Minus size={18} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        {active ? (
          <View style={s.valueEditWrap}>
            <TextInput
              style={s.valueInput}
              value={editDraft}
              onChangeText={onEditDraft}
              onBlur={() => onCommitEdit()}
              keyboardType="number-pad"
              selectTextOnFocus
              autoFocus
              placeholderTextColor={Colors.textTertiary}
              selectionColor={Colors.textPrimary}
            />
            <Text style={s.valueUnit}>g</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [s.valuePress, pressed && s.valuePressPressed]}
            onPress={() => onStartEdit(macroKey)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${label}, ${grams} grams`}
          >
            <Text style={s.valuePressText}>
              {grams}
              <Text style={s.valuePressUnit}> g</Text>
            </Text>
          </Pressable>
        )}

        <TouchableOpacity
          style={s.stepBtn}
          onPress={onIncrement}
          activeOpacity={0.7}
          accessibilityLabel={`Increase ${label}`}
        >
          <Plus size={18} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
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
      marginBottom: 18,
      lineHeight: 20,
    },
    kcalCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: Layout.borderRadius.lg,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingVertical: 18,
      paddingHorizontal: 16,
      marginBottom: 20,
      alignItems: 'center',
    },
    kcalLabel: {
      fontSize: 12,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    kcalValue: {
      fontSize: 28,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    kcalSub: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-Regular',
      color: Colors.textTertiary,
      marginTop: 4,
    },
    macroRow: {
      marginBottom: 18,
      backgroundColor: Colors.cardBackground,
      borderRadius: Layout.borderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    macroRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    macroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    macroName: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textPrimary,
    },
    macroControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    stepBtn: {
      width: 44,
      height: 44,
      borderRadius: Layout.borderRadius.md,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    valuePress: {
      flex: 1,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: Layout.borderRadius.md,
      backgroundColor: Colors.background,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    valuePressPressed: {
      opacity: 0.85,
    },
    valuePressText: {
      fontSize: 22,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    valuePressUnit: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textTertiary,
    },
    valueEditWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      borderRadius: Layout.borderRadius.md,
      borderWidth: 1,
      borderColor: Colors.textPrimary,
      backgroundColor: Colors.background,
      paddingHorizontal: 12,
    },
    valueInput: {
      flex: 1,
      fontSize: 22,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      textAlign: 'center',
      paddingVertical: 8,
      minWidth: 56,
    },
    valueUnit: {
      fontSize: 16,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
      marginLeft: 4,
    },
    saveBtn: {
      marginTop: 12,
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
