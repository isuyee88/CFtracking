-- The provider, gateway, and fallback columns are part of the canonical
-- ai_optimization_decisions definition in migration 065. Keep this migration
-- as an explicit no-op so fresh D1 databases do not add the same columns twice.
SELECT 1;
