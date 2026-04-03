import { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  StyleSheet, Pressable, Platform,
} from 'react-native';
import { X, Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

function round1(n) {
  return Math.round(n * 10) / 10;
}

export default function EditEntrySheet({ visible, entry, onSave, onClose }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);

  const [grams, setGrams] = useState(100);

  useEffect(() => {
    if (entry && visible) {
      setGrams(entry.grams || 100);
    }
  }, [entry?.id, visible]);

  if (!entry) return null;

  const per100g = entry.nutrientsSnapshot && entry.grams
    ? {
        kcal: (entry.nutrientsSnapshot.kcal / entry.grams) * 100,
        protein: (entry.nutrientsSnapshot.protein / entry.grams) * 100,
        carbs: (entry.nutrientsSnapshot.carbs / entry.grams) * 100,
        fat: (entry.nutrientsSnapshot.fat / entry.grams) * 100,
      }
    : { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const ratio = grams / 100;
  const nutrition = {
    kcal: Math.round(per100g.kcal * ratio),
    protein: round1(per100g.protein * ratio),
    carbs: round1(per100g.carbs * ratio),
    fat: round1(per100g.fat * ratio),
  };

  const handleSave = () => {
    onSave(entry.id, {
      grams,
      per100g: {
        kcal: per100g.kcal,
        protein: per100g.protein,
        carbs: per100g.carbs,
        fat: per100g.fat,
      },
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />

          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.foodName} numberOfLines={1}>
                {entry.nameSnapshot || 'Food'}
              </Text>
              {entry.brandSnapshot ? (
                <Text style={s.foodBrand}>{entry.brandSnapshot}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
              <X size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={s.section}>
            <Text style={s.label}>Amount (grams)</Text>
            <View style={s.amountControls}>
              <TouchableOpacity
                onPress={() => setGrams((g) => Math.max(1, g - 10))}
                style={s.qtyBtn}
                activeOpacity={0.7}
              >
                <Minus size={14} color={Colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={s.qtyInputWrap}>
                <TextInput
                  style={s.quantityInput}
                  value={String(grams)}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    if (Number.isFinite(n) && n >= 0) setGrams(n);
                    else if (t === '' || t === '0') setGrams(0);
                  }}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  selectionColor={Colors.textPrimary}
                />
                <Text style={s.qtyUnit}>g</Text>
              </View>
              <TouchableOpacity
                onPress={() => setGrams((g) => round1(g + 10))}
                style={s.qtyBtn}
                activeOpacity={0.7}
              >
                <Plus size={14} color={Colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.nutritionPreview}>
            <NutritionCol label="kcal" value={nutrition.kcal} />
            <View style={s.nutritionDivider} />
            <NutritionCol label="Protein" value={`${nutrition.protein}g`} color="#FF6B6B" />
            <View style={s.nutritionDivider} />
            <NutritionCol label="Carbs" value={`${nutrition.carbs}g`} color="#FFB84D" />
            <View style={s.nutritionDivider} />
            <NutritionCol label="Fat" value={`${nutrition.fat}g`} color="#5CB8FF" />
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={s.saveBtnText}>Update Entry</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NutritionCol({ label, value, color }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  return (
    <View style={s.nutritionItem}>
      <Text style={[s.nutritionVal, color && { color }]}>{value}</Text>
      <Text style={s.nutritionLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  foodName: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  foodBrand: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amountControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
  },
  qtyInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, height: 44,
    paddingHorizontal: 6,
    backgroundColor: Colors.background,
  },
  quantityInput: {
    flex: 1, fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    minWidth: 36, paddingVertical: 0,
  },
  qtyUnit: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    marginLeft: 2,
  },
  nutritionPreview: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  nutritionItem: { flex: 1, alignItems: 'center' },
  nutritionVal: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  nutritionLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  nutritionDivider: {
    width: 1,
    backgroundColor: Colors.border,
    height: '80%',
    alignSelf: 'center',
  },
  saveBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.onPrimary,
  },
});
