-- AutoDNA: helpers RPC para a Edge Function fipe-bulk-import
-- Tudo é SECURITY INVOKER + executado pela service role, não exposto a usuários.

create or replace function public.fipe_pending_brands(lim int default 5)
returns table (codigo text, nome text)
language sql
stable
as $$
  select b.codigo, b.nome
  from public.fipe_catalog_brands b
  where not exists (
    select 1 from public.fipe_catalog_models m where m.brand_code = b.codigo
  )
  order by b.nome
  limit lim
$$;

create or replace function public.fipe_pending_models(lim int default 30)
returns table (brand_code text, codigo text, nome text)
language sql
stable
as $$
  select m.brand_code, m.codigo, m.nome
  from public.fipe_catalog_models m
  where not exists (
    select 1 from public.fipe_catalog_years y
    where y.brand_code = m.brand_code and y.model_code = m.codigo
  )
  order by m.brand_code, m.codigo
  limit lim
$$;

create or replace function public.fipe_pending_years(lim int default 50)
returns table (
  brand_code text,
  model_code text,
  year_code text,
  year_name text,
  brand_name text,
  model_name text
)
language sql
stable
as $$
  select
    y.brand_code,
    y.model_code,
    y.year_code,
    y.year_name,
    b.nome as brand_name,
    m.nome as model_name
  from public.fipe_catalog_years y
  join public.fipe_catalog_brands b on b.codigo = y.brand_code
  join public.fipe_catalog_models m on m.brand_code = y.brand_code and m.codigo = y.model_code
  where not exists (
    select 1 from public.car_models cm
    where cm.fipe_brand_code = y.brand_code
      and cm.fipe_model_code = y.model_code
      and cm.fipe_year_code  = y.year_code
  )
  order by y.brand_code, y.model_code, y.year_code
  limit lim
$$;

-- Stats para acompanhar progresso
create or replace function public.fipe_import_stats()
returns table (
  brands int,
  models int,
  years int,
  car_models_auto int,
  car_models_curated int,
  car_models_with_price int
)
language sql
stable
as $$
  select
    (select count(*)::int from public.fipe_catalog_brands),
    (select count(*)::int from public.fipe_catalog_models),
    (select count(*)::int from public.fipe_catalog_years),
    (select count(*)::int from public.car_models where data_source = 'fipe_auto'),
    (select count(*)::int from public.car_models where data_source = 'curated'),
    (select count(*)::int from public.car_models where price_fipe > 0)
$$;

-- Garantir search_path imutável + restringir execute às roles certas
alter function public.fipe_pending_brands(int) set search_path = public, pg_temp;
alter function public.fipe_pending_models(int) set search_path = public, pg_temp;
alter function public.fipe_pending_years(int)  set search_path = public, pg_temp;
alter function public.fipe_import_stats()      set search_path = public, pg_temp;

revoke execute on function public.fipe_pending_brands(int) from public, anon, authenticated;
revoke execute on function public.fipe_pending_models(int) from public, anon, authenticated;
revoke execute on function public.fipe_pending_years(int)  from public, anon, authenticated;
-- fipe_import_stats: permitir authenticated ler (útil pra UI admin futura)
revoke execute on function public.fipe_import_stats() from public, anon;
grant  execute on function public.fipe_import_stats() to authenticated;
