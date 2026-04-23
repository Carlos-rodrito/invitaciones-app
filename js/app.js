const API_URL = "https://invitaciones-backend.onrender.com";

// ==========================================
// 1. SISTEMA DE SESIÓN EN LA APP PRINCIPAL
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (token) {
        mostrarApp();
    }
});

function mostrarRegistro() {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("registro-box").style.display = "block";
}

function mostrarLogin() {
    document.getElementById("registro-box").style.display = "none";
    document.getElementById("login-box").style.display = "block";
}

function mostrarApp() {
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";
    const nombreUsuario = localStorage.getItem("nombreUsuario") || "Organizador";
    document.getElementById("nombre-usuario-display").innerText = nombreUsuario;
}

function cerrarSesionApp() {
    localStorage.removeItem("token");
    localStorage.removeItem("nombreUsuario");
    document.getElementById("app-container").style.display = "none";
    document.getElementById("auth-container").style.display = "block";
    mostrarLogin();
}

async function intentarRegistro() {
    const nombre = document.getElementById("reg-nombre").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-pass").value;

    if (!nombre || !email || !password) return alert("Completa todos los campos");

    const btn = document.getElementById("btn-registro");
    btn.disabled = true;
    btn.innerText = "Creando cuenta...";

    try {
        const res = await fetch(`${API_URL}/api/auth/registro`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al registrar");
        
        alert("Cuenta creada con éxito. Ahora inicia sesión.");
        mostrarLogin();
        document.getElementById("login-email").value = email;
    } catch (error) {
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Registrarse";
    }
}

async function intentarLogin() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-pass").value;
    const errorMsg = document.getElementById("login-error");

    if (!email || !password) {
        errorMsg.innerText = "Ingresa correo y contraseña";
        errorMsg.style.display = "block";
        return;
    }

    const btn = document.getElementById("btn-login");
    btn.disabled = true;
    btn.innerText = "Verificando...";

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error de acceso");

        localStorage.setItem("token", data.token);
        localStorage.setItem("nombreUsuario", data.nombre);
        mostrarApp();
    } catch (error) {
        errorMsg.innerText = error.message;
        errorMsg.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.innerText = "Ingresar";
    }
}

function getAuthHeaders(esFormData = false) {
    const headers = { "Authorization": `Bearer ${localStorage.getItem("token")}` };
    if (!esFormData) headers["Content-Type"] = "application/json";
    return headers;
}

// ==========================================
// 2. LÓGICA DE CREACIÓN DE EVENTOS Y COMPRESIÓN
// ==========================================
async function crearEvento() {
    const btnCrear = document.getElementById("btn-crear"); 
    const mensajeServidor = document.getElementById("mensaje-servidor"); 
    const tituloInput = document.getElementById("titulo");
    const fechaInput = document.getElementById("fecha");
    const lugarInput = document.getElementById("lugar");

    if (!tituloInput.value.trim() || !fechaInput.value || !lugarInput.value.trim()) {
        alert("Por favor, completa al menos el título, la fecha y el lugar del evento.");
        return;
    }

    const limiteInput = document.getElementById("limite").value;
    const listaVipInput = document.getElementById("lista-vip").value;
    const arregloInvitados = listaVipInput.split('\n').map(nombre => nombre.trim()).filter(nombre => nombre !== ""); 

    btnCrear.disabled = true;
    btnCrear.innerText = "Comprimiendo y subiendo... ⏳";
    mensajeServidor.style.display = "block"; 

    try {
        const imagenesUrls = await subirImagenes();

        const data = {
            titulo: tituloInput.value.trim(),
            fecha: fechaInput.value,
            lugar: lugarInput.value.trim(),
            tipo: document.getElementById("tipo").value,
            imagenes: imagenesUrls,
            limiteAsistentes: limiteInput ? parseInt(limiteInput) : null,
            listaInvitados: arregloInvitados
        };

        const res = await fetch(`${API_URL}/api/eventos`, {
            method: "POST",
            headers: getAuthHeaders(false),
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            if (res.status === 401) {
                cerrarSesionApp();
                throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
            }
            throw new Error("Fallo en el servidor al guardar el evento");
        }

        const evento = await res.json();

        const rutaBase = window.location.pathname.replace("index.html", "");
        const base = window.location.origin + rutaBase;
        const link = `${base}invitacion.html?id=${evento._id}`;

        const contenedorLink = document.getElementById("link");
        contenedorLink.innerHTML = `
            <span style="color: #4CAF50; font-weight: bold;">¡Evento creado con éxito! 🎉</span><br><br>
            <a href="${link}" target="_blank" style="word-break: break-all;">${link}</a><br>
            <button onclick="navigator.clipboard.writeText('${link}').then(()=>alert('¡Enlace copiado!'))" 
                    style="margin-top: 10px; width: auto; padding: 8px 15px; background: #222; color: white;">
                Copiar Enlace
            </button>
        `;

        limpiarFormulario();

    } catch (error) { 
        console.error("Error al crear evento:", error);
        alert(error.message);
    } finally {
        btnCrear.disabled = false;
        btnCrear.innerText = "Generar Invitación";
        mensajeServidor.style.display = "none"; 
    }
}

async function subirImagenes() {
    const fileInput = document.getElementById("imagenes"); 
    if (!fileInput.files.length) return []; 

    const formData = new FormData();
    const opcionesCompresion = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1280,
        useWebWorker: true
    };

    for (let i = 0; i < fileInput.files.length; i++) {
        let archivoOriginal = fileInput.files[i];
        try {
            let archivoComprimido = await imageCompression(archivoOriginal, opcionesCompresion);
            formData.append("imagenes", archivoComprimido, archivoOriginal.name);
        } catch (error) {
            console.warn("No se pudo comprimir la foto, se enviará original", error);
            formData.append("imagenes", archivoOriginal);
        }
    }

    try {
        const res = await fetch(`${API_URL}/upload`, {
            method: "POST",
            headers: getAuthHeaders(true),
            body: formData
        });

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error(`Render bloqueó la petición (Código ${res.status}). La imagen es muy pesada.`);
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.detalle || data.error || "Error al conectar con Cloudinary");
        return data.urls;

    } catch (error) {
        console.error("Error subiendo la imagen:", error);
        alert("Fallo en las imágenes:\n" + error.message + "\n\n(El evento se creará de todos modos sin fotos).");
        return []; 
    }
}

function limpiarFormulario() {
    document.getElementById("titulo").value = "";
    document.getElementById("fecha").value = "";
    document.getElementById("lugar").value = "";
    document.getElementById("imagenes").value = "";
    document.getElementById("tipo").selectedIndex = 0;
    
    const limiteInput = document.getElementById("limite");
    if (limiteInput) limiteInput.value = "";
    
    const listaVipInput = document.getElementById("lista-vip");
    if (listaVipInput) listaVipInput.value = "";
}