-- 更新 flows 表的 id 为 displayId
UPDATE flows SET id = displayId WHERE id != displayId;
