import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  Minus,
  Plus,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getCategoryIcon } from '@/components/recipes/foodCategoryIcons';
import {
  getServingDropdownOptions,
  defaultQuantityForServing,
  SYNTHETIC_GRAMS_ID,
} from '@/lib/servingUtils';
import { fetchFatSecretFoodSearchJson, mapFatSecretProxyFoodsToModels } from '@/lib/foodSearchApi';
import {
  buildCompareSlotResolved,
  computeCompareNutrition,
} from '@/lib/compareFoodUtils';

const ICON_VERSUS = require('@/src/Icons/Versus.png');

function round1(n) {
  return Math.round(n * 10) / 10;
}

function foodFingerprint(food) {
  return `${food?.source || 'unknown'}_${food?.id}`;
}

const COMPARE_TABS = ['All', 'My foods', 'Saved foods'];

/** Grouped macros: maps computeCompareNutrition keys; indent = under carbs/fat; showCue per spec (protein↑, kcal/fat/sugar↓). */
const MACRO_SECTION_ROWS = [
  { key: 'calories', label: 'Calories', unit: ' kcal', preferLower: true, format: (n) => String(Math.round(n)), indent: false, showCue: true },
  { key: 'protein', label: 'Protein', unit: ' g', preferLower: false, format: (n) => String(round1(n)), indent: false, showCue: true },
  { key: 'carbs', label: 'Carbs', unit: ' g', preferLower: true, format: (n) => String(round1(n)), indent: false, showCue: false },
  { key: 'fiber', label: 'Fiber', unit: ' g', preferLower: false, format: (n) => String(round1(n)), indent: true, showCue: false },
  { key: 'sugar', label: 'Sugar', unit: ' g', preferLower: true, format: (n) => String(round1(n)), indent: true, showCue: true },
  { key: 'fat', label: 'Fat', unit: ' g', preferLower: true, format: (n) => String(round1(n)), indent: false, showCue: true },
  { key: 'saturated_fat', label: 'Saturated fat', unit: ' g', preferLower: true, format: (n) => String(round1(n)), indent: true, showCue: true },
  { key: 'trans_fat', label: 'Trans fat', unit: ' g', preferLower: true, format: (n) => String(round1(n)), indent: true, showCue: true },
  { key: 'salt', label: 'Salt', unit: ' g (est.)', preferLower: true, format: (n) => String(round1(n)), indent: false, showCue: true },
];

function formatComparedPortion(slot) {
  const sel = slot.selectedServing;
  const q = slot.quantity;
  if (!sel) return '—';
  if (sel.id === SYNTHETIC_GRAMS_ID) {
    const g = round1(q);
    return `${g % 1 === 0 ? Math.round(g) : g} g`;
  }
  const desc = sel.description || 'serving';
  const u = q % 1 === 0 ? String(Math.round(q)) : String(round1(q));
  return `${u} × ${desc}`;
}

