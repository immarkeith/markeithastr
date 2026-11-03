-- ASTR Phase K / K.7 — Self-Development AI Engineer
-- Copy of supabase/migrations/20261103010000_engineer_phase_k.sql, kept here
-- so a fresh database can be rebuilt by pasting files 01 → 16 in order.
-- Additive only: new tables, new functions, no existing table touched.

-- ASTR Phase K / K.7 — Self-Development AI Engineer
--
-- ADDITIVE ONLY. This migration creates new tables and functions; it never
-- touches existing trading, research, or market-data tables. Run it once in the
-- Supabase SQL editor (the app degrades gracefully — and says so in the UI —
-- until it has been applied).
--
-- Golden invariants encoded here:
--   * Audit history is never cascade-deleted (change log holds RESTRICT to its
--     checkpoint; checkpoints are never removed by the app).
--   * Only the service role may lease or update engineering tasks; anon and
--     authenticated get no table grants and no RPC execution rights.
--   * SECURITY DEFINER functions pin search_path so caller-controlled schemas
--     cannot hijack them.
--   * Leasing is atomic (FOR UPDATE SKIP LOCKED) with a 5-minute heartbeat and
--     stalled-worker recovery, so a crashed runner loses no task.

-- ---------------------------------------------------------------- 1. settings
CREATE TABLE IF NOT EXISTS public.engineer_settings (
  id int PRIMARY KEY DEFAULT 1,
  -- OpenAI-compatible endpoint. Deliberately NULL: no provider is preselected.
  llm_base_url text,
  llm_model text,
  llm_price_per_million_tokens numeric(12, 4) NOT NULL DEFAULT 0,
  llm_monthly_budget_usd numeric(12, 4) NOT NULL DEFAULT 5,
  target_branch text NOT NULL DEFAULT 'main',
  deploy_workflow text,
  deployment_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT engineer_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.engineer_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engineer_settings FROM anon, authenticated;

INSERT INTO public.engineer_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------- 2. checkpoints & change log
CREATE TABLE IF NOT EXISTS public.engineer_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  git_tag text NOT NULL UNIQUE,
  git_sha text NOT NULL,
  summary text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  trigger text NOT NULL DEFAULT 'manual',   -- manual | pre_task | post_deploy | recovery
  task_id uuid,                              -- intentionally not a FK: history outlives tasks
  files_affected text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engineer_checkpoints_created
  ON public.engineer_checkpoints (created_at DESC);

ALTER TABLE public.engineer_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engineer_checkpoints FROM anon, authenticated;

-- Immutable audit trail of which files a checkpoint covers. RESTRICT (not
-- CASCADE) so archived history can never be silently deleted.
CREATE TABLE IF NOT EXISTS public.engineer_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id uuid REFERENCES public.engineer_checkpoints(id) ON DELETE RESTRICT,
  task_id uuid,
  file_path text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('add', 'modify', 'delete')),
  before_sha text,
  after_sha text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engineer_change_log_checkpoint
  ON public.engineer_change_log (checkpoint_id, created_at ASC);

ALTER TABLE public.engineer_change_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engineer_change_log FROM anon, authenticated;

