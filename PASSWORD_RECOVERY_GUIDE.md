# CFtracking 账户信息和密码重置指南

**发现时间**: 2026-01-07

---

## 📋 当前账户信息

### 管理员账户
- **用户名**: `admin`
- **密码哈希算法**: SHA-256 (存储在 .dev.vars)
- **密码哈希**: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9

### 账户位置
- 开发环境: `.dev.vars` 文件
- 生产环境: Cloudflare Secrets (wrangler secret)

---

## 🔓 密码重置方案

### 方案 1: 重新设置新密码（推荐）

```bash
cd D:/suyee/github/CFtracking

# 1. 选择新密码（例如: MyNewPassword123!）
NEW_PASSWORD="MyNewPassword123!"

# 2. 生成 SHA-256 哈希
# Windows PowerShell:
$password = "MyNewPassword123!"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($password)
$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
$hashString = [System.BitConverter]::ToString($hash).Replace("-","").ToLower()
echo $hashString

# 或使用在线工具:
# https://emn178.github.io/online-tools/sha256.html
# 输入密码，得到哈希值

# 3. 更新开发环境 (.dev.vars)
# 编辑 .dev.vars 文件，更新 ADMIN_PASSWORD_HASH

# 4. 更新生产环境 (Cloudflare Secrets)
wrangler secret put ADMIN_PASSWORD_HASH
# 输入刚才生成的哈希值

# 5. 重新部署
wrangler deploy
```

### 方案 2: 尝试破解当前密码（不推荐）

当前哈希值 `240be518...` 是 SHA-256，可以尝试：

**常见密码列表**（SHA-256 哈希匹配）:
- 如果是 `admin` → 哈希应该是: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
- 如果是 `password` → 哈希应该是: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
- 如果是 `123456` → 哈希应该是: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92

**您的哈希**: `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`

这个哈希值不匹配常见密码，可能是自定义密码。

### 方案 3: 使用开发环境登录

```bash
# 1. 启动开发服务器（AUTH_MODE=off）
npm run dev:worker

# 2. 访问
http://localhost:12342

# 3. 开发模式下认证被绕过，可以直接访问

# 4. 在开发环境中修改密码
```

---

## 🔑 快速重置步骤（推荐）

```bash
# 1. 生成新密码哈希（使用 PowerShell）
cd D:/suyee/github/CFtracking

# 运行 PowerShell 命令生成哈希
powershell -Command "
\$password = 'NewPassword123'
\$bytes = [System.Text.Encoding]::UTF8.GetBytes(\$password)
\$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash(\$bytes)
[System.BitConverter]::ToString(\$hash).Replace('-','').ToLower()
"

# 2. 更新 .dev.vars
# 将输出的哈希值更新到 .dev.vars 文件

# 3. 更新生产环境
wrangler secret put ADMIN_PASSWORD_HASH
# 粘贴刚才生成的哈希值

# 4. 重新部署
wrangler deploy
```

---

## 🛠️ 自助密码重置工具

我来为您创建一个密码重置脚本：

```bash
# reset-password.sh
#!/bin/bash

echo "=== CFtracking 管理员密码重置工具 ==="
echo ""

read -p "请输入新密码: " NEW_PASSWORD
echo ""

# 生成 SHA-256 哈希
HASH=$(echo -n "$NEW_PASSWORD" | sha256sum | awk '{print $1}')

echo "新密码哈希: $HASH"
echo ""

# 更新 .dev.vars
echo "ADMIN_PASSWORD_HASH=$HASH" > .dev.vars.new
echo "✅ 已生成新配置文件: .dev.vars.new"
echo ""

echo "下一步:"
echo "1. 检查 .dev.vars.new"
echo "2. 复制内容到 .dev.vars"
echo "3. 运行: wrangler secret put ADMIN_PASSWORD_HASH"
echo "4. 输入: $HASH"
echo "5. 运行: wrangler deploy"
echo ""
echo "新的登录凭据:"
echo "  用户名: admin"
echo "  密码: $NEW_PASSWORD"
```

---

## 📝 推荐操作

### 立即执行（最简单）

```bash
cd D:/suyee/github/CFtracking

# 设置新密码为: Admin2026!
NEW_PASS="Admin2026!"

# Windows 生成哈希
powershell -Command "
\$password = 'Admin2026!'
\$bytes = [System.Text.Encoding]::UTF8.GetBytes(\$password)
\$hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash(\$bytes)
\$hashString = [System.BitConverter]::ToString(\$hash).Replace('-','').ToLower()
Write-Output \$hashString
"

# 会输出类似: a1b2c3d4e5f6...

# 然后更新生产环境
wrangler secret put ADMIN_PASSWORD_HASH
# 粘贴上面的哈希值

# 重新部署
wrangler deploy

# 新凭据:
# 用户名: admin
# 密码: Admin2026!
```

---

## ⚠️ 安全建议

### 升级到 Argon2id（更安全）

当前使用的 SHA-256 不够安全（无盐），建议升级：

```typescript
// 未来改进: 使用 Argon2id
import { argon2id } from '@noble/hashes/argon2';

// 生成密码哈希
const salt = crypto.getRandomValues(new Uint8Array(16));
const hash = argon2id(password, salt, {
  t: 3,        // iterations
  m: 65536,    // memory (64 MB)
  p: 1,        // parallelism
});

// 格式: argon2id$salt$hash
const storedHash = `argon2id$${Buffer.from(salt).toString('base64')}$${Buffer.from(hash).toString('base64')}`;
```

这个在 Phase 0.1 中已经实现了建议，但需要迁移现有密码。

---

## 🎯 总结

**当前信息**:
- 用户名: `admin`
- 密码: 未知（SHA-256 哈希存储）
- 哈希: `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`

**推荐方案**: 重置为新密码
1. 使用 PowerShell 生成新哈希
2. 更新 Cloudflare Secret
3. 重新部署
4. 使用新密码登录

需要我帮您执行密码重置吗？
