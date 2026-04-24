-- 漏斗步骤定义表
CREATE TABLE IF NOT EXISTS funnel_steps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT NOT NULL,  -- JSON: [{name, eventType, conditions, order}]
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 漏斗分析结果缓存
CREATE TABLE IF NOT EXISTS funnel_results (
  id TEXT PRIMARY KEY,
  funnelId TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  result TEXT NOT NULL,  -- JSON
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  FOREIGN KEY (funnelId) REFERENCES funnel_steps(id) ON DELETE CASCADE
);

CREATE INDEX idx_funnel_results_funnel ON funnel_results(funnelId);
CREATE INDEX idx_funnel_results_expires ON funnel_results(expiresAt);
