import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Defs, ClipPath, Path, LinearGradient, Stop, Rect, Ellipse, Line, G } from 'react-native-svg';
import { Droplets, Pencil } from 'lucide-react-native';
import Card from '@/components/common/Card';
import { useTheme } from '@/context/ThemeContext';

const GLASS_ML = 250;
const PRESET_GOALS_ML = [2000, 2500, 3000, 3500];

function WaterGlass({ filled, idx, strokeColor }) {
  const iTop = 17;
  const iBot = 72;
  const iH = iBot - iTop;
  const fillH = filled ? iH : 0;
  const fillY = iBot - fillH;
  const cid = `wgc${idx}`;
  const gid = `wgg${idx}`;

  return (
    <Svg width="32" height="43" viewBox="0 0 60 84" fill="none">
      <Defs>
        <ClipPath id={cid}>
          <Path d="M 9 17 L 14 72 Q 30 77 46 72 L 51 17 Q 30 21 9 17 Z" />
        </ClipPath>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#0369A1" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {filled && (
        <G clipPath={`url(#${cid})`}>
          <Rect x="0" y={fillY} width="60" height={fillH + 14} fill={`url(#${gid})`} />
          <Ellipse cx="30" cy={fillY} rx="19" ry="2.2" fill="#BAE6FD" opacity="0.55" />
          <Rect
            x="13"
            y={Math.max(fillY + 5, iTop + 1)}
            width="4"
            height={Math.max(fillH - 12, 0)}
            rx="2"
            fill="white"
            opacity="0.18"
          />
        </G>
      )}

      <Line x1="5" y1="11" x2="13" y2="74" stroke={strokeColor} strokeWidth="4.5" strokeLinecap="round" />
      <Line x1="55" y1="11" x2="47" y2="74" stroke={strokeColor} strokeWidth="4.5" strokeLinecap="round" />
      <Ellipse cx="30" cy="11" rx="25" ry="8" stroke={strokeColor} strokeWidth="4.5" fill="none" />
      <Ellipse cx="30" cy="11" rx="20" ry="5.5" stroke={strokeColor} strokeWidth="2" fill="none" opacity="0.45" />
      <Ellipse cx="30" cy="74" rx="17" ry="5" stroke={strokeColor} strokeWidth="4.5" fill="none" />
    </Svg>
  );
}

/**
 * @param {{ glasses: number, totalMl: number, goalMl: number, loading?: boolean, onGlassSlotPress: (slotIndex: number) => Promise<void>, onDeltaMl: (deltaMl: number) => Promise<void>, onCustomMl: (ml: number, mode: 'add'|'subtract') => Promise<void>, onChangeGoalMl: (ml: number) => Promise<void> }} props
 */
