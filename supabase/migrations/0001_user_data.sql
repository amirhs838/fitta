-- User-owned health data. Apply with `supabase db push` or in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  gender text check (gender in ('male', 'female', 'other')),
  birth_date date,
  height_cm numeric(5, 2) check (height_cm > 0),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text check (goal in ('lose_weight', 'gain_weight', 'build_muscle', 'maintain', 'fat_loss')),
  medical_conditions text[] not null default '{}',
  daily_calorie_target numeric(8, 2) check (daily_calorie_target > 0),
  created_at timestamptz not null default now()
);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric(5, 2) not null check (weight_kg > 0),
  logged_at timestamptz not null default now()
);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url text,
  user_description text,
  total_calories numeric(8, 2) not null check (total_calories >= 0),
  total_protein_g numeric(8, 2) not null default 0 check (total_protein_g >= 0),
  total_carbs_g numeric(8, 2) not null default 0 check (total_carbs_g >= 0),
  total_fat_g numeric(8, 2) not null default 0 check (total_fat_g >= 0),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity text,
  calories numeric(8, 2) not null check (calories >= 0),
  protein_g numeric(8, 2) not null default 0 check (protein_g >= 0),
  carbs_g numeric(8, 2) not null default 0 check (carbs_g >= 0),
  fat_g numeric(8, 2) not null default 0 check (fat_g >= 0),
  source text not null check (source in ('ai_estimate', 'local_db', 'user_edited'))
);

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content jsonb not null,
  is_active boolean not null default true,
  generated_at timestamptz not null default now()
);

create table public.body_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  photo_url text not null,
  ai_observations jsonb,
  taken_at timestamptz not null default now()
);

create index weight_logs_user_logged_at_idx on public.weight_logs(user_id, logged_at desc);
create index meal_logs_user_logged_at_idx on public.meal_logs(user_id, logged_at desc);
create index meal_items_meal_log_id_idx on public.meal_items(meal_log_id);
create index diet_plans_user_generated_at_idx on public.diet_plans(user_id, generated_at desc);
create index body_photos_user_taken_at_idx on public.body_photos(user_id, taken_at desc);

-- A profile is created only by trusted database code whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.weight_logs enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_items enable row level security;
alter table public.diet_plans enable row level security;
alter table public.body_photos enable row level security;

create policy "users manage own profile" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "users manage own weight logs" on public.weight_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own meal logs" on public.meal_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own diet plans" on public.diet_plans
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own body photos" on public.body_photos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own meal items" on public.meal_items
  for all to authenticated
  using (exists (select 1 from public.meal_logs ml where ml.id = meal_log_id and ml.user_id = auth.uid()))
  with check (exists (select 1 from public.meal_logs ml where ml.id = meal_log_id and ml.user_id = auth.uid()));
