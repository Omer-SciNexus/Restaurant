// DRAFT MENU. Dishes and their ingredients follow the plan and the image prompts; prices
// and gram weights are placeholders until the chef and owner sign off the final menu.
// Photo paths match public/images/dishes/<slug>.png, so the slug must not change lightly.

export type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  servedFrom?: string;
  servedUntil?: string;
};

export const CATEGORIES: CategorySeed[] = [
  { slug: "bowls", name: "Grain and warm bowls", description: "Whole grains, roasted vegetables and house dressings.", imageUrl: "/images/categories/category-bowls.png" },
  { slug: "build-your-own", name: "Build your own bowl", description: "Base, protein, toppings, dressing. You choose.", imageUrl: "/images/categories/category-build-your-own.png" },
  { slug: "salads", name: "Salads", description: "Crisp seasonal greens that change with the market.", imageUrl: "/images/categories/category-salads.png" },
  { slug: "breakfast", name: "Breakfast", description: "Slow mornings, served 7 to 11.", imageUrl: "/images/categories/category-breakfast.png", servedFrom: "07:00", servedUntil: "11:00" },
  { slug: "soups", name: "Soups", description: "Warming bowls for colder months.", imageUrl: "/images/categories/category-soups.png" },
  { slug: "burgers-sandwiches", name: "Burgers and sandwiches", description: "Whole-grain buns, oven-baked fries.", imageUrl: "/images/categories/category-burgers-sandwiches.png" },
  { slug: "pizza", name: "Stone-baked pizza", description: "48-hour sourdough crust and fresh mozzarella.", imageUrl: "/images/categories/category-pizza.png" },
  { slug: "pasta", name: "Pasta", description: "Whole-wheat or chickpea pasta, sauces made in house.", imageUrl: "/images/categories/category-pasta.png" },
  { slug: "mexican", name: "Mexican favourites", description: "Corn or whole-wheat tortillas and fresh salsa.", imageUrl: "/images/categories/category-mexican.png" },
  { slug: "asian", name: "Asian favourites", description: "House sauces, brown rice and rice noodles.", imageUrl: "/images/categories/category-asian.png" },
  { slug: "grill", name: "From the grill", description: "Served with roasted vegetables and greens.", imageUrl: "/images/categories/category-grill.png" },
  { slug: "sides", name: "Sides", description: "Baked, never fried.", imageUrl: "/images/categories/category-sides.png" },
  { slug: "kids", name: "Kids", description: "Small portions with fruit, and water or milk. No soda.", imageUrl: "/images/categories/category-kids.png" },
  { slug: "juices-smoothies", name: "Fresh juices and smoothies", description: "Pressed and blended to order.", imageUrl: "/images/categories/category-juices-smoothies.png" },
  { slug: "coffee-tea", name: "Coffee and tea", description: "Oat and almond milk as standard.", imageUrl: "/images/categories/category-coffee-tea.png" },
  { slug: "drinks", name: "Drinks", description: "No refined sugar, no soda.", imageUrl: "/images/categories/category-drinks.png" },
  { slug: "sweets", name: "Natural sweets", description: "No refined sugar.", imageUrl: "/images/categories/category-sweets.png" },
  { slug: "treats", name: "Treats", description: "Sweetened with dates, honey or maple.", imageUrl: "/images/categories/category-treats.png" },
];

type Lines = [ingredient: string, grams: number][];

export type DishSeed = {
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  description: string;
  ingredients: Lines;
  seasonal?: boolean;
  addProtein?: boolean;
};

