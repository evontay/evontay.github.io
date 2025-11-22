// Simple Header Loader for Blog & Portfolio Pages

async function loadHeader() {
  try {
    // Determine the correct path based on current page location
    const path = window.location.pathname;
    let basePath = '';

    // Detect folder depth
    if (path.includes('/blog/posts/') || path.includes('/portfolio/')) {
      basePath = '../../';
    } else if (path.includes('/blog/')) {
      basePath = '../';
    }

    const response = await fetch(basePath + 'header.html');
    const html = await response.text();

    const placeholder = document.getElementById('header-placeholder');
    if (placeholder) {
      placeholder.innerHTML = html;

      // Fix image paths
      const images = placeholder.querySelectorAll('img');
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src && src.startsWith('../img/')) {
          img.setAttribute('src', basePath + 'img/' + src.replace('../img/', ''));
        }
      });

      // Fix link paths
      const links = placeholder.querySelectorAll('a');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('../')) {
          link.setAttribute('href', basePath + href.replace('../', ''));
        }
      });
    }
  } catch (error) {
    console.error('Error loading header:', error);
  }
}

// Load when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadHeader);
} else {
  loadHeader();
}
