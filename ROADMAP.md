# AutoDNA — Roadmap

Documento vivo das próximas features. Atualizado a cada decisão de produto.

---

## Status atual (2026-05-26)

**No ar (autodna.vercel.app):**
- Auth Supabase (email/senha, signup com confirmação)
- Quiz multi-step (10 perguntas)
- Ranking top 3 client-side com filtros server-side via RPC `eligible_listings`
- TCO mensal com taxa Bacen ao vivo + entrada/prazo/cash
- 40 carros curated com preço FIPE real maio/2026
- Edge Functions deployadas: `get-financing-rate`, `sync-fipe-price` (cron mensal), `fipe-bulk-import`, `fipe-search`, `fipe-investigate`, `fipe-autopilot`, `recommend-cars` (aguarda `GEMINI_API_KEY`)
- **IA escolhida: Gemini Free Tier** (vs Claude) — zero custo, mas trade-off: Free Tier do Gemini usa inputs pra treinar modelos do Google. Pra MVP/validação aceitável; antes de produção pesada, migrar pra Gemini Pago (~US$ 0.30/1M tokens) que não treina.
- PWA instalável iOS/Android (Add to Home Screen)

**Em execução:**
- Bulk import da FIPE (~107 brands × 7.273 models × ~10 anos = ~70k years → ~50k car_models fipe_auto). Vai gerar inventory massivo, todos com flag `is_estimated=true` e badge "Estimativa" na UI.

---

## Fase A — Aba "Carros" + Página do Modelo

**Prioridade**: alta. Depende do bulk import finalizar pra ter inventory.

### A.1 — Nova tab "Catálogo" no app
- Adicionar tab `<Catálogo>` ao lado de Início/Quiz/Matches/Perfil
- Tela inicial com:
  - Search bar (marca, modelo, palavras-chave)
  - Filtros: ano, body type, faixa de preço, câmbio, combustível, novo/usado
  - Listagem paginada (FlatList ou paginação infinita)
  - Cada item: marca + modelo + ano + preço + thumb
- Server-side: RPC `search_car_models(query, filters, page, limit)`

### A.2 — Rota `/car/[id]` (página do modelo)
**Seções:**
1. **Header**: marca, modelo, ano, foto, badges (curado/estimativa/zero-km)
2. **Preço atual**:
   - Se ainda produzido (zero-km existe): mostra "R$ X · 0 km"
   - Senão: mostra "R$ Y (referência FIPE)"
   - Comparativo "vs último mês: ±%"
3. **Especificações técnicas** (specs):
   - Motor (displacement, HP, fuel)
   - Câmbio
   - Consumo (cidade/estrada)
   - Dimensões (porta-malas, assentos)
   - Equipamentos (se tivermos)
   - Estado hoje: parser tem isso parcialmente (HP, dimensões = null) → enriquecer via Gemini (Fase E)
4. **Calculadora TCO interativa** (ver A.3)
5. **Gráfico histórico de preço** (ver B)
6. **Reviews de proprietários** (ver C)
7. **Problemas conhecidos** (ver D)
8. **CTAs**:
   - "Ver anúncios" (Webmotors / OLX / ML, já existe nos matches)
   - "Adicionar aos favoritos"

### A.3 — Calculadora TCO interativa
- Inputs: ano do carro (default = ano corrente), entrada %, prazo, KM/mês
- Outputs:
  - TCO mensal total
  - Breakdown (parcela, combustível, seguro, IPVA, manutenção, depreciação)
  - **Renda mínima recomendada** = TCO / 0.35
  - Comparativo com a renda do usuário (do profile) — "Cabe no seu bolso ✅" ou "Acima do recomendado ⚠️"

### A.4 — Favoritos
- Tabela `user_favorites (user_id, car_model_id, created_at)`
- Botão de coração na página do modelo e nos cards de matches
- Tela "Favoritos" (subsection no Perfil)

**Estimativa**: 4-5 dias.

---

## Fase B — Histórico de preço (gráfico)

**Depende**: snapshot mensal já está rodando (cron `fipe-monthly-sync`). Demora 12 meses pra ter série completa orgânica.

