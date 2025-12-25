# Vercel Deployment Configuration

## Production-Only Deployment Strategy

This project is configured to **ONLY** deploy production builds from the `master` branch. All preview deployments are disabled to prevent build failures and unnecessary resource usage.

## Current Configuration

### ✅ What's Deployed
- **Production**: `master` branch only → https://etoro-census.vercel.app
- **Preview**: Disabled (all preview builds are skipped)

### ❌ What's NOT Deployed
- `data-archive` branch (archive-only, not for deployment)
- Any feature branches
- Pull request previews
- Commit previews

## Configuration Files

### 1. vercel.json
```json
{
  "git": {
    "deploymentEnabled": {
      "master": true,
      "data-archive": false
    }
  },
  "github": {
    "silent": true,
    "autoJobCancelation": true,
    "autoAlias": false
  },
  "ignoreCommand": "bash ./ignore-build-step.sh"
}
```

**Key settings**:
- `deploymentEnabled`: Only master branch enabled
- `autoAlias: false`: Disables automatic aliasing for previews
- `ignoreCommand`: Custom script to filter builds

### 2. ignore-build-step.sh
Enforces production-only builds by checking:
- ✅ Branch is `master` AND environment is `production` → Build
- ❌ Environment is `preview` → Skip
- ❌ Branch is `data-archive` → Skip
- ❌ Any other scenario → Skip

## Additional Vercel Dashboard Settings

To fully disable preview deployments, configure these in the Vercel dashboard:

### Recommended Settings
1. **Project Settings → Git**
   - ✅ Enable: "Production Branch: master"
   - ❌ Disable: "Automatic Deployments for non-Production Branches"
   - ❌ Disable: "Enable Comments on Pull Requests and Commits"

2. **Project Settings → Ignored Build Step**
   - Already configured via `vercel.json`
   - Script: `bash ./ignore-build-step.sh`

3. **Project Settings → Deployment Protection** (Optional)
   - Enable if you want password protection for previews
   - Not needed since previews are fully disabled

## How to Configure in Vercel Dashboard

1. Go to https://vercel.com/weirdapps/etoro-census/settings
2. Click **Git** in the sidebar
3. Under "Deploy Hooks":
   - Ensure only `master` is listed as production branch
4. Under "Ignored Build Step":
   - Verify `bash ./ignore-build-step.sh` is set
5. Under "General":
   - Disable "Automatically expose System Environment Variables"
   - This prevents preview builds from accessing production secrets

## Troubleshooting Failed Deployments

### Preview Deployments Keep Triggering
**Symptom**: Preview deployments appear in deployment list with "Error" status

**Solution**:
1. ✅ Script now blocks all preview builds via `VERCEL_ENV` check
2. ✅ Updated `vercel.json` with `autoAlias: false`
3. Manual step: Disable "Automatic Deployments" in dashboard

### Data-Archive Branch Builds
**Symptom**: Builds triggered from data-archive branch

**Solution**:
1. ✅ Script explicitly blocks data-archive branch
2. ✅ vercel.json has `deploymentEnabled: false` for data-archive
3. Double protection ensures this branch never builds

### Production Builds Canceled
**Symptom**: Production builds start but get canceled

**Causes**:
- Multiple rapid commits to master (auto-cancellation is enabled)
- GitHub Actions pushing commits triggers multiple builds

**Solution**:
- This is normal behavior with `autoJobCancelation: true`
- Only the latest commit builds, earlier ones are auto-canceled
- Wait for the final build to complete

## Monitoring Deployments

### Check Recent Deployments
```bash
vercel ls etoro-census
```

### View Specific Deployment Logs
```bash
vercel logs <deployment-url>
```

### Check Build Status
```bash
vercel inspect <deployment-url>
```

## Expected Deployment Flow

1. **Daily Census Run** (00:00 UTC via GitHub Actions)
   - Generates new data files
   - Commits to master branch
   - Triggers Vercel production build

2. **Vercel Build Process**
   - Runs `ignore-build-step.sh`
   - Verifies: master branch + production environment
   - Proceeds with build: `npm run build`
   - Deploys to production: https://etoro-census.vercel.app

3. **Deployment Complete**
   - Analytics enabled (Vercel Analytics + Speed Insights)
   - Latest census data available
   - Old deployment kept as rollback option

## Best Practices

### ✅ Do
- Only push to master when ready for production
- Use the ignore script to control what builds
- Monitor deployment logs for issues
- Keep vercel.json in sync with dashboard settings

### ❌ Don't
- Don't bypass the ignore script
- Don't enable preview deployments
- Don't deploy from data-archive branch
- Don't commit secrets to the repository

## Environment Variables

Production environment variables (set in Vercel dashboard):
- `ETORO_API_KEY` - eToro API key for data collection
- `ETORO_USER_KEY` - eToro user key for authentication
- `NEXT_PUBLIC_USE_V2_FEATURES` - Optional feature flags

**Security**: These are only available to production builds, not previews.

## Rollback Procedure

If a deployment breaks production:

```bash
# List recent deployments
vercel ls etoro-census

# Promote a previous deployment to production
vercel promote <deployment-url>
```

Or via dashboard:
1. Go to Deployments tab
2. Find working deployment
3. Click "..." → "Promote to Production"

## Support

- Vercel Docs: https://vercel.com/docs
- Project Settings: https://vercel.com/weirdapps/etoro-census/settings
- Deployment Logs: https://vercel.com/weirdapps/etoro-census/deployments
