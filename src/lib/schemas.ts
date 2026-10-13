import { z } from "zod";

/**
 * Shared zod schemas. The `*AISchema` objects describe the JSON the model must
 * return (they are turned into structured-output JSON schemas server-side), and
 * the `*RequestSchema` objects validate what the browser sends to our API routes.
 *
 * Keep the AI schemas free of numeric/length constraints: structured outputs
 * can't enforce them, so a stray extra item would fail validation. We trim and
 * clamp in code instead (see lib/ai/normalize.ts).
 */

export const STORE_SECTIONS = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Pantry",
  "Spices & Seasonings",
  "Frozen",
  "Drinks",
  "Other",
] as const;

// Enums are passed to the model as hints (the SDK's schema transform doesn't
// enforce them), so unknown values fall back instead of failing validation.
export const SectionSchema = z.enum(STORE_SECTIONS).catch("Other");
export type Section = z.infer<typeof SectionSchema>;

// ---------- /api/analyze ----------

export const ActionTypeSchema = z.enum(["recipe", "grocery", "modify", "question"]).catch("question");
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const SuggestedActionSchema = z.object({
  id: z.string().describe("Short kebab-case id, e.g. 'find-recipe' or 'make-vegetarian'"),
  label: z.string().describe("Tappable phrase, under 45 characters"),
  type: ActionTypeSchema,
});
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;

export const AnalysisAISchema = z.object({
  dish_name: z.string().describe("Most likely dish name, in Title Case"),
  cuisine: z.string(),
  confidence: z.enum(["high", "medium", "low"]).catch("medium"),
  alternatives: z.array(z.string()).describe("2-3 other plausible dishes"),
  visible_ingredients: z.array(z.string()).describe("Ingredients you can actually see, lowercase"),
  likely_cooking_methods: z.array(z.string()),
  suggested_actions: z.array(SuggestedActionSchema).describe("5-7 actions; recipe first, grocery second"),
  not_food: z.boolean().describe("True if the photo does not show a plated meal or dish"),
});
export type Analysis = z.infer<typeof AnalysisAISchema>;

// ---------- /api/recipe ----------

export const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable().describe("Numeric amount, or null for 'to taste'"),
  unit: z.string().describe("Unit such as tsp, tbsp, cup, oz, lb, g, ml, clove, or '' for whole items"),
  section: SectionSchema,
  inferred: z.boolean().describe("True if this was inferred rather than seen in the photo"),
  notes: z.string().nullable(),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

export const StepSchema = z.object({
  number: z.number(),
  instruction: z.string(),
  duration_minutes: z.number().nullable().describe("Hands-off time worth a timer, else null"),
  temperature: z.string().nullable(),
  ingredients_used: z.array(z.string()),
});
export type Step = z.infer<typeof StepSchema>;

export const FollowUpSchema = z.object({
  label: z.string().describe("Short tappable phrase, under 40 characters"),
  type: z
    .enum(["modify", "question"])
    .catch("question")
    .describe("modify = rewrite the recipe; question = answer without changing it"),
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

export const RecipeAISchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number(),
  prep_minutes: z.number(),
  cook_minutes: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]).catch("medium"),
  equipment: z.array(z.string()),
  ingredients: z.array(IngredientSchema),
  steps: z.array(StepSchema),
  tips: z.array(z.string()).describe("2-3 'where home cooks usually go wrong' tips"),
  substitutions: z.array(z.object({ ingredient: z.string(), swap: z.string() })),
  tags: z.array(z.string()).describe("Lowercase tags such as quick, healthy, vegetarian, comfort, spicy"),
  follow_up_actions: z.array(FollowUpSchema).describe("4-6 next-step suggestions"),
  change_summary: z
    .string()
    .nullable()
    .describe("When modifying a recipe: one short sentence on what changed, else null"),
});
export type RecipeAI = z.infer<typeof RecipeAISchema>;

// ---------- /api/grocery ----------

export const GroceryAISchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().nullable(),
      unit: z.string(),
      section: SectionSchema,
      staple: z.boolean().describe("True for things most kitchens already have"),
      from: z.array(z.string()).describe("Titles of the recipes that need this item"),
    }),
  ),
});
export type GroceryAI = z.infer<typeof GroceryAISchema>;

// ---------- /api/ask ----------

export const AskAISchema = z.object({
  answer: z.string(),
  follow_ups: z.array(FollowUpSchema).describe("Exactly 3 follow-up suggestions"),
});
export type AskAI = z.infer<typeof AskAISchema>;

// ---------- Request validation ----------

const MAX_IMAGE_CHARS = 7_000_000; // ~5 MB of base64

export const DataUrlImageSchema = z
  .string()
  .max(MAX_IMAGE_CHARS)
  .regex(/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/, "Expected a base64 image");

export const UnitsSchema = z.enum(["us", "metric"]);
export type Units = z.infer<typeof UnitsSchema>;

const DietSchema = z.array(z.string().max(40)).max(20).default([]);

export const AnalyzeRequestSchema = z.object({
  mealImage: DataUrlImageSchema,
  menuImage: DataUrlImageSchema.nullish(),
  note: z.string().max(600).nullish(),
  diet: DietSchema,
  dishHint: z.string().max(120).nullish(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const RecipeRequestSchema = z.object({
  dishName: z.string().min(1).max(120),
  cuisine: z.string().max(80).nullish(),
  ingredients: z.array(z.string().max(80)).max(60).default([]),
  mealImage: DataUrlImageSchema.nullish(),
  menuImage: DataUrlImageSchema.nullish(),
  note: z.string().max(600).nullish(),
  diet: DietSchema,
  units: UnitsSchema.default("us"),
  modifier: z.string().max(300).nullish(),
  baseRecipe: RecipeAISchema.nullish(),
});
export type RecipeRequest = z.infer<typeof RecipeRequestSchema>;

export const GroceryRequestSchema = z.object({
  recipes: z
    .array(
      z.object({
        title: z.string().max(160),
        servings: z.number().min(1).max(48),
        ingredients: z
          .array(
            z.object({
              name: z.string().max(120),
              quantity: z.number().nullable(),
              unit: z.string().max(40),
              section: SectionSchema,
            }),
          )
          .max(80),
      }),
    )
    .min(1)
    .max(12),
  staples: z.array(z.string().max(60)).max(60).default([]),
  units: UnitsSchema.default("us"),
});
export type GroceryRequest = z.infer<typeof GroceryRequestSchema>;

export const AskRequestSchema = z.object({
  question: z.string().min(1).max(500),
  dish: z.object({
    name: z.string().max(120),
    cuisine: z.string().max(80).nullish(),
    visible_ingredients: z.array(z.string().max(80)).max(60).default([]),
  }),
  recipe: RecipeAISchema.nullish(),
  history: z
    .array(z.object({ question: z.string().max(500), answer: z.string().max(4000) }))
    .max(6)
    .default([]),
  diet: DietSchema,
  units: UnitsSchema.default("us"),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;
