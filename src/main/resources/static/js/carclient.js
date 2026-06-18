const subtotalElement = document.getElementById("subtotal");
const taxElement = document.getElementById("tax");
const totalElement = document.getElementById("total");
const cartCountElement = document.getElementById("cartCount");
const cartItemsSection = document.querySelector(".cart-items");

function getCart() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function formatCurrency(value) {
    return `S/ ${value.toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function renderCart() {
    const cart = getCart();
    if (cart.length === 0) {
        cartItemsSection.innerHTML = `
            <a class="continue-btn" href="/catalogclient">Seguir comprando</a>
            <p style="text-align:center;padding:40px;color:var(--text-secondary);">Tu carrito está vacío</p>
        `;
        updateSummary();
        return;
    }

    let itemsHtml = '<a class="continue-btn" href="/catalogclient">Seguir comprando</a>';
    cart.forEach((item, index) => {
        const imgHtml = item.imagenUrl
            ? `<img src="${item.imagenUrl}" alt="${item.nombre}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
            : '📦';
        itemsHtml += `
            <article class="cart-item" data-product-id="${item.idProducto}" data-price="${item.precio}" data-index="${index}">
                <div class="item-image" style="overflow:hidden;">${imgHtml}</div>
                <div class="item-info">
                    <h2>${item.nombre}</h2>
                    <p>S/ ${Number(item.precio).toFixed(2)} · ${item.stock} und. disponibles</p>
                    <div class="quantity">
                        <button type="button" class="qty-btn minus" data-index="${index}">-</button>
                        <strong class="qty-value">${item.cantidad}</strong>
                        <button type="button" class="qty-btn plus" data-index="${index}">+</button>
                    </div>
                </div>
                <strong class="item-price">${formatCurrency(item.precio * item.cantidad)}</strong>
                <button type="button" class="remove-btn" data-index="${index}">X</button>
            </article>
        `;
    });
    cartItemsSection.innerHTML = itemsHtml;
    updateSummary();
    updateCartCount();
}

function updateSummary() {
    const cart = getCart();
    let subtotal = 0;
    let count = 0;
    cart.forEach(item => {
        subtotal += item.precio * item.cantidad;
        count += item.cantidad;
    });
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    if (subtotalElement) subtotalElement.textContent = formatCurrency(subtotal);
    if (taxElement) taxElement.textContent = formatCurrency(tax);
    if (totalElement) totalElement.textContent = formatCurrency(total);
    if (cartCountElement) cartCountElement.textContent = count;
}

function updateCartCount() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + item.cantidad, 0);
    if (cartCountElement) cartCountElement.textContent = total;
}

cartItemsSection.addEventListener('click', (e) => {
    const cart = getCart();

    const plusBtn = e.target.closest('.plus');
    if (plusBtn) {
        const index = Number(plusBtn.dataset.index);
        if (cart[index]) {
            if (cart[index].cantidad < cart[index].stock) {
                cart[index].cantidad += 1;
                saveCart(cart);
                renderCart();
            } else {
                showToast('Stock máximo alcanzado', 'error');
            }
        }
        return;
    }

    const minusBtn = e.target.closest('.minus');
    if (minusBtn) {
        const index = Number(minusBtn.dataset.index);
        if (cart[index] && cart[index].cantidad > 1) {
            cart[index].cantidad -= 1;
            saveCart(cart);
            renderCart();
        }
        return;
    }

    const removeBtn = e.target.closest('.remove-btn');
    if (removeBtn) {
        const index = Number(removeBtn.dataset.index);
        const item = cart[index];
        if (!item) return;
        showConfirm(`¿Eliminar <strong>${item.nombre}</strong> del carrito?`, 'danger', 'Eliminar').then(confirmed => {
            if (confirmed) {
                cart.splice(index, 1);
                saveCart(cart);
                renderCart();
                showToast(`"${item.nombre}" eliminado del carrito`, 'info');
            }
        });
        return;
    }
});

document.querySelector(".payment-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const userId = getUserId();
    if (!userId) {
        showToast("Debes iniciar sesión para pagar", 'error');
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        showToast("El carrito está vacío", 'error');
        return;
    }

    const totalText = totalElement?.textContent || 'S/ 0.00';
    const confirmed = await showConfirm(
        `¿Confirmar el pedido por <strong>${totalText}</strong>? Serás redirigido a Mercado Pago para completar el pago.`,
        'success', 'Continuar'
    );
    if (!confirmed) return;

    const direccionInput = document.querySelector("input[name='direccion']");
    const ciudadInput = document.querySelector("input[name='ciudad']");
    const direccionEnvio = direccionInput?.value?.trim() || "Dirección no especificada";
    const ciudadEnvio = ciudadInput?.value?.trim() || "Lima";

    const checkoutItems = cart.map(item => ({
        idProducto: item.idProducto,
        cantidad: item.cantidad
    }));

    const submitBtn = document.querySelector(".payment-form button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';
    }

    try {
        // Paso 1: crear la orden
        const checkoutRes = await fetch("/api/ventas/checkout", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                idCliente: Number(userId),
                direccionEnvio,
                ciudadEnvio,
                items: checkoutItems
            })
        });

        if (!checkoutRes.ok) {
            const err = await checkoutRes.json().catch(() => ({}));
            showToast(err.mensaje || "Error al crear el pedido", 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Pagar con Mercado Pago 🔒'; }
            return;
        }

        const venta = await checkoutRes.json();

        // Paso 2: crear preferencia en Mercado Pago
        const prefRes = await fetch("/api/payments/preference", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ idVenta: venta.idVenta })
        });

        if (!prefRes.ok) {
            const err = await prefRes.json().catch(() => ({}));
            showToast(err.mensaje || "Error al conectar con Mercado Pago", 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Pagar con Mercado Pago 🔒'; }
            return;
        }

        const preference = await prefRes.json();

        // Paso 3: redirigir al checkout de Mercado Pago (Sandbox)
        // Marcar que hay un pago en progreso para que Mis Pedidos refresque al volver
        sessionStorage.setItem('postPaymentRefresh', '1');
        window.location.href = preference.checkoutUrl;

    } catch (e) {
        showToast("Error de conexión con el servidor", 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Pagar con Mercado Pago 🔒';
        }
    }
});

renderCart();