export const DISHES: DishSeed[] = [
  // Bowls
  { slug: "harvest-quinoa-bowl", name: "Harvest Quinoa Bowl", category: "bowls", priceCents: 1495, seasonal: true,
    description: "Quinoa with roasted sweet potato, massaged kale, roasted chickpeas, avocado, pickled red onion, pumpkin seeds and maple-tahini.",
    ingredients: [["quinoa", 150], ["sweet-potato", 90], ["kale", 50], ["chickpeas", 50], ["avocado", 50], ["pickled-red-onion", 15], ["pumpkin-seeds", 10], ["maple-tahini", 30]] },
  { slug: "miso-salmon-bowl", name: "Miso Salmon Bowl", category: "bowls", priceCents: 1795,
    description: "Brown rice with a glazed miso salmon fillet, edamame, red cabbage, cucumber ribbons, radish, avocado, sesame and spring onion.",
    ingredients: [["brown-rice", 160], ["salmon-miso", 120], ["edamame", 40], ["red-cabbage", 30], ["cucumber", 40], ["radish", 15], ["avocado", 40], ["sesame-seeds", 4], ["spring-onion", 5]] },
  { slug: "green-goddess-bowl", name: "Green Goddess Bowl", category: "bowls", priceCents: 1495,
    description: "Mixed greens and farro with charred broccolini, green beans, cucumber, avocado, edamame, sunflower seeds and creamy herb dressing.",
    ingredients: [["mixed-greens", 50], ["farro", 120], ["broccoli", 70], ["green-beans", 50], ["cucumber", 40], ["avocado", 50], ["edamame", 40], ["sunflower-seeds", 10], ["green-herb", 35], ["lime", 10]] },
  { slug: "chickpea-shawarma-bowl", name: "Chickpea Shawarma Bowl", category: "bowls", priceCents: 1450,
    description: "Herbed brown rice with spiced chickpeas, tabbouleh, cherry tomatoes, cucumber, pickled turnip, hummus and lemon-tahini.",
    ingredients: [["brown-rice", 140], ["chickpeas", 90], ["tabbouleh", 50], ["cherry-tomatoes", 40], ["cucumber", 40], ["pickled-turnip", 20], ["hummus", 40], ["lemon-tahini", 25]] },
  { slug: "lemon-herb-chicken-bowl", name: "Lemon Herb Chicken Bowl", category: "bowls", priceCents: 1595,
    description: "Quinoa with grilled lemon-herb chicken, roasted zucchini and peppers, cherry tomatoes, feta, olives, rocket and lemon-oregano dressing.",
    ingredients: [["quinoa", 140], ["chicken", 120], ["zucchini", 50], ["bell-pepper", 50], ["cherry-tomatoes", 40], ["feta", 25], ["olives", 15], ["rocket", 20], ["olive-oil-lemon", 15]] },

  // Salads
  { slug: "kale-caesar-salad", name: "Kale Caesar Salad", category: "salads", priceCents: 1350, addProtein: true,
    description: "Crisp kale and romaine in creamy cashew Caesar, with sourdough croutons, shaved parmesan and toasted almonds.",
    ingredients: [["kale", 70], ["romaine", 70], ["cashew-caesar", 40], ["sourdough", 35], ["parmesan", 15], ["almonds", 10], ["lemon", 10]] },
  { slug: "beet-citrus-salad", name: "Beet and Citrus Salad", category: "salads", priceCents: 1350, addProtein: true, seasonal: true,
    description: "Roasted beets, orange segments, rocket, crumbled goat cheese, toasted walnuts and fresh mint.",
    ingredients: [["beet", 130], ["orange", 90], ["rocket", 40], ["goat-cheese", 35], ["walnuts", 15], ["fresh-herbs", 3], ["olive-oil", 8]] },
  { slug: "mediterranean-lentil-salad", name: "Mediterranean Lentil Salad", category: "salads", priceCents: 1295, addProtein: true,
    description: "Green lentils with cucumber, cherry tomatoes, red onion, parsley, Kalamata olives, feta and lemon-olive oil.",
    ingredients: [["green-lentils", 170], ["cucumber", 60], ["cherry-tomatoes", 60], ["red-onion", 15], ["fresh-herbs", 8], ["olives", 20], ["feta", 30], ["olive-oil-lemon", 15]] },

  // Breakfast
  { slug: "berry-overnight-oats", name: "Berry Overnight Oats", category: "breakfast", priceCents: 895,
    description: "Creamy oats topped with blueberries, raspberries, strawberries, toasted almonds, chia and a thin line of honey.",
    ingredients: [["rolled-oats", 60], ["oat-milk", 150], ["blueberries", 30], ["raspberries", 30], ["strawberries", 30], ["almonds", 10], ["chia", 8], ["honey", 8]] },
  { slug: "acai-bowl", name: "Acai Bowl", category: "breakfast", priceCents: 1195,
    description: "A thick acai base topped with banana, strawberries, blueberries, granola, coconut flakes and mint.",
    ingredients: [["acai", 180], ["banana", 60], ["strawberries", 40], ["blueberries", 30], ["granola", 35], ["coconut-flakes", 8], ["fresh-herbs", 1]] },
  { slug: "avocado-egg-sourdough", name: "Avocado and Egg Sourdough", category: "breakfast", priceCents: 1095,
    description: "Toasted sourdough with smashed avocado, a jammy soft-boiled egg, chilli flakes and microgreens.",
    ingredients: [["sourdough", 80], ["avocado", 80], ["egg", 55], ["microgreens", 5]] },
  { slug: "mango-chia-pudding", name: "Mango Chia Pudding", category: "breakfast", priceCents: 850,
    description: "Layered chia pudding and mango puree with fresh mango, passion fruit and coconut flakes.",
    ingredients: [["chia", 30], ["oat-milk", 150], ["mango", 110], ["passion-fruit", 15], ["coconut-flakes", 6]] },

  // Soups
  { slug: "red-lentil-soup", name: "Red Lentil Soup", category: "soups", priceCents: 895,
    description: "Smooth red lentil soup with a swirl of yoghurt, chilli oil and coriander, with a slice of sourdough.",
    ingredients: [["red-lentils", 350], ["greek-yogurt", 20], ["olive-oil", 5], ["fresh-herbs", 3], ["sourdough", 40]] },
  { slug: "roasted-butternut-soup", name: "Roasted Butternut Soup", category: "soups", priceCents: 895, seasonal: true,
    description: "Velvety roasted butternut squash with a swirl of coconut cream, toasted pumpkin seeds and thyme.",
    ingredients: [["butternut", 300], ["coconut-cream", 25], ["pumpkin-seeds", 10], ["fresh-herbs", 1], ["olive-oil", 6]] },

  // Burgers and sandwiches
  { slug: "grass-fed-beef-burger", name: "Grass-fed Beef Burger", category: "burgers-sandwiches", priceCents: 1695,
    description: "Hand-formed beef patty, aged cheddar, butter lettuce, tomato, red onion and house pickles in a whole-grain bun, with oven-baked fries.",
    ingredients: [["beef-patty", 150], ["whole-grain-bun", 80], ["cheddar", 25], ["lettuce", 15], ["tomato", 30], ["red-onion", 10], ["potato", 120], ["house-ketchup", 15]] },
  { slug: "black-bean-quinoa-burger", name: "Black Bean Quinoa Burger", category: "burgers-sandwiches", priceCents: 1495,
    description: "Black bean and quinoa patty with avocado, rocket, roasted red pepper and chipotle yoghurt, with oven-baked sweet potato fries.",
    ingredients: [["bean-quinoa-patty", 140], ["whole-grain-bun", 80], ["avocado", 40], ["rocket", 10], ["bell-pepper", 30], ["yogurt-sauce", 20], ["sweet-potato-fries", 120]] },
  { slug: "chicken-avocado-club", name: "Chicken Avocado Club", category: "burgers-sandwiches", priceCents: 1495,
    description: "Toasted sourdough with grilled chicken, smashed avocado, lettuce, tomato and light herb mayonnaise, with mixed greens.",
    ingredients: [["sourdough", 110], ["chicken", 110], ["avocado", 50], ["lettuce", 15], ["tomato", 30], ["herb-mayo", 15], ["mixed-greens", 30]] },
  { slug: "falafel-wrap", name: "Falafel Wrap", category: "burgers-sandwiches", priceCents: 1295,
    description: "Whole-wheat wrap with baked falafel, hummus, lettuce, tomato, cucumber, pickled red onion and tahini.",
    ingredients: [["whole-wheat-tortilla", 80], ["falafel", 100], ["hummus", 40], ["lettuce", 20], ["tomato", 30], ["cucumber", 30], ["pickled-red-onion", 15], ["lemon-tahini", 20]] },

  // Pizza
  { slug: "margherita-pizza", name: "Margherita Pizza", category: "pizza", priceCents: 1495,
    description: "48-hour sourdough crust, crushed tomato, fresh mozzarella, basil and olive oil.",
    ingredients: [["pizza-dough", 220], ["tomato-sauce", 90], ["mozzarella", 90], ["fresh-herbs", 4], ["olive-oil", 6]] },
  { slug: "garden-pesto-pizza", name: "Garden Pesto Pizza", category: "pizza", priceCents: 1695,
    description: "Sourdough crust with basil pesto, roasted zucchini and peppers, cherry tomatoes, red onion, mozzarella, spinach and pine nuts.",
    ingredients: [["pizza-dough", 220], ["pesto", 35], ["zucchini", 50], ["bell-pepper", 50], ["cherry-tomatoes", 40], ["red-onion", 15], ["mozzarella", 50], ["baby-spinach", 20], ["pine-nuts", 8]] },
  { slug: "wild-mushroom-rocket-pizza", name: "Wild Mushroom and Rocket Pizza", category: "pizza", priceCents: 1695,
    description: "Sourdough crust with garlic and olive oil, roasted wild mushrooms, mozzarella and thyme, topped with rocket and parmesan.",
    ingredients: [["pizza-dough", 220], ["olive-oil", 10], ["garlic", 4], ["mushrooms", 110], ["mozzarella", 60], ["rocket", 25], ["parmesan", 12]] },

  // Pasta
  { slug: "spaghetti-pomodoro", name: "Spaghetti Pomodoro", category: "pasta", priceCents: 1350,
    description: "Whole-wheat spaghetti in slow-cooked tomato and garlic, with fresh basil and a little parmesan.",
    ingredients: [["spaghetti", 240], ["tomato-sauce", 150], ["fresh-herbs", 3], ["parmesan", 10], ["olive-oil", 6]] },
  { slug: "beef-bolognese", name: "Grass-fed Beef Bolognese", category: "pasta", priceCents: 1695,
    description: "Whole-wheat tagliatelle with a slow-cooked beef ragu of carrot, celery and tomato, topped with shaved parmesan.",
    ingredients: [["tagliatelle", 240], ["beef-ragu", 180], ["parmesan", 12], ["fresh-herbs", 2]] },
  { slug: "basil-pesto-penne", name: "Basil Pesto Penne", category: "pasta", priceCents: 1495,
    description: "Chickpea penne in fresh basil pesto with roasted cherry tomatoes, baby spinach, pine nuts and parmesan.",
    ingredients: [["chickpea-penne", 220], ["pesto", 40], ["cherry-tomatoes", 60], ["baby-spinach", 25], ["pine-nuts", 8], ["parmesan", 10]] },

  // Mexican
  { slug: "grilled-fish-tacos", name: "Grilled Fish Tacos", category: "mexican", priceCents: 1595,
    description: "Three soft corn tortillas with grilled white fish, purple cabbage slaw, radish, coriander and lime-yoghurt crema.",
    ingredients: [["corn-tortilla", 90], ["white-fish", 140], ["red-cabbage", 50], ["radish", 15], ["fresh-herbs", 3], ["yogurt-sauce", 30], ["salsa", 40], ["lime", 10]] },
  { slug: "chicken-burrito-bowl", name: "Chicken Burrito Bowl", category: "mexican", priceCents: 1595,
    description: "Cilantro-lime brown rice, black beans, chipotle-grilled chicken, charred corn, pico de gallo, avocado, romaine and Greek yoghurt.",
    ingredients: [["brown-rice", 150], ["black-beans", 70], ["chicken", 110], ["corn", 40], ["salsa", 40], ["avocado", 40], ["romaine", 25], ["greek-yogurt", 20], ["lime", 8]] },
  { slug: "veggie-quesadilla", name: "Veggie Quesadilla", category: "mexican", priceCents: 1295,
    description: "Crisp whole-wheat tortilla filled with black beans, roasted peppers, corn, spinach and Monterey Jack, with guacamole and salsa.",
    ingredients: [["whole-wheat-tortilla", 110], ["black-beans", 60], ["bell-pepper", 40], ["corn", 30], ["baby-spinach", 20], ["monterey-jack", 50], ["guacamole", 35], ["salsa", 35]] },

  // Asian
  { slug: "salmon-poke-bowl", name: "Salmon Poke Bowl", category: "asian", priceCents: 1795,
    description: "Brown rice with marinated salmon, edamame, mango, cucumber, avocado, pickled ginger, seaweed salad, sesame and spring onion.",
    ingredients: [["brown-rice", 160], ["salmon-raw", 110], ["edamame", 40], ["mango", 40], ["cucumber", 40], ["avocado", 40], ["pickled-ginger", 10], ["seaweed-salad", 25], ["sesame-seeds", 3], ["spring-onion", 5]] },
  { slug: "chicken-teriyaki-bowl", name: "Chicken Teriyaki Bowl", category: "asian", priceCents: 1550,
    description: "Brown rice with grilled chicken thigh in house honey-ginger teriyaki, broccoli, carrot, edamame, sesame and spring onion.",
    ingredients: [["brown-rice", 170], ["chicken-thigh", 120], ["teriyaki", 30], ["broccoli", 70], ["carrot", 25], ["edamame", 30], ["sesame-seeds", 3], ["spring-onion", 5]] },
  { slug: "vegetable-pad-thai", name: "Vegetable Pad Thai", category: "asian", priceCents: 1395,
    description: "Brown rice noodles in tamarind sauce with tofu, bean sprouts, carrot, red pepper and spring onion, topped with crushed peanuts.",
    ingredients: [["rice-noodles", 220], ["tamarind-sauce", 45], ["tofu", 80], ["bean-sprouts", 40], ["carrot", 25], ["bell-pepper", 30], ["spring-onion", 8], ["peanuts", 15], ["lime", 10]] },
  { slug: "fresh-spring-rolls", name: "Fresh Spring Rolls", category: "asian", priceCents: 1095,
    description: "Rice-paper rolls with tofu, vermicelli, mint, coriander, lettuce, carrot, cucumber and purple cabbage, with peanut sauce.",
    ingredients: [["rice-paper", 40], ["tofu", 70], ["rice-vermicelli", 70], ["fresh-herbs", 5], ["lettuce", 25], ["carrot", 25], ["cucumber", 25], ["red-cabbage", 20], ["peanut-sauce", 35]] },

  // Grill
  { slug: "herb-roasted-chicken-plate", name: "Herb-Roasted Chicken Plate", category: "grill", priceCents: 1895,
    description: "Free-range chicken leg and breast with roasted carrots, baby potatoes, red onion, mixed greens and charred lemon.",
    ingredients: [["chicken-roast", 220], ["carrot", 80], ["potato", 130], ["red-onion", 30], ["mixed-greens", 30], ["lemon", 20]] },
  { slug: "grass-fed-steak-plate", name: "Grass-fed Steak Plate", category: "grill", priceCents: 2495,
    description: "Sliced sirloin with chimichurri, charred broccolini, roasted cherry tomatoes and rosemary sweet potato.",
    ingredients: [["steak", 200], ["chimichurri", 25], ["broccoli", 90], ["cherry-tomatoes", 60], ["sweet-potato", 110]] },

  // Sides
  { slug: "oven-baked-fries", name: "Oven-Baked Fries", category: "sides", priceCents: 595,
    description: "Thick-cut skin-on potatoes baked in olive oil with sea salt, rosemary and garlic, with house ketchup.",
    ingredients: [["potato", 180], ["garlic", 2], ["house-ketchup", 25]] },
  { slug: "sweet-potato-fries", name: "Sweet Potato Fries", category: "sides", priceCents: 650,
    description: "Oven-baked sweet potato with smoked paprika, sea salt and parsley, with a garlic yoghurt dip.",
    ingredients: [["sweet-potato-fries", 180], ["yogurt-sauce", 30], ["fresh-herbs", 1]] },
  { slug: "hummus-veggie-sticks", name: "Hummus and Veggie Sticks", category: "sides", priceCents: 795,
    description: "Smooth hummus with olive oil and paprika, with carrot, cucumber, celery, red pepper and radish sticks and toasted pita.",
    ingredients: [["hummus", 100], ["olive-oil", 5], ["carrot", 40], ["cucumber", 40], ["celery", 30], ["bell-pepper", 30], ["radish", 15], ["pita", 40]] },

  // Kids
  { slug: "kids-mini-burger", name: "Mini Burger Plate", category: "kids", priceCents: 895,
    description: "A small beef slider on a whole-grain bun with cheddar and lettuce, oven-baked fries, cucumber, carrot, grapes and milk.",
    ingredients: [["beef-patty", 60], ["whole-grain-bun", 45], ["cheddar", 12], ["lettuce", 5], ["potato", 60], ["cucumber", 25], ["carrot", 25], ["grapes", 40], ["milk", 150]] },
  { slug: "kids-chicken-tenders", name: "Crispy Baked Chicken Tenders", category: "kids", priceCents: 895,
    description: "Four almond and whole-wheat crumbed tenders, baked not fried, with honey-mustard yoghurt dip, carrot and apple.",
    ingredients: [["chicken-tenders", 110], ["honey-mustard-dip", 20], ["carrot", 40], ["apple", 50]] },
  { slug: "kids-mac-and-cheese", name: "Butternut Mac and Cheese", category: "kids", priceCents: 850,
    description: "Whole-wheat macaroni in a roasted butternut and real cheddar sauce, toasted crumbs and peas, with strawberries.",
    ingredients: [["macaroni", 130], ["butternut", 60], ["cheddar", 25], ["milk", 30], ["breadcrumbs", 8], ["peas", 15], ["strawberries", 40]] },

  // Juices and smoothies
  { slug: "green-juice", name: "Green Juice", category: "juices-smoothies", priceCents: 750,
    description: "Freshly pressed cucumber, celery, green apple, spinach, lemon and ginger.",
    ingredients: [["green-juice", 350]] },
  { slug: "berry-smoothie", name: "Berry Smoothie", category: "juices-smoothies", priceCents: 795,
    description: "Thick mixed berry and banana smoothie, topped with blueberries and a sprinkle of granola.",
    ingredients: [["mixed-berries", 150], ["banana", 80], ["oat-milk", 150], ["blueberries", 10], ["granola", 10]] },
  { slug: "ginger-shot", name: "Ginger Shot", category: "juices-smoothies", priceCents: 395,
    description: "A bright pressed shot of ginger, turmeric and lemon.",
    ingredients: [["ginger", 25], ["turmeric", 10], ["lemon", 25]] },

  // Coffee and tea
  { slug: "oat-milk-latte", name: "Oat Milk Latte", category: "coffee-tea", priceCents: 525,
    description: "Double espresso with steamed oat milk.",
    ingredients: [["espresso", 50], ["oat-milk", 220]] },

  // Drinks
  { slug: "honey-lemonade", name: "Honey Lemonade", category: "drinks", priceCents: 550,
    description: "Freshly squeezed lemons, a little honey, ice and mint.",
    ingredients: [["lemon", 60], ["honey", 18], ["water", 250]] },
  { slug: "matcha-latte", name: "Matcha Latte", category: "drinks", priceCents: 595,
    description: "Whisked matcha with steamed oat milk.",
    ingredients: [["matcha", 3], ["oat-milk", 240]] },
  { slug: "kombucha", name: "Kombucha", category: "drinks", priceCents: 595,
    description: "Sparkling ginger kombucha, with a thin slice of fresh ginger.",
    ingredients: [["kombucha", 330], ["ginger", 2]] },
  { slug: "iced-hibiscus-tea", name: "Iced Hibiscus Tea", category: "drinks", priceCents: 495,
    description: "Deep ruby hibiscus tea over ice with lime and mint.",
    ingredients: [["hibiscus-tea", 350], ["lime", 10]] },

  // Natural sweets
  { slug: "date-cacao-bites", name: "Date and Cacao Bites", category: "sweets", priceCents: 595,
    description: "Six bites of Medjool date and cacao, rolled in coconut or crushed pistachio.",
    ingredients: [["dates", 70], ["cacao", 12], ["coconut-flakes", 6], ["pistachio", 6]] },
  { slug: "seasonal-fruit-cup", name: "Seasonal Fruit Cup", category: "sweets", priceCents: 695, seasonal: true,
    description: "Freshly cut berries, kiwi, mango and pomegranate with a sprig of mint.",
    ingredients: [["mixed-berries", 70], ["kiwi", 50], ["mango", 60], ["pomegranate", 20], ["fresh-herbs", 1]] },

  // Treats
  { slug: "dark-chocolate-brownie", name: "Dark Chocolate Brownie", category: "treats", priceCents: 575,
    description: "Fudgy, sweetened with dates, with cacao nibs and flaky sea salt.",
    ingredients: [["brownie", 80], ["cacao", 3]] },
  { slug: "banana-bread", name: "Banana Bread", category: "treats", priceCents: 550,
    description: "Two thick slices with walnuts and a little dish of honey.",
    ingredients: [["banana-bread", 110], ["honey", 10]] },
  { slug: "carrot-cake", name: "Carrot Cake", category: "treats", priceCents: 650,
    description: "Spiced carrot and walnut layers with a thin honey cream-cheese frosting.",
    ingredients: [["carrot-cake", 110], ["honey-frosting", 25], ["walnuts", 5]] },
  { slug: "berry-frozen-yogurt", name: "Berry Frozen Yogurt", category: "treats", priceCents: 650,
    description: "Greek frozen yoghurt swirled with berry compote, fresh berries and a drizzle of honey.",
    ingredients: [["frozen-yogurt", 120], ["mixed-berries", 50], ["honey", 6], ["fresh-herbs", 1]] },
];

