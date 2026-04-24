# Cloudflare Workers 用户管理API架构设计文档

**版本**: 1.0.0  
**日期**: 2026-04-08  
**作者**: Architecture-Agent  
**状态**: 设计阶段

---

## 1. 执行摘要

本文档定义了CFTracking项目的用户管理API架构设计，基于现有技术栈和最佳实践，提供完整的用户认证、授权和管理解决方案。

### 1.1 设计目标
- 与现有架构保持一致性
- 支持多用户角色管理
- 安全的认证授权机制
- 可扩展的权限系统

### 1.2 置信度评分
- 技术选型: 0.95 (基于现有成熟模式)
- 安全设计: 0.90 (使用标准Web Crypto API)
- 可扩展性: 0.85 (预留角色扩展接口)

---

## 2. 技术选型分析

### 2.1 存储方案对比

| 方案 | 适用场景 | 本项目选择 | 理由 |
|------|----------|------------|------|
| **D1 (SQLite)** | 关系型数据、复杂查询 | ✅ 选用 | 用户数据需要关联查询、角色管理 |
| **KV** | 简单键值、高频读取 | ❌ 不选用 | 不适合复杂用户关系 |
| **Durable Objects** | 状态保持、实时协作 | ❌ 不选用 | 用户管理无需实时状态 |

### 2.2 密码哈希方案

| 方案 | 安全性 | 性能 | 选择 |
|------|--------|------|------|
| SHA-256 | 低 | 高 | ❌ 仅用于兼容现有 |
| PBKDF2 | 中 | 中 | ✅ 推荐方案 |
| bcrypt/scrypt | 高 | 低 | ❌ Workers不支持原生 |

**决策**: 使用PBKDF2 (Web Crypto API) 替代现有SHA-256

### 2.3 JWT配置

```yaml
algorithm: HS256
secret_source: env.JWT_SECRET
expires_in: 24h
refresh_token: 暂不实现（如需可扩展）
```

---

## 3. 数据库Schema设计

### 3.1 用户表 (users)

```sql
-- Migration: 057_create_users_table.sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- 用户唯一ID (usr_xxx)
  displayId TEXT UNIQUE,                  -- 显示ID (数字短ID)
  email TEXT NOT NULL UNIQUE,             -- 邮箱（登录名）
  username TEXT NOT NULL UNIQUE,          -- 用户名
  passwordHash TEXT NOT NULL,             -- 密码哈希 (PBKDF2)
  passwordSalt TEXT NOT NULL,             -- 密码盐值
  role TEXT NOT NULL DEFAULT 'viewer',    -- 角色: admin|manager|viewer
  status TEXT NOT NULL DEFAULT 'active',  -- 状态: active|inactive|suspended
  lastLoginAt TEXT,                       -- 最后登录时间
  loginAttempts INTEGER DEFAULT 0,        -- 连续失败次数
  lockedUntil TEXT,                       -- 锁定截止时间
  profile TEXT DEFAULT '{}',              -- 扩展资料JSON
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
```

### 3.2 用户会话表 (user_sessions) - 可选

```sql
-- 用于高级会话管理（如需多设备登录控制）
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tokenHash TEXT NOT NULL,      -- Token哈希（用于失效检查）
  deviceInfo TEXT,              -- 设备信息
  ipAddress TEXT,               -- IP地址
  expiresAt TEXT NOT NULL,      -- 过期时间
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(tokenHash);
```

### 3.3 数据字典

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | TEXT | 主键 | usr_{nanoid(12)} |
| displayId | TEXT | 显示ID | 6位数字，自增 |
| email | TEXT | 邮箱 | 唯一，格式验证 |
| username | TEXT | 用户名 | 唯一，3-32字符 |
| passwordHash | TEXT | 密码哈希 | PBKDF2结果 |
| passwordSalt | TEXT | 盐值 | 32字节随机 |
| role | TEXT | 角色 | admin/manager/viewer |
| status | TEXT | 状态 | active/inactive/suspended |

