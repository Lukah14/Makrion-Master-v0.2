import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Camera, Pencil, Trash2, X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { motivationalQuotes } from '@/data/mockData';

function MoodRatingRow({ rating, onRatingChange }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.moodContainer}>
      <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.moodRow}
        keyboardShouldPersistTaps="handled"
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.moodBtn, rating === num && styles.moodBtnActive]}
            onPress={() => onRatingChange(rating === num ? null : num)}
            activeOpacity={0.7}
          >
            <Text style={[styles.moodNum, rating === num && styles.moodNumActive]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.moodLabels}>
        <Text style={styles.moodLabelText}>Terrible</Text>
        <Text style={styles.moodLabelText}>Perfect</Text>
      </View>
    </View>
  );
}

function confirmDeleteFromList(moment, onDeleteMoment) {
  Alert.alert('Delete moment', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => onDeleteMoment?.(moment.id) },
  ]);
}

function MomentEntry({ moment, onEdit, onDelete }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const bodyText = moment.text
    ? moment.text
    : moment.moodRating != null
      ? `Mood: ${moment.moodRating}/10`
      : '—';

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryRow}>
        <Text style={styles.entryMood} numberOfLines={1}>
          {moment.mood}
        </Text>
        <View style={styles.entryContent}>
          <Text style={styles.entryText} numberOfLines={4} ellipsizeMode="tail">
            {bodyText}
          </Text>
          <Text style={styles.entryDate} numberOfLines={2} ellipsizeMode="tail">
            {moment.date}
          </Text>
        </View>
        {moment.moodRating != null && !!moment.text?.trim() && (
          <View style={styles.entryRatingBadge}>
            <Text style={styles.entryRatingText} numberOfLines={1}>
              {moment.moodRating}/10
            </Text>
          </View>
        )}
        <View style={styles.entryActions}>
          <TouchableOpacity
            style={styles.entryActionBtn}
            onPress={() => onEdit(moment)}
            hitSlop={8}
            accessibilityLabel="Edit moment"
          >
            <Pencil size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.entryActionBtn}
            onPress={() => confirmDeleteFromList(moment, onDelete)}
            hitSlop={8}
            accessibilityLabel="Delete moment"
          >
            <Trash2 size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function EditMomentModal({ visible, moment, onClose, onSave, onDelete }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(null);

  useEffect(() => {
    if (visible && moment) {
      setNote(moment.text || '');
      setRating(moment.moodRating ?? null);
    }
  }, [visible, moment?.id]);

  const handleSavePress = async () => {
    if (!moment) return;
    if (!note.trim() && rating == null) {
      Alert.alert('Moment empty', 'Add a note or pick a mood.');
      return;
    }
    try {
      await onSave(moment.id, { text: note, moodRating: rating });
      onClose();
    } catch {
      // parent already showed Alert
    }
  };

  const handleDeletePress = () => {
    if (!moment) return;
    Alert.alert('Delete moment', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await onDelete(moment.id);
            onClose();
          } catch {
            // parent already showed Alert
          }
        },
      },
    ]);
  };

  if (!moment) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <SafeAreaView edges={['bottom']} style={styles.modalSafe}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit moment</Text>
                <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
                  <X size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
              >
                <MoodRatingRow rating={rating} onRatingChange={setRating} />
                <Text style={styles.sectionLabel}>NOTE</Text>
                <View style={styles.noteInputWrapper}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Thought, win, or reflection..."
                    placeholderTextColor={Colors.textTertiary}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={handleDeletePress}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color={Colors.error} />
                  <Text style={styles.modalDeleteText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSavePress} activeOpacity={0.85}>
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function MemorableMomentsSection({
  moments,
  onSaveMoment,
  onUpdateMoment,
  onDeleteMoment,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [moodRating, setMoodRating] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [editing, setEditing] = useState(null);

  const quoteIndex = new Date().getDate() % motivationalQuotes.length;
  const dailyQuote = motivationalQuotes[quoteIndex];

  const handleSave = async () => {
    if (!noteText.trim() && moodRating == null) return;
    try {
      await onSaveMoment?.({
        text: noteText.trim(),
        moodRating,
        photoUrl: null,
      });
      setNoteText('');
      setMoodRating(null);
    } catch {
      // parent shows Alert
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Sparkles size={24} color="#F5A623" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Memorable Moments</Text>
            <Text style={styles.subtitle}>Capture the best moment of your day</Text>
          </View>
        </View>

        <MoodRatingRow rating={moodRating} onRatingChange={setMoodRating} />

        <Text style={styles.sectionLabel}>TODAY{"'"}S NOTE</Text>
        <View style={styles.noteInputWrapper}>
          <TextInput
            style={styles.noteInput}
            placeholder="What made today special? Write a thought, win, or reflection..."
            placeholderTextColor={Colors.textTertiary}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.photoBtn} activeOpacity={0.7}>
            <Camera size={16} color={Colors.textSecondary} />
            <Text style={styles.photoBtnText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>Save moment</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quoteCard}>
        <Text style={styles.quoteText}>{dailyQuote}</Text>
      </View>

      {moments && moments.length > 0 && (
        <View style={styles.entriesSection}>
          {moments.map((moment) => (
            <MomentEntry
              key={moment.id}
              moment={moment}
              onEdit={setEditing}
              onDelete={onDeleteMoment}
            />
          ))}
        </View>
      )}

      <EditMomentModal
        visible={!!editing}
        moment={editing}
        onClose={() => setEditing(null)}
        onSave={onUpdateMoment}
        onDelete={onDeleteMoment}
      />
    </View>
  );
}

const createStyles = (Colors) =>
  StyleSheet.create({
    container: {
      marginTop: 20,
    },
    card: {
      backgroundColor: Colors.cardBackground,
      borderRadius: Layout.borderRadius.xl,
      padding: 20,
      shadowColor: Colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 20,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 13,
      color: Colors.textTertiary,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    moodContainer: {
      marginBottom: 20,
    },
    moodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 2,
      flexGrow: 1,
    },
    moodBtn: {
      minWidth: 32,
      height: 32,
      paddingHorizontal: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    moodBtnActive: {
      backgroundColor: Colors.textPrimary,
      borderColor: Colors.textPrimary,
    },
    moodNum: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.textPrimary,
    },
    moodNumActive: {
      color: Colors.onPrimary,
    },
    moodLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    moodLabelText: {
      fontSize: 11,
      color: Colors.textTertiary,
    },
    noteInputWrapper: {
      backgroundColor: Colors.background,
      borderRadius: Layout.borderRadius.lg,
      padding: 14,
      minHeight: 80,
      marginBottom: 16,
    },
    noteInput: {
      fontSize: 14,
      color: Colors.textPrimary,
      minHeight: 60,
      lineHeight: 20,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    photoBtnText: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textSecondary,
    },
    saveBtn: {
      flex: 1,
      backgroundColor: Colors.textPrimary,
      paddingVertical: 14,
      borderRadius: 24,
      alignItems: 'center',
    },
    saveBtnText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.onPrimary,
    },
    quoteCard: {
      backgroundColor: '#FFF5ED',
      borderRadius: Layout.borderRadius.lg,
      padding: 16,
      marginTop: 12,
    },
    quoteText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-Medium',
      color: '#B45309',
      fontStyle: 'italic',
      lineHeight: 20,
    },
    entriesSection: {
      marginTop: 12,
      gap: 8,
    },
    entryCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: Layout.borderRadius.lg,
      padding: 14,
      shadowColor: Colors.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    entryMood: {
      fontSize: 26,
      lineHeight: 32,
      marginTop: 2,
      maxWidth: 44,
      flexShrink: 0,
      textAlign: 'center',
    },
    entryContent: {
      flex: 1,
      minWidth: 0,
    },
    entryText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-Medium',
      color: Colors.textPrimary,
      flexShrink: 1,
    },
    entryDate: {
      fontSize: 12,
      color: Colors.textTertiary,
      marginTop: 4,
      flexShrink: 1,
    },
    entryRatingBadge: {
      backgroundColor: Colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      maxWidth: 72,
      flexShrink: 0,
      alignSelf: 'flex-start',
    },
    entryRatingText: {
      fontSize: 11,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.primary,
      textAlign: 'center',
    },
    entryActions: {
      flexShrink: 0,
      alignItems: 'center',
      gap: 10,
      paddingTop: 2,
    },
    entryActionBtn: {
      padding: 4,
    },
    modalRoot: {
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    modalCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: Layout.borderRadius.xl,
      maxHeight: '88%',
      overflow: 'hidden',
    },
    modalSafe: {
      maxHeight: '100%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.divider,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.textPrimary,
    },
    modalScroll: {
      maxHeight: 360,
      paddingHorizontal: 18,
      paddingTop: 12,
    },
    modalActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors.divider,
    },
    modalDeleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    modalDeleteText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.error,
    },
    modalSaveBtn: {
      flex: 1,
      backgroundColor: Colors.textPrimary,
      paddingVertical: 14,
      borderRadius: 24,
      alignItems: 'center',
    },
    modalSaveText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.onPrimary,
    },
  });
