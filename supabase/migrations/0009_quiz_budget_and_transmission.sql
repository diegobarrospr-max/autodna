-- AutoDNA: novas perguntas do quiz
-- max_budget                  ~ valor máximo (R$) que o usuário quer pagar pelo carro
-- transmission_preference     ~ manual | automatic | any

do $$ begin
  create type public.transmission_preference as enum ('manual', 'automatic', 'any');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists max_budget numeric(12, 2)
    check (max_budget is null or max_budget > 0),
  add column if not exists transmission_preference public.transmission_preference;
