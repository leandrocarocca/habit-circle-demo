-- V002: Checkbox definitions table
-- Description: Create flexible checkbox configuration system for V2

-- Checkbox definitions table
CREATE TABLE IF NOT EXISTS checkbox_definitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  label TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly')),
  weekly_threshold INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT weekly_threshold_check CHECK (
    (type = 'weekly' AND weekly_threshold IS NOT NULL AND weekly_threshold > 0) OR
    (type = 'daily' AND weekly_threshold IS NULL)
  )
);

-- Create index for active checkboxes ordered by display_order
CREATE INDEX IF NOT EXISTS idx_checkbox_definitions_active_order
  ON checkbox_definitions(is_active, display_order)
  WHERE is_active = TRUE;

-- Insert default checkbox definitions
INSERT INTO checkbox_definitions (name, label, points, type, weekly_threshold, display_order) VALUES
  ('logged_food', 'I have logged my food today', 1, 'daily', NULL, 1),
  ('within_calorie_limit', 'I have not gone over my calorie-limit', 1, 'daily', NULL, 2),
  ('protein_goal_met', 'I have reached my goal of 100 grams of protein', 1, 'daily', NULL, 3),
  ('no_cheat_foods', 'I have not cheated today (eaten candy or junk-food)', 1, 'daily', NULL, 4),
  ('gym_session', 'I went to the gym for at least 45 minutes', 3, 'weekly', 3, 5)
ON CONFLICT (name) DO NOTHING;
