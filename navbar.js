
(function() {
  const s = document.createElement('div'); s.className = 'scanlines';
  const n = document.createElement('div'); n.className = 'noise-overlay';
  if (document.body) {
    document.body.appendChild(s);
    document.body.appendChild(n);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(s);
      document.body.appendChild(n);
    });
  }
})();

const isInsidePagesFolder = window.location.pathname.includes('/pages/');
const homeLink = isInsidePagesFolder ? '../index.html' : 'index.html';
const pagesPrefix = isInsidePagesFolder ? '' : 'pages/';

const navbarHTML = `
<nav class="navbar">
  <div class="nav-inner">
    <div class="nav-brand">
      <span class="brand-short">NUBTK</span>
      <span class="brand-sep">·</span>
      <span class="brand-full">Student Portal</span>
    </div>
    
    <div class="nav-links">
      <a href="${homeLink}" class="nav-link">Home</a>
      <a href="${pagesPrefix}cover.html" class="nav-link">Cover Page</a>
      <a href="${pagesPrefix}routine.html" class="nav-link">Routine</a>
      <a href="${pagesPrefix}teachers.html" class="nav-link">Teacher's Directory</a>
      <a href="${pagesPrefix}index-maker.html" class="nav-link">Index Maker</a>
    </div>
    
    <button class="nav-hamburger" onclick="toggleNav()">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
</nav>
`;

document.body.insertAdjacentHTML('afterbegin', navbarHTML);

window.toggleNav = function() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.classList.toggle('open');
  }
};

setTimeout(() => {
  const currentUrl = window.location.href;
  const links = document.querySelectorAll('.nav-link');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    

    if (href === '../index.html' || href === 'index.html') {
      if (currentUrl.endsWith('/') || currentUrl.endsWith('index.html')) {
        link.classList.add('active');
      }
    } 

    else if (currentUrl.includes(href.replace('../', '').replace('pages/', ''))) {
      link.classList.add('active');
    }
  });
}, 50);
