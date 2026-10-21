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
      // fall through to clear the unusable token
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
        throw new Error(payload?.error?.message || payload?.message || '登录失败');
      }
      const token = payload?.data?.token;
      if (!token) throw new Error('服务器未返回有效的认证令牌');
      window.localStorage.setItem('token', token);
      window.localStorage.setItem('user', JSON.stringify(payload.data.user || {}));
      message.success('登录成功');
      window.location.assign(target);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <Title level={2}>登录 CFTracking</Title>
          <Text type="secondary">管理您的广告活动和跟踪数据</Text>
        </div>

        <Divider />

        <Form name="login" initialValues={{ remember: true }} onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名或邮箱' }]}>
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="用户名或邮箱"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input
              prefix={<LockOutlined className="site-form-item-icon" />}
              type="password"
              placeholder="密码"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <Link href="#" className="login-form-forgot">
              忘记密码？
            </Link>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="login-form-button" size="large" loading={loading} block>
              {loading ? '登录中…' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        <Divider>或</Divider>

        <div className="login-social">
          <Button type="default" icon={<GoogleOutlined />} className="social-button" size="large" block disabled>
            使用 Google 账号登录（即将推出）
          </Button>
        </div>

        <div className="login-footer">
          <Text>还没有账号？ <Link href="#">立即注册</Link></Text>
        </div>

        <Alert
          message="安全提示"
          description="您用的不是自己的电脑？请使用访客模式无痕登录。"
          type="info"
          showIcon
          className="login-alert"
        />
      </Card>

      <div className="login-footer-links">
        <Link href="#">隐私政策</Link>
        <Link href="#">服务条款</Link>
        <Link href="#">帮助中心</Link>
      </div>
    </div>
  );
};

export default Login;
