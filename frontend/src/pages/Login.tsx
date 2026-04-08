import React, { useState } from 'react';
import { Button, Checkbox, Form, Input, message, Card, Divider, Typography, Alert } from 'antd';
// 按需引入 Ant Design Icons，减少打包体积
import GoogleOutlined from '@ant-design/icons/lib/icons/GoogleOutlined';
import LockOutlined from '@ant-design/icons/lib/icons/LockOutlined';
import UserOutlined from '@ant-design/icons/lib/icons/UserOutlined';
import './Login.css';

const { Title, Text, Link } = Typography;

// API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * 检测当前是否为开发环境
 * @returns boolean
 */
function isDevelopmentEnvironment(): boolean {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '5173' ||
    window.location.port === '3000'
  );
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);

  /**
   * 处理登录表单提交
   * @param values - 表单值（username, password）
   */
  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);

    try {
      // 调用真实的登录 API
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 登录失败
        throw new Error(data.error || data.message || '登录失败');
      }

      // ✅ 登录成功 - 存储真实的 JWT Token
      const { token, user } = data.data;

      if (!token) {
        throw new Error('服务器未返回有效的认证令牌');
      }

      // 存储 Token 到 localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      message.success('登录成功');

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        window.location.assign('/dashboard');
      }, 500);

    } catch (error: any) {
      console.error('[Login] 登录失败:', error);

      // 显示错误信息
      const errorMessage = error.message || '登录失败，请检查用户名和密码';
      message.error(errorMessage);
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

        {/* 开发环境警告 */}
        {isDevelopmentEnvironment() && (
          <Alert
            message="开发模式"
            description="您当前处于开发环境。生产环境将强制要求有效凭据。"
            type="warning"
            showIcon
            className="login-alert"
            style={{ marginBottom: 16 }}
          />
        )}

        <Divider />

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名或邮箱' }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="用户名或邮箱"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
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
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              size="large"
              loading={loading}
              block
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        <Divider>或</Divider>

        <div className="login-social">
          <Button
            type="default"
            icon={<GoogleOutlined />}
            className="social-button"
            size="large"
            block
            disabled
          >
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
