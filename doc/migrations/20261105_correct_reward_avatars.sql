START TRANSACTION;

-- Preserve the current avatar if the student already has one equipped.
UPDATE user_inventory i
JOIN store_item candidate ON candidate.id = i.store_item_id
JOIN user_inventory equipped ON equipped.user_id = i.user_id AND equipped.is_equipped = TRUE
JOIN store_item avatar ON avatar.id = equipped.store_item_id AND avatar.item_type = 'AVATAR'
SET i.is_equipped = FALSE
WHERE i.is_equipped = TRUE
  AND candidate.item_type = 'THEME'
  AND candidate.name IN ('Thỏ Sakura', 'Gấu trúc đỏ tinh nghịch', 'Pháp sư tinh nghịch');

UPDATE store_item
SET item_type = 'AVATAR'
WHERE item_type = 'THEME'
  AND name IN ('Thỏ Sakura', 'Gấu trúc đỏ tinh nghịch', 'Pháp sư tinh nghịch');

COMMIT;