-- --------------------------------------------------------------- 3. task queue
CREATE TABLE IF NOT EXISTS public.engineer_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'planning', 'scope_review', 'inspecting', 'coding', 'testing',
    'review_ready', 'budget_paused', 'merged', 'deploying', 'deployed',
    'rejected', 'failed'
  )),

  -- K.7 engineering intelligence
  classification text,            -- level_1 .. level_5
  classification_label text,
  complexity int,                 -- 1..5
  scope jsonb,                    -- { objective, allowed_areas, acceptance_criteria, exclusions, protected_systems }
  plan_summary text,
  risk_notes text,
  expected_files text[] DEFAULT '{}',
  tests_planned text[] DEFAULT '{}',
  scope_violations jsonb,

  -- git / diff
  branch_name text,
  base_sha text,
  commit_sha text,
  verified_sha text,
  diff_content text,
  diff_stats jsonb,               -- { files, additions, deletions }
  files_modified text[] DEFAULT '{}',

  -- migration gate (independent of code approval)
  has_migration boolean NOT NULL DEFAULT false,
  migration_sql text,
  migration_approved boolean NOT NULL DEFAULT false,

  -- verification breakdown
  build_passed boolean NOT NULL DEFAULT false,
  verification jsonb,             -- { typecheck, lint, build, tests, migration, security, regression }
  firewall jsonb,                 -- { passed, scanned_files, violations[] }
  diagnosis jsonb,                -- { category, message, file, attempts[] }
  retry_count int NOT NULL DEFAULT 0,
  revision_feedback text,

  -- resource intelligence
  tokens_used int NOT NULL DEFAULT 0,
  cost_estimate_usd numeric(12, 6) NOT NULL DEFAULT 0,
  cost_actual_usd numeric(12, 6),
  actions_minutes numeric(8, 2),
  duration_seconds int,

  -- lease / runner
  runner_id text,
  locked_at timestamptz,
  locked_by text,
  heartbeat_at timestamptz,

  -- governance
  checkpoint_id uuid,
  approved_at timestamptz,
  approved_by text,
  deployment_status text NOT NULL DEFAULT 'not_started'
    CHECK (deployment_status IN ('not_started', 'unavailable', 'dispatched', 'failed', 'verified')),
  deployment_note text,
  archived boolean NOT NULL DEFAULT false,
  created_by text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_engineer_tasks_status
  ON public.engineer_tasks (status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_engineer_tasks_created
  ON public.engineer_tasks (created_at DESC);

ALTER TABLE public.engineer_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engineer_tasks FROM anon, authenticated;

-- ------------------------------------------------------------ 4. runner logs
CREATE TABLE IF NOT EXISTS public.engineer_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.engineer_tasks(id) ON DELETE RESTRICT,
  step_name text NOT NULL,
  log_text text NOT NULL,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engineer_logs_task
  ON public.engineer_logs (task_id, created_at ASC);

ALTER TABLE public.engineer_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engineer_logs FROM anon, authenticated;

-- ------------------------------------------------ 5. operational health events
CREATE TABLE IF NOT EXISTS public.engineer_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  component text NOT NULL,
  state text NOT NULL CHECK (state IN ('ok', 'warn', 'fail', 'escalated')),
  detail text,
  repaired boolean NOT NULL DEFAULT false,
  repair_note text
);

CREATE INDEX IF NOT EXISTS idx_engineer_health_events_checked
  ON public.engineer_health_events (checked_at DESC);

ALTER TABLE public.engineer_health_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engineer_health_events FROM anon, authenticated;

-- --------------------------------------------- 6. atomic FIFO lease + heartbeat
CREATE OR REPLACE FUNCTION public.claim_next_engineer_task(p_runner_id text)
RETURNS SETOF public.engineer_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_runner_id IS NULL OR length(btrim(p_runner_id)) = 0 THEN
    RAISE EXCEPTION 'runner id required';
  END IF;

  RETURN QUERY
  UPDATE public.engineer_tasks t
  SET status = 'planning',
      locked_at = now(),
      locked_by = p_runner_id,
      runner_id = p_runner_id,
      heartbeat_at = now(),
      updated_at = now()
  WHERE t.id = (
    SELECT c.id
    FROM public.engineer_tasks c
    WHERE c.status = 'queued'
       OR (
         c.status IN ('planning', 'inspecting', 'coding', 'testing')
         AND (c.heartbeat_at IS NULL OR c.heartbeat_at < now() - INTERVAL '5 minutes')
       )
    ORDER BY c.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING t.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_engineer_task(p_task_id uuid, p_runner_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated int;
BEGIN
  UPDATE public.engineer_tasks
  SET heartbeat_at = now(), updated_at = now()
  WHERE id = p_task_id AND locked_by = p_runner_id;

  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

-- Requeue tasks whose runner stopped heartbeating. Returns the number of
-- leases recovered. Bounded: only active statuses, never review_ready/merged.
CREATE OR REPLACE FUNCTION public.sweep_stalled_engineer_tasks()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  recovered int;
BEGIN
  WITH stalled AS (
    UPDATE public.engineer_tasks
    SET status = 'queued',
        locked_at = NULL,
        locked_by = NULL,
        updated_at = now()
    WHERE status IN ('planning', 'inspecting', 'coding', 'testing')
      AND (heartbeat_at IS NULL OR heartbeat_at < now() - INTERVAL '5 minutes')
    RETURNING 1
  )
  SELECT count(*) INTO recovered FROM stalled;
  RETURN recovered;
END;
$$;

-- Only the service role (trusted server code / the GitHub runner) may execute.
REVOKE ALL ON FUNCTION public.claim_next_engineer_task(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_engineer_task(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sweep_stalled_engineer_tasks() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_next_engineer_task(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_engineer_task(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_stalled_engineer_tasks() TO service_role;
