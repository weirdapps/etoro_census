# GitHub Actions Workflows

## Daily Census Report Generation

The `daily-census.yml` workflow runs automatically every day at 04:00 Athens time to generate fresh census reports.

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
- **04:00 Athens time** (during summer/DST)
- **03:00 Athens time** (during winter)

This is because the cron schedule uses UTC time (01:00 UTC).

### What It Does

1. Checks out the repository
2. Installs dependencies
3. Builds the Next.js application
4. Starts the server
5. Calls the report generation API
6. Commits the new reports
7. Pushes to GitHub
8. Automatically triggers the "Deploy Reports" workflow for GitHub Pages deployment

### Monitoring

- Check the Actions tab for workflow runs
- Look for commit messages like "Daily census report - YYYY-MM-DD HH:MM UTC"
- Reports will be available at your GitHub Pages URL