---

## 4. API端点定义

### 4.1 认证端点

```yaml
POST /api/auth/register
  description: 用户注册（仅管理员可创建）
  auth: required (admin)
  body:
    email: string (required)
    username: string (required)
    password: string (required, min 8)
    role: string (optional, default: viewer)
  response: User

POST /api/auth/login
  description: 用户登录（已存在，需扩展）
  auth: none
  body:
    username: string
    password: string
  response:
    token: string
    expiresIn: number
    user: UserInfo

POST /api/auth/logout
  description: 用户登出
  auth: required
  response: { success: true }

POST /api/auth/change-password
  description: 修改密码
  auth: required
  body:
    currentPassword: string
    newPassword: string
  response: { success: true }

POST /api/auth/reset-password
  description: 重置密码（管理员操作）
  auth: required (admin)
  body:
    userId: string
    newPassword: string
  response: { success: true }
```

### 4.2 用户管理端点

```yaml
GET /api/users
  description: 获取用户列表
  auth: required (admin/manager)
  query:
    page: number (default: 1)
    pageSize: number (default: 20, max: 100)
    role: string (optional)
    status: string (optional)
    search: string (optional, 搜索email/username)
  response: PaginatedUsers

GET /api/users/:id
  description: 获取用户详情
  auth: required
  permission: self or admin
  response: User

PUT /api/users/:id
  description: 更新用户信息
  auth: required
  permission: self or admin
  body:
    email: string (optional)
    username: string (optional)
    role: string (admin only)
    status: string (admin only)
    profile: object (optional)
  response: User

DELETE /api/users/:id
  description: 删除用户（软删除）
  auth: required (admin)
  response: { success: true }

PUT /api/users/:id/status
  description: 修改用户状态
  auth: required (admin)
  body:
    status: string (active/inactive/suspended)
  response: User
```

### 4.3 角色权限端点（预留）

```yaml
GET /api/roles
  description: 获取角色列表
  auth: required (admin)

GET /api/permissions
  description: 获取权限列表
  auth: required (admin)
```

---

## 5. 数据模型定义

### 5.1 TypeScript接口

```typescript
// src/types/user.ts

export type UserRole = 'admin' | 'manager' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  displayId: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  displayName?: string;
  avatar?: string;
  timezone?: string;
  language?: string;
}

export interface UserCreateInput {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
}

export interface UserUpdateInput {
  email?: string;
  username?: string;
  role?: UserRole;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
  };
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
```

---

## 6. 架构组件设计

### 6.1 组件结构

```
src/
├── handlers/
│   └── d1/
│       └── user.repo.ts          # 用户Repository
├── services/
│   └── user/
│       ├── user.service.ts       # 业务逻辑
│       └── user.routes.ts        # API路由
├── types/
│   └── user.ts                   # 类型定义
└── utils/
    └── password.ts               # 密码工具
```

### 6.2 Repository层

```typescript
// src/handlers/d1/user.repo.ts

export class UserRepository extends BaseRepository<User> {
  constructor(db: D1Database) {
    super(db, 'users');
  }

  protected hasDisplayIdColumn(): boolean {
    return true;
  }

  protected transform(row: Record<string, unknown>): User {
    return {
      ...row,
      profile: JSON.parse((row.profile as string) || '{}'),
    } as User;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy('email', email.toLowerCase());
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOneBy('username', username.toLowerCase());
  }

  async createUser(input: UserCreateInput & { passwordHash: string; passwordSalt: string }): Promise<User> {
    // 实现...
  }

  async updateLoginAttempts(userId: string, attempts: number): Promise<void> {
    // 实现...
  }

  async updateLastLogin(userId: string): Promise<void> {
    // 实现...
  }
}
```

### 6.3 Service层

