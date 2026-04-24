import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface MetricItem {
  key: string;
  label: string;
}

interface EntityConfigItem {
  label: string;
  category: string;
}

interface RecentClickColumnItem {
  key: string;
  label: string;
  category: string;
}

interface DashboardPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    metrics: string[];
    entities: string[];
    recentClicksColumns: string[];
  };
  onConfigChange: (newConfig: {
    metrics: string[];
    entities: string[];
    recentClicksColumns: string[];
  }) => void;
  metricsCatalog: MetricItem[];
  entityConfigs: Record<string, EntityConfigItem>;
  recentClicksColumnsCatalog: RecentClickColumnItem[];
}

export function DashboardPreferencesModal({
  isOpen,
  onClose,
  config,
  onConfigChange,
  metricsCatalog,
  entityConfigs,
  recentClicksColumnsCatalog,
}: DashboardPreferencesModalProps) {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!isOpen) {
    return null;
  }

  const toggleMetric = (key: string) => {
    const current = localConfig.metrics || [];
    const newMetrics = current.includes(key)
      ? current.filter((metricKey) => metricKey !== key)
      : [...current, key];
    setLocalConfig({ ...localConfig, metrics: newMetrics });
  };

  const toggleEntity = (key: string) => {
    const current = localConfig.entities || [];
    const newEntities = current.includes(key)
      ? current.filter((entityKey) => entityKey !== key)
      : [...current, key];
    setLocalConfig({ ...localConfig, entities: newEntities });
  };

  const toggleRecentClickColumn = (key: string) => {
    const current = localConfig.recentClicksColumns || [];
    const newColumns = current.includes(key)
      ? current.filter((columnKey) => columnKey !== key)
      : [...current, key];
    setLocalConfig({ ...localConfig, recentClicksColumns: newColumns });
  };

  const handleApply = () => {
    onConfigChange(localConfig);
    onClose();
  };

  const handleRestoreDefault = () => {
    setLocalConfig({
      metrics: [
        'clicks',
        'unique_clicks_campaign',
        'conversions',
        'cost',
        'revenue_confirmed',
        'profit_confirmed',
        'roi_confirmed',
      ],
      entities: ['campaigns', 'landings', 'offers', 'sources'],
      recentClicksColumns: ['event_id', 'datetime', 'campaign', 'os_icon', 'browser_icon', 'ip', 'destination'],
    });
  };

  const entityCategories = [...new Set(Object.values(entityConfigs).map((entity) => entity.category))];
  const recentClickCategories = [...new Set(recentClicksColumnsCatalog.map((column) => column.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface border border-border-default rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h2 className="text-lg font-display font-semibold text-fg-default">Preferences</h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-lg transition-colors">
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] bg-surface">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-fg-muted mb-3 uppercase tracking-wider">Metrics</h3>
            <div className="flex flex-wrap gap-2">
              {(localConfig.metrics || []).map((key) => {
                const metric = metricsCatalog.find((item) => item.key === key);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-accent-muted text-accent-fg text-xs rounded-lg"
                  >
                    {metric?.label || key}
                    <button onClick={() => toggleMetric(key)} className="hover:opacity-70 transition-opacity">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2 relative">
              <select
                aria-label="Add dashboard metric"
                className="w-full p-2 border border-border-default rounded-lg text-sm bg-canvas focus:border-accent-fg focus:outline-none transition-colors"
                onChange={(event) => {
                  if (event.target.value) {
                    toggleMetric(event.target.value);
                    event.target.value = '';
                  }
                }}
                value=""
              >
                <option value="">Add metric...</option>
                {metricsCatalog
                  .filter((metric) => !(localConfig.metrics || []).includes(metric.key))
                  .map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-fg-muted mb-3 uppercase tracking-wider">Top Blocks (Entities)</h3>
            <div className="flex flex-wrap gap-2">
              {(localConfig.entities || []).map((key) => {
                const entity = entityConfigs[key];
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container text-fg-default text-xs rounded-lg border border-border-default"
                  >
                    {entity?.label || key}
                    <button onClick={() => toggleEntity(key)} className="hover:text-fg-muted transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2">
              <select
                aria-label="Add dashboard entity block"
                className="w-full p-2 border border-border-default rounded-lg text-sm bg-canvas focus:border-accent-fg focus:outline-none transition-colors"
                onChange={(event) => {
                  if (event.target.value) {
                    toggleEntity(event.target.value);
                    event.target.value = '';
                  }
                }}
                value=""
              >
                <option value="">Add entity...</option>
                {entityCategories.map((category) => {
                  const entitiesInCategory = Object.entries(entityConfigs).filter(
                    ([key, item]) => item.category === category && !(localConfig.entities || []).includes(key)
                  );

                  if (entitiesInCategory.length === 0) {
                    return null;
                  }

                  return (
                    <optgroup key={category} label={category}>
                      {entitiesInCategory.map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.label}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-fg-muted mb-3 uppercase tracking-wider">Recent Clicks Columns</h3>
            <div className="flex flex-wrap gap-2">
              {(localConfig.recentClicksColumns || []).map((key) => {
                const col = recentClicksColumnsCatalog.find((item) => item.key === key);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container-low text-fg-default text-xs rounded-lg border border-border-default"
                  >
                    {col?.label || key}
                    <button onClick={() => toggleRecentClickColumn(key)} className="hover:text-fg-muted transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2">
              <select
                aria-label="Add recent clicks column"
                className="w-full p-2 border border-border-default rounded-lg text-sm bg-canvas focus:border-accent-fg focus:outline-none transition-colors"
                onChange={(event) => {
                  if (event.target.value) {
                    toggleRecentClickColumn(event.target.value);
                    event.target.value = '';
                  }
                }}
                value=""
              >
                <option value="">Add column...</option>
                {recentClickCategories.map((category) => {
                  const colsInCategory = recentClicksColumnsCatalog.filter(
                    (item) => item.category === category && !(localConfig.recentClicksColumns || []).includes(item.key)
                  );

                  if (colsInCategory.length === 0) {
                    return null;
                  }

                  return (
                    <optgroup key={category} label={category}>
                      {colsInCategory.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border-default bg-surface-container">
          <button
            onClick={handleRestoreDefault}
            className="text-sm text-fg-muted hover:text-fg-default transition-colors"
          >
            Restore to default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-container-high transition-colors text-fg-default"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm bg-fg-default text-canvas rounded-lg hover:opacity-85 transition-opacity"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPreferencesModal;
