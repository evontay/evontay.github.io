const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { marked } = require('marked');
const fs = require('fs');
const path = require('path');

const blogTemplate = (title, date, content, excerpt, featuredImage) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${excerpt || ''}">
    <title>${title} - Evon Tay</title>
    <link rel="stylesheet" href="../../reset.css">
    <link rel="stylesheet" href="../../app.css">
</head>
<body>
    <header>
        <nav>
            <a href="../../index.html">Home</a>
            <a href="../index.html">Blog</a>
        </nav>
    </header>
    <main class="blog-post">
        <article>
            <h1>${title}</h1>
            <time datetime="${date}">${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
            ${featuredImage ? `<img src="${featuredImage}" alt="${title}" class="featured-image">` : ''}
            <div class="content">${content}</div>
        </article>
    </main>
    <footer>
        <p>&copy; ${new Date().getFullYear()} Evon Tay</p>
    </footer>
</body>
</html>`;

const blogListingTemplate = (posts) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog - Evon Tay</title>
    <link rel="stylesheet" href="../reset.css">
    <link rel="stylesheet" href="../app.css">
</head>
<body>
    <header>
        <nav>
            <a href="../index.html">Home</a>
            <a href="index.html">Blog</a>
        </nav>
    </header>
    <main class="blog-listing">
        <h1>Blog</h1>
        ${posts.length > 0 ? `<div class="posts">${posts.map(post => `<article class="post-preview">${post.featuredImage ? `<img src="${post.featuredImage}" alt="${post.title}" class="post-thumbnail">` : ''}<div class="post-content"><h2><a href="posts/${post.slug}.html">${post.title}</a></h2><time datetime="${post.date}">${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time><p>${post.excerpt || ''}</p><a href="posts/${post.slug}.html" class="read-more">Read more →</a></div></article>`).join('\n')}</div>` : '<p>No blog posts yet. Check back soon!</p>'}
    </main>
    <footer>
        <p>&copy; ${new Date().getFullYear()} Evon Tay</p>
    </footer>
</body>
</html>`;

async function buildBlog() {
  try {
    console.log('Starting blog build...');
    if (!process.env.NOTION_API_KEY) {
      throw new Error('NOTION_API_KEY environment variable is not set');
    }
    if (!process.env.NOTION_DATABASE_ID) {
      throw new Error('NOTION_DATABASE_ID environment variable is not set');
    }
    console.log('Notion API Key: Set');
    console.log('Database ID: Set');
    console.log('Initializing Notion client...');
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const n2m = new NotionToMarkdown({ notionClient: notion });
    console.log('Fetching posts from Notion...');
    const databaseId = process.env.NOTION_DATABASE_ID.replace(/-/g, '');
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: { property: 'Published', checkbox: { equals: true } },
      sorts: [{ property: 'Date', direction: 'descending' }],
    });
    console.log(`Found ${response.results.length} published posts`);
    const posts = [];
    const blogDir = path.join(process.cwd(), 'blog');
    const postsDir = path.join(blogDir, 'posts');
    if (!fs.existsSync(blogDir)) {
      console.log('Creating blog directory...');
      fs.mkdirSync(blogDir);
    }
    if (!fs.existsSync(postsDir)) {
      console.log('Creating posts directory...');
      fs.mkdirSync(postsDir);
    }
    for (const page of response.results) {
      try {
        const titleProp = page.properties.Title || page.properties.title || page.properties.Name || page.properties.name;
        const slugProp = page.properties.Slug || page.properties.slug;
        const dateProp = page.properties.Date || page.properties.date;
        const excerptProp = page.properties.Excerpt || page.properties.excerpt;
        const featuredImageProp = page.properties['Featured Image'] || page.properties['featured image'] || page.properties.Image || page.properties.image;
        const title = titleProp?.title?.[0]?.plain_text || 'Untitled';
        const slug = slugProp?.rich_text?.[0]?.plain_text || slugProp?.title?.[0]?.plain_text || 'untitled';
        const date = dateProp?.date?.start || new Date().toISOString();
        const excerpt = excerptProp?.rich_text?.[0]?.plain_text || '';
        const featuredImage = featuredImageProp?.url || featuredImageProp?.rich_text?.[0]?.plain_text || '';
        console.log(`Processing: ${title} (${slug})`);
        if (featuredImage) {
          console.log(`  Featured image: ${featuredImage}`);
        }
        const mdblocks = await n2m.pageToMarkdown(page.id);
        const mdString = n2m.toMarkdownString(mdblocks);
        const htmlContent = marked.parse(mdString.parent || mdString);
        const html = blogTemplate(title, date, htmlContent, excerpt, featuredImage);
        const filePath = path.join(postsDir, `${slug}.html`);
        fs.writeFileSync(filePath, html);
        console.log(`  Created ${slug}.html`);
        posts.push({ title, slug, date, excerpt, featuredImage });
      } catch (error) {
        console.error(`Error processing post:`, error.message);
      }
    }
    console.log('Generating blog listing page...');
    const listingHtml = blogListingTemplate(posts);
    fs.writeFileSync(path.join(blogDir, 'index.html'), listingHtml);
    console.log(`\nSuccessfully generated ${posts.length} blog posts!`);
    console.log('Blog listing page created at blog/index.html');
    if (posts.length === 0) {
      console.log('\nNo published posts found. Make sure:');
      console.log('   1. You have posts in your Notion database');
      console.log('   2. The "Published" checkbox is checked');
      console.log('   3. The integration has access to the database');
    }
  } catch (error) {
    console.error('\nError building blog:');
    console.error('Message:', error.message);
    console.error('\nFull error:', error);
    if (error.message.includes('Could not find database')) {
      console.error('\nCheck that:');
      console.error('   1. Database ID is correct');
      console.error('   2. Integration has access to the database (check Connections in Notion)');
    }
    process.exit(1);
  }
}

buildBlog();
