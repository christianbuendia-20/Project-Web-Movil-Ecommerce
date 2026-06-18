const METODO_LABEL = {
    MERCADO_PAGO: 'Mercado Pago',
    TARJETA: 'Tarjeta',
    YAPE: 'Yape',
    TRANSFERENCIA: 'Transferencia'
};

async function loadOrders() {
    const userId = getUserId();
    if (!userId) {
        document.querySelector('.orders-list').innerHTML =
            '<p style="text-align:center;padding:40px;color:var(--text-secondary);">Inicia sesión para ver tus pedidos</p>';
        return;
    }

    try {
        // Intentar primero el endpoint seguro (sin exponer clienteId en la URL)
        let res = await fetch('/api/ventas/mis-pedidos', { headers: getAuthHeaders() });

        // Fallback al endpoint legacy si el nuevo falla
        if (!res.ok && res.status !== 401 && res.status !== 403) {
            res = await fetch(`/api/ventas/mis-ventas?clienteId=${userId}`, { headers: getAuthHeaders() });
        }

        if (!res.ok) {
            document.querySelector('.orders-list').innerHTML =
                `<p style="text-align:center;padding:40px;color:var(--text-secondary);">Error al cargar pedidos (${res.status})</p>`;
            return;
        }

        const orders = await res.json();
        renderOrders(orders);

    } catch (e) {
        const list = document.querySelector('.orders-list');
        if (list) list.innerHTML =
            `<p style="text-align:center;padding:40px;color:var(--text-secondary);">Error de conexión: ${e.message}</p>`;
    }
}

function renderOrders(orders) {
    const list = document.querySelector('.orders-list');
    if (!list) return;

    if (!Array.isArray(orders) || orders.length === 0) {
        list.innerHTML =
            '<p style="text-align:center;padding:40px;color:var(--text-secondary);">No hay pedidos aún</p>';
        return;
    }

    // Más recientes primero
    const sorted = [...orders].sort((a, b) => {
        if (!a.idVenta || !b.idVenta) return 0;
        return b.idVenta - a.idVenta;
    });

    list.innerHTML = sorted.map(o => {
        const estado      = o.estado || 'PENDIENTE';
        const estadoClass = estado.toLowerCase().replace(/_/g, '-');
        const detalles    = Array.isArray(o.detalles) ? o.detalles : [];
        const metodoPago  = METODO_LABEL[o.metodoPago] || o.metodoPago || '—';

        const fechaStr = o.fecha
            ? new Date(o.fecha).toLocaleDateString('es-PE', {
                year: 'numeric', month: 'short', day: 'numeric'
              })
            : '—';

        const productosHtml = detalles.slice(0, 3).map(d => {
            const iconHtml = d.imagenUrl
                ? `<img src="${d.imagenUrl}" alt="${d.nombreProducto || ''}"
                       style="width:44px;height:44px;object-fit:cover;border-radius:8px;">`
                : `<div class="product-icon">📦</div>`;
            return `
                <div class="order-product">
                    ${iconHtml}
                    <div>
                        <p>${d.nombreProducto || 'Producto'} x${d.cantidad}</p>
                        <strong>S/ ${Number(d.subtotal || 0).toFixed(2)}</strong>
                    </div>
                </div>`;
        }).join('');

        const masProductos = detalles.length > 3
            ? `<p style="padding:0 24px 6px;color:var(--text-secondary);font-size:0.8rem;">
                   +${detalles.length - 3} producto(s) más
               </p>`
            : '';

        const direccionHtml = (o.direccionEnvio || o.ciudadEnvio)
            ? `<div style="padding:4px 24px 6px;color:var(--text-secondary);font-size:0.83rem;">
                   📍 ${[o.direccionEnvio, o.ciudadEnvio].filter(Boolean).join(', ')}
               </div>`
            : '';

        return `
        <article class="order-card" data-order-id="${o.idVenta}">
            <div class="order-header">
                <div>
                    <h2>ORD-${String(o.idVenta).padStart(4, '0')}</h2>
                    <span>${fechaStr}</span>
                </div>
                <strong class="badge ${estadoClass}">${estado.replace(/_/g, ' ')}</strong>
            </div>
            ${productosHtml}
            ${masProductos}
            ${direccionHtml}
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:6px 24px 14px;">
                <span style="color:var(--text-secondary);font-size:0.83rem;">💳 ${metodoPago}</span>
                <strong style="font-weight:900;font-size:1.1rem;color:var(--primary);">
                    S/ ${Number(o.total).toFixed(2)}
                </strong>
            </div>
        </article>`;
    }).join('');
}

// ── Auto-refresh si el usuario viene de la página de pago ──────────────────────
// Comprueba el flag en sessionStorage que carclient.js pone antes de redirigir a MP
function checkPostPaymentRefresh() {
    const postPay = sessionStorage.getItem('postPaymentRefresh');
    if (postPay) {
        sessionStorage.removeItem('postPaymentRefresh');
        // Esperar 1.5 s y recargar para asegurarse de tener datos actualizados
        setTimeout(() => loadOrders(), 1500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    checkPostPaymentRefresh();
});
