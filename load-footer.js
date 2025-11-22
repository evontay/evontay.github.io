// Simple Footer Loader for Blog & Portfolio Pages

async function loadFooter() {
  try {
    // Determine the correct path based on current page location
    const path = window.location.pathname;
    let basePath = '';

    // Detect folder depth
    if (path.includes('/blog/posts/')) {
      basePath = '../../';
    } else if (path.includes('/blog/') || path.includes('/portfolio/')) {
      basePath = '../';
    }

    const response = await fetch(basePath + 'footer.html');
    const html = await response.text();

    const placeholder = document.getElementById('footer-placeholder');
    if (placeholder) {
      placeholder.innerHTML = html;

      // Fix image paths using data-img attribute
      const images = placeholder.querySelectorAll('img[data-img]');
      images.forEach(img => {
        const imgName = img.getAttribute('data-img');
        img.setAttribute('src', basePath + 'img/' + imgName);
      });
    }
  } catch (error) {
    console.error('Error loading footer:', error);
  }
}

// Load when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFooter);
} else {
  loadFooter();
}
