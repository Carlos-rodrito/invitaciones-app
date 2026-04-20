// 🌍 Centralizamos la URL del backend igual que en los otros archivos
const API_URL = "https://invitaciones-backend.onrender.com";

async function crearEvento() {
    // Referencias a los elementos del DOM
    const btnCrear = document.querySelector("button[onclick='crearEvento()']");
    const tituloInput = document.getElementById("titulo");
    const fechaInput = document.getElementById("fecha");
    const lugarInput = document.getElementById("lugar");

    // 🛑 1. Validación básica: Evitar crear eventos vacíos
    if (!tituloInput.value.trim() || !fechaInput.value || !lugarInput.value.trim()) {
        alert("Por favor, completa al menos el título, la fecha y el lugar del evento.");
        return;
    }

    // ⏳ 2. Feedback visual: Bloquear el botón para evitar clics dobles
    const textoOriginal = btnCrear.innerText;
    btnCrear.disabled = true;
    btnCrear.innerText = "Creando evento (esto puede tardar unos segundos)...";
    btnCrear.style.opacity = "0.7";

    try {
        // 👇 Subir imagen primero
        const imagenUrl = await subirImagen();

        const data = {
            titulo: tituloInput.value.trim(),
            fecha: fechaInput.value,
            lugar: lugarInput.value.trim(),
            tipo: document.getElementById("tipo").value,
            imagen: imagenUrl,
            video: document.getElementById("video").value.trim(),
            musica: document.getElementById("musica").value.trim()
        };

        const res = await fetch(`${API_URL}/api/eventos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error("Fallo en el servidor al guardar el evento");

        const evento = await res.json();

        // 🔗 3. Generar enlace dinámico y amigable
        // Esto asegura que funcione tanto en tu PC local como si lo subes a un hosting
        const rutaBase = window.location.pathname.replace("index.html", "");
        const base = window.location.origin + rutaBase;
        const link = `${base}invitacion.html?id=${evento._id}`;

        // Mostrar el enlace como un hipervínculo clickeable y dar opción de copiar
        const contenedorLink = document.getElementById("link");
        contenedorLink.innerHTML = `
            <span style="color: #4CAF50; font-weight: bold;">¡Evento creado con éxito! 🎉</span><br><br>
            <a href="${link}" target="_blank" style="word-break: break-all;">${link}</a><br>
            <button onclick="navigator.clipboard.writeText('${link}').then(()=>alert('¡Enlace copiado!'))" 
                    style="margin-top: 10px; width: auto; padding: 8px 15px;">
                Copiar Enlace
            </button>
        `;

        // 🧹 4. Limpiar el formulario para crear un nuevo evento si se desea
        limpiarFormulario();

    } catch (error) {
        console.error("Error al crear evento:", error);
        alert("Hubo un error creando el evento. Revisa tu conexión a internet.");
    } finally {
        // 🔄 5. Restaurar el botón siempre (falle o tenga éxito)
        btnCrear.disabled = false;
        btnCrear.innerText = textoOriginal;
        btnCrear.style.opacity = "1";
    }
}

async function subirImagen() {
    const fileInput = document.getElementById("imagen");

    // 👉 Si no seleccionó imagen, devolvemos un string vacío rápido
    if (!fileInput.files.length) return "";

    const formData = new FormData();
    formData.append("imagen", fileInput.files[0]);

    try {
        const res = await fetch(`${API_URL}/upload`, {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("Fallo al subir a Cloudinary");

        const data = await res.json();
        return data.url;

    } catch (error) {
        console.error("Error subiendo la imagen:", error);
        // Informamos al usuario pero permitimos que el evento siga su curso sin la imagen
        alert("No se pudo subir la imagen, pero el evento se creará de todos modos.");
        return ""; 
    }
}

// Función auxiliar para dejar la interfaz limpia
function limpiarFormulario() {
    document.getElementById("titulo").value = "";
    document.getElementById("fecha").value = "";
    document.getElementById("lugar").value = "";
    document.getElementById("imagen").value = "";
    document.getElementById("video").value = "";
    document.getElementById("musica").value = "";
    document.getElementById("tipo").selectedIndex = 0; // Vuelve al primer elemento ("boda")
}