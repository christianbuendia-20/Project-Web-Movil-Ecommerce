// VALIDACIÓN Y ENVÍO DEL FORMULARIO

const form = document.getElementById("loginForm");
const message = document.getElementById("formMessage");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  message.textContent = "";
  message.classList.remove("success", "error");

  const email = form.elements.correo.value.trim();
  const password = form.elements.password.value;
  const rol = document.querySelector('input[name="rol"]:checked').value;

  if (!email || !password) {
    message.textContent = "Completa todos los campos.";
    message.classList.add("error");
    return;
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    message.textContent = "Ingresa un correo electrónico válido.";
    message.classList.add("error");
    return;
  }

  // Validar longitud de contraseña
  if (password.length < 6) {
    message.textContent = "La contraseña debe tener al menos 6 caracteres.";
    message.classList.add("error");
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: email, 
        contrasenia: password,
        rol: rol 
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      message.textContent = "¡Bienvenido! Redirigiendo...";
      message.classList.add("success");

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userRol", rol);
        // Decodificar JWT para obtener idUsuario
        try {
          const payload = JSON.parse(atob(data.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload.idUsuario) localStorage.setItem("userId", payload.idUsuario);
        } catch (_) {}
      }

      setTimeout(() => {
        window.location.href = data.redirectUrl || getRedirectUrl(rol);
      }, 1500);
    } else if (data.requiresVerification) {
      // La cuenta existe pero no está verificada → redirigir a verificación
      message.innerHTML =
        'Debes verificar tu correo antes de ingresar. ' +
        '<a href="/verificar-email?email=' + encodeURIComponent(email) +
        '" style="color:var(--primary);font-weight:700;">Verificar ahora →</a>';
      message.classList.add("error");
    } else {
      message.textContent = data.error || data.mensaje || "Error al iniciar sesión.";
      message.classList.add("error");
    }
  } catch (err) {
    console.error("Error:", err);
    message.textContent = "Error de conexión con el servidor.";
    message.classList.add("error");
  }
});

// Función para obtener la URL de redirección según el rol
function getRedirectUrl(rol) {
  switch(rol) {
    case "ADMINISTRADOR":
      return "/homeadmin";
    case "VENDEDOR":
      return "/homeworker";
    case "CLIENTE":
          return "/homeclient";
    default:
      return "/";
  }
}

// Limpiar mensajes de error al escribir
form.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    if (message.textContent) {
      message.textContent = "";
      message.classList.remove("success", "error");
    }
  });
});

// MANEJO DE SELECCIÓN DE ROL (Cambio de color)

const rolOptions = document.querySelectorAll('.rol-option');

function updateRolColor(selectedValue) {
    rolOptions.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        const span = option.querySelector('span');

        if (radio.value === selectedValue) {
            option.classList.add('active');
            span.style.background = 'linear-gradient(135deg, #2368f5, #7b2df0)';
            span.style.color = '#fff';
        } else {
            option.classList.remove('active');
            span.style.background = '#f0f1f5';
            span.style.color = '#737789';
        }
    });
}

// Agregar evento click a cada opción de rol
rolOptions.forEach(option => {
    const radio = option.querySelector('input[type="radio"]');

    option.addEventListener('click', function(e) {
        e.stopPropagation();
        radio.checked = true;
        updateRolColor(radio.value);
        console.log('Rol seleccionado:', radio.value);
    });
});

// Inicializar el color para el rol seleccionado por defecto
const defaultChecked = document.querySelector('input[name="rol"]:checked');
if (defaultChecked) {
    updateRolColor(defaultChecked.value);
}