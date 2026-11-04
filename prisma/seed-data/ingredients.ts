// DRAFT DATA. Values are approximate per-100 g reference figures typed in to make the
// app testable. They have NOT been checked by a nutritionist: every ingredient is seeded
// with verifiedAt = null and the app shows a notice until the approval flow has been run.

import type { Allergen } from "../../lib/domain";

export type IngredientSeed = {
  key: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  sugar: number;
  salt: number;
  allergens: Allergen[];
  mayContain: Allergen[];
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
};

type Values = [kcal: number, protein: number, carbs: number, fat: number, fibre: number, sugar: number, salt: number];
type Kind = "plant" | "vegetarian" | "meat";
type Extras = { allergens?: Allergen[]; mayContain?: Allergen[]; gluten?: boolean };

function row(key: string, name: string, kind: Kind, v: Values, extras: Extras = {}): IngredientSeed {
  const allergens = extras.allergens ?? [];
  return {
    key,
    name,
    kcal: v[0],
    protein: v[1],
    carbs: v[2],
    fat: v[3],
    fibre: v[4],
    sugar: v[5],
    salt: v[6],
    allergens,
    mayContain: extras.mayContain ?? [],
    isVegan: kind === "plant",
    isVegetarian: kind !== "meat",
    isGlutenFree: !(extras.gluten || allergens.includes("WHEAT")),
  };
}

