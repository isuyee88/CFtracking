/**
 * @file 统一页面状态提示：功能不可用 / 数据为空 / 需要用户注意时的说明块。
 * @owner frontend
 * @invariant 只负责解释「为什么没有内容」和「下一步去哪」，不发起任何请求，也不持有状态。
 * @invariant 文案必须说清是「本机保存」还是「服务端保存」，避免用户误以为设置已同步到账号。
 * @see docs/architecture/cftracking-admin-ux-review-2026-10-20.md
 */
import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type PageNoticeTone = 'info' | 'warning';

export interface PageNoticeProps {
  /** info：中性说明；warning：功能缺失或数据不可用，需要用户注意。 */
  tone?: PageNoticeTone;
  title: string;
  description?: ReactNode;
  /** 可选的下一步指引，例如「去 Dashboard 看同样的数字」。 */
  hint?: ReactNode;
  className?: string;
}

/**
 * 渲染一条页面级提示。
 *
 * 无障碍：warning 用 `role="alert"`（进入即播报），info 用 `role="status"`
 * （不打断读屏）；两种情况都带图标和可见标题，不依赖颜色单独表意。
 */
export function PageNotice({ tone = 'info', title, description, hint, className }: PageNoticeProps) {
  const isWarning = tone === 'warning';
  const Icon = isWarning ? AlertTriangle : Info;

  return (
    <div
      role={isWarning ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4',
        isWarning ? 'border-warning/20 bg-warning/10' : 'border-outline-variant/30 bg-surface-container/60',
        className,
      )}
    >
      <Icon size={18} className={cn('mt-0.5 shrink-0', isWarning ? 'text-warning' : 'text-accent-fg')} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg-default">{title}</p>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
      </div>
    </div>
  );
}

export default PageNotice;
