/**
 * @fileoverview React 全局错误边界
 * @description 捕获子组件树中的 JavaScript 错误，防止白屏
 * @module components/ErrorBoundary
 *
 * 用法: 在 React.lazy 的 Suspense 旁边使用
 *   <ErrorBoundary>
 *     <Suspense fallback={<Loading />}>
 *       <LazyComponent />
 *     </Suspense>
 *   </ErrorBoundary>
 *
 * 支持:
 *   - 渲染错误捕获
 *   - React.lazy chunk 加载失败捕获（通过 window.onerror / unhandledrejection）
 *   - 自动恢复机制
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Result, Button, Space, Typography } from 'antd';

const { Text, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  /** 自定义 fallback，不传则使用默认 UI */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 使用自定义 fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || '未知错误';
      const isChunkError = errorMessage.includes('Loading chunk') ||
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Importing a module script failed');
      const isDev = import.meta.env?.DEV;

      // chunk 加载失败提示刷新即可恢复
      if (isChunkError) {
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '24px',
            backgroundColor: 'var(--color-canvas-inset, #fafafa)',
          }}>
            <Result
              status="warning"
              title="页面加载失败"
              subTitle="页面资源未能正确加载，可能是网络波动或版本更新导致。请刷新页面重试。"
              extra={[
                <Button key="reload" type="primary" onClick={this.handleReload}>
                  刷新页面
                </Button>,
                <Button key="home" onClick={this.handleGoHome}>
                  返回首页
                </Button>,
              ]}
            />
          </div>
        );
      }

      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '24px',
          backgroundColor: 'var(--color-canvas-inset, #fafafa)',
        }}>
          <Result
            status="error"
            title="页面出错了"
            subTitle={`错误信息：${errorMessage}`}
            extra={[
              <Button key="retry" onClick={this.handleReset}>
                重试
              </Button>,
              <Button key="home" onClick={this.handleGoHome}>
                返回首页
              </Button>,
              <Button key="reload" type="primary" onClick={this.handleReload}>
                刷新页面
              </Button>,
            ]}
          >
            {/* 仅在开发环境显示错误详情 */}
            {isDev && this.state.errorInfo && (
              <Space direction="vertical" style={{ width: '100%', textAlign: 'left' }}>
                <Paragraph>
                  <Text
                    strong
                    style={{ fontSize: 16 }}
                  >
                    错误堆栈:
                  </Text>
                </Paragraph>
                <pre style={{
                  fontSize: 12,
                  maxHeight: 300,
                  overflow: 'auto',
                  backgroundColor: '#fafafa',
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </Space>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}
