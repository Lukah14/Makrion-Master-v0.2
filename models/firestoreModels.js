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
 * @property {number} [steps]  Legacy manual steps; prefer users/{uid}/dailySteps/{dateKey}.
 */

/**
 * users/{uid}/dailySteps/{dateKey} — manual step count for one calendar day (doc id = dateKey).
 * @typedef {Object} UserDailySteps
 * @property {string} userId
 * @property {string} dateKey
 * @property {number} steps
 * @property {import('firebase/firestore').Timestamp} [createdAt]
 * @property {import('firebase/firestore').Timestamp} [updatedAt]
 */

// ─── UserFoodLogEntry (Nutrition tab / legacy path) ───────────────────────────

/**
 * users/{uid}/foodLogs/{dateKey}/entries/{entryId}
 * Day is encoded in the path; optional `dateKey` on the doc mirrors it.
 *
 * **Manual (direct nutrition):** `source: "manual"`, `amountType: "manual"`, `type: "manual"`,
 * `foodId: null`, `grams` / `servings` / `servingGrams` / `servingLabel` null — `nutrientsSnapshot`
 * holds totals (kcal, protein, carbs, fat; optional fiber, sugars, sodium, etc.).
 *
 * **Database / recipe:** `type` "food" or "recipe", `grams` & scaled `nutrientsSnapshot` from per-100g math.
 *
 * @typedef {Object} UserFoodLogEntry
 * @property {string} id
 * @property {string|null} [foodId]
 * @property {string} type - "food" | "recipe" | "manual"
 * @property {string} [source] - e.g. "manual"
 * @property {string} [amountType] - e.g. "manual"
 * @property {string} mealType - "breakfast" | "lunch" | "dinner" | "snack"
 * @property {string} [dateKey]
 * @property {string} nameSnapshot
 * @property {string|null} [brandSnapshot]
 * @property {number|null} [grams]
 * @property {number|null} [servings]
 * @property {number|null} [servingGrams]
 * @property {string|null} [servingLabel]
 * @property {NutrientsSnapshot} nutrientsSnapshot
 * @property {string} [status] - "logged" | "planned"
 * @property {string|null} [note]
 * @property {import('firebase/firestore').Timestamp} [createdAt]
 * @property {import('firebase/firestore').Timestamp} [updatedAt]
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
 * @property {number|null}  completionPercent   - checklist 0–100
 * @property {{ id: string, completed: boolean }[]|null} checklistState
 * @property {'missed'|'not_started'|'in_progress'|'completed'|null} trackingStatus
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

// ─── Exercise definition (catalog) ───────────────────────────────────────────

/**
 * exercises/{exerciseId} (global library)
 * @typedef {Object} ExerciseDefinition
 * @property {string}  name
 * @property {'Cardiovascular'|'Strength'} typeOfExercise
 * @property {'Light'|'Moderate'|'Strenuous'} intensity
 * @property {number}  met
 * @property {number}  kcalsPerHour80kg
 * @property {boolean} isActive
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 * @property {string} [type] legacy: "time"|"distance"|"reps"
 * @property {string|null} [category]
 * @property {string|null} [shortInstructions]
 */

// ─── Activity ─────────────────────────────────────────────────────────────────

/**
 * users/{uid}/activities/{activityId}
 * @typedef {Object} Activity
 * @property {string}  id
 * @property {string}  userId
 * @property {string}  date           - YYYY-MM-DD
 * @property {string}  [type]         - "time" (legacy: distance, reps, strength, cardio, mixed)
 * @property {string}  source         - "manual" | "exercise_library" (legacy: "firestore")
 * @property {string|null} exerciseId
 * @property {'Cardiovascular'|'Strength'|null} [typeOfExercise]
 * @property {'Light'|'Moderate'|'Strenuous'|null} [intensity]
 * @property {number|null} [met]
 * @property {number|null} [kcalsPerHour80kg]
 * @property {number|null} [caloriesBurned]
 * @property {number|null} [weightUsedKg] - user weight (kg) snapshot for library kcal scaling
 * @property {string|null} category
 * @property {string|null} shortInstructions
 * @property {string}  name
 * @property {number|null} durationMinutes
 * @property {number|null} [distanceKm] legacy
 * @property {number|null} [repsPerSet] legacy
 * @property {number|null} [sets] legacy
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── WeightEntry ──────────────────────────────────────────────────────────────

/**
 * profiles/{uid}/weight_entries/{weightEntryId}
 * @typedef {Object} WeightEntry
 * @property {string}  id
 * @property {string}  uid
 * @property {string}  [userId]  mirror of uid
 * @property {string}  dateKey
 * @property {string}  [date]  YYYY-MM-DD (same as dateKey)
 * @property {number}  weightKg
 * @property {number|null} bodyFatPct
 * @property {string|null} note
 * @property {string|null} photoUrl
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── MemorableMoment (daily note) ─────────────────────────────────────────────

/**
 * Normalized shape for UI — one entry per calendar day.
 * @typedef {Object} DailyMemorableMoment
 * @property {string} id - same as dateKey (YYYY-MM-DD)
 * @property {string} dateKey
 * @property {string} text
 * @property {number|null} moodRating
 * @property {string|null} photoUrl
 * @property {string|null} emoji
 */

/**
 * profiles/{uid}/memorable_moments/{dateKey}
 * Document id is YYYY-MM-DD for the canonical daily note (upsert target).
 * Legacy random ids may exist until migrated on save.
 *
 * @typedef {Object} MemorableMoment
 * @property {string}  uid
 * @property {string}  userId
 * @property {string}  dateKey
 * @property {string}  date - YYYY-MM-DD (mirror)
 * @property {string}  type - "daily" | legacy "text" | "photo" | …
 * @property {string|null} note
 * @property {string|null} text
 * @property {string|null} emoji
 * @property {string|null} photoUrl
 * @property {number|null} moodScore
 * @property {number|null} moodRating
 * @property {string|null} achievementTag
 * @property {string|null} moodTag
 * @property {import('firebase/firestore').Timestamp|null} happenedAt
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

export {};
