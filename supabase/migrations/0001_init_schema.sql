-- AutoDNA: schema inicial
-- Tipos enumerados para combustível, transmissão e carroceria
-- Tabelas: profiles, cars, car_costs, matches
-- RLS é habilitado aqui; as policies estão em 0002_rls_policies.sql

create extension if not exists "uuid-ossp";

-- ---------- Enums ----------

do $$ begin
  create type public.fuel_type as enum ('flex', 'gasolina', 'diesel', 'hibrido', 'eletrico');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transmission_type as enum ('manual', 'automatico', 'cvt', 'automatizado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.body_type as enum ('hatch', 'sedan', 'suv', 'pickup', 'minivan', 'crossover');
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
-- 1:1 com auth.users; populado por trigger após signup

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  monthly_income numeric(12, 2) check (monthly_income is null or monthly_income >= 0),
  city text,
  state char(2),
  household_size smallint check (household_size is null or household_size between 1 and 20),
  parking_type text check (parking_type is null or parking_type in ('garagem_coberta', 'garagem_aberta', 'rua', 'condominio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------- cars ----------
-- Catálogo público (read-only para usuários; escrita só via service_role)

create table if not exists public.cars (
  id uuid primary key default uuid_generate_v4(),
  brand text not null,
  model text not null,
  version text not null,
  year smallint not null check (year between 1990 and 2030),
  body_type public.body_type not null,
  fuel public.fuel_type not null,
  transmission public.transmission_type not null,
  engine_displacement numeric(3, 1),
  horsepower smallint,
  price_fipe numeric(12, 2) not null check (price_fipe >= 0),
  fuel_consumption_city numeric(4, 2),
  fuel_consumption_road numeric(4, 2),
  seats smallint not null default 5 check (seats between 2 and 9),
  trunk_liters smallint,
  tags text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand, model, version, year)
);

create index if not exists cars_body_type_idx on public.cars (body_type);
create index if not exists cars_fuel_idx on public.cars (fuel);
create index if not exists cars_price_idx on public.cars (price_fipe);
create index if not exists cars_tags_gin_idx on public.cars using gin (tags);

alter table public.cars enable row level security;

-- ---------- car_costs ----------
-- Custos anuais por carro (1:1 com cars)

create table if not exists public.car_costs (
  car_id uuid primary key references public.cars(id) on delete cascade,
  insurance_yearly numeric(10, 2) not null check (insurance_yearly >= 0),
  maintenance_yearly numeric(10, 2) not null check (maintenance_yearly >= 0),
  ipva_yearly numeric(10, 2) not null check (ipva_yearly >= 0),
  depreciation_yearly numeric(10, 2) not null check (depreciation_yearly >= 0),
  updated_at timestamptz not null default now()
);

alter table public.car_costs enable row level security;

-- ---------- matches ----------
-- Recomendações geradas para cada usuário (ranking top-N)

create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  score numeric(5, 2) not null check (score between 0 and 100),
  rank smallint not null check (rank >= 1),
  reason text,
  generated_at timestamptz not null default now()
);

create index if not exists matches_user_generated_idx on public.matches (user_id, generated_at desc);
create unique index if not exists matches_user_rank_unique on public.matches (user_id, generated_at, rank);

alter table public.matches enable row level security;

-- ---------- Trigger: updated_at ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists cars_set_updated_at on public.cars;
create trigger cars_set_updated_at
  before update on public.cars
  for each row execute function public.set_updated_at();

drop trigger if exists car_costs_set_updated_at on public.car_costs;
create trigger car_costs_set_updated_at
  before update on public.car_costs
  for each row execute function public.set_updated_at();

-- ---------- Trigger: handle_new_user ----------
-- Cria row em profiles automaticamente após signup

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
