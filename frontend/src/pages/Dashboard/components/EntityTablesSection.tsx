/**
 * @fileoverview Entity Tables Section 组件
 * @description 显示实体数据表格的标签页区域
 * @module pages/Dashboard/components/EntityTablesSection
 */

import React, { useState, useMemo } from 'react';
import { 
  Target, GitBranch, FileText, Gift, Globe, Network, 
  MapPin, Map, Building, Wifi, Smartphone, Monitor, 
  Layout, Radio, Clock, Calendar, Link, Globe2, Search, Tag
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ENTITY_CONFIGS } from '../config';

export interface EntityTablesSectionProps {
  entityData: Record<string, any[]>;
  selectedEntities: string[];
  loading?: boolean;
  className?: string;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Target, GitBranch, FileText, Gift, Globe, Network,
  MapPin, Map, Building, Wifi, Smartphone, Monitor,
  Layout, Radio, Clock, Calendar, Link, Globe2, Search, Tag,
};

const EntityTable = ({ 
  data, 
  config 
}: { 
  data: any[]; 
  config: typeof ENTITY_CONFIGS[string];
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <p className="text-text-secondary">No data available</p>
      </div>
    );
  }

  return (
    <div className="entity-table-wrapper">
      <table className="entity-table">
        <thead>
          <tr>
            {config.columns.map(col => (
              <th 
                key={col.key} 
                style={{ width: col.width, textAlign: col.align || 'left' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, index) => (
            <tr key={row.id || index}>
              {config.columns.map(col => (
                <td 
                  key={col.key}
                  style={{ textAlign: col.align || 'left' }}
                >
                  {formatCellValue(row[col.key], col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const formatCellValue = (value: any, key: string): string => {
  if (value === null || value === undefined) return '-';
  
  if (key.includes('cost') || key.includes('revenue') || key.includes('profit')) {
    const num = parseFloat(value);
    return isNaN(num) ? '-' : `$${num.toFixed(2)}`;
  }
  
  if (key === 'roi') {
    const num = parseFloat(value);
    return isNaN(num) ? '-' : `${num.toFixed(1)}%`;
  }
  
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  
  return String(value);
};

export const EntityTablesSection: React.FC<EntityTablesSectionProps> = ({
  entityData,
  selectedEntities,
  loading = false,
  className,
}) => {
  const [activeTab, setActiveTab] = useState(selectedEntities[0] || 'campaigns');

  const availableEntities = useMemo(() => {
    return selectedEntities.filter(key => ENTITY_CONFIGS[key]);
  }, [selectedEntities]);

  const activeConfig = ENTITY_CONFIGS[activeTab];
  const IconComponent = activeConfig ? ICON_MAP[activeConfig.icon] : Target;

  if (loading) {
    return (
      <div className={cn("entity-section", className)}>
        <div className="animate-pulse">
          <div className="h-10 bg-surface-variant rounded mb-4" />
          <div className="h-48 bg-surface-variant rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("entity-section", className)}>
      <div className="entity-tabs">
        {availableEntities.map(key => {
          const config = ENTITY_CONFIGS[key];
          if (!config) return null;
          
          const TabIcon = ICON_MAP[config.icon];
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "entity-tab",
                activeTab === key && "entity-tab-active"
              )}
            >
              {TabIcon && <TabIcon size={16} />}
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      <div className="entity-content">
        {activeConfig && (
          <EntityTable 
            data={entityData[activeTab] || []} 
            config={activeConfig}
          />
        )}
      </div>
    </div>
  );
};

export default EntityTablesSection;
