export type LocalFood = {
  name: string;
  aliases: string[];
  defaultServing: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Initial seed; the managed `foods` table becomes the production source in Phase 7. */
export const iranianFoods: LocalFood[] = [
  { name: "چلوکباب", aliases: ["کباب کوبیده با برنج", "چلو کباب", "چلوکباب کوبیده"], defaultServing: "۱ پرس", calories: 850, proteinG: 35, carbsG: 88, fatG: 38 },
  { name: "قورمه‌سبزی", aliases: ["قرمه سبزی", "خورش قورمه سبزی"], defaultServing: "۱ پرس خورش", calories: 320, proteinG: 18, carbsG: 20, fatG: 18 },
  { name: "قیمه", aliases: ["خورش قیمه", "قیمه سیب زمینی"], defaultServing: "۱ پرس خورش", calories: 360, proteinG: 19, carbsG: 35, fatG: 16 },
  { name: "زرشک‌پلو با مرغ", aliases: ["زرشک پلو با مرغ", "زرشک پلو مرغ"], defaultServing: "۱ پرس", calories: 700, proteinG: 36, carbsG: 82, fatG: 23 },
  { name: "آبگوشت", aliases: ["دیزی", "آب گوشت"], defaultServing: "۱ کاسه", calories: 560, proteinG: 31, carbsG: 45, fatG: 28 },
  { name: "کوکو سبزی", aliases: ["کوکو سبزیجات"], defaultServing: "۲ برش متوسط", calories: 240, proteinG: 12, carbsG: 10, fatG: 17 },
  { name: "عدسی", aliases: ["عدس پخته"], defaultServing: "۱ کاسه", calories: 230, proteinG: 15, carbsG: 39, fatG: 3 },
  { name: "سالاد شیرازی", aliases: ["سالاد شیرازی با آبلیمو"], defaultServing: "۱ کاسه", calories: 55, proteinG: 2, carbsG: 11, fatG: 0.5 },
  { name: "برنج پخته", aliases: ["چلو", "برنج سفید", "پلو"], defaultServing: "۱ پیمانه", calories: 205, proteinG: 4, carbsG: 45, fatG: 0.5 },
  { name: "نان سنگک", aliases: ["سنگک", "نان"], defaultServing: "۱/۳ نان", calories: 170, proteinG: 6, carbsG: 34, fatG: 1 },
  { name: "دوغ", aliases: ["دوغ کم نمک"], defaultServing: "۱ لیوان", calories: 80, proteinG: 4, carbsG: 8, fatG: 3 },
  { name: "املت گوجه", aliases: ["املت", "املت تخم مرغ"], defaultServing: "۱ بشقاب کوچک", calories: 280, proteinG: 15, carbsG: 12, fatG: 20 },
];
