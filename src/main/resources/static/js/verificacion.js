// ──────────────────────────────────────────────────────────
// verificacion.js — Verificación de correo electrónico
// ──────────────────────────────────────────────────────────

const EXPIRACION_SEGUNDOS = 15 * 60; // 15 minutos
const COOLDOWN_SEGUNDOS   = 60;      // 1 minuto entre reenvíos

// ── Referencias del DOM ────────────────────────────────────
const digits      = document.querySelectorAll('.otp-digit');
const verifyBtn   = document.getElementById('verifyBtn');
const resendBtn   = document.getElementById('resendBtn');
const msgEl       = document.getElementById('verifyMessage');
const timerEl     = document.getElementById('timerDisplay');
const emailHint   = document.getElementById('emailHint');
const resendCD    = document.getElementById('resendCountdown');
const iconEl      = document.querySelector('.verify-icon');

// ── Recuperar email desde query param o sessionStorage ─────
const params    = new URLSearchParams(window.location.search);
const userEmail = params.get('email') || sessionStorage.getItem('pendingVerifyEmail') || '';

if (userEmail) {
    const masked = userEmail.replace(/(.{2})(.*)(@)/, (_, a, b, at) => a + '*'.repeat(Math.max(2, b.length - 2)) + b.slice(-2) + at);
    emailHint.innerHTML = `Enviamos un código de 6 dígitos a <strong>${masked}</strong>`;
    sessionStorage.setItem('pendingVerifyEmail', userEmail);
}

// ── OTP: manejo de inputs ─────────────────────────────────
digits.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val.slice(-1); // solo 1 dígito
        if (val) {
            input.classList.add('filled');
            if (index < digits.length - 1) digits[index + 1].focus();
        } else {
            input.classList.remove('filled');
        }
        clearMessage();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
            digits[index - 1].focus();
            digits[index - 1].value = '';
            digits[index - 1].classList.remove('filled');
        }
        if (e.key === 'ArrowLeft'  && index > 0)               digits[index - 1].focus();
        if (e.key === 'ArrowRight' && index < digits.length-1) digits[index + 1].focus();
        if (e.key === 'Enter') handleVerify();
    });

    // Pegar código completo desde portapapeles
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        [...text.slice(0, 6)].forEach((char, i) => {
            if (digits[i]) {
                digits[i].value = char;
                digits[i].classList.add('filled');
            }
        });
        const nextEmpty = [...digits].findIndex(d => !d.value);
        (digits[nextEmpty] || digits[5]).focus();
        clearMessage();
    });
});

// Foco automático en el primer campo
digits[0]?.focus();

// ── Leer el código unificado ──────────────────────────────
function getCode() {
    return [...digits].map(d => d.value).join('');
}

// ── Marcar inputs como error ──────────────────────────────
function shakeInputs() {
    digits.forEach(d => {
        d.classList.remove('error');
        void d.offsetWidth; // reflow para reiniciar animación
        d.classList.add('error');
    });
    setTimeout(() => digits.forEach(d => d.classList.remove('error')), 500);
}

function clearMessage() {
    msgEl.textContent = '';
    msgEl.className = 'form-message';
}

function showMessage(text, type = 'error') {
    msgEl.textContent = text;
    msgEl.className = `form-message ${type}`;
}

// ── Temporizador de expiración ────────────────────────────
let timerInterval = null;
let secondsLeft   = EXPIRACION_SEGUNDOS;

function startTimer() {
    clearInterval(timerInterval);
    secondsLeft = EXPIRACION_SEGUNDOS;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        secondsLeft--;
        updateTimerDisplay();
        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            timerEl.textContent = '00:00';
            timerEl.classList.add('urgent');
            showMessage('El código ha expirado. Solicita uno nuevo usando el botón "Reenviar código".', 'error');
            verifyBtn.disabled = true;
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const s = (secondsLeft % 60).toString().padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
    timerEl.classList.toggle('urgent', secondsLeft <= 60);
}

startTimer();

// ── Cooldown para el botón de reenvío ────────────────────
let resendInterval = null;
let resendLeft     = 0;

function startResendCooldown(seconds) {
    resendLeft = seconds;
    resendBtn.disabled = true;
    resendCD.textContent = `(${resendLeft}s)`;

    clearInterval(resendInterval);
    resendInterval = setInterval(() => {
        resendLeft--;
        resendCD.textContent = `(${resendLeft}s)`;
        if (resendLeft <= 0) {
            clearInterval(resendInterval);
            resendBtn.disabled = false;
            resendCD.textContent = '';
        }
    }, 1000);
}

// Iniciar cooldown inicial (el código ya fue enviado al registrarse)
startResendCooldown(COOLDOWN_SEGUNDOS);

// ── Verificar código ──────────────────────────────────────
async function handleVerify() {
    const code = getCode();

    if (code.length < 6) {
        shakeInputs();
        showMessage('Ingresa los 6 dígitos del código.', 'error');
        return;
    }

    if (!userEmail) {
        showMessage('No se encontró el correo. Vuelve a registrarte.', 'error');
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verificando...';
    clearMessage();

    try {
        const res = await fetch('/api/auth/verificar-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, codigo: code })
        });

        const data = await res.json();

        if (res.ok) {
            // ── Éxito ──────────────────────────────────────
            clearInterval(timerInterval);
            clearInterval(resendInterval);

            iconEl.textContent = '✅';
            iconEl.classList.add('success');
            digits.forEach(d => { d.disabled = true; d.classList.add('filled'); });
            resendBtn.disabled = true;

            showMessage(data.mensaje || '¡Cuenta verificada! Redirigiendo al login...', 'success');
            sessionStorage.removeItem('pendingVerifyEmail');

            setTimeout(() => { window.location.href = '/login'; }, 2000);
        } else {
            // ── Error del backend ──────────────────────────
            shakeInputs();
            const msg = data.mensaje || data.error || 'Código incorrecto.';
            showMessage(msg, 'error');
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verificar cuenta';

            // Si el error es por expiración o intentos agotados, permitir reenvío inmediato
            if (msg.includes('expirado') || msg.includes('agotado')) {
                clearInterval(resendInterval);
                resendBtn.disabled = false;
                resendCD.textContent = '';
                verifyBtn.disabled = true;
            }
        }
    } catch (err) {
        showMessage('Error de conexión con el servidor. Intenta nuevamente.', 'error');
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verificar cuenta';
    }
}

// ── Reenviar código ───────────────────────────────────────
async function handleResend() {
    if (!userEmail) {
        showMessage('No se encontró el correo. Vuelve a registrarte.', 'error');
        return;
    }

    resendBtn.disabled = true;
    clearMessage();

    try {
        const res = await fetch('/api/auth/reenviar-codigo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
        });

        const data = await res.json();

        if (res.ok) {
            // Reiniciar todo
            digits.forEach(d => { d.value = ''; d.classList.remove('filled', 'error'); });
            digits[0].focus();
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verificar cuenta';
            timerEl.classList.remove('urgent');

            showMessage(data.mensaje || 'Código reenviado. Revisa tu correo.', 'success');
            startTimer();
            startResendCooldown(COOLDOWN_SEGUNDOS);
        } else {
            const msg = data.mensaje || data.error || 'No se pudo reenviar el código.';
            showMessage(msg, 'error');
            // Cooldown corto si falla (5s)
            startResendCooldown(5);
        }
    } catch (err) {
        showMessage('Error de conexión. Intenta nuevamente.', 'error');
        startResendCooldown(5);
    }
}