### B.1 — Backfill histórico via Parallelum
- A Parallelum tem `tabela_referencia` (mês de referência) — dá pra solicitar preços de meses passados
- Edge Function `backfill-fipe-history(month_count)` que pega 12-24 meses para trás
- Custo: 12 meses × ~30k modelos = 360k requests à Parallelum. Pode ser rate-limited. Talvez fazer só pros "top 1000" ou 200.
- Decisão pendente: **fazer backfill** (rápido pra ter gráfico real dia 1) ou **esperar maturar** (12 meses)?

### B.2 — Componente de gráfico
- React Native: `victory-native` ou `react-native-chart-kit`
- Eixos: X=mês, Y=preço FIPE
- Marcadores: pontos clicáveis com tooltip
- Linha de tendência

### B.3 — Cálculo de depreciação real
- Quando tiver ≥12 meses de snapshots, calcular `depreciation_yearly` real:
  - `(price[mês 1] - price[mês 12]) / price[mês 1] × 100`
- Atualizar `car_costs.depreciation_yearly` automaticamente
- Marcar `is_estimated=false` quando tiver dado real

**Estimativa**: 5-7 dias (com backfill) ou 1-2 dias (sem, só componente).

---

## Fase C — Reviews de proprietários (UGC)

**Prioridade**: média-alta. Pode começar em paralelo com A.

### C.1 — Schema
```sql
create table car_reviews (
  id uuid primary key,
  user_id uuid references auth.users(id),
  car_model_id uuid references car_models(id),
  rating smallint check (rating between 1 and 5),
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  body text,
  ownership_years_min smallint,
  ownership_years_max smallint,
  ownership_km int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  moderation_status text default 'pending', -- 'pending' | 'approved' | 'rejected'
  moderation_reason text,
  unique (user_id, car_model_id)
);

create table car_reported_issues (
  id uuid primary key,
  review_id uuid references car_reviews(id) on delete cascade,
  car_model_id uuid references car_models(id),
  raw_text text not null,
  category text,                -- 'motor' | 'cambio' | 'eletrica' | 'suspensao' | 'pintura' | 'outro'
  severity text,                -- 'baixa' | 'media' | 'alta'
  created_at timestamptz default now()
);
```

### C.2 — Form de review na página do modelo
- Botão "Deixar minha opinião"
- Modal/tela com:
  - Rating 1-5 estrelas
  - Quanto tempo teve o carro? (radio: <1ano, 1-3, 3-5, 5+)
  - Quantos km rodou? (opcional)
  - **Prós** (chips removíveis ou input livre, máx 5)
  - **Contras** (chips, máx 5)
  - Texto livre (opcional)
  - Problemas que enfrentou (lista, cada um com categoria + descrição)
  - Submit

### C.3 — Validação e moderação
- **Anti-spam**:
  - 1 review por user por car_model (constraint DB)
  - Texto mínimo 30 caracteres se preencher body
  - Profanity filter (Gemini classifica)
- **Pipeline**:
  1. User submete → `moderation_status='pending'`
  2. Edge Function `moderate-review` (Gemini) classifica:
     - 'approved' → visível
     - 'flagged' → vai pra revisão humana
     - 'rejected' → user notificado
  3. Dashboard admin pra revisar 'flagged'
- **Validação de propriedade**:
  - Self-declaration por enquanto (sem documento)
  - Futuro: vincular CNH/CRLV via OCR

### C.4 — Display agregado
- Média de rating + número de reviews
- Top 3 prós mais mencionados (via agregação)
- Top 3 contras
- Reviews individuais paginadas (default 5, expandir)
- Filtro: "Apenas reviews de quem teve por 3+ anos"

### C.5 — Score de recomendação
- Integrar rating médio no ranking do recommend
- Modelos com avg ≥ 4.0 e ≥10 reviews ganham bonus
- Modelos com avg < 3.0 ganham penalty (independente de reviews)

**Estimativa**: 7-10 dias (schema + form + moderação + display + integração no ranking).

---

## Fase D — Detecção IA de problemas crônicos

**Depende**: Fase C ter volume de reviews (~50+ por modelo pra ter sinal).

