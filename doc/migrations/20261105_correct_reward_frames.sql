-- Reclassify the five circular frames previously listed as badges.
-- Safe to rerun after applying the earlier version that covered four frames.
START TRANSACTION;

-- Keep an already equipped frame if the account has one.
UPDATE user_inventory i
JOIN store_item candidate ON candidate.id = i.store_item_id
JOIN user_inventory equipped ON equipped.user_id = i.user_id AND equipped.is_equipped = TRUE
JOIN store_item frame ON frame.id = equipped.store_item_id AND frame.item_type = 'AVATAR_FRAME'
SET i.is_equipped = FALSE
WHERE candidate.item_type = 'BADGE'
  AND candidate.name IN ('Huy hiệu 03', 'Huy hiệu 04', 'Huy hiệu 07', 'Huy hiệu 08', 'Huy hiệu 09');

UPDATE store_item
SET item_type = 'AVATAR_FRAME',
    name = CONCAT('Khung đại diện ', RIGHT(name, 2))
WHERE item_type = 'BADGE'
  AND name IN ('Huy hiệu 03', 'Huy hiệu 04', 'Huy hiệu 07', 'Huy hiệu 08', 'Huy hiệu 09');

COMMIT;
