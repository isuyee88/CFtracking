-- 067: secret_store — 平台凭据统一存储（批2 §4.5）
-- 为什么 D1 而非 Worker secret：凭据数量随平台增长且需后台管理/轮换/到期跟踪，
-- Worker secret 只适合少量静态键；明文落库前 AES-256-GCM 加密（主密钥 CRED_MASTER_KEY 走 wrangler secret）。
CREATE TABLE IF NOT EXISTS secret_store (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,                 -- monetizer | partnerboost | propellerads | maxconv | postback | other
    kind TEXT NOT NULL DEFAULT 'api',       -- api | postback | shared_secret
    label TEXT NOT NULL DEFAULT '',         -- 人类可读描述（不含敏感值）
    cipher TEXT NOT NULL,                   -- base64(iv[12B] + ciphertext+tag) AES-256-GCM
    masked TEXT NOT NULL,                   -- 前4后4掩码（admin 展示用，永不存/返明文）
    expires_at TEXT,                        -- ISO 8601 日期，可空（无到期则 NULL）
    status TEXT NOT NULL DEFAULT 'active',  -- active | archived（轮换旧值归档，可回滚审计）
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 每平台仅一条 active：唯一部分索引在写入层兜底防双活
CREATE UNIQUE INDEX IF NOT EXISTS idx_secret_store_active
    ON secret_store(platform) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_secret_store_platform_status
    ON secret_store(platform, status);
