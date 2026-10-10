# CF-Tracking

**Cloudflare-native Affiliate Tracking Platform**

A modern, serverless tracking solution built on Cloudflare Workers, designed for affiliate marketers who need edge-native performance, zero maintenance, and full control.

---

## ⚡ Why CF-Tracking?

- **🌍 Edge-Native**: Deploy globally on Cloudflare's network - sub-50ms latency worldwide
- **🚀 Zero Ops**: No servers to manage, automatic scaling, built-in redundancy
- **🔧 Programmable**: Full TypeScript codebase, extensible architecture
- **💰 Cost-Effective**: Pay only for what you use, no fixed VPS costs
- **🔒 Data Sovereignty**: Your data stays in your Cloudflare account

---

## 🎯 Core Features

### Tracking & Attribution
- ✅ Click tracking with advanced deduplication
- ✅ Conversion tracking with S2S postback support
- ✅ Multi-touch attribution (coming soon)
- ✅ Real-time analytics via Server-Sent Events (SSE)

### Campaign Management
- ✅ Campaign CRUD with status management
- ✅ Flow/Stream routing with conditional filters
- ✅ Landing page and offer management
- ✅ Traffic source integration

### Anti-Fraud & Traffic Quality
- ✅ Bot detection and filtering
- ✅ IP blacklist/whitelist
- ✅ Custom autorules engine
- ✅ Proxy detection
- ✅ Traffic quality scoring

### Reporting
- ✅ Multi-dimensional reports (campaign, source, geo, device)
- ✅ Custom metrics builder
- ✅ Real-time dashboard
- ✅ Export to CSV/Excel/JSON

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+
- Cloudflare account (free tier works)
- Wrangler CLI

### 1. Clone & Install
```bash
git clone https://github.com/isuyee88/CFtracking.git
cd CFtracking
npm install
```

### 2. Configure Cloudflare
```bash
# Login to Cloudflare
npx wrangler login

# Copy example config
cp wrangler.toml.example wrangler.toml

# Edit wrangler.toml with your account ID
```

### 3. Setup Database
```bash
# Create D1 database
npx wrangler d1 create cf-tracking-db

# Run migrations
npx wrangler d1 migrations apply cf-tracking-db
```

### 4. Run Locally
```bash
npm run dev:worker
```

Visit http://localhost:12342 🎉

### 5. Deploy to Production
```bash
# Set secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_PASSWORD_HASH

# Deploy
npm run build
npx wrangler deploy
```

---

## 📚 Architecture

```
┌─────────────────────────────────────────────┐
│   Cloudflare Workers (Edge Runtime)         │
│   ├─ Hono Framework (Routing)               │
│   ├─ Authentication Middleware               │
│   └─ Business Services (38 modules)         │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────────┐    ┌──────▼─────────┐
│ D1 (SQLite)│    │ Durable Objects│
│ - Campaigns│    │ - Real-time    │
│ - Clicks   │    │ - Strong state │
│ - Reports  │    │ - Uniqueness   │
└────────────┘    └────────────────┘
    │                     │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  KV + R2 + Queues   │
    │  - Cache            │
    │  - Assets           │
    │  - Async Jobs       │
    └─────────────────────┘
```

**Key Components**:
- **Workers**: Edge compute for click tracking, redirects, API
- **D1**: SQLite database for campaigns, flows, clicks, conversions
- **Durable Objects**: Stateful coordination for real-time analytics
- **KV**: Low-latency cache
- **R2**: Object storage for hosted assets and exports
- **Queues**: Async postback delivery and cache refresh

---

## 🆚 CF-Tracking vs Keitaro

| Feature | Keitaro | CF-Tracking | Notes |
|---------|---------|-------------|-------|
| **Deployment** | Self-hosted VPS | Serverless Edge | CF = zero ops |
| **Scaling** | Vertical (upgrade server) | Horizontal (automatic) | CF = elastic |
| **Global Latency** | Single datacenter | 300+ edge locations | CF < 50ms worldwide |
| **Maintenance** | Manual updates, backups | Automatic | CF = hands-free |
| **Cost (small traffic)** | ~$60/mo (€49 + VPS) | ~$10/mo | CF cheaper |
| **Cost (large traffic)** | ~$300/mo | ~$100-300/mo | Depends on usage |
| **Traffic Source Templates** | 50+ built-in | 10 (growing) | Keitaro mature |
| **RBAC** | Yes | Basic (roadmap) | Coming soon |
| **Learning Curve** | Medium | High (for now) | Docs improving |

**When to choose CF-Tracking**:
- You want zero server maintenance
- You need global edge performance
- You prefer pay-per-use pricing
- You value data sovereignty
- You're comfortable with code

**When to choose Keitaro**:
- You need turnkey solution
- You prefer fixed monthly cost
- You want 50+ pre-built integrations
- You need mature RBAC today

---

## 📖 Documentation

- [Quick Start Guide](docs/quick-start.md) - Get running in 5 minutes
- [API Documentation](docs/api/) - OpenAPI spec + examples
- [Architecture Guide](docs/architecture-current-2026-10-10.md) - Deep dive
- [Traffic Source Templates](templates/traffic-sources/) - Integration guides
- [Deployment Guide](docs/deployment.md) - Production checklist
- [Troubleshooting](docs/troubleshooting.md) - Common issues

---

## 🛣️ Roadmap

### ✅ Completed (v2.0)
- Campaign & Flow management
- Click & conversion tracking
- Anti-fraud & traffic governance
- Multi-dimensional reporting
- Real-time SSE updates

### 🚧 In Progress (Q4 2026)
- Traffic source template library (10+ platforms)
- Campaign cloning & bulk operations
- Enhanced export (CSV/Excel/JSON)
- Performance optimization (Analytics Engine)
- RBAC foundation

### 📅 Planned (Q1 2027)
- Privacy-first attribution (GDPR tools)
- AI-powered traffic quality scoring
- Webhook automation
- Multi-tenant support
- Mobile SDK

See [Improvement Roadmap](docs/plans/cf-tracking-improvement-roadmap-2026-10-10.md) for details.

---

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch (`feature/your-feature`)
3. Follow TypeScript best practices
4. Add tests for new features
5. Submit a pull request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/isuyee88/CFtracking/issues)
- **Discussions**: [GitHub Discussions](https://github.com/isuyee88/CFtracking/discussions)
- **Email**: support@isuyee.com

---

## 🙏 Acknowledgments

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/) - Fast web framework
- [React](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

Inspired by [Keitaro](https://keitaro.io/), [Voluum](https://voluum.com/), and the affiliate marketing community.

---

**⭐ Star this repo if you find it useful!**

Made with ❤️ for the affiliate marketing community
