import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Pressable,
  StyleSheet, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Plus, Pencil, Trash2, ArrowRightLeft } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/common/Card';
import EditEntrySheet from './EditEntrySheet';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
const MEAL_EMOJI = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍿',
};

export default function FoodLogSections({
  entries,
  summary,
  loading,
  error,
  onAddMeal,
  onEditEntry,
  onDeleteEntry,
  onMoveEntry,
}) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);

  const [menuEntry, setMenuEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [moveEntry, setMoveEntry] = useState(null);

  const mealGroups = {};
  for (const key of MEAL_ORDER) mealGroups[key] = [];
  for (const entry of entries) {
    const key = MEAL_ORDER.includes(entry.mealType) ? entry.mealType : 'snack';
    mealGroups[key].push(entry);
  }

  const mealSubtotals = summary?.mealSubtotals || {};

  const handleDelete = (entry) => {
    setMenuEntry(null);
    Alert.alert(
      'Delete Entry',
      `Remove "${entry.nameSnapshot}" from your food log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteEntry(entry.id),
        },
      ],
    );
  };

  const handleEditSave = (entryId, changes) => {
    onEditEntry(entryId, changes);
  };

  const handleMove = (entry, newMealType) => {
    setMoveEntry(null);
    onMoveEntry(entry.id, newMealType);
  };

  if (loading && (!entries || entries.length === 0)) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.centerText}>Loading food log…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centerBox}>
        <Text style={s.errorTitle}>Could not load food log</Text>
        <Text style={s.errorSub}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {MEAL_ORDER.map((mealKey) => {
        const items = mealGroups[mealKey];
        const subtotal = mealSubtotals[mealKey];
        const kcal = subtotal?.kcal ?? 0;

        return (
          <Card key={mealKey} style={s.mealCard}>
            <TouchableOpacity
              style={s.mealHeader}
              activeOpacity={0.7}
              onPress={() => onAddMeal(mealKey)}
            >
              <View style={s.mealHeaderLeft}>
                <Text style={s.mealEmoji}>{MEAL_EMOJI[mealKey]}</Text>
                <View>
                  <Text style={s.mealTitle}>{MEAL_LABELS[mealKey]}</Text>
                  {items.length > 0 && (
                    <Text style={s.mealSubtotal}>
                      {Math.round(kcal)} kcal · P {Math.round(subtotal?.protein ?? 0)}g · C {Math.round(subtotal?.carbs ?? 0)}g · F {Math.round(subtotal?.fat ?? 0)}g
                    </Text>
                  )}
                </View>
              </View>
              <View style={s.addMealBtn}>
                <Plus size={16} color={Colors.textPrimary} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            {items.length > 0 ? (
              <View style={s.entriesList}>
                {items.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={s.entryRow}
                    activeOpacity={0.65}
                    onLongPress={() => setMenuEntry(entry)}
                    onPress={() => setMenuEntry(entry)}
                  >
                    <View style={s.entryLeft}>
                      <Text style={s.entryName} numberOfLines={1}>
                        {entry.nameSnapshot || 'Food'}
                      </Text>
                      <Text style={s.entryDetail}>
                        {entry.grams ? `${entry.grams}g` : '—'}
                        {entry.brandSnapshot ? ` · ${entry.brandSnapshot}` : ''}
                      </Text>
                    </View>
                    <View style={s.entryRight}>
                      <Text style={s.entryCal}>
                        {entry.nutrientsSnapshot?.kcal ?? 0} cal
                      </Text>
                      <Text style={s.entryMacros}>
                        P {Math.round(entry.nutrientsSnapshot?.protein ?? 0)}g · C {Math.round(entry.nutrientsSnapshot?.carbs ?? 0)}g · F {Math.round(entry.nutrientsSnapshot?.fat ?? 0)}g
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                style={s.emptyMeal}
                activeOpacity={0.6}
                onPress={() => onAddMeal(mealKey)}
              >
                <Plus size={14} color={Colors.textTertiary} strokeWidth={2} />
                <Text style={s.emptyMealText}>
                  Add {MEAL_LABELS[mealKey]}
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        );
      })}

      {/* Entry options menu */}
      <Modal
        visible={!!menuEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuEntry(null)}
      >
        <Pressable style={s.menuOverlay} onPress={() => setMenuEntry(null)}>
          <Pressable style={s.menuSheet} onPress={() => {}}>
            <View style={s.menuHandle} />
            <Text style={s.menuTitle} numberOfLines={1}>
              {menuEntry?.nameSnapshot || 'Food'}
            </Text>
            <Text style={s.menuSubtitle}>
              {menuEntry?.grams ? `${menuEntry.grams}g` : ''} · {menuEntry?.nutrientsSnapshot?.kcal ?? 0} kcal
            </Text>

            <TouchableOpacity
              style={s.menuOption}
              activeOpacity={0.7}
              onPress={() => {
                setMenuEntry(null);
                setEditEntry(menuEntry);
              }}
            >
              <Pencil size={18} color={Colors.textPrimary} />
              <Text style={s.menuOptionText}>Edit Amount</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.menuOption}
              activeOpacity={0.7}
              onPress={() => {
                setMenuEntry(null);
                setMoveEntry(menuEntry);
              }}
            >
              <ArrowRightLeft size={18} color={Colors.textPrimary} />
              <Text style={s.menuOptionText}>Move to Another Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.menuOption, s.menuOptionDestructive]}
              activeOpacity={0.7}
              onPress={() => handleDelete(menuEntry)}
            >
              <Trash2 size={18} color="#E53935" />
              <Text style={[s.menuOptionText, { color: '#E53935' }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.menuCancel}
              activeOpacity={0.7}
              onPress={() => setMenuEntry(null)}
            >
              <Text style={s.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Move meal picker */}
      <Modal
        visible={!!moveEntry}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveEntry(null)}
      >
        <Pressable style={s.menuOverlay} onPress={() => setMoveEntry(null)}>
          <Pressable style={s.menuSheet} onPress={() => {}}>
            <View style={s.menuHandle} />
            <Text style={s.menuTitle}>Move to</Text>
            {MEAL_ORDER.filter((m) => m !== moveEntry?.mealType).map((m) => (
              <TouchableOpacity
                key={m}
                style={s.menuOption}
                activeOpacity={0.7}
                onPress={() => handleMove(moveEntry, m)}
              >
                <Text style={s.mealEmoji}>{MEAL_EMOJI[m]}</Text>
                <Text style={s.menuOptionText}>{MEAL_LABELS[m]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={s.menuCancel}
              activeOpacity={0.7}
              onPress={() => setMoveEntry(null)}
            >
              <Text style={s.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit entry sheet */}
      <EditEntrySheet
        visible={!!editEntry}
        entry={editEntry}
        onSave={handleEditSave}
        onClose={() => setEditEntry(null)}
      />
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { gap: 12 },
  mealCard: { padding: 0, overflow: 'hidden' },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mealEmoji: { fontSize: 24 },
  mealTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  mealSubtotal: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  addMealBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  entriesList: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider || Colors.border,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider || Colors.border,
  },
  entryLeft: { flex: 1, marginRight: 12 },
  entryName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  entryDetail: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  entryRight: { alignItems: 'flex-end' },
  entryCal: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  entryMacros: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  emptyMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.divider || Colors.border,
  },
  emptyMealText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  menuHandle: {
    width: 36, height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  menuTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.textTertiary,
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider || Colors.border,
  },
  menuOptionDestructive: {
    borderBottomWidth: 0,
  },
  menuOptionText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  menuCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: Colors.background,
  },
  menuCancelText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
});