// The bowl builder. Option images live in public/images/builder/<folder>/<image>.png.
type BuilderOption = { name: string; ingredient: string; grams: number; image: string; extraCents?: number };

export const BOWL_BUILDER = {
  slug: "build-your-own-bowl",
  name: "Build your own bowl",
  category: "build-your-own",
  priceCents: 1095,
  description: "Choose a base, a protein, up to five toppings and a dressing. Price, calories and macros update as you build.",
  imageUrl: "/images/builder/bowl-empty.png",
  groups: [
    {
      name: "Base", folder: "bases", min: 1, max: 1,
      options: [
        { name: "Quinoa", ingredient: "quinoa", grams: 180, image: "quinoa" },
        { name: "Brown rice", ingredient: "brown-rice", grams: 180, image: "brown-rice" },
        { name: "Farro", ingredient: "farro", grams: 170, image: "farro" },
        { name: "Mixed greens", ingredient: "mixed-greens", grams: 90, image: "mixed-greens" },
        { name: "Baby spinach", ingredient: "baby-spinach", grams: 90, image: "baby-spinach" },
        { name: "Massaged kale", ingredient: "kale", grams: 90, image: "kale" },
      ] as BuilderOption[],
    },
    {
      name: "Protein", folder: "proteins", min: 1, max: 1,
      options: [
        { name: "Grilled chicken", ingredient: "chicken", grams: 110, image: "grilled-chicken", extraCents: 250 },
        { name: "Miso salmon", ingredient: "salmon-miso", grams: 110, image: "miso-salmon", extraCents: 450 },
        { name: "Baked tofu", ingredient: "tofu", grams: 110, image: "baked-tofu", extraCents: 150 },
        { name: "Baked falafel", ingredient: "falafel", grams: 100, image: "falafel", extraCents: 150 },
        { name: "Roasted chickpeas", ingredient: "chickpeas", grams: 90, image: "roasted-chickpeas" },
        { name: "Soft-boiled egg", ingredient: "egg", grams: 55, image: "soft-boiled-egg", extraCents: 100 },
      ] as BuilderOption[],
    },
    {
      name: "Toppings", folder: "toppings", min: 0, max: 5,
      options: [
        { name: "Avocado", ingredient: "avocado", grams: 50, image: "avocado", extraCents: 150 },
        { name: "Roasted sweet potato", ingredient: "sweet-potato", grams: 60, image: "sweet-potato", extraCents: 75 },
        { name: "Broccoli", ingredient: "broccoli", grams: 50, image: "broccoli", extraCents: 75 },
        { name: "Cherry tomatoes", ingredient: "cherry-tomatoes", grams: 40, image: "cherry-tomatoes", extraCents: 50 },
        { name: "Cucumber", ingredient: "cucumber", grams: 40, image: "cucumber", extraCents: 50 },
        { name: "Charred corn", ingredient: "corn", grams: 40, image: "corn", extraCents: 50 },
        { name: "Edamame", ingredient: "edamame", grams: 40, image: "edamame", extraCents: 75 },
        { name: "Red cabbage", ingredient: "red-cabbage", grams: 30, image: "red-cabbage", extraCents: 50 },
        { name: "Pickled red onion", ingredient: "pickled-red-onion", grams: 20, image: "pickled-red-onion", extraCents: 50 },
        { name: "Feta", ingredient: "feta", grams: 30, image: "feta", extraCents: 100 },
        { name: "Toasted almonds", ingredient: "almonds", grams: 15, image: "almonds", extraCents: 75 },
        { name: "Pumpkin seeds", ingredient: "pumpkin-seeds", grams: 15, image: "seeds", extraCents: 75 },
      ] as BuilderOption[],
    },
    {
      name: "Dressing", folder: "dressings", min: 1, max: 1,
      options: [
        { name: "Lemon-tahini", ingredient: "lemon-tahini", grams: 30, image: "lemon-tahini" },
        { name: "Maple-tahini", ingredient: "maple-tahini", grams: 30, image: "maple-tahini" },
        { name: "Miso-ginger", ingredient: "miso-ginger", grams: 30, image: "miso-ginger" },
        { name: "Green herb", ingredient: "green-herb", grams: 30, image: "green-herb" },
        { name: "Balsamic", ingredient: "balsamic", grams: 25, image: "balsamic" },
        { name: "Olive oil and lemon", ingredient: "olive-oil-lemon", grams: 20, image: "olive-oil-lemon" },
      ] as BuilderOption[],
    },
  ],
};

export const ADD_PROTEIN_OPTIONS = [
  { name: "Grilled chicken", ingredient: "chicken", grams: 100, extraCents: 350 },
  { name: "Miso salmon", ingredient: "salmon-miso", grams: 100, extraCents: 550 },
  { name: "Baked tofu", ingredient: "tofu", grams: 100, extraCents: 250 },
];
