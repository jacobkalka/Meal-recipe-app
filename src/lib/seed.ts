import type { Recipe, RecipeAI } from "./types";

/**
 * Example recipes shown before the first scan so the app never looks empty.
 * Images are stylised illustrations in /public/seed; swap them for real
 * photos (same file names) whenever you like.
 */

const gnocchi: RecipeAI = {
  title: "Creamy Gnocchi with Leek & Miso",
  description:
    "Pillowy gnocchi in a silky leek, miso and parmesan cream with wilted spinach and toasted walnuts. A home version inspired by a bistro favourite.",
  servings: 2,
  prep_minutes: 10,
  cook_minutes: 15,
  difficulty: "easy",
  equipment: ["Large skillet", "Pot", "Slotted spoon", "Grater"],
  ingredients: [
    { name: "potato gnocchi", quantity: 1, unit: "lb", section: "Pantry", inferred: false, notes: "shelf-stable or fresh" },
    { name: "leeks", quantity: 2, unit: "", section: "Produce", inferred: false, notes: "white and light green parts, thinly sliced" },
    { name: "unsalted butter", quantity: 2, unit: "tbsp", section: "Dairy & Eggs", inferred: true, notes: null },
    { name: "garlic", quantity: 2, unit: "clove", section: "Produce", inferred: true, notes: "minced" },
    { name: "white miso paste", quantity: 1, unit: "tbsp", section: "Pantry", inferred: true, notes: null },
    { name: "heavy cream", quantity: 0.5, unit: "cup", section: "Dairy & Eggs", inferred: true, notes: null },
    { name: "parmesan", quantity: 0.5, unit: "cup", section: "Dairy & Eggs", inferred: false, notes: "finely grated, plus more to serve" },
    { name: "baby spinach", quantity: 2, unit: "cup", section: "Produce", inferred: false, notes: null },
    { name: "walnuts", quantity: 0.33, unit: "cup", section: "Pantry", inferred: false, notes: "roughly chopped" },
    { name: "lemon", quantity: 0.5, unit: "", section: "Produce", inferred: true, notes: "juiced" },
    { name: "black pepper", quantity: null, unit: "to taste", section: "Spices & Seasonings", inferred: true, notes: null },
  ],
  steps: [
    { number: 1, instruction: "Toast the walnuts in a dry large skillet over medium heat, shaking the pan, until fragrant and a shade darker. Tip them onto a plate.", duration_minutes: 4, temperature: null, ingredients_used: ["walnuts"] },
    { number: 2, instruction: "Bring a pot of well-salted water to a boil for the gnocchi.", duration_minutes: null, temperature: null, ingredients_used: [] },
    { number: 3, instruction: "Melt the butter in the same skillet over medium-low heat. Add the leeks with a pinch of salt and cook, stirring often, until very soft and sweet but not browned.", duration_minutes: 8, temperature: null, ingredients_used: ["unsalted butter", "leeks"] },
    { number: 4, instruction: "Stir in the garlic for 30 seconds. Whisk the miso into the cream, pour it into the pan and simmer gently until slightly thickened.", duration_minutes: 2, temperature: null, ingredients_used: ["garlic", "white miso paste", "heavy cream"] },
    { number: 5, instruction: "Boil the gnocchi until they float, then scoop them straight into the sauce with a splash of their cooking water.", duration_minutes: 3, temperature: null, ingredients_used: ["potato gnocchi"] },
    { number: 6, instruction: "Fold in the spinach and parmesan until the spinach wilts and the sauce turns glossy. Loosen with more cooking water if it looks tight.", duration_minutes: null, temperature: null, ingredients_used: ["baby spinach", "parmesan"] },
    { number: 7, instruction: "Season with lemon juice and black pepper. Spoon into bowls and top with the toasted walnuts and extra parmesan.", duration_minutes: null, temperature: null, ingredients_used: ["lemon", "black pepper", "walnuts", "parmesan"] },
  ],
  tips: [
    "Cook the leeks low and slow. Browned leeks turn bitter and drown out the miso.",
    "Miso is salty, so taste the sauce before adding any extra salt.",
    "Scoop the gnocchi instead of draining them: they stay tender and bring starchy water for the sauce.",
  ],
  substitutions: [
    { ingredient: "heavy cream", swap: "Half-and-half with 1 tsp cornstarch, or cashew cream for dairy-free" },
    { ingredient: "white miso paste", swap: "1 tsp soy sauce plus 1 tbsp extra parmesan" },
    { ingredient: "walnuts", swap: "Toasted pine nuts or buttery breadcrumbs" },
  ],
  tags: ["quick", "vegetarian", "comfort"],
  follow_up_actions: [
    { label: "Make it dairy-free", type: "modify" },
    { label: "Add a protein", type: "modify" },
    { label: "Make it healthier", type: "modify" },
    { label: "What wine goes with it?", type: "question" },
    { label: "Can I use homemade gnocchi?", type: "question" },
  ],
  change_summary: null,
};

