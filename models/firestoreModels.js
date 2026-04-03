/**
 * Firestore collection schemas for profiles/{uid}/... structure.
 * All day-specific documents carry a `dateKey` field ("YYYY-MM-DD").
 */

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ProfileSettings
 * @property {boolean}  darkMode
 * @property {string}   language   - e.g. "en"
 * @property {string}   units      - "metric" | "imperial"
 */

/**
 * @typedef {Object} ProfileGoals
 * @property {number|null} calorieGoal
 * @property {number|null} proteinGoal
 * @property {number|null} carbsGoal
 * @property {number|null} fatGoal
 * @property {number|null} waterGoalMl
 * @property {number|null} stepGoal
 * @property {number|null} weightGoalKg
 */

/**
 * @typedef {Object} ProfileBody
 * @property {number|null} heightCm
 * @property {number|null} currentWeightKg
 * @property {number|null} targetWeightKg
 * @property {string|null} sex        - "male" | "female" | "other"
 * @property {number|null} age
 */

/**
 * profiles/{uid}
 * @typedef {Object} Profile
 * @property {string}          uid
 * @property {string}          email
 * @property {string}          displayName
 * @property {string|null}     photoURL
 * @property {string}          role           - "user" | "admin"
 * @property {boolean}         onboardingCompleted
 * @property {boolean}         profileCompleted
 * @property {ProfileSettings} settings
 * @property {ProfileGoals}    goals
 * @property {ProfileBody}     body
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── DailyLog ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} MealTotals
 * @property {number} kcal
 * @property {number} protein
 * @property {number} carbs
 * @property {number} fat
 */

/**
 * profiles/{uid}/daily_logs/{dateKey}
 * @typedef {Object} DailyLog
 * @property {string}  dateKey
 * @property {string}  uid
 * @property {number}  caloriesConsumed
 * @property {number}  caloriesBurned
 * @property {number}  caloriesRemaining
 * @property {number}  protein
 * @property {number}  carbs
 * @property {number}  fat
 * @property {number}  waterMl
 * @property {number}  habitsCompleted
 * @property {number}  habitsTotal
 * @property {MealTotals} mealTotals_breakfast
 * @property {MealTotals} mealTotals_lunch
 * @property {MealTotals} mealTotals_dinner
 * @property {MealTotals} mealTotals_snack
 * @property {boolean} hasFoodEntries
 * @property {boolean} hasActivities
 * @property {boolean} hasHabits
 * @property {boolean} hasMemorableMoments
 * @property {import('firebase/firestore').Timestamp} lastRecalculatedAt
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── FoodEntry ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} NutrientsSnapshot
 * @property {number} kcal
 * @property {number} protein
 * @property {number} carbs
 * @property {number} fat
 * @property {number} [fiber]
 * @property {number} [sugar]
 * @property {number} [salt]
 */

/**
 * profiles/{uid}/food_entries/{entryId}
 * @typedef {Object} FoodEntry
 * @property {string}  id
 * @property {string}  uid
 * @property {string}  dateKey
 * @property {string}  mealType          - "breakfast" | "lunch" | "dinner" | "snack"
 * @property {string}  type              - "food" | "recipe" | "manual"
 * @property {string}  source            - "fatsecret" | "user" | "recipe" | "manual"
 * @property {string|null} sourceFoodId
 * @property {string}  nameSnapshot
 * @property {string|null} brandSnapshot
 * @property {number}  amount
 * @property {string}  unit              - "g" | "ml" | "serving"
 * @property {number}  grams
 * @property {number}  servings
 * @property {NutrientsSnapshot} nutrientsSnapshot
 * @property {string}  status            - "logged" | "planned"
 * @property {string|null} note
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── MyFood ───────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Per100g
 * @property {number} kcal
 * @property {number} protein
 * @property {number} carbs
 * @property {number} fat
 * @property {number} [fiber]
 * @property {number} [sugar]
 * @property {number} [salt]
 */

/**
 * profiles/{uid}/my_foods/{foodId}
 * @typedef {Object} MyFood
 * @property {string}      id
 * @property {string}      uid
 * @property {string}      name
 * @property {string|null} brand
 * @property {string|null} category
 * @property {string|null} barcode
 * @property {number}      servingGrams
 * @property {Per100g}     per100g
 * @property {string}      source        - always "user"
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── Habit ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} HabitEvaluation
 * @property {number|null} targetValue
 * @property {string|null} unit
 * @property {number|null} checklistTargetCount
 * @property {number|null} ratingMin
 * @property {number|null} ratingMax
 */

