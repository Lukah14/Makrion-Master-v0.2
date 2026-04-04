import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Alert,
} from 'react-native';
import {
  CircleCheck as CheckCircle2,
  Clock,
  Flame,
  Dumbbell,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { calcTotalCaloriesBurned } from '@/services/activityService';
import { editorTypeFromEntry, displayTypeLabel } from '@/lib/activityTypes';

function formatCreatedAt(ts) {
  if (!ts) return '';
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDurationMinutesLabel(entry) {
  const m = Number(entry?.durationMinutes);
  if (!Number.isFinite(m) || m <= 0) return '';
  const rounded = Math.abs(m - Math.round(m)) < 1e-6 ? String(Math.round(m)) : String(m);
  return `${rounded} min`;
}

/** Extra detail under the title (duration is on the title: "Name · X min"). */
function buildSubtitle(entry) {
  const t = editorTypeFromEntry(entry);
  const parts = [];
  if (entry.typeOfExercise || entry.intensity) {
    const tag = [entry.typeOfExercise, entry.intensity].filter(Boolean).join(' · ');
    if (tag) parts.push(tag);
  }
  if (t === 'reps' || entry.type === 'strength') {
    const s = entry.sets;
    const r = entry.repsPerSet ?? entry.reps;
    if (s != null && r != null) parts.push(`${s}×${r} reps`);
  }
  const dk = Number(entry.distanceKm) || 0;
  if (dk > 0) parts.push(`${dk} km`);
  else if (entry.distanceMeters != null && Number(entry.distanceMeters) > 0) {
    parts.push(`${entry.distanceMeters} m`);
  }
  return parts.join(' · ') || '';
}

function SummaryCard({ icon, label, value, sub, color, bg }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  return (
    <View style={[s.summaryCard, { backgroundColor: bg }]}>
      <View style={[s.summaryIcon, { backgroundColor: color + '22' }]}>
        {icon}
      </View>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
      {sub ? <Text style={s.summarySub}>{sub}</Text> : null}
    </View>
  );
}

function ActivityCard({ entry, onEdit, onDelete }) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const [menuOpen, setMenuOpen] = useState(false);
  const typeLabel = displayTypeLabel(editorTypeFromEntry(entry));
  const kcal = Number(entry.caloriesBurned) || 0;
  const timeStr = formatCreatedAt(entry.createdAt);
  const fromLibrary = entry.source === 'firestore';
  const instructionText = entry.shortInstructions || entry.instructions;
  const durationPart = formatDurationMinutesLabel(entry);
  const titleText = durationPart ? `${entry.name} · ${durationPart}` : entry.name;
  const subtitleText = buildSubtitle(entry);

  return (
    <View style={s.card}>
      <View style={s.cardRow}>
        <View style={s.cardCheck}>
          <CheckCircle2 size={18} color={Colors.success} />
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardName}>{titleText}</Text>
          <View style={s.cardMeta}>
            <Text style={s.typePill}>{typeLabel}</Text>
            {fromLibrary ? <Text style={s.libPill}>Library</Text> : null}
            {timeStr ? (
              <>
                <Text style={s.metaDot}>·</Text>
                <Clock size={11} color={Colors.textTertiary} />
                <Text style={s.metaText}>{timeStr}</Text>
              </>
            ) : null}
            {kcal > 0 ? (
              <>
                <Text style={s.metaDot}>·</Text>
                <Flame size={11} color={Colors.calories} />
                <Text style={s.metaText}>{kcal} kcal</Text>
              </>
            ) : null}
          </View>
          {subtitleText ? <Text style={s.subtitle}>{subtitleText}</Text> : null}
          {instructionText ? (
            <Text style={s.instructionTeaser} numberOfLines={2}>
              {instructionText}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={s.menuBtn}
          onPress={() => setMenuOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.menuBtnText}>···</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={s.menuBox}>
            <Text style={s.menuTitle}>{entry.name}</Text>
            <View style={s.menuDivider} />
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onEdit(entry);
              }}
            >
              <Pencil size={16} color={Colors.primary} />
              <Text style={s.menuItemText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                setMenuOpen(false);
                Alert.alert(
                  'Remove activity',
                  'Delete this log entry?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDelete(entry.id) },
                  ],
                );
              }}
            >
              <Trash2 size={16} color={Colors.error} />
              <Text style={[s.menuItemText, { color: Colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function TodayPage({
  entries = [],
  loading = false,
  onAdd,
  onEdit,
  onDelete,
}) {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);

  const totalCal = calcTotalCaloriesBurned(entries);
  const totalMin = entries.reduce((sum, e) => sum + (Number(e.durationMinutes) || 0), 0);

  return (
    <View>
      <View style={s.summaryRow}>
        <SummaryCard
          icon={<Clock size={18} color={Colors.primary} />}
          label="Minutes"
          value={totalMin}
          sub="total"
          color={Colors.primary}
          bg={Colors.primaryLight}
        />
        <SummaryCard
          icon={<CheckCircle2 size={18} color={Colors.success} />}
          label="Activities"
          value={loading ? '…' : entries.length}
          sub="today"
          color={Colors.success}
          bg={Colors.successLight}
        />
        <SummaryCard
          icon={<Flame size={18} color={Colors.calories} />}
          label="Burned"
          value={totalCal}
          sub="kcal"
          color={Colors.calories}
          bg={Colors.caloriesLight}
        />
      </View>

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Activities</Text>
        <TouchableOpacity style={s.addBtn} onPress={onAdd} activeOpacity={0.7}>
          <Plus size={14} color={Colors.primary} />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {entries.length === 0 && !loading ? (
        <View style={s.emptyState}>
          <Dumbbell size={32} color={Colors.textTertiary} />
          <Text style={s.emptyTitle}>Nothing logged yet</Text>
          <Text style={s.emptySub}>Tap Add or the + button to log this day</Text>
        </View>
      ) : (
        entries.map((item) => (
          <ActivityCard
            key={item.id}
            entry={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Layout.borderRadius.lg,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    ...Layout.cardShadow,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  summarySub: {
    fontSize: 9,
    color: Colors.textTertiary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: Colors.textPrimary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.primary },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    padding: 14,
    marginBottom: 10,
    ...Layout.cardShadow,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  metaText: { fontSize: 12, color: Colors.textTertiary },
  metaDot: { fontSize: 12, color: Colors.textTertiary },
  typePill: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
    backgroundColor: Colors.innerCard,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  libPill: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  instructionTeaser: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 6,
    lineHeight: 17,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnText: {
    fontSize: 18,
    color: Colors.textTertiary,
    marginTop: -4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    ...Layout.cardShadow,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary, marginTop: 10 },
  emptySub: { fontSize: 13, color: Colors.textTertiary, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuBox: {
    width: '100%',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.xl,
    overflow: 'hidden',
    ...Layout.cardShadow,
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    padding: 16,
  },
  menuDivider: { height: 1, backgroundColor: Colors.divider },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuItemText: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: Colors.textPrimary },
});
