const API_BASE = "https://koreanpornmovie.com/wp-json/wp/v2";
let currentPage = 1;
let currentQuery = "";
let totalPages = 1;
let isLoading = false;

// Cache for better performance
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Show loading state
function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '<div class="loading" style="text-align: center; padding: 40px;"><p>Loading...</p></div>';
  }
}

// Cache management
function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data: data,
    timestamp: Date.now()
  });
}

// ---------- POSTS ----------
async function loadPosts(query = "", page = 1) {
  if (isLoading) return;
  
  currentQuery = query;
  currentPage = page;
  isLoading = true;

  const cacheKey = `posts-${query}-${page}`;
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    renderPosts(cachedData.posts);
    totalPages = cachedData.totalPages;
    renderPagination('results');
    isLoading = false;
    return;
  }

  showLoading('results');

  try {
    const url = `${API_BASE}/posts?per_page=12&page=${page}&_embed&${query}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    totalPages = parseInt(res.headers.get("X-WP-TotalPages")) || 1;
    const posts = await res.json();

    setCachedData(cacheKey, { posts, totalPages });
    
    renderPosts(posts);
    renderPagination('results');
  } catch (error) {
    console.error('Error loading posts:', error);
    document.getElementById('results').innerHTML = '<p style="text-align: center; color: #ff6b6b;">Error loading content. Please try again.</p>';
  } finally {
    isLoading = false;
  }
}

function renderPosts(posts) {
  const results = document.getElementById("results");
  results.innerHTML = "";

  if (!posts || posts.length === 0) {
    results.innerHTML = "<p style='text-align: center; color: #ccc; padding: 40px;'>No results found.</p>";
    return;
  }

  const fragment = document.createDocumentFragment();

  posts.forEach(post => {
    const img = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "https://via.placeholder.com/300x200?text=No+Image";
    const card = document.createElement("div");
    card.className = "card";
    
    // Lazy loading for images
    card.innerHTML = `
      <img src="https://via.placeholder.com/300x200?text=Loading..." data-src="${img}" alt="${post.title.rendered}" class="lazy-load">
      <a href="post.html?id=${post.id}">${post.title.rendered}</a>
    `;
    fragment.appendChild(card);
  });

  results.appendChild(fragment);
  
  // Initialize lazy loading
  initLazyLoading();
}

// Lazy loading for images
function initLazyLoading() {
  const images = document.querySelectorAll('.lazy-load');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy-load');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for browsers without IntersectionObserver
    images.forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy-load');
    });
  }
}

function renderPagination(containerId) {
  const container = document.getElementById(containerId);
  let paginationDiv = container.querySelector('.pagination');
  
  if (!paginationDiv) {
    paginationDiv = document.createElement("div");
    paginationDiv.className = "pagination";
    container.appendChild(paginationDiv);
  }

  let buttons = "";

  // Previous button
  if (currentPage > 1) {
    buttons += `<button onclick="loadPosts('${currentQuery}', ${currentPage - 1})">← Prev</button>`;
  }

  // Page info
  buttons += `<span>Page ${currentPage} of ${totalPages}</span>`;

  // Next button
  if (currentPage < totalPages) {
    buttons += `<button onclick="loadPosts('${currentQuery}', ${currentPage + 1})">Next →</button>`;
  }

  paginationDiv.innerHTML = buttons;
}

// ---------- SEARCH ----------
const debouncedSearch = debounce(() => {
  const query = document.getElementById("searchInput").value.trim();
  if (query) {
    loadPosts(`search=${encodeURIComponent(query)}`, 1);
    document.querySelector("h2").innerText = `Search: ${query}`;
  } else {
    loadPosts();
    document.querySelector("h2").innerText = "Latest Videos";
  }
}, 500);

function searchPosts() {
  debouncedSearch();
}

// Auto-search on input
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debouncedSearch);
  }
});

// ---------- TAGS ----------
let currentTagPage = 1;
let totalTagPages = 1;

async function loadTagCloud(page = 1) {
  if (isLoading) return;
  
  currentTagPage = page;
  const cacheKey = `tags-${page}`;
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    renderTagCloud(cachedData.tags);
    totalTagPages = cachedData.totalPages;
    renderTagPagination();
    return;
  }

  showLoading('tag-cloud');
  isLoading = true;

  try {
    const url = `${API_BASE}/tags?per_page=100&page=${page}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    totalTagPages = parseInt(res.headers.get("X-WP-TotalPages")) || 1;
    const tags = await res.json();

    setCachedData(cacheKey, { tags, totalPages: totalTagPages });
    
    renderTagCloud(tags);
    renderTagPagination();
  } catch (error) {
    console.error('Error loading tags:', error);
    document.getElementById('tag-cloud').innerHTML = '<p style="text-align: center; color: #ff6b6b;">Error loading tags.</p>';
  } finally {
    isLoading = false;
  }
}