const friedRice: RecipeAI = {
  title: "Veggie Fried Rice with Jammy Eggs",
  description:
    "Crispy-edged rice tossed with charred zucchini and cabbage, finished with soy, sesame and soft-centred eggs. A home version inspired by a café rice bowl.",
  servings: 2,
  prep_minutes: 5,
  cook_minutes: 10,
  difficulty: "easy",
  equipment: ["Wok or large skillet", "Small saucepan", "Slotted spoon"],
  ingredients: [
    { name: "eggs", quantity: 2, unit: "", section: "Dairy & Eggs", inferred: false, notes: null },
    { name: "cooked jasmine rice", quantity: 3, unit: "cup", section: "Pantry", inferred: false, notes: "day-old and cold" },
    { name: "zucchini", quantity: 1, unit: "", section: "Produce", inferred: false, notes: "diced" },
    { name: "green cabbage", quantity: 2, unit: "cup", section: "Produce", inferred: false, notes: "thinly shredded" },
    { name: "scallions", quantity: 3, unit: "", section: "Produce", inferred: false, notes: "whites and greens sliced separately" },
    { name: "garlic", quantity: 2, unit: "clove", section: "Produce", inferred: true, notes: "minced" },
    { name: "neutral oil", quantity: 2, unit: "tbsp", section: "Pantry", inferred: true, notes: null },
    { name: "soy sauce", quantity: 2, unit: "tbsp", section: "Pantry", inferred: true, notes: null },
    { name: "toasted sesame oil", quantity: 1, unit: "tsp", section: "Pantry", inferred: true, notes: null },
    { name: "fresh parsley", quantity: 0.25, unit: "cup", section: "Produce", inferred: false, notes: "leaves" },
    { name: "salt", quantity: null, unit: "to taste", section: "Spices & Seasonings", inferred: true, notes: null },
  ],
  steps: [
    { number: 1, instruction: "Lower the eggs into a small saucepan of boiling water and cook for 6½ minutes, then move them to a bowl of ice water.", duration_minutes: 6.5, temperature: null, ingredients_used: ["eggs"] },
    { number: 2, instruction: "Heat the oil in a wok or large skillet over high heat until shimmering. Stir-fry the zucchini and cabbage until crisp-tender with a few charred edges.", duration_minutes: 3, temperature: null, ingredients_used: ["neutral oil", "zucchini", "green cabbage"] },
    { number: 3, instruction: "Add the garlic and scallion whites and stir-fry for 30 seconds, until fragrant.", duration_minutes: null, temperature: null, ingredients_used: ["garlic", "scallions"] },
    { number: 4, instruction: "Add the cold rice, breaking up any clumps, and spread it across the pan. Let it sit for a minute to crisp, then toss and repeat.", duration_minutes: 3, temperature: null, ingredients_used: ["cooked jasmine rice"] },
    { number: 5, instruction: "Drizzle in the soy sauce and sesame oil, toss well, and season with salt to taste.", duration_minutes: null, temperature: null, ingredients_used: ["soy sauce", "toasted sesame oil", "salt"] },
    { number: 6, instruction: "Peel and halve the eggs. Serve the rice topped with the jammy eggs, scallion greens and parsley.", duration_minutes: null, temperature: null, ingredients_used: ["eggs", "scallions", "fresh parsley"] },
  ],
  tips: [
    "Use cold, day-old rice. Fresh rice steams and clumps instead of frying.",
    "Keep the heat high and don't crowd the pan, or the vegetables will stew.",
    "Get the eggs into ice water right away so the yolks stay jammy.",
  ],
  substitutions: [
    { ingredient: "cooked jasmine rice", swap: "Any cold cooked rice, or cauliflower rice for low-carb" },
    { ingredient: "soy sauce", swap: "Tamari for gluten-free" },
    { ingredient: "fresh parsley", swap: "Cilantro or Thai basil" },
  ],
  tags: ["quick", "vegetarian", "budget"],
  follow_up_actions: [
    { label: "Make it spicier", type: "modify" },
    { label: "Add chicken or shrimp", type: "modify" },
    { label: "Make it vegan", type: "modify" },
    { label: "Why day-old rice?", type: "question" },
    { label: "How do I store leftovers?", type: "question" },
  ],
  change_summary: null,
};

