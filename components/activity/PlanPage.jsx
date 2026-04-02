import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Modal, TextInput,
} from 'react-native';
import {
  Search, X, Flame, Clock, Calendar, Plus,
  Target, Check, Trash2, BookOpen, ChevronUp, ChevronDown,
  Dumbbell, GripVertical, Pencil,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { explorePlans, exerciseDatabase, DIFFICULTY_COLORS, estimateCalories, userProfile } from '@/data/activityData';

const GOALS = ['All', 'Fat Loss', 'Build Muscle', 'Strength', 'General Fitness', 'Mobility'];

function getExerciseById(id) {
  return exerciseDatabase.find((e) => e.id === id);
}

function resolvePlanExercises(plan) {
  return plan.exercises
    .map((pe) => {
      const ex = getExerciseById(pe.exerciseId);
      if (!ex) return null;
      return { ...ex, ...pe };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

function formatVolume(item) {
  if (item.reps) return `${item.sets} sets × ${item.reps} reps`;
  if (item.durationSec) {
    const mins = Math.floor(item.durationSec / 60);
    const secs = item.durationSec % 60;
    if (mins > 0 && secs > 0) return `${item.sets > 1 ? `${item.sets}×` : ''}${mins}m ${secs}s`;
    if (mins > 0) return `${item.sets > 1 ? `${item.sets} sets × ` : ''}${mins} min`;
    return `${item.sets > 1 ? `${item.sets} sets × ` : ''}${secs}s`;
  }
  return `${item.sets} sets`;
}

function formatRestLabel(restSec) {
  if (!restSec) return null;
  if (restSec >= 60) return `${Math.round(restSec / 60)}m rest`;
  return `${restSec}s rest`;
}

function DiffBadge({ difficulty }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const d = DIFFICULTY_COLORS[difficulty] || { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <View style={[s.badge, { backgroundColor: d.bg }]}>
      <Text style={[s.badgeText, { color: d.text }]}>{difficulty}</Text>
    </View>
  );
}

function ExerciseChipPreview({ exerciseId }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const ex = getExerciseById(exerciseId);
  if (!ex) return null;
  return (
    <View style={s.exChip}>
      <Image source={{ uri: ex.image }} style={s.exChipThumb} />
      <Text style={s.exChipText} numberOfLines={1}>{ex.name}</Text>
    </View>
  );
}

function PlanExerciseCard({ item, index, onPress, showOrder = true, editable = false, onMoveUp, onMoveDown, onRemove, onEdit }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const ex = item;
  const cal = estimateCalories(ex.caloriesPerMin, ex.duration, userProfile);
  const diff = DIFFICULTY_COLORS[ex.difficulty] || { bg: '#F3F4F6', text: '#6B7280' };
  const volume = formatVolume(item);
  const rest = formatRestLabel(item.restSec);

  return (
    <TouchableOpacity style={s.exCard} onPress={onPress} activeOpacity={onPress ? 0.85 : 1}>
      <View style={s.exCardTop}>
        {showOrder && (
          <View style={s.exOrderBubble}>
            <Text style={s.exOrderText}>{index + 1}</Text>
          </View>
        )}
        <Image source={{ uri: ex.image }} style={s.exCardThumb} />
        <View style={s.exCardInfo}>
          <Text style={s.exCardName} numberOfLines={1}>{ex.name}</Text>
          <View style={s.exCardBadgeRow}>
            <View style={[s.badge, { backgroundColor: diff.bg }]}>
              <Text style={[s.badgeText, { color: diff.text }]}>{ex.difficulty}</Text>
            </View>
            <View style={s.exCategoryTag}>
              <Text style={s.exCategoryTagText}>{ex.category}</Text>
            </View>
          </View>
          <View style={s.exCardMeta}>
            <View style={s.exMetaItem}>
              <Dumbbell size={11} color={Colors.textTertiary} />
              <Text style={s.exMetaText}>{ex.muscleGroup}</Text>
            </View>
            <View style={s.exMetaItem}>
              <Clock size={11} color={Colors.textTertiary} />
              <Text style={s.exMetaText}>{ex.duration}min</Text>
            </View>
            <View style={s.exMetaItem}>
              <Flame size={11} color={Colors.calories} />
              <Text style={s.exMetaText}>~{cal} kcal</Text>
            </View>
          </View>
          <Text style={s.exEquipText}>{ex.equipment}</Text>
        </View>
        {editable && (
          <View style={s.exCardReorderCol}>
            <TouchableOpacity onPress={onMoveUp} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <ChevronUp size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
            <GripVertical size={16} color={Colors.border} />
            <TouchableOpacity onPress={onMoveDown} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <ChevronDown size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={s.exCardVolRow}>
        <View style={s.exVolPill}>
          <Text style={s.exVolText}>{volume}</Text>
        </View>
        {rest && (
          <View style={[s.exVolPill, { backgroundColor: Colors.border }]}>
            <Text style={[s.exVolText, { color: Colors.textTertiary }]}>{rest}</Text>
          </View>
        )}
        {editable && (
          <View style={s.exCardEditActions}>
            <TouchableOpacity style={s.exEditBtn} onPress={onEdit} activeOpacity={0.7}>
              <Pencil size={12} color={Colors.primary} />
              <Text style={s.exEditBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.exRemoveBtn} onPress={onRemove} activeOpacity={0.7}>
              <Trash2 size={12} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function PlanCard({ plan, onView, onSave, saved }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const resolved = resolvePlanExercises(plan);
  const previewCount = 3;
  const preview = resolved.slice(0, previewCount);
  const remaining = resolved.length - previewCount;

  return (
    <TouchableOpacity style={s.planCard} onPress={() => onView(plan)} activeOpacity={0.85}>
      <Image source={{ uri: plan.image }} style={s.planThumb} />
      <View style={s.planContent}>
        <View style={s.planTopRow}>
          <View style={s.goalTag}><Text style={s.goalTagText}>{plan.goal}</Text></View>
          <DiffBadge difficulty={plan.difficulty} />
        </View>
        <Text style={s.planName}>{plan.name}</Text>
        <Text style={s.planDesc} numberOfLines={2}>{plan.description}</Text>
        <View style={s.planMetaRow}>
          <View style={s.planMetaItem}>
            <Calendar size={12} color={Colors.textTertiary} />
            <Text style={s.planMetaText}>{plan.daysPerWeek}x / week</Text>
          </View>
          <View style={s.planMetaItem}>
            <Clock size={12} color={Colors.textTertiary} />
            <Text style={s.planMetaText}>{plan.durationWeeks} weeks</Text>
          </View>
          <View style={s.planMetaItem}>
            <Flame size={12} color={Colors.calories} />
            <Text style={s.planMetaText}>~{plan.estimatedCaloriesPerWeek} kcal/wk</Text>
          </View>
        </View>

        <View style={s.planExercisePreviewHeader}>
          <Text style={s.planExercisePreviewLabel}>{resolved.length} exercises</Text>
        </View>
        <View style={s.planExChipRow}>
          {preview.map((ex) => (
            <ExerciseChipPreview key={ex.id} exerciseId={ex.id} />
          ))}
          {remaining > 0 && (
            <View style={[s.exChip, s.exChipMore]}>
              <Text style={s.exChipMoreText}>+{remaining} more</Text>
            </View>
          )}
        </View>

        <View style={s.planActions}>
          <TouchableOpacity style={s.planViewBtn} onPress={() => onView(plan)} activeOpacity={0.7}>
            <BookOpen size={13} color={Colors.textSecondary} />
            <Text style={s.planViewBtnText}>View Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.planSaveBtn, saved && s.planSavedBtn]}
            onPress={() => onSave(plan.id)}
            activeOpacity={0.7}
          >
            {saved ? <Check size={13} color={Colors.success} /> : <Plus size={13} color={Colors.onPrimary} />}
            <Text style={[s.planSaveBtnText, saved && { color: Colors.success }]}>{saved ? 'Saved' : 'Save plan'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ExerciseEditModal({ visible, item, onClose, onSave }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const [sets, setSets] = useState(String(item?.sets ?? 3));
  const [reps, setReps] = useState(String(item?.reps ?? ''));
  const [durationSec, setDurationSec] = useState(String(item?.durationSec ?? ''));
  const [restSec, setRestSec] = useState(String(item?.restSec ?? 60));

  if (!visible || !item) return null;

  const handleSave = () => {
    onSave({
      sets: parseInt(sets) || 3,
      reps: reps ? parseInt(reps) : null,
      durationSec: durationSec ? parseInt(durationSec) : null,
      restSec: parseInt(restSec) || 0,
    });
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.editOverlay}>
        <View style={s.editModal}>
          <View style={s.editModalHeader}>
            <Text style={s.editModalTitle}>{item.name}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={Colors.textPrimary} /></TouchableOpacity>
          </View>
          <View style={s.editFieldRow}>
            <View style={s.editField}>
              <Text style={s.editFieldLabel}>Sets</Text>
              <TextInput style={s.editFieldInput} value={sets} onChangeText={setSets} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
            </View>
            <View style={s.editField}>
              <Text style={s.editFieldLabel}>Reps</Text>
              <TextInput style={s.editFieldInput} value={reps} onChangeText={setReps} keyboardType="numeric" placeholder="—" placeholderTextColor={Colors.textTertiary} />
            </View>
            <View style={s.editField}>
              <Text style={s.editFieldLabel}>Duration (s)</Text>
              <TextInput style={s.editFieldInput} value={durationSec} onChangeText={setDurationSec} keyboardType="numeric" placeholder="—" placeholderTextColor={Colors.textTertiary} />
            </View>
            <View style={s.editField}>
              <Text style={s.editFieldLabel}>Rest (s)</Text>
              <TextInput style={s.editFieldInput} value={restSec} onChangeText={setRestSec} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
            </View>
          </View>
          <TouchableOpacity style={s.editSaveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Check size={15} color={Colors.onPrimary} />
            <Text style={s.editSaveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PlanDetailSheet({ plan, visible, onClose, onSave, saved }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const [detailEx, setDetailEx] = useState(null);

  if (!plan || !visible) return null;
  const resolved = resolvePlanExercises(plan);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.sheetContainer}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle} numberOfLines={1}>{plan.name}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false}>
          <Image source={{ uri: plan.image }} style={s.detailImage} />

          <View style={s.detailMeta}>
            <DiffBadge difficulty={plan.difficulty} />
            <View style={s.detailMetaItem}><Calendar size={13} color={Colors.textTertiary} /><Text style={s.detailMetaText}>{plan.daysPerWeek}x/week</Text></View>
            <View style={s.detailMetaItem}><Clock size={13} color={Colors.textTertiary} /><Text style={s.detailMetaText}>{plan.durationWeeks} weeks</Text></View>
            <View style={s.detailMetaItem}><Target size={13} color={Colors.primary} /><Text style={s.detailMetaText}>{plan.goal}</Text></View>
          </View>

          <Text style={s.detailSectionLabel}>About This Plan</Text>
          <Text style={s.detailDescription}>{plan.description}</Text>

          <Text style={s.detailSectionLabel}>Equipment</Text>
          <Text style={s.detailDescription}>{plan.equipment}</Text>

          <Text style={s.detailSectionLabel}>Weekly Structure</Text>
          {plan.schedule.map((row, i) => (
            <View key={i} style={s.scheduleRow}>
              <Text style={s.scheduleDay}>{row.day}</Text>
              <Text style={s.scheduleWorkouts}>{row.workouts.join(', ')}</Text>
            </View>
          ))}

          <View style={s.exerciseSectionHeader}>
            <Text style={s.detailSectionLabel}>{resolved.length} Exercises in This Plan</Text>
          </View>
          {resolved.map((item, idx) => (
            <PlanExerciseCard
              key={item.id + idx}
              item={item}
              index={idx}
              onPress={() => setDetailEx(item)}
            />
          ))}

          <View style={s.calEstimate}>
            <Flame size={16} color={Colors.calories} />
            <Text style={s.calEstimateText}>~{plan.estimatedCaloriesPerWeek} kcal/week estimated</Text>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
        <View style={s.sheetFooter}>
          <TouchableOpacity
            style={[s.saveBtn, saved && s.savedBtn]}
            onPress={() => onSave(plan.id)}
            activeOpacity={0.8}
          >
            {saved ? <Check size={16} color={Colors.success} /> : <Plus size={16} color={Colors.onPrimary} />}
            <Text style={[s.saveBtnText, saved && { color: Colors.success }]}>{saved ? 'Saved to My Plans' : 'Save Plan'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {detailEx && (
        <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailEx(null)}>
          <View style={s.sheetContainer}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{detailEx.name}</Text>
              <TouchableOpacity onPress={() => setDetailEx(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false}>
              <Image source={{ uri: detailEx.image }} style={s.detailImage} />
              <View style={s.detailMeta}>
                <DiffBadge difficulty={detailEx.difficulty} />
                <View style={s.detailMetaItem}><Clock size={13} color={Colors.textTertiary} /><Text style={s.detailMetaText}>{detailEx.duration} min</Text></View>
                <View style={s.detailMetaItem}><Flame size={13} color={Colors.calories} /><Text style={s.detailMetaText}>~{estimateCalories(detailEx.caloriesPerMin, detailEx.duration, userProfile)} kcal</Text></View>
                <View style={s.detailMetaItem}><Dumbbell size={13} color={Colors.textTertiary} /><Text style={s.detailMetaText}>{detailEx.equipment}</Text></View>
              </View>
              <Text style={s.detailSectionLabel}>Description</Text>
              <Text style={s.detailDescription}>{detailEx.description}</Text>
              <Text style={s.detailSectionLabel}>Muscles Worked</Text>
              <View style={s.tagRow}>
                <View style={s.muscleTag}><Text style={s.muscleTagText}>{detailEx.muscleGroup}</Text></View>
                <View style={s.muscleTag}><Text style={s.muscleTagText}>{detailEx.bodyPart}</Text></View>
              </View>
              <Text style={s.detailSectionLabel}>Instructions</Text>
              {detailEx.instructions.map((step, i) => (
                <View key={i} style={s.stepRow}>
                  <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

function CustomPlanBuilder({ onClose }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [goal, setGoal] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [days, setDays] = useState(3);
  const [exercises, setExercises] = useState([]);
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);

  const searchResults = useMemo(() => {
    if (!query) return [];
    return exerciseDatabase
      .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()) && !exercises.find((ex) => ex.exerciseId === e.id))
      .slice(0, 5);
  }, [query, exercises]);

  const addExercise = (ex) => {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        order: prev.length + 1,
        sets: 3,
        reps: 10,
        durationSec: null,
        restSec: 60,
        ...ex,
      },
    ]);
    setQuery('');
  };

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, order: i + 1 })));
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    setExercises((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr.map((e, i) => ({ ...e, order: i + 1 }));
    });
  };

  const moveDown = (idx) => {
    setExercises((prev) => {
      if (idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr.map((e, i) => ({ ...e, order: i + 1 }));
    });
  };

  const applyEdit = (updates) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === editingIdx ? { ...e, ...updates } : e))
    );
    setEditingIdx(null);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    setSaved(true);
    setTimeout(onClose, 1400);
  };

  if (saved) {
    return (
      <View style={s.savedBanner}>
        <Check size={28} color={Colors.success} />
        <Text style={s.savedBannerTitle}>Plan Saved!</Text>
        <Text style={s.savedBannerSub}>Your custom plan has been saved to My Plans.</Text>
      </View>
    );
  }

  return (
    <View style={s.sheetContainer}>
      <View style={s.sheetHeader}>
        <Text style={s.sheetTitle}>Create Custom Plan</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.inputLabel}>Plan Name *</Text>
        <TextInput style={s.textInput} placeholder="e.g. My Strength Plan" value={name} onChangeText={setName} placeholderTextColor={Colors.textTertiary} />

        <Text style={s.inputLabel}>Description</Text>
        <TextInput style={[s.textInput, s.textArea]} placeholder="Describe your plan..." value={desc} onChangeText={setDesc} multiline numberOfLines={3} placeholderTextColor={Colors.textTertiary} />

        <Text style={s.inputLabel}>Goal</Text>
        <TextInput style={s.textInput} placeholder="e.g. Fat Loss, Build Muscle..." value={goal} onChangeText={setGoal} placeholderTextColor={Colors.textTertiary} />

        <Text style={s.inputLabel}>Difficulty</Text>
        <View style={s.pillRow}>
          {['Beginner', 'Intermediate', 'Advanced'].map((d) => (
            <TouchableOpacity key={d} style={[s.pill, difficulty === d && s.pillActive]} onPress={() => setDifficulty(d)} activeOpacity={0.7}>
              <Text style={[s.pillText, difficulty === d && s.pillTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.inputLabel}>Days per Week</Text>
        <View style={s.pillRow}>
          {[2, 3, 4, 5, 6].map((d) => (
            <TouchableOpacity key={d} style={[s.pill, days === d && s.pillActive]} onPress={() => setDays(d)} activeOpacity={0.7}>
              <Text style={[s.pillText, days === d && s.pillTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.inputLabel}>Add Exercises</Text>
        <View style={s.searchBar}>
          <Search size={15} color={Colors.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search and add exercises..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor={Colors.textTertiary}
          />
          {query ? <TouchableOpacity onPress={() => setQuery('')}><X size={14} color={Colors.textTertiary} /></TouchableOpacity> : null}
        </View>
        {searchResults.map((ex) => (
          <TouchableOpacity key={ex.id} style={s.searchResultItem} onPress={() => addExercise(ex)} activeOpacity={0.7}>
            <Image source={{ uri: ex.image }} style={s.searchResultThumb} />
            <View style={s.searchResultInfo}>
              <Text style={s.searchResultName}>{ex.name}</Text>
              <Text style={s.searchResultMeta}>{ex.category} · {ex.muscleGroup} · {ex.difficulty}</Text>
            </View>
            <View style={s.searchResultAdd}>
              <Plus size={15} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        ))}

        {exercises.length > 0 && (
          <View style={s.builderSection}>
            <View style={s.builderSectionHeader}>
              <Text style={s.builderSectionTitle}>{exercises.length} Exercise{exercises.length !== 1 ? 's' : ''}</Text>
              <Text style={s.builderSectionSub}>Tap arrows to reorder</Text>
            </View>
            {exercises.map((item, idx) => {
              const ex = getExerciseById(item.exerciseId) || item;
              return (
                <PlanExerciseCard
                  key={item.exerciseId + idx}
                  item={{ ...ex, ...item }}
                  index={idx}
                  editable
                  onMoveUp={() => moveUp(idx)}
                  onMoveDown={() => moveDown(idx)}
                  onRemove={() => removeExercise(idx)}
                  onEdit={() => setEditingIdx(idx)}
                />
              );
            })}
          </View>
        )}

        {exercises.length === 0 && (
          <View style={s.builderEmpty}>
            <Dumbbell size={24} color={Colors.textTertiary} />
            <Text style={s.builderEmptyText}>No exercises added yet</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={s.sheetFooter}>
        <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.applyBtn, !name.trim() && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!name.trim()}
          activeOpacity={0.8}
        >
            <Check size={16} color={Colors.onPrimary} />
            <Text style={s.applyBtnText}>Save Plan</Text>
        </TouchableOpacity>
      </View>

      <ExerciseEditModal
        visible={editingIdx !== null}
        item={editingIdx !== null ? { ...(getExerciseById(exercises[editingIdx]?.exerciseId) || {}), ...exercises[editingIdx] } : null}
        onClose={() => setEditingIdx(null)}
        onSave={applyEdit}
      />
    </View>
  );
}

export default function PlanPage() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const [tab, setTab] = useState('Explore');
  const [goalFilter, setGoalFilter] = useState('All');
  const [savedPlanIds, setSavedPlanIds] = useState([]);
  const [detailPlan, setDetailPlan] = useState(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [query, setQuery] = useState('');

  const toggleSave = (id) => {
    setSavedPlanIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    return explorePlans.filter((p) => {
      if (goalFilter !== 'All' && p.goal !== goalFilter) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [goalFilter, query]);

  const myPlans = explorePlans.filter((p) => savedPlanIds.includes(p.id));
  const TABS = ['Explore', 'My Plans', 'Create'];

  return (
    <View>
      <View style={s.subTabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.subTab, tab === t && s.subTabActive]}
            onPress={() => { if (t === 'Create') setCreateVisible(true); else setTab(t); }}
            activeOpacity={0.7}
          >
            {t === 'Create' && <Plus size={13} color={tab === t ? Colors.onPrimary : Colors.textTertiary} />}
            <Text style={[s.subTabText, tab === t && s.subTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'Explore' && (
        <View>
          <View style={s.searchBar}>
            <Search size={15} color={Colors.textTertiary} />
            <TextInput
              style={s.searchInput}
              placeholder="Search plans..."
              value={query}
              onChangeText={setQuery}
              placeholderTextColor={Colors.textTertiary}
            />
            {query ? <TouchableOpacity onPress={() => setQuery('')}><X size={15} color={Colors.textTertiary} /></TouchableOpacity> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.goalScroll} contentContainerStyle={s.goalContent}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[s.goalChip, goalFilter === g && s.goalChipActive]}
                onPress={() => setGoalFilter(g)}
                activeOpacity={0.7}
              >
                <Text style={[s.goalChipText, goalFilter === g && s.goalChipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={s.resultsCount}>{filtered.length} plans</Text>
          {filtered.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onView={setDetailPlan} onSave={toggleSave} saved={savedPlanIds.includes(plan.id)} />
          ))}
        </View>
      )}

      {tab === 'My Plans' && (
        <View>
          {myPlans.length === 0 ? (
            <View style={s.emptyState}>
              <Target size={32} color={Colors.textTertiary} />
              <Text style={s.emptyTitle}>No saved plans yet</Text>
              <Text style={s.emptySub}>Browse Explore to save plans</Text>
              <TouchableOpacity style={s.emptyAction} onPress={() => setTab('Explore')} activeOpacity={0.7}>
                <Text style={s.emptyActionText}>Browse Plans</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onView={setDetailPlan} onSave={toggleSave} saved />
            ))
          )}
        </View>
      )}

      <PlanDetailSheet
        plan={detailPlan}
        visible={!!detailPlan}
        onClose={() => setDetailPlan(null)}
        onSave={toggleSave}
        saved={detailPlan && savedPlanIds.includes(detailPlan.id)}
      />

      <Modal visible={createVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateVisible(false)}>
        <CustomPlanBuilder onClose={() => setCreateVisible(false)} />
      </Modal>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    padding: 4,
    marginBottom: 16,
    ...Layout.cardShadow,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: Layout.borderRadius.md,
  },
  subTabActive: { backgroundColor: Colors.textPrimary },
  subTabText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textTertiary },
  subTabTextActive: { color: Colors.onPrimary, fontFamily: 'PlusJakartaSans-SemiBold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontFamily: 'PlusJakartaSans-Regular' },
  goalScroll: { marginBottom: 12 },
  goalContent: { gap: 8, paddingRight: 4 },
  goalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.cardBackground,
    ...Layout.cardShadow,
  },
  goalChipActive: { backgroundColor: Colors.textPrimary },
  goalChipText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary },
  goalChipTextActive: { color: Colors.onPrimary },
  resultsCount: { fontSize: 13, color: Colors.textTertiary, marginBottom: 12 },
  planCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: 14,
    overflow: 'hidden',
    ...Layout.cardShadow,
  },
  planThumb: { width: '100%', height: 130, backgroundColor: Colors.border },
  planContent: { padding: 14 },
  planTopRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  goalTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: Colors.primaryLight },
  goalTagText: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  planName: { fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 4 },
  planDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 10 },
  planMetaRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  planMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planMetaText: { fontSize: 12, color: Colors.textTertiary },

  planExercisePreviewHeader: { marginBottom: 8 },
  planExercisePreviewLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary },
  planExChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  exChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exChipThumb: { width: 22, height: 22, borderRadius: 6, backgroundColor: Colors.border },
  exChipText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary, maxWidth: 80 },
  exChipMore: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  exChipMoreText: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },

  planActions: { flexDirection: 'row', gap: 8 },
  planViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planViewBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary },
  planSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.textPrimary,
    borderRadius: 10,
    paddingVertical: 9,
  },
  planSavedBtn: { backgroundColor: Colors.successLight },
  planSaveBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.onPrimary },

  exCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  exCardTop: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  exOrderBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  exOrderText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
  exCardThumb: { width: 70, height: 70, borderRadius: Layout.borderRadius.md, backgroundColor: Colors.border },
  exCardInfo: { flex: 1 },
  exCardName: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 4 },
  exCardBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  exCategoryTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: Colors.primaryLight },
  exCategoryTagText: { fontSize: 9, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  exCardMeta: { flexDirection: 'row', gap: 8, marginBottom: 3 },
  exMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  exMetaText: { fontSize: 11, color: Colors.textTertiary },
  exEquipText: { fontSize: 11, color: Colors.textTertiary, fontFamily: 'PlusJakartaSans-Medium' },
  exCardReorderCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 2,
  },
  exCardVolRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  exVolPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.primaryLight,
  },
  exVolText: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  exCardEditActions: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  exEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  exEditBtnText: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  exRemoveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    ...Layout.cardShadow,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginTop: 12 },
  emptySub: { fontSize: 13, color: Colors.textTertiary, marginTop: 4, marginBottom: 16 },
  emptyAction: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.textPrimary,
  },
  emptyActionText: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.onPrimary },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold' },

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
  sheetTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, flex: 1, marginRight: 12 },
  sheetScroll: { flex: 1, padding: 16 },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  detailImage: { width: '100%', height: 200, backgroundColor: Colors.border, borderRadius: Layout.borderRadius.lg, marginBottom: 16 },
  detailMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailMetaText: { fontSize: 13, color: Colors.textTertiary },
  detailSectionLabel: { fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, marginBottom: 8, marginTop: 12 },
  detailDescription: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 4 },
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  scheduleDay: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, width: 80 },
  scheduleWorkouts: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  exerciseSectionHeader: { marginTop: 4 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  muscleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: Colors.primaryLight },
  muscleTagText: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
  stepText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 21, paddingTop: 2 },
  calEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.caloriesLight,
    borderRadius: Layout.borderRadius.lg,
    padding: 14,
    marginTop: 12,
  },
  calEstimateText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },

  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.textPrimary,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: 14,
  },
  savedBtn: { backgroundColor: Colors.successLight },
  saveBtnText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.onPrimary },

  inputLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary, marginBottom: 6, marginTop: 12 },
  textInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  pillText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textSecondary },
  pillTextActive: { color: Colors.onPrimary },

  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    padding: 10,
    marginBottom: 6,
    ...Layout.cardShadow,
  },
  searchResultThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.border },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
  searchResultMeta: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  searchResultAdd: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  builderSection: { marginTop: 16 },
  builderSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  builderSectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  builderSectionSub: { fontSize: 11, color: Colors.textTertiary },
  builderEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  builderEmptyText: { fontSize: 13, color: Colors.textTertiary, fontFamily: 'PlusJakartaSans-Medium' },

  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary },
  applyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.textPrimary,
  },
  applyBtnText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.onPrimary },

  savedBanner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  savedBannerTitle: { fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  savedBannerSub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },

  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModal: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 20,
    width: '100%',
    ...Layout.cardShadow,
  },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  editModalTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  editFieldRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  editField: { flex: 1 },
  editFieldLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textTertiary, marginBottom: 4 },
  editFieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  editSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.textPrimary,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: 12,
  },
  editSaveBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.onPrimary },
});
