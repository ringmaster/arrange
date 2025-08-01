# Setting Up GitHub Pages for Music Arrangement Analyzer

This document explains how to configure GitHub Pages to host the Music Arrangement Analyzer application.

## Prerequisites

- A GitHub repository with the Music Arrangement Analyzer code
- Administrative access to the repository settings

## Step 1: Configure GitHub Pages in Repository Settings

1. Go to your repository on GitHub
2. Click on "Settings" (near the top-right)
3. Scroll down to the "GitHub Pages" section
4. Under "Source", select "GitHub Actions"
   - This tells GitHub to use our custom workflow to build and deploy the site

## Step 2: First Deployment

The GitHub Actions workflow will automatically build and deploy the site whenever you push changes to the `main` branch. To trigger your first deployment:

1. Push a change to the `main` branch, or
2. Manually trigger the workflow:
   - Go to the "Actions" tab in your repository
   - Select the "Deploy to GitHub Pages" workflow
   - Click "Run workflow" and select the `main` branch

## Step 3: Verify Deployment

1. Once the workflow completes successfully, go back to Settings > GitHub Pages
2. You should see a message saying "Your site is published at https://yourusername.github.io/repo-name/"
3. Click on the URL to visit your deployed application

## Step 4: Custom Domain (Optional)

If you want to use a custom domain instead of the default GitHub Pages URL:

1. In the repository settings, under GitHub Pages, enter your custom domain
2. Configure your domain's DNS settings:
   - For an apex domain (example.com), add A records pointing to GitHub Pages IP addresses
   - For a subdomain (app.example.com), add a CNAME record pointing to yourusername.github.io

## Troubleshooting

If your deployment fails:

1. Check the Actions tab to see the detailed error logs
2. Common issues include:
   - Build errors in your code
   - Missing dependencies
   - Path issues in the vite.config.ts file

If your site deploys but shows 404 errors or doesn't load resources:

1. Make sure all resource paths in your code are relative (starting with `./` rather than `/`)
2. Check that the `base` option in vite.config.ts is set correctly

## Updating Your Site

Each time you push changes to the `main` branch, the GitHub Actions workflow will automatically build and deploy the updated site.

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#github-pages)
