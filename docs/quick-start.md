# Quick Start Guide

Get CF-Tracking running in **5 minutes** ⚡

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 18+** installed ([download](https://nodejs.org))
- ✅ **Cloudflare account** (free tier works) ([sign up](https://dash.cloudflare.com/sign-up))
- ✅ **Git** installed
- ✅ Basic command line knowledge

---

## Step 1: Clone Repository

```bash
git clone https://github.com/isuyee88/CFtracking.git
cd CFtracking
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages (~2-3 minutes).

---

## Step 3: Setup Cloudflare

### 3.1 Login to Cloudflare

```bash
npx wrangler login
```

This opens your browser to authorize Wrangler CLI.

### 3.2 Get Your Account ID

```bash
npx wrangler whoami
```

Copy the `Account ID` from the output.

### 3.3 Configure wrangler.toml

Edit `wrangler.toml` and update:

```toml
account_id = "YOUR_ACCOUNT_ID_HERE"
```

---

## Step 4: Create Database

```bash
# Create D1 database
npx wrangler d1 create cf-tracking-db

# Copy the database_id from output
```

Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cf-tracking-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### Run Migrations

```bash
npx wrangler d1 migrations apply cf-tracking-db --remote
```

---

## Step 5: Set Secrets

### Generate JWT Secret

```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Set it
npx wrangler secret put JWT_SECRET
# Paste the generated secret when prompted
```

### Set Admin Password

```bash
# Generate password hash
node -e "console.log(require('crypto').createHash('sha256').update('your-secure-password').digest('hex'))"

# Set it
npx wrangler secret put ADMIN_PASSWORD_HASH
# Paste the hash when prompted
```

---

## Step 6: Run Locally

```bash
npm run dev
```

Visit **http://localhost:8787** 🎉

### Test the API

```bash
# Health check
curl http://localhost:8787/api/health

# Login (get JWT token)
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-secure-password"}'
```

---

## Step 7: Create Your First Campaign

### Via UI
1. Open http://localhost:8787
2. Login with admin credentials
3. Navigate to **Campaigns → New Campaign**
4. Fill in:
   - Name: "Test Campaign"
   - Traffic Source: "Direct"
   - Default Landing Page URL: https://example.com
5. Save

### Via API

```bash
curl -X POST http://localhost:8787/api/campaigns \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "trafficSourceId": "direct",
    "defaultLandingUrl": "https://example.com",
    "status": "active"
  }'
```

---

## Step 8: Test Click Tracking

```bash
# Generate tracking link
# Replace {campaignId} with your campaign ID from step 7

curl "http://localhost:8787/click?campaign={campaignId}&source=test&offer=1"
```

You should see:
- Redirect to your landing page
- Click recorded in database
- Dashboard shows +1 click

---

## Step 9: Deploy to Production

### Build

```bash
npm run build
```

### Deploy

```bash
npx wrangler deploy
```

Your tracker is now live at: `https://cf-tracking.YOUR_SUBDOMAIN.workers.dev`

---

## Step 10: Verify Production

```bash
# Health check
curl https://cf-tracking.YOUR_SUBDOMAIN.workers.dev/api/health

# Test click
curl "https://cf-tracking.YOUR_SUBDOMAIN.workers.dev/click?campaign={campaignId}&source=prod-test"
```

---

## Next Steps

### ✅ Configure Traffic Sources

1. Go to **Traffic Sources** page
2. Click **"Add from Template"**
3. Select **PropellerAds** (or another platform)
4. Fill in your PropellerAds parameters
5. Get your tracking URL

### ✅ Setup Postback

1. Go to **Campaigns → Your Campaign**
2. Copy the **Postback URL**
3. Add it to your affiliate network
4. Test with a conversion

### ✅ Explore Reports

- **Dashboard**: Real-time overview
- **Reports**: Multi-dimensional analysis
- **Logs**: Click and conversion history

---

## Troubleshooting

### "Command not found: wrangler"

```bash
npm install -g wrangler
```

### "D1 database not found"

Make sure you:
1. Created the database with `wrangler d1 create`
2. Updated `wrangler.toml` with correct `database_id`
3. Ran migrations

### "Unauthorized" API responses

1. Check JWT_SECRET is set
2. Login to get fresh token
3. Include token in Authorization header

### Local dev not working

```bash
# Clear cache
rm -rf .wrangler
npm run dev
```

---

## Common Questions

**Q: Can I use a custom domain?**  
A: Yes! Add a route in `wrangler.toml`:

```toml
routes = [
  { pattern = "tracker.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

**Q: How do I backup my data?**  
A: Export from D1:

```bash
npx wrangler d1 export cf-tracking-db --output backup.sql
```

**Q: Can I run multiple trackers?**  
A: Yes, create separate Workers with different names in `wrangler.toml`.

**Q: What's the cost?**  
A: Cloudflare Workers Free tier includes:
- 100,000 requests/day
- 10 ms CPU time per request
- For most users: **$5-20/month**

---

## Support

- 📖 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/isuyee88/CFtracking/issues)
- 💬 [Discussions](https://github.com/isuyee88/CFtracking/discussions)

---

**🎉 Congratulations!** You now have a production-ready affiliate tracker running on Cloudflare's edge network.

**Next**: Check out [Traffic Source Templates](../templates/traffic-sources/) to integrate your ad platforms.
