-- AutoDNA: separar o catálogo canônico (car_models) dos anúncios (car_listings)
-- car_models  = specs do modelo (Onix LT 1.0 2025: motor, consumo, dimensões, tags)
-- car_listings = unidade à venda (1+ por modelo): novo OU usado, com km, preço, cidade, fonte

-- ---------- enum ----------

do $$ begin
  create type public.condition_type as enum ('new', 'used');
exception when duplicate_object then null; end $$;

-- ---------- rename cars -> car_models ----------

alter table public.cars rename to car_models;

alter index if exists cars_body_type_idx rename to car_models_body_type_idx;
alter index if exists cars_fuel_idx rename to car_models_fuel_idx;
alter index if exists cars_price_idx rename to car_models_price_idx;
alter index if exists cars_tags_gin_idx rename to car_models_tags_gin_idx;

alter table public.car_models
  rename constraint cars_brand_model_version_year_key to car_models_brand_model_version_year_key;

alter policy "cars: read for authenticated" on public.car_models
  rename to "car_models: read for authenticated";

alter trigger cars_set_updated_at on public.car_models
  rename to car_models_set_updated_at;

-- ---------- car_listings ----------

create table if not exists public.car_listings (
  id uuid primary key default uuid_generate_v4(),
  model_id uuid not null references public.car_models(id) on delete cascade,
  condition public.condition_type not null,
  manufacture_year smallint not null check (manufacture_year between 1990 and 2030),
  mileage_km integer check (mileage_km is null or mileage_km >= 0),
  asking_price numeric(12, 2) not null check (asking_price > 0),
  city text,
  state char(2),
  source text not null default 'catalog',
  source_url text,
  seller_type text check (seller_type is null or seller_type in ('dealer', 'private')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_listings_mileage_per_condition check (
    (condition = 'new' and mileage_km is null) or
    (condition = 'used' and mileage_km is not null)
  )
);

create index if not exists car_listings_model_idx on public.car_listings (model_id);
create index if not exists car_listings_condition_idx on public.car_listings (condition);
create index if not exists car_listings_price_idx on public.car_listings (asking_price);
create index if not exists car_listings_active_idx on public.car_listings (active) where active = true;

alter table public.car_listings enable row level security;

drop policy if exists "car_listings: read active for authenticated" on public.car_listings;
create policy "car_listings: read active for authenticated" on public.car_listings
  for select to authenticated
  using (active = true);

drop trigger if exists car_listings_set_updated_at on public.car_listings;
create trigger car_listings_set_updated_at
  before update on public.car_listings
  for each row execute function public.set_updated_at();

-- ---------- seed: 1 'new' listing por modelo (catalog) ----------

insert into public.car_listings (model_id, condition, manufacture_year, mileage_km, asking_price, source, active)
select id, 'new'::public.condition_type, year, null, price_fipe, 'catalog', true
from public.car_models
on conflict do nothing;
