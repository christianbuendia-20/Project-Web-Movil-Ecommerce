/* main.js - Common interactions for All Process S.A.C. */

document.addEventListener('DOMContentLoaded', () => {
    initNavigationToggles();
    initModalSystem();
});

function initNavigationToggles() {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    const sidebar = document.getElementById('sidebar');
    const navActions = document.querySelector('.nav-actions') || document.getElementById('topbarActions');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (mainNav) mainNav.classList.toggle('open');
            if (sidebar) sidebar.classList.toggle('open');
            if (navActions) navActions.classList.toggle('open');
            const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', !expanded);
        });
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
    }).format(amount);
}

/* ===== Modal System ===== */

let modalResolve = null;

function initModalSystem() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(html) {
    let overlay = document.getElementById('modalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modalOverlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `<div class="modal-box">${html}</div>`;
    requestAnimationFrame(() => overlay.classList.add('open'));
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('open');
        setTimeout(() => { overlay.innerHTML = ''; }, 300);
    }
    if (modalResolve) {
        modalResolve(false);
        modalResolve = null;
    }
}

function showModal(title, bodyHtml, footerHtml) {
    return new Promise((resolve) => {
        const html = `
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
            ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
        `;
        openModal(html);
    });
}

function showFormModal(title, fieldsHtml, submitLabel = 'Guardar') {
    return new Promise((resolve) => {
        const html = `
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <form class="modal-body" id="modalForm">${fieldsHtml}</form>
            <div class="modal-footer">
                <button type="button" class="button button-light" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="button button-primary" form="modalForm">${submitLabel}</button>
            </div>
        `;
        openModal(html);
        document.getElementById('modalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const data = new FormData(e.target);
            const obj = {};
            data.forEach((v, k) => obj[k] = v);
            closeModal();
            resolve(obj);
        });
    });
}

function showConfirm(message, type = 'warning', confirmLabel = 'Confirmar') {
    return new Promise((resolve) => {
        modalResolve = (val) => resolve(val);
        const icons = { warning: '⚠️', danger: '🗑️', success: '✅', info: 'ℹ️' };
        const html = `
            <div class="modal-header">
                <h2>Confirmar</h2>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div style="text-align:center;padding:8px 0 16px;">
                <div class="confirm-icon ${type}">${icons[type] || 'ℹ️'}</div>
                <p class="confirm-text">${message}</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="button button-light" onclick="closeModal()">Cancelar</button>
                <button type="button" class="button button-primary" id="confirmBtn">${confirmLabel}</button>
            </div>
        `;
        openModal(html);
        document.getElementById('confirmBtn').addEventListener('click', () => {
            if (modalResolve) {
                const resolve = modalResolve;
                modalResolve = null;
                resolve(true);
            }
            closeModal();
        });
    });
}

/* ===== Auth Helpers ===== */

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    return headers;
}

function getUserId() {
    return localStorage.getItem("userId");
}

function getUserRol() {
    return localStorage.getItem("userRol");
}

async function logout() {
    const token = localStorage.getItem("token");
    if (token) {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: { "Authorization": "Bearer " + token }
            });
        } catch (_) {}
    }
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRol");
    window.location.href = "/login";
}

/* ===== Toast System ===== */

function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
