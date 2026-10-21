import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Divider, Form, Input, message, Typography } from 'antd';
import { GoogleOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import './Login.css';

const { Title, Text, Link } = Typography;

function redirectTarget(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const requested = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
  if (!requested.startsWith('/') || requested.startsWith('//') || requested.startsWith('/login')) {
    return '/dashboard';
  }
  return requested;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const target = useMemo(redirectTarget, []);

  useEffect(() => {
    const token = window.localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') || ''));
      if (!payload.exp || payload.exp > Date.now() / 1000) {
        window.location.replace(target);
        return;
      }
    } catch {
      // Token is unreadable: fall through and clear it so the form can be used again.
    }
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
  }, [target]);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username, password: values.password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.message || 'Sign-in failed');
      }
      const token = payload?.data?.token;
      if (!token) throw new Error('The server did not return a session token');
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('user', JSON.stringify(payload.data.user || {}));
      message.success('Signed in');
      window.location.assign(target);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Sign-in failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <Title level={2}>Sign in to CFTracking</Title>
          <Text type="secondary">Manage your campaigns and tracking data</Text>
        </div>

        <Divider />

        <Form name="login" initialValues={{ remember: true }} onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: 'Enter your username or email' }]}>
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="Username or email"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
            <Input
              prefix={<LockOutlined className="site-form-item-icon" />}
              type="password"
              placeholder="Password"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>
            <Link href="#" className="login-form-forgot">
              Forgot password?
            </Link>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="login-form-button" size="large" loading={loading} block>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Form.Item>
        </Form>

        <Divider>or</Divider>

        <div className="login-social">
          <Button type="default" icon={<GoogleOutlined />} className="social-button" size="large" block disabled>
            Continue with Google (coming soon)
          </Button>
        </div>

        <div className="login-footer">
          <Text>No account yet? <Link href="#">Request access</Link></Text>
        </div>

        <Alert
          message="Security notice"
          description="On a shared computer? Use a private window and sign out when you are done."
          type="info"
          showIcon
          className="login-alert"
        />
      </Card>

      <div className="login-footer-links">
        <Link href="#">Privacy</Link>
        <Link href="#">Terms</Link>
        <Link href="#">Help center</Link>
      </div>
    </div>
  );
};

export default Login;
