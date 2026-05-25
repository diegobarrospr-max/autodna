-- AutoDNA: endurecimento de segurança após advisors
-- 1) Define search_path explícito nas funções (evita hijacking)
-- 2) Revoga execute das funções SECURITY DEFINER expostas via REST

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.handle_new_user()
  set search_path = public, pg_temp;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
