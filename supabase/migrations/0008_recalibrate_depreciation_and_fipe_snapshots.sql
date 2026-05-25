-- AutoDNA: recalibrar depreciação por modelo + estrutura para snapshots FIPE
--
-- Parte 1: substitui o chute uniforme de ~12% por valores calibrados a partir
--   de rankings públicos de depreciação no mercado brasileiro. É estimativa
--   melhor que a anterior, mas ainda é estimativa.
-- Parte 2: tabela fipe_snapshots para começar a guardar preço FIPE mensal.
-- Parte 3: campos de mapeamento FIPE em car_models.

-- ---------- Parte 1: recalibração da depreciação ----------

update public.car_costs as cc
set depreciation_yearly = round(m.price_fipe * (
  case
    when m.brand = 'Toyota' and m.model = 'Hilux'                                            then 0.07
    when m.brand = 'Toyota' and m.model in ('Corolla','Corolla Cross') and m.version like '%Hybrid%' then 0.09
    when m.brand = 'Toyota' and m.model in ('Corolla','Corolla Cross')                       then 0.08
    when m.brand = 'Toyota' and m.model in ('Yaris','Yaris Sedan')                           then 0.09
    when m.brand = 'Honda' and m.version like '%Hybrid%'                                     then 0.09
    when m.brand = 'Honda' and m.model = 'HR-V'                                              then 0.10
    when m.brand = 'Chevrolet' and m.model = 'Montana'                                       then 0.10
    when m.brand = 'Chevrolet'                                                                then 0.11
    when m.brand = 'Volkswagen' and m.model = 'Saveiro'                                       then 0.10
    when m.brand = 'Volkswagen' and m.model in ('Nivus','Taos')                               then 0.12
    when m.brand = 'Volkswagen'                                                               then 0.11
    when m.brand = 'Hyundai'                                                                  then 0.12
    when m.brand = 'Fiat' and m.model = 'Mobi'                                                then 0.14
    when m.brand = 'Fiat' and m.model = 'Strada'                                              then 0.10
    when m.brand = 'Fiat' and m.model = 'Toro'                                                then 0.11
    when m.brand = 'Fiat' and m.model in ('Argo','Cronos')                                    then 0.13
    when m.brand = 'Fiat' and m.model in ('Pulse','Fastback')                                 then 0.13
    when m.brand = 'Renault'                                                                  then 0.14
    when m.brand = 'Peugeot'                                                                  then 0.14
    when m.brand = 'Nissan'                                                                   then 0.12
    when m.brand = 'Jeep' and m.model = 'Renegade'                                            then 0.13
    when m.brand = 'Jeep' and m.model = 'Compass'                                             then 0.12
    when m.brand = 'Caoa Chery'                                                                then 0.17
    when m.brand = 'GWM'                                                                       then 0.15
    else 0.12
  end
), 2)
from public.car_models as m
where cc.car_id = m.id;

-- ---------- Parte 2: snapshots históricos do preço FIPE ----------

create table if not exists public.fipe_snapshots (
  id uuid primary key default uuid_generate_v4(),
  model_id uuid not null references public.car_models(id) on delete cascade,
  fipe_brand_code text,
  fipe_model_code text,
  fipe_year_code text,
  fipe_reference_month text,          -- ex "maio/2026", devolvido pela FIPE
  price numeric(12, 2) not null check (price > 0),
  snapshot_date date not null default current_date,
  source text not null default 'parallelum',
  fetched_at timestamptz not null default now(),
  unique (model_id, snapshot_date)
);

create index if not exists fipe_snapshots_model_date_idx
  on public.fipe_snapshots (model_id, snapshot_date desc);

alter table public.fipe_snapshots enable row level security;

drop policy if exists "fipe_snapshots: read for authenticated" on public.fipe_snapshots;
create policy "fipe_snapshots: read for authenticated" on public.fipe_snapshots
  for select to authenticated
  using (true);

-- ---------- Parte 3: códigos FIPE em car_models ----------

alter table public.car_models
  add column if not exists fipe_brand_code text,
  add column if not exists fipe_model_code text,
  add column if not exists fipe_year_code text;
