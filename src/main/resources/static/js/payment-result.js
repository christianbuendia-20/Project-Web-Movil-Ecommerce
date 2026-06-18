(async () => {
    const params   = new URLSearchParams(window.location.search);
    const paymentId   = params.get('payment_id');
    const externalRef = params.get('external_reference');
    const path        = window.location.pathname;
    const isSuccess   = path.includes('success');
    const isFailure   = path.includes('failure');

    // ── Mostrar número de pedido desde external_reference ──────────────────────
    let ventaIdFromRef = null;
    if (externalRef && externalRef.startsWith('VENTA-')) {
        ventaIdFromRef = externalRef.replace('VENTA-', '');
        const orderEl = document.getElementById('orderId');
        if (orderEl) {
            orderEl.textContent = `Pedido ORD-${ventaIdFromRef.padStart(4, '0')}`;
        }
    }

    // ── 1. Llamar al endpoint de estado para actualizar la BD ───────────────────
    // Esto dispara actualizarEstadoDesdeMP en el backend (actualiza venta + stock)
    let ventaId = ventaIdFromRef;

    if (paymentId) {
        try {
            const res = await fetch(`/api/payments/status/${paymentId}`, {
                headers: getAuthHeaders()
            });

            if (res.ok) {
                const data = await res.json();

                if (data.idVenta) {
                    ventaId = String(data.idVenta);
                    const orderEl = document.getElementById('orderId');
                    if (orderEl && !orderEl.textContent) {
                        orderEl.textContent = `Pedido ORD-${ventaId.padStart(4, '0')}`;
                    }
                }

                if (isSuccess && data.status === 'APROBADO') {
                    localStorage.removeItem('cart');
                    const noteEl = document.getElementById('statusNote');
                    if (noteEl) {
                        noteEl.textContent = '¡Pago verificado y confirmado!';
                        noteEl.style.display = 'block';
                    }
                }
            } else if (isSuccess) {
                // MP redirigió aquí así que el pago fue aprobado, limpiar carrito
                localStorage.removeItem('cart');
            }
        } catch (_) {
            if (isSuccess) localStorage.removeItem('cart');
        }
    }

    // ── 2. En la página de éxito: cargar y mostrar resumen del pedido ───────────
    if (isSuccess && ventaId) {
        try {
            const reciboRes = await fetch(`/api/ventas/${ventaId}/recibo`, {
                headers: getAuthHeaders()
            });

            if (reciboRes.ok) {
                const recibo = await reciboRes.json();
                renderOrderSummary(recibo);
            }
        } catch (_) {
            // No critical — the success message is already shown
        }
    }

    // ── 3. En la página de fallo: activar también el endpoint de estado ─────────
    // (ya se hace arriba con el bloque paymentId)

})();

function renderOrderSummary(recibo) {
    const summaryEl   = document.getElementById('orderSummary');
    const metaEl      = document.getElementById('orderMeta');
    const productsEl  = document.getElementById('orderProducts');
    const totalEl     = document.getElementById('orderTotal');

    if (!summaryEl) return;

    // Formatear fecha
    const fecha = recibo.fecha
        ? new Date(recibo.fecha).toLocaleDateString('es-PE', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : '—';

    const estado = (recibo.estado || 'PENDIENTE_PAGO').replace(/_/g, ' ');
    const metodoPago = {
        MERCADO_PAGO: 'Mercado Pago',
        TARJETA: 'Tarjeta',
        YAPE: 'Yape',
        TRANSFERENCIA: 'Transferencia'
    }[recibo.metodoPago] || recibo.metodoPago || '—';

    metaEl.innerHTML = `
        <span>Fecha:</span>     <strong>${fecha}</strong>
        <span>Estado:</span>    <strong>${estado}</strong>
        <span>Dirección:</span> <strong>${recibo.direccionEnvio || '—'}</strong>
        <span>Ciudad:</span>    <strong>${recibo.ciudadEnvio || '—'}</strong>
        <span>Método pago:</span><strong>${metodoPago}</strong>
    `;

    const detalles = Array.isArray(recibo.detalles) ? recibo.detalles : [];
    productsEl.innerHTML = detalles.map(d => {
        const imgHtml = d.imagenUrl
            ? `<img src="${d.imagenUrl}" alt="${d.nombreProducto || ''}">`
            : `<div class="prod-icon">📦</div>`;
        return `
            <div class="order-product-row">
                ${imgHtml}
                <div class="prod-info">
                    <p>${d.nombreProducto || 'Producto'} × ${d.cantidad}</p>
                    <span style="color:#7d8494;font-size:0.8rem;">S/ ${Number(d.precioUnitario).toFixed(2)} c/u</span>
                </div>
                <span class="prod-price">S/ ${Number(d.subtotal).toFixed(2)}</span>
            </div>`;
    }).join('');

    totalEl.textContent = `S/ ${Number(recibo.total).toFixed(2)}`;
    summaryEl.style.display = 'block';
}
