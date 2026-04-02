/*
  # Create Habits Schema (safe version)

  ## New Tables

  ### habits
  - Full habit definition with all fields (name, type, category, emoji, schedule, etc.)
  - Links to auth.users via user_id

  ### habit_completions
  - Records each completion event per habit per day
  - Used to calculate streaks, statistics, and calendar views

  ### habit_checklist_items
  - Stores checklist items for checklist-type habits

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
*/

CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'yesno',
  category text NOT NULL DEFAULT 'Health',
  emoji text NOT NULL DEFAULT '✓',
  icon_bg text DEFAULT '#E8F4FD',
  icon_color text DEFAULT '#4A9BD9',
  color text DEFAULT '#4A9BD9',
  description text DEFAULT '',
  repeat_rule text DEFAULT 'daily',
  repeat_days integer[] DEFAULT NULL,
  start_date date DEFAULT CURRENT_DATE,
  end_date date DEFAULT NULL,
  end_date_enabled boolean DEFAULT false,
  end_date_days integer DEFAULT NULL,
  reminder_time text DEFAULT NULL,
  reminder_count integer DEFAULT 0,
  priority text DEFAULT 'default',
  target numeric DEFAULT 1,
  unit text DEFAULT '',
  streak integer DEFAULT 0,
  best_streak integer DEFAULT 0,
  is_paused boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habits' AND policyname = 'Users can view own habits') THEN
    CREATE POLICY "Users can view own habits" ON habits FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habits' AND policyname = 'Users can insert own habits') THEN
    CREATE POLICY "Users can insert own habits" ON habits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habits' AND policyname = 'Users can update own habits') THEN
    CREATE POLICY "Users can update own habits" ON habits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habits' AND policyname = 'Users can delete own habits') THEN
    CREATE POLICY "Users can delete own habits" ON habits FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  note text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);

ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_completions' AND policyname = 'Users can view own completions') THEN
    CREATE POLICY "Users can view own completions" ON habit_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_completions' AND policyname = 'Users can insert own completions') THEN
    CREATE POLICY "Users can insert own completions" ON habit_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_completions' AND policyname = 'Users can update own completions') THEN
    CREATE POLICY "Users can update own completions" ON habit_completions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_completions' AND policyname = 'Users can delete own completions') THEN
    CREATE POLICY "Users can delete own completions" ON habit_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS habit_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  completed boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE habit_checklist_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_checklist_items' AND policyname = 'Users can view own checklist items') THEN
    CREATE POLICY "Users can view own checklist items" ON habit_checklist_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_checklist_items' AND policyname = 'Users can insert own checklist items') THEN
    CREATE POLICY "Users can insert own checklist items" ON habit_checklist_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_checklist_items' AND policyname = 'Users can update own checklist items') THEN
    CREATE POLICY "Users can update own checklist items" ON habit_checklist_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_checklist_items' AND policyname = 'Users can delete own checklist items') THEN
    CREATE POLICY "Users can delete own checklist items" ON habit_checklist_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date ON habit_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_habit_checklist_items_habit_id ON habit_checklist_items(habit_id);
