import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { useWeightEntries } from '@/hooks/useWeightEntries';
import { validateWeightKg, validateDateKey } from '@/lib/settingsValidation';

function entryDateKey(e) {
  if (e?.dateKey) return String(e.dateKey).slice(0, 10);
  if (e?.date) return String(e.date).slice(0, 10);
  const id = String(e?.id || '');
  if (id.startsWith('weight_')) return id.slice(7, 17);
  return '';
}

export default function WeightHistoryScreen() {
  const { colors: Colors } = useTheme();
  const s = createStyles(Colors);
  const { entries, loading, add, removeByDateKey, moveEntry, reload } = useWeightEntries();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [formDate, setFormDate] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const openAdd = useCallback(() => {
    setEditingKey(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormWeight('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((e) => {
    const dk = entryDateKey(e);
    setEditingKey(dk);
    setFormDate(dk);
    setFormWeight(e.weightKg != null ? String(e.weightKg) : '');
    setModalOpen(true);
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setEditingKey(null);
  };

  const onSaveEntry = async () => {
    const vd = validateDateKey(formDate);
    if (!vd.ok) {
      Alert.alert('Date', vd.error);
      return;
    }
    const vw = validateWeightKg(formWeight);
    if (!vw.ok) {
      Alert.alert('Weight', vw.error);
      return;
    }

    setSaving(true);
    try {
      if (editingKey && editingKey !== vd.value) {
        await moveEntry(editingKey, vd.value, vw.value);
      } else {
        await add({ dateKey: vd.value, weightKg: vw.value });
      }
      closeModal();
      await reload();
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = useCallback(
    (e) => {
      const dk = entryDateKey(e);
      if (!dk) return;
      Alert.alert('Delete weigh-in', `Remove entry for ${dk}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeByDateKey(dk);
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not delete');
            }
          },
        },
      ]);
    },
    [removeByDateKey],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const dk = entryDateKey(item);
      const w = item.weightKg != null ? Number(item.weightKg) : null;
      return (
        <View style={s.row}>
          <View style={s.rowBody}>
            <Text style={s.rowDate}>{dk}</Text>
            <Text style={s.rowWeight}>{w != null && Number.isFinite(w) ? `${w} kg` : '—'}</Text>
          </View>
          <TouchableOpacity style={s.iconHit} onPress={() => openEdit(item)} hitSlop={8}>
            <Pencil size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconHit} onPress={() => onDelete(item)} hitSlop={8}>
            <Trash2 size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      );
    },
    [Colors.error, Colors.textSecondary, s, openEdit, onDelete],
  );

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <Plus size={18} color={Colors.onPrimary} />
          <Text style={s.addBtnText}>Add weigh-in</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id || entryDateKey(item)}
          renderItem={renderItem}
          contentContainerStyle={entries.length === 0 ? s.emptyList : s.list}
          ListEmptyComponent={
            <Text style={s.emptyText}>No weigh-ins yet. Tap Add to log your first weight.</Text>
          }
        />
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeModal}>
          <TouchableOpacity style={s.modalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={s.modalTitle}>{editingKey ? 'Edit weigh-in' : 'New weigh-in'}</Text>
            <Text style={s.modalLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={s.modalInput}
              value={formDate}
              onChangeText={setFormDate}
              placeholder="2026-04-03"
              placeholderTextColor={Colors.textTertiary}
              selectionColor={Colors.textPrimary}
            />
            <Text style={s.modalLabel}>Weight (kg)</Text>
            <TextInput
              style={s.modalInput}
              value={formWeight}
              onChangeText={setFormWeight}
              keyboardType="decimal-pad"
              placeholder="70.5"
              placeholderTextColor={Colors.textTertiary}
              selectionColor={Colors.textPrimary}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={closeModal}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalSave}
                onPress={() => void onSaveEntry()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={s.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    toolbar: { paddingHorizontal: Layout.screenPadding, paddingVertical: 12 },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: Colors.textPrimary,
      borderRadius: Layout.borderRadius.lg,
      paddingVertical: 14,
    },
    addBtnText: { fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
    list: { paddingHorizontal: Layout.screenPadding, paddingBottom: 24 },
    emptyList: { flexGrow: 1, padding: Layout.screenPadding },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.cardBackground,
      borderRadius: Layout.borderRadius.lg,
      padding: 14,
      marginBottom: 10,
      ...Layout.cardShadow,
    },
    rowBody: { flex: 1 },
    rowDate: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textPrimary },
    rowWeight: { fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: Colors.textSecondary, marginTop: 4 },
    iconHit: { padding: 8 },
    emptyText: { textAlign: 'center', color: Colors.textTertiary, fontFamily: 'PlusJakartaSans-Regular', marginTop: 40 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: 24,
    },
    modalBox: {
      backgroundColor: Colors.cardBackground,
      borderRadius: Layout.borderRadius.xl,
      padding: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      marginBottom: 16,
    },
    modalLabel: {
      fontSize: 12,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textTertiary,
      marginBottom: 6,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: Colors.textPrimary,
      marginBottom: 14,
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalCancel: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    modalCancelText: { fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.textSecondary },
    modalSave: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: Colors.textPrimary,
    },
    modalSaveText: { fontFamily: 'PlusJakartaSans-Bold', color: Colors.onPrimary },
  });
