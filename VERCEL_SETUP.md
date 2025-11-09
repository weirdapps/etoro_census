# Vercel Deployment Setup Guide

This guide explains how to configure the eToro Census application for optimal performance on Vercel.

## Overview

The application has been optimized for Vercel deployment with the following architecture:

- **Static Census Data**: Pre-generated daily via GitHub Actions
- **Live Generation**: Available but may timeout on Vercel's free tier
- **Personal Portfolio**: Requires API credentials configuration

---

## 🚀 Quick Start

### 1. Deploy to Vercel

```bash
# Option A: Deploy via Vercel CLI
vercel

# Option B: Import from GitHub
# Go to vercel.com → Import Project → Select your repository
```

### 2. Configure Environment Variables

**Required for `/personal` route only:**

Go to your Vercel Project → Settings → Environment Variables → Add:

```
ETORO_API_KEY=your_api_key_here
ETORO_USER_KEY=your_user_key_here
```

**Notes:**
- These variables are **ONLY** required if you want to use the `/personal` portfolio analysis feature
- The main census features work WITHOUT these credentials
- Never commit these values to Git - they're excluded via `.gitignore`

---

## 📊 Route-Specific Information

### `/` and `/v2` - Census Dashboard

**How it works on Vercel:**

✅ **Recommended**: Use "Load Latest Census" button
- Loads pre-generated data from `census-data-latest.json` (~80MB)
- Updated daily at 00:00 UTC via GitHub Actions
- Instant loading, no timeouts
- Shows data for ~1500 investors

⚠️ **Advanced**: "Generate New Census" option
- May timeout on Vercel Free tier (10-second limit)
- Recommended for local development only
- Works perfectly on GitHub Actions (no timeout limits)

**Files Deployed to Vercel:**
- `public/data/census-data-latest.json` (latest census data)
- All other historical data files are excluded via `.vercelignore`

---

### `/personal` - Personal Portfolio Analysis

**Requirements:**
- ✅ ETORO_API_KEY environment variable
- ✅ ETORO_USER_KEY environment variable

**Error Messages:**

If you see "Personal Portfolio Analysis Unavailable":
1. Environment variables are not configured
2. Follow the setup steps in "Configure Environment Variables" above
3. Redeploy your application after adding variables

**How to get eToro API credentials:**
- Contact eToro developer support
- Or use your existing API credentials if you have them

---

## ⚙️ File Deployment Configuration

### What Gets Deployed to Vercel

**Included** (via `.vercelignore`):
```
✅ src/                          (application code)
✅ public/data/census-data-latest.json   (~80MB latest data)
✅ Next.js configuration files
```

**Excluded** (via `.vercelignore`):
```
❌ public/reports/**/*.html      (historical reports ~500MB)
❌ public/data/etoro-data-*.json  (historical data files ~13GB)
❌ .github/                      (workflow files)
❌ analysis/                     (data analysis scripts)
```

**Why this matters:**
- Keeps deployment size under 250MB
- Faster deployments
- Avoids serverless function size limits
- Full historical data remains in GitHub repository

---

## 🔄 Daily Automated Updates

### GitHub Actions Workflow

The application automatically updates daily:

**What happens at 00:00 UTC:**
1. ✅ GitHub Actions generates new census (1500 investors)
2. ✅ Creates `etoro-data-2025-XX-XX.json` in repository
3. ✅ Copies latest to `census-data-latest.json`
4. ✅ Commits all files to repository (full history)
5. ✅ Triggers Vercel deployment via webhook

**Result:**
- Latest data available on Vercel within ~5 minutes
- Full historical archive maintained in Git
- No manual intervention needed

---

## 🛠️ Troubleshooting

### Issue: "/v2 shows no data"

**Solution:**
1. Click "Load Latest Census Data" button
2. This loads pre-generated data instantly
3. Avoid "Generate New Census" on Vercel (will timeout)

### Issue: "/personal shows API credentials error"

**Solution:**
1. Go to Vercel Project Settings
2. Environment Variables → Add ETORO_API_KEY and ETORO_USER_KEY
3. Redeploy application
4. Refresh page

### Issue: "census-data-latest.json not found"

**Solution:**
1. Ensure GitHub Actions workflow has run at least once
2. Check repository for `public/data/census-data-latest.json`
3. Manually trigger workflow: GitHub → Actions → Daily Census Report Generation → Run workflow
4. Wait for completion, then redeploy to Vercel

### Issue: Deployment exceeds size limit

**Solution:**
1. Verify `.vercelignore` is properly configured
2. Check that historical data files are excluded
3. Only `census-data-latest.json` should be deployed
4. Current deployment size: ~80MB (well under 250MB limit)

---

## 📈 Performance Optimization

### Serverless Function Limits

**Vercel Free Tier:**
- Function timeout: 10 seconds
- Memory: 1024MB

**Our Configuration:**
- Census data loading: < 1 second (pre-generated)
- Live generation: Not recommended (30+ minutes)
- Personal portfolio: 5-8 seconds (within limits)

**Best Practices:**
1. Use "Load Latest Census" for /v2
2. Configure API credentials for /personal
3. Trust daily automated updates
4. Generate live data locally if needed

---

## 🔐 Security Notes

### Environment Variables

**Never commit to Git:**
- ❌ ETORO_API_KEY
- ❌ ETORO_USER_KEY
- ❌ Any API credentials

**Proper storage:**
- ✅ Vercel Project Settings → Environment Variables
- ✅ Local `.env.local` file (gitignored)

### API Rate Limiting

The application implements:
- 1-second minimum interval between API calls
- Exponential backoff on rate limit errors
- 15-second timeout per request
- Automatic retry logic

---

## 📝 Summary

### For Best Vercel Experience:

1. **Deploy** → Import from GitHub to Vercel
2. **Configure** → Add API credentials (optional, for /personal only)
3. **Use** → Click "Load Latest Census" on /v2 page
4. **Enjoy** → Daily automated updates at 00:00 UTC

### Three-Tier Storage Strategy:

1. **Git Repository** → Full history (~13GB, all 168+ reports)
2. **GitHub Pages** → Last 7 days (~500MB, static site)
3. **Vercel** → Latest only (~80MB, live app)

**Everyone wins:**
- ✅ Fast deployments
- ✅ Low bandwidth
- ✅ Complete history preserved
- ✅ Daily automation
- ✅ Zero maintenance

---

## 📚 Additional Resources

- **Main Documentation**: See `README.md`
- **Project Context**: See `CLAUDE.md`
- **GitHub Actions**: See `.github/workflows/daily-census.yml`
- **Vercel Config**: See `vercel.json` and `.vercelignore`

---

**Last Updated**: November 2025
**Version**: 1.0
**Maintained by**: GitHub Actions + Vercel Automated Deployment
