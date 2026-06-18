const searchInput = document.getElementById("searchInput");
const productsGrid = document.getElementById("productsGrid");
const cartCount = document.getElementById("cartCount");
const categoryFilters = document.getElementById("categoryFilters");
const filtersAside = document.querySelector(".filters");

let allProducts = [];
let selectedCategory = "Todos";
let selectedPrice = "Todos";
let selectedStock = "Todos";

function getCart() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + item.cantidad, 0);
    if (cartCount) cartCount.textContent = total;
}

function addToCart(productId, nombre, precio, stock, imagenUrl) {
    if (stock <= 0) {
        showToast('Producto sin stock disponible', 'error');
        return;
    }
    let cart = getCart();
    const existing = cart.find(item => item.idProducto === productId);
    if (existing) {
        if (existing.cantidad >= stock) {
            showToast('Stock máximo alcanzado', 'error');
            return;
        }
        existing.cantidad += 1;
    } else {
        cart.push({ idProducto: productId, nombre, precio, stock, cantidad: 1, imagenUrl: imagenUrl || null });
    }
    saveCart(cart);
    showToast(`"${nombre}" agregado al carrito`, 'success');
}

function matchesPrice(price, range) {
    if (range === "Todos") return true;
    if (range === "0-500") return price >= 0 && price <= 500;
    if (range === "500-1500") return price > 500 && price <= 1500;
    if (range === "1500-3000") return price > 1500 && price <= 3000;
    if (range === "3000") return price > 3000;
    return true;
}

function renderProducts() {
    const search = searchInput.value.trim().toLowerCase();
    const filtered = allProducts.filter(p => {
        const name = (p.nombre || '').toLowerCase();
        const category = p.nombreCategoria || p.categoria?.nombre || '';
        const bySearch = name.includes(search) || category.toLowerCase().includes(search);
        const byCategory = selectedCategory === "Todos" || category === selectedCategory;
        const byPrice = matchesPrice(Number(p.precio), selectedPrice);
        const stock = p.stock ?? 0;
        const byStock = selectedStock === "Todos" || (selectedStock === "con" && stock > 0) || (selectedStock === "sin" && stock === 0);
        return bySearch && byCategory && byPrice && byStock;
    });

    if (filtered.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">No se encontraron productos para los filtros seleccionados.</p>';
        return;
    }

    productsGrid.innerHTML = filtered.map(p => {
        const imgHtml = p.imagenUrl
            ? `<img src="${p.imagenUrl}" alt="${p.nombre}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
            : '📦';
        return `
        <article class="product-card" data-product-id="${p.idProducto}" data-name="${p.nombre}" data-category="${p.nombreCategoria || p.categoria?.nombre || ''}" data-price="${p.precio}" data-stock="${p.stock > 0 ? 'con' : 'sin'}">
            <div class="product-image" style="overflow:hidden;">${imgHtml}</div>
            <h3>${p.nombre}</h3>
            <p>${p.nombreCategoria || p.categoria?.nombre || ''}${p.nombreProveedor || p.proveedor?.nombre ? ' · ' + (p.nombreProveedor || p.proveedor?.nombre) : ''}</p>
            <div class="product-bottom">
                <div>
                    <strong>S/ ${Number(p.precio).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
                    <small>${p.stock > 0 ? 'En stock · ' + p.stock + ' und.' : 'Sin stock'}</small>
                </div>
                <button type="button" class="add-btn" data-id="${p.idProducto}" data-nombre="${p.nombre}" data-precio="${p.precio}" data-stock="${p.stock}" data-imagen="${p.imagenUrl || ''}">+ Agregar</button>
            </div>
        </article>`;
    }).join('');
}

async function loadCategories() {
    try {
        const res = await fetch("/api/categorias");
        if (!res.ok) return;
        const cats = await res.json();
        const container = categoryFilters;
        if (!container) return;
        container.innerHTML = '<h3>CATEGORIAS</h3>';
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-option active';
        allBtn.dataset.category = 'Todos';
        allBtn.textContent = 'Todos';
        container.appendChild(allBtn);
        cats.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'filter-option';
            btn.dataset.category = c.nombre;
            btn.textContent = c.nombre;
            container.appendChild(btn);
        });
    } catch (_) {}
}

async function loadProducts() {
    try {
        const res = await fetch("/api/productos");
        if (!res.ok) {
            productsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:40px;color:#e53e3e;">Error al cargar productos (${res.status}). Por favor, recarga la página.</p>`;
            return;
        }
        allProducts = await res.json();
        renderProducts();
    } catch (e) {
        productsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#e53e3e;">Error de conexión con el servidor. Por favor, recarga la página.</p>';
    }
}

filtersAside.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-option');
    if (!btn) return;
    const group = btn.closest('.filter-group');
    if (!group) return;
    group.querySelectorAll('.filter-option').forEach(item => item.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.category !== undefined) selectedCategory = btn.dataset.category;
    if (btn.dataset.price !== undefined) selectedPrice = btn.dataset.price;
    if (btn.dataset.stock !== undefined) selectedStock = btn.dataset.stock;
    renderProducts();
});

productsGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-btn');
    if (!btn) return;
    addToCart(Number(btn.dataset.id), btn.dataset.nombre, Number(btn.dataset.precio), Number(btn.dataset.stock), btn.dataset.imagen || null);
});

searchInput.addEventListener("input", renderProducts);

updateCartCount();
loadCategories();
loadProducts();