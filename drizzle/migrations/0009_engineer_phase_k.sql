CREATE TABLE IF NOT EXISTS public.engineer_settings (
  id int PRIMARY KEY DEFAULT 1,
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
INSERT INTO public.engineer_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.engineer_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  git_tag text NOT NULL UNIQUE,
  git_sha text NOT NULL,
  summary text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  trigger text NOT NULL DEFAULT 'manual',
  task_id uuid,
  files_affected text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_engineer_checkpoints_created ON public.engineer_checkpoints (created_at DESC);
ALTER TABLE public.engineer_checkpoints ENABLE ROW LEVEL SECURITY;

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
CREATE INDEX IF NOT EXISTS idx_engineer_change_log_checkpoint ON public.engineer_change_log (checkpoint_id, created_at ASC);
ALTER TABLE public.engineer_change_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.engineer_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'planning', 'scope_review', 'inspecting', 'coding', 'testing',
    'review_ready', 'budget_paused', 'merged', 'deploying', 'deployed',
    'rejected', 'failed'
  )),
  classification text,
  classification_label text,
  complexity int,
  scope jsonb,
  plan_summary text,
  risk_notes text,
  expected_files text[] DEFAULT '{}',
  tests_planned text[] DEFAULT '{}',
  scope_violations jsonb,
  branch_name text,
  base_sha text,
  commit_sha text,
  verified_sha text,
  diff_content text,
  diff_stats jsonb,
  files_modified text[] DEFAULT '{}',
  has_migration boolean NOT NULL DEFAULT false,
  migration_sql text,
  migration_approved boolean NOT NULL DEFAULT false,
  build_passed boolean NOT NULL DEFAULT false,
  verification jsonb,
  firewall jsonb,
  diagnosis jsonb,
  retry_count int NOT NULL DEFAULT 0,
  revision_feedback text,
  tokens_used int NOT NULL DEFAULT 0,
  cost_estimate_usd numeric(12, 6) NOT NULL DEFAULT 0,
  cost_actual_usd numeric(12, 6),
  actions_minutes numeric(8, 2),
  duration_seconds int,
  runner_id text,
  locked_at timestamptz,
  locked_by text,
  heartbeat_at timestamptz,
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
CREATE INDEX IF NOT EXISTS idx_engineer_tasks_status ON public.engineer_tasks (status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_engineer_tasks_created ON public.engineer_tasks (created_at DESC);
ALTER TABLE public.engineer_tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.engineer_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.engineer_tasks(id) ON DELETE RESTRICT,
  step_name text NOT NULL,
  log_text text NOT NULL,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_engineer_logs_task ON public.engineer_logs (task_id, created_at ASC);
ALTER TABLE public.engineer_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.engineer_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  component text NOT NULL,
  state text NOT NULL CHECK (state IN ('ok', 'warn', 'fail', 'escalated')),
  detail text,
  repaired boolean NOT NULL DEFAULT false,
  repair_note text
);
CREATE INDEX IF NOT EXISTS idx_engineer_health_events_checked ON public.engineer_health_events (checked_at DESC);
ALTER TABLE public.engineer_health_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_next_engineer_task(p_runner_id text)
RETURNS SETOF public.engineer_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_runner_id IS NULL OR length(btrim(p_runner_id)) = 0 THEN
    RAISE EXCEPTION 'runner id required';
  END IF;
  RETURN QUERY
  UPDATE public.engineer_tasks t
  SET status = 'planning', locked_at = now(), locked_by = p_runner_id,
      runner_id = p_runner_id, heartbeat_at = now(), updated_at = now()
  WHERE t.id = (
    SELECT c.id FROM public.engineer_tasks c
    WHERE c.status = 'queued'
       OR (c.status IN ('planning', 'inspecting', 'coding', 'testing')
           AND (c.heartbeat_at IS NULL OR c.heartbeat_at < now() - INTERVAL '5 minutes'))
    ORDER BY c.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING t.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_engineer_task(p_task_id uuid, p_runner_id text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE updated int;
BEGIN
  UPDATE public.engineer_tasks SET heartbeat_at = now(), updated_at = now()
  WHERE id = p_task_id AND locked_by = p_runner_id;
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.sweep_stalled_engineer_tasks()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE recovered int;
BEGIN
  WITH stalled AS (
    UPDATE public.engineer_tasks
    SET status = 'queued', locked_at = NULL, locked_by = NULL, updated_at = now()
    WHERE status IN ('planning', 'inspecting', 'coding', 'testing')
      AND (heartbeat_at IS NULL OR heartbeat_at < now() - INTERVAL '5 minutes')
    RETURNING 1
  )
  SELECT count(*) INTO recovered FROM stalled;
  RETURN recovered;
END;
$$;

REVOKE ALL ON public.engineer_settings, public.engineer_checkpoints, public.engineer_change_log, public.engineer_tasks, public.engineer_logs, public.engineer_health_events FROM anon, authenticated;
GRANT ALL ON public.engineer_settings, public.engineer_checkpoints, public.engineer_change_log, public.engineer_tasks, public.engineer_logs, public.engineer_health_events TO service_role;

REVOKE ALL ON FUNCTION public.claim_next_engineer_task(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_engineer_task(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sweep_stalled_engineer_tasks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_engineer_task(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_engineer_task(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_stalled_engineer_tasks() TO service_role;