const form = document.getElementById("registerForm");
const message = document.getElementById("formMessage");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  message.classList.remove("success", "error");

  const nombre = form.elements.nombre.value.trim();
  const apellido = form.elements.apellido.value.trim();
  const email = form.elements.correo.value.trim();
  const telefono = form.elements.telefono.value.trim();
  const password = form.elements.password.value;
  const confirm = form.elements.confirmPassword.value;

  if (!nombre || !apellido || !email || !password || !confirm) {
    message.textContent = "Completa todos los campos obligatorios.";
    message.classList.add("error");
    return;
  }

  if (password.length < 8) {
    message.textContent = "La contraseña debe tener al menos 8 caracteres.";
    message.classList.add("error");
    return;
  }

  if (password !== confirm) {
    message.textContent = "Las contraseñas no coinciden.";
    message.classList.add("error");
    return;
  }

  try {
    const res = await fetch("/api/usuarios/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        nombres: nombre,
        apellidos: apellido,
        telefono
      })
    });

    if (res.ok) {
      message.textContent = "¡Cuenta creada! Redirigiendo a la verificación...";
      message.classList.add("success");
      // Guardar email para que la página de verificación lo use
      sessionStorage.setItem("pendingVerifyEmail", email);
      setTimeout(() => {
        window.location.href = "/verificar-email?email=" + encodeURIComponent(email);
      }, 1500);
    } else {
      const err = await res.json().catch(() => ({}));
      message.textContent = err.mensaje || err.error || "Error al registrar. Intenta de nuevo.";
      message.classList.add("error");
    }
  } catch (err) {
    message.textContent = "Error de conexión con el servidor.";
    message.classList.add("error");
  }
});