export default function WaterTracker({
  glasses,
  totalMl,
  goalMl,
  loading = false,
  onGlassSlotPress,
  onDeltaMl,
  onCustomMl,
  onChangeGoalMl,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const safeGoal = Math.max(GLASS_ML, goalMl || 2500);
  const totalGlasses = Math.max(1, Math.round(safeGoal / GLASS_ML));
  const completedGlasses = Math.min(
    Math.max(0, Math.round((totalMl || 0) / GLASS_ML)),
    totalGlasses,
  );
  const progressPct = totalGlasses > 0 ? Math.min(100, (completedGlasses / totalGlasses) * 100) : 0;

  const [goalModal, setGoalModal] = useState(false);
  const [customMl, setCustomMl] = useState(String(safeGoal));
  /** @type {null | 'add' | 'subtract'} */
  const [customVolumeModal, setCustomVolumeModal] = useState(null);
  const [customVolumeInput, setCustomVolumeInput] = useState('250');

  const applyGoal = async (ml) => {
    const n = Math.round(Number(ml) || 0);
    if (n < 500 || n > 20000) return;
    await onChangeGoalMl(n);
    setGoalModal(false);
  };

  const applyCustomVolume = async () => {
    const n = Math.round(Number(String(customVolumeInput).replace(/,/g, '.')) || 0);
    if (!Number.isFinite(n) || n <= 0 || n > 5000) return;
    if (!customVolumeModal) return;
    await onCustomMl(n, customVolumeModal);
    setCustomVolumeModal(null);
    setCustomVolumeInput('250');
  };

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Droplets size={20} color={Colors.water} />
          <Text style={styles.title}>Water</Text>
        </View>
        <View style={styles.headerRight}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <TouchableOpacity
              style={styles.goalRow}
              onPress={() => {
                setCustomMl(String(safeGoal));
                setGoalModal(true);
              }}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Pencil size={14} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          <Text style={styles.statsHighlight}>{totalMl || 0} ml</Text>
          {' / '}
          {safeGoal} ml
        </Text>
        <Text style={styles.glassesCount}>
          {completedGlasses} / {totalGlasses} glasses
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {/* Glasses grid */}
      <View style={styles.glassesGrid}>
        {Array.from({ length: totalGlasses }).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onGlassSlotPress(i)}
            activeOpacity={0.7}
            disabled={loading}
            style={styles.glassTouch}
          >
            <WaterGlass
              filled={i < completedGlasses}
              idx={i}
              strokeColor={i < completedGlasses ? Colors.primary : Colors.textTertiary}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.waterBtn, styles.waterBtnOutline]}
          onPress={() => {
            setCustomVolumeInput('250');
            setCustomVolumeModal('subtract');
          }}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.waterBtnTextDark}>- Custom</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.waterBtn, styles.waterBtnOutline]}
          onPress={() => onDeltaMl(-GLASS_ML)}
          activeOpacity={0.7}
          disabled={loading || (totalMl || 0) <= 0}
        >
          <Text style={styles.waterBtnTextDark}>- 250 ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.waterBtn, styles.waterBtnTeal]}
          onPress={() => onDeltaMl(GLASS_ML)}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.waterBtnTextColor}>+ 250 ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.waterBtn, styles.waterBtnTeal]}
          onPress={() => {
            setCustomVolumeInput('250');
            setCustomVolumeModal('add');
          }}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.waterBtnTextColor}>+ Custom</Text>
        </TouchableOpacity>
      </View>

      {/* Custom volume modal */}
      <Modal
        visible={customVolumeModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomVolumeModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCustomVolumeModal(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.modalBox} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {customVolumeModal === 'add' ? 'Add water (ml)' : 'Remove water (ml)'}
              </Text>
              <Text style={styles.modalHint}>1–5000 ml</Text>
              <TextInput
                style={styles.customInput}
                value={customVolumeInput}
                onChangeText={setCustomVolumeInput}
                keyboardType="decimal-pad"
                placeholder="250"
                placeholderTextColor={Colors.textTertiary}
              />
              <TouchableOpacity
                style={styles.saveGoalBtn}
                onPress={() => void applyCustomVolume()}
                activeOpacity={0.8}
              >
                <Text style={styles.saveGoalBtnText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCustomVolumeModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Goal modal */}
      <Modal visible={goalModal} transparent animationType="fade" onRequestClose={() => setGoalModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setGoalModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.modalBox} onPress={() => {}}>
              <Text style={styles.modalTitle}>Daily water goal</Text>
              <Text style={styles.modalHint}>Each glass = 250 ml</Text>
              <View style={styles.presetRow}>
                {PRESET_GOALS_ML.map((ml) => (
                  <TouchableOpacity
                    key={ml}
                    style={[
                      styles.presetBtn,
                      safeGoal === ml && styles.presetBtnActive,
                    ]}
                    onPress={() => applyGoal(ml)}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.presetBtnText,
                      safeGoal === ml && styles.presetBtnTextActive,
                    ]}>
                      {(ml / 1000).toFixed(1)} L
                    </Text>
                    <Text style={[
                      styles.presetBtnSub,
                      safeGoal === ml && styles.presetBtnTextActive,
                    ]}>
                      {ml / GLASS_ML} glasses
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.customLabel}>Custom (ml)</Text>
              <TextInput
                style={styles.customInput}
                value={customMl}
                onChangeText={setCustomMl}
                keyboardType="number-pad"
                placeholder="2500"
                placeholderTextColor={Colors.textTertiary}
              />
              <TouchableOpacity style={styles.saveGoalBtn} onPress={() => applyGoal(customMl)} activeOpacity={0.8}>
                <Text style={styles.saveGoalBtnText}>Save goal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setGoalModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </Card>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textSecondary,
  },
  statsHighlight: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.primary,
  },
  glassesCount: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  glassesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  glassTouch: {
    padding: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  waterBtn: {
    width: '48%',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterBtnOutline: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  waterBtnTeal: {
    backgroundColor: Colors.primaryLight,
  },
  waterBtnTextDark: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  waterBtnTextColor: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  modalHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
    marginBottom: 16,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.innerCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  presetBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  presetBtnSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    marginTop: 2,
  },
  presetBtnTextActive: {
    color: Colors.primary,
  },
  customLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  customInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  saveGoalBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveGoalBtnText: {
    color: Colors.onPrimary || '#FFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
  },
  modalCancel: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textTertiary,
  },
});
