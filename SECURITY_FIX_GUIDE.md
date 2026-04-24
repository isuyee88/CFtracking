# 🔐 安全认证系统配置指南

## 概述

本次修复解决了 3 个 P0-CRITICAL 安全漏洞：
1. ✅ 移除 BYPASS_AUTH 认证绕过
2. ✅ 修复 CORS 配置（白名单模式）
3. ✅ 实现真实登录系统替代 Mock Token

## 必需的环境变量

在部署前，**必须**配置以下环境变量：

### 1. JWT_SECRET（必需）
JWT 签名密钥，用于生成和验证 Token。

```bash
# 生成随机密钥（使用 OpenSSL 或在线工具）
wrangler secret put JWT_SECRET
# 输入: your-super-secret-jwt-key-at-least-32-chars-long
```

### 2. ADMIN_USERNAME（可选）
管理员用户名。默认值：`admin`

```bash
wrangler secret put ADMIN_USERNAME
# 输入: admin
```

### 3. ADMIN_PASSWORD_HASH（生产环境必需）
管理员密码的 SHA-256 哈希值。

#### 生成密码哈希：

**方法 1: 使用 Node.js**
```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
```

**方法 2: 使用在线工具**
- 访问 https://emn178/online-tools/sha256.html
- 输入你的密码，复制生成的哈希值

**方法 3: 使用 Python**
```bash
python -c "import hashlib; print(hashlib.sha256('YOUR_PASSWORD'.encode()).hexdigest())"
```

**示例：**
```bash
# 如果密码是 "MySecurePassword123!"
# 哈希值可能是: a1b2c3d4e5f6...

wrangler secret put ADMIN_PASSWORD_HASH
# 输入: <生成的SHA-256哈希值>
```

## 部署步骤

### 1. 安装依赖并构建前端
```bash
cd frontend
npm install
npm run build
```

### 2. 配置 Secrets
```bash
# 在项目根目录执行
wrangler secret put JWT_SECRET
wrangler secret put ADMIN_USERNAME
wrangler secret put ADMIN_PASSWORD_HASH
```

### 3. 部署到 Cloudflare Workers
```bash
wrangler deploy
```

## 验证修复

### 测试 1: 验证认证强制启用
```bash
# 尝试不带 Token 访问 API
curl -X GET https://cf-tracking.suyee88.workers.dev/api/campaigns

# 预期结果:
# {"success":false,"error":"Unauthorized","code":"UNAUTHORIZED"}
# HTTP Status: 401
```

### 测试 2: 测试登录接口
```bash
# 使用正确的凭据登录
curl -X POST https://cf-tracking.suyee88.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}'

# 预期结果:
# {
#   "success": true,
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIs...",
#     "expiresIn": 86400,
#     "user": { "userId": "admin", "email": "admin" }
#   }
# }
```

### 测试 3: 使用 Token 访问 API
```bash
# 使用上一步获取的 Token
TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X GET https://cf-tracking.suyee88.workers.dev/api/campaigns \
  -H "Authorization: Bearer $TOKEN"

# 预期结果:
# {"success":true,"data":[...]}
# HTTP Status: 200
```

### 测试 4: 验证 CORS 白名单
```bash
# 测试允许的来源
curl -I -X OPTIONS https://cf-tracking.suyee88.workers.dev/api/campaigns \
  -H "Origin: https://cf-tracking.suyee88.workers.dev" \
  -H "Access-Control-Request-Method: GET"

# 预期: Access-Control-Allow-Origin 应该是具体的域名，不是 *
```

## 安全增强建议（未来实施）

### 1. Rate Limiting（限流）
防止暴力破解密码。建议实现：
- 登录接口限制：5次/分钟
- API 接口限制：100次/分钟/IP

### 2. 密码强度验证
在前端和后端添加密码策略：
- 最少 8 个字符
- 包含大小写字母、数字、特殊字符

### 3. 安全响应头
添加以下 HTTP 头：
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### 4. Token 刷新机制
实现 Refresh Token：
- Access Token: 15分钟过期
- Refresh Token: 7天过期
- 自动刷新机制

### 5. 审计日志
记录所有认证相关事件：
- 登录成功/失败
- Token 过期
- 异常访问模式

## 故障排除

### 问题 1: 登录返回 500 错误
**原因**: 未配置 `ADMIN_PASSWORD_HASH` 或 `JWT_SECRET`
**解决**: 运行 `wrangler secret put` 配置这些变量

### 问题 2: Token 验证失败
**原因**: `JWT_SECRET` 不匹配（前后端使用了不同的密钥）
**解决**: 确保所有环境使用相同的 `JWT_SECRET`

### 问题 3: 前端无法调用 API
**原因**: CORS 配置问题或未携带 Token
**解决**:
1. 检查浏览器控制台是否有 CORS 错误
2. 确认 localStorage 中有 token
3. 查看 Network 标签确认请求头包含 Authorization

## 回滚方案

如果出现问题，可以临时恢复 BYPASS_AUTH：

⚠️ **仅用于紧急情况！**

1. 取消注释 `wrangler.toml` 中的 BYPASS_AUTH
2. 取消注释 `src/index.ts` 中的 bypassAuth 逻辑
3. 重新部署

**但强烈建议尽快修复根本问题！**

---

**版本**: 1.0.0
**日期**: 2026-04-07
**作者**: Constitutional Coder (AI)
**状态**: ✅ 已完成并通过测试
