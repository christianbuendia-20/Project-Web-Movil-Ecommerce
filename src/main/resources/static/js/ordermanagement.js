async function updateOrderStatus(orderId, newStatus) {
    try {
        const res = await fetch(`/api/admin/ventas/${orderId}/estado`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ estado: newStatus })
        });
        if (res.ok) {
            showToast(`Pedido #${orderId} actualizado a ${newStatus}`, 'success');
            return true;
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.mensaje || "Error al actualizar pedido", 'error');
            return false;
        }
    } catch (e) {
        showToast("Error de conexión con el servidor", 'error');
        return false;
    }
}

const STATE_ORDER = ['PENDIENTE', 'PAGADA', 'ENVIADA', 'ENTREGADA', 'CANCELADA'];

function getNextState(currentState) {
    const idx = STATE_ORDER.indexOf(currentState);
    if (idx === -1 || idx >= STATE_ORDER.length - 2) return null;
    return STATE_ORDER[idx + 1];
}

async function loadOrders() {
    try {
        const res = await fetch("/api/admin/ventas", { headers: getAuthHeaders() });
        if (!res.ok) {
            const tbody = document.getElementById("orderTableBody");
            if (tbody) tbody.innerHTML = `<tr><td colspan="7">Error al cargar pedidos (${res.status})</td></tr>`;
            return;
        }
        const orders = await res.json();
        const tbody = document.getElementById("orderTableBody");
        if (!tbody) return;
        if (!Array.isArray(orders) || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No hay pedidos registrados</td></tr>';
            return;
        }
        tbody.innerHTML = orders.map(o => {
            const estado = o.estado || 'PENDIENTE';
            const nextState = getNextState(estado);
            const clienteNombre = o.cliente?.nombres ? o.cliente.nombres + ' ' + (o.cliente.apellidos || '') : (o.clienteNombre || 'Cliente #' + o.idCliente);
            const detalles = Array.isArray(o.detalles) ? o.detalles : (o.ventaDetalles || []);
            return `
            <tr>
                <td><a href="#">ORD-${String(o.idVenta).padStart(4, '0')}</a></td>
                <td>${clienteNombre}</td>
                <td>${o.fecha ? new Date(o.fecha).toLocaleDateString() : '-'}</td>
                <td>${detalles.length > 0 ? detalles.length + ' producto(s)' : '-'}</td>
                <td><span class="badge-status ${(estado).toLowerCase().replace(/_/g, '-')}">${estado}</span></td>
                <td>S/ ${Number(o.total || 0).toFixed(2)}</td>
                <td>
                    ${nextState ? `
                        <button class="complete-btn" data-order-id="${o.idVenta}" data-status="${estado}">
                            Avanzar a ${nextState}
                        </button>
                    ` : `<span class="badge-status ${estado.toLowerCase().replace(/_/g, '-')}">${estado}</span>`}
                </td>
            </tr>`;
        }).join('');

        document.querySelectorAll(".complete-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const orderId = btn.dataset.orderId;
                const currentStatus = btn.dataset.status;
                const nextState = getNextState(currentStatus);
                if (!nextState) return;
                const confirmed = await showConfirm(`¿Avanzar pedido #${orderId} a <strong>${nextState}</strong>?`, 'success', 'Confirmar');
                if (confirmed && await updateOrderStatus(orderId, nextState)) {
                    loadOrders();
                }
            });
        });
    } catch (e) {
        showToast("Error al cargar pedidos: " + e.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', loadOrders);