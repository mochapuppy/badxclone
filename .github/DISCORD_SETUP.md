# Discord Notifications Setup

This repository is configured to send Discord notifications when you push features to the `main`, `production`, or `develop` branches.

## Setup Instructions

### Step 1: Create a Discord Webhook

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook** (or **Create Webhook**)
4. Give your webhook a name (e.g., "BadXClone Notifications")
5. Select the channel where you want to receive notifications
6. Click **Copy Webhook URL** to copy the webhook URL
7. Click **Save**

### Step 2: Add Webhook to GitHub Secrets

1. Go to your GitHub repository (Settings page)
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Set the following:
   - **Name**: `DISCORD_WEBHOOK_URL`
   - **Secret**: Paste the Discord webhook URL you copied
6. Click **Add secret**

### Step 3: Test the Notification

Push a commit to one of the monitored branches (`main`, `production`, or `develop`):

```bash
git add .
git commit -m "Test Discord notifications"
git push origin main
```

You should see a notification in your Discord channel with:
- The commit message
- Repository and branch information
- Author name
- Commit SHA with link
- Number of files changed
- Timestamp

## Customization

### Change Monitored Branches

Edit `.github/workflows/discord-notification.yml` and modify the `branches` section:

```yaml
on:
  push:
    branches:
      - main
      - production
      - develop
      # Add more branches here
```

### Change Notification Color

The embed color is set to green (3066993). You can change it in the workflow file:
- Green: 3066993
- Blue: 3447003
- Red: 15158332
- Yellow: 16776960
- Orange: 15105570

### Customize Notification Content

Edit the `discord-notification.yml` file to modify the fields displayed in the notification.

## Troubleshooting

### No notification received

1. Check that the `DISCORD_WEBHOOK_URL` secret is set correctly in GitHub
2. Verify the webhook URL is still valid in Discord
3. Check the Actions tab in GitHub to see if the workflow ran successfully
4. Ensure you're pushing to a monitored branch

### Workflow failed

Check the Actions tab in your repository for error details. Common issues:
- Invalid webhook URL
- Network connectivity issues
- Malformed JSON in the notification

## Features

- ✅ Automatic notifications on push events
- ✅ Rich embed messages with formatting
- ✅ Direct links to commits and repository
- ✅ Shows author, branch, and files changed
- ✅ Timestamp for each notification
- ✅ Graceful handling when webhook is not configured

## Need Help?

If you encounter any issues, check the workflow logs in the Actions tab of your GitHub repository.
