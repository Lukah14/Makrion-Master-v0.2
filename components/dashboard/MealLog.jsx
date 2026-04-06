import { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal, Pressable, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { Plus, Flame, Trash2, Pencil } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { num } from '@/lib/num';

const ICON_MORE = require('@/src/Icons/More.png');

function FoodRow({ item, onRemove, onEdit }) {
  const { colors: Colors } = useTheme();
  const s = createS(Colors);

  const cal = Math.round(num(item.calories));
  const p = Math.round(num(item.protein) * 10) / 10;
  const c = Math.round(num(item.carbs) * 10) / 10;
  const f = Math.round(num(item.fat) * 10) / 10;

  return (
    <View style={s.foodRow}>
      <View style={s.foodLeft}>
        <Text style={s.foodName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.foodAmount}>{item.amount ?? ''}</Text>
      </View>
      <View style={s.foodRight}>
        <View style={s.foodMacroRow}>
          <Text style={s.foodCalText}>{cal}</Text>
          <Text style={s.foodMacroText}>
            <Text style={s.pLabel}>P</Text>
            <Text style={s.pVal}>{p} </Text>
            <Text style={s.cLabel}>C</Text>
            <Text style={s.cVal}>{c} </Text>
            <Text style={s.fLabel}>F</Text>
            <Text style={s.fVal}>{f}</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={() => onEdit?.(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
          <Pencil size={13} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onRemove?.(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
          <Trash2 size={13} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MealOverflowMenu({
  visible, onClose, onAddFood, onClearMeal, mealName, mealHasItems,
}) {
  const { colors: Colors } = useTheme();
  const s = createS(Colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.menuOverlay} onPress={onClose}>
        <Pressable style={s.menuBox} onPress={() => {}}>
          <Text style={s.menuTitle}>{mealName || 'Meal'}</Text>
          <View style={s.menuDivider} />
          <TouchableOpacity style={s.menuItem} onPress={onAddFood} activeOpacity={0.7}>
            <Plus size={15} color={Colors.textPrimary} />
            <Text style={s.menuText}>Add food</Text>
          </TouchableOpacity>
          {mealHasItems ? (
            <>
              <View style={s.menuDivider} />
              <TouchableOpacity style={s.menuItem} onPress={onClearMeal} activeOpacity={0.7}>
                <Trash2 size={15} color="#FF5555" />
                <Text style={[s.menuText, { color: '#FF5555' }]}>Clear meal</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MealCard({ meal, onAddFood, onDeleteEntry, onEditEntry, onClearMeal }) {
  const { colors: Colors } = useTheme();
  const s = createS(Colors);
  const [menuVisible, setMenuVisible] = useState(false);
  const items = meal.items || [];

  const totalCal = items.reduce((a, i) => a + num(i.calories), 0);
  const protein = Math.round(items.reduce((a, i) => a + num(i.protein), 0) * 10) / 10;
  const carbs = Math.round(items.reduce((a, i) => a + num(i.carbs), 0) * 10) / 10;
  const fat = Math.round(items.reduce((a, i) => a + num(i.fat), 0) * 10) / 10;

  const confirmClear = () => {
    setMenuVisible(false);
    Alert.alert(
      'Clear meal',
      `Remove all items from ${meal.type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => onClearMeal?.(meal.id) },
      ],
    );
  };

  return (
    <View style={s.card}>
      <View style={s.cardInner}>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.mealTitle}>{meal.type}</Text>
            <View style={s.calRow}>
              <Flame size={13} color='#F5A623' />
              <Text style={s.calText}>{Math.round(totalCal)} kcal</Text>
              <Text style={s.dot}> • </Text>
              <Text style={s.macroInline}>
                <Text style={s.pLabel}>{protein}P</Text>
                <Text style={s.sep}> | </Text>
                <Text style={s.cLabel}>{carbs}C</Text>
                <Text style={s.sep}> | </Text>
                <Text style={s.fLabel}>{fat}F</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.dotsBtn}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image source={ICON_MORE} style={s.moreIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {items.length > 0 && (
          <View style={s.foodList}>
            {items.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <View style={s.foodDivider} />}
                <FoodRow item={item} onRemove={onDeleteEntry} onEdit={onEditEntry} />
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={s.addArea}
          onPress={() => onAddFood && onAddFood(meal)}
          activeOpacity={0.6}
        >
          <Plus size={22} color={Colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <MealOverflowMenu
        visible={menuVisible}
        mealName={meal.type}
        mealHasItems={items.length > 0}
        onClose={() => setMenuVisible(false)}
        onAddFood={() => { setMenuVisible(false); onAddFood && onAddFood(meal); }}
        onClearMeal={confirmClear}
      />
    </View>
  );
}

/**
 * @param {{
 *   meals: { id: string, type: string, emoji?: string, items: any[] }[],
 *   loading?: boolean,
 *   error?: string|null,
 *   onAddFood: (meal: { id: string }) => void,
 *   onDeleteEntry: (entryId: string) => void,
 *   onEditEntry: (item: any) => void,
 *   onClearMeal: (mealTypeKey: string) => void,
 * }} props
 */
export default function MealLog({
  meals,
  loading,
  error,
  onAddFood,
  onDeleteEntry,
  onEditEntry,
  onClearMeal,
}) {
  const { colors: Colors } = useTheme();
  const s = createS(Colors);

  if (loading) {
    return (
      <View style={s.stateBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.stateText}>Loading food log…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.stateBox}>
        <Text style={s.errorTitle}>Could not load food log</Text>
        <Text style={s.errorSub}>{error}</Text>
      </View>
    );
  }

  const anyItems = meals.some((m) => (m.items || []).length > 0);
  if (!anyItems) {
    return (
      <View style={s.container}>
        <Text style={s.emptyBanner}>No foods logged for this day. Add a meal below.</Text>
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            onAddFood={onAddFood}
            onDeleteEntry={onDeleteEntry}
            onEditEntry={onEditEntry}
            onClearMeal={onClearMeal}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={s.container}>
      {meals.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          onAddFood={onAddFood}
          onDeleteEntry={onDeleteEntry}
          onEditEntry={onEditEntry}
          onClearMeal={onClearMeal}
        />
      ))}
    </View>
  );
}

const createS = (Colors) => StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 8,
  },
  stateBox: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  errorTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  errorSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyBanner: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  card: {
    borderRadius: 24,
    backgroundColor: Colors.cardBackground,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardInner: {
    padding: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  mealTitle: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  dot: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  macroInline: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  sep: {
    color: Colors.textTertiary,
  },
  pLabel: { color: '#E05252' },
  cLabel: { color: '#D4900A' },
  fLabel: { color: '#3A85C8' },
  dotsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.innerCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  moreIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.textSecondary,
  },
  foodList: {
    backgroundColor: Colors.innerCard,
    borderRadius: 16,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  foodDivider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  foodLeft: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  foodAmount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  foodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  foodMacroRow: {
    alignItems: 'flex-end',
  },
  foodCalText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  foodMacroText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  pVal: { color: '#E05252' },
  cVal: { color: '#D4900A' },
  fVal: { color: '#3A85C8' },
  addArea: {
    backgroundColor: Colors.innerCard,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.innerBorder,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuBox: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  menuText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
});