```typescript
// src/services/user/user.service.ts

export class UserService {
  constructor(
    private userRepo: UserRepository,
    private env: Env
  ) {}

  async register(input: UserCreateInput, creatorRole: UserRole): Promise<User> {
    // 1. 验证权限（仅admin可创建admin/manager）
    // 2. 检查email/username唯一性
    // 3. 生成密码哈希
    // 4. 创建用户
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    // 1. 查找用户
    // 2. 验证密码
    // 3. 检查账户状态/锁定
    // 4. 生成JWT
    // 5. 更新登录信息
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    // 1. 验证当前密码
    // 2. 生成新密码哈希
    // 3. 更新密码
  }

  async validateToken(token: string): Promise<User | null> {
    // JWT验证逻辑
  }
}
```

### 6.4 密码工具

```typescript
// src/utils/password.ts

/**
 * 使用PBKDF2生成密码哈希
 * @param password 明文密码
 * @param salt 盐值（可选，不传则生成新盐）
 * @returns { hash, salt }
 */
export async function hashPassword(
  password: string,
  salt?: Uint8Array
): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // 生成或复用盐值
  const saltValue = salt || crypto.getRandomValues(new Uint8Array(32));
  
  // PBKDF2参数
  const iterations = 100000;
  const keyLength = 256;
  
  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltValue,
      iterations,
      hash: 'SHA-256',
    },
    key,
    keyLength
  );
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(saltValue);
  
  return {
    hash: hashArray.map(b => b.toString(16).padStart(2, '0')).join(''),
    salt: saltArray.map(b => b.toString(16).padStart(2, '0')).join(''),
  };
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const saltArray = new Uint8Array(
    storedSalt.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
  );
  
  const { hash } = await hashPassword(password, saltArray);
  return hash === storedHash;
}
```

---

## 7. 错误处理策略

### 7.1 错误码定义

```typescript
// 扩展现有ERROR_CODES
export const USER_ERROR_CODES = {
  // 认证相关
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // 用户相关
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_EXISTS: 'USER_EXISTS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  USERNAME_EXISTS: 'USERNAME_EXISTS',
  
  // 权限相关
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  CANNOT_DELETE_SELF: 'CANNOT_DELETE_SELF',
  CANNOT_MODIFY_ADMIN: 'CANNOT_MODIFY_ADMIN',
  
  // 密码相关
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
  PASSWORD_SAME_AS_OLD: 'PASSWORD_SAME_AS_OLD',
  CURRENT_PASSWORD_INCORRECT: 'CURRENT_PASSWORD_INCORRECT',
} as const;
```

### 7.2 HTTP状态码映射

| 场景 | HTTP状态码 | 错误码 |
|------|-----------|--------|
| 认证成功 | 200 | - |
| 创建成功 | 201 | - |
| 参数错误 | 400 | VALIDATION_ERROR |
| 认证失败 | 401 | UNAUTHORIZED |
| 权限不足 | 403 | FORBIDDEN |
| 用户不存在 | 404 | USER_NOT_FOUND |
| 用户已存在 | 409 | USER_EXISTS |
| 服务器错误 | 500 | INTERNAL_ERROR |

### 7.3 错误响应格式

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "USER_EXISTS",
    "message": "User with this email already exists",
    "details": {
      "field": "email",
      "value": "user@example.com"
    }
  }
}
```

---

## 8. 安全策略

### 8.1 密码策略

```yaml
min_length: 8
max_length: 128
require_uppercase: true
require_lowercase: true
require_number: true
require_special: false  # 可选
max_login_attempts: 5
lockout_duration: 30m  # 分钟
password_history: 5     # 记住最近5个密码
```

### 8.2 认证安全

```yaml
jwt_expiry: 24h
refresh_token: false    # 如需可实现
session_timeout: 8h     # 空闲超时
concurrent_sessions: true  # 允许多设备
secure_cookies: true
http_only: true
```

### 8.3 访问控制矩阵

| 操作 | admin | manager | viewer |
|------|-------|---------|--------|
| 查看所有用户 | ✅ | ✅ | ❌ |
| 查看自己信息 | ✅ | ✅ | ✅ |
| 创建用户 | ✅ | ❌ | ❌ |
| 修改任意用户 | ✅ | ❌ | ❌ |
| 修改自己信息 | ✅ | ✅ | ✅ |
| 删除用户 | ✅ | ❌ | ❌ |
| 修改角色 | ✅ | ❌ | ❌ |
| 修改状态 | ✅ | ✅ | ❌ |

---

## 9. wrangler.toml配置

### 9.1 配置更新

```toml
# 在现有配置基础上添加

