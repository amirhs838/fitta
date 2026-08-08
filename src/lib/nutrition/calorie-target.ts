export type Gender = "male" | "female" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose_weight" | "gain_weight" | "build_muscle" | "maintain" | "fat_loss";

export type CalorieInput = {
  gender: Gender;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
};

const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function ageOnDate(birthDate: string, onDate = new Date()) {
  const birth = new Date(`${birthDate}T12:00:00Z`);
  if (Number.isNaN(birth.getTime())) throw new Error("Invalid birth date");
  let age = onDate.getUTCFullYear() - birth.getUTCFullYear();
  const monthDifference = onDate.getUTCMonth() - birth.getUTCMonth();
  if (monthDifference < 0 || (monthDifference === 0 && onDate.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

/** Standard Mifflin–St Jeor estimate, not a medical prescription. */
export function calculateCalorieTarget(input: CalorieInput) {
  const age = ageOnDate(input.birthDate);
  if (age < 14 || age > 120) throw new Error("Age must be between 14 and 120");

  const common = 10 * input.weightKg + 6.25 * input.heightCm - 5 * age;
  const bmr = input.gender === "male" ? common + 5 : input.gender === "female" ? common - 161 : common - 78;
  const tdee = bmr * activityFactors[input.activityLevel];
  const adjustment: Record<Goal, number> = {
    lose_weight: -500,
    fat_loss: -500,
    gain_weight: 300,
    build_muscle: 250,
    maintain: 0,
  };
  const minimum = input.gender === "male" ? 1500 : input.gender === "female" ? 1200 : 1350;
  const dailyCalories = Math.max(minimum, Math.round(tdee + adjustment[input.goal]));

  return { age, bmr: Math.round(bmr), tdee: Math.round(tdee), dailyCalories };
}
