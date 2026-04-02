import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, Image, Modal, ActivityIndicator,
} from 'react-native';
import { Search, SlidersHorizontal, X, Flame, Clock, Dumbbell, Plus, BookOpen, CircleCheck as CheckCircle2, Zap } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { exerciseDatabase, DIFFICULTY_COLORS, estimateCalories, userProfile } from '@/data/activityData';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const CATEGORIES = ['All', 'Strength', 'Cardio', 'HIIT', 'Mobility', 'Recovery'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Easy', 'Moderate', 'Hard'];

const FALLBACK_IMAGE = 'https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=400';

const CATEGORY_MAP = {
  'Strength': ['strength', 'weight', 'resistance', 'gym'],
  'Cardio': ['cardio', 'running', 'cycling', 'aerobic', 'walking'],
  'HIIT': ['hiit', 'interval', 'circuit'],
  'Mobility': ['yoga', 'stretch', 'flexibility', 'mobility', 'pilates'],
  'Recovery': ['recovery', 'foam', 'rest', 'cool'],
};

function inferCategory(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((kw) => text.includes(kw))) return cat;
  }
  return 'Strength';
}

function inferDifficulty(met) {
  if (!met || met < 3) return 'Easy';
  if (met < 6) return 'Beginner';
  if (met < 9) return 'Moderate';
  if (met < 12) return 'Intermediate';
  return 'Advanced';
}

function normalizeFatSecretExercise(ex) {
  const cat = inferCategory(ex.name, ex.description);
  const diff = inferDifficulty(ex.met);
  const calsPerMin = ex.met ? Math.round(ex.met * userProfile.weight / 60 * 10) / 10 : 5;
  return {
    id: `fs_${ex.id}`,
    name: ex.name,
    category: cat,
    muscleGroup: ex.category || 'Full Body',
    bodyPart: 'Full Body',
    equipment: 'See instructions',
    difficulty: diff,
    duration: 30,
    caloriesPerMin: calsPerMin,
    met: ex.met || 0,
    intensity: ex.met >= 9 ? 'Vigorous' : ex.met >= 6 ? 'Moderate' : 'Light',
    image: FALLBACK_IMAGE,
    description: ex.description || ex.name,
    instructions: ex.description ? [ex.description] : ['Follow standard form for this exercise.'],
    source: 'fatsecret',
  };
}

