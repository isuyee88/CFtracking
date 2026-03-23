/**
 * @fileoverview URL预览组件
 * @description 预览和复制追踪链接
 * @module components/UrlPreview
 *
 * 输入: baseUrl, params
 * 输出: 带样式预览和复制按钮
 * 逻辑交互: 被 CampaignForm 调用
 */

import React, { useState, useCallback } from 'react';
import { Copy, Check, Link, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface UrlParam {
  key: string;
  value: string;
  description?: string;
}

export interface UrlPreviewProps {
  baseUrl: string;
  params?: UrlParam[];
  className?: string;
  showParams?: boolean;
  onCopy?: (url: string) => void;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export const UrlPreview: React.FC<UrlPreviewProps> = ({
  baseUrl,
  params = [],
  className,
  showParams = true,
  onCopy,
  onSuccess,
  onError,
}) => {
  const [copied, setCopied] = useState(false);

  const fullUrl = buildFullUrl(baseUrl, params);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      onCopy?.(fullUrl);
      onSuccess?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Copy failed'));
    }
  }, [fullUrl, onCopy, onSuccess, onError]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
          <Link size={16} className="text-primary" />
          <span>Tracking URL</span>
        </div>
        {fullUrl && (
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <ExternalLink size={12} />
            打开
          </a>
        )}
      </div>

      <div className="relative">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 font-mono text-sm break-all min-h-[48px]">
          {baseUrl ? (
            <>
              <span className="text-primary">{baseUrl}</span>
              {params.length > 0 && showParams && (
                <span className="text-on-surface-variant">
                  {params.map((p, i) => (
                    <span key={p.key}>
                      <span className="text-secondary">?</span>
                      <span className="text-accent">{p.key}</span>
                      <span className="text-success">=</span>
                      <span className="text-warning">{encodeURIComponent(p.value) || `{${p.key}}`}</span>
                      {i < params.length - 1 && <span className="text-secondary">&</span>}
                    </span>
                  ))}
                </span>
              )}
            </>
          ) : (
            <span className="text-on-surface-variant/50">配置Campaign后生成追踪URL</span>
          )}
        </div>

        <button
          onClick={handleCopy}
          disabled={!baseUrl}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all',
            copied
              ? 'bg-success-fg/10 text-success-fg'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant',
            !baseUrl && 'opacity-50 cursor-not-allowed'
          )}
          title={copied ? '已复制' : '复制URL'}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      {params.length > 0 && showParams && (
        <div className="text-xs text-on-surface-variant space-y-1">
          <div className="font-medium text-on-surface">可用参数:</div>
          <div className="flex flex-wrap gap-1">
            {params.map((p) => (
              <span
                key={p.key}
                className="inline-flex items-center px-1.5 py-0.5 bg-surface-container rounded text-on-surface-variant"
                title={p.description}
              >
                <span className="text-secondary">{'{'}</span>
                <span className="text-accent">{p.key}</span>
                <span className="text-secondary">{'}'}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function buildFullUrl(baseUrl: string, params: UrlParam[]): string {
  if (!baseUrl) return '';

  const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);

  params.forEach((p) => {
    if (p.key && p.value) {
      url.searchParams.set(p.key, p.value);
    }
  });

  return url.toString();
}

export default UrlPreview;
