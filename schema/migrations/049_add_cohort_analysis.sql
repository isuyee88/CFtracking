-- 用户首次访问记录
CREATE TABLE IF NOT EXISTS user_first_visits (
  id TEXT PRIMARY KEY,
  visitorId TEXT NOT NULL UNIQUE,
  firstVisitDate TEXT NOT NULL,
  source TEXT,
  campaignId TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX idx_user_first_visits_date ON user_first_visits(firstVisitDate);
CREATE INDEX idx_user_first_visits_visitor ON user_first_visits(visitorId);

-- 队列分析结果缓存
CREATE TABLE IF NOT EXISTS cohort_results (
  id TEXT PRIMARY KEY,
  cohortType TEXT NOT NULL,  -- daily, weekly, monthly
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  result TEXT NOT NULL,  -- JSON
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL
);
