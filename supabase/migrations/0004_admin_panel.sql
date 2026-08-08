-- Phase 7: privileged administration, operational data, and notification infrastructure.
-- All writes to privileged tables go through server-side code using the service-role key.

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin', 'support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(user_id) on delete restrict,
  action text not null check (char_length(action) between 1 and 120),
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  normalized_name text not null unique check (char_length(normalized_name) between 1 and 160),
  aliases text[] not null default '{}',
  category text,
  serving_size_g numeric(8, 2) check (serving_size_g > 0),
  calories_per_100g numeric(8, 2) not null check (calories_per_100g >= 0),
  protein_g_per_100g numeric(8, 2) not null default 0 check (protein_g_per_100g >= 0),
  carbs_g_per_100g numeric(8, 2) not null default 0 check (carbs_g_per_100g >= 0),
  fat_g_per_100g numeric(8, 2) not null default 0 check (fat_g_per_100g >= 0),
  fiber_g_per_100g numeric(8, 2) check (fiber_g_per_100g >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  feature text not null check (char_length(feature) between 1 and 80),
  provider text not null check (char_length(provider) between 1 and 80),
  model text not null check (char_length(model) between 1 and 160),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  estimated_cost_usd numeric(12, 6) check (estimated_cost_usd >= 0),
  status text not null default 'success' check (status in ('success', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (total_tokens >= input_tokens + output_tokens)
);

create table public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 2000),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > created_at)
);

create table public.system_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{0,79}$'),
  enabled boolean not null default true,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_audit_log_admin_created_at_idx
  on public.admin_audit_log(admin_user_id, created_at desc);
create index admin_audit_log_target_created_at_idx
  on public.admin_audit_log(target_type, target_id, created_at desc);
create index foods_active_category_idx on public.foods(is_active, category);
create index foods_aliases_idx on public.foods using gin(aliases);
create index ai_usage_logs_user_created_at_idx
  on public.ai_usage_logs(user_id, created_at desc);
create index ai_usage_logs_feature_created_at_idx
  on public.ai_usage_logs(feature, created_at desc);
create index ai_usage_logs_status_created_at_idx
  on public.ai_usage_logs(status, created_at desc);
create index app_notifications_user_unread_created_at_idx
  on public.app_notifications(user_id, created_at desc) where read_at is null;
create index app_notifications_user_created_at_idx
  on public.app_notifications(user_id, created_at desc);
create index app_notifications_expires_at_idx
  on public.app_notifications(expires_at) where expires_at is not null;
create index system_flags_public_idx on public.system_flags(is_public) where is_public;

insert into public.system_flags (key, enabled, value, description)
values
  ('body_analysis', true, '{}'::jsonb, 'Enable the optional body-analysis feature'),
  ('ai_cost_alert', true, '{"monthlyUsd": 0}'::jsonb, 'Monthly AI cost alert threshold; zero disables the warning')
on conflict (key) do nothing;

create or replace function public.set_admin_panel_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute procedure public.set_admin_panel_updated_at();

create trigger foods_set_updated_at
before update on public.foods
for each row execute procedure public.set_admin_panel_updated_at();

create trigger system_flags_set_updated_at
before update on public.system_flags
for each row execute procedure public.set_admin_panel_updated_at();

-- Audit records may be inserted by trusted server code only and can never be altered.
create or replace function public.prevent_admin_audit_log_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'admin_audit_log is append-only';
end;
$$;

create trigger admin_audit_log_append_only
before update or delete on public.admin_audit_log
for each row execute procedure public.prevent_admin_audit_log_mutation();

-- Users may only change the read state of their own notifications.
create or replace function public.restrict_notification_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.type is distinct from old.type
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.data is distinct from old.data
    or new.expires_at is distinct from old.expires_at
    or new.created_at is distinct from old.created_at then
    raise exception 'only app_notifications.read_at may be updated by users';
  end if;

  return new;
end;
$$;

create trigger app_notifications_restrict_updates
before update on public.app_notifications
for each row execute procedure public.restrict_notification_updates();

alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.foods enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.app_notifications enable row level security;
alter table public.system_flags enable row level security;

-- admin_users is deliberately fully closed to authenticated clients. Role lookups use
-- the service-role client after a server-side session check.

-- Audit data is service-role-only. In particular, there are no update or delete policies.

create policy "authenticated users read active foods" on public.foods
  for select to authenticated
  using (is_active);

-- AI usage data is service-role-only because metadata can contain operational details.

create policy "users read own app notifications" on public.app_notifications
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "users update own notification read state" on public.app_notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "authenticated users read public system flags" on public.system_flags
  for select to authenticated
  using (is_public);
