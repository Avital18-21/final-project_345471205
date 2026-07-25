"use strict";

const API = "https://dummyjson.com";
const app = document.querySelector("#app");
const state = {
  products: [], categories: [], catalogProducts: [], catalogTitle: "The Collection",
  selected: null, view: "home", loading: true, menuOpen: false, categoriesOpen: false, searchOpen: false,
  checkoutOpen: false, query: "", cart: read("aurelle-cart", []),
  user: read("aurelle-current-user", null), stockLevels: read("aurelle-stock-levels", {}), notice: ""
};
let noticeTimer, syncTimer;

const icons = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bag: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  menu: '<path d="M3 7h18M3 12h18M3 17h18"/>', close: '<path d="m5 5 14 14M19 5 5 19"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>'
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${icons[name]}</svg>`;
const money = n => `$${Number(n).toFixed(2)}`;
const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveSession() {
  localStorage.setItem("aurelle-cart", JSON.stringify(state.cart));
  state.user ? localStorage.setItem("aurelle-current-user", JSON.stringify({ ...state.user, cart: state.cart })) : localStorage.removeItem("aurelle-current-user");
  clearTimeout(syncTimer);
  if (state.user) syncTimer = setTimeout(() => storeRequest({ action: "sync-cart", email: state.user.email, password: state.user.password, cart: state.cart }).catch(() => { }), 300);
}
function showNotice(message) { state.notice = message; render(); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { state.notice = ""; render(); }, 2600); }
function go(view) { state.view = view; state.menuOpen = false; state.categoriesOpen = false; state.searchOpen = false; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
const cartCount = () => state.cart.reduce((sum, item) => sum + item.quantity, 0);
const subtotal = () => state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
const productStock = id => Math.max(0, Number(state.stockLevels[id] ?? state.products.find(p => p.id === id)?.stock ?? 0));
function applyStockLevels(levels) {
  Object.entries(levels || {}).forEach(([id, stock]) => state.stockLevels[id] = Math.max(0, Number(stock) || 0));
  const update = product => ({ ...product, stock: productStock(product.id) });
  state.products = state.products.map(update);
  state.catalogProducts = state.catalogProducts.map(update);
  if (state.selected) state.selected = update(state.selected);
  localStorage.setItem("aurelle-stock-levels", JSON.stringify(state.stockLevels));
}
function cartStockError() {
  const item = state.cart.find(entry => entry.quantity > productStock(entry.id));
  return item ? `${item.title} only has ${productStock(item.id)} piece${productStock(item.id) === 1 ? "" : "s"} available` : "";
}

async function loadStore() {
  try {
    const [productResponse, categoryResponse] = await Promise.all([fetch(`${API}/products?limit=0`), fetch(`${API}/products/category-list`)]);
    const productData = await productResponse.json();
    state.categories = await categoryResponse.json();
    const defaults = Object.fromEntries(productData.products.map(product => [product.id, product.stock]));
    let inventory = state.stockLevels;
    try { inventory = (await storeRequest({ action: "load-inventory", defaults })).stockLevels; } catch { /* Use local stock when the server is unavailable. */ }
    state.products = productData.products.map(product => ({ ...product, stock: inventory[product.id] ?? product.stock }));
    state.catalogProducts = [...state.products];
    applyStockLevels(Object.fromEntries(state.products.map(product => [product.id, product.stock])));
  } catch { showNotice("The collection could not be loaded. Please check your connection."); }
  state.loading = false; render();
}

function header() {
  const navCategories = ["beauty", "fragrances", "furniture", "womens-bags", "womens-jewellery"];
  return `<div class="announcement">COMPLIMENTARY DELIVERY ON EVERY ORDER</div><header class="header">
    <button class="mobile-menu icon-button" data-action="menu" aria-label="Open menu">${icon(state.menuOpen ? "close" : "menu")}</button>
    <button class="wordmark" data-go="home">MAISON BRELL'S<span>PARIS</span></button>
    <nav class="nav${state.menuOpen ? " open" : ""}${state.categoriesOpen ? " categories-mode" : ""}">
      <button data-go="home">Home</button>${navCategories.map(c => `<button data-category="${c}">${c.replaceAll("-", " ")}</button>`).join("")}
      <div class="category-picker${state.categoriesOpen ? " open" : ""}"><button class="category-trigger" data-action="categories" aria-expanded="${state.categoriesOpen}">All categories <span>${state.categoriesOpen ? "−" : "+"}</span></button>
      ${state.categoriesOpen ? `<div class="category-glass"><div class="category-glass-head"><small>THE COMPLETE COLLECTION</small><strong>Explore every universe</strong></div><div class="category-links">${state.categories.map(c => `<button data-category="${esc(c)}">${esc(c.replaceAll("-", " "))}</button>`).join("")}</div></div>` : ""}</div>
    </nav><div class="header-actions"><button class="mobile-search-toggle icon-button" data-action="search" aria-label="${state.searchOpen ? "Close search" : "Open search"}" aria-expanded="${state.searchOpen}">${icon("search")}</button><form class="header-search${state.searchOpen ? " open" : ""}" id="search-form"><input value="${esc(state.query)}" placeholder="Search" aria-label="Search products"><button aria-label="Submit search">${icon("search")}</button></form>
    <button class="icon-button account-button${state.user ? " signed-in" : ""}" data-go="${state.user ? "account" : "login"}" aria-label="Account">${icon("user")}${state.user ? `<span>Hello, ${esc(state.user.name.split(" ")[0])}</span>` : ""}</button>
    ${state.user ? '<button class="header-logout" data-action="logout">SIGN OUT</button>' : ""}<button class="icon-button bag-button" data-go="cart" aria-label="Shopping bag">${icon("bag")}${cartCount() ? `<b>${cartCount()}</b>` : ""}</button></div></header>`;
}
function productGrid(items) { return `<div class="product-grid">${items.map(p => `<article class="product-card" data-product="${p.id}"><div class="product-image"><img src="${esc(p.thumbnail)}" alt="${esc(p.title)}">${p.discountPercentage > 10 ? "<span>EXCLUSIVE</span>" : ""}</div><div><p>${esc(p.brand || p.category.replaceAll("-", " "))}</p><h3>${esc(p.title)}</h3><b>${money(p.price)}</b></div></article>`).join("")}</div>`; }
const loading = () => '<div class="loading"><i></i><span>Curating the collection…</span></div>';
function home() {
  const highlights = [
    ["fragrances", "La Collection Privée", "Fragrances", "https://cdn.dummyjson.com/product-images/fragrances/dior-j'adore/1.webp"],
    ["womens-bags", "Objects of Desire", "Handbags", "https://cdn.dummyjson.com/product-images/womens-bags/blue-women's-handbag/1.webp"],
    ["womens-jewellery", "A Quiet Brilliance", "Jewellery", "https://cdn.dummyjson.com/product-images/womens-jewellery/green-crystal-earring/1.webp"]
  ];
  const featured = state.products.filter(p => ["fragrances", "womens-bags", "womens-jewellery", "beauty"].includes(p.category)).slice(0, 8);
  return `<main><section class="hero"><img src="https://cdn.dummyjson.com/product-images/fragrances/dior-j'adore/1.webp" alt="Golden perfume bottle"><div class="hero-copy"><p>THE NEW SIGNATURE</p><h1>L’Or de<br>Brell's</h1><span>An olfactory story of light, flowers and quiet confidence.</span><button data-category="fragrances">DISCOVER THE COLLECTION</button></div><div class="scroll-cue">SCROLL TO EXPLORE <span>↓</span></div></section>
  <section class="intro"><p>THE ART OF SELECTION</p><h2>Exceptional objects,<br><em>chosen with intention.</em></h2><span>Discover a curated world of beauty, design and timeless essentials.</span></section>
  <section class="category-editorial">${highlights.map((c, i) => `<article class="editorial-card${i === 0 ? " large" : ""}" data-category="${c[0]}"><img src="${c[3]}" alt="${c[1]}"><div><small>${c[2]}</small><h3>${c[1]}</h3><button>EXPLORE ${icon("arrow")}</button></div></article>`).join("")}</section>
  <section class="featured"><div class="section-heading"><div><p>CURATED FOR YOU</p><h2>New & Noteworthy</h2></div><button data-action="all-products">VIEW ALL ${icon("arrow")}</button></div>${state.loading ? loading() : productGrid(featured)}</section>
  <section class="service-strip"><div><b>COMPLIMENTARY DELIVERY</b><span>On every Maison Brell's order</span></div><div><b>BEAUTIFULLY PRESENTED</b><span>Every order is carefully wrapped</span></div><div><b>PERSONAL ASSISTANCE</b><span>We are here to guide your selection</span></div></section></main>`;
}
function catalog() { return `<main class="catalog-page"><div class="catalog-head"><p>MAISON BRELL'S</p><h1>${esc(state.catalogTitle)}</h1><span>${state.catalogProducts.length} creations</span></div>${state.loading ? loading() : state.catalogProducts.length ? productGrid(state.catalogProducts) : '<div class="empty">No creations were found. Try another search.</div>'}</main>`; }
function product() {
  const p = state.selected; if (!p) return catalog();
  const availability = p.stock > 0 ? `${p.stock} pieces` : "Out of stock";
  return `<main class="product-page"><button class="back-link" data-go="catalog">&larr; BACK TO COLLECTION</button><div class="product-layout"><div class="product-gallery">${p.images.slice(0, 4).map((img, i) => `<img class="${i === 0 ? "main-image" : ""}" src="${esc(img)}" alt="${esc(p.title)} view ${i + 1}">`).join("")}</div><aside class="product-info"><p>${esc(p.brand || p.category)}</p><h1>${esc(p.title)}</h1><div class="rating">${"&#9733;".repeat(Math.round(p.rating))}<span>${p.rating} / 5</span></div><strong>${money(p.price)}</strong><p class="description">${esc(p.description)}<br>Available: ${availability}</p><button class="primary" data-add="${p.id}" ${p.stock <= 0 ? "disabled" : ""}>${p.stock > 0 ? "ADD TO SHOPPING BAG" : "OUT OF STOCK"}</button><dl><div><dt>Availability</dt><dd>${availability}</dd></div>${p.weight ? `<div><dt>Weight</dt><dd>${p.weight} g</dd></div>` : ""}${p.dimensions ? `<div><dt>Dimensions</dt><dd>${p.dimensions.width} &times; ${p.dimensions.height} &times; ${p.dimensions.depth}</dd></div>` : ""}</dl></aside></div><section class="reviews"><p>THE BRELL'S COMMUNITY</p><h2>Client Reviews</h2>${p.reviews?.length ? p.reviews.map(r => `<article><div><b>${esc(r.reviewerName)}</b><span>${"&#9733;".repeat(r.rating)}</span></div><p>&ldquo;${esc(r.comment)}&rdquo;</p></article>`).join("") : "<p>No reviews yet.</p>"}</section></main>`;
}
function cart() {
  if (!state.cart.length) return `<main class="cart-page"><div class="page-title"><p>YOUR SELECTION</p><h1>Shopping Bag</h1></div><div class="empty"><h2>Your bag is waiting.</h2><p>Explore the collection and discover something exceptional.</p><button class="primary" data-go="home">CONTINUE EXPLORING</button></div></main>`;
  return `<main class="cart-page"><div class="page-title"><p>YOUR SELECTION</p><h1>Shopping Bag</h1></div><div class="cart-layout"><section class="cart-list">${state.cart.map(item => { const stock = productStock(item.id); return `<article><img src="${esc(item.thumbnail)}" alt="${esc(item.title)}"><div class="cart-details"><h2>${esc(item.title)}</h2><p>${money(item.price)} &middot; ${stock > 0 ? `${stock} available` : "Out of stock"}</p><label>Quantity <select data-quantity="${item.id}" ${stock <= 0 ? "disabled" : ""}>${Array.from({ length: Math.min(5, stock) }, (_, i) => i + 1).map(n => `<option ${n === item.quantity ? "selected" : ""}>${n}</option>`).join("")}</select></label><button data-remove="${item.id}">REMOVE</button></div><strong>${money(item.price * item.quantity)}</strong></article>`; }).join("")}</section><aside class="summary"><h2>Order Summary</h2><div><span>Subtotal</span><b>${money(subtotal())}</b></div><div><span>Delivery</span><b>Complimentary</b></div><div class="total"><span>Total</span><b>${money(subtotal())}</b></div><button class="primary" data-action="checkout" ${cartStockError() ? "disabled" : ""}>${cartStockError() ? "OUT OF STOCK" : "PROCEED TO CHECKOUT"}</button><small>Secure demonstration checkout. Never enter a real card number.</small></aside></div></main>`;
}
const field = (label, name, type = "text", value = "", extra = "") => `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" required ${extra}></label>`;
function auth() { const login = state.view === "login"; return `<main class="auth-page"><section><p>MAISON BRELL'S CLIENTS</p><h1>${login ? "Welcome Back" : "Create Your Account"}</h1><span>${login ? "Access your selections and order history." : "A personal space for your bag and previous orders."}</span><form id="${login ? "login-form" : "register-form"}" novalidate>${login ? `${field("Email", "email", "email")}${passwordField()}<button class="primary">SIGN IN</button><small>Demo: demo@aurelle.com / Aurelle123</small>` : `${field("Full name", "name")}${field("Email", "email", "email")}${field("Delivery address", "address")}${passwordField()}<button class="primary">CREATE ACCOUNT</button>`}</form><button class="switch-auth" data-go="${login ? "register" : "login"}">${login ? "New to Maison Brell's? Create an account" : "Already registered? Sign in"}</button></section></main>`; }
function passwordField() { return '<label class="field password-field"><span>Password</span><div><input name="password" type="password" required><button type="button" data-action="password">SHOW</button></div></label>'; }
function account() {
  const u = state.user; if (!u) return '<main class="auth-page"><section><h1>Please sign in</h1><button class="primary" data-go="login">GO TO SIGN IN</button></section></main>';
  return `<main class="account-page"><div class="page-title"><p>PERSONAL SPACE</p><h1>Bonjour, ${esc(u.name.split(" ")[0])}</h1></div><div class="account-grid"><section><h2>Your Details</h2><dl><div><dt>Name</dt><dd>${esc(u.name)}</dd></div><div><dt>Email</dt><dd>${esc(u.email)}</dd></div><div><dt>Delivery address</dt><dd>${esc(u.address)}</dd></div></dl><button data-action="logout">SIGN OUT</button></section><section><h2>Previous Orders</h2>${u.orders?.length ? u.orders.map(o => `<article class="order"><div><b>${esc(o.id)}</b><span>${o.date}</span></div><div>${o.items.map(i => `<span>${i.quantity} × ${esc(i.title)}</span>`).join("")}</div><strong>${money(o.total)}</strong></article>`).join("") : '<p class="muted">Your order history will appear here.</p>'}</section></div></main>`;
}
function footer() { return `<footer><button class="footer-logo" data-go="home">MAISON BRELL'S<span>PARIS</span></button><div><section><b>CLIENT SERVICES</b><a href="mailto:care@aurelle.example">Contact us</a><button data-go="account">My account</button><button data-go="cart">Shopping bag</button></section><section><b>THE MAISON</b><span>Our story</span><span>Craftsmanship</span><span>Careers</span></section><section><b>FOLLOW US</b><span>Instagram</span><span>Pinterest</span><span>TikTok</span></section></div><small>© 2026 MAISON BRELL'S · ACADEMIC DEMONSTRATION STORE</small></footer>`; }
function checkout() { return state.checkoutOpen ? `<div class="modal-backdrop"><section class="checkout-modal"><button class="modal-close" data-action="close-checkout">${icon("close")}</button><p>SECURE DEMONSTRATION</p><h2>Delivery & Payment</h2><form id="checkout-form">${field("Full name", "name", "text", state.user?.name || "")}${field("Delivery address", "address", "text", state.user?.address || "")}${field("Card number (use 4242 4242 4242 4242)", "card", "text", "", 'pattern="[0-9 ]{16,19}"')}<div class="split-fields">${field("Expiry", "expiry", "text", "", 'inputmode="numeric" placeholder="MM/YY" maxlength="5" pattern="(0[1-9]|1[0-2])/\\d{2}"')}${field("CVV", "cvv", "text", "", 'inputmode="numeric" placeholder="123" maxlength="3"')}</div><button class="primary">CONFIRM ${money(subtotal())}</button></form></section></div>` : ""; }
function render() { const views = { home, catalog, product, cart, login: auth, register: auth, account }; app.innerHTML = `<div class="site-shell">${header()}${views[state.view]()}${footer()}${checkout()}${state.notice ? `<div class="toast">${esc(state.notice)}</div>` : ""}</div>`; }

