import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, Camera } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { Layout } from '@/constants/layout';
import { motivationalQuotes } from '@/data/mockData';

function MoodRatingRow({ rating, onRatingChange }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.moodContainer}>
      <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>
      <View style={styles.moodRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.moodBtn, rating === num && styles.moodBtnActive]}
            onPress={() => onRatingChange(num)}
            activeOpacity={0.7}
          >
            <Text style={[styles.moodNum, rating === num && styles.moodNumActive]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.moodLabels}>
        <Text style={styles.moodLabelText}>Terrible</Text>
        <Text style={styles.moodLabelText}>Perfect</Text>
      </View>
    </View>
  );
}

function MomentEntry({ moment }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryRow}>
        <Text style={styles.entryMood}>{moment.mood}</Text>
        <View style={styles.entryContent}>
          <Text style={styles.entryText}>{moment.text}</Text>
          <Text style={styles.entryDate}>{moment.date}</Text>
        </View>
        {moment.moodRating && (
          <View style={styles.entryRatingBadge}>
            <Text style={styles.entryRatingText}>{moment.moodRating}/10</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function MemorableMomentsSection({ moments, onSaveMoment }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  const [moodRating, setMoodRating] = useState(null);
  const [noteText, setNoteText] = useState('');

  const quoteIndex = new Date().getDate() % motivationalQuotes.length;
  const dailyQuote = motivationalQuotes[quoteIndex];

  const handleSave = () => {
    if (noteText.trim() || moodRating) {
      onSaveMoment?.({
        text: noteText.trim(),
        moodRating,
        photoUrl: null,
      });
      setNoteText('');
      setMoodRating(null);
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

        <Text style={styles.sectionLabel}>TODAY'S NOTE</Text>
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
            <MomentEntry key={moment.id} moment={moment} />
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
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
    justifyContent: 'space-between',
    gap: 4,
  },
  moodBtn: {
    width: 32,
    height: 32,
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
    alignItems: 'center',
  },
  entryMood: {
    fontSize: 28,
    marginRight: 12,
  },
  entryContent: {
    flex: 1,
  },
  entryText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: Colors.textPrimary,
  },
  entryDate: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  entryRatingBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  entryRatingText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
});
