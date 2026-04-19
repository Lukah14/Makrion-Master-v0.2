const ICON_MAP = {
  chicken_meat: require('@/src/Food_Categories_Icons/Meat_and_Meat_Products/categories_Chicken_Meat.png'),
  beef: require('@/src/Food_Categories_Icons/Meat_and_Meat_Products/categories_Beef.png'),
  pork: require('@/src/Food_Categories_Icons/Meat_and_Meat_Products/categories_Pork_Meat.png'),
  lamb: require('@/src/Food_Categories_Icons/Meat_and_Meat_Products/categories_Lamb_Meat.png'),
  turkey: require('@/src/Food_Categories_Icons/Meat_and_Meat_Products/categories_Turkey_Meat.png'),
  deli_meats: require('@/src/Food_Categories_Icons/Meat_and_Meat_Products/categories_Deli_Meats.png'),
  hamburger: require('@/src/Food_Categories_Icons/Meat_and_Meat_Products/categories_Hamburgers.png'),
  other_meat: require('@/src/Food_Categories_Icons/Meat_and_Meat_Products/categories_Other_Meat.png'),
  fish: require('@/src/Food_Categories_Icons/Fish_and_Seafood/categories_Fish.png'),
  seafood: require('@/src/Food_Categories_Icons/Fish_and_Seafood/categories_Seafood.png'),
  cheese: require('@/src/Food_Categories_Icons/Dairy_Products/categories_Cheeses.png'),
  milk: require('@/src/Food_Categories_Icons/Dairy_Products/categories_Milk.png'),
  yogurt: require('@/src/Food_Categories_Icons/Dairy_Products/categories_Yogurt.png'),
  bread: require('@/src/Food_Categories_Icons/Grain_Products_and_Cereals/categories_Bread.png'),
  cereals: require('@/src/Food_Categories_Icons/Grain_Products_and_Cereals/categories_Cereals.png'),
  grains: require('@/src/Food_Categories_Icons/Grain_Products_and_Cereals/categories_Grains.png'),
  noodles: require('@/src/Food_Categories_Icons/Grain_Products_and_Cereals/categories_Noodles.png'),
  pasta: require('@/src/Food_Categories_Icons/Grain_Products_and_Cereals/categories_Pasta.png'),
  rice: require('@/src/Food_Categories_Icons/Grain_Products_and_Cereals/categories_Rice.png'),
  fruits: require('@/src/Food_Categories_Icons/categories_Fruits.png'),
  vegetables: require('@/src/Food_Categories_Icons/categories_Vegetables.png'),
  nuts: require('@/src/Food_Categories_Icons/categories_Nuts.png'),
  seeds: require('@/src/Food_Categories_Icons/categories_Seeds.png'),
  oils: require('@/src/Food_Categories_Icons/categories_Oils.png'),
  legumes: require('@/src/Food_Categories_Icons/categories_Legumes.png'),
  tubers: require('@/src/Food_Categories_Icons/categories_Tubers.png'),
  sauces: require('@/src/Food_Categories_Icons/categories_Sauces__and_Condiments.png'),
  spreads: require('@/src/Food_Categories_Icons/categories_Spreads.png'),
  soy: require('@/src/Food_Categories_Icons/categories_Soy_Products.png'),
  supplements: require('@/src/Food_Categories_Icons/categories_Supplements.png'),
  instant_food: require('@/src/Food_Categories_Icons/categories_Instant_Food.png'),
  instant_mixes: require('@/src/Food_Categories_Icons/categories_Instant_Mixes.png'),
  eggs: require('@/src/Food_Categories_Icons/categories_Eggs.png'),
  fast_food: require('@/src/Food_Categories_Icons/categories_Fast_Food.png'),
  beverages: require('@/src/Food_Categories_Icons/Beverages/categories_Beverages.png'),
  coffee: require('@/src/Food_Categories_Icons/Beverages/categories_Coffee_and_Herbal_Teas.png'),
  alcohol: require('@/src/Food_Categories_Icons/Beverages/categories_Alcoholic_Beverages.png'),
  cookies_snacks: require('@/src/Food_Categories_Icons/categories_Cookies_and_Snacks.png'),
  canned: require('@/src/Food_Categories_Icons/categories_Canned_Foods.png'),
  chocolates: require('@/src/Food_Categories_Icons/categories_Chocolates_and_Sweets.png'),
  ice_cream: require('@/src/Food_Categories_Icons/categories_Ice_Cream.png'),
  recipes: require('@/src/Food_Categories_Icons/Recipes.png'),
  restaurants: require('@/src/Food_Categories_Icons/Restaurants.png'),
  others: require('@/src/Food_Categories_Icons/categories_Others.png'),
};

