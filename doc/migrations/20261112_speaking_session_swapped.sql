-- Lets a learner play the other side of a speaking scenario.
-- swapped = 1: the learner speaks the AI lines (ai_role) and the AI speaks the STUDENT lines.
ALTER TABLE speaking_session
  ADD COLUMN swapped TINYINT(1) NOT NULL DEFAULT 0 AFTER scenario_id;