function renderTagCloud(tags) {
  const container = document.getElementById("tag-cloud");
  container.innerHTML = "";

  const fragment = document.createDocumentFragment();

  tags.forEach(tag => {
    const link = document.createElement("a");
    link.href = `index.html?tag=${tag.id}`;
    link.className = "tag-item";
    link.innerHTML = `<i class="fa fa-tag"></i> ${tag.name} <span class="tag-count">(${tag.count})</span>`;
    fragment.appendChild(link);
  });

  container.appendChild(fragment);
}

function renderTagPagination() {
  const container = document.getElementById("tag-pagination");
  if (!container) return;
  
  container.innerHTML = "";

  if (totalTagPages <= 1) return;

  if (currentTagPage > 1) {
    container.innerHTML += `<button onclick="loadTagCloud(${currentTagPage - 1})">← Prev</button>`;
  }

  container.innerHTML += `<span>Page ${currentTagPage} of ${totalTagPages}</span>`;

  if (currentTagPage < totalTagPages) {
    container.innerHTML += `<button onclick="loadTagCloud(${currentTagPage + 1})">Next →</button>`;
  }
}

function filterByTag(tagId, name) {
  loadPosts(`tags=${tagId}`, 1);
  document.querySelector("h2").innerText = `Tag: ${name}`;
}

// ---------- ACTORS ----------
let currentActorPage = 1;
let totalActorPages = 1;

async function loadAllActors(page = 1) {
  if (isLoading) return;
  
  currentActorPage = page;
  const cacheKey = `actors-${page}`;
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    renderActors(cachedData.actors);
    totalActorPages = cachedData.totalPages;
    renderActorPagination();
    return;
  }

  showLoading('actor-list');
  isLoading = true;

  try {
    const url = `${API_BASE}/actors?per_page=20&page=${page}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    totalActorPages = parseInt(res.headers.get("X-WP-TotalPages")) || 1;
    const actors = await res.json();

    // Load actor images in batches for better performance
    const actorsWithImages = await loadActorImages(actors);
    
    setCachedData(cacheKey, { actors: actorsWithImages, totalPages: totalActorPages });
    
    renderActors(actorsWithImages);
    renderActorPagination();
  } catch (error) {
    console.error('Error loading actors:', error);
    document.getElementById('actor-list').innerHTML = '<p style="text-align: center; color: #ff6b6b;">Error loading actors.</p>';
  } finally {
    isLoading = false;
  }
}

async function loadActorImages(actors) {
  const promises = actors.map(async (actor) => {
    let imgUrl = "https://via.placeholder.com/300x220?text=No+Image";

    try {
      const postRes = await fetch(`${API_BASE}/posts?actors=${actor.id}&per_page=1&_embed`);
      if (postRes.ok) {
        const posts = await postRes.json();
        if (posts.length > 0) {
          imgUrl = posts[0]._embedded?.["wp:featuredmedia"]?.[0]?.source_url || imgUrl;
        }
      }
    } catch (e) {
      console.warn("No video found for actor:", actor.name);
    }

    return { ...actor, imageUrl: imgUrl };
  });

  return await Promise.all(promises);
}

function renderActors(actors) {
  const container = document.getElementById("actor-list");
  container.innerHTML = "";

  const fragment = document.createDocumentFragment();

  actors.forEach(actor => {
    const card = document.createElement("div");
    card.className = "actor-card";
    card.innerHTML = `
      <img src="https://via.placeholder.com/300x220?text=Loading..." data-src="${actor.imageUrl}" alt="${actor.name}" class="lazy-load">
      <a href="index.html?actor=${actor.id}">${actor.name}</a>
      <div>${actor.count} videos</div>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
  initLazyLoading();
}

