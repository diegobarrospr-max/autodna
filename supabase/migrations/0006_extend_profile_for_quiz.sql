-- AutoDNA: estender profiles para guardar respostas do quiz
-- monthly_km                 ~ km que o usuário roda por mês
-- car_condition_preference   ~ novo, usado ou tanto faz
-- max_mileage_km             ~ km máximo aceito quando preferir usado
-- priorities                 ~ economia, conforto, espaco, robustez, seguranca, status
-- quiz_completed_at          ~ timestamp da última conclusão do quiz

do $$ begin
  create type public.car_condition_preference as enum ('new', 'used', 'both');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists monthly_km int
    check (monthly_km is null or monthly_km >= 0),
  add column if not exists car_condition_preference public.car_condition_preference,
  add column if not exists max_mileage_km int
    check (max_mileage_km is null or max_mileage_km >= 0),
  add column if not exists priorities text[] not null default '{}',
  add column if not exists quiz_completed_at timestamptz;
