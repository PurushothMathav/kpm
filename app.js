const API_BASE = "https://koreanpornmovie.com/wp-json/wp/v2";
let currentPage = 1;
let currentQuery = "";
let totalPages = 1;

// ---------- POSTS ----------
async function loadPosts(query = "", page = 1) {
  currentQuery = query;
  currentPage = page;

  const url = `${API_BASE}/posts?per_page=12&page=${page}&_embed&${query}`;
  const res = await fetch(url);

  totalPages = parseInt(res.headers.get("X-WP-TotalPages")) || 1;
  const posts = await res.json();

  renderPosts(posts);
  renderPagination();
}

function renderPosts(posts) {
  const results = document.getElementById("results");
  results.innerHTML = "";

  if (!posts || posts.length === 0) {
    results.innerHTML = "<p>No results found.</p>";
    return;
  }

  posts.forEach(post => {
    const img = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "https://via.placeholder.com/300x180?text=No+Image";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${img}" alt="${post.title.rendered}">
      <a href="post.html?id=${post.id}">${post.title.rendered}</a>
    `;
    results.appendChild(card);
  });
}

function renderPagination() {
  const results = document.getElementById("results");
  const pagination = document.createElement("div");
  pagination.className = "pagination";

  let buttons = "";

  if (currentPage > 1) {
    buttons += `<button onclick="loadPosts('${currentQuery}', ${currentPage - 1})">⬅ Prev</button>`;
  }

  buttons += `<span>Page ${currentPage} of ${totalPages}</span>`;

  if (currentPage < totalPages) {
    buttons += `<button onclick="loadPosts('${currentQuery}', ${currentPage + 1})">Next ➡</button>`;
  }

  pagination.innerHTML = buttons;
  results.appendChild(pagination);
}

// ---------- SEARCH ----------
function searchPosts() {
  const query = document.getElementById("searchInput").value;
  loadPosts(`search=${encodeURIComponent(query)}`, 1);
  document.querySelector("h2").innerText = `Search: ${query}`;
}

// ---------- TAGS ----------
let currentTagPage = 1;
let totalTagPages = 1;

// Load tag cloud with pagination
async function loadTagCloud(page = 1) {
  currentTagPage = page;
  const url = `${API_BASE}/tags?per_page=100&page=${page}`;
  const res = await fetch(url);
  totalTagPages = parseInt(res.headers.get("X-WP-TotalPages")) || 1;
  const tags = await res.json();

  const container = document.getElementById("tag-cloud");
  container.innerHTML = "";

  tags.forEach(tag => {
    const link = document.createElement("a");
    link.href = `index.html?tag=${tag.id}`;
    link.className = "tag-item";
    link.innerHTML = `<i class="fa fa-tag"></i> ${tag.name} <span class="tag-count">(${tag.count})</span>`;
    container.appendChild(link);
  });

  renderTagPagination();
}

// Render pagination for tags
function renderTagPagination() {
  const container = document.getElementById("tag-pagination");
  container.innerHTML = "";

  if (totalTagPages <= 1) return;

  if (currentTagPage > 1) {
    container.innerHTML += `<button onclick="loadTagCloud(${currentTagPage - 1})">⬅ Prev</button>`;
  }

  container.innerHTML += `<span>Page ${currentTagPage} of ${totalTagPages}</span>`;

  if (currentTagPage < totalTagPages) {
    container.innerHTML += `<button onclick="loadTagCloud(${currentTagPage + 1})">Next ➡</button>`;
  }
}

function filterByTag(tagId, name) {
  loadPosts(`tags=${tagId}`, 1);
  document.querySelector("h2").innerText = `Tag: ${name}`;
}

// ---------- ACTORS ----------
let currentActorPage = 1;
let totalActorPages = 1;

//load actors with pagination
async function loadAllActors(page = 1) {
  currentActorPage = page;
  const url = `${API_BASE}/actors?per_page=20&page=${page}`;
  const res = await fetch(url);
  totalActorPages = parseInt(res.headers.get("X-WP-TotalPages")) || 1;
  const actors = await res.json();

  const container = document.getElementById("actor-list");
  container.innerHTML = "";

  for (const actor of actors) {
    let imgUrl = "https://via.placeholder.com/300x220?text=No+Image";

    try {
      // Fetch 1 video for this actor
      const postRes = await fetch(`${API_BASE}/posts?actors=${actor.id}&per_page=1&_embed`);
      const posts = await postRes.json();

      if (posts.length > 0) {
        imgUrl = posts[0]._embedded?.["wp:featuredmedia"]?.[0]?.source_url || imgUrl;
      }
    } catch (e) {
      console.warn("No video found for actor:", actor.name);
    }

    const card = document.createElement("div");
    card.className = "actor-card";
    card.innerHTML = `
      <img src="${imgUrl}" alt="${actor.name}">
      <a href="index.html?actor=${actor.id}">${actor.name}</a>
      <div>${actor.count} videos</div>
    `;
    container.appendChild(card);
  }

  renderActorPagination();
}

// Actor pagination
function renderActorPagination() {
  const container = document.getElementById("actor-pagination");
  container.innerHTML = "";

  if (totalActorPages <= 1) return;

  if (currentActorPage > 1) {
    container.innerHTML += `<button onclick="loadAllActors(${currentActorPage - 1})">⬅ Prev</button>`;
  }

  container.innerHTML += `<span>Page ${currentActorPage} of ${totalActorPages}</span>`;

  if (currentActorPage < totalActorPages) {
    container.innerHTML += `<button onclick="loadAllActors(${currentActorPage + 1})">Next ➡</button>`;
  }
}

function filterByActor(actorId, name) {
  loadPosts(`actors=${actorId}`, 1);
  document.querySelector("h2").innerText = `Actor: ${name}`;
}

// ---------- TAXONOMY PAGINATION ----------
function renderTaxPagination(type) {
  const container = document.getElementById(type + "-list");
  const pagination = document.createElement("div");
  pagination.className = "pagination";

  let buttons = "";
  if (currentTaxPage > 1) {
    buttons += `<button onclick="loadAll${capitalize(type)}s(${currentTaxPage - 1})">⬅ Prev</button>`;
  }
  buttons += `<span>Page ${currentTaxPage} of ${totalTaxPages}</span>`;
  if (currentTaxPage < totalTaxPages) {
    buttons += `<button onclick="loadAll${capitalize(type)}s(${currentTaxPage + 1})">Next ➡</button>`;
  }

  pagination.innerHTML = buttons;
  container.appendChild(pagination);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ---------- SINGLE POST ----------
async function loadPost(id) {
  const url = `${API_BASE}/posts/${id}?_embed`;
  const res = await fetch(url);
  const post = await res.json();

  const container = document.getElementById("post-container");
  const img = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";

  const title = post.title.rendered.replace(/<\/?[^>]+(>|$)/g, "");
  const encodedTitle = encodeURIComponent(title);
  const videoUrl = `https://koreanporn.stream/${encodedTitle}.mp4`;
  
  //${img ? `<img src="${img}" alt="" style="max-width:100%; border-radius:8px;">` : ""}

  container.innerHTML = `
    <h2>${title}</h2>
    <video controls preload="metadata">
      <source src="${videoUrl}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    <div>${post.content.rendered}</div>
  `;
}


