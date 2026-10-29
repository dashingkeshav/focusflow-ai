/**
 * FocusFlow AI — Database migrations (idempotent, run on boot)
 * Extends the existing Supabase PostgreSQL schema for Smart Focus Mode.
 *
 *  - sessions: task context, strictness, pause bookkeeping, classification stats
 *  - activity_events: classification + action columns
 *  - domain_classifications: cached per-user domain decisions (learned behaviour)
 */

const { pool } = require("./db");

let applied = false;

async function runMigrations() {
  if (applied) return;

  // Ensure baseline tables exist for fresh databases
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(255) NOT NULL,
      email varchar(255) UNIQUE NOT NULL,
      password varchar(255) NOT NULL,
      daily_goal_hours integer DEFAULT 4,
      streak_days integer DEFAULT 0,
      reset_token varchar(255),
      reset_token_expire timestamptz,
      reset_otp varchar(16),
      reset_otp_expire timestamptz,
      last_login timestamptz,
      email_verified boolean DEFAULT false,
      onboarding_completed boolean DEFAULT false,
      onboarding_answers jsonb,
      plan varchar(32) DEFAULT 'free',
      is_pro boolean DEFAULT false,
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id uuid,
      title varchar(255) DEFAULT 'Study Focus Session',
      start_time timestamptz DEFAULT NOW(),
      end_time timestamptz,
      duration_seconds integer DEFAULT 0,
      avg_focus_score real,
      final_focus_score real,
      tab_switches integer DEFAULT 0,
      idle_time_seconds integer DEFAULT 0,
      camera_distractions integer DEFAULT 0,
      warning_count integer DEFAULT 0,
      blocked_attempts integer DEFAULT 0,
      distraction_events integer DEFAULT 0,
      last_telemetry_at timestamptz,
      keyboard_events integer DEFAULT 0,
      mouse_events integer DEFAULT 0,
      focus_score_samples integer DEFAULT 0,
      status varchar(32) DEFAULT 'active',
      subject varchar(120),
      strictness varchar(16) DEFAULT 'balanced',
      mode varchar(16) DEFAULT 'balanced',
      planned_duration_seconds integer DEFAULT 0,
      paused_at timestamptz,
      paused_seconds integer DEFAULT 0,
      browser_protection boolean DEFAULT true,
      allowed_sites jsonb DEFAULT '[]'::jsonb,
      blocked_sites jsonb DEFAULT '[]'::jsonb,
      warning_sites jsonb DEFAULT '[]'::jsonb,
      escalated_domains jsonb DEFAULT '{}'::jsonb,
      productive_seconds integer DEFAULT 0,
      distraction_domain_count integer DEFAULT 0,
      notes text,
      task_outcome varchar(32),
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      event_type varchar(64) NOT NULL,
      details text,
      domain varchar(255),
      warning_number integer,
      classification varchar(32),
      action_taken varchar(32),
      reason text,
      from_domain varchar(255),
      confidence real,
      recovery_duration_seconds integer,
      timestamp timestamptz DEFAULT NOW(),
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    );
  `);

  // Add onboarding and subscription fields to users table
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS onboarding_answers jsonb,
      ADD COLUMN IF NOT EXISTS plan varchar(32) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false
  `);

  await pool.query(`
    ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS last_telemetry_at timestamptz,
      ADD COLUMN IF NOT EXISTS keyboard_events integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS mouse_events integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS focus_score_samples integer DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS task_id uuid,
      ADD COLUMN IF NOT EXISTS subject varchar(120),
      ADD COLUMN IF NOT EXISTS strictness varchar(16) DEFAULT 'balanced',
      ADD COLUMN IF NOT EXISTS mode varchar(16) DEFAULT 'balanced',
      ADD COLUMN IF NOT EXISTS planned_duration_seconds integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS paused_at timestamptz,
      ADD COLUMN IF NOT EXISTS paused_seconds integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS browser_protection boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS allowed_sites jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS blocked_sites jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS warning_sites jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS escalated_domains jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS productive_seconds integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS distraction_domain_count integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS notes text,
      ADD COLUMN IF NOT EXISTS task_outcome varchar(32)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_start_time
      ON sessions (user_id, start_time DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_task
      ON sessions (user_id, task_id)
      WHERE task_id IS NOT NULL
  `);

  // Focus scores must never be fabricated: drop the NOT NULL DEFAULT 100
  // so a session without real telemetry stores NULL ("Not available").
  await pool.query(`
    ALTER TABLE sessions
      ALTER COLUMN avg_focus_score DROP DEFAULT,
      ALTER COLUMN avg_focus_score DROP NOT NULL
  `);

  await pool.query(`
    ALTER TABLE activity_events
      ADD COLUMN IF NOT EXISTS classification varchar(32),
      ADD COLUMN IF NOT EXISTS action_taken varchar(32),
      ADD COLUMN IF NOT EXISTS reason text,
      ADD COLUMN IF NOT EXISTS from_domain varchar(255),
      ADD COLUMN IF NOT EXISTS confidence real,
      ADD COLUMN IF NOT EXISTS recovery_duration_seconds integer
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_event_type_check') THEN
        ALTER TABLE activity_events DROP CONSTRAINT activity_event_type_check;
        ALTER TABLE activity_events ADD CONSTRAINT activity_event_type_check
          CHECK (event_type = ANY (ARRAY[
            'tab_switch'::text, 'tab_switched'::text, 'idle'::text, 'idle_detected'::text,
            'keyboard_burst'::text, 'mouse_burst'::text, 'camera_absent'::text, 'camera_present'::text,
            'distraction_warning'::text, 'distraction_detected'::text, 'domain_blocked'::text,
            'site_blocked'::text, 'site_warning'::text, 'distraction_recovered'::text
          ]));
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS domain_classifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      domain varchar(255) NOT NULL,
      classification varchar(32) NOT NULL,
      source varchar(32) NOT NULL DEFAULT 'heuristic',
      confidence real DEFAULT 0.6,
      reason text,
      sample_count integer DEFAULT 1,
      updated_at timestamptz DEFAULT NOW(),
      created_at timestamptz DEFAULT NOW(),
      UNIQUE (user_id, domain)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_activity_events_session_ts
      ON activity_events (session_id, timestamp DESC)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      plan_type varchar(32) DEFAULT 'daily',
      prompt text,
      items jsonb DEFAULT '[]'::jsonb,
      insights jsonb DEFAULT '{}'::jsonb,
      plan_health varchar(32) DEFAULT 'HEALTHY',
      current_horizon varchar(32) DEFAULT 'today',
      next_best_action jsonb DEFAULT '{}'::jsonb,
      persona varchar(64) DEFAULT 'General',
      planning_mode varchar(64) DEFAULT 'balanced',
      updated_at timestamptz DEFAULT NOW(),
      created_at timestamptz DEFAULT NOW(),
      UNIQUE (user_id)
    )
  `);

  await pool.query(`
    ALTER TABLE user_plans
      ADD COLUMN IF NOT EXISTS plan_type varchar(32) DEFAULT 'daily',
      ADD COLUMN IF NOT EXISTS prompt text,
      ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS insights jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS plan_health varchar(32) DEFAULT 'HEALTHY',
      ADD COLUMN IF NOT EXISTS current_horizon varchar(32) DEFAULT 'today',
      ADD COLUMN IF NOT EXISTS next_best_action jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS persona varchar(64) DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS planning_mode varchar(64) DEFAULT 'balanced',
      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW()
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_plans_user_id_fkey'
          AND conrelid = 'user_plans'::regclass
      ) THEN
        ALTER TABLE user_plans
          ADD CONSTRAINT user_plans_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_plans_user_id_present'
          AND conrelid = 'user_plans'::regclass
      ) THEN
        ALTER TABLE user_plans
          ADD CONSTRAINT user_plans_user_id_present
          CHECK (user_id IS NOT NULL) NOT VALID;
      END IF;
    END;
    $$
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_plans_user_unique
      ON user_plans (user_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS plan_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      version_number integer NOT NULL DEFAULT 1,
      plan_type varchar(32) DEFAULT 'daily',
      prompt text,
      items jsonb DEFAULT '[]'::jsonb,
      insights jsonb DEFAULT '{}'::jsonb,
      change_reason text,
      created_at timestamptz DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE plan_versions
      ADD COLUMN IF NOT EXISTS user_id uuid,
      ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS plan_type varchar(32) DEFAULT 'daily',
      ADD COLUMN IF NOT EXISTS prompt text,
      ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS insights jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS change_reason text,
      ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW()
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'plan_versions_user_id_fkey'
          AND conrelid = 'plan_versions'::regclass
      ) THEN
        ALTER TABLE plan_versions
          ADD CONSTRAINT plan_versions_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'plan_versions_user_version_valid'
          AND conrelid = 'plan_versions'::regclass
      ) THEN
        ALTER TABLE plan_versions
          ADD CONSTRAINT plan_versions_user_version_valid
          CHECK (user_id IS NOT NULL AND version_number > 0) NOT VALID;
      END IF;
    END;
    $$
  `);

  // Existing deployments may have duplicate version numbers from concurrent
  // COUNT()+1 writers. Preserve every history row and make numbering
  // deterministic before enforcing uniqueness.
  const planVersionClient = await pool.connect();
  try {
    await planVersionClient.query("BEGIN");
    await planVersionClient.query("LOCK TABLE plan_versions IN SHARE ROW EXCLUSIVE MODE");
    await planVersionClient.query(`
      WITH duplicate_users AS (
        SELECT user_id
        FROM plan_versions
        GROUP BY user_id
        HAVING COUNT(*) > COUNT(DISTINCT version_number)
            OR BOOL_OR(version_number IS NULL OR version_number < 1)
      ), ranked AS (
        SELECT id, user_id,
               ROW_NUMBER() OVER (
                 PARTITION BY user_id ORDER BY created_at ASC NULLS FIRST, id ASC
               ) AS canonical_version
        FROM plan_versions
      )
      UPDATE plan_versions AS versions
      SET version_number = ranked.canonical_version
      FROM ranked
      WHERE versions.id = ranked.id
        AND ranked.user_id IN (SELECT user_id FROM duplicate_users)
    `);
    await planVersionClient.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_versions_user_version
        ON plan_versions (user_id, version_number DESC)
    `);
    await planVersionClient.query("COMMIT");
  } catch (error) {
    await planVersionClient.query("ROLLBACK");
    throw error;
  } finally {
    planVersionClient.release();
  }

  // These tables are accessed through the authenticated backend's direct pg
  // connection, not through Supabase client-side table access. Enable RLS as
  // defense in depth and leave no client policies or grants on the exposed
  // public-schema tables. The backend connection must use the table owner or a
  // BYPASSRLS role for its existing planner queries to continue working.
  await pool.query(`
    ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_plans NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE public.plan_versions NO FORCE ROW LEVEL SECURITY;
    REVOKE ALL PRIVILEGES ON TABLE public.user_plans, public.plan_versions FROM PUBLIC;
  `);

  await pool.query(`
    DO $$
    DECLARE
      client_role text;
      existing_policy record;
    BEGIN
      FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated']
      LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
          EXECUTE format(
            'REVOKE ALL PRIVILEGES ON TABLE public.user_plans, public.plan_versions FROM %I',
            client_role
          );
        END IF;
      END LOOP;

      -- Remove any legacy policies on these storage tables so client access is
      -- denied by grants as well as RLS. Backend owner/BYPASSRLS access remains.
      FOR existing_policy IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('user_plans', 'plan_versions')
      LOOP
        EXECUTE format(
          'DROP POLICY %I ON public.%I',
          existing_policy.policyname,
          existing_policy.tablename
        );
      END LOOP;
    END;
    $$
  `);

  // Goals table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS goals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name varchar(255) NOT NULL,
      description text,
      category varchar(64) DEFAULT 'Study',
      priority varchar(16) DEFAULT 'Medium',
      start_date date DEFAULT CURRENT_DATE,
      target_date date,
      target_value integer DEFAULT 10,
      habit boolean DEFAULT false,
      habit_streak integer DEFAULT 0,
      habit_last_completed_at date,
      status varchar(32) DEFAULT 'Active',
      tasks jsonb DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id)
  `);

  // Goals table milestones & progress
  await pool.query(`
    ALTER TABLE goals
      ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0
  `);

  // First-class Tasks table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
      title varchar(255) NOT NULL,
      description text,
      priority varchar(16) DEFAULT 'Medium',
      status varchar(32) DEFAULT 'todo',
      due_date timestamptz,
      estimated_duration integer DEFAULT 25,
      actual_duration integer DEFAULT 0,
      milestone varchar(255),
      tags jsonb DEFAULT '[]'::jsonb,
      subtasks jsonb DEFAULT '[]'::jsonb,
      is_recurring boolean DEFAULT false,
      recurrence_rule varchar(64),
      completed_at timestamptz,
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    )
  `);

  // Milestone label on goal-linked tasks (used by the Goals workspace)
  await pool.query(`
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS milestone varchar(255)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id)
  `);

  // Keep the task link optional for legacy focus sessions while ensuring new
  // links point at real tasks. NOT VALID avoids blocking upgrades on old rows;
  // PostgreSQL still enforces the constraint for new/updated rows.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'sessions_task_id_fkey'
          AND conrelid = 'sessions'::regclass
      ) THEN
        ALTER TABLE sessions
          ADD CONSTRAINT sessions_task_id_fkey
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL NOT VALID;
      END IF;
    END
    $$
  `);

  // One-time migration: move legacy goal.tasks jsonb entries into the
  // first-class tasks table so progress has a single source of truth.
  // Idempotent: only goals with a non-empty tasks array are touched, and the
  // array is cleared inside the same transaction after a successful insert.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const legacyRes = await client.query(
      `SELECT id, user_id, tasks FROM goals WHERE tasks IS NOT NULL AND jsonb_array_length(tasks) > 0 FOR UPDATE`
    );
    for (const goal of legacyRes.rows) {
      const legacyTasks = Array.isArray(goal.tasks) ? goal.tasks : [];
      for (const t of legacyTasks) {
        if (!t || typeof t.title !== "string" || !t.title.trim()) continue;
        await client.query(
          `INSERT INTO tasks (user_id, goal_id, title, priority, status, milestone, completed_at)
           VALUES ($1, $2, $3, 'Medium', $4, $5, $6)`,
          [
            goal.user_id,
            goal.id,
            t.title.trim().slice(0, 255),
            t.done ? "completed" : "todo",
            typeof t.milestone === "string" && t.milestone.trim() ? t.milestone.trim() : null,
            t.done ? new Date() : null,
          ]
        );
      }
      await client.query(`UPDATE goals SET tasks = '[]'::jsonb WHERE id = $1`, [goal.id]);
    }
    await client.query("COMMIT");
  } catch (legacyErr) {
    await client.query("ROLLBACK");
    console.error("Legacy goal tasks migration failed (will retry next boot):", legacyErr.message);
  } finally {
    client.release();
  }

  // Calendar Events table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title varchar(255) NOT NULL,
      start_time timestamptz NOT NULL,
      end_time timestamptz NOT NULL,
      event_type varchar(32) DEFAULT 'focus',
      linked_goal_name varchar(255),
      linked_task_id varchar(128),
      description text,
      created_at timestamptz DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time
      ON calendar_events(user_id, start_time ASC)
  `);

  // Achievement Definitions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS achievement_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key varchar(64) UNIQUE NOT NULL,
      title varchar(120) NOT NULL,
      description text NOT NULL,
      icon varchar(32) DEFAULT 'Trophy',
      category varchar(32) DEFAULT 'general',
      target integer NOT NULL DEFAULT 1,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT NOW()
    )
  `);

  // User Achievements table (System + Custom)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_id uuid REFERENCES achievement_definitions(id) ON DELETE CASCADE,
      progress integer NOT NULL DEFAULT 0,
      unlocked boolean NOT NULL DEFAULT false,
      unlocked_at timestamptz,
      is_custom boolean NOT NULL DEFAULT false,
      custom_title varchar(120),
      custom_description text,
      custom_target integer,
      created_at timestamptz DEFAULT NOW(),
      updated_at timestamptz DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_achievements_user_def
      ON user_achievements(user_id, achievement_id)
      WHERE achievement_id IS NOT NULL
  `);

  // Seed standard system achievement definitions
  const systemAchievements = [
    {
      key: "first_task",
      title: "First Task",
      description: "Create your first task in FocusFlow.",
      icon: "CheckSquare",
      category: "tasks",
      target: 1,
    },
    {
      key: "task_manager",
      title: "Task Master",
      description: "Complete 10 tasks.",
      icon: "CheckCircle2",
      category: "tasks",
      target: 10,
    },
    {
      key: "task_titan",
      title: "Task Titan",
      description: "Complete 25 tasks.",
      icon: "Award",
      category: "tasks",
      target: 25,
    },
    {
      key: "goal_starter",
      title: "Ambition Sparked",
      description: "Create your first goal.",
      icon: "Compass",
      category: "goals",
      target: 1,
    },
    {
      key: "goal_finisher",
      title: "Goal Finisher",
      description: "Complete your first goal.",
      icon: "Trophy",
      category: "goals",
      target: 1,
    },
    {
      key: "goal_master",
      title: "Goal Champion",
      description: "Complete 5 goals.",
      icon: "Crown",
      category: "goals",
      target: 5,
    },
    {
      key: "habit_keeper",
      title: "Habit Keeper",
      description: "Maintain a habit for 7 consecutive days.",
      icon: "Flame",
      category: "habits",
      target: 7,
    },
    {
      key: "first_focus",
      title: "Laser Focus",
      description: "Complete your first focus session.",
      icon: "Zap",
      category: "focus",
      target: 1,
    },
    {
      key: "focus_pro",
      title: "Deep Worker",
      description: "Complete 5 focus sessions.",
      icon: "Timer",
      category: "focus",
      target: 5,
    },
    {
      key: "century_focus",
      title: "Century Club",
      description: "Log 100+ minutes of focus time.",
      icon: "Clock",
      category: "focus",
      target: 100,
    },
    {
      key: "planner_pro",
      title: "Master Strategist",
      description: "Generate and save a personalized AI plan.",
      icon: "Sparkles",
      category: "planner",
      target: 1,
    },
  ];

  for (const ach of systemAchievements) {
    await pool.query(`
      INSERT INTO achievement_definitions (key, title, description, icon, category, target)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (key) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        category = EXCLUDED.category,
        target = EXCLUDED.target
    `, [ach.key, ach.title, ach.description, ach.icon, ach.category, ach.target]);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_key varchar(32) NOT NULL CHECK (plan_key IN ('student_pro', 'pro')),
      razorpay_subscription_id varchar(128) NOT NULL UNIQUE,
      razorpay_payment_id varchar(128),
      status varchar(32) NOT NULL CHECK (
        status IN (
          'created', 'authenticated', 'active', 'cancel_pending',
          'paused', 'halted', 'cancelled', 'completed', 'failed'
        )
      ),
      current_start timestamptz,
      current_end timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_created
      ON user_subscriptions (user_id, created_at DESC)
  `);

  try {
    await pool.query(`
      ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_key_check;
      ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_plan_key_check CHECK (plan_key IN ('student_pro', 'pro'));
    `);
  } catch {
    // Ignore if already set
  }

  await pool.query(`
    ALTER TABLE user_subscriptions
      ADD COLUMN IF NOT EXISTS razorpay_plan_id varchar(128),
      ADD COLUMN IF NOT EXISTS amount integer DEFAULT 39900,
      ADD COLUMN IF NOT EXISTS currency varchar(8) DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
      ADD COLUMN IF NOT EXISTS cancellation_reason text,
      ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb
  `);

  try {
    await pool.query(`
      ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;
      ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_status_check CHECK (
        status IN (
          'created', 'authenticated', 'active', 'cancel_pending',
          'paused', 'halted', 'cancelled', 'completed', 'failed', 'pending'
        )
      );
    `);
  } catch {
    // Ignore if already set
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_webhook_events (
      event_id varchar(128) PRIMARY KEY,
      event_type varchar(64),
      subscription_id varchar(128),
      payload jsonb,
      processed boolean DEFAULT true,
      received_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    ALTER TABLE billing_webhook_events
      ADD COLUMN IF NOT EXISTS event_type varchar(64),
      ADD COLUMN IF NOT EXISTS subscription_id varchar(128),
      ADD COLUMN IF NOT EXISTS payload jsonb,
      ADD COLUMN IF NOT EXISTS processed boolean DEFAULT true
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_feature_usage (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature_key varchar(64) NOT NULL,
      period_start timestamptz NOT NULL,
      usage_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, feature_key, period_start)
    );

    CREATE INDEX IF NOT EXISTS idx_user_feature_usage_lookup
      ON user_feature_usage (user_id, feature_key, period_start DESC);
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_feature_usage ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE user_subscriptions, billing_webhook_events, user_feature_usage FROM PUBLIC
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title varchar(255) NOT NULL,
      message text NOT NULL,
      type varchar(32) NOT NULL DEFAULT 'info',
      link varchar(255),
      read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
      ON notifications (user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
      ON notifications (user_id, read)
      WHERE read = false;
  `);

  // =====================================================
  // FOCUS INTELLIGENCE FEATURES
  // 1. Quick Capture Inbox
  // 2. Recall Studio (Active-Recall & Spaced-Review)
  // 3. Session Memory (Checkpoints)
  // 4. Focus Lab (Habit Experiments)
  // =====================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quick_captures (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      title varchar(255),
      source_url varchar(1024),
      source_title varchar(255),
      capture_type varchar(32) NOT NULL DEFAULT 'thought',
      priority varchar(16) NOT NULL DEFAULT 'medium',
      status varchar(32) NOT NULL DEFAULT 'inbox',
      ai_classification jsonb,
      converted_to_type varchar(32),
      converted_to_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_quick_captures_user_status
      ON quick_captures (user_id, status, created_at DESC);

    CREATE TABLE IF NOT EXISTS recall_decks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title varchar(255) NOT NULL,
      description text,
      subject varchar(120),
      card_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_recall_decks_user
      ON recall_decks (user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS recall_cards (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      deck_id uuid NOT NULL REFERENCES recall_decks(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      front text NOT NULL,
      back text NOT NULL,
      hint text,
      ease_factor real NOT NULL DEFAULT 2.5,
      interval_days integer NOT NULL DEFAULT 0,
      repetitions integer NOT NULL DEFAULT 0,
      due_date timestamptz NOT NULL DEFAULT now(),
      last_reviewed_at timestamptz,
      last_rating varchar(16),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_recall_cards_user_deck_due
      ON recall_cards (user_id, deck_id, due_date ASC);

    CREATE INDEX IF NOT EXISTS idx_recall_cards_user_due
      ON recall_cards (user_id, due_date ASC);

    CREATE TABLE IF NOT EXISTS recall_reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      card_id uuid NOT NULL REFERENCES recall_cards(id) ON DELETE CASCADE,
      deck_id uuid NOT NULL REFERENCES recall_decks(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating varchar(16) NOT NULL,
      review_duration_ms integer DEFAULT 0,
      reviewed_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_recall_reviews_user_reviewed
      ON recall_reviews (user_id, reviewed_at DESC);

    CREATE TABLE IF NOT EXISTS session_checkpoints (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
      task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
      task_title varchar(255),
      goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
      goal_name varchar(255),
      completed_work text NOT NULL,
      stopped_at text NOT NULL,
      next_action text NOT NULL,
      blocker text,
      resource_link varchar(1024),
      status varchar(32) NOT NULL DEFAULT 'active',
      resumed_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
      resumed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_session_checkpoints_user_status
      ON session_checkpoints (user_id, status, created_at DESC);

    CREATE TABLE IF NOT EXISTS focus_experiments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title varchar(255) NOT NULL,
      template_key varchar(64),
      hypothesis text NOT NULL,
      target_metric varchar(64) NOT NULL,
      duration_days integer NOT NULL DEFAULT 7,
      status varchar(32) NOT NULL DEFAULT 'active',
      start_date timestamptz NOT NULL DEFAULT now(),
      end_date timestamptz,
      baseline_window_days integer NOT NULL DEFAULT 14,
      notes text,
      conclusions text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_focus_experiments_user_status
      ON focus_experiments (user_id, status, created_at DESC);
  `);

  // =====================================================
  // COLLABORATION SUITE
  // 1. Focus Rooms (Quiet Coworking & Live Presence)
  // 2. Focus Circles (Recurring Accountability)
  // 3. Project Pods (Lightweight Collaborative Workspaces)
  // 4. Unblock Exchange (Peer Problem Solving)
  // =====================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS focus_rooms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      host_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title varchar(255) NOT NULL,
      category varchar(64) NOT NULL DEFAULT 'general',
      is_public boolean NOT NULL DEFAULT false,
      max_participants integer NOT NULL DEFAULT 4,
      invite_code varchar(64) UNIQUE NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'open',
      timer_status varchar(32) NOT NULL DEFAULT 'idle',
      timer_duration_seconds integer NOT NULL DEFAULT 1500,
      timer_start_time timestamptz,
      timer_elapsed_seconds integer NOT NULL DEFAULT 0,
      pod_id uuid,
      task_id uuid,
      help_request_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_focus_rooms_public_status
      ON focus_rooms (is_public, status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_focus_rooms_invite_code
      ON focus_rooms (invite_code);

    CREATE TABLE IF NOT EXISTS focus_room_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id uuid NOT NULL REFERENCES focus_rooms(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role varchar(32) NOT NULL DEFAULT 'member',
      joined_at timestamptz NOT NULL DEFAULT now(),
      left_at timestamptz,
      presence_status varchar(32) NOT NULL DEFAULT 'online',
      active_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
      UNIQUE(room_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_focus_room_members_user
      ON focus_room_members (user_id, left_at);

    CREATE TABLE IF NOT EXISTS focus_room_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id uuid NOT NULL REFERENCES focus_rooms(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      message_type varchar(32) NOT NULL DEFAULT 'chat',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_focus_room_messages_room_ts
      ON focus_room_messages (room_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS focus_circles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name varchar(255) NOT NULL,
      description text,
      category varchar(64) NOT NULL DEFAULT 'general',
      max_members integer NOT NULL DEFAULT 4,
      invite_code varchar(64) UNIQUE NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_focus_circles_owner
      ON focus_circles (owner_user_id, status);

    CREATE INDEX IF NOT EXISTS idx_focus_circles_invite_code
      ON focus_circles (invite_code);

    CREATE TABLE IF NOT EXISTS focus_circle_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      circle_id uuid NOT NULL REFERENCES focus_circles(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role varchar(32) NOT NULL DEFAULT 'member',
      joined_at timestamptz NOT NULL DEFAULT now(),
      status varchar(32) NOT NULL DEFAULT 'active',
      UNIQUE(circle_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_focus_circle_members_user
      ON focus_circle_members (user_id, status);

    CREATE TABLE IF NOT EXISTS focus_circle_commitments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      circle_id uuid NOT NULL REFERENCES focus_circles(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_number integer NOT NULL,
      year integer NOT NULL,
      commitment text NOT NULL,
      is_completed boolean NOT NULL DEFAULT false,
      completion_note text,
      checked_in_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(circle_id, user_id, week_number, year)
    );

    CREATE INDEX IF NOT EXISTS idx_focus_circle_commitments_circle_week
      ON focus_circle_commitments (circle_id, week_number, year);

    CREATE TABLE IF NOT EXISTS project_pods (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name varchar(255) NOT NULL,
      description text,
      status varchar(32) NOT NULL DEFAULT 'active',
      max_members integer NOT NULL DEFAULT 3,
      invite_code varchar(64) UNIQUE NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_project_pods_owner
      ON project_pods (owner_user_id, status);

    CREATE INDEX IF NOT EXISTS idx_project_pods_invite_code
      ON project_pods (invite_code);

    CREATE TABLE IF NOT EXISTS project_pod_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pod_id uuid NOT NULL REFERENCES project_pods(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role varchar(32) NOT NULL DEFAULT 'member',
      joined_at timestamptz NOT NULL DEFAULT now(),
      status varchar(32) NOT NULL DEFAULT 'active',
      UNIQUE(pod_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_project_pod_members_user
      ON project_pod_members (user_id, status);

    CREATE TABLE IF NOT EXISTS project_pod_milestones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pod_id uuid NOT NULL REFERENCES project_pods(id) ON DELETE CASCADE,
      title varchar(255) NOT NULL,
      description text,
      due_date timestamptz,
      is_completed boolean NOT NULL DEFAULT false,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_project_pod_milestones_pod
      ON project_pod_milestones (pod_id, due_date ASC);

    CREATE TABLE IF NOT EXISTS project_pod_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pod_id uuid NOT NULL REFERENCES project_pods(id) ON DELETE CASCADE,
      milestone_id uuid REFERENCES project_pod_milestones(id) ON DELETE SET NULL,
      title varchar(255) NOT NULL,
      description text,
      assigned_to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      priority varchar(16) NOT NULL DEFAULT 'medium',
      status varchar(32) NOT NULL DEFAULT 'todo',
      due_date timestamptz,
      notes text,
      link_url varchar(1024),
      is_blocked boolean NOT NULL DEFAULT false,
      blocker_reason text,
      personal_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
      created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_project_pod_tasks_pod_status
      ON project_pod_tasks (pod_id, status);

    CREATE TABLE IF NOT EXISTS project_pod_activities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pod_id uuid NOT NULL REFERENCES project_pods(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action varchar(64) NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_project_pod_activities_pod
      ON project_pod_activities (pod_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS unblock_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title varchar(255) NOT NULL,
      description text NOT NULL,
      category varchar(64) NOT NULL DEFAULT 'technical',
      status varchar(32) NOT NULL DEFAULT 'open',
      scope_type varchar(32) NOT NULL,
      scope_id uuid NOT NULL,
      pod_task_id uuid REFERENCES project_pod_tasks(id) ON DELETE SET NULL,
      circle_commitment_id uuid REFERENCES focus_circle_commitments(id) ON DELETE SET NULL,
      accepted_helper_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      room_id uuid REFERENCES focus_rooms(id) ON DELETE SET NULL,
      outcome_notes text,
      expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_unblock_requests_scope
      ON unblock_requests (scope_type, scope_id, status);

    CREATE INDEX IF NOT EXISTS idx_unblock_requests_user
      ON unblock_requests (requester_user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS unblock_offers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id uuid NOT NULL REFERENCES unblock_requests(id) ON DELETE CASCADE,
      helper_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message text NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(request_id, helper_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_unblock_offers_request
      ON unblock_offers (request_id, created_at ASC);

    -- Safe forward-only additions
    ALTER TABLE focus_rooms ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE focus_room_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    ALTER TABLE focus_circle_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

    CREATE INDEX IF NOT EXISTS idx_focus_room_members_presence
      ON focus_room_members (room_id, presence_status);

    CREATE INDEX IF NOT EXISTS idx_focus_room_members_active_session
      ON focus_room_members (active_session_id)
      WHERE active_session_id IS NOT NULL;

    -- Clean up any automated test/dummy records so only real user information exists
    DELETE FROM focus_rooms WHERE title LIKE 'QA %' OR title LIKE 'Autonomous QA %';
    DELETE FROM focus_circles WHERE name LIKE 'QA %' OR name LIKE 'Autonomous QA %';
    DELETE FROM project_pods WHERE name LIKE 'QA %' OR name LIKE 'Autonomous QA %';
    DELETE FROM unblock_requests WHERE title LIKE 'Need review on deployment pipeline %';
    DELETE FROM users WHERE email LIKE 'qa_%@focusflow.test';
  `);

  applied = true;
  console.log("✅ Smart Focus & Production migrations ensured (goals, tasks, calendar_events, achievements, plans, notifications, focus intelligence, collaboration suite)");
}

module.exports = { runMigrations };
