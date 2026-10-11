-- Local development seed data for the current D1 schema.
-- This fixture is intentionally local-only and uses the canonical camelCase columns.

INSERT INTO trafficSources (id, name, type, status, parameters, createdAt, updatedAt)
VALUES
  ('test-propellerads', 'PropellerAds Test', 'push', 'active', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('test-outbrain', 'Outbrain Test', 'native', 'active', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO campaigns (id, name, alias, domain, trafficSource, status, parameters, createdAt, updatedAt)
VALUES
  ('test-campaign-1', 'Test Campaign 1', 'test-campaign-1', 'https://example.com', 'test-propellerads', 'active', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('test-campaign-2', 'Test Campaign 2', 'test-campaign-2', 'https://example.com', 'test-outbrain', 'paused', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO clicks (id, clickId, campaignId, timestamp, ip, userAgent, visitorId, isUnique, createdAt)
VALUES
  ('click-1', 'click-1', 'test-campaign-1', CURRENT_TIMESTAMP, '1.2.3.4', 'Mozilla/5.0', 'visitor-123', 1, CURRENT_TIMESTAMP),
  ('click-2', 'click-2', 'test-campaign-1', CURRENT_TIMESTAMP, '1.2.3.5', 'Mozilla/5.0', 'visitor-124', 1, CURRENT_TIMESTAMP);

INSERT INTO conversions (id, conversionId, clickId, campaignId, offerId, timestamp, payout, revenue, status, createdAt)
VALUES
  ('conv-1', 'conv-1', 'click-1', 'test-campaign-1', 'test-offer-1', CURRENT_TIMESTAMP, 10.50, 10.50, 'approved', CURRENT_TIMESTAMP);