const KEYWORD_TO_CATEGORY = [
  { keywords: ['chicken', 'poultry'], category: 'chicken_meat' },
  { keywords: ['beef', 'steak', 'ground beef'], category: 'beef' },
  { keywords: ['pork', 'bacon', 'ham'], category: 'pork' },
  { keywords: ['lamb', 'mutton'], category: 'lamb' },
  { keywords: ['turkey'], category: 'turkey' },
  { keywords: ['salami', 'sausage', 'deli', 'prosciutto', 'pepperoni'], category: 'deli_meats' },
  { keywords: ['burger', 'hamburger', 'patty'], category: 'hamburger' },
  { keywords: ['salmon', 'tuna', 'cod', 'trout', 'mackerel', 'sardine', 'anchov', 'fish'], category: 'fish' },
  { keywords: ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'squid', 'octopus', 'seafood', 'scallop'], category: 'seafood' },
  { keywords: ['egg'], category: 'eggs' },
  { keywords: ['cheese', 'parmesan', 'mozzarella', 'cheddar', 'feta', 'gouda', 'brie', 'ricotta', 'goat cheese'], category: 'cheese' },
  { keywords: ['milk', 'cream', 'half and half', 'buttermilk', 'almond milk', 'oat milk', 'coconut milk'], category: 'milk' },
  { keywords: ['yogurt', 'yoghurt', 'kefir'], category: 'yogurt' },
  { keywords: ['bread', 'sourdough', 'baguette', 'pita', 'tortilla', 'wrap', 'flatbread', 'ciabatta', 'brioche', 'toast'], category: 'bread' },
  { keywords: ['cereal', 'oat', 'granola', 'muesli', 'bran'], category: 'cereals' },
  { keywords: ['pasta', 'spaghetti', 'penne', 'fusilli', 'linguine', 'fettuccine', 'macaroni', 'lasagna', 'ravioli', 'rigatoni'], category: 'pasta' },
  { keywords: ['noodle', 'ramen', 'udon', 'soba', 'vermicelli', 'lo mein', 'pad thai'], category: 'noodles' },
  { keywords: ['rice', 'risotto', 'basmati', 'jasmine rice', 'sushi rice', 'brown rice', 'wild rice'], category: 'rice' },
  { keywords: ['flour', 'wheat', 'cornmeal', 'semolina', 'quinoa', 'couscous', 'bulgur', 'barley', 'millet', 'buckwheat', 'amaranth', 'grain', 'polenta'], category: 'grains' },
  { keywords: ['apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'berry', 'blueberr', 'strawberr', 'raspberr', 'blackberr', 'mango', 'pineapple', 'peach', 'pear', 'plum', 'cherry', 'kiwi', 'melon', 'watermelon', 'papaya', 'pomegranate', 'fig', 'date', 'apricot', 'coconut', 'avocado', 'acai', 'fruit', 'citrus', 'cranberr', 'grapefruit', 'tangerine'], category: 'fruits' },
  { keywords: ['lettuce', 'spinach', 'kale', 'arugula', 'broccoli', 'cauliflower', 'cabbage', 'carrot', 'celery', 'cucumber', 'tomato', 'pepper', 'bell pepper', 'onion', 'garlic', 'ginger', 'zucchini', 'squash', 'pumpkin', 'eggplant', 'mushroom', 'asparagus', 'artichoke', 'pea', 'corn', 'green bean', 'radish', 'beet', 'leek', 'scallion', 'spring onion', 'shallot', 'chive', 'herb', 'rosemary', 'thyme', 'basil', 'parsley', 'cilantro', 'mint', 'dill', 'oregano', 'sage', 'bay leaf', 'watercress', 'chard', 'collard', 'endive', 'fennel', 'okra', 'bok choy', 'vegetable', 'salad'], category: 'vegetables' },
  { keywords: ['potato', 'sweet potato', 'yam', 'cassava', 'taro'], category: 'tubers' },
  { keywords: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'peanut', 'nut'], category: 'nuts' },
  { keywords: ['chia', 'flax', 'sunflower seed', 'pumpkin seed', 'sesame', 'hemp seed', 'poppy seed', 'seed'], category: 'seeds' },
  { keywords: ['olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'sesame oil', 'avocado oil', 'butter', 'ghee', 'lard', 'oil', 'cooking spray'], category: 'oils' },
  { keywords: ['bean', 'lentil', 'chickpea', 'black bean', 'kidney bean', 'navy bean', 'pinto bean', 'soybean', 'edamame', 'hummus'], category: 'legumes' },
  { keywords: ['tofu', 'tempeh', 'soy sauce', 'miso', 'soy milk', 'soy'], category: 'soy' },
  { keywords: ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'vinegar', 'hot sauce', 'salsa', 'pesto', 'curry paste', 'fish sauce', 'worcestershire', 'barbecue sauce', 'sriracha', 'chili sauce', 'teriyaki', 'hoisin', 'ranch', 'dressing', 'sauce', 'condiment', 'marinade', 'glaze'], category: 'sauces' },
  { keywords: ['jam', 'jelly', 'marmalade', 'nutella', 'peanut butter', 'almond butter', 'honey', 'maple syrup', 'spread', 'tahini'], category: 'spreads' },
  { keywords: ['chocolate', 'cocoa', 'candy', 'sweet', 'caramel', 'fudge', 'truffle', 'brownie'], category: 'chocolates' },
  { keywords: ['cookie', 'cracker', 'chip', 'pretzel', 'popcorn', 'snack', 'granola bar'], category: 'cookies_snacks' },
  { keywords: ['ice cream', 'gelato', 'sorbet', 'frozen yogurt', 'popsicle'], category: 'ice_cream' },
  { keywords: ['canned', 'tinned'], category: 'canned' },
  { keywords: ['coffee', 'espresso', 'tea', 'matcha', 'chai'], category: 'coffee' },
  { keywords: ['juice', 'smoothie', 'soda', 'water', 'drink', 'beverage', 'lemonade', 'milkshake', 'shake'], category: 'beverages' },
  { keywords: ['wine', 'beer', 'whiskey', 'vodka', 'rum', 'gin', 'tequila', 'liqueur', 'cocktail', 'alcohol'], category: 'alcohol' },
  { keywords: ['protein powder', 'whey', 'creatine', 'supplement', 'vitamin', 'collagen'], category: 'supplements' },
  { keywords: ['instant', 'ramen packet', 'ready to eat', 'microwave'], category: 'instant_food' },
  { keywords: ['spice', 'pepper', 'cinnamon', 'cumin', 'turmeric', 'paprika', 'chili flake', 'chili powder', 'nutmeg', 'clove', 'cardamom', 'coriander', 'saffron', 'curry powder', 'garam masala', 'salt', 'seasoning', 'bay leaf'], category: 'sauces' },
  { keywords: ['sugar', 'brown sugar', 'powdered sugar', 'agave', 'stevia', 'sweetener', 'molasses', 'corn syrup'], category: 'others' },
  { keywords: ['baking powder', 'baking soda', 'yeast', 'gelatin', 'cornstarch', 'extract', 'vanilla'], category: 'others' },
];

export function getCategoryIcon(ingredientName) {
  if (!ingredientName) return ICON_MAP.others;
  const lower = ingredientName.toLowerCase();

  for (const entry of KEYWORD_TO_CATEGORY) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return ICON_MAP[entry.category];
      }
    }
  }

  return ICON_MAP.others;
}

export function getCategoryKey(ingredientName) {
  if (!ingredientName) return 'others';
  const lower = ingredientName.toLowerCase();

  for (const entry of KEYWORD_TO_CATEGORY) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return entry.category;
      }
    }
  }

  return 'others';
}

export { ICON_MAP };
