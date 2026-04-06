import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Footprints, Pencil, Target } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import ProgressRing from '@/components/common/ProgressRing';

/**
 * Daily steps card with progress vs goal + quick edit modals.
 */
export default function StepsTrackerSection({
  dateKey,
  isToday = true,
  steps = 0,
  goal = 10000,
  loading = false,
  onSaveSteps,
  onSaveGoal,
}) {
  const { colors: Colors } = useTheme();
  const s = useMemo(() => createStyles(Colors), [Colors]);

  const [stepsModal, setStepsModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const [stepsDraft, setStepsDraft] = useState('');
  const [goalDraft, setGoalDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const progress = goal > 0 ? Math.min(1, steps / goal) : 0;
  const pct = goal > 0 ? Math.min(100, Math.round((steps / goal) * 100)) : 0;

  const openSteps = () => {
    setStepsDraft(String(steps));
    setStepsModal(true);
  };

  const openGoal = () => {
    setGoalDraft(String(goal));
    setGoalModal(true);
  };

  const submitSteps = async () => {
    if (!onSaveSteps) return;
    setSaving(true);
    try {
      await onSaveSteps(stepsDraft);
      setStepsModal(false);
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const submitGoal = async () => {
    if (!onSaveGoal) return;
    setSaving(true);
    try {
      await onSaveGoal(goalDraft);
      setGoalModal(false);
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const dayLabel = isToday ? 'this day' : dateKey;

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <View style={s.topRow}>
          <View style={[s.iconWrap, { backgroundColor: Colors.fat + '22' }]}>
            <Footprints size={22} color={Colors.fat} />
          </View>
          <View style={s.topBody}>
            <Text style={s.title}>Steps</Text>
            <Text style={s.sub}>{loading ? 'Loading…' : `Goal ${goal.toLocaleString()} · ${dayLabel}`}</Text>
          </View>
          <ProgressRing
            radius={28}
            strokeWidth={5}
            progress={progress}
            color={Colors.fat}
            bgColor={Colors.border}
          >
            <Text style={s.ringPct}>{pct}%</Text>
          </ProgressRing>
        </View>

        <View style={s.valuesRow}>
          <View>
            <Text style={s.valLabel}>Steps</Text>
            <Text style={s.valBig}>{loading ? '—' : steps.toLocaleString()}</Text>
          </View>
          <View style={s.valDivider} />
          <View>
            <Text style={s.valLabel}>Goal</Text>
            <Text style={s.valBig}>{goal.toLocaleString()}</Text>
          </View>
        </View>

        <View style={s.barBg}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: Colors.fat }]} />
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.btn} onPress={openSteps} activeOpacity={0.75}>
            <Pencil size={16} color={Colors.primary} />
            <Text style={[s.btnText, { color: Colors.primary }]}>Edit steps</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={openGoal} activeOpacity={0.75}>
            <Target size={16} color={Colors.textSecondary} />
            <Text style={[s.btnText, { color: Colors.textSecondary }]}>Edit goal</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={stepsModal} transparent animationType="fade" onRequestClose={() => !saving && setStepsModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => !saving && setStepsModal(false)} />
          <View style={[s.modalBox, { backgroundColor: Colors.cardBackground }]}>
            <Text style={[s.modalTitle, { color: Colors.textPrimary }]}>Steps for {dateKey}</Text>
            <TextInput
              style={[s.input, { color: Colors.textPrimary, borderColor: Colors.border }]}
              value={stepsDraft}
              onChangeText={setStepsDraft}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              editable={!saving}
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setStepsModal(false)} disabled={saving}>
                <Text style={{ color: Colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSave, { backgroundColor: Colors.primary }]} onPress={submitSteps} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={s.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={goalModal} transparent animationType="fade" onRequestClose={() => !saving && setGoalModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => !saving && setGoalModal(false)} />
          <View style={[s.modalBox, { backgroundColor: Colors.cardBackground }]}>
            <Text style={[s.modalTitle, { color: Colors.textPrimary }]}>Daily steps goal</Text>
            <Text style={[s.modalHint, { color: Colors.textSecondary }]}>Applies to all days for your account.</Text>
            <TextInput
              style={[s.input, { color: Colors.textPrimary, borderColor: Colors.border }]}
              value={goalDraft}
              onChangeText={setGoalDraft}
              keyboardType="number-pad"
              placeholder="10000"
              placeholderTextColor={Colors.textTertiary}
              editable={!saving}
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setGoalModal(false)} disabled={saving}>
                <Text style={{ color: Colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSave, { backgroundColor: Colors.primary }]} onPress={submitGoal} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={s.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    wrap: { marginBottom: 4 },
    card: {
      backgroundColor: Colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.border,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBody: { flex: 1, marginLeft: 12 },
    title: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
    sub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
    ringPct: { fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
    valuesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    valLabel: { fontSize: 12, color: Colors.textTertiary, marginBottom: 2 },
    valBig: { fontSize: 22, fontFamily: 'PlusJakartaSans-ExtraBold', color: Colors.textPrimary },
    valDivider: { width: 1, height: 36, backgroundColor: Colors.border, marginHorizontal: 20 },
    barBg: {
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.border,
      overflow: 'hidden',
      marginBottom: 14,
    },
    barFill: { height: '100%', borderRadius: 4 },
    actions: { flexDirection: 'row', gap: 10 },
    btn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: Colors.innerCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.innerBorder,
    },
    btnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
    modalOverlay: { flex: 1, justifyContent: 'center' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    modalBox: {
      marginHorizontal: 24,
      borderRadius: 16,
      padding: 20,
      zIndex: 1,
    },
    modalTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', marginBottom: 8 },
    modalHint: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 18,
      fontFamily: 'PlusJakartaSans-SemiBold',
      marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
    modalCancel: { paddingVertical: 10, paddingHorizontal: 8 },
    modalSave: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12, minWidth: 100, alignItems: 'center' },
    modalSaveText: { color: Colors.onPrimary, fontFamily: 'PlusJakartaSans-Bold' },
  });
