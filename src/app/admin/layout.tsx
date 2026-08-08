import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  ClipboardList,
  Database,
  FileSearch,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
} from "lucide-react";
export const dynamic = "force-dynamic";

import {
  AdminAccessError,
  hasAdminPermission,
  requireAdmin,
  type AdminRole,
} from "@/lib/supabase/admin";

const links = [
  {
    href: "/admin",
    label: "نمای کلی",
    icon: LayoutDashboard,
    permission: "read_overview" as const,
  },
  {
    href: "/admin/users",
    label: "کاربران",
    icon: Users,
    permission: "read_users" as const,
  },
  {
    href: "/admin/foods",
    label: "غذاها",
    icon: Database,
    permission: "manage_foods" as const,
  },
  {
    href: "/admin/meals",
    label: "وعده‌ها",
    icon: FileSearch,
    permission: "manage_meals" as const,
  },
  {
    href: "/admin/notifications",
    label: "اعلان‌ها",
    icon: Bell,
    permission: "manage_notifications" as const,
  },
  {
    href: "/admin/audit-log",
    label: "لاگ ادمین",
    icon: ClipboardList,
    permission: "read_audit_log" as const,
  },
  {
    href: "/admin/settings",
    label: "تنظیمات",
    icon: Settings,
    permission: "manage_system_flags" as const,
  },
  {
    href: "/admin/admin-users",
    label: "نقش ادمین‌ها",
    icon: Shield,
    permission: "manage_admin_users" as const,
  },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let admin: { userId: string; role: AdminRole };
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError)
      redirect(error.status === 401 ? "/login" : "/dashboard");
    throw error;
  }
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950" dir="rtl">
      <aside className="border-b border-zinc-200 bg-white lg:fixed lg:inset-y-0 lg:right-0 lg:w-64 lg:border-b-0 lg:border-l">
        <div className="flex items-center justify-between p-5 lg:block">
          <Link className="font-bold" href="/admin">
            فیتا / مدیریت
          </Link>
          <span className="rounded bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
            {admin.role}
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1">
          {links
            .filter((link) => hasAdminPermission(admin.role, link.permission))
            .map(({ href, label, icon: Icon }) => (
              <Link
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                href={href}
                key={href}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
        </nav>
      </aside>
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:mr-64 lg:max-w-none">
        {children}
      </main>
    </div>
  );
}
