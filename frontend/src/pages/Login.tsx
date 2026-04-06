import React, { useState } from 'react';
import { Button, Checkbox, Form, Input, message, Card, Divider, Typography, Alert } from 'antd';
import { GoogleOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import './Login.css';

const { Title, Text, Link } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 模拟登录请求
      await new Promise(resolve => setTimeout(resolve, 1000));
      // 登录成功后存储token
      localStorage.setItem('token', 'mock-token');
      message.success('登录成功');
      window.location.assign('/dashboard');
    } catch (error) {
      message.error('登录失败，请检查用户名和密码');
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
            >
              登录
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
          >
            使用 Google 账号登录
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
