name: Build Blog from Notion

on:
  # Run when you push to main branch
  push:
    branches: [ main ]
  
  # Run on schedule (every hour)
  schedule:
    - cron: '0 * * * *'
  
  # Allow manual trigger
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        npm install @notionhq/client@2.2.13 notion-to-md@3.1.1 marked@9.1.6
    
    - name: Build blog
      env:
        NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
        NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
      run: node scripts/build-blog.js
    
    - name: Commit and push if changed
      run: |
        git config --global user.name 'GitHub Actions'
        git config --global user.email 'actions@github.com'
        git add -A
        git diff --quiet && git diff --staged --quiet || (git commit -m "Update blog posts from Notion" && git push)
