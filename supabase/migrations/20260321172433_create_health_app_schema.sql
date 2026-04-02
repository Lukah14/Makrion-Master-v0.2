/*
  # Health App Database Schema

  1. New Tables
    - `profiles` - User profile data (name, avatar, goals)
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `avatar_url` (text)
      - `calorie_goal` (integer, default 2000)
      - `protein_goal` (integer, default 150)
      - `carbs_goal` (integer, default 250)
      - `fat_goal` (integer, default 70)
      - `water_goal` (numeric, default 2.5)
      - `steps_goal` (integer, default 10000)
      - `weight_goal` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `daily_logs` - Daily calorie/macro summaries per user per date
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `log_date` (date)
      - `calories_consumed` (integer, default 0)
      - `calories_burned` (integer, default 0)
      - `protein` (numeric, default 0)
      - `carbs` (numeric, default 0)
      - `fat` (numeric, default 0)
      - `water_ml` (integer, default 0)
      - `steps` (integer, default 0)
      - `active_minutes` (integer, default 0)

    - `food_entries` - Individual food log entries
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `log_date` (date)
      - `meal_type` (text: breakfast/lunch/dinner/snack)
      - `food_name` (text)
      - `amount` (text)
      - `calories` (integer)
      - `protein` (numeric)
      - `carbs` (numeric)
      - `fat` (numeric)
      - `is_planned` (boolean, default false)
      - `logged_at` (timestamptz)

    - `habits` - User habit definitions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `emoji` (text)
      - `category` (text)
      - `type` (text: yesno/numeric/timer)
      - `target` (numeric)
      - `unit` (text)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)

    - `habit_logs` - Daily habit completion logs
      - `id` (uuid, primary key)
      - `habit_id` (uuid, references habits)
      - `user_id` (uuid, references profiles)
      - `log_date` (date)
      - `completed` (boolean, default false)
      - `value` (numeric, default 0)

    - `weight_entries` - Weight tracking entries
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `log_date` (date)
      - `weight` (numeric)
      - `created_at` (timestamptz)

    - `activities` - Logged workout/activity entries
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `log_date` (date)
      - `name` (text)
      - `duration_minutes` (integer)
      - `calories_burned` (integer)
      - `activity_type` (text)
      - `logged_at` (timestamptz)

    - `memorable_moments` - User journal/moment entries
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `log_date` (date)
      - `text` (text)
      - `mood` (text)
      - `moment_type` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users to manage their own data only
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  avatar_url text,
  calorie_goal integer NOT NULL DEFAULT 2000,
  protein_goal integer NOT NULL DEFAULT 150,
  carbs_goal integer NOT NULL DEFAULT 250,
  fat_goal integer NOT NULL DEFAULT 70,
  water_goal numeric NOT NULL DEFAULT 2.5,
  steps_goal integer NOT NULL DEFAULT 10000,
  weight_goal numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


CREATE TABLE IF NOT EXISTS daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  calories_consumed integer NOT NULL DEFAULT 0,
  calories_burned integer NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  water_ml integer NOT NULL DEFAULT 0,
  steps integer NOT NULL DEFAULT 0,
  active_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily logs"
  ON daily_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs"
  ON daily_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily logs"
  ON daily_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily logs"
  ON daily_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS food_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL DEFAULT 'snack',
  food_name text NOT NULL,
  amount text NOT NULL DEFAULT '',
  calories integer NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  is_planned boolean NOT NULL DEFAULT false,
  logged_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food entries"
  ON food_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food entries"
  ON food_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food entries"
  ON food_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own food entries"
  ON food_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  type text NOT NULL DEFAULT 'yesno',
  target numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
  ON habits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean NOT NULL DEFAULT false,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, user_id, log_date)
);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit logs"
  ON habit_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habit logs"
  ON habit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habit logs"
  ON habit_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own habit logs"
  ON habit_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  weight numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weight entries"
  ON weight_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight entries"
  ON weight_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight entries"
  ON weight_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries"
  ON weight_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 0,
  calories_burned integer NOT NULL DEFAULT 0,
  activity_type text NOT NULL DEFAULT 'other',
  logged_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
  ON activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS memorable_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  text text NOT NULL DEFAULT '',
  mood text NOT NULL DEFAULT '',
  moment_type text NOT NULL DEFAULT 'note',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE memorable_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own moments"
  ON memorable_moments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own moments"
  ON memorable_moments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moments"
  ON memorable_moments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own moments"
  ON memorable_moments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_activities_user_date ON activities(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_memorable_moments_user_date ON memorable_moments(user_id, log_date);