async function openCategory(category) {
  state.loading = true; state.catalogTitle = category.replaceAll("-", " "); state.categoriesOpen = false; state.view = "catalog"; render();
  try { const data = await fetch(`${API}/products/category/${category}`).then(r => r.json()); state.catalogProducts = data.products.map(p => ({ ...p, stock: state.stockLevels[p.id] ?? p.stock })); }
  catch { state.catalogProducts = state.products.filter(p => p.category === category); showNotice("The category could not be refreshed."); }
  state.loading = false; render(); window.scrollTo({ top: 0, behavior: "smooth" });
}
function addToCart(id) {
  const p = state.products.find(product => product.id === id); if (!p) return;
  const existing = state.cart.find(item => item.id === id); if (productStock(id) <= (existing?.quantity || 0)) return showNotice("This creation is currently out of stock");
  existing ? existing.quantity++ : state.cart.push({ id: p.id, title: p.title, thumbnail: p.thumbnail, price: p.price, quantity: 1 }); saveSession(); showNotice(`${p.title} was added to your bag`);
}
function users() { const saved = read("maison-brells-users", []); return saved.some(u => u.email === "demo@aurelle.com") ? saved : [...saved, { name: "Demo Client", email: "demo@aurelle.com", password: "Aurelle123", address: "12 Avenue Montaigne, Paris", orders: [], cart: [] }]; }
function saveUsers(list) { localStorage.setItem("maison-brells-users", JSON.stringify(list)); }
async function storeRequest(body) {
  const response = await fetch("/api/store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.message || "The request could not be completed"); error.stockLevels = result.stockLevels; throw error; }
  return result;
}

app.addEventListener("click", e => {
  const target = e.target.closest("button,[data-category],[data-product]"); if (!target) return;
  if (target.dataset.go) return go(target.dataset.go);
  if (target.dataset.category) return openCategory(target.dataset.category);
  if (target.dataset.product) { state.selected = state.products.find(p => p.id === Number(target.dataset.product)) || state.catalogProducts.find(p => p.id === Number(target.dataset.product)); return go("product"); }
  if (target.dataset.add) return addToCart(Number(target.dataset.add));
  if (target.dataset.remove) { state.cart = state.cart.filter(i => i.id !== Number(target.dataset.remove)); saveSession(); return render(); }
  const action = target.dataset.action;
  if (action === "menu") { state.menuOpen = !state.menuOpen; state.categoriesOpen = false; state.searchOpen = false; render(); }
  if (action === "search") { state.searchOpen = !state.searchOpen; state.menuOpen = false; state.categoriesOpen = false; render(); if (state.searchOpen) setTimeout(() => document.querySelector("#search-form input")?.focus(), 0); }
  if (action === "categories") { state.categoriesOpen = !state.categoriesOpen; state.menuOpen = true; render(); }
  if (action === "all-products") { state.catalogProducts = [...state.products]; state.catalogTitle = "All Products"; go("catalog"); }
  if (action === "checkout") { const error = cartStockError(); if (error) return showNotice(error); state.checkoutOpen = true; render(); }
  if (action === "close-checkout") { state.checkoutOpen = false; render(); }
  if (action === "logout") { state.user = null; state.cart = []; saveSession(); showNotice("You are now signed out"); setTimeout(() => go("home"), 0); }
  if (action === "password") { const input = target.previousElementSibling; input.type = input.type === "password" ? "text" : "password"; target.textContent = input.type === "password" ? "SHOW" : "HIDE"; }
});
app.addEventListener("change", e => { if (e.target.matches("[data-quantity]")) { const item = state.cart.find(i => i.id === Number(e.target.dataset.quantity)); const quantity = Number(e.target.value); if (item && quantity <= productStock(item.id)) item.quantity = quantity; saveSession(); render(); } });
app.addEventListener("input", e => { if (e.target.closest("#search-form")) state.query = e.target.value; if (e.target.name === "expiry") { const d = e.target.value.replace(/\D/g, "").slice(0, 4); e.target.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; } });
app.addEventListener("mousedown", e => { if (e.target.classList.contains("modal-backdrop")) { state.checkoutOpen = false; render(); } });
document.addEventListener("click", e => { if (state.searchOpen && !e.target.closest("#search-form,.mobile-search-toggle")) { state.searchOpen = false; render(); } });
app.addEventListener("submit", async e => {
  e.preventDefault(); const fd = new FormData(e.target);
  if (e.target.id === "search-form") { const query = state.query.trim(); if (!query) return; const terms = query.toLowerCase().split(/\s+/); state.catalogTitle = `Search results for “${query}”`; state.catalogProducts = state.products.filter(p => terms.every(t => [p.title, p.description, p.brand || "", p.category.replaceAll("-", " ")].join(" ").toLowerCase().includes(t.replace(/s$/, "")))); return go("catalog"); }
  if (e.target.id === "login-form") { const email = String(fd.get("email")).trim().toLowerCase(); try { const result = await storeRequest({ action: "login", email, password: fd.get("password") }); state.user = result.user; state.cart = result.user.cart || []; saveSession(); showNotice(`Welcome, ${result.user.name}`); return setTimeout(() => go("account"), 0); } catch (error) { return showNotice(error.message); } }
  if (e.target.id === "register-form") { const email = String(fd.get("email")).trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showNotice("Please enter a valid email address, including @"); const user = { name: String(fd.get("name")).trim(), email, password: String(fd.get("password")), address: String(fd.get("address")).trim(), orders: [], cart: state.cart }; try { const result = await storeRequest({ action: "register", email, user }); state.user = result.user; saveSession(); return go("account"); } catch (error) { return showNotice(error.message); } }
  if (e.target.id === "checkout-form") { if (!e.target.reportValidity()) return; const stockError = cartStockError(); if (stockError) return showNotice(stockError); const order = { id: `AU-${Date.now().toString().slice(-6)}`, date: new Date().toISOString().slice(0, 10), total: subtotal(), items: state.cart.map(item => ({ ...item })) }; try { const result = await storeRequest({ action: "purchase", email: state.user?.email, password: state.user?.password, address: String(fd.get("address")), order }); if (result.user) state.user = result.user; applyStockLevels(result.stockLevels); } catch (error) { if (error.stockLevels) applyStockLevels(error.stockLevels); return showNotice(error.message); } state.cart = []; state.checkoutOpen = false; saveSession(); showNotice("Thank you. Your order is on its way."); return setTimeout(() => go(state.user ? "account" : "home"), 0); }
});

render(); loadStore();
