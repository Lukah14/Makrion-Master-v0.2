import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Sparkles, Camera, Trash2 } from 'lucide-react-native';
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

export default function MemorableMomentsSection({
  dateKey,
  todayKey,
  dailyMoment,
  loading,
  error,
  onSave,
  onClear,
}) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [moodRating, setMoodRating] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const isOtherDay = dateKey && todayKey && dateKey !== todayKey;
  const noteSectionLabel = isOtherDay ? 'NOTE FOR THIS DAY' : "TODAY'S NOTE";

  const syncKey = dailyMoment
    ? `${dailyMoment.text ?? ''}|${dailyMoment.moodRating ?? ''}|${dailyMoment.photoUrl ?? ''}`
    : '_empty';

  useEffect(() => {
    if (!dailyMoment) {
      setNoteText('');
      setMoodRating(null);
      return;
    }
    setNoteText(dailyMoment.text || '');
    setMoodRating(dailyMoment.moodRating ?? null);
  }, [dateKey, syncKey]);

  const quoteIndex = new Date().getDate() % motivationalQuotes.length;
  const dailyQuote = motivationalQuotes[quoteIndex];

  const hasSavedNote = Boolean(
    dailyMoment && ((dailyMoment.text && dailyMoment.text.trim()) || dailyMoment.moodRating != null),
  );

  const handleSave = useCallback(async () => {
    if (!noteText.trim() && moodRating == null) {
      Alert.alert('Add something', 'Write a note or choose a mood (or clear the day with Clear note).');
      return;
    }
    setSaving(true);
    try {
      await onSave?.({
        text: noteText,
        moodRating,
        photoUrl: dailyMoment?.photoUrl ?? null,
      });
    } catch {
      // parent Alert
    } finally {
      setSaving(false);
    }
  }, [noteText, moodRating, dailyMoment?.photoUrl, onSave]);

  const handleClear = useCallback(() => {
    Alert.alert("Clear this day's note?", 'This removes the saved note for the selected date.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await onClear?.();
          } catch {
            Alert.alert('Could not clear', 'Try again.');
          }
        },
      },
    ]);
  }, [onClear]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Sparkles size={24} color="#F5A623" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Memorable Moments</Text>
            <Text style={styles.subtitle}>
              One note per day — edit anytime. It stays here for this date.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading note…</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <MoodRatingRow rating={moodRating} onRatingChange={setMoodRating} />

        <Text style={styles.sectionLabel}>{noteSectionLabel}</Text>
        <View style={styles.noteInputWrapper}>
          <TextInput
            style={styles.noteInput}
            placeholder="What made this day special? Thought, win, or reflection…"
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
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>{hasSavedNote ? 'Update note' : 'Save note'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {hasSavedNote ? (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7}>
            <Trash2 size={16} color={Colors.error} />
            <Text style={styles.clearBtnText}>Clear note for this day</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.quoteCard}>
        <Text style={styles.quoteText}>{dailyQuote}</Text>
      </View>
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
      marginBottom: 16,
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
      lineHeight: 18,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    loadingText: {
      fontSize: 13,
      color: Colors.textSecondary,
      fontFamily: 'PlusJakartaSans-Medium',
    },
    errorText: {
      fontSize: 13,
      color: Colors.error,
      marginBottom: 12,
      fontFamily: 'PlusJakartaSans-Medium',
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
      minHeight: 100,
      marginBottom: 16,
    },
    noteInput: {
      fontSize: 14,
      color: Colors.textPrimary,
      minHeight: 80,
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
      justifyContent: 'center',
      minHeight: 48,
    },
    saveBtnDisabled: {
      opacity: 0.7,
    },
    saveBtnText: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-Bold',
      color: Colors.onPrimary,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 14,
      paddingVertical: 10,
    },
    clearBtnText: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans-SemiBold',
      color: Colors.error,
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
  });
