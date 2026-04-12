import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import StepDots from './StepDots';
import WizardStepCategory from './WizardStepCategory';
import WizardStepType from './WizardStepType';
import WizardStepDefine from './WizardStepDefine';
import WizardStepSchedule from './WizardStepSchedule';
import { getIconNameForCategory } from './habitIconMap';
import {
  displayLabelToConditionType,
  conditionTypeToDisplayLabel,
  normalizeNumericConditionType,
  NUMERIC_CONDITION,
} from '@/lib/habitNumericCondition';
import { deriveFrequencyStateFromHabit } from '@/lib/habitEditForm';
import { validateFrequencyFormState } from '@/lib/habitFrequency';

function parseGoalNumber(str) {
  const n = parseFloat(String(str ?? '').replace(',', '.').trim());
  return Number.isFinite(n) ? n : NaN;
}

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
  const [repeatRule, setRepeatRule] = useState('daily');
  const [repeatDays, setRepeatDays] = useState([]);
  const [yearlyDates, setYearlyDates] = useState([]);
  const [cadenceCount, setCadenceCount] = useState(1);
  const [cadenceUnit, setCadenceUnit] = useState('week');
  const [intervalEvery, setIntervalEvery] = useState(2);
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
    setYearlyDates([]);
    setCadenceCount(1);
    setCadenceUnit('week');
    setIntervalEvery(2);
    setEndDateEnabled(false);
    setEndDateDays('60');
    setShowScheduleDetails(false);
  };

  useEffect(() => {
    if (!visible) return;
    if (editingHabit) {
      setCurrentStep(1);
      setSelectedCategory(editingHabit?.category ? { name: editingHabit.category } : null);
      setHabitType(editingHabit.type || '');
      setHabitName(editingHabit.name || '');
      setDescription(editingHabit.description || '');
      if (editingHabit.type === 'numeric') {
        const ct = normalizeNumericConditionType(editingHabit);
        setCondition(conditionTypeToDisplayLabel(ct));
        setTargetValue(
          ct === NUMERIC_CONDITION.ANY_VALUE
            ? ''
            : String(editingHabit.target ?? editingHabit.targetValue ?? ''),
        );
      } else {
        setTargetValue(editingHabit?.target != null ? String(editingHabit.target) : '');
      }
      setTargetUnit(editingHabit.unit || '');
      setChecklistItems(editingHabit.checklistItems || []);
      const f = deriveFrequencyStateFromHabit(editingHabit);
      setRepeatRule(f.repeatRule);
      setRepeatDays(f.repeatDays);
      setYearlyDates(f.yearlyDates || []);
      setCadenceCount(f.cadenceCount);
      setCadenceUnit(f.cadenceUnit || 'week');
      setIntervalEvery(f.intervalEvery);
      setEndDateEnabled(editingHabit.endDateEnabled || false);
      setEndDateDays(editingHabit.endDateDays?.toString() || '60');
      setShowScheduleDetails(false);
    } else {
      resetForm();
    }
  }, [visible, editingHabit?.id]);

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

  const handleRepeatRuleChange = (id) => {
    setRepeatRule(id);
    if (id !== 'specific_days_week' && id !== 'specific_days_month') setRepeatDays([]);
    if (id !== 'specific_days_year') setYearlyDates([]);
    if (id === 'some_days_period') {
      setCadenceCount(1);
      setCadenceUnit('week');
    }
    if (id === 'repeat') setIntervalEvery(2);
  };

  const handleNext = () => {
    if (currentStep === 4 && !showScheduleDetails) {
      const v = validateFrequencyFormState({
        repeatRule,
        repeatDays,
        yearlyDates,
        cadenceCount,
        cadenceUnit,
        intervalEvery,
      });
      if (!v.ok) {
        Alert.alert('Frequency', v.message || 'Check your schedule options.');
        return;
      }
      setShowScheduleDetails(true);
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSave = () => {
    const fv = validateFrequencyFormState({
      repeatRule,
      repeatDays,
      yearlyDates,
      cadenceCount,
      cadenceUnit,
      intervalEvery,
    });
    if (!fv.ok) {
      Alert.alert('Frequency', fv.message || 'Check your schedule options.');
      return;
    }
    const numericCondition =
      habitType === 'numeric' ? displayLabelToConditionType(condition) : 'at_least';
    let resolvedTarget = null;
    if (habitType === 'numeric') {
      if (numericCondition === NUMERIC_CONDITION.ANY_VALUE) {
        resolvedTarget = null;
      } else {
        const g = parseGoalNumber(targetValue);
        resolvedTarget = Number.isFinite(g) && g > 0 ? g : 1;
      }
    } else {
      resolvedTarget = parseInt(targetValue, 10) || 1;
    }

    const habitData = {
      id: editingHabit?.id || `h-${Date.now()}`,
      name: habitName,
      type: habitType,
      category: selectedCategory?.name || 'Other',
      description,
      emoji: getDefaultEmoji(selectedCategory?.name),
      iconName: selectedCategory?.iconName || getIconNameForCategory(selectedCategory?.name),
      conditionType: habitType === 'numeric' ? numericCondition : undefined,
      target: resolvedTarget,
      targetValue: resolvedTarget,
      current: editingHabit?.current ?? 0,
      unit: targetUnit,
      checklistItems: habitType === 'checklist' ? checklistItems : null,
      repeatRule,
      repeatDays,
      yearlyDates,
      cadenceCount,
      cadenceUnit,
      intervalEvery,
      startDate:
        (typeof editingHabit?.startDate === 'string' && editingHabit.startDate.length >= 10
          ? editingHabit.startDate.slice(0, 10)
          : null) ||
        editingHabit?.schedule?.startDateKey ||
        new Date().toISOString().split('T')[0],
      endDate: endDateEnabled ? null : null,
      endDateEnabled,
      endDateDays: endDateEnabled ? parseInt(endDateDays) : null,
      reminderTime: null,
      reminderCount: 0,
      priority: 'default',
      color: selectedCategory?.iconBgColor || '#2DA89E',
      iconBg: selectedCategory?.iconBgColor || '#2DA89E',
      iconColor: selectedCategory?.iconColor || '#000000',
      isPaused: editingHabit?.isPaused ?? false,
      isArchived: false,
      streak: editingHabit?.streak ?? 0,
      completed: editingHabit?.completed ?? false,
      sortOrder: editingHabit?.sortOrder ?? 0,
    };
    onSave(habitData);
    handleClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedCategory;
      case 2: return !!habitType;
      case 3: {
        if (habitName.trim().length === 0) return false;
        if (habitType !== 'numeric') return true;
        const ct = displayLabelToConditionType(condition);
        if (ct === NUMERIC_CONDITION.ANY_VALUE) return true;
        const g = parseGoalNumber(targetValue);
        return Number.isFinite(g) && g > 0;
      }
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
              onConditionChange={(c) => {
                setCondition(c);
                if (c === 'Any value') setTargetValue('');
              }}
              extraGoals={extraGoals}
              onExtraGoalsChange={setExtraGoals}
              checklistItems={checklistItems}
              onChecklistItemsChange={setChecklistItems}
            />
          )}
          {currentStep === 4 && (
            <WizardStepSchedule
              repeatRule={repeatRule}
              onRepeatRuleChange={handleRepeatRuleChange}
              repeatDays={repeatDays}
              onRepeatDaysChange={setRepeatDays}
              yearlyDates={yearlyDates}
              onYearlyDatesChange={setYearlyDates}
              cadenceCount={cadenceCount}
              onCadenceCountChange={setCadenceCount}
              cadenceUnit={cadenceUnit}
              onCadenceUnitChange={setCadenceUnit}
              intervalEvery={intervalEvery}
              onIntervalEveryChange={setIntervalEvery}
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