[vars]
# 现有配置...
JWT_EXPIRES_IN = "24h"
MAX_LOGIN_ATTEMPTS = "5"
LOCKOUT_DURATION_MINUTES = "30"

# 密码策略
PASSWORD_MIN_LENGTH = "8"
PASSWORD_REQUIRE_UPPERCASE = "true"
PASSWORD_REQUIRE_LOWERCASE = "true"
PASSWORD_REQUIRE_NUMBER = "true"
```

### 9.2 Secrets配置

```bash
# 必须配置的Secrets
wrangler secret put JWT_SECRET              # JWT签名密钥
wrangler secret put ADMIN_PASSWORD_HASH     # 初始管理员密码哈希
wrangler secret put PASSWORD_PEPPER         # 可选：全局密码pepper
```

---

## 10. 迁移策略

### 10.1 数据迁移计划

1. **Phase 1**: 创建users表
2. **Phase 2**: 迁移现有admin用户到users表
3. **Phase 3**: 更新认证逻辑支持新表
4. **Phase 4**: 启用新用户管理API

### 10.2 向后兼容

```typescript
// 在auth.routes.ts中保持兼容
async function migrateLegacyAdmin(env: Env): Promise<void> {
  // 检查是否需要迁移
  const userRepo = new UserRepository(env.DB);
  const existingAdmin = await userRepo.findByUsername('admin');
  
  if (!existingAdmin && env.ADMIN_PASSWORD_HASH) {
    // 迁移旧admin到新表
  }
}
```

---

## 11. 测试策略

### 11.1 单元测试

```typescript
// 测试覆盖点
describe('UserService', () => {
  it('should create user with hashed password');
  it('should validate password correctly');
  it('should lock account after max attempts');
  it('should enforce role permissions');
});
```

### 11.2 集成测试

- API端点测试
- 数据库操作测试
- JWT验证测试
- 权限控制测试

---

## 12. 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 密码哈希性能 | 中 | 中 | 使用PBKDF2适度迭代次数 |
| JWT密钥泄露 | 高 | 低 | 定期轮换，使用Secrets |
| 权限提升漏洞 | 高 | 低 | 严格的角色检查，代码审查 |
| 数据迁移失败 | 中 | 低 | 备份策略，回滚计划 |

---

## 13. 决策记录

### ADR-001: 使用D1而非KV存储用户数据
- **状态**: 已接受
- **理由**: 用户数据需要复杂查询（按角色、状态筛选），关系型特性
- **替代方案**: KV + 索引表（过于复杂）

### ADR-002: 使用PBKDF2而非bcrypt
- **状态**: 已接受
- **理由**: Workers环境不支持原生bcrypt，PBKDF2是Web Crypto标准
- **替代方案**: 纯JavaScript bcrypt（性能差）

### ADR-003: 简单角色系统（RBAC简化版）
- **状态**: 已接受
- **理由**: 项目当前需求简单，预留扩展接口
- **替代方案**: 完整RBAC（过度设计）

---

## 14. 附录

### 14.1 参考文档
- [Cloudflare D1文档](https://developers.cloudflare.com/d1/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [OWASP密码存储指南](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### 14.2 变更日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-04-08 | 初始版本 |

---

**架构审查签核**

- [ ] 技术选型合理性
- [ ] 安全设计充分性
- [ ] 可扩展性评估
- [ ] 与现有架构一致性
- [ ] 实施可行性确认