function ServingPickerModal({ servings, selectedId, onSelect, visible, onClose }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const options = getServingDropdownOptions(servings || []);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={() => {}}>
          <Text style={styles.pickerTitle}>Select serving</Text>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {options.map((s) => {
              const isSelected = s.id === selectedId;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                  onPress={() => {
                    onSelect(s);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextActive]}>
                    {s.displayLabel}
                  </Text>
                  {isSelected && <Check size={18} color={Colors.textPrimary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CompareTableHeader({ slots, colors }) {
  const styles = createStyles(colors);
  return (
    <View style={styles.compHeaderRow}>
      <Text style={styles.compHeaderLabel}> </Text>
      {slots.map((s, i) => (
        <Text key={s.key} style={styles.compHeaderCol} numberOfLines={2}>
          {i + 1}. {s.food.name}
        </Text>
      ))}
    </View>
  );
}

function ComparePortionRow({ values, colors }) {
  const styles = createStyles(colors);
  return (
    <View style={styles.compRow}>
      <Text style={styles.compLabel} numberOfLines={2}>Portion</Text>
      {values.map((v, i) => (
        <View key={i} style={styles.compCellPlain}>
          <Text style={styles.compValueSmall} numberOfLines={4}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function CompareNutrientRow({
  label, unit, values, preferLower, formatVal, colors, indent, showCue = true,
}) {
  const styles = createStyles(colors);
  const nums = values.map((v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null));
  const finite = nums.filter((n) => n != null);
  let bestIdx = -1;
  if (showCue && finite.length > 1) {
    const target = preferLower ? Math.min(...finite) : Math.max(...finite);
    bestIdx = nums.indexOf(target);
  }
  return (
    <View style={styles.compRow}>
      <Text style={[styles.compLabel, indent && styles.compLabelIndented]} numberOfLines={2}>
        {label}
        <Text style={styles.compUnit}>{unit}</Text>
      </Text>
      {nums.map((n, i) => {
        const isBest = showCue && i === bestIdx && bestIdx >= 0 && finite.length > 1;
        return (
          <View
            key={i}
            style={[styles.compCell, isBest && styles.compCellHighlight]}
          >
            <Text style={[styles.compValue, isBest && styles.compValueEmph]}>
              {n == null ? '—' : formatVal(n)}
            </Text>
            {isBest ? (
              <Text style={styles.compCue}>{preferLower ? '↓' : '↑'}</Text>
            ) : (
              <View style={styles.compCueSpacer} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function AddCompareFoodModal({
  visible,
  onClose,
  onPickFood,
  myFoodsModels,
  savedFoodsList,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { user, loading: authLoading } = useAuth();
  const [searchTab, setSearchTab] = useState('All');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [apiResults, setApiResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchApiError, setSearchApiError] = useState(null);
  const queryDebounceTimer = useRef(null);

  useEffect(() => {
    if (!visible) return;
    setSearchTab('All');
    setQuery('');
    setDebouncedQuery('');
    setApiResults([]);
    setSearchLoading(false);
    setSearchApiError(null);
    clearTimeout(queryDebounceTimer.current);
  }, [visible]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setQuery('');
      setDebouncedQuery('');
      setApiResults([]);
      setSearchApiError(null);
      setSearchLoading(false);
      clearTimeout(queryDebounceTimer.current);
    }
  }, [user?.uid, authLoading]);

  const handleQueryChange = (text) => {
    setQuery(text);
    clearTimeout(queryDebounceTimer.current);
    queryDebounceTimer.current = setTimeout(() => setDebouncedQuery(text), 350);
  };

  useEffect(() => {
    if (!visible) return undefined;
    if (authLoading) {
      return undefined;
    }
    if (!user?.uid) {
      setApiResults([]);
      setSearchLoading(false);
      setSearchApiError(null);
      return undefined;
    }
    if (searchTab !== 'All' || !debouncedQuery.trim()) {
      setApiResults([]);
      setSearchLoading(false);
      setSearchApiError(null);
      return undefined;
    }
    let cancelled = false;
    setSearchLoading(true);
    setSearchApiError(null);
    (async () => {
      try {
        const data = await fetchFatSecretFoodSearchJson(debouncedQuery.trim(), 0, 20);
        if (cancelled) return;
        setApiResults(mapFatSecretProxyFoodsToModels(data.foods));
      } catch (e) {
        if (!cancelled) {
          setApiResults([]);
          let msg = e?.message || "Couldn't load search results. Please try again.";
          if (user?.uid && /sign in to search foods/i.test(msg)) {
            msg = "Couldn't load search results. Please try again.";
          }
          setSearchApiError(msg);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, debouncedQuery, searchTab, user?.uid, authLoading]);

  const filteredLocalFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = searchTab === 'My foods' ? (myFoodsModels ?? []) : (savedFoodsList ?? []);
    if (!q) return pool;
    return pool.filter(
      (f) =>
        f.name?.toLowerCase().includes(q) ||
        (f.brand && f.brand.toLowerCase().includes(q)),
    );
  }, [query, searchTab, myFoodsModels, savedFoodsList]);

  const handleSelect = async (food) => {
    const ok = await onPickFood(food);
    if (ok) onClose();
  };

  const renderSearchResult = (food) => {
    const cat = getCategoryIcon(food.name);
    const servingLabel = food.servingText || food.serving || '1 serving';
    return (
      <TouchableOpacity
        key={`${foodFingerprint(food)}_${food.name}`}
        style={styles.searchHit}
        onPress={() => handleSelect(food)}
        activeOpacity={0.75}
      >
        <Image source={cat} style={styles.searchHitIcon} />
        <View style={styles.searchHitBody}>
          <Text style={styles.searchHitName} numberOfLines={1}>{food.name}</Text>
          <Text style={styles.searchHitMeta} numberOfLines={1}>
            {food.calories} kcal · {servingLabel}
          </Text>
          {food.brand ? <Text style={styles.searchHitBrand} numberOfLines={1}>{food.brand}</Text> : null}
        </View>
        <Text style={styles.searchHitAdd}>Add</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.addModalContainer}>
        <View style={styles.addModalHeader}>
          <Text style={styles.addModalTitle}>Add food to compare</Text>
          <TouchableOpacity onPress={onClose} style={styles.addModalClose} hitSlop={12} activeOpacity={0.7}>
            <X size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.addModalBody}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods, brands…"
              placeholderTextColor={Colors.textTertiary}
              value={query}
              onChangeText={handleQueryChange}
              returnKeyType="search"
              autoCorrect={false}
              selectionColor={Colors.textPrimary}
            />
            {query.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  clearTimeout(queryDebounceTimer.current);
                  setDebouncedQuery('');
                  setApiResults([]);
                  setSearchApiError(null);
                }}
                activeOpacity={0.7}
              >
                <X size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.tabsRow}>
            {COMPARE_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={styles.tabItem}
                onPress={() => setSearchTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, searchTab === tab && styles.tabTextActive]}>{tab}</Text>
                {searchTab === tab ? <View style={styles.tabUnderline} /> : null}
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.addModalScroll}
            contentContainerStyle={styles.addModalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {searchTab === 'All' && searchLoading ? (
              <View style={styles.searchLoadingRow}>
                <ActivityIndicator size="small" color={Colors.textPrimary} />
                <Text style={styles.searchLoadingText}>Searching…</Text>
              </View>
            ) : null}

            {searchTab === 'All' && searchApiError && debouncedQuery.trim() && !searchLoading ? (
              <Text style={styles.hintError}>{searchApiError}</Text>
            ) : null}

            {searchTab === 'All' && debouncedQuery.trim() && !searchLoading && !searchApiError && apiResults.length === 0 ? (
              <Text style={styles.hint}>No results. Try another keyword.</Text>
            ) : null}

            {(searchTab === 'All' ? apiResults : (filteredLocalFoods ?? [])).slice(0, 40).map((f) => renderSearchResult(f))}

            {searchTab !== 'All' && (filteredLocalFoods ?? []).length === 0 ? (
              <Text style={styles.hint}>
                {searchTab === 'My foods' ? 'No foods in My foods match your search.' : 'No saved foods match your search.'}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CompareSlotCard({
  slot,
  cardWidth,
  onRemove,
  onOpenPicker,
  onQuantityChange,
  onIncrement,
  onDecrement,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { food, servings = [], selectedServing, quantity } = slot || {};
  if (!food) return null;
  const icon = getCategoryIcon(food.name);
  const servingLabel = selectedServing?.displayLabel || food.servingText || 'Serving';
  const qtyUnit = selectedServing?.id === SYNTHETIC_GRAMS_ID ? 'g' : '';

  return (
    <View style={[styles.slotCard, { width: cardWidth }]}>
      <View style={styles.slotCardTop}>
        <Image source={icon} style={styles.slotIcon} />
        <TouchableOpacity
          style={styles.slotRemove}
          onPress={() => onRemove(slot.key)}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <X size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.slotName} numberOfLines={3}>{food.name}</Text>
      {food.brand ? <Text style={styles.slotBrand} numberOfLines={1}>{food.brand}</Text> : null}
      <Text style={styles.slotServingHint} numberOfLines={2}>{servingLabel}</Text>

      <Text style={styles.slotSectionLabel}>Amount</Text>
      <View style={styles.qtyRow}>
        <TouchableOpacity onPress={() => onDecrement(slot.key)} style={styles.qtyBtn} activeOpacity={0.7}>
          <Minus size={16} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.qtyInputWrap}>
          <TextInput
            style={styles.qtyInput}
            value={String(quantity)}
            onChangeText={(t) => {
              const n = parseFloat(t);
              if (Number.isFinite(n) && n >= 0) onQuantityChange(slot.key, n);
              else if (t === '' || t === '0') onQuantityChange(slot.key, 0);
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
            selectionColor={Colors.textPrimary}
          />
          {qtyUnit ? <Text style={styles.qtyUnit}>{qtyUnit}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => onIncrement(slot.key)} style={styles.qtyBtn} activeOpacity={0.7}>
          <Plus size={16} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {servings.length > 0 ? (
        <>
          <Text style={styles.slotSectionLabel}>Serving</Text>
          <TouchableOpacity
            style={styles.servingSelector}
            onPress={() => onOpenPicker(slot.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.servingSelectorText} numberOfLines={2}>{servingLabel}</Text>
            <ChevronDown size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.slotNoServing}>No serving data — search another item or check source.</Text>
      )}
    </View>
  );
}

export default function CompareFoodsScreen({
  initialFoods = [],
  onBack,
  myFoodsModels = [],
  savedFoodsList = [],
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const { width: winW } = useWindowDimensions();
  const cardWidth = Math.min(280, Math.max(200, winW * 0.72));

  const [slots, setSlots] = useState([]);
  const [initLoading, setInitLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [picker, setPicker] = useState({ visible: false, slotKey: null });
  const slotsRef = useRef([]);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  const compareTableMinWidth = useMemo(
    () => Math.max(winW - 32, 108 + slots.length * 112),
    [winW, slots.length],
  );

  const seedKey = useMemo(
    () => (initialFoods || []).map((f) => foodFingerprint(f)).join('|'),
    [initialFoods],
  );

  useEffect(() => {
    let cancelled = false;
    setInitLoading(true);
    (async () => {
      const list = initialFoods || [];
      const built = await Promise.all(list.map((f) => buildCompareSlotResolved({ ...f })));
      if (!cancelled) {
        setSlots(built);
        setInitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seedKey]);

  const patchSlot = useCallback((key, updater) => {
    setSlots((prev) => prev.map((s) => (s.key === key ? updater(s) : s)));
  }, []);

  const removeSlot = useCallback((key) => {
    setSlots((prev) => prev.filter((s) => s.key !== key));
    setPicker((p) => (p.slotKey === key ? { visible: false, slotKey: null } : p));
  }, []);

  /** @returns {Promise<boolean>} true if food was added */
  const tryAddFood = useCallback(async (food) => {
    const fp2 = foodFingerprint(food);
    if (slotsRef.current.some((s) => foodFingerprint(s.food) === fp2)) {
      Alert.alert('Already added', 'This food is already in the comparison.');
      return false;
    }
    if (slotsRef.current.length >= 3) {
      Alert.alert('Limit', 'You can compare up to 3 foods.');
      return false;
    }
    const slot = await buildCompareSlotResolved({ ...food });
    setSlots((prev) => {
      if (prev.some((s) => foodFingerprint(s.food) === fp2)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, slot];
    });
    return true;
  }, []);

  const openPicker = (slotKey) => setPicker({ visible: true, slotKey });
  const closePicker = () => setPicker({ visible: false, slotKey: null });

  const pickerSlot = slots.find((s) => s.key === picker.slotKey);

  const handleServingSelect = (serving) => {
    if (!picker.slotKey) return;
    patchSlot(picker.slotKey, (s) => ({
      ...s,
      selectedServing: serving,
      quantity:
        serving?.id === SYNTHETIC_GRAMS_ID
          ? 100
          : defaultQuantityForServing(serving),
    }));
  };

  const decrementQty = (key) => {
    patchSlot(key, (s) => {
      const step = 1;
      const min = 1;
      return { ...s, quantity: Math.max(min, round1(s.quantity - step)) };
    });
  };

  const incrementQty = (key) => {
    patchSlot(key, (s) => ({ ...s, quantity: round1(s.quantity + 1) }));
  };

  const nutritionList = useMemo(
    () =>
      slots.map((s) =>
        computeCompareNutrition(s.selectedServing, s.quantity),
      ),
    [slots],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Image
            source={ICON_VERSUS}
            style={[styles.headerVersusIcon, { tintColor: Colors.textPrimary }]}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Compare Foods</Text>
        </View>
        {slots.length < 3 ? (
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Add food to compare"
          >
            <Plus size={24} color={Colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={styles.sectionHeading}>Compared items</Text>
        <Text style={styles.compareSub}>
          Tap + to search and add foods (up to 3). Remove an item to replace it with another.
        </Text>
        {initLoading ? (
          <View style={styles.initLoading}>
            <ActivityIndicator color={Colors.textPrimary} />
            <Text style={styles.initLoadingText}>Loading foods…</Text>
          </View>
        ) : slots.length === 0 ? (
          <Text style={styles.hint}>No foods to compare. Tap + to add.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotsRow}
            nestedScrollEnabled
          >
            {slots.map((slot) => (
              <CompareSlotCard
                key={slot.key}
                slot={slot}
                cardWidth={cardWidth}
                onRemove={removeSlot}
                onOpenPicker={openPicker}
                onQuantityChange={(key, q) => patchSlot(key, (s) => ({ ...s, quantity: q }))}
                onIncrement={incrementQty}
                onDecrement={decrementQty}
              />
            ))}
          </ScrollView>
        )}

        {!initLoading && slots.length > 0 ? (
          <>
            <Text style={[styles.sectionHeading, { marginTop: 24 }]}>Serving size</Text>
            <Text style={styles.compareSub}>
              Portion shown matches each card’s amount and serving type. Default is 100 g when gram data exists.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              style={styles.compTableScroll}
            >
              <View style={[styles.compTable, { minWidth: compareTableMinWidth }]}>
                <CompareTableHeader slots={slots} colors={Colors} />
                <ComparePortionRow
                  values={slots.map(formatComparedPortion)}
                  colors={Colors}
                />
              </View>
            </ScrollView>

            <Text style={[styles.sectionHeading, { marginTop: 24 }]}>Calories & macros</Text>
            <Text style={styles.compareSub}>
              Salt is estimated from sodium (typical conversion). Values update live when you change amount or serving.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              style={styles.compTableScroll}
            >
              <View style={[styles.compTable, { minWidth: compareTableMinWidth }]}>
                <CompareTableHeader slots={slots} colors={Colors} />
                {MACRO_SECTION_ROWS.map((row) => (
                  <CompareNutrientRow
                    key={row.key}
                    label={row.label}
                    unit={row.unit}
                    preferLower={row.preferLower}
                    formatVal={row.format}
                    values={nutritionList.map((n) => n[row.key])}
                    colors={Colors}
                    indent={row.indent}
                    showCue={row.showCue}
                  />
                ))}
              </View>
            </ScrollView>
          </>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AddCompareFoodModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onPickFood={tryAddFood}
        myFoodsModels={myFoodsModels}
        savedFoodsList={savedFoodsList}
      />

      {pickerSlot && picker.visible ? (
        <ServingPickerModal
          servings={pickerSlot.servings}
          selectedId={pickerSlot.selectedServing?.id}
          onSelect={handleServingSelect}
          visible={picker.visible}
          onClose={closePicker}
        />
      ) : null}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cardBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  headerVersusIcon: {
    width: 22,
    height: 22,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  headerSpacer: { width: 40 },
  headerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addModalContainer: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
  },
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addModalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  addModalClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addModalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  addModalScroll: { flex: 1 },
  addModalScrollContent: { paddingBottom: 32 },
  compLabelIndented: {
    paddingLeft: 10,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
  compCellPlain: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compValueSmall: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeading: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  compareSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginBottom: 14,
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 20,
  },
  tabItem: { paddingVertical: 8 },
  tabText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  tabUnderline: {
    marginTop: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.textPrimary,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchLoadingText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  hint: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginBottom: 12,
  },
  hintError: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.error,
    marginBottom: 12,
  },
  searchHit: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: 8,
    gap: 12,
  },
  searchHitIcon: { width: 36, height: 36, resizeMode: 'contain' },
  searchHitBody: { flex: 1, minWidth: 0 },
  searchHitName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  searchHitMeta: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  searchHitBrand: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  searchHitAdd: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  initLoading: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  initLoadingText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
    paddingRight: 8,
  },
  slotCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  slotCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  slotIcon: { width: 40, height: 40, resizeMode: 'contain' },
  slotRemove: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  slotName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  slotBrand: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginBottom: 6,
  },
  slotServingHint: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  slotSectionLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  qtyBtn: {
    width: 40,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
  },
  qtyInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 6,
    backgroundColor: Colors.cardBackground,
  },
  qtyInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    minWidth: 36,
    paddingVertical: 0,
  },
  qtyUnit: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
  },
  servingSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.cardBackground,
    gap: 6,
  },
  servingSelectorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  slotNoServing: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  compTableScroll: {
    marginBottom: 8,
  },
  compTable: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  compHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 6,
  },
  compHeaderLabel: {
    width: 100,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  compHeaderCol: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  compLabel: {
    width: 100,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    paddingRight: 6,
  },
  compUnit: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
  },
  compCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  compCellHighlight: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  compValueEmph: {
    fontFamily: 'PlusJakartaSans-Bold',
  },
  compCue: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textSecondary,
    marginLeft: 4,
    width: 12,
  },
  compCueSpacer: { width: 16 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    maxHeight: '55%',
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  pickerScroll: { flexGrow: 0 },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerOptionActive: { backgroundColor: Colors.background },
  pickerOptionText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
  pickerOptionTextActive: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
});
