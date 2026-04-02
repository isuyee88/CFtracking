# Clash Verge Rev 配置脚本使用说明

## 📋 脚本功能

此脚本用于优化 Clash Verge Rev 的代理配置，特别针对 Cloudflare Workers 部署场景进行了优化。

### 主要功能

1. **DNS 优化**
   - 国内 DNS：阿里云、腾讯 DNSPod
   - 国外 DNS：Cloudflare、Google
   - 启用 Fake-IP 模式，提升解析速度

2. **规则优化**
   - Cloudflare 相关域名强制代理
   - GitHub 相关域名强制代理
   - 开发工具域名优化（npm、yarn、pypi）
   - 自动分流国内外流量

3. **代理组优化**
   - 节点选择：手动选择节点
   - 延迟选优：自动选择最低延迟
   - 故障转移：自动切换可用节点
   - 负载均衡：分散流量

---

## 🚀 使用方法

### 方法一：通过 Clash Verge Rev 界面配置

1. **打开 Clash Verge Rev**

2. **进入脚本管理**
   - 点击左侧菜单 "订阅"
   - 选择 "脚本" 标签
   - 点击 "新建脚本"

3. **粘贴脚本内容**
   - 将 `clash-verge-script.js` 文件内容复制
   - 粘贴到脚本编辑器中
   - 点击 "保存"

4. **启用脚本**
   - 在脚本列表中找到刚创建的脚本
   - 点击开关启用脚本
   - 脚本会自动应用到所有订阅

### 方法二：通过文件系统配置

1. **找到配置目录**
   ```
   Windows: %USERPROFILE%\.config\clash-verge\scripts\
   macOS: ~/.config/clash-verge/scripts/
   Linux: ~/.config/clash-verge/scripts/
   ```

2. **复制脚本文件**
   ```bash
   # Windows PowerShell
   Copy-Item clash-verge-script.js $env:USERPROFILE\.config\clash-verge\scripts\
   
   # macOS/Linux
   cp clash-verge-script.js ~/.config/clash-verge/scripts/
   ```

3. **重启 Clash Verge Rev**
   - 完全退出应用
   - 重新启动

---

## ⚙️ 高级配置

### 自定义代理组

如果您想自定义代理组，可以修改脚本中的 `proxy-groups` 部分：

```javascript
{
  ...groupBaseOption,
  "name": "自定义组名",
  "type": "select", // select | url-test | fallback | load-balance
  "proxies": ["节点选择", "延迟选优"],
  "include-all": true,
  "icon": "图标URL"
}
```

### 自定义规则

添加自定义规则：

```javascript
const rules = [
  // 在这里添加您的自定义规则
  "DOMAIN-SUFFIX,example.com,节点选择",
  "DOMAIN,specific.example.com,全局直连",
  
  // ... 其他规则
];
```

### 针对特定订阅配置

如果您只想对特定订阅应用脚本：

```javascript
function main(config, profileName) {
  // 只对名为 "MySubscription" 的订阅应用配置
  if (profileName === "MySubscription") {
    // 应用自定义配置
    config["dns"] = dnsConfig;
    // ...
  }
  
  return config;
}
```

---

## 🔧 故障排除

### 问题 1：脚本不生效

**解决方案**：
1. 确认脚本已启用
2. 检查脚本语法是否正确
3. 重启 Clash Verge Rev
4. 查看日志文件：
   ```
   Windows: %USERPROFILE%\.config\clash-verge\logs\
   ```

### 问题 2：代理连接失败

**解决方案**：
1. 检查订阅是否正常
2. 确认节点可用性
3. 尝试切换到 "延迟选优" 模式
4. 检查系统代理设置

### 问题 3：DNS 解析失败

**解决方案**：
1. 修改 DNS 配置：
   ```javascript
   "default-nameserver": ["223.5.5.5", "119.29.29.29"]
   ```
2. 尝试禁用 Fake-IP 模式：
   ```javascript
   "enhanced-mode": "redir-host"
   ```

### 问题 4：Wrangler 部署仍然超时

**解决方案**：
1. 确认 Clash Verge Rev 正在运行
2. 检查系统代理是否已设置：
   ```powershell
   # 检查环境变量
   $env:HTTP_PROXY
   $env:HTTPS_PROXY
   ```
3. 手动设置代理：
   ```powershell
   $env:HTTP_PROXY = "http://127.0.0.1:7890"
   $env:HTTPS_PROXY = "http://127.0.0.1:7890"
   wrangler deploy
   ```

---

## 📊 性能优化建议

### 1. 选择合适的代理模式

- **日常使用**：延迟选优（自动选择最快节点）
- **稳定优先**：故障转移（自动切换可用节点）
- **高流量场景**：负载均衡（分散流量）

### 2. 定期更新规则集

脚本中的规则集会每 24 小时自动更新一次。如需手动更新：

1. 进入 "订阅" -> "规则集"
2. 点击 "更新所有规则集"

### 3. 优化 DNS 设置

如果遇到 DNS 解析慢的问题：

```javascript
// 增加 DNS 缓存
"cache-algorithm": "arc",

// 使用更快的 DNS 服务器
"default-nameserver": ["223.5.5.5", "119.29.29.29"]
```

---

## 🔐 安全建议

1. **不要分享订阅链接**：包含您的代理配置
2. **定期更换节点**：避免单一节点过载
3. **检查脚本来源**：只使用可信的脚本
4. **备份配置**：定期备份您的配置文件

---

## 📚 相关资源

- [Clash Verge Rev 官方文档](https://www.clashverge.dev/)
- [Clash Meta Wiki](https://wiki.metacubex.one/)
- [规则集仓库](https://github.com/blackmatrix7/ios_rule_script)
- [Loyalsoldier 规则集](https://github.com/Loyalsoldier/clash-rules)

---

## 💡 提示

### 如何验证脚本是否生效？

1. 打开 Clash Verge Rev
2. 进入 "日志" 标签
3. 查看是否有脚本执行的日志
4. 检查 "代理组" 是否包含脚本定义的组

### 如何临时禁用脚本？

1. 进入 "订阅" -> "脚本"
2. 找到对应的脚本
3. 点击开关禁用
4. 重启 Clash Verge Rev

### 如何查看当前配置？

1. 进入 "配置" 标签
2. 点击当前使用的配置文件
3. 选择 "编辑文件"
4. 查看配置内容

---

## 🎯 针对开发者的优化

### Git 和 GitHub 优化

脚本已包含 GitHub 相关域名的代理规则，确保：
- `git clone` 操作顺畅
- GitHub API 访问稳定
- GitHub Pages 访问快速

### NPM 和包管理器优化

已优化以下域名：
- `npmjs.org` - NPM 官方仓库
- `yarnpkg.com` - Yarn 包管理器
- `pypi.org` - Python 包索引

### Cloudflare Workers 开发优化

特别优化了 Cloudflare 相关域名：
- `cloudflare.com`
- `cloudflareworkers.com`
- `workers.dev`
- `cloudflare-dns.com`

---

## 📝 更新日志

### v1.0.0 (2026-04-02)
- 初始版本
- 支持 Cloudflare Workers 开发优化
- 支持 GitHub 访问优化
- DNS 配置优化
- 代理组自动配置

---

## 🤝 贡献

如果您有改进建议或发现问题，欢迎：
1. 提交 Issue
2. 发起 Pull Request
3. 分享您的配置经验

---

**最后更新时间**: 2026-04-02
