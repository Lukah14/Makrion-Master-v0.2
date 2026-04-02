function round1(n) {
  return Math.round(n * 10) / 10;
}

export const SERVING_UNITS = [
  { value: 'g', label: 'g (grams)' },
  { value: 'ml', label: 'ml (milliliters)' },
  { value: 'oz', label: 'oz (ounces)' },
  { value: 'cup', label: 'cup' },
  { value: 'tbsp', label: 'tbsp (tablespoon)' },
  { value: 'tsp', label: 'tsp (teaspoon)' },
  { value: 'piece', label: 'piece' },
  { value: 'slice', label: 'slice' },
  { value: 'serving', label: 'serving' },
  { value: 'scoop', label: 'scoop' },
  { value: 'bar', label: 'bar' },
  { value: 'packet', label: 'packet' },
];

export const GRAM_EQUIVALENTS = {
  g: (amount) => amount,
  ml: (amount) => amount,
  oz: (amount) => round1(amount * 28.3495),
  cup: (amount) => round1(amount * 240),
  tbsp: (amount) => round1(amount * 15),
  tsp: (amount) => round1(amount * 5),
};

export function canConvertToGrams(unit) {
  return unit in GRAM_EQUIVALENTS;
}

export function toGrams(amount, unit) {
  const fn = GRAM_EQUIVALENTS[unit];
  return fn ? fn(amount) : null;
}

export function computeNutritionPer100g(nutritionPerServing, servingGrams) {
  if (!servingGrams || servingGrams <= 0) return null;
  const factor = 100 / servingGrams;
  return {
    calories: round1((nutritionPerServing.calories ?? 0) * factor),
    protein: round1((nutritionPerServing.protein ?? 0) * factor),
    carbs: round1((nutritionPerServing.carbs ?? 0) * factor),
    fat: round1((nutritionPerServing.fat ?? 0) * factor),
    saturatedFat: nutritionPerServing.saturatedFat != null
      ? round1(nutritionPerServing.saturatedFat * factor) : null,
    sugar: nutritionPerServing.sugar != null
      ? round1(nutritionPerServing.sugar * factor) : null,
    fiber: nutritionPerServing.fiber != null
      ? round1(nutritionPerServing.fiber * factor) : null,
    sodium: nutritionPerServing.sodium != null
      ? round1(nutritionPerServing.sodium * factor) : null,
  };
}

export function scaleNutrition(nutrition, factor) {
  if (!nutrition) return null;
  return {
    calories: Math.round((nutrition.calories ?? 0) * factor),
    protein: round1((nutrition.protein ?? 0) * factor),
    carbs: round1((nutrition.carbs ?? 0) * factor),
    fat: round1((nutrition.fat ?? 0) * factor),
    saturatedFat: nutrition.saturatedFat != null
      ? round1(nutrition.saturatedFat * factor) : null,
    sugar: nutrition.sugar != null
      ? round1(nutrition.sugar * factor) : null,
    fiber: nutrition.fiber != null
      ? round1(nutrition.fiber * factor) : null,
    sodium: nutrition.sodium != null
      ? round1(nutrition.sodium * factor) : null,
  };
}

export function validateFoodForm(form) {
  const errors = {};

  if (!form.name?.trim()) {
    errors.name = 'Food name is required';
  }

  const amount = parseFloat(form.servingAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.servingAmount = 'Serving size must be a positive number';
  }

  if (!form.servingUnit?.trim()) {
    errors.servingUnit = 'Serving unit is required';
  }

  const cal = parseFloat(form.calories);
  if (!Number.isFinite(cal) || cal < 0) {
    errors.calories = 'Calories must be 0 or more';
  }

  const prot = parseFloat(form.protein);
  if (!Number.isFinite(prot) || prot < 0) {
    errors.protein = 'Protein must be 0 or more';
  }

  const carb = parseFloat(form.carbs);
  if (!Number.isFinite(carb) || carb < 0) {
    errors.carbs = 'Carbs must be 0 or more';
  }

  const fatVal = parseFloat(form.fat);
  if (!Number.isFinite(fatVal) || fatVal < 0) {
    errors.fat = 'Fat must be 0 or more';
  }

  const optionalFields = ['saturatedFat', 'sugar', 'fiber', 'sodium', 'vitaminA', 'vitaminC', 'calcium', 'iron'];
  for (const field of optionalFields) {
    const val = form[field];
    if (val !== '' && val != null) {
      const n = parseFloat(val);
      if (!Number.isFinite(n) || n < 0) {
        errors[field] = 'Must be 0 or more';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function isFormComplete(form) {
  const name = form.name?.trim();
  const amount = parseFloat(form.servingAmount);
  const unit = form.servingUnit?.trim();
  const cal = parseFloat(form.calories);
  const prot = parseFloat(form.protein);
  const carb = parseFloat(form.carbs);
  const fatVal = parseFloat(form.fat);

  return (
    !!name &&
    Number.isFinite(amount) && amount > 0 &&
    !!unit &&
    Number.isFinite(cal) && cal >= 0 &&
    Number.isFinite(prot) && prot >= 0 &&
    Number.isFinite(carb) && carb >= 0 &&
    Number.isFinite(fatVal) && fatVal >= 0
  );
}
