const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

let selectedImageFile = null;

function handleImageSelect(input) {
    if (!input.files || !input.files[0]) return;
    selectedImageFile = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.innerHTML = `<img src="${e.target.result}" alt="preview" style="max-width:100%;max-height:110px;border-radius:8px;object-fit:cover;">`;
        }
    };
    reader.readAsDataURL(selectedImageFile);
}

function handleImageDrop(e) {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.innerHTML = `<img src="${ev.target.result}" alt="preview" style="max-width:100%;max-height:110px;border-radius:8px;object-fit:cover;">`;
        }
    };
    reader.readAsDataURL(file);
}

function buildImageZone(currentImgUrl) {
    const previewHtml = currentImgUrl
        ? `<img src="${currentImgUrl}" alt="imagen actual" style="max-width:100%;max-height:110px;border-radius:8px;object-fit:cover;">`
        : `<div style="color:var(--text-secondary);font-size:13px;">📷 Haz clic o arrastra una imagen aquí</div>`;
    return `
        <label class="field">
            <span>Imagen del producto <small style="color:var(--text-secondary);font-weight:400;">(JPG, PNG, WEBP · máx. 5 MB)</small></span>
            <div id="imageUploadZone"
                 style="border:2px dashed var(--field-border);border-radius:var(--radius-field);padding:20px 16px;text-align:center;background:var(--field-bg);cursor:pointer;transition:border-color .2s;"
                 onclick="document.getElementById('imagenFileInput').click()"
                 ondragover="event.preventDefault();this.style.borderColor='var(--primary)'"
                 ondragleave="this.style.borderColor='var(--field-border)'"
                 ondrop="event.preventDefault();this.style.borderColor='var(--field-border)';handleImageDrop(event)">
                <input type="file" id="imagenFileInput" accept=".jpg,.jpeg,.png,.webp" style="display:none" onchange="handleImageSelect(this)">
                <div id="imagePreview">${previewHtml}</div>
            </div>
        </label>`;
}

async function uploadImage(productId) {
    if (!selectedImageFile) return;
    const fd = new FormData();
    fd.append('file', selectedImageFile);
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
        await fetch(`/api/admin/productos/${productId}/imagen`, {
            method: 'POST',
            headers,
            body: fd
        });
    } catch (_) {
        showToast('Error al subir la imagen', 'error');
    }
    selectedImageFile = null;
}

async function loadProducts() {
    const grid = document.getElementById("productGrid");
    try {
        const res = await fetch("/api/admin/productos", { headers: getAuthHeaders() });
        if (!res.ok) {
            const errorText = res.status === 401 || res.status === 403
                ? 'Sin autorización. Inicia sesión como administrador.'
                : `Error al cargar productos (${res.status})`;
            if (grid) grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:40px;color:#e53e3e;">${errorText}</p>`;
            return;
        }
        const products = await res.json();
        if (!grid) return;
        if (!Array.isArray(products) || products.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">No hay productos registrados</p>';
            return;
        }
        grid.innerHTML = products.map(p => {
            const imgHtml = p.imagenUrl
                ? `<img src="${p.imagenUrl}" alt="${p.nombre}" style="width:100%;height:100%;object-fit:cover;">`
                : '📦';
            return `
            <article class="admin-product-card" data-product-id="${p.idProducto}" data-name="${p.nombre}" data-status="${p.activo ? 'activo' : 'inactivo'}">
                <span class="status-badge ${p.activo ? 'active' : 'inactive'}">${p.activo ? 'Activo' : 'Inactivo'}</span>
                <div class="product-image" style="overflow:hidden;">${imgHtml}</div>
                <h2>${p.nombre}</h2>
                <p>${p.categoria?.nombre || p.nombreCategoria || ''} · S/ ${Number(p.precio).toFixed(2)} · ${p.stock} und.</p>
                <div class="admin-product-actions">
                    <button class="edit-product-btn"
                        data-id="${p.idProducto}"
                        data-nombre="${p.nombre}"
                        data-descripcion="${(p.descripcion || '').replace(/"/g, '&quot;')}"
                        data-precio="${p.precio}"
                        data-stock="${p.stock}"
                        data-categoria="${p.categoria?.idCategoria || p.idCategoria || ''}"
                        data-proveedor="${p.proveedor?.idProveedor || p.idProveedor || ''}"
                        data-imagen="${p.imagenUrl || ''}">✏️ Editar</button>
                    <button class="toggle-product-btn" data-id="${p.idProducto}" data-activo="${p.activo}">${p.activo ? '🚫 Desactivar' : '✅ Activar'}</button>
                </div>
            </article>`;
        }).join('');
        filterProducts();
    } catch (e) {
        console.error("loadProducts:", e);
        if (grid) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#e53e3e;">Error de conexión con el servidor</p>';
    }
}

function filterProducts() {
    const search = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    document.querySelectorAll(".admin-product-card").forEach((product) => {
        const name = product.dataset.name.toLowerCase();
        const productStatus = product.dataset.status;
        const matchesSearch = name.includes(search);
        const matchesStatus = status === "todos" || productStatus === status;
        product.classList.toggle("hidden", !(matchesSearch && matchesStatus));
    });
}

