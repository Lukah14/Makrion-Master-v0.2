import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

const TYPES = [
  {
    id: 'yesno',
    label: 'WITH A YES OR NO',
    description: 'Record whether you succeed with the activity or not',
    premium: false,
  },
  {
    id: 'numeric',
    label: 'WITH A NUMERIC VALUE',
    description: 'Establish a value as a daily goal or limit for the habit',
    premium: false,
  },
  {
    id: 'timer',
    label: 'WITH A TIMER',
    description: 'Establish a time value as a daily goal or limit for the habit',
    premium: false,
  },
];

export default function WizardStepType({ selectedType, onSelectType }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>How do you want to evaluate your progress?</Text>

      <View style={styles.options}>
        {TYPES.map((type) => (
          <View key={type.id} style={styles.optionWrapper}>
            <TouchableOpacity
              style={[
                styles.button,
                selectedType === type.id && styles.buttonSelected,
                type.premium && styles.buttonPremium,
              ]}
              onPress={() => onSelectType(type.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, type.premium && styles.buttonTextPremium]}>
                {type.label}
              </Text>
            </TouchableOpacity>
            <Text style={styles.description}>{type.description}</Text>
            {type.premium && <Text style={styles.premiumLabel}>Premium feature</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 28,
    marginTop: 10,
    lineHeight: 30,
  },
  options: {
    gap: 16,
  },
  optionWrapper: {
    alignItems: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: Colors.error,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: '#A02040',
    borderWidth: 2,
    borderColor: Colors.textWhite,
  },
  buttonPremium: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: Colors.textWhite,
    letterSpacing: 0.5,
  },
  buttonTextPremium: {
    opacity: 0.8,
  },
  description: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  premiumLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.error,
    marginTop: 4,
  },
});
