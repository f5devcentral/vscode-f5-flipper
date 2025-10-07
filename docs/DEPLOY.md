# Deploying Documentation to GitHub Pages

This documentation site uses Docsify and is designed to be deployed to GitHub Pages.

## Automatic Deployment

GitHub Pages can automatically deploy from the `/docs` folder on the main branch.

### Setup Steps

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select:
   - **Branch**: `main`
   - **Folder**: `/docs`
4. Click **Save**

GitHub will automatically deploy the documentation site within a few minutes.

## Accessing the Documentation

Once deployed, the documentation will be available at:

```
https://f5devcentral.github.io/vscode-f5-flipper/
```

## Local Development

To preview the documentation locally:

### Option 1: Using Docsify CLI (Recommended)

```bash
# Install docsify-cli globally
npm install -g docsify-cli

# Serve the docs
cd docs
docsify serve

# Open http://localhost:3000
```

### Option 2: Using Python HTTP Server

```bash
cd docs
python -m http.server 3000

# Open http://localhost:3000
```

### Option 3: Using npx

```bash
npx docsify-cli serve docs
```

## Directory Structure

```
docs/
├── index.html              # Docsify configuration
├── README.md               # Homepage
├── _sidebar.md             # Sidebar navigation
├── _navbar.md              # Top navigation
├── .nojekyll               # Prevents GitHub Pages Jekyll processing
├── getting-started/        # Getting started guides
├── features/               # Feature documentation
├── advanced/               # Advanced topics
├── reference/              # Reference documentation
├── contributing/           # Contributor guides
├── a10_architecture.md     # A10 architecture docs
└── a10_configuration_reference.md
```

## Adding New Pages

1. Create a new `.md` file in the appropriate directory
2. Add a link to `_sidebar.md`
3. Commit and push to main branch
4. GitHub Pages will automatically rebuild

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to `/docs` with your domain
2. Configure DNS settings for your domain
3. Enable HTTPS in GitHub Pages settings

## Troubleshooting

### Site Not Loading

- Ensure `.nojekyll` file exists in `/docs`
- Check GitHub Pages settings
- Verify branch and folder settings

### 404 Errors on Subpages

- Docsify uses hash routing by default
- Links should work with the configured setup

### Local Preview Not Working

- Ensure you're serving from the `/docs` directory
- Check that `index.html` exists
- Try different port if 3000 is in use

## Resources

- [Docsify Documentation](https://docsify.js.org/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
