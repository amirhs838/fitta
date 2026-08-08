"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, House, Plus, Sparkles, UserRound } from "lucide-react";

const items: Array<{
  href: string;
  label: string;
  icon: typeof House;
  primary?: boolean;
}> = [
  { href: "/dashboard", label: "خانه", icon: House },
  { href: "/dashboard#trend", label: "گزارش‌ها", icon: BarChart3 },
  { href: "/meals", label: "ثبت وعده", icon: Plus, primary: true },
  { href: "/diet-plan", label: "برنامه", icon: Sparkles },
  { href: "/profile", label: "پروفایل", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false;
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

/** Mobile-first persistent navigation for signed-in user pages. */
export function AppBottomNavigation() {
  const pathname = usePathname();
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth");

  if (isPublicRoute) return null;

  return (
    <nav className="app-bottom-nav" aria-label="ناوبری اصلی">
      <div className="app-bottom-nav-inner">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              className={`app-nav-item${active ? " app-nav-item-active" : ""}${primary ? " app-nav-item-primary" : ""}`}
              href={href}
              key={href}
              aria-current={active ? "page" : undefined}
            >
              <span className="app-nav-icon">
                <Icon
                  className="size-5"
                  strokeWidth={primary ? 2.8 : 2}
                  aria-hidden
                />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
