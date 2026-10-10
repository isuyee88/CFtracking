// Analytics and Monitoring Middleware
// 分析和监控中间件

export interface AnalyticsEvent {
  type: 'campaign' | 'flow' | 'offer' | 'bulk' | 'system';
  action: string;
  metadata?: Record<string, any>;
  userId?: string;
  timestamp?: string;
}

export function trackEvent(event: AnalyticsEvent) {
  const enrichedEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  // 控制台日志（开发环境）
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics]', enrichedEvent);
  }

  // 可以扩展到其他监控服务
  // 例如: Cloudflare Analytics, Google Analytics, Mixpanel
  
  return enrichedEvent;
}

export function captureError(error: Error, context?: Record<string, any>) {
  const errorEvent = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('[Error]', errorEvent);

  // 发送到错误追踪服务
  // 例如: Sentry, Rollbar, Bugsnag
  
  return errorEvent;
}

export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    
    // 性能阈值告警
    if (duration > 1000) {
      console.warn(`[Performance] ${name} is slow: ${duration.toFixed(2)}ms`);
      trackEvent({
        type: 'system',
        action: 'performance_warning',
        metadata: { operation: name, duration },
      });
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    captureError(error as Error, { operation: name, duration });
    throw error;
  }
}

// 使用示例
export function withAnalytics<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return measurePerformance(operation, async () => {
    const result = await fn();
    trackEvent({
      type: 'system',
      action: operation,
      metadata: { success: true },
    });
    return result;
  });
}
