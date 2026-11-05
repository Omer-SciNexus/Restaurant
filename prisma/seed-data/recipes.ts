// DRAFT RECIPES. Written by the developers, not the chef, so every amount, time and step here
// is draft content for the chef to correct and film. The plan's split: 4 bowls and salads,
// 2 breakfasts, 2 natural classics, 2 drinks, 2 treats. No videos exist yet (filming is plan
// weeks 6-11), so none is seeded; the pages say "Video coming soon".
//
// Rules for editing:
// - `dish` is the menu dish behind the recipe. Grams come from that dish, one portion times
//   `servings`, so a serving has the same nutrition and allergens as the menu.
// - `ingredients` must list every ingredient of that dish, with the same keys. Each text is the
//   amount for the whole recipe. Where the ingredient data describes something cooked, the text
//   says so, because metric mode shows that weight next to the same words.
// - Step text never states an amount of a listed ingredient, because steps do not scale.
// - A step can mention salt, pepper, water or a dry spice, which carry no major allergen. It must
//   never add anything with an allergen that is not on the ingredient list.
// - House dressings stay secret, as the plan allows: each recipe shows a simple home version.

export type RecipeSeed = {
  dish: string;
  slug: string;
  title: string;
  description: string;
  prepMin: number;
  cookMin: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  servings: number;
  ingredients: Record<string, string>;
  steps: { text: string; timerSec?: number }[];
};

const MIN = 60;