const tofuCurry: RecipeAI = {
  title: "Ginger Tofu Curry Bowl",
  description:
    "Crisp curry-spiced tofu and green beans in a gingery coconut sauce over jasmine rice. A home version inspired by a neighbourhood Thai-style bowl.",
  servings: 3,
  prep_minutes: 10,
  cook_minutes: 15,
  difficulty: "easy",
  equipment: ["Large nonstick skillet", "Mixing bowl", "Cutting board"],
  ingredients: [
    { name: "extra-firm tofu", quantity: 14, unit: "oz", section: "Produce", inferred: false, notes: "patted very dry" },
    { name: "fresh ginger", quantity: 1, unit: "tbsp", section: "Produce", inferred: false, notes: "grated" },
    { name: "curry powder", quantity: 1, unit: "tbsp", section: "Spices & Seasonings", inferred: true, notes: null },
    { name: "cornstarch", quantity: 1, unit: "tbsp", section: "Pantry", inferred: true, notes: null },
    { name: "neutral oil", quantity: 2, unit: "tbsp", section: "Pantry", inferred: true, notes: null },
    { name: "yellow onion", quantity: 1, unit: "", section: "Produce", inferred: false, notes: "thinly sliced" },
    { name: "garlic", quantity: 3, unit: "clove", section: "Produce", inferred: true, notes: "minced" },
    { name: "green beans", quantity: 8, unit: "oz", section: "Produce", inferred: false, notes: "trimmed" },
    { name: "coconut milk", quantity: 1, unit: "can", section: "Pantry", inferred: true, notes: "13.5 oz, full-fat" },
    { name: "soy sauce", quantity: 1, unit: "tbsp", section: "Pantry", inferred: true, notes: null },
    { name: "lime", quantity: 1, unit: "", section: "Produce", inferred: false, notes: null },
    { name: "cooked jasmine rice", quantity: 3, unit: "cup", section: "Pantry", inferred: false, notes: "warm, to serve" },
    { name: "scallions", quantity: 2, unit: "", section: "Produce", inferred: false, notes: "sliced, to serve" },
    { name: "salt and pepper", quantity: null, unit: "to taste", section: "Spices & Seasonings", inferred: true, notes: null },
  ],
  steps: [
    { number: 1, instruction: "On a cutting board, cut the tofu into cubes. Toss the cubed tofu with the ginger, curry powder, cornstarch and a pinch of salt and pepper in a bowl.", duration_minutes: null, temperature: null, ingredients_used: ["extra-firm tofu", "fresh ginger", "curry powder", "cornstarch", "salt and pepper"] },
    { number: 2, instruction: "Heat the oil in a large nonstick skillet over medium-high heat. Fry the tofu, turning occasionally, until golden and crisp on most sides, then set it aside.", duration_minutes: 8, temperature: null, ingredients_used: ["neutral oil", "extra-firm tofu"] },
    { number: 3, instruction: "In the same pan, cook the onion over medium heat until soft, then add the garlic for 30 seconds.", duration_minutes: 4, temperature: null, ingredients_used: ["yellow onion", "garlic"] },
    { number: 4, instruction: "Pour in the coconut milk and soy sauce, add the green beans, and simmer until the beans are just tender and the sauce coats a spoon.", duration_minutes: 6, temperature: null, ingredients_used: ["coconut milk", "soy sauce", "green beans"] },
    { number: 5, instruction: "Return the tofu to the pan, squeeze in half the lime, and season to taste.", duration_minutes: null, temperature: null, ingredients_used: ["extra-firm tofu", "lime", "salt and pepper"] },
    { number: 6, instruction: "Serve over the rice with scallions and the rest of the lime cut into wedges.", duration_minutes: null, temperature: null, ingredients_used: ["cooked jasmine rice", "scallions", "lime"] },
  ],
  tips: [
    "Pat the tofu very dry (or press it for 10 minutes) so it crisps instead of steaming.",
    "Let the curry powder fry with the tofu. Raw curry powder in a sauce tastes dusty.",
    "Add the tofu back at the very end so it keeps its crunch.",
  ],
  substitutions: [
    { ingredient: "extra-firm tofu", swap: "Chickpeas, or boneless chicken thighs" },
    { ingredient: "coconut milk", swap: "Light coconut milk for a leaner sauce" },
    { ingredient: "green beans", swap: "Broccoli florets or snap peas" },
  ],
  tags: ["quick", "vegan", "healthy", "high-protein"],
  follow_up_actions: [
    { label: "Make it spicier", type: "modify" },
    { label: "Make it with chicken", type: "modify" },
    { label: "Make it lower in fat", type: "modify" },
    { label: "How do I press tofu?", type: "question" },
    { label: "Can I meal-prep this?", type: "question" },
  ],
  change_summary: null,
};

function example(id: string, recipe: RecipeAI, imageUrl: string, likes: number, createdAt: number): Recipe {
  return {
    ...recipe,
    id,
    createdAt,
    scanId: null,
    imageId: null,
    imageUrl,
    parentId: null,
    modifier: null,
    saved: false,
    savedAt: null,
    likes,
    isExample: true,
    qa: [],
  };
}

// Fixed timestamps keep server and client renders identical.
export const SEED_RECIPES: Recipe[] = [
  example("example-gnocchi", gnocchi, "seed/gnocchi.svg", 286, 1_760_000_000_000),
  example("example-fried-rice", friedRice, "seed/fried-rice.svg", 80, 1_759_990_000_000),
  example("example-tofu-curry", tofuCurry, "seed/tofu-curry.svg", 69, 1_759_980_000_000),
];

/** Exposed so the mock AI can return realistic content. */
export const SEED_RECIPE_CONTENT = { gnocchi, friedRice, tofuCurry };
