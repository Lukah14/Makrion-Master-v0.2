import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { listActiveExerciseDefinitions } from '@/services/exerciseDefinitionService';
import { filterValidExerciseDefinitions } from '@/lib/exerciseNormalize';

function DetailRow({ label, value, styles }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function FirestoreExercisePickerModal({ visible, onClose, onPick }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [step, setStep] = useState('list');
  const [query, setQuery] = useState('');
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listActiveExerciseDefinitions();
      setAll(rows);
    } catch (e) {
      setError(e?.message || 'Could not load exercises');
      setAll([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setStep('list');
    setSelected(null);
    setQuery('');
    loadAll();
  }, [visible, loadAll]);

  const validExercises = useMemo(() => filterValidExerciseDefinitions(all), [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return validExercises;
    return validExercises.filter((row) =>
      String(row.name ?? '')
        .toLowerCase()
        .includes(q),
    );
  }, [validExercises, query]);

  const handlePick = () => {
    if (!selected) return;
    onPick(selected);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {step === 'list' ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Exercise library</Text>
                <TouchableOpacity onPress={onClose} style={styles.iconBtn} hitSlop={12}>
                  <X size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.sub}>Search by name, open details (MET, kcal/h), then log for your day.</Text>

              <View style={styles.searchRow}>
                <Search size={18} color={Colors.textTertiary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search by exercise name…"
                  placeholderTextColor={Colors.textTertiary}
                  returnKeyType="search"
                  selectionColor={Colors.textPrimary}
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {loading ? (
                <ActivityIndicator style={{ marginTop: 24 }} color={Colors.textTertiary} />
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => {
                        setSelected(item);
                        setStep('detail');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rowName} numberOfLines={2}>{item.name}</Text>
                      <View style={styles.rowMeta}>
                        <Text style={styles.rowType}>{item.typeOfExercise}</Text>
                        <Text style={styles.rowCat} numberOfLines={1}>{item.intensity}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    !loading ? (
                      <Text style={styles.empty}>
                        {validExercises.length === 0
                          ? 'No exercises available.'
                          : 'No matches. Try another search.'}
                      </Text>
                    ) : null
                  }
                />
              )}
            </>
          ) : (
            <>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backWrap}
                  onPress={() => {
                    setStep('list');
                    setSelected(null);
                  }}
                  hitSlop={12}
                >
                  <ChevronLeft size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, styles.titleFlex]} numberOfLines={2}>
                  {selected?.name}
                </Text>
                <View style={{ width: 32 }} />
              </View>

              <View style={styles.detailBody}>
                <Text style={styles.detailHeading}>Details</Text>
                <View style={styles.detailTable}>
                  <DetailRow label="Type" value={selected?.typeOfExercise || '—'} styles={styles} />
                  <DetailRow label="Intensity" value={selected?.intensity || '—'} styles={styles} />
                  <DetailRow
                    label="MET"
                    value={selected?.met != null ? String(selected.met) : '—'}
                    styles={styles}
                  />
                  <DetailRow
                    label="kcal/hr (80 kg)"
                    value={
                      selected?.kcalsPerHour80kg != null ? String(selected.kcalsPerHour80kg) : '—'
                    }
                    styles={styles}
                  />
                </View>
                {selected?.shortInstructions?.trim() ? (
                  <>
                    <Text style={[styles.detailHeading, { marginTop: 18 }]}>How to perform</Text>
                    <View style={styles.instructionsBox}>
                      <Text style={styles.instructionsText}>{selected.shortInstructions.trim()}</Text>
                    </View>
                  </>
                ) : null}
              </View>

              <View style={styles.footer}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handlePick}>
                  <Text style={styles.primaryBtnText}>Use for log</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cardBackground },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 8,
    gap: 8,
  },
  backWrap: { padding: 4, marginRight: 4 },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
  },
  titleFlex: { flex: 1 },
  iconBtn: { padding: 4 },
  sub: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: Layout.screenPadding,
    marginBottom: 12,
    lineHeight: 19,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Layout.screenPadding,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  error: {
    color: Colors.error,
    fontSize: 13,
    paddingHorizontal: Layout.screenPadding,
    marginBottom: 8,
  },
  listContent: { paddingHorizontal: Layout.screenPadding, paddingBottom: 24 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rowName: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rowType: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textSecondary,
  },
  rowCat: { fontSize: 12, color: Colors.textTertiary, flex: 1 },
  empty: { textAlign: 'center', color: Colors.textTertiary, marginTop: 32, fontSize: 14, paddingHorizontal: 16 },
  detailBody: { flex: 1, paddingHorizontal: Layout.screenPadding, paddingTop: 8 },
  detailTable: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textTertiary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  detailHeading: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  instructionsBox: {
    maxHeight: 280,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: Layout.screenPadding,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.textPrimary,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.textPrimary,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.onPrimary,
  },
});
