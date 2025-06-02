# GitHub Actions Workflows

## Daily Census Report Generation (Optimized)

The `daily-census.yml` workflow runs automatically every day at 04:00 Athens time to generate fresh census reports using the **optimized architecture**.

### Setup Requirements

1. **Add Repository Secrets**
   - Go to your repository Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `ETORO_API_KEY`: Your eToro API key
     - `ETORO_USER_KEY`: Your eToro user key

2. **Enable GitHub Actions**
   - Ensure Actions are enabled in your repository settings

3. **GitHub Pages Configuration**
   - Make sure GitHub Pages is configured to deploy from either:
     - GitHub Actions source
     - Master branch `/docs` folder

### Manual Trigger

You can also manually trigger the workflow:
1. Go to Actions tab
2. Select "Daily Census Report Generation"
3. Click "Run workflow"

### Schedule

The workflow runs at:
- **01:00 Athens time** (during summer/DST)
- **02:00 Athens time** (during winter)

This is because the cron schedule uses UTC time (00:00 UTC).

### Optimized Architecture

The workflow now uses the **optimized endpoint** (`/api/optimized-report`) which:
- **Single data collection**: Fetches all 1500 investors once
- **Multiple analyses**: Generates all investor bands (100, 500, 1000, 1500) from same data
- **No rate limiting**: Eliminates redundant API calls that previously caused failures
- **Comprehensive logging**: Detailed progress tracking with error rates
- **Robust processing**: Circuit breakers and timeout protection

### What It Does

1. Checks out the repository
2. Installs dependencies  
3. Builds the Next.js application
4. Starts the server
5. **Calls the optimized report API** with comprehensive data collection
6. **Streams real-time progress** during processing
7. Commits the new reports and JSON data
8. Pushes to GitHub
9. Automatically triggers the "Deploy Reports" workflow for GitHub Pages deployment

### Monitoring

- Check the Actions tab for workflow runs
- Look for detailed progress logs showing data collection phases
- Commit messages: "Daily census report - YYYY-MM-DD HH:MM UTC"
- Reports available at your GitHub Pages URL
- **Much faster and more reliable** than previous architecture