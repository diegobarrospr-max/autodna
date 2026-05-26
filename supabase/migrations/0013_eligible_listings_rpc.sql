-- AutoDNA: RPC server-side de candidatos elegíveis
-- Com 30k+ car_models o client não pode mais puxar tudo. Aplica os filtros
-- duros do quiz no Postgres e retorna só o que vale considerar (top ~500
-- por preço) — daí o ranking client-side pondera prioridades.

create or replace function public.eligible_listings(
  p_condition text default 'both',           -- 'new' | 'used' | 'both'
  p_max_mileage_km int default null,         -- null = sem cap
  p_min_seats int default 1,
  p_body_types text[] default null,          -- null = qualquer
  p_max_price numeric default null,          -- null = sem cap
  p_transmission text default 'any',         -- 'manual' | 'automatic' | 'any'
  p_limit int default 500
)
returns table (
  listing_id uuid,
  model_id uuid,
  brand text,
  model text,
  version text,
  year smallint,
  body_type text,
  fuel text,
  transmission text,
  seats smallint,
  trunk_liters smallint,
  fuel_consumption_city numeric,
  fuel_consumption_road numeric,
  tags text[],
  is_estimated boolean,
  data_source text,
  condition text,
  manufacture_year smallint,
  mileage_km int,
  asking_price numeric,
  city text,
  state text,
  insurance_yearly numeric,
  maintenance_yearly numeric,
  ipva_yearly numeric,
  depreciation_yearly numeric
)
language sql
stable
as $$
  select
    l.id              as listing_id,
    m.id              as model_id,
    m.brand,
    m.model,
    m.version,
    m.year,
    m.body_type::text,
    m.fuel::text,
    m.transmission::text,
    m.seats,
    m.trunk_liters,
    m.fuel_consumption_city,
    m.fuel_consumption_road,
    m.tags,
    m.is_estimated,
    m.data_source::text,
    l.condition::text,
    l.manufacture_year,
    l.mileage_km,
    l.asking_price,
    l.city,
    l.state,
    c.insurance_yearly,
    c.maintenance_yearly,
    c.ipva_yearly,
    c.depreciation_yearly
  from public.car_listings l
  join public.car_models m on m.id = l.model_id
  join public.car_costs  c on c.car_id = m.id
  where l.active = true
    and (p_condition = 'both' or l.condition::text = p_condition)
    and (
      l.condition <> 'used'
      or p_max_mileage_km is null
      or coalesce(l.mileage_km, 0) <= p_max_mileage_km
    )
    and m.seats >= p_min_seats
    and (p_body_types is null or m.body_type::text = any(p_body_types))
    and (p_max_price is null or l.asking_price <= p_max_price)
    and (
      p_transmission = 'any'
      or (p_transmission = 'manual'    and m.transmission::text = 'manual')
      or (p_transmission = 'automatic' and m.transmission::text <> 'manual')
    )
    -- Skip listings sem preço FIPE real (asking_price=1 é placeholder do fipe_auto
    -- até o sync rodar pra eles)
    and l.asking_price > 100
  order by
    m.data_source desc,                       -- 'curated' antes de 'fipe_auto'
    l.asking_price asc
  limit p_limit
$$;

alter function public.eligible_listings(text, int, int, text[], numeric, text, int)
  set search_path = public, pg_temp;

-- Stats simples pra UI
create or replace function public.car_catalog_stats()
returns table (
  total_models int,
  curated_models int,
  auto_models int,
  with_price int,
  total_brands int
)
language sql
stable
as $$
  select
    (select count(*)::int from public.car_models),
    (select count(*)::int from public.car_models where data_source = 'curated'),
    (select count(*)::int from public.car_models where data_source = 'fipe_auto'),
    (select count(*)::int from public.car_models where price_fipe > 0),
    (select count(distinct brand)::int from public.car_models)
$$;

alter function public.car_catalog_stats() set search_path = public, pg_temp;
revoke execute on function public.car_catalog_stats() from public, anon;
grant  execute on function public.car_catalog_stats() to authenticated;
grant  execute on function public.eligible_listings(text, int, int, text[], numeric, text, int) to authenticated;