/**
 * @typedef {Object} HabitRepeat
 * @property {string}        mode        - "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom"
 * @property {number[]|null} daysOfWeek  - 0=Sun..6=Sat
 * @property {number[]|null} daysOfMonth
 * @property {number|null}   interval    - every N days for custom
 */

/**
 * @typedef {Object} HabitSchedule
 * @property {string|null}  startDateKey
 * @property {string|null}  endDateKey
 * @property {boolean}      reminderEnabled
 * @property {string|null}  reminderTime  - "HH:mm"
 * @property {string}       priority      - "low" | "medium" | "high"
 */

/**
 * profiles/{uid}/habits/{habitId}
 * @typedef {Object} Habit
 * @property {string}          id
 * @property {string}          uid
 * @property {string}          name
 * @property {string}          icon
 * @property {string}          color
 * @property {string}          category
 * @property {string}          type       - "yes_no" | "numeric" | "timer" | "checklist" | "rating"
 * @property {HabitEvaluation} evaluation
 * @property {HabitRepeat}     repeat
 * @property {HabitSchedule}   schedule
 * @property {boolean}         isArchived
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── HabitCompletion ──────────────────────────────────────────────────────────

/**
 * profiles/{uid}/habit_completions/{completionId}
 * @typedef {Object} HabitCompletion
 * @property {string}  id
 * @property {string}  uid
 * @property {string}  habitId
 * @property {string}  dateKey
 * @property {boolean} isCompleted
 * @property {import('firebase/firestore').Timestamp|null} completedAt
 * @property {number|null}  progressValue
 * @property {string|null}  progressUnit
 * @property {number|null}  streakSnapshot
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── HabitLog ─────────────────────────────────────────────────────────────────

/**
 * profiles/{uid}/habit_logs/{habitLogId}
 * @typedef {Object} HabitLog
 * @property {string}  id
 * @property {string}  uid
 * @property {string}  habitId
 * @property {string}  dateKey
 * @property {string}  logType   - "numeric" | "timer" | "checklist" | "rating" | "note"
 * @property {number|null}  value
 * @property {number|null}  minValue
 * @property {number|null}  maxValue
 * @property {string|null}  unit
 * @property {number|null}  durationSeconds
 * @property {string|null}  note
 * @property {string}       status   - "in_progress" | "completed" | "skipped" | "missed"
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── HabitChecklistItem ───────────────────────────────────────────────────────

/**
 * profiles/{uid}/habit_checklist_items/{itemId}
 * @typedef {Object} HabitChecklistItem
 * @property {string}  id
 * @property {string}  uid
 * @property {string}  habitId
 * @property {string}  label
 * @property {number}  sortOrder
 * @property {boolean} isActive
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── Activity ─────────────────────────────────────────────────────────────────

/**
 * profiles/{uid}/activities/{activityId}
 * @typedef {Object} Activity
 * @property {string}  id
 * @property {string}  uid
 * @property {string}  dateKey
 * @property {string}  type        - "cardio" | "strength" | "flexibility" | "sport" | "other"
 * @property {string}  name
 * @property {string|null} category
 * @property {number}  durationMinutes
 * @property {number}  caloriesBurned
 * @property {number|null} steps
 * @property {number|null} distanceKm
 * @property {string}  status      - "done" | "planned" | "skipped"
 * @property {import('firebase/firestore').Timestamp|null} startedAt
 * @property {import('firebase/firestore').Timestamp|null} completedAt
 * @property {string|null} note
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── WeightEntry ──────────────────────────────────────────────────────────────

/**
 * profiles/{uid}/weight_entries/{weightEntryId}
 * @typedef {Object} WeightEntry
 * @property {string}  id
 * @property {string}  uid
 * @property {string}  dateKey
 * @property {number}  weightKg
 * @property {number|null} bodyFatPct
 * @property {string|null} note
 * @property {string|null} photoUrl
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── MemorableMoment ──────────────────────────────────────────────────────────

/**
 * profiles/{uid}/memorable_moments/{momentId}
 * @typedef {Object} MemorableMoment
 * @property {string}  id
 * @property {string}  uid
 * @property {string}  dateKey
 * @property {string}  type        - "text" | "photo" | "emoji" | "achievement"
 * @property {string|null}  text
 * @property {string|null}  emoji
 * @property {string|null}  photoUrl
 * @property {string|null}  achievementTag
 * @property {string|null}  moodTag
 * @property {import('firebase/firestore').Timestamp|null} happenedAt
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

export {};
