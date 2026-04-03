import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import StepDots from './StepDots';
import WizardStepCategory from './WizardStepCategory';
import WizardStepType from './WizardStepType';
import WizardStepDefine from './WizardStepDefine';
import WizardStepSchedule from './WizardStepSchedule';
import { getIconNameForCategory } from './habitIconMap';

const TOTAL_STEPS = 4;

export default function AddHabitWizard({ visible, onClose, onSave, editingHabit }) {
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(editingHabit?.category ? { name: editingHabit.category } : null);
  const [habitType, setHabitType] = useState(editingHabit?.type || '');
  const [habitName, setHabitName] = useState(editingHabit?.name || '');
  const [description, setDescription] = useState(editingHabit?.description || '');
  const [targetValue, setTargetValue] = useState(editingHabit?.target?.toString() || '');
  const [targetUnit, setTargetUnit] = useState(editingHabit?.unit || '');
  const [checklistItems, setChecklistItems] = useState(editingHabit?.checklistItems || []);
  const [condition, setCondition] = useState('At least');
  const [timerValue, setTimerValue] = useState('00:20');
  const [extraGoals, setExtraGoals] = useState([
    { label: 'Weekly goal', value: '' },
    { label: 'Monthly goal', value: '' },
    { label: 'Yearly goal', value: '' },
    { label: 'All time goal', value: '' },
    { label: 'Single time goal', value: '' },
  ]);
  const [repeatRule, setRepeatRule] = useState(editingHabit?.repeatRule || 'daily');
  const [repeatDays, setRepeatDays] = useState(editingHabit?.repeatDays || []);
  const [endDateEnabled, setEndDateEnabled] = useState(editingHabit?.endDateEnabled || false);
  const [endDateDays, setEndDateDays] = useState(editingHabit?.endDateDays?.toString() || '60');
  const [showScheduleDetails, setShowScheduleDetails] = useState(false);

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedCategory(null);
    setHabitType('');
    setHabitName('');
    setDescription('');
    setTargetValue('');
    setTargetUnit('');
    setChecklistItems([]);
    setCondition('At least');
    setTimerValue('00:20');
    setExtraGoals([
      { label: 'Weekly goal', value: '' },
      { label: 'Monthly goal', value: '' },
      { label: 'Yearly goal', value: '' },
      { label: 'All time goal', value: '' },
      { label: 'Single time goal', value: '' },
    ]);
    setRepeatRule('daily');
    setRepeatDays([]);
    setEndDateEnabled(false);
    setEndDateDays('60');
    setShowScheduleDetails(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBack = () => {
    if (currentStep === 4 && showScheduleDetails) {
      setShowScheduleDetails(false);
      return;
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      handleClose();
    }
  };

  const handleNext = () => {
    if (currentStep === 4 && !showScheduleDetails) {
      setShowScheduleDetails(true);
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSave = () => {
    const habitData = {
      id: editingHabit?.id || `h-${Date.now()}`,
      name: habitName,
      type: habitType,
      category: selectedCategory?.name || 'Other',
      description,
      emoji: getDefaultEmoji(selectedCategory?.name),
      iconName: selectedCategory?.iconName || getIconNameForCategory(selectedCategory?.name),
      target: parseInt(targetValue) || 1,
      current: 0,
      unit: targetUnit,
      checklistItems: habitType === 'checklist' ? checklistItems : null,
      repeatRule,
      repeatDays,
      startDate: new Date().toISOString().split('T')[0],
      endDate: endDateEnabled ? null : null,
      endDateEnabled,
      endDateDays: endDateEnabled ? parseInt(endDateDays) : null,
      reminderTime: null,
      reminderCount: 0,
      priority: 'default',
      color: selectedCategory?.iconBgColor || '#2DA89E',
      iconBg: selectedCategory?.iconBgColor || '#2DA89E',
      iconColor: selectedCategory?.iconColor || '#000000',
      isPaused: false,
      isArchived: false,
      streak: 0,
      completed: false,
      sortOrder: 0,
    };
    onSave(habitData);
    handleClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedCategory;
      case 2: return !!habitType;
      case 3: return habitName.trim().length > 0;
      case 4: return true;
      default: return false;
    }
  };

  const getStepForDots = () => {
    if (currentStep === 4 && showScheduleDetails) return 4;
    return currentStep;
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setTimeout(() => setCurrentStep(2), 200);
  };

  const handleTypeSelect = (type) => {
    setHabitType(type);
    setTimeout(() => setCurrentStep(3), 200);
  };

  const isLastStep = currentStep === 4 && showScheduleDetails;
  const showNext = currentStep >= 3 && !isLastStep;
  const showSave = isLastStep;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {currentStep === 1 && (
            <WizardStepCategory
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
            />
          )}
          {currentStep === 2 && (
            <WizardStepType
              selectedType={habitType}
              onSelectType={handleTypeSelect}
            />
          )}
          {currentStep === 3 && (
            <WizardStepDefine
              habitName={habitName}
              onNameChange={setHabitName}
              description={description}
              onDescriptionChange={setDescription}
              habitType={habitType}
              targetValue={targetValue}
              onTargetValueChange={setTargetValue}
              targetUnit={targetUnit}
              onTargetUnitChange={setTargetUnit}
              timerValue={timerValue}
              onTimerValueChange={setTimerValue}
              condition={condition}
              onConditionChange={setCondition}
              extraGoals={extraGoals}
              onExtraGoalsChange={setExtraGoals}
              checklistItems={checklistItems}
              onChecklistItemsChange={setChecklistItems}
            />
          )}
          {currentStep === 4 && (
            <WizardStepSchedule
              repeatRule={repeatRule}
              onRepeatRuleChange={setRepeatRule}
              repeatDays={repeatDays}
              onRepeatDaysChange={setRepeatDays}
              endDateEnabled={endDateEnabled}
              onEndDateEnabledChange={setEndDateEnabled}
              endDateDays={endDateDays}
              onEndDateDaysChange={setEndDateDays}
              showScheduleDetails={showScheduleDetails}
            />
          )}
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backText}>{currentStep === 1 ? 'CANCEL' : 'BACK'}</Text>
          </TouchableOpacity>

          <StepDots totalSteps={TOTAL_STEPS} currentStep={getStepForDots()} />

          {showNext && (
            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextBtn}
              activeOpacity={0.7}
              disabled={!canProceed()}
            >
              <Text style={[styles.nextText, !canProceed() && styles.nextTextDisabled]}>NEXT</Text>
            </TouchableOpacity>
          )}

          {showSave && (
            <TouchableOpacity
              onPress={handleSave}
              style={styles.nextBtn}
              activeOpacity={0.7}
              disabled={!canProceed()}
            >
              <Text style={[styles.nextText, !canProceed() && styles.nextTextDisabled]}>SAVE</Text>
            </TouchableOpacity>
          )}

          {!showNext && !showSave && <View style={styles.placeholder} />}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function getDefaultEmoji(categoryName) {
  const emojiMap = {
    'Health': '\uD83D\uDCA7',
    'Nutrition': '\uD83E\uDD66',
    'Movement': '\uD83D\uDCAA',
    'Mind': '\uD83E\uDDD8',
    'Study': '\uD83D\uDCDA',
    'Work': '\uD83D\uDCBC',
    'Home': '\uD83C\uDFE0',
    'Outdoor': '\uD83C\uDFD5\uFE0F',
    'Art': '\uD83C\uDFA8',
    'Sports': '\u26BD',
    'Social': '\uD83D\uDCAC',
    'Finance': '\uD83D\uDCB0',
    'Entertainment': '\uD83C\uDFAC',
    'Meditation': '\uD83E\uDDD8',
  };
  return emojiMap[categoryName] || '\u2B50';
}

function getCategoryIconBg(categoryName) {
  const bgMap = {
    'Health': '#E8F4FD', 'Nutrition': '#FFF3E0', 'Movement': '#FDECEA',
    'Mind': '#F3E8FD', 'Study': '#E6F7F5', 'Work': '#FFF8ED',
    'Home': '#FFF3E0', 'Outdoor': '#FDECEA', 'Art': '#FDECEA',
    'Sports': '#E8F4FD', 'Social': '#DCFCE7', 'Finance': '#FFF8ED',
  };
  return bgMap[categoryName] || '#F3F4F6';
}

function getCategoryIconColor(categoryName) {
  const colorMap = {
    'Health': '#4A9BD9', 'Nutrition': '#F5A623', 'Movement': '#E86C5D',
    'Mind': '#9B59B6', 'Study': '#2DA89E', 'Work': '#F5A623',
    'Home': '#F97316', 'Outdoor': '#E86C5D', 'Art': '#EC4899',
    'Sports': '#3B82F6', 'Social': '#22C55E', 'Finance': '#A3E635',
  };
  return colorMap[categoryName] || '#6B7280';
}

const createStyles = (Colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backBtn: {
    minWidth: 70,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  nextBtn: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  nextText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    color: Colors.error,
    letterSpacing: 0.5,
  },
  nextTextDisabled: {
    opacity: 0.4,
  },
  placeholder: {
    minWidth: 70,
  },
});