### D.1 — Edge Function `detect-chronic-issues`
- Roda em cron (diário/semanal)
- Pra cada `car_model` com ≥10 reviews, agrupa `car_reported_issues`
- Gemini clusteriza problemas similares ("motor liga e morre" + "motor não pega" = mesma issue)
- Output: `chronic_issues` table

### D.2 — Schema
```sql
create table chronic_issues (
  id uuid primary key,
  car_model_id uuid references car_models(id),
  title text not null,         -- ex: "Problema na bomba de combustível"
  description text,            -- síntese do que foi relatado
  category text,
  severity text,
  affected_review_count int,   -- quantas reviews mencionaram
  affected_pct numeric(5,2),   -- % do total de reviews
  first_detected_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique (car_model_id, title)
);
```

### D.3 — Display na página do modelo
- Card "Problemas crônicos relatados" (só aparece se há ≥1)
- Cada item: título + descrição + "Reportado por X% dos proprietários (N reviews)"
- Severity color-coded (verde/amarelo/vermelho)

### D.4 — Threshold de "crônico"
- **Decisão pendente**: quando um problema vira crônico?
  - Opção A: 5+ reviews mencionando
  - Opção B: 15%+ dos proprietários
  - Opção C: 3+ reviews E 10%+ (combinado)

### D.5 — Aviso ao matches
- Carros com problemas crônicos sev=alta aparecem com warning nos matches
- Opcional: penalty no score se severidade alta

**Estimativa**: 5-7 dias.

---

## Fase E — Enriquecimento de specs via IA

**Depende**: ANTHROPIC_API_KEY ativada + bulk import finalizado.

### E.1 — Edge Function `enrich-car-model`
- Triggered:
  - Lazy (quando user abre página do modelo pela 1ª vez)
  - Batch (cron, top N modelos visualizados)
- Gemini faz web search → extrai specs estruturadas:
  - Consumo (cidade/estrada)
  - HP, torque, 0-100km/h
  - Porta-malas (litros)
  - Comprimento/largura/altura
  - Equipamentos
- Salva em `car_models.specs jsonb`
- Marca `is_estimated=false` quando enriquecido

### E.2 — Cache + invalidação
- Specs raramente mudam (ano-modelo é congelado)
- Cache permanente (sem TTL)
- Re-enriquecer só se solicitado manualmente (admin)

**Estimativa**: 3-4 dias (depois de ter API key).

---

## Decisões pendentes

| # | Decisão | Quando | Default sugerido |
|---|---------|--------|------------------|
| 1 | Threshold de problema crônico | Fase D | 5+ reviews E 10%+ |
| 2 | Backfill histórico de preço (12 meses) | Fase B | Top 200 modelos só |
| 3 | Quem modera reviews? | Fase C | Gemini auto + queue manual pra flagged |
| 4 | Verificação de propriedade do carro | Fase C | Self-declaration MVP, OCR CRLV depois |
| 5 | Nome do reviewer aparece? | Fase C | Primeiro nome + inicial sobrenome ("Diego B.") |
| 6 | Threshold rating pra penalty no ranking | Fase C.5 | <3.0 |
| 7 | Onde pegar **fotos** dos modelos? | Fase A.2 | Wikipedia API (CC-licensed) + fallback placeholder |
| 8 | Aba "Catálogo" substitui "Quiz" ou é adicional? | Fase A.1 | Adicional (5 tabs) ou consolidar Quiz no Início |

---

## Outras frentes (não detalhadas)

- **APK Android grátis** via EAS Build (1 dia, sem custo)
- **Domínio próprio** `autodna.com.br` (1h + custo Registro.BR ~R$ 40/ano)
- **Apple Developer + TestFlight** (US$ 99/ano, 2-3 dias setup)
- **Privacy Policy + ToS** (1-2 dias, advogado ou template + revisão)
- **Notificações** (apenas Android via PWA; iOS PWA não suporta)
- **Modo dark** (1-2 dias)
- **Comparar 2-3 carros lado a lado** (3-4 dias)
- **Compartilhar match** ("Olha o carro que combina comigo!") (1 dia)