searchInput.addEventListener("input", filterProducts);
statusFilter.addEventListener("change", filterProducts);

document.getElementById("productGrid").addEventListener("click", async (e) => {
    const editBtn = e.target.closest('.edit-product-btn');
    if (editBtn) {
        selectedImageFile = null;
        const id = editBtn.dataset.id;
        const data = await showFormModal('Editar Producto', `
            <label class="field">
                <span>Nombre del producto</span>
                <input type="text" name="nombre" value="${editBtn.dataset.nombre}" required>
            </label>
            <label class="field">
                <span>Descripción</span>
                <textarea name="descripcion" style="width:100%;min-height:60px;border:1px solid var(--field-border);border-radius:var(--radius-field);background:var(--field-bg);font:inherit;padding:10px 14px;">${editBtn.dataset.descripcion}</textarea>
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <label class="field">
                    <span>Precio (S/)</span>
                    <input type="number" name="precio" value="${editBtn.dataset.precio}" step="0.01" required>
                </label>
                <label class="field">
                    <span>Stock</span>
                    <input type="number" name="stock" value="${editBtn.dataset.stock}" required>
                </label>
            </div>
            ${buildImageZone(editBtn.dataset.imagen)}
        `, 'Guardar Cambios');
        if (!data) return;
        try {
            const res = await fetch(`/api/admin/productos/${id}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    nombre: data.nombre,
                    descripcion: data.descripcion || '',
                    precio: Number(data.precio),
                    stock: Number(data.stock),
                    categoria: { idCategoria: Number(editBtn.dataset.categoria) || 1 },
                    proveedor: { idProveedor: Number(editBtn.dataset.proveedor) || 1 }
                })
            });
            if (res.ok) {
                if (selectedImageFile) await uploadImage(Number(id));
                showToast(`Producto "${data.nombre}" actualizado`, 'success');
                loadProducts();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.mensaje || "Error al actualizar producto", 'error');
            }
        } catch (e) {
            showToast("Error de conexión", 'error');
        }
        return;
    }

    const toggleBtn = e.target.closest('.toggle-product-btn');
    if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const activo = toggleBtn.dataset.activo === 'true';
        const confirmed = await showConfirm(`${activo ? 'Desactivar' : 'Activar'} producto #${id}?`, 'warning', 'Confirmar');
        if (!confirmed) return;
        try {
            let res;
            if (activo) {
                res = await fetch(`/api/admin/productos/${id}`, {
                    method: "DELETE",
                    headers: getAuthHeaders()
                });
            } else {
                res = await fetch(`/api/admin/productos/${id}/activar`, {
                    method: "PUT",
                    headers: getAuthHeaders()
                });
            }
            if (res.ok) {
                showToast(`Producto ${activo ? 'desactivado' : 'activado'}`, 'success');
                loadProducts();
            } else {
                showToast("Error al cambiar estado", 'error');
            }
        } catch (e) {
            showToast("Error de conexión", 'error');
        }
        return;
    }
});

document.getElementById("newProductBtn").addEventListener("click", async () => {
    selectedImageFile = null;
    const data = await showFormModal('Nuevo Producto', `
        <label class="field">
            <span>Nombre del producto</span>
            <input type="text" name="nombre" placeholder="Nombre del producto" required>
        </label>
        <label class="field">
            <span>Descripción</span>
            <textarea name="descripcion" placeholder="Descripción" style="width:100%;min-height:60px;border:1px solid var(--field-border);border-radius:var(--radius-field);background:var(--field-bg);font:inherit;padding:10px 14px;"></textarea>
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <label class="field">
                <span>Precio (S/)</span>
                <input type="number" name="precio" placeholder="0.00" step="0.01" required>
            </label>
            <label class="field">
                <span>Stock</span>
                <input type="number" name="stock" placeholder="0" required>
            </label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <label class="field">
                <span>Categoría ID</span>
                <input type="number" name="categoriaId" placeholder="1" value="1">
            </label>
            <label class="field">
                <span>Proveedor ID</span>
                <input type="number" name="proveedorId" placeholder="1" value="1">
            </label>
        </div>
        ${buildImageZone(null)}
    `, 'Crear Producto');
    if (!data) return;
    try {
        const res = await fetch("/api/admin/productos", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                nombre: data.nombre,
                descripcion: data.descripcion || '',
                precio: Number(data.precio),
                stock: Number(data.stock),
                categoria: { idCategoria: Number(data.categoriaId) },
                proveedor: { idProveedor: Number(data.proveedorId) }
            })
        });
        if (res.ok) {
            const created = await res.json();
            if (selectedImageFile && created.idProducto) {
                await uploadImage(created.idProducto);
            }
            showToast(`Producto "${data.nombre}" creado`, 'success');
            loadProducts();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.mensaje || "Error al crear producto", 'error');
        }
    } catch (e) {
        showToast("Error de conexión", 'error');
    }
});

document.addEventListener('DOMContentLoaded', loadProducts);
