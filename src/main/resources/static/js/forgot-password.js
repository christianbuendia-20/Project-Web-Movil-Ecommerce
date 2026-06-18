// ── Estado en memoria (nunca en localStorage) ──────────────────────────────
let fpEmail = '';
let fpCodigo = '';

// ── Navegacion entre pasos ──────────────────────────────────────────────────

function openForgotPassword() {
    fpEmail = '';
    fpCodigo = '';
    clearFpState();
    goToFpStep(1);
}

function closeForgotModals() {
    fpEmail = '';
    fpCodigo = '';
    clearFpState();
    ['fp-step-1', 'fp-step-2', 'fp-step-3'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('open');
    });
}

function goToFpStep(n) {
    ['fp-step-1', 'fp-step-2', 'fp-step-3'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('open');
    });
    var target = document.getElementById('fp-step-' + n);
    if (target) target.classList.add('open');
}

function clearFpState() {
    ['fpEmailInput', 'fpCodigoInput', 'fpNuevaPass', 'fpConfirmaPass'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['fpMsg1', 'fpMsg2', 'fpMsg3'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.textContent = ''; el.className = 'form-message'; }
    });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fpSetMsg(id, text, isError) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + (isError ? 'error' : 'success');
}

function fpSetLoading(btnId, loading) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Espera...' : btn.dataset.label;
}

// ── Paso 1: Solicitar codigo ─────────────────────────────────────────────────

async function fpSolicitarReset() {
    var emailInput = document.getElementById('fpEmailInput');
    var email = emailInput ? emailInput.value.trim() : '';
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
        fpSetMsg('fpMsg1', 'Ingresa un correo electronico valido.', true);
        return;
    }

    fpSetLoading('fpBtn1', true);
    try {
        var res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        var data = await res.json();
        if (res.ok) {
            fpEmail = email;
            var display = document.getElementById('fpEmailDisplay');
            if (display) display.textContent = email;
            goToFpStep(2);
        } else {
            fpSetMsg('fpMsg1', data.mensaje || 'Error al enviar el codigo.', true);
        }
    } catch (e) {
        fpSetMsg('fpMsg1', 'Error de conexion. Intenta de nuevo.', true);
    } finally {
        fpSetLoading('fpBtn1', false);
    }
}

// ── Paso 2: Verificar codigo ─────────────────────────────────────────────────

async function fpVerificarCodigo() {
    var codigoInput = document.getElementById('fpCodigoInput');
    var codigo = codigoInput ? codigoInput.value.trim() : '';

    if (!/^[0-9]{6}$/.test(codigo)) {
        fpSetMsg('fpMsg2', 'Ingresa los 6 digitos del codigo recibido.', true);
        return;
    }

    fpSetLoading('fpBtn2', true);
    try {
        var res = await fetch('/api/auth/verify-reset-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: fpEmail, codigo: codigo })
        });
        var data = await res.json();
        if (res.ok) {
            fpCodigo = codigo;
            goToFpStep(3);
        } else {
            fpSetMsg('fpMsg2', data.mensaje || 'Codigo incorrecto.', true);
        }
    } catch (e) {
        fpSetMsg('fpMsg2', 'Error de conexion. Intenta de nuevo.', true);
    } finally {
        fpSetLoading('fpBtn2', false);
    }
}

// ── Paso 3: Cambiar contrasena ───────────────────────────────────────────────

async function fpCambiarPassword() {
    var nuevaPass = document.getElementById('fpNuevaPass');
    var confirmaPass = document.getElementById('fpConfirmaPass');
    var pass1 = nuevaPass ? nuevaPass.value : '';
    var pass2 = confirmaPass ? confirmaPass.value : '';

    if (pass1.length < 6) {
        fpSetMsg('fpMsg3', 'La contrasena debe tener al menos 6 caracteres.', true);
        return;
    }
    if (pass1 !== pass2) {
        fpSetMsg('fpMsg3', 'Las contrasenas no coinciden.', true);
        return;
    }

    fpSetLoading('fpBtn3', true);
    try {
        var res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: fpEmail, codigo: fpCodigo, nuevaPassword: pass1 })
        });
        var data = await res.json();
        if (res.ok) {
            fpSetMsg('fpMsg3', 'Contrasena cambiada exitosamente. Ya puedes iniciar sesion.', false);
            setTimeout(closeForgotModals, 2200);
        } else {
            fpSetMsg('fpMsg3', data.mensaje || 'Error al cambiar la contrasena.', true);
        }
    } catch (e) {
        fpSetMsg('fpMsg3', 'Error de conexion. Intenta de nuevo.', true);
    } finally {
        fpSetLoading('fpBtn3', false);
    }
}

// ── Cerrar modales al hacer clic fuera del modal-box ────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    ['fp-step-1', 'fp-step-2', 'fp-step-3'].forEach(function(id) {
        var overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeForgotModals();
        });
    });

    // Permitir enviar con Enter en el campo de email (paso 1)
    var emailInput = document.getElementById('fpEmailInput');
    if (emailInput) {
        emailInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); fpSolicitarReset(); }
        });
    }

    // Permitir enviar con Enter en el campo de codigo (paso 2)
    var codigoInput = document.getElementById('fpCodigoInput');
    if (codigoInput) {
        codigoInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); fpVerificarCodigo(); }
        });
        // Solo permitir numeros
        codigoInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    }
});
