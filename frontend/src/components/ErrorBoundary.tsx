/**
 * @fileoverview Global React error boundary.
 * @description Catches JavaScript errors in the child tree so the app never renders a blank page.
 * @module components/ErrorBoundary
 *
 * Usage: wrap React.lazy Suspense boundaries.
 *   <ErrorBoundary>
 *     <Suspense fallback={<Loading />}>
 *       <LazyComponent />
 *     </Suspense>
 *   </ErrorBoundary>
 *
 * Covers:
 *   - render errors
 *   - React.lazy chunk load failures (via window.onerror / unhandledrejection)
 *   - manual recovery
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Result, Button, Space, Typography } from 'antd';

const { Text, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  /** Optional custom fallback; defaults to the built-in UI. */
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
      // Custom fallback wins when supplied.
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'Unknown error';
      const isChunkError = errorMessage.includes('Loading chunk') ||
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Importing a module script failed');
      const isDev = import.meta.env?.DEV;

      // A stale chunk resolves with a reload, so offer that first.
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
              title="This page failed to load"
              subTitle="Some assets could not be loaded. This is usually a network hiccup or a deploy in progress; reloading fixes it."
              extra={[
                <Button key="reload" type="primary" onClick={this.handleReload}>
                  Reload page
                </Button>,
                <Button key="home" onClick={this.handleGoHome}>
                  Back to dashboard
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
            title="Something went wrong"
            subTitle={`Error: ${errorMessage}`}
            extra={[
              <Button key="retry" onClick={this.handleReset}>
                Try again
              </Button>,
              <Button key="home" onClick={this.handleGoHome}>
                Back to dashboard
              </Button>,
              <Button key="reload" type="primary" onClick={this.handleReload}>
                Reload page
              </Button>,
            ]}
          >
            {/* Error details are development-only. */}
            {isDev && this.state.errorInfo && (
              <Space direction="vertical" style={{ width: '100%', textAlign: 'left' }}>
                <Paragraph>
                  <Text
                    strong
                    style={{ fontSize: 16 }}
                  >
                    Component stack:
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
