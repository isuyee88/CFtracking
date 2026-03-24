# Cloudflare WAF Settings Setup Guide

## 📋 Overview

This guide explains how to use the Cloudflare WAF settings service to update the WAF/Bot Management settings for zone `t.isuyee.com`, specifically to:
- Disable "Block AI automated programs" 
- Disable "AI Maze/Labyrinth"

The service automatically reads the Cloudflare API token from the Windows user environment variable `CF_API_TOKEN`.

## 🔧 Prerequisites

1. **Cloudflare API Token** with the following permissions:
   - `Zone:Settings:Edit`
   - `Zone:Zone:Read`

2. **Node.js** installed (v18+ recommended)

3. **Access to the CF Tracking project** repository

## 🚀 Setup Instructions

### Step 1: Set Environment Variable in Windows

1. Press `Win + S` and type "env"
2. Select "Edit the system environment variables"
3. Click "Environment Variables..."
4. Under "User variables for [YourUsername]", click "New..."
5. Enter:
   - **Variable name**: `CF_API_TOKEN`
   - **Variable value**: `[Your Cloudflare API Token]`
6. Click OK → OK → OK to save

> 💡 **Note**: You may need to restart your terminal/IDE after setting the environment variable for it to take effect.

### Step 2: Verify Environment Variable

Open a new Command Prompt or PowerShell window and run:
```cmd
echo %CF_API_TOKEN%
```

You should see your API token displayed (or at least part of it).

### Step 3: Run the WAF Settings Update

From the project root directory (`d:\suyee\github\CFtracking`), run:

#### Option 1: Using npx ts-node (recommended for quick execution)
```cmd
npx ts-node src/services/cloudflare/waf-settings.ts
```

#### Option 2: Using the example usage file
```cmd
npx ts-node src/services/cloudflare/example-usage.ts
```

#### Option 3: Build and run as compiled JavaScript
```cmd
npm run build:backend
node dist/src/services/cloudflare/waf-settings.js
```

## 📝 What Happens When You Run It

The service will:
1. Read your API token from the `CF_API_TOKEN` environment variable
2. Look up the zone ID for `t.isuyee.com`
3. Update Scrape Shield settings to disable "Block AI automated programs"
4. Update Bot Fight Mode settings to disable "AI Maze/Labyrinth"
5. Keep general Bot Fight Mode protection enabled
6. Display success/error messages in the console

## 🛠️ Alternative Usage Methods

### Method 1: Pass Token Directly (for testing)
```cmd
npx ts-node src/services/cloudflare/waf-settings.ts "your-api-token-here"
```

### Method 2: Use in Other Code
```typescript
import { updateTIsuyeeComWAFSettings } from './src/services/cloudflare/waf-settings';

// Will automatically use CF_API_TOKEN from environment
await updateTIsuyeeComWAFSettings();

// Or pass token directly
await updateTIsuyeeComWAFSettings('your-api-token-here');
```

## 🔍 Troubleshooting

### "Cloudflare API token is required" Error
- Ensure `CF_API_TOKEN` is set in **User** environment variables (not System)
- Restart your terminal after setting the variable
- Verify with `echo %CF_API_TOKEN%` in a new terminal

### Zone Not Found Error
- Verify the zone name is exactly `t.isuyee.com` in your Cloudflare account
- Check that your API token has `Zone:Zone:Read` permission

### API Permission Errors
- Ensure your token has both `Zone:Settings:Edit` and `Zone:Zone:Read` permissions
- Token must be for the correct account that contains `t.isuyee.com`

## 📊 Expected Output

When successful, you should see:
```
Fetching zone ID for t.isuyee.com...
Zone ID: [actual-zone-id]
Updating Scrape Shield settings...
Scrape Shield settings updated successfully
Updating Bot Fight Mode settings...
Bot Fight Mode settings updated successfully
✅ All WAF/Bot Management settings updated successfully for t.isuyee.com
   - Block AI automated programs: DISABLED
   - AI Maze/Labyrinth: DISABLED
```

## 🔒 Security Notes

- Never commit your API token to version control
- The service only reads from environment variables - no tokens are stored in code
- Consider using Cloudflare API token with minimal required permissions
- You can delete or rotate the token after use if desired

## 📚 Related Files

- **Main Service**: `src/services/cloudflare/waf-settings.ts`
- **Usage Example**: `src/services/cloudflare/example-usage.ts`
- **Unit Tests**: `src/services/cloudflare/waf-settings.test.ts`
- **This Guide**: `CLOUDFLARE_WAF_SETUP_GUIDE.md`

## ❓ Need Help?

If you encounter issues:
1. Double-check your API token permissions
2. Verify the environment variable is set correctly
3. Ensure you're running from the project root directory
4. Check the console output for specific error messages

The service is now ready to use with your Windows environment variable setup!