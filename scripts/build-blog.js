const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { marked } = require('marked');
const fs = require('fs');
const path = require('path');

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const n2m = new NotionToMarkdown({ notionClient: notion });

// Blog template
const blogTemplate = (title, date, content, excerpt) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${excerpt}">
    <title>${title} - Evon Tay</title>
    <link rel="stylesheet" href="../../css/style.css">
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
            <time datetime="${date}">${new Date(date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</time>
            
            <div class="content">
                ${content}
            </div>
        </article>
    </main>
    
    <footer>
        <p>&copy; ${new Date().getFullYear()} Evon Tay</p>
    </footer>
</body>
</html>`;

// Blog listing template
const blogListingTemplate = (posts) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog - Evon Tay</title>
    <link rel="stylesheet" href="../css/style.css">
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
        
        <div class="posts">
            ${posts.map(post => `
                <article class="post-preview">
                    <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
                    <time datetime="${post.date}">${new Date(post.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</time>
                    <p>${post.excerpt}</p>
                    <a href="posts/${post.slug}.html" class="read-more">Read more →</a>
                </article>
            `).join('\n')}
        </div>
    </main>
    
    <footer>
        <p>&copy; ${new Date().getFullYear()} Evon Tay</p>
    </footer>
</body>
</html>`;

async function buildBlog() {
  try {
    console.log('Fetching posts from Notion...');
    
    // Query database for published posts
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'Published',
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: 'Date',
          direction: 'descending',
        },
      ],
    });

    const posts = [];

    // Create blog directories if they don't exist
    const blogDir = path.join(process.cwd(), 'blog');
    const postsDir = path.join(blogDir, 'posts');
    
    if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir);
    if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir);

    // Process each post
    for (const page of response.results) {
      const title = page.properties.Title.title[0]?.plain_text || 'Untitled';
      const slug = page.properties.Slug.rich_text[0]?.plain_text || '';
      const date = page.properties.Date.date?.start || new Date().toISOString();
      const excerpt = page.properties.Excerpt?.rich_text[0]?.plain_text || '';

      console.log(`Processing: ${title}`);

      // Get page content
      const mdblocks = await n2m.pageToMarkdown(page.id);
      const mdString = n2m.toMarkdownString(mdblocks);
      const htmlContent = marked.parse(mdString.parent);

      // Generate HTML file
      const html = blogTemplate(title, date, htmlContent, excerpt);
      fs.writeFileSync(
        path.join(postsDir, `${slug}.html`),
        html
      );

      posts.push({ title, slug, date, excerpt });
    }

    // Generate blog listing page
    const listingHtml = blogListingTemplate(posts);
    fs.writeFileSync(
      path.join(blogDir, 'index.html'),
      listingHtml
    );

    console.log(`✅ Generated ${posts.length} blog posts!`);
  } catch (error) {
    console.error('Error building blog:', error);
    process.exit(1);
  }
}

buildBlog();
