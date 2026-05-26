-- AutoDNA: cron job mensal para sincronizar preços FIPE
-- Toda dia 5 às 03:00 UTC (00:00 BRT). FIPE atualiza nos primeiros dias do mês.
-- Cada execução cria um snapshot em public.fipe_snapshots — em 12 meses
-- teremos histórico para calcular depreciação real (sem chute) por modelo.

-- Extensions necessárias
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper que chama a edge function sync-fipe-price com service role.
-- A função é SECURITY DEFINER porque precisa ler o secret do vault.
-- service_role_key e supabase_url são lidos do vault.secrets (preenchido
-- pelo dashboard) ou de current_setting (fallback dev).
create or replace function public.trigger_fipe_sync()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url text;
begin
  -- URL da Edge Function (mesmo projeto)
  v_url := 'https://eaorpeaszqkahjlukncr.supabase.co/functions/v1/sync-fipe-price';

  -- Dispara o POST. A function não exige JWT (verify_jwt=false) e usa
  -- service role internamente para escrever em fipe_snapshots / car_models.
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke execute on function public.trigger_fipe_sync() from public, anon, authenticated;

-- Cron job: todo dia 5 às 03:00 UTC
-- (cron extensions usa formato "* * * * *" — minute hour day month dayOfWeek)
do $$ begin
  perform cron.unschedule('fipe-monthly-sync');
exception when others then null; end $$;

select cron.schedule(
  'fipe-monthly-sync',
  '0 3 5 * *',
  $$ select public.trigger_fipe_sync(); $$
);
