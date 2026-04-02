/*
  # Enhance habits and memorable_moments tables

  1. Modified Tables
    - `habits`
      - `description` (text, nullable) - optional habit description
      - `repeat_rule` (text, default 'daily') - frequency: daily, specific_days_week, specific_days_month, specific_days_year, some_days_period, repeat
      - `repeat_days` (jsonb, nullable) - selected days for non-daily rules
      - `start_date` (date, default CURRENT_DATE) - when the habit starts
      - `end_date` (date, nullable) - optional end date
      - `end_date_enabled` (boolean, default false) - whether end date is active
      - `end_date_days` (integer, nullable) - duration in days
      - `reminder_time` (time, nullable) - when to remind
      - `reminder_count` (integer, default 0) - number of reminders set
      - `priority` (text, default 'default') - low, default, high, urgent
      - `color` (text, nullable) - accent color
      - `is_paused` (boolean, default false) - paused state
      - `checklist_items` (jsonb, nullable) - sub-items for checklist type
      - `sort_order` (integer, default 0) - display order
    - `memorable_moments`
      - `mood_rating` (integer, nullable) - 1-10 mood scale
      - `photo_url` (text, nullable) - optional photo reference

  2. Important Notes
    - All new columns are nullable or have defaults to avoid breaking existing data
    - No data is dropped or modified
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'description'
  ) THEN
    ALTER TABLE habits ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'repeat_rule'
  ) THEN
    ALTER TABLE habits ADD COLUMN repeat_rule text DEFAULT 'daily';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'repeat_days'
  ) THEN
    ALTER TABLE habits ADD COLUMN repeat_days jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE habits ADD COLUMN start_date date DEFAULT CURRENT_DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE habits ADD COLUMN end_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'end_date_enabled'
  ) THEN
    ALTER TABLE habits ADD COLUMN end_date_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'end_date_days'
  ) THEN
    ALTER TABLE habits ADD COLUMN end_date_days integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'reminder_time'
  ) THEN
    ALTER TABLE habits ADD COLUMN reminder_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'reminder_count'
  ) THEN
    ALTER TABLE habits ADD COLUMN reminder_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'priority'
  ) THEN
    ALTER TABLE habits ADD COLUMN priority text DEFAULT 'default';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'color'
  ) THEN
    ALTER TABLE habits ADD COLUMN color text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'is_paused'
  ) THEN
    ALTER TABLE habits ADD COLUMN is_paused boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'checklist_items'
  ) THEN
    ALTER TABLE habits ADD COLUMN checklist_items jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE habits ADD COLUMN sort_order integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memorable_moments' AND column_name = 'mood_rating'
  ) THEN
    ALTER TABLE memorable_moments ADD COLUMN mood_rating integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'memorable_moments' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE memorable_moments ADD COLUMN photo_url text;
  END IF;
END $$;
