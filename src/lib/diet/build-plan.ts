import type { Goal } from "@/lib/nutrition/calorie-target";

export type DietMeal = { title: string; calorieRange: string; foods: string[] };
export type DietPlanContent = {
  version: 1;
  title: string;
  dailyCalories: number;
  macroTargets: { proteinG: number; carbsG: number; fatG: number };
  meals: DietMeal[];
  notes: string[];
};

type PlanInput = { dailyCalories: number; goal: Goal; variant: number };

const menus = [
  [
    { title: "صبحانه", foods: ["نان سنگک با پنیر کم‌چرب و گردو", "خیار و گوجه", "چای یا دمنوش بدون شکر"] },
    { title: "ناهار", foods: ["قورمه‌سبزی کم‌روغن با برنج پخته", "سالاد شیرازی", "ماست کم‌چرب"] },
    { title: "میان‌وعده", foods: ["یک میوهٔ فصل", "یک مشت کوچک مغزها"] },
    { title: "شام", foods: ["کوکو سبزی در فر یا تابهٔ کم‌روغن", "سبزی خوردن", "نان سبوس‌دار"] },
  ],
  [
    { title: "صبحانه", foods: ["عدسی با آب‌لیمو", "نان سبوس‌دار", "یک میوهٔ کوچک"] },
    { title: "ناهار", foods: ["زرشک‌پلو با مرغ با برنج اندازه‌گیری‌شده", "سالاد فصل", "دوغ کم‌نمک"] },
    { title: "میان‌وعده", foods: ["ماست و میوه", "چند بادام یا پسته"] },
    { title: "شام", foods: ["املت گوجه با تخم‌مرغ", "نان سنگک", "سبزیجات تازه"] },
  ],
  [
    { title: "صبحانه", foods: ["تخم‌مرغ آب‌پز", "نان و سبزی تازه", "یک لیوان شیر کم‌چرب"] },
    { title: "ناهار", foods: ["خورش قیمه کم‌روغن با برنج", "سالاد شیرازی", "یک پیاله ماست"] },
    { title: "میان‌وعده", foods: ["میوهٔ فصل", "نخودچی و کشمش در مقدار کم"] },
    { title: "شام", foods: ["سوپ جو و مرغ", "سالاد سبز با آب‌لیمو", "نان سبوس‌دار"] },
  ],
];

function macroRatios(goal: Goal) {
  if (goal === "build_muscle") return { protein: 0.3, carbs: 0.45, fat: 0.25 };
  if (goal === "gain_weight") return { protein: 0.22, carbs: 0.5, fat: 0.28 };
  if (goal === "lose_weight" || goal === "fat_loss") return { protein: 0.3, carbs: 0.4, fat: 0.3 };
  return { protein: 0.25, carbs: 0.45, fat: 0.3 };
}

function targetLabel(goal: Goal) {
  return { lose_weight: "کاهش وزن", fat_loss: "چربی‌سوزی", gain_weight: "افزایش وزن", build_muscle: "عضله‌سازی", maintain: "حفظ وزن" }[goal];
}

/** A practical meal example, not individualized clinical nutrition advice. */
export function buildDietPlan({ dailyCalories, goal, variant }: PlanInput): DietPlanContent {
  const ratios = macroRatios(goal);
  const allocation = [0.25, 0.36, 0.12, 0.27];
  const menu = menus[variant % menus.length];
  const meals = menu.map((meal, index) => {
    const center = Math.round(dailyCalories * allocation[index]);
    const spread = index === 2 ? 60 : 100;
    return { ...meal, calorieRange: `${Math.max(100, center - spread)} تا ${center + spread} کالری` };
  });

  return {
    version: 1,
    title: `نمونه برنامه برای ${targetLabel(goal)}`,
    dailyCalories,
    macroTargets: {
      proteinG: Math.round((dailyCalories * ratios.protein) / 4),
      carbsG: Math.round((dailyCalories * ratios.carbs) / 4),
      fatG: Math.round((dailyCalories * ratios.fat) / 9),
    },
    meals,
    notes: ["مقدارها تقریبی‌اند؛ با گرسنگی، سیری و شرایط روزت انعطاف داشته باش.", "آب کافی و سبزیجات را کنار وعده‌ها فراموش نکن.", "برای نتیجهٔ پایدار، تغییرها را تدریجی و قابل‌ادامه نگه دار."],
  };
}
