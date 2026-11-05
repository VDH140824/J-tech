-- Run once on an existing database before using exclusive IT material rewards.
ALTER TABLE store_item MODIFY item_type ENUM('BADGE','AVATAR_FRAME','THEME','AVATAR','MATERIAL') NOT NULL;
ALTER TABLE store_item ADD COLUMN material_url VARCHAR(500) NULL;
ALTER TABLE user_inventory ADD COLUMN usable_until DATETIME NULL;
-- Existing duplicate ownership must be resolved deliberately before adding this constraint.
ALTER TABLE user_inventory ADD UNIQUE KEY uq_inventory_student_item(user_id,store_item_id);
