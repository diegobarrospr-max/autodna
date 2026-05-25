-- AutoDNA: RLS policies
-- profiles  → cada usuário lê/edita só o próprio
-- cars      → catálogo, leitura para todos autenticados (escrita só via service_role)
-- car_costs → idem cars
-- matches   → cada usuário lê/insere/apaga só os próprios

-- ---------- profiles ----------

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- cars ----------

drop policy if exists "cars: read for authenticated" on public.cars;
create policy "cars: read for authenticated" on public.cars
  for select to authenticated
  using (true);

-- ---------- car_costs ----------

drop policy if exists "car_costs: read for authenticated" on public.car_costs;
create policy "car_costs: read for authenticated" on public.car_costs
  for select to authenticated
  using (true);

-- ---------- matches ----------

drop policy if exists "matches: select own" on public.matches;
create policy "matches: select own" on public.matches
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "matches: insert own" on public.matches;
create policy "matches: insert own" on public.matches
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "matches: delete own" on public.matches;
create policy "matches: delete own" on public.matches
  for delete to authenticated
  using (auth.uid() = user_id);