export const INGREDIENTS: IngredientSeed[] = [
  // Grains and bases
  row("quinoa", "Quinoa", "plant", [120, 4.4, 21.3, 1.9, 2.8, 0.9, 0.02]),
  row("brown-rice", "Brown rice", "plant", [123, 2.7, 25.6, 1, 1.6, 0.4, 0.01]),
  row("farro", "Farro", "plant", [130, 5, 26, 1, 3.5, 0.5, 0.01], { allergens: ["WHEAT"] }),
  row("kale", "Kale", "plant", [35, 2.9, 4.4, 1.5, 4.1, 1, 0.1]),
  row("baby-spinach", "Baby spinach", "plant", [23, 2.9, 3.6, 0.4, 2.2, 0.4, 0.2]),
  row("mixed-greens", "Mixed greens", "plant", [20, 1.8, 3.5, 0.3, 2, 1, 0.08]),
  row("romaine", "Romaine lettuce", "plant", [17, 1.2, 3.3, 0.3, 2.1, 1.2, 0.02]),
  row("rocket", "Rocket", "plant", [25, 2.6, 3.7, 0.7, 1.6, 2, 0.07]),
  row("rolled-oats", "Rolled oats", "plant", [379, 13, 68, 6.5, 10, 1, 0.01], { mayContain: ["WHEAT"], gluten: true }),
  row("granola", "House granola", "vegetarian", [460, 11, 62, 18, 8, 18, 0.1], { allergens: ["TREE_NUTS"], mayContain: ["WHEAT"], gluten: true }),

  // Vegetables
  row("sweet-potato", "Roasted sweet potato", "plant", [90, 2, 20.7, 0.2, 3.3, 6.5, 0.09]),
  row("avocado", "Avocado", "plant", [160, 2, 8.5, 14.7, 6.7, 0.7, 0.02]),
  row("pickled-red-onion", "Pickled red onion", "plant", [45, 0.9, 10, 0.1, 1.5, 7, 0.8]),
  row("red-onion", "Red onion", "plant", [40, 1.1, 9.3, 0.1, 1.7, 4.2, 0.01]),
  row("red-cabbage", "Red cabbage", "plant", [31, 1.4, 7.4, 0.2, 2.1, 3.8, 0.07]),
  row("cucumber", "Cucumber", "plant", [15, 0.7, 3.6, 0.1, 0.5, 1.7, 0.01]),
  row("radish", "Radish", "plant", [16, 0.7, 3.4, 0.1, 1.6, 1.9, 0.1]),
  row("broccoli", "Broccoli", "plant", [35, 2.4, 7.2, 0.4, 3.3, 1.4, 0.1]),
  row("green-beans", "Green beans", "plant", [35, 1.9, 7.9, 0.3, 3.2, 1.5, 0.01]),
  row("zucchini", "Roasted zucchini", "plant", [20, 1.3, 3.5, 0.4, 1.1, 2.2, 0.01]),
  row("bell-pepper", "Roasted peppers", "plant", [35, 1, 7, 0.3, 2, 4.5, 0.01]),
  row("cherry-tomatoes", "Cherry tomatoes", "plant", [18, 0.9, 3.9, 0.2, 1.2, 2.6, 0.01]),
  row("tomato", "Fresh tomato", "plant", [18, 0.9, 3.9, 0.2, 1.2, 2.6, 0.01]),
  row("tomato-sauce", "House tomato sauce", "plant", [55, 1.5, 8, 2, 1.8, 5, 0.5]),
  row("carrot", "Carrot", "plant", [41, 0.9, 9.6, 0.2, 2.8, 4.7, 0.17]),
  row("celery", "Celery", "plant", [14, 0.7, 3, 0.2, 1.6, 1.3, 0.2]),
  row("beet", "Roasted beets", "plant", [44, 1.7, 10, 0.2, 2, 8, 0.2]),
  row("butternut", "Roasted butternut squash", "plant", [40, 0.9, 10.5, 0.1, 3.2, 2, 0.01]),
  row("lettuce", "Butter lettuce", "plant", [13, 1.4, 2.2, 0.2, 1.1, 0.9, 0.01]),
  row("corn", "Charred corn", "plant", [96, 3.4, 21, 1.5, 2.4, 4.5, 0.01]),
  row("mushrooms", "Roasted wild mushrooms", "plant", [35, 3.5, 5, 0.6, 2.5, 2, 0.02]),
  row("potato", "Oven-baked potato", "plant", [130, 2.5, 25, 3, 2.5, 1, 0.3]),
  row("sweet-potato-fries", "Oven-baked sweet potato", "plant", [130, 2, 24, 3.5, 3.5, 7, 0.3]),
  row("peas", "Green peas", "plant", [84, 5.4, 15.6, 0.2, 5.5, 5.9, 0.01]),
  row("bean-sprouts", "Bean sprouts", "plant", [30, 3, 5.9, 0.2, 1.8, 4.1, 0.01]),
  row("spring-onion", "Spring onion", "plant", [32, 1.8, 7.3, 0.2, 2.6, 2.3, 0.04]),
  row("fresh-herbs", "Fresh herbs", "plant", [35, 3, 6, 0.7, 3.5, 0.8, 0.1]),
  row("pickled-turnip", "Pickled turnip", "plant", [28, 0.7, 6, 0.1, 1.8, 3.5, 1.5]),
  row("seaweed-salad", "Seaweed salad", "plant", [70, 1, 11, 2, 2, 7, 1.8], { allergens: ["SESAME"] }),
  row("pickled-ginger", "Pickled ginger", "plant", [50, 0.3, 12, 0.1, 1, 9, 1.8]),
  row("microgreens", "Microgreens", "plant", [29, 2.2, 5, 0.5, 2, 0.5, 0.02]),
  row("lemon", "Lemon", "plant", [29, 1.1, 9.3, 0.3, 2.8, 2.5, 0]),
  row("lime", "Lime", "plant", [30, 0.7, 10.5, 0.2, 2.8, 1.7, 0]),
  row("ginger", "Fresh ginger", "plant", [80, 1.8, 17.8, 0.8, 2, 1.7, 0.03]),
  row("turmeric", "Fresh turmeric", "plant", [80, 1.8, 18, 0.9, 3, 1.5, 0.02]),
  row("garlic", "Garlic", "plant", [149, 6.4, 33, 0.5, 2.1, 1, 0.04]),

  // Legumes and plant proteins
  row("chickpeas", "Spiced roasted chickpeas", "plant", [190, 9, 27, 6, 7.5, 4.5, 0.5]),
  row("hummus", "House hummus", "plant", [177, 7.9, 14.3, 9.6, 6, 0.3, 0.9], { allergens: ["SESAME"] }),
  row("edamame", "Edamame", "plant", [121, 11.9, 8.9, 5.2, 5.2, 2.2, 0.02], { allergens: ["SOY"] }),
  row("green-lentils", "Green lentils", "plant", [116, 9, 20, 0.4, 7.9, 1.8, 0.01]),
  row("red-lentils", "Red lentil soup base", "plant", [60, 4, 9.5, 1, 2, 1, 0.45]),
  row("black-beans", "Black beans", "plant", [132, 8.9, 23.7, 0.5, 8.7, 0.3, 0.01]),
  row("tofu", "Baked tofu", "plant", [144, 15.8, 4.3, 8.7, 2.3, 0.6, 0.5], { allergens: ["SOY"] }),
  row("falafel", "Baked falafel", "plant", [210, 9, 24, 9, 6, 1.5, 0.8], { allergens: ["SESAME"] }),
  row("tabbouleh", "Tabbouleh", "plant", [90, 2.2, 13, 3.5, 3, 1, 0.5], { allergens: ["WHEAT"] }),
  row("bean-quinoa-patty", "Black bean and quinoa patty", "plant", [175, 8, 26, 4.5, 7, 1.5, 0.8]),

  // Meat, fish and eggs
  row("chicken", "Grilled chicken", "meat", [165, 31, 0, 3.6, 0, 0, 0.2]),
  row("chicken-thigh", "Grilled chicken thigh", "meat", [209, 26, 0, 11, 0, 0, 0.25]),
  row("chicken-roast", "Herb-roasted chicken", "meat", [215, 26, 0.5, 12, 0, 0, 0.5]),
  row("chicken-tenders", "Baked chicken tenders", "meat", [235, 22, 14, 10, 1.5, 1, 0.7], { allergens: ["WHEAT", "EGGS", "TREE_NUTS"] }),
  row("salmon-miso", "Miso-glazed salmon", "meat", [220, 21, 4, 13, 0, 3, 1], { allergens: ["FISH", "SOY"] }),
  row("salmon-raw", "Marinated salmon", "meat", [195, 21, 1.5, 12, 0, 1, 1.2], { allergens: ["FISH", "SOY"] }),
  row("white-fish", "Grilled white fish", "meat", [110, 21, 0.5, 2.5, 0, 0, 0.3], { allergens: ["FISH"] }),
  row("beef-patty", "Beef patty", "meat", [250, 26, 0, 16, 0, 0, 0.2]),
  row("beef-ragu", "Slow-cooked beef ragu", "meat", [130, 11, 5, 7.5, 1, 3, 0.6]),
  row("steak", "Sirloin steak", "meat", [206, 28, 0, 10, 0, 0, 0.15]),
  row("egg", "Soft-boiled egg", "vegetarian", [155, 12.6, 1.1, 10.6, 0, 1.1, 0.3], { allergens: ["EGGS"] }),

  // Dairy
  row("feta", "Feta", "vegetarian", [265, 14, 4, 21, 0, 4, 2.9], { allergens: ["MILK"] }),
  row("goat-cheese", "Goat cheese", "vegetarian", [364, 21.6, 0.1, 29.8, 0, 0.1, 1.2], { allergens: ["MILK"] }),
  row("parmesan", "Parmesan", "vegetarian", [431, 38, 4, 29, 0, 1, 3.8], { allergens: ["MILK"] }),
  row("mozzarella", "Fresh mozzarella", "vegetarian", [280, 22, 2.2, 20, 0, 1, 0.9], { allergens: ["MILK"] }),
  row("cheddar", "Aged cheddar", "vegetarian", [403, 25, 1.3, 33, 0, 0.5, 1.6], { allergens: ["MILK"] }),
  row("monterey-jack", "Monterey Jack", "vegetarian", [373, 24, 0.7, 30, 0, 0.5, 1.4], { allergens: ["MILK"] }),
  row("greek-yogurt", "Greek yoghurt", "vegetarian", [97, 9, 3.6, 5, 0, 3.2, 0.1], { allergens: ["MILK"] }),
  row("milk", "Whole milk", "vegetarian", [61, 3.2, 4.8, 3.3, 0, 5, 0.1], { allergens: ["MILK"] }),
  row("frozen-yogurt", "Greek frozen yoghurt", "vegetarian", [125, 5, 20, 3, 0, 17, 0.1], { allergens: ["MILK"] }),
  row("honey-frosting", "Honey cream-cheese frosting", "vegetarian", [320, 4.5, 26, 23, 0, 25, 0.6], { allergens: ["MILK"] }),

  // Breads and pasta
  row("sourdough", "Sourdough bread", "plant", [259, 8.7, 50, 2, 2.4, 2, 1.2], { allergens: ["WHEAT"] }),
  row("pizza-dough", "48-hour sourdough crust", "plant", [255, 8.5, 50, 2.5, 2.5, 1.5, 1.1], { allergens: ["WHEAT"] }),
  row("whole-grain-bun", "Whole-grain seeded bun", "vegetarian", [265, 10, 44, 6, 6.5, 5, 1], { allergens: ["WHEAT", "SESAME"] }),
  row("whole-wheat-tortilla", "Whole-wheat tortilla", "plant", [290, 8, 46, 8, 6, 2, 1.1], { allergens: ["WHEAT"] }),
  row("corn-tortilla", "Corn tortilla", "plant", [218, 5.7, 44.6, 2.9, 6.3, 0.9, 0.1]),
  row("pita", "Whole-wheat pita", "plant", [266, 9.8, 55, 2.6, 7.4, 0.8, 1.1], { allergens: ["WHEAT"] }),
  row("spaghetti", "Whole-wheat spaghetti", "plant", [149, 6, 30, 1.7, 4, 0.8, 0.01], { allergens: ["WHEAT"] }),
  row("tagliatelle", "Whole-wheat tagliatelle", "plant", [149, 6, 30, 1.7, 4, 0.8, 0.01], { allergens: ["WHEAT"] }),
  row("chickpea-penne", "Chickpea penne", "plant", [165, 9, 27, 2.5, 5, 2, 0.02]),
  row("macaroni", "Whole-wheat macaroni", "plant", [149, 6, 30, 1.7, 4, 0.8, 0.01], { allergens: ["WHEAT"] }),
  row("rice-noodles", "Brown rice noodles", "plant", [109, 1.8, 25, 0.2, 1, 0, 0.02]),
  row("rice-paper", "Rice paper", "plant", [335, 6, 83, 0.3, 1, 0, 0.1]),
  row("rice-vermicelli", "Rice vermicelli", "plant", [109, 0.9, 25, 0.2, 1, 0, 0.02]),
  row("breadcrumbs", "Toasted whole-wheat breadcrumbs", "plant", [395, 13, 72, 5, 6, 6, 1.5], { allergens: ["WHEAT"] }),

  // Nuts and seeds
  row("almonds", "Toasted almonds", "plant", [607, 21, 21, 54, 12, 4.4, 0.01], { allergens: ["TREE_NUTS"] }),
  row("walnuts", "Toasted walnuts", "plant", [654, 15, 14, 65, 6.7, 2.6, 0.01], { allergens: ["TREE_NUTS"] }),
  row("pine-nuts", "Toasted pine nuts", "plant", [673, 13.7, 13, 68, 3.7, 3.6, 0.01], { allergens: ["TREE_NUTS"] }),
  row("pistachio", "Crushed pistachio", "plant", [560, 20, 28, 45, 10.6, 7.7, 0.01], { allergens: ["TREE_NUTS"] }),
  row("peanuts", "Crushed peanuts", "plant", [585, 24, 21, 50, 8, 4, 0.02], { allergens: ["PEANUTS"] }),
  row("pumpkin-seeds", "Pumpkin seeds", "plant", [574, 30, 14, 49, 6.5, 1.4, 0.05]),
  row("sunflower-seeds", "Toasted sunflower seeds", "plant", [582, 19, 24, 50, 9, 2.7, 0.01]),
  row("sesame-seeds", "Sesame seeds", "plant", [573, 17.7, 23, 49.7, 11.8, 0.3, 0.03], { allergens: ["SESAME"] }),
  row("chia", "Chia seeds", "plant", [486, 17, 42, 31, 34, 0, 0.04]),

  // Dressings and sauces, made in house
  row("maple-tahini", "Maple-tahini dressing", "plant", [340, 7, 22, 26, 3, 16, 0.6], { allergens: ["SESAME"] }),
  row("lemon-tahini", "Lemon-tahini dressing", "plant", [310, 8, 10, 28, 4, 2, 0.6], { allergens: ["SESAME"] }),
  row("miso-ginger", "Miso-ginger dressing", "plant", [260, 3, 14, 21, 1, 9, 2.8], { allergens: ["SOY", "SESAME"] }),
  row("green-herb", "Creamy green herb dressing", "plant", [190, 1.5, 6, 18, 3, 1, 0.8]),
  row("balsamic", "Balsamic dressing", "plant", [350, 0.3, 14, 32, 0, 12, 0.5]),
  row("olive-oil-lemon", "Olive oil and lemon dressing", "plant", [560, 0.2, 3, 60, 0.2, 1, 0.6]),
  row("cashew-caesar", "Cashew Caesar dressing", "plant", [320, 8, 12, 27, 2, 3, 1.3], { allergens: ["TREE_NUTS"] }),
  row("pesto", "House basil pesto", "vegetarian", [470, 7, 5, 47, 2, 1, 1.4], { allergens: ["MILK", "TREE_NUTS"] }),
  row("teriyaki", "Honey-ginger teriyaki", "vegetarian", [170, 3.5, 34, 0.5, 0.3, 28, 4.5], { allergens: ["SOY"] }),
  row("tamarind-sauce", "Tamarind pad thai sauce", "plant", [130, 1.5, 28, 0.5, 1, 22, 3], { allergens: ["SOY"] }),
  row("peanut-sauce", "Peanut dipping sauce", "plant", [320, 11, 18, 23, 3, 11, 1.8], { allergens: ["PEANUTS", "SOY"] }),
  row("chimichurri", "Chimichurri", "plant", [400, 1.5, 4, 42, 1.5, 0.5, 1]),
  row("salsa", "Fresh tomato salsa", "plant", [32, 1.2, 6.5, 0.2, 1.5, 3.5, 0.6]),
  row("guacamole", "Guacamole", "plant", [155, 2, 8.5, 14, 6, 1, 0.5]),
  row("house-ketchup", "House tomato ketchup", "plant", [90, 1.5, 19, 0.3, 1.2, 15, 1.2]),
  row("herb-mayo", "Herb mayonnaise", "vegetarian", [520, 1.5, 2, 56, 0.2, 1, 1.1], { allergens: ["EGGS"] }),
  row("yogurt-sauce", "Lime and garlic yoghurt sauce", "vegetarian", [105, 7, 6, 5.5, 0.2, 4, 0.5], { allergens: ["MILK"] }),
  row("honey-mustard-dip", "Honey-mustard yoghurt dip", "vegetarian", [130, 6, 16, 4, 0.5, 14, 0.8], { allergens: ["MILK"] }),
  row("olive-oil", "Olive oil", "plant", [884, 0, 0, 100, 0, 0, 0]),
  row("olives", "Kalamata olives", "plant", [230, 1.6, 6, 22, 3, 0, 4]),

  // Fruit
  row("blueberries", "Blueberries", "plant", [57, 0.7, 14.5, 0.3, 2.4, 10, 0]),
  row("raspberries", "Raspberries", "plant", [52, 1.2, 12, 0.7, 6.5, 4.4, 0]),
  row("strawberries", "Strawberries", "plant", [32, 0.7, 7.7, 0.3, 2, 4.9, 0]),
  row("mixed-berries", "Mixed berries", "plant", [45, 0.8, 11, 0.4, 3.5, 7, 0]),
  row("banana", "Banana", "plant", [89, 1.1, 22.8, 0.3, 2.6, 12.2, 0]),
  row("mango", "Mango", "plant", [60, 0.8, 15, 0.4, 1.6, 13.7, 0]),
  row("passion-fruit", "Passion fruit", "plant", [97, 2.2, 23.4, 0.7, 10.4, 11.2, 0.07]),
  row("acai", "Acai puree", "plant", [70, 1.5, 6, 5, 3, 1, 0.01]),
  row("kiwi", "Kiwi", "plant", [61, 1.1, 14.7, 0.5, 3, 9, 0]),
  row("pomegranate", "Pomegranate seeds", "plant", [83, 1.7, 18.7, 1.2, 4, 13.7, 0]),
  row("apple", "Apple", "plant", [52, 0.3, 13.8, 0.2, 2.4, 10.4, 0]),
  row("grapes", "Red grapes", "plant", [69, 0.7, 18, 0.2, 0.9, 15.5, 0]),
  row("orange", "Orange", "plant", [47, 0.9, 11.8, 0.1, 2.4, 9.4, 0]),
  row("dates", "Medjool dates", "plant", [277, 1.8, 75, 0.2, 6.7, 66, 0]),
  row("coconut-flakes", "Coconut flakes", "plant", [604, 6.9, 24, 56, 16, 7, 0.1]),
  row("coconut-cream", "Coconut cream", "plant", [330, 3.6, 6.7, 34.7, 2.2, 3.3, 0.01]),

  // Sweeteners, baking and drinks
  row("honey", "Honey", "vegetarian", [304, 0.3, 82, 0, 0.2, 82, 0.01]),
  row("maple", "Maple syrup", "plant", [260, 0, 67, 0.1, 0, 60, 0.02]),
  row("cacao", "Cacao", "plant", [228, 19.6, 58, 13.7, 33, 1.8, 0.05]),
  row("brownie", "Date-sweetened brownie", "vegetarian", [390, 7, 45, 22, 6, 30, 0.4], { allergens: ["EGGS", "TREE_NUTS", "WHEAT"] }),
  row("banana-bread", "Banana bread", "vegetarian", [310, 6, 44, 13, 4, 20, 0.6], { allergens: ["WHEAT", "EGGS", "TREE_NUTS"] }),
  row("carrot-cake", "Carrot cake sponge", "vegetarian", [340, 6, 42, 17, 3.5, 24, 0.6], { allergens: ["WHEAT", "EGGS", "TREE_NUTS"] }),
  row("oat-milk", "Oat milk", "plant", [46, 1, 6.5, 1.5, 0.8, 4, 0.1], { mayContain: ["WHEAT"], gluten: true }),
  row("espresso", "Espresso", "plant", [9, 0.1, 1.7, 0.2, 0, 0, 0.03]),
  row("matcha", "Matcha", "plant", [324, 30, 39, 5, 39, 0, 0.05]),
  row("kombucha", "Ginger kombucha", "plant", [20, 0, 4.5, 0, 0, 3.5, 0.01]),
  row("hibiscus-tea", "Hibiscus tea", "plant", [3, 0, 0.6, 0, 0, 0, 0]),
  row("water", "Water", "plant", [0, 0, 0, 0, 0, 0, 0]),
  row("green-juice", "Pressed green juice", "plant", [30, 0.9, 6.8, 0.2, 0.5, 4.8, 0.05]),
];
