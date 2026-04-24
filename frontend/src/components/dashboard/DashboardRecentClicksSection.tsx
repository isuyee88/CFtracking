import React, { useMemo } from 'react';
import { BrowserIcon, OSIcon } from '../BrandIcon';
import { VirtualTableEnhanced } from '../VirtualTableEnhanced';

interface RecentClicksColumnCatalogItem {
  key: string;
  label: string;
  width?: string;
}

interface DashboardRecentClicksSectionProps {
  columnKeys: string[];
  columnCatalog: RecentClicksColumnCatalogItem[];
  recentClicks: any[];
  getSorter: (key: string) => ((a: any, b: any) => number) | undefined;
}

export function DashboardRecentClicksSection({
  columnKeys,
  columnCatalog,
  recentClicks,
  getSorter,
}: DashboardRecentClicksSectionProps) {
  const columns = useMemo(
    () =>
      columnKeys.map((key) => {
        const col = columnCatalog.find((item) => item.key === key);
        const sorter = getSorter(key);

        return {
          key,
          label: col?.label || key,
          width: col?.width,
          align: 'left' as const,
          sorter,
          showSorter: !!sorter,
          render: (value: any, row: any) => {
            if (key === 'datetime') {
              return <span className="text-medium-contrast">{value ? new Date(value).toLocaleString() : '-'}</span>;
            }

            if (key === 'destination' || key === 'referrer') {
              return (
                <span
                  className="text-high-contrast hover:text-secondary transition-colors truncate max-w-[150px] block cursor-pointer link-primary"
                  title={value}
                >
                  {value || '-'}
                </span>
              );
            }

            if (key === 'user_agent') {
              return (
                <span className="text-medium-contrast truncate max-w-[200px] block" title={value}>
                  {value || '-'}
                </span>
              );
            }

            if (['bot', 'proxy', 'unique_stream', 'unique_campaign'].includes(key)) {
              const isYes = value === 'Yes';
              return (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    isYes
                      ? key === 'bot'
                        ? 'bg-danger-fg/10 text-danger-fg'
                        : 'bg-success-fg/10 text-success-fg'
                      : 'bg-surface-container text-fg-muted'
                  }`}
                >
                  {value || 'No'}
                </span>
              );
            }

            if (key === 'cost') {
              return <span className="text-medium-contrast font-medium">{value || '-'}</span>;
            }

            if (key === 'os_icon') {
              const osValue = row.os || row.os_icon || '';
              return <OSIcon name={osValue} size="sm" />;
            }

            if (key === 'browser_icon') {
              const browserValue = row.browser || row.browser_icon || '';
              return <BrowserIcon name={browserValue} size="sm" />;
            }

            return <span className="text-medium-contrast">{value || '-'}</span>;
          },
        };
      }),
    [columnCatalog, columnKeys, getSorter]
  );

  return (
    <VirtualTableEnhanced
      tableId="dashboard-recent-clicks"
      columns={columns}
      data={recentClicks}
      rowHeight={48}
      height={400}
      overscan={5}
      emptyMessage="No recent clicks found"
    />
  );
}

export default DashboardRecentClicksSection;
