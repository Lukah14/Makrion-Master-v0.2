import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Defs, ClipPath, Path, LinearGradient, Stop, Rect, Ellipse, Line, G } from 'react-native-svg';
import { Droplets, Pencil } from 'lucide-react-native';
import Card from '@/components/common/Card';
import { useTheme } from '@/context/ThemeContext';

const PRESET_GOALS_ML = [2000, 2500, 3000];

function WaterGlass({ fillPercent, idx, strokeColor }) {
  const pct = Math.max(0, Math.min(100, fillPercent));

  const iTop = 17;
  const iBot = 72;
  const iH = iBot - iTop;

  const fillH = (iH * pct) / 100;
  const fillY = iBot - fillH;

  const stroke = strokeColor;
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

      {pct > 0 && (
        <G clipPath={`url(#${cid})`}>
          <Rect x="0" y={fillY} width="60" height={fillH + 14} fill={`url(#${gid})`} />
          {pct < 97 && (
            <Ellipse cx="30" cy={fillY} rx="19" ry="2.2" fill="#BAE6FD" opacity="0.55" />
          )}
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

      <Line x1="5" y1="11" x2="13" y2="74" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" />
      <Line x1="55" y1="11" x2="47" y2="74" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" />
      <Ellipse cx="30" cy="11" rx="25" ry="8" stroke={stroke} strokeWidth="4.5" fill="none" />
      <Ellipse cx="30" cy="11" rx="20" ry="5.5" stroke={stroke} strokeWidth="2" fill="none" opacity="0.45" />
      <Ellipse cx="30" cy="74" rx="17" ry="5" stroke={stroke} strokeWidth="4.5" fill="none" />
    </Svg>
  );
}

const SLOT_COUNT = 6;

/**
 * @param {{ glasses: number, totalMl: number, goalMl: number, loading?: boolean, onGlassSlotPress: (slotIndex: number) => Promise<void>, onDeltaMl: (deltaMl: number) => Promise<void>, onChangeGoalMl: (ml: number) => Promise<void> }} props
 */
export default function WaterTracker({
  glasses,
  totalMl,
  goalMl,
  loading = false,
  onGlassSlotPress,
  onDeltaMl,
  onChangeGoalMl,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const displayGlasses = Math.min(glasses, SLOT_COUNT);
  const safeGoal = Math.max(1, goalMl || 2500);
  const currentL = (totalMl / 1000).toFixed(2);
  const goalL = (safeGoal / 1000).toFixed(1);

  const [goalModal, setGoalModal] = useState(false);
  const [customMl, setCustomMl] = useState(String(safeGoal));

  const applyGoal = async (ml) => {
    const n = Math.round(Number(ml) || 0);
    if (n < 500 || n > 20000) return;
    await onChangeGoalMl(n);
    setGoalModal(false);
  };

  return (
    <Card>
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
              <Text style={[styles.count, { color: Colors.primary }]}>
                {currentL}L / {goalL}L
              </Text>
              <Pencil size={14} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.glassesRow}>
        {Array.from({ length: SLOT_COUNT }).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onGlassSlotPress(i)}
            activeOpacity={0.7}
            disabled={loading}
          >
            <WaterGlass fillPercent={i < displayGlasses ? 100 : 0} idx={i} strokeColor={Colors.textPrimary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.waterButton, styles.waterButtonOutline]}
          onPress={() => onDeltaMl(-250)}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.waterButtonTextDark}>- 250</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.waterButton, styles.waterButtonTeal]}
          onPress={() => onDeltaMl(250)}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.waterButtonTextColor}>+250</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.waterButton, styles.waterButtonTeal]}
          onPress={() => onDeltaMl(500)}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.waterButtonTextColor}>+500</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.waterButton, styles.waterButtonTeal]}
          onPress={() => onDeltaMl(750)}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={styles.waterButtonTextColor}>+750</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={goalModal} transparent animationType="fade" onRequestClose={() => setGoalModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setGoalModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.modalBox} onPress={() => {}}>
              <Text style={styles.modalTitle}>Daily water goal</Text>
              <Text style={styles.modalHint}>Saved for this day in Firebase</Text>
              <View style={styles.presetRow}>
                {PRESET_GOALS_ML.map((ml) => (
                  <TouchableOpacity
                    key={ml}
                    style={styles.presetBtn}
                    onPress={() => applyGoal(ml)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.presetBtnText}>{ml} ml</Text>
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
    marginBottom: 14,
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
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  count: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  glassesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  waterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterButtonOutline: {
    backgroundColor: Colors.background,
  },
  waterButtonTeal: {
    backgroundColor: Colors.primaryLight,
  },
  waterButtonTextDark: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  waterButtonTextColor: {
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
  },
  presetBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
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
