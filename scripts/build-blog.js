const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { marked } = require('marked');
const fs = require('fs');
const path = require('path');

// Individual blog post template
const blogTemplate = (title, date, content, excerpt, featuredImage, imageCaption, tags) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${excerpt || ''}">
    <title>${title} - Evon Tay</title>

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css?family=Crimson+Text:400,400i,600,600i,700,700i" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Raleway:400,600,700,800,900" rel="stylesheet">

    <!-- Styles -->
    <link rel="stylesheet" href="../../reset.css">
    <link rel="stylesheet" href="../../app.css">
    <link rel="stylesheet" href="../blog-post.css">
</head>
<body>
    <!-- Header -->
    <div class="blog-nav">
        <a href="../../index.html">← Back to Home</a>
    </div>
    <header class="blog-header">
        <a href="../../index.html">
            <img src="../../img/evontay-logo-circle.svg" alt="Evon Tay" class="blog-logo">
        </a>
    </header>

    <div class="blog-post-wrap">
        <a href="../index.html" class="back-link">← Back to Field Notes</a>

        <article>
            <header class="blog-post-header">
                <h1>${title}</h1>
                <time datetime="${date}">${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                ${tags && tags.length > 0 ? `
                <div class="post-tags">
                    ${tags.map(tag => `<span class="tag">${tag}</span>`).join('\n                    ')}
                </div>` : ''}
            </header>
            ${featuredImage ? `
            <figure class="featured-image-wrapper">
                <img src="${featuredImage}" alt="${title}" class="featured-image">
                ${imageCaption ? `<figcaption>${imageCaption}</figcaption>` : ''}
            </figure>` : ''}

            <div class="blog-post-content">
                ${content}
            </div>

            <footer class="blog-post-footer">
                <a href="../index.html">← Back to all posts</a>
            </footer>
        </article>
    </div>

    <!-- Footer -->
    <footer class="site-footer">
        <h5>Follow me</h5>
        <ul class="social">
            <li><a target="_blank" href="https://github.com/evontay"><img src="../../img/github.svg" alt="GitHub"></a></li>
            <li><a target="_blank" href="https://www.linkedin.com/in/evontay"><img src="../../img/linkedin.svg" alt="LinkedIn"></a></li>
            <li><a target="_blank" href="https://twitter.com/fumblies"><img src="../../img/twitter.svg" alt="Twitter"></a></li>
            <li><a target="_blank" href="https://dribbble.com/fumblies"><img src="../../img/dribbble.svg" alt="Dribbble"></a></li>
            <li><a target="_blank" href="https://www.behance.net/fumblies"><img src="../../img/behance.svg" alt="Behance"></a></li>
            <li><a target="_blank" href="https://medium.com/@fumblies"><img src="../../img/medium.svg" alt="Medium"></a></li>
        </ul>
        <p class="footer-info">Built with care © ${new Date().getFullYear()} Evon Tay</p>
    </footer>
</body>
</html>`;

// Blog listing page template
const blogListingTemplate = (posts) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Field Notes - Evon Tay</title>

    <!-- favicons -->
    <link rel="icon" type="image/png" href="../img/favicon-32x32.png" sizes="32x32">
    <link rel="icon" type="image/png" href="../img/favicon-16x16.png" sizes="16x16">

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css?family=Crimson+Text:400,400i,600,600i,700,700i" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Raleway:400,600,700,800,900" rel="stylesheet">

    <!-- Styles -->
    <link rel="stylesheet" href="../reset.css">
    <link rel="stylesheet" href="../app.css">
</head>
<body>
    <div class="blog-page-wrap">
        <div class="blog-nav">
            <a href="../index.html">← Back to Home</a>
        </div>

        <header class="blog-header">
            <a href="../index.html">
                <img src="../img/evontay-logo-circle.svg" alt="Evon Tay" class="blog-logo">
            </a>

            <h1>Field Notes</h1>
            <p>Observations and reflections on my practice</p>
            <div class="st"></div>
        </header>

        <main>
            ${posts.length > 0 ? `<div class="posts">
                ${posts.map(post => `<article class="post-preview">
                    ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${post.title}" class="post-thumbnail">` : ''}
                    <div class="post-content">
                        <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
                        <time datetime="${post.date}">${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                        <p>${post.excerpt || ''}</p>
                        <a href="posts/${post.slug}.html" class="read-more">Read more →</a>
                    </div>
                </article>`).join('\n                ')}
            </div>` : '<p>No blog posts yet. Check back soon!</p>'}
        </main>

        <footer class="blog-footer">
            <ul class="social">
                <li><a target="_blank" href="https://github.com/evontay"><img src="../img/github.svg" alt="GitHub"></a></li>
                <li><a target="_blank" href="https://www.linkedin.com/in/evontay"><img src="../img/linkedin.svg" alt="LinkedIn"></a></li>
                <li><a target="_blank" href="https://twitter.com/fumblies"><img src="../img/twitter.svg" alt="Twitter"></a></li>
                <li><a target="_blank" href="https://dribbble.com/fumblies"><img src="../img/dribbble.svg" alt="Dribbble"></a></li>
                <li><a target="_blank" href="https://www.behance.net/fumblies"><img src="../img/behance.svg" alt="Behance"></a></li>
                <li><a target="_blank" href="https://medium.com/@fumblies"><img src="../img/medium.svg" alt="Medium"></a></li>
            </ul>
            <p>Built with care © ${new Date().getFullYear()} Evon Tay</p>
        </footer>
    </div>
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
        // Get properties with fallbacks for different naming conventions
        const titleProp = page.properties.Title || page.properties.title || page.properties.Name || page.properties.name;
        const slugProp = page.properties.Slug || page.properties.slug;
        const dateProp = page.properties.Date || page.properties.date;
        const excerptProp = page.properties.Excerpt || page.properties.excerpt;
        const featuredImageProp = page.properties['Featured Image'] || page.properties['featured image'] || page.properties.Image || page.properties.image;
        const imageCaptionProp = page.properties['Image Caption'] || page.properties['image caption'] || page.properties.Caption || page.properties.caption;
        const tagsProp = page.properties.Tags || page.properties.tags;

        // Extract values
        const title = titleProp?.title?.[0]?.plain_text || 'Untitled';
        const slug = slugProp?.rich_text?.[0]?.plain_text || slugProp?.title?.[0]?.plain_text || 'untitled';
        const date = dateProp?.date?.start || new Date().toISOString();
        const excerpt = excerptProp?.rich_text?.[0]?.plain_text || '';
        const featuredImage = featuredImageProp?.url || featuredImageProp?.rich_text?.[0]?.plain_text || '';
        const imageCaption = imageCaptionProp?.rich_text?.[0]?.plain_text || '';
        const tags = tagsProp?.multi_select?.map(tag => tag.name) || [];

        console.log(`Processing: ${title} (${slug})`);
        if (featuredImage) console.log(`  Featured image: ${featuredImage}`);
        if (imageCaption) console.log(`  Image caption: ${imageCaption}`);
        if (tags.length > 0) console.log(`  Tags: ${tags.join(', ')}`);

        // Convert Notion content to HTML
        const mdblocks = await n2m.pageToMarkdown(page.id);
        const mdString = n2m.toMarkdownString(mdblocks);
        const htmlContent = marked.parse(mdString.parent || mdString);

        // Generate HTML file
        const html = blogTemplate(title, date, htmlContent, excerpt, featuredImage, imageCaption, tags);
        const filePath = path.join(postsDir, `${slug}.html`);
        fs.writeFileSync(filePath, html);
        console.log(`  Created ${slug}.html`);

        posts.push({ title, slug, date, excerpt, featuredImage, imageCaption, tags });
      } catch (error) {
        console.error(`Error processing post:`, error.message);
      }
    }

    // Generate listing page
    console.log('Generating blog listing page...');
    const listingHtml = blogListingTemplate(posts);
    fs.writeFileSync(path.join(blogDir, 'index.html'), listingHtml);

    // Generate JSON data for homepage
    console.log('Generating posts data JSON...');
    fs.writeFileSync(path.join(blogDir, 'posts-data.json'), JSON.stringify(posts, null, 2));

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
