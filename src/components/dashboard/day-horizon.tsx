"use client";

import { motion, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useState } from "react";
import { Coffee, Moon, Sandwich, SunMedium } from "lucide-react";
import { mealTypeLabels, type MealType } from "@/lib/meals";

type HorizonMeal = { mealType: MealType; loggedAt: string; calories: number };

const markers: Array<{ mealType: MealType; hour: number; icon: typeof Coffee }> = [
  { mealType: "breakfast", hour: 8, icon: Coffee },
  { mealType: "lunch", hour: 13, icon: SunMedium },
  { mealType: "snack", hour: 16, icon: Sandwich },
  { mealType: "dinner", hour: 20, icon: Moon },
];

export function DayHorizon({ meals, calories, target }: { meals: HorizonMeal[]; calories: number; target: number }) {
  const reduceMotion = useReducedMotion();
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours() + new Date().getMinutes() / 60);
  const progress = Math.min(100, Math.round((calories / target) * 100));

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentHour(new Date().getHours() + new Date().getMinutes() / 60), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="day-horizon relative overflow-hidden rounded-3xl p-5 text-surface sm:p-6">
      <div className="relative z-10 flex items-start justify-between gap-4"><div><p className="text-xs font-light text-surface/75">افق امروز</p><h2 className="mt-1 text-xl font-extrabold">آرام و پیوسته پیش برو</h2></div><span className="rounded-full bg-surface/15 px-3 py-1 text-xs font-medium">امروز</span></div>
      <div className="relative z-10 mt-8 h-16" aria-label="زمان‌بندی وعده‌های امروز">
        <div className="horizon-line absolute inset-x-0 top-8" />
        {markers.map(({ mealType, hour, icon: Icon }) => {
          const meal = meals.find((item) => item.mealType === mealType);
          const position = meal ? new Date(meal.loggedAt).getHours() + new Date(meal.loggedAt).getMinutes() / 60 : hour;
          return <div className="absolute top-3 -translate-x-1/2" style={{ left: `${Math.max(4, Math.min(96, (position / 24) * 100))}%` }} key={mealType}><div className={`grid size-10 place-items-center rounded-full border-2 ${meal ? "border-saffron bg-saffron text-ink" : "border-surface/45 bg-surface/10 text-surface"}`} title={mealTypeLabels[mealType]}><Icon className="size-4" aria-hidden /></div><span className="mt-2 block whitespace-nowrap text-center text-[10px] font-light text-surface/75">{mealTypeLabels[mealType]}</span></div>;
        })}
        <motion.div className="calorie-ring absolute top-0 -translate-x-1/2" initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45 }} style={{ left: `${Math.max(6, Math.min(94, (currentHour / 24) * 100))}%`, "--progress": `${progress * 3.6}deg` } as CSSProperties}><div className="calorie-ring-inner"><span className="text-sm font-extrabold">{progress}٪</span></div></motion.div>
      </div>
      <div className="relative z-10 mt-5 flex items-end justify-between text-xs font-light text-surface/75"><span>طلوع</span><span>ظهر</span><span>غروب</span></div>
    </section>
  );
}
