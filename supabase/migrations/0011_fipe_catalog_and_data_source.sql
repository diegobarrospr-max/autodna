-- AutoDNA: cache do catálogo FIPE + flag de procedência dos car_models

-- ---------- Cache do catálogo FIPE ----------
-- Espelha a árvore marca → modelo → ano da Parallelum/FIPE. Permite buscar
-- e promover entradas pra car_models sem precisar bater na FIPE toda vez.

create table if not exists public.fipe_catalog_brands (
  codigo text primary key,
  nome text not null,
  fetched_at timestamptz not null default now()
);

create table if not exists public.fipe_catalog_models (
  brand_code text not null references public.fipe_catalog_brands(codigo) on delete cascade,
  codigo text not null,
  nome text not null,
  fetched_at timestamptz not null default now(),
  primary key (brand_code, codigo)
);

create index if not exists fipe_catalog_models_nome_idx
  on public.fipe_catalog_models using gin (to_tsvector('simple', nome));

create table if not exists public.fipe_catalog_years (
  brand_code text not null,
  model_code text not null,
  year_code text not null,
  year_name text not null,
  fetched_at timestamptz not null default now(),
  primary key (brand_code, model_code, year_code),
  foreign key (brand_code, model_code)
    references public.fipe_catalog_models(brand_code, codigo)
    on delete cascade
);

-- RLS: público para read (usuários autenticados podem buscar), escrita só service role
alter table public.fipe_catalog_brands enable row level security;
alter table public.fipe_catalog_models enable row level security;
alter table public.fipe_catalog_years  enable row level security;

drop policy if exists "fipe_catalog_brands: read for authenticated" on public.fipe_catalog_brands;
create policy "fipe_catalog_brands: read for authenticated"
  on public.fipe_catalog_brands for select to authenticated using (true);

drop policy if exists "fipe_catalog_models: read for authenticated" on public.fipe_catalog_models;
create policy "fipe_catalog_models: read for authenticated"
  on public.fipe_catalog_models for select to authenticated using (true);

drop policy if exists "fipe_catalog_years: read for authenticated" on public.fipe_catalog_years;
create policy "fipe_catalog_years: read for authenticated"
  on public.fipe_catalog_years for select to authenticated using (true);

-- ---------- Procedência dos car_models ----------
-- 'curated'   ~ os 40 carros que calibramos manualmente, dados confiáveis
-- 'fipe_auto' ~ promovidos automaticamente do catálogo FIPE, custos/specs estimados

do $$ begin
  create type public.car_model_source as enum ('curated', 'fipe_auto');
exception when duplicate_object then null; end $$;

alter table public.car_models
  add column if not exists data_source public.car_model_source,
  add column if not exists is_estimated boolean not null default false;

-- Backfill: tudo que já existe é curado (os 40 originais)
update public.car_models
set data_source = 'curated', is_estimated = false
where data_source is null;

alter table public.car_models
  alter column data_source set not null;

-- Index extra que faltava
create index if not exists car_models_transmission_idx
  on public.car_models (transmission);
create index if not exists car_models_source_idx
  on public.car_models (data_source);