function renderActorPagination() {
  const container = document.getElementById("actor-pagination");
  if (!container) return;
  
  container.innerHTML = "";

  if (totalActorPages <= 1) return;

  if (currentActorPage > 1) {
    container.innerHTML += `<button onclick="loadAllActors(${currentActorPage - 1})">← Prev</button>`;
  }

  container.innerHTML += `<span>Page ${currentActorPage} of ${totalActorPages}</span>`;

  if (currentActorPage < totalActorPages) {
    container.innerHTML += `<button onclick="loadAllActors(${currentActorPage + 1})">Next →</button>`;
  }
}

function filterByActor(actorId, name) {
  loadPosts(`actors=${actorId}`, 1);
  document.querySelector("h2").innerText = `Actor: ${name}`;
}

// ---------- SINGLE POST ----------
function decodeHtmlEntities(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

async function loadPost(id) {
  const cacheKey = `post-${id}`;
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    renderPost(cachedData);
    return;
  }

  showLoading('post-container');

  try {
    const url = `${API_BASE}/posts/${id}?_embed`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const post = await res.json();
    setCachedData(cacheKey, post);
    renderPost(post);
  } catch (error) {
    console.error('Error loading post:', error);
    document.getElementById('post-container').innerHTML = '<p style="text-align: center; color: #ff6b6b;">Error loading post.</p>';
  }
}

function renderPost(post) {
  const container = document.getElementById("post-container");

  // Decode HTML entities and clean tags
  let title = decodeHtmlEntities(post.title.rendered.replace(/<\/?[^>]+(>|$)/g, ""));

  // First attempt: replace smart apostrophe with ASCII apostrophe
  let asciiSafeTitle = title
    .replace(/’/g, "'")
    .replace(/ /g, '%20');

  // Fallback: force smart apostrophe → %E2%80%99
  let smartSafeTitle = title
    .replace(/ /g, '%20')
    .replace(/’/g, '%E2%80%99');

  const firstUrl = `https://koreanporn.stream/${asciiSafeTitle}.mp4`;
  const fallbackUrl = `https://koreanporn.stream/${smartSafeTitle}.mp4`;

  container.innerHTML = `
    <h2>${title}</h2>
    <video id="video-player" controls preload="metadata" style="width: 100%; max-height: 500px; border-radius: 10px;">
      <source id="video-source" src="${firstUrl}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    <div style="margin-top: 20px;">${post.content.rendered}</div>
  `;

  const video = document.getElementById("video-player");
  const source = document.getElementById("video-source");

  // Attach error handler to the <source>
  source.addEventListener("error", () => {
    console.warn("First URL failed, trying fallback:", fallbackUrl);
    source.src = fallbackUrl;
    video.load();
    video.play().catch(() => {}); // prevent autoplay block error
  });
}

// ---------- UTILITY FUNCTIONS ----------
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Service Worker for caching (if supported)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Performance optimization: Clear old cache entries
function clearOldCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}

// Clean cache every 10 minutes
setInterval(clearOldCache, 10 * 60 * 1000);

// Error handling for fetch failures
window.addEventListener('online', () => {
  console.log('Connection restored');
  // Retry failed requests if any
});

window.addEventListener('offline', () => {
  console.log('Connection lost');
});

// Smooth scroll for pagination
function smoothScrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Add smooth scroll to pagination buttons
document.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON' && e.target.closest('.pagination')) {
    setTimeout(smoothScrollToTop, 100);
  }
});