async function fetchFatSecretExercises(query) {
  const params = new URLSearchParams({ action: 'exercises', max_results: '50' });
  if (query.trim()) params.set('q', query.trim());
  const res = await fetch(`${SUPABASE_URL}/functions/v1/fatsecret-proxy?${params}`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch exercises');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return (data.exercises || []).map(normalizeFatSecretExercise);
}

function FilterChip({ label, active, onPress }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  return (
    <TouchableOpacity
      style={[s.filterChip, active && s.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterSection({ title, options, selected, onToggle }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  return (
    <View style={s.filterSection}>
      <Text style={s.filterSectionTitle}>{title}</Text>
      <View style={s.filterChipRow}>
        {options.map((opt) => (
          <FilterChip
            key={opt}
            label={opt}
            active={selected.includes(opt)}
            onPress={() => onToggle(opt)}
          />
        ))}
      </View>
    </View>
  );
}

function FilterSheet({ visible, onClose, filters, onFiltersChange }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const [local, setLocal] = useState(filters);

  const toggle = (key, val) => {
    setLocal((prev) => {
      const arr = prev[key] || [];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
      };
    });
  };

  const apply = () => { onFiltersChange(local); onClose(); };
  const reset = () => { const clear = { difficulty: [] }; setLocal(clear); onFiltersChange(clear); };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.sheetContainer}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Filter Exercises</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false}>
          <FilterSection title="Difficulty" options={DIFFICULTIES} selected={local.difficulty} onToggle={(v) => toggle('difficulty', v)} />
          <View style={{ height: 40 }} />
        </ScrollView>
        <View style={s.sheetFooter}>
          <TouchableOpacity style={s.resetBtn} onPress={reset} activeOpacity={0.7}>
            <Text style={s.resetBtnText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.applyBtn} onPress={apply} activeOpacity={0.8}>
            <Text style={s.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ExerciseDetailSheet({ exercise, visible, onClose, onAddToday }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  if (!exercise || !visible) return null;
  const cal = estimateCalories(exercise.caloriesPerMin, exercise.duration, userProfile);
  const diff = DIFFICULTY_COLORS[exercise.difficulty] || { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.sheetContainer}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{exercise.name}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false}>
          <Image source={{ uri: exercise.image }} style={s.detailImage} />
          <View style={s.detailMeta}>
            <View style={[s.badge, { backgroundColor: diff.bg }]}>
              <Text style={[s.badgeText, { color: diff.text }]}>{exercise.difficulty}</Text>
            </View>
            <View style={s.detailMetaItem}>
              <Clock size={13} color={Colors.textTertiary} />
              <Text style={s.detailMetaText}>{exercise.duration} min</Text>
            </View>
            <View style={s.detailMetaItem}>
              <Flame size={13} color={Colors.calories} />
              <Text style={s.detailMetaText}>~{cal} kcal</Text>
            </View>
            <View style={s.detailMetaItem}>
              <Dumbbell size={13} color={Colors.textTertiary} />
              <Text style={s.detailMetaText}>{exercise.equipment}</Text>
            </View>
            {exercise.source === 'fatsecret' && (
              <View style={s.sourceBadge}>
                <Text style={s.sourceBadgeText}>FatSecret</Text>
              </View>
            )}
          </View>

          <Text style={s.detailSectionLabel}>Description</Text>
          <Text style={s.detailDescription}>{exercise.description}</Text>

          <Text style={s.detailSectionLabel}>Muscles Worked</Text>
          <View style={s.tagRow}>
            <View style={s.muscleTag}><Text style={s.muscleTagText}>{exercise.muscleGroup}</Text></View>
            <View style={s.muscleTag}><Text style={s.muscleTagText}>{exercise.bodyPart}</Text></View>
          </View>

          <Text style={s.detailSectionLabel}>Instructions</Text>
          {exercise.instructions.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}

          <View style={s.calEstimate}>
            <Flame size={16} color={Colors.calories} />
            <Text style={s.calEstimateText}>Estimated: <Text style={{ color: Colors.calories, fontFamily: 'PlusJakartaSans-Bold' }}>{cal} kcal</Text></Text>
            <Text style={s.calEstimateSub}>Based on your profile</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
        <View style={s.sheetFooter}>
          <TouchableOpacity style={s.addTodayBtn} onPress={() => { onAddToday(exercise); onClose(); }} activeOpacity={0.8}>
            <Plus size={16} color={Colors.onPrimary} />
            <Text style={s.addTodayBtnText}>Add to Today</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ExerciseCard({ exercise, onView, onAddToday }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const diff = DIFFICULTY_COLORS[exercise.difficulty] || { bg: '#F3F4F6', text: '#6B7280' };
  const calsPerHr = Math.round((exercise.met || 0) * userProfile.weight);

  return (
    <TouchableOpacity style={s.exerciseCard} onPress={() => onView(exercise)} activeOpacity={0.88}>
      <Image source={{ uri: exercise.image }} style={s.exerciseThumb} />
      <View style={s.exerciseContent}>
        <Text style={s.exerciseName} numberOfLines={1}>{exercise.name}</Text>
        <View style={s.exerciseIntensityRow}>
          <Text style={s.exerciseIntensityLabel}>Intensity: </Text>
          <Text style={s.exerciseIntensityValue}>{exercise.intensity || '—'}</Text>
        </View>
        <View style={s.exerciseMetRow}>
          <Text style={s.exerciseMetLabel}>MET </Text>
          <Text style={s.exerciseMetValue}>{(exercise.met || 0).toFixed(1)}</Text>
        </View>
        <View style={s.exerciseCalRow}>
          <Flame size={12} color={Colors.calories} />
          <Text style={s.exerciseCalValue}>{calsPerHr}</Text>
          <Text style={s.exerciseCalUnit}> cals/hr</Text>
        </View>
        <View style={s.exerciseCardFooter}>
          <View style={[s.badge, { backgroundColor: diff.bg }]}>
            <Text style={[s.badgeText, { color: diff.text }]}>{exercise.difficulty}</Text>
          </View>
          <TouchableOpacity style={s.addExBtn} onPress={() => onAddToday(exercise)} activeOpacity={0.7}>
            <Plus size={12} color={Colors.onPrimary} />
            <Text style={s.addExBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ExercisePage({ onAddToday }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [filters, setFilters] = useState({ difficulty: [] });
  const [filterVisible, setFilterVisible] = useState(false);
  const [detailExercise, setDetailExercise] = useState(null);
  const [addedId, setAddedId] = useState(null);

  const [liveExercises, setLiveExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef(null);

  const loadExercises = useCallback(async (searchQuery) => {
    setLoading(true);
    setApiError(null);
    try {
      const results = await fetchFatSecretExercises(searchQuery);
      setLiveExercises(results);
      setHasSearched(true);
    } catch (err) {
      setApiError('Could not load exercises. Showing local results.');
      setLiveExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const isFirstMount = useRef(true);

  useEffect(() => {
    loadExercises('');
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadExercises(query);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const allExercises = useMemo(() => {
    const source = liveExercises.length > 0 ? liveExercises : exerciseDatabase;
    return source;
  }, [liveExercises]);

  const results = useMemo(() => {
    return allExercises.filter((e) => {
      if (activeCategory !== 'All' && e.category !== activeCategory) return false;
      if (filters.difficulty.length && !filters.difficulty.includes(e.difficulty)) return false;
      return true;
    });
  }, [allExercises, activeCategory, filters]);

  const activeFilterCount = filters.difficulty.length;

  const handleAddToday = (exercise) => {
    setAddedId(exercise.id);
    setTimeout(() => setAddedId(null), 2000);
    onAddToday && onAddToday(exercise);
  };

  return (
    <View>
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Search size={16} color={Colors.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
          {loading ? (
            <ActivityIndicator size="small" color={Colors.textTertiary} />
          ) : query ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={Colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={18} color={activeFilterCount > 0 ? Colors.onPrimary : Colors.textPrimary} />
          {activeFilterCount > 0 && (
            <View style={s.filterCountBadge}>
              <Text style={s.filterCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {apiError && (
        <View style={s.errorBanner}>
          <Text style={s.errorBannerText}>{apiError}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll} contentContainerStyle={s.categoryContent}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.categoryChip, activeCategory === cat && s.categoryChipActive]}
            onPress={() => setActiveCategory(cat)}
            activeOpacity={0.7}
          >
            <Text style={[s.categoryChipText, activeCategory === cat && s.categoryChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.resultsMeta}>
        <View style={s.resultsMetaLeft}>
          <Text style={s.resultsCount}>{results.length} exercises</Text>
          {liveExercises.length > 0 && (
            <View style={s.liveIndicator}>
              <Zap size={10} color="#16A34A" />
              <Text style={s.liveIndicatorText}>FatSecret</Text>
            </View>
          )}
        </View>
        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={() => setFilters({ difficulty: [] })}>
            <Text style={s.clearFilters}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {results.length === 0 && !loading ? (
        <View style={s.emptyState}>
          <Search size={32} color={Colors.textTertiary} />
          <Text style={s.emptyTitle}>No exercises found</Text>
          <Text style={s.emptySub}>Try adjusting your filters or search</Text>
        </View>
      ) : (
        results.map((ex) => (
          <View key={ex.id}>
            {addedId === ex.id && (
              <View style={s.addedBanner}>
                <CheckCircle2 size={14} color={Colors.success} />
                <Text style={s.addedBannerText}>Added to today's plan</Text>
              </View>
            )}
            <ExerciseCard exercise={ex} onView={setDetailExercise} onAddToday={handleAddToday} />
          </View>
        ))
      )}

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <ExerciseDetailSheet
        exercise={detailExercise}
        visible={!!detailExercise}
        onClose={() => setDetailExercise(null)}
        onAddToday={handleAddToday}
      />
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    ...Layout.cardShadow,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontFamily: 'PlusJakartaSans-Regular' },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Layout.cardShadow,
  },
  filterBtnActive: { backgroundColor: Colors.textPrimary },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
  errorBanner: {
    backgroundColor: '#FEF9C3',
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  errorBannerText: { fontSize: 12, color: '#A16207', fontFamily: 'PlusJakartaSans-Medium' },
  categoryScroll: { marginBottom: 12 },
  categoryContent: { gap: 8, paddingRight: 4 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.cardBackground,
    ...Layout.cardShadow,
  },
  categoryChipActive: { backgroundColor: Colors.textPrimary },
  categoryChipText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary },
  categoryChipTextActive: { color: Colors.onPrimary },
  resultsMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  resultsMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultsCount: { fontSize: 13, color: Colors.textTertiary },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveIndicatorText: { fontSize: 10, color: '#16A34A', fontFamily: 'PlusJakartaSans-SemiBold' },
  clearFilters: { fontSize: 13, color: Colors.primary, fontFamily: 'PlusJakartaSans-SemiBold' },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: 10,
    overflow: 'hidden',
    ...Layout.cardShadow,
  },
  exerciseThumb: { width: 100, height: 110, backgroundColor: Colors.border },
  exerciseContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  exerciseName: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 4 },
  exerciseIntensityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  exerciseIntensityLabel: { fontSize: 11, color: Colors.textTertiary, fontFamily: 'PlusJakartaSans-Regular' },
  exerciseIntensityValue: { fontSize: 11, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans-SemiBold' },
  exerciseMetRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  exerciseMetLabel: { fontSize: 11, color: Colors.textTertiary, fontFamily: 'PlusJakartaSans-Regular' },
  exerciseMetValue: { fontSize: 13, color: Colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold' },
  exerciseCalRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8 },
  exerciseCalValue: { fontSize: 13, color: Colors.calories, fontFamily: 'PlusJakartaSans-Bold' },
  exerciseCalUnit: { fontSize: 11, color: Colors.textTertiary },
  exerciseCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.textPrimary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addExBtnText: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.onPrimary },
  addedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  addedBannerText: { fontSize: 13, color: Colors.success, fontFamily: 'PlusJakartaSans-SemiBold' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    ...Layout.cardShadow,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary, marginTop: 10 },
  emptySub: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold' },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#DCFCE7' },
  sourceBadgeText: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold', color: '#16A34A' },
  muscleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: Colors.primaryLight },
  muscleTagText: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  sheetContainer: { flex: 1, backgroundColor: Colors.background },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sheetTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  sheetScroll: { flex: 1, padding: 16 },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  filterSection: { marginBottom: 20 },
  filterSectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 10 },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  filterChipText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.onPrimary },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  resetBtnText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.onPrimary },
  detailImage: { width: '100%', height: 200, backgroundColor: Colors.border, marginBottom: 16 },
  detailMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailMetaText: { fontSize: 13, color: Colors.textTertiary },
  detailSectionLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 6, marginTop: 4 },
  detailDescription: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 12 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
  stepText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 21, paddingTop: 2 },
  calEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.caloriesLight,
    borderRadius: Layout.borderRadius.lg,
    padding: 14,
    marginTop: 16,
    marginBottom: 4,
  },
  calEstimateText: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  calEstimateSub: { fontSize: 11, color: Colors.textTertiary },
  addTodayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.textPrimary,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: 14,
  },
  addTodayBtnText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.onPrimary },
});
