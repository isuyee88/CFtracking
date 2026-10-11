-- 预设自动化规则（测试数据）

-- 规则 1: 0 转化自动禁用（每 6 小时）
INSERT INTO automation_rules (
  id, name, description, type, trigger_type, trigger_config,
  conditions, actions, status, priority, created_by
) VALUES (
  'rule-zero-conversion',
  '零转化组合自动禁用',
  '当点击数超过 100 但转化为 0 时，自动禁用该流量组合',
  'roi_optimization',
  'cron',
  '{"schedule":"0 */6 * * *"}',
  '{"min_clicks":100,"max_conversions":0,"window_hours":24}',
  '[{"type":"disable_zone","platform":"propellerads"},{"type":"add_blacklist","platform":"propellerads","entity_type":"zone","reason":"zero_conversion"},{"type":"send_notification","channel":"feishu","message":"Zero conversion detected"}]',
  'active',
  100,
  'system'
);

-- 规则 2: 高亏损加入黑名单（每天凌晨）
INSERT INTO automation_rules (
  id, name, description, type, trigger_type, trigger_config,
  conditions, actions, status, priority, created_by
) VALUES (
  'rule-high-loss-blacklist',
  '高亏损组合加入黑名单',
  '当花费超过 $10 且 ROI < -50% 时，加入黑名单',
  'blacklist',
  'cron',
  '{"schedule":"0 0 * * *"}',
  '{"min_spend":10,"max_roi":-0.5,"window_hours":24}',
  '[{"type":"disable_zone","platform":"all"},{"type":"add_blacklist","platform":"all","entity_type":"zone","reason":"high_loss","sync_to_platform":true},{"type":"send_notification","channel":"feishu","message":"High loss detected"}]',
  'active',
  90,
  'system'
);

-- 规则 3: 盈利组合自动扩量（每小时）
INSERT INTO automation_rules (
  id, name, description, type, trigger_type, trigger_config,
  conditions, actions, status, priority, created_by
) VALUES (
  'rule-profitable-scale',
  '盈利组合自动扩量',
  '当转化数 >= 5 且 ROI > 100% 时，自动增加出价和预算',
  'scale_up',
  'cron',
  '{"schedule":"0 * * * *"}',
  '{"min_conversions":5,"min_roi":1.0,"window_hours":24}',
  '[{"type":"increase_bid","platform":"propellerads","percentage":20},{"type":"increase_budget","platform":"propellerads","percentage":50},{"type":"send_notification","channel":"feishu","message":"Profitable target found"}]',
  'active',
  80,
  'system'
);

-- 测试用优化目标数据
INSERT INTO optimization_targets (
  id, platform, zone_id, pubid, subid, device, geo,
  clicks, conversions, spend, revenue, roi, cr, epc,
  status, window_start, window_end
) VALUES (
  'target-test-1',
  'propellerads',
  'zone-123',
  'pub-456',
  'sub-789',
  'mobile',
  'US',
  150,
  0,
  15.50,
  0.0,
  -1.0,
  0.0,
  0.0,
  'active',
  datetime('now', '-24 hours'),
  datetime('now')
);

INSERT INTO optimization_targets (
  id, platform, zone_id, pubid, subid, device, geo,
  clicks, conversions, spend, revenue, roi, cr, epc,
  status, window_start, window_end
) VALUES (
  'target-test-2',
  'propellerads',
  'zone-456',
  'pub-789',
  'sub-012',
  'desktop',
  'UK',
  250,
  8,
  50.00,
  150.00,
  2.0,
  3.2,
  0.60,
  'active',
  datetime('now', '-24 hours'),
  datetime('now')
);
