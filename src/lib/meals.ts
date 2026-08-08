export const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

export type MealType = (typeof mealTypes)[number];

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: "صبحانه",
  lunch: "ناهار",
  dinner: "شام",
  snack: "میان‌وعده",
};

export type MealItemSource = "ai_estimate" | "local_db" | "user_edited";

export type MealItemInput = {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  quantity?: string;
  source?: MealItemSource;
};

export type MealItem = MealItemInput & { id: string };

export type MealLog = {
  id: string;
  mealType: MealType;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  loggedAt: string;
  items: MealItem[];
};