export const RECIPES: RecipeSeed[] = [
  // Bowls and salads
  {
    dish: "harvest-quinoa-bowl",
    slug: "harvest-quinoa-bowl",
    title: "Harvest Quinoa Bowl",
    description: "Warm quinoa with roasted sweet potato, spiced chickpeas, soft kale and a simple maple-tahini dressing. Most of the time is the oven doing the work.",
    prepMin: 15,
    cookMin: 35,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      quinoa: "1 2/3 cups cooked quinoa",
      "sweet-potato": "1 medium sweet potato, cubed",
      kale: "3 cups chopped kale",
      chickpeas: "3/4 cup roasted chickpeas",
      avocado: "1 small avocado, sliced",
      "pickled-red-onion": "2 tbsp pickled red onion",
      "pumpkin-seeds": "2 tbsp pumpkin seeds",
      "maple-tahini": "1/4 cup maple-tahini dressing",
    },
    steps: [
      { text: "Heat the oven to 425°F (220°C). Spread the sweet potato on a lined tray with a pinch of salt and roast.", timerSec: 10 * MIN },
      { text: "While it roasts, drain and pat dry canned chickpeas and toss them with smoked paprika, ground cumin and a pinch of salt. Add them to the tray, turn everything over and roast until the edges colour.", timerSec: 15 * MIN },
      { text: "Rinse the quinoa and simmer it in twice its volume of water until the water has gone and the grains have opened. Dry quinoa roughly triples when cooked, so start with about a third of the amount listed.", timerSec: 15 * MIN },
      { text: "Rub the kale with a pinch of salt for about a minute, until it turns dark and soft.", timerSec: 1 * MIN },
      { text: "For a simple home dressing, whisk two parts tahini with one part maple syrup and a squeeze of lemon, then loosen with cold water until it pours. Our house version stays in our kitchens, but this comes close." },
      { text: "Share the quinoa between the bowls. Add the sweet potato, chickpeas, kale and avocado in sections, then finish with pickled onion, pumpkin seeds and the dressing." },
    ],
  },
  {
    dish: "miso-salmon-bowl",
    slug: "miso-salmon-bowl",
    title: "Miso Salmon Bowl",
    description: "Oven-glazed miso salmon over brown rice with crisp vegetables, avocado and sesame. A good one for a weeknight once the rice is on.",
    prepMin: 15,
    cookMin: 35,
    difficulty: "MEDIUM",
    servings: 2,
    ingredients: {
      "brown-rice": "1 2/3 cups cooked brown rice",
      "salmon-miso": "2 salmon fillets",
      edamame: "1/2 cup shelled edamame",
      "red-cabbage": "3/4 cup shredded red cabbage",
      cucumber: "1/2 cucumber, cut into ribbons",
      radish: "2 radishes, thinly sliced",
      avocado: "1/2 avocado, sliced",
      "sesame-seeds": "1 tbsp sesame seeds",
      "spring-onion": "1 spring onion, sliced",
    },
    steps: [
      { text: "Rinse the rice and simmer it, covered, in about twice its volume of water until tender. Take it off the heat and leave the lid on while you do the rest. Dry rice roughly doubles when cooked, so start with about half of the amount listed.", timerSec: 30 * MIN },
      { text: "Heat the oven to 400°F (200°C). Stir white miso with a little maple syrup and water to make a thick glaze. Check the miso label if you are avoiding wheat or barley." },
      { text: "Put the salmon on a lined tray, spoon the glaze over and bake until it flakes at the thickest part.", timerSec: 12 * MIN },
      { text: "Boil the edamame in salted water, then drain and cool under the cold tap.", timerSec: 3 * MIN },
      { text: "Share the rice between the bowls. Lay the salmon on top with the edamame, cabbage, cucumber, radish and avocado beside it, then scatter over the sesame and spring onion." },
    ],
  },
  {
    dish: "chickpea-shawarma-bowl",
    slug: "chickpea-shawarma-bowl",
    title: "Chickpea Shawarma Bowl",
    description: "Warmly spiced chickpeas over herbed brown rice, with tabbouleh, hummus and a sharp lemon-tahini dressing. Shop-bought hummus and pickles are fine here.",
    prepMin: 15,
    cookMin: 40,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      "brown-rice": "1 1/2 cups cooked brown rice",
      chickpeas: "1 1/3 cups roasted chickpeas",
      tabbouleh: "3/4 cup tabbouleh",
      "cherry-tomatoes": "1/2 cup cherry tomatoes, halved",
      cucumber: "1/2 cucumber, diced",
      "pickled-turnip": "1/4 cup pickled turnip",
      hummus: "1/3 cup hummus",
      "lemon-tahini": "3 tbsp lemon-tahini dressing",
    },
    steps: [
      { text: "Rinse the rice and simmer it, covered, in about twice its volume of water until tender. Dry rice roughly doubles when cooked, so start with about half of the amount listed.", timerSec: 30 * MIN },
      { text: "Heat the oven to 425°F (220°C). Drain and pat dry canned chickpeas, toss them with ground cumin, coriander, paprika, a little cinnamon and a pinch of salt, then roast until crisp at the edges.", timerSec: 20 * MIN },
      { text: "For a simple home dressing, whisk tahini with lemon juice and a pinch of salt, then loosen with cold water until it pours." },
      { text: "Fork the rice through with any herbs you have to hand." },
      { text: "Share the rice between the bowls. Add the chickpeas, tabbouleh, tomatoes, cucumber and pickled turnip, then a spoonful of hummus and the dressing." },
    ],
  },
  {
    dish: "mediterranean-lentil-salad",
    slug: "mediterranean-lentil-salad",
    title: "Mediterranean Lentil Salad",
    description: "Green lentils dressed while warm, with cucumber, tomatoes, olives and feta. It keeps well, so it makes a good lunch for the next day too.",
    prepMin: 15,
    cookMin: 25,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      "green-lentils": "2 cups cooked green lentils",
      cucumber: "1 small cucumber, diced",
      "cherry-tomatoes": "3/4 cup cherry tomatoes, halved",
      "red-onion": "1/4 red onion, finely sliced",
      "fresh-herbs": "1/2 cup chopped parsley",
      olives: "1/4 cup Kalamata olives, halved",
      feta: "1/3 cup crumbled feta",
      "olive-oil-lemon": "2 tbsp olive oil and lemon dressing",
    },
    steps: [
      { text: "Rinse the lentils and simmer them in plenty of unsalted water until tender but still holding their shape. Dry lentils roughly double when cooked, so start with about half of the amount listed.", timerSec: 25 * MIN },
      { text: "Whisk olive oil and lemon juice, about three parts oil to one part juice, with a pinch of salt." },
      { text: "Drain the lentils well and stir in the dressing while they are warm, so they soak it up. Leave them to cool a little.", timerSec: 5 * MIN },
      { text: "Fold in the cucumber, tomatoes, onion, parsley and olives. Taste for salt, remembering that the feta and olives are salty." },
      { text: "Share between plates and crumble the feta over the top." },
    ],
  },

  // Breakfasts
  {
    dish: "berry-overnight-oats",
    slug: "berry-overnight-oats",
    title: "Berry Overnight Oats",
    description: "Creamy oats with fresh berries, toasted almonds and a thin line of honey. Ten minutes of work the night before, then breakfast is waiting in the fridge.",
    prepMin: 10,
    cookMin: 0,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      "rolled-oats": "1 1/3 cups rolled oats",
      "oat-milk": "1 1/4 cups oat milk",
      blueberries: "1/3 cup blueberries",
      raspberries: "1/2 cup raspberries",
      strawberries: "1/3 cup sliced strawberries",
      almonds: "2 tbsp toasted almonds, chopped",
      chia: "4 tsp chia seeds",
      honey: "2 tsp honey",
    },
    steps: [
      { text: "Stir the oats, oat milk and chia together in a bowl or two jars." },
      { text: "Leave it to stand, then stir again so the chia does not settle in a clump.", timerSec: 10 * MIN },
      { text: "Cover and chill overnight, or for at least six hours." },
      { text: "In the morning, loosen with a splash of oat milk if it is too thick. Top with the berries and almonds, and finish with a thin line of honey." },
    ],
  },
  {
    dish: "avocado-egg-sourdough",
    slug: "avocado-egg-sourdough",
    title: "Avocado and Egg Sourdough",
    description: "Toasted sourdough with smashed avocado and a jammy soft-boiled egg. Set a timer for the egg, and the rest looks after itself.",
    prepMin: 5,
    cookMin: 10,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      sourdough: "2 large slices sourdough bread",
      avocado: "1 large avocado",
      egg: "2 eggs",
      microgreens: "1/4 cup microgreens",
    },
    steps: [
      { text: "Bring a small pan of water to a gentle boil. Lower in the eggs from the fridge and cook for a jammy yolk.", timerSec: 7 * MIN },
      { text: "Lift the eggs into cold water to stop them cooking, then peel when you can hold them.", timerSec: 2 * MIN },
      { text: "Toast the sourdough while the eggs cool." },
      { text: "Mash the avocado with a pinch of salt and pile it onto the toast." },
      { text: "Halve the eggs and sit them on top. Finish with microgreens, and chilli flakes if you like some heat." },
    ],
  },

  // Natural classics
  {
    dish: "spaghetti-pomodoro",
    slug: "spaghetti-pomodoro",
    title: "Spaghetti Pomodoro",
    description: "Whole-wheat spaghetti in a slow tomato and garlic sauce with fresh basil. A simple home version of a sauce we make in our kitchens.",
    prepMin: 10,
    cookMin: 30,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      spaghetti: "3 cups cooked whole-wheat spaghetti",
      "tomato-sauce": "1 1/4 cups tomato sauce",
      "fresh-herbs": "1/4 cup basil leaves",
      parmesan: "1/4 cup grated parmesan",
      "olive-oil": "1 tbsp olive oil",
    },
    steps: [
      { text: "For a simple home sauce, warm half of the olive oil in a wide pan with a sliced garlic clove until it just starts to colour. Add canned crushed tomatoes and a pinch of salt." },
      { text: "Simmer gently, stirring now and then, until the sauce has thickened.", timerSec: 20 * MIN },
      { text: "Boil the spaghetti in well-salted water until just tender, then save a cup of the cooking water before draining. Dry spaghetti roughly triples in weight when cooked, so start with about a third of the amount listed.", timerSec: 10 * MIN },
      { text: "Toss the spaghetti through the sauce over the heat, adding a splash of the cooking water until it coats every strand." },
      { text: "Tear in the basil. Serve with the parmesan and the rest of the olive oil." },
    ],
  },
  {
    dish: "grilled-fish-tacos",
    slug: "grilled-fish-tacos",
    title: "Grilled Fish Tacos",
    description: "Soft corn tortillas with grilled white fish, crisp purple slaw and a lime-yoghurt crema. A griddle pan does the job if you have no grill.",
    prepMin: 15,
    cookMin: 10,
    difficulty: "MEDIUM",
    servings: 2,
    ingredients: {
      "corn-tortilla": "6 soft corn tortillas",
      "white-fish": "2 white fish fillets",
      "red-cabbage": "1 1/2 cups shredded red cabbage",
      radish: "2 radishes, thinly sliced",
      "fresh-herbs": "1/4 cup coriander leaves",
      "yogurt-sauce": "1/4 cup lime-yoghurt crema",
      salsa: "1/3 cup fresh tomato salsa",
      lime: "1/2 lime, in wedges",
    },
    steps: [
      { text: "For a simple home crema, stir Greek yoghurt with lime juice, a little grated garlic and a pinch of salt." },
      { text: "Toss the cabbage and radish with a squeeze of lime and a pinch of salt, and leave them to soften slightly." },
      { text: "Heat a griddle pan or grill until very hot. Pat the fish dry, season with salt and ground cumin, and cook on the first side without moving it.", timerSec: 4 * MIN },
      { text: "Turn the fish carefully and cook the other side until it flakes.", timerSec: 3 * MIN },
      { text: "Warm the tortillas in a dry pan for a few seconds a side, and keep them wrapped in a clean cloth." },
      { text: "Break the fish into large pieces. Fill the tortillas with slaw, fish, salsa, crema and coriander, and serve with the lime wedges." },
    ],
  },

  // Drinks
  {
    dish: "honey-lemonade",
    slug: "honey-lemonade",
    title: "Honey Lemonade",
    description: "Freshly squeezed lemons with a little honey and plenty of ice. Warming some of the water first helps the honey dissolve.",
    prepMin: 10,
    cookMin: 0,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      lemon: "2 small lemons, juiced",
      honey: "1 1/2 tbsp honey",
      water: "2 cups water",
    },
    steps: [
      { text: "Warm a little of the water and stir in the honey until it dissolves." },
      { text: "Add the lemon juice and the rest of the water to a jug, then stir in the honey water." },
      { text: "Chill until cold.", timerSec: 30 * MIN },
      { text: "Pour over ice. Add a few mint leaves if you have some." },
    ],
  },
  {
    dish: "iced-hibiscus-tea",
    slug: "iced-hibiscus-tea",
    title: "Iced Hibiscus Tea",
    description: "Deep ruby hibiscus tea over ice with lime. Dried hibiscus flowers are sold in many supermarkets and Latin American grocers, often as flor de Jamaica.",
    prepMin: 5,
    cookMin: 10,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      "hibiscus-tea": "3 cups brewed hibiscus tea",
      lime: "1/2 lime, in wedges",
    },
    steps: [
      { text: "Pour just-boiled water over dried hibiscus flowers in a jug, using about a tablespoon of flowers for each cup of water, and leave to steep.", timerSec: 10 * MIN },
      { text: "Strain out the flowers and leave the tea to cool." },
      { text: "Chill until cold.", timerSec: 30 * MIN },
      { text: "Pour over ice with a squeeze of lime, and a sprig of mint if you have one." },
    ],
  },

  // Treats
  {
    dish: "date-cacao-bites",
    slug: "date-cacao-bites",
    title: "Date and Cacao Bites",
    description: "Soft Medjool dates blended with cacao and rolled in coconut or crushed pistachio. No baking and no refined sugar. Makes about twelve bites.",
    prepMin: 15,
    cookMin: 0,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      dates: "6 Medjool dates, pitted",
      cacao: "3 tbsp cacao powder",
      "coconut-flakes": "2 tbsp coconut flakes",
      pistachio: "1 1/2 tbsp crushed pistachios",
    },
    steps: [
      { text: "Blend the dates and cacao in a food processor until they clump into a ball. Add a teaspoon of water if the mixture stays crumbly." },
      { text: "With damp hands, roll the mixture into small bites." },
      { text: "Roll half in the coconut and half in the pistachio." },
      { text: "Chill until firm. They keep in the fridge for a few days.", timerSec: 20 * MIN },
    ],
  },
  {
    dish: "berry-frozen-yogurt",
    slug: "berry-frozen-yogurt",
    title: "Berry Frozen Yoghurt",
    description: "Greek frozen yoghurt swirled with a quick berry compote and a little honey. A home version that starts with a good tub from the shop.",
    prepMin: 10,
    cookMin: 5,
    difficulty: "EASY",
    servings: 2,
    ingredients: {
      "frozen-yogurt": "1 3/4 cups Greek frozen yoghurt",
      "mixed-berries": "3/4 cup mixed berries",
      honey: "2 tsp honey",
      "fresh-herbs": "2 sprigs mint",
    },
    steps: [
      { text: "Simmer most of the berries with half of the honey and a spoonful of water, until they collapse into a loose compote. Keep the rest of the berries for the top.", timerSec: 5 * MIN },
      { text: "Leave the compote to cool completely." },
      { text: "Let the frozen yoghurt soften on the counter until you can stir it.", timerSec: 10 * MIN },
      { text: "Swirl the compote through with a few strokes, so it stays in ribbons. Put it back in the freezer until scoopable.", timerSec: 60 * MIN },
      { text: "Scoop into bowls. Finish with the fresh berries, the rest of the honey and the mint." },
    ],
  },
];
