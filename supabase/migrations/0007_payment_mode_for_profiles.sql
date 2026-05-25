-- AutoDNA: preferência de pagamento do usuário (à vista vs financiado)
-- payment_mode       ~ 'cash' | 'financed'
-- down_payment_pct   ~ 0..100, percentual do valor do carro que o usuário dá de entrada
-- financing_months   ~ 12..72, prazo do financiamento

do $$ begin
  create type public.payment_mode as enum ('cash', 'financed');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists payment_mode public.payment_mode,
  add column if not exists down_payment_pct numeric(5, 2)
    check (down_payment_pct is null or (down_payment_pct >= 0 and down_payment_pct <= 100)),
  add column if not exists financing_months smallint
    check (financing_months is null or (financing_months between 12 and 84));
