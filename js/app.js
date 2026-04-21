// 🌍 Centralizamos la URL del backend igual que en los otros archivos
const API_URL = "https://invitaciones-backend.onrender.com";

async function crearEvento() {
    const btnCrear = document.getElementById("btn-crear"); 
    const mensajeServidor = document.getElementById("mensaje-servidor"); 
    const tituloInput = document.getElementById("titulo");
    const fechaInput = document.getElementById("fecha");
    const lugarInput = document.getElementById("lugar");

    // 🛑 1. Validación básica
    if (!tituloInput.value.trim() || !fechaInput.value || !lugarInput.value.trim()) {
        alert("Por favor, completa al menos el título, la fecha y el lugar del evento.");
        return;
    }

    // 🟢 Extraemos y procesamos la lista VIP y el límite de asistentes
    const limiteInput = document.getElementById("limite").value;
    const listaVipInput = document.getElementById("lista-vip").value;
    
    // Convertimos el texto del textarea en un arreglo, quitando líneas vacías
    const arregloInvitados = listaVipInput
        .split('\n')
        .map(nombre => nombre.trim())
        .filter(nombre => nombre !== ""); 

    // ⏳ Feedback visual: Bloquear el botón y mostrar el aviso
    btnCrear.disabled = true;
    btnCrear.innerText = "Procesando...";
    mensajeServidor.style.display = "block"; 

    try {
        // 👇 Subir arreglo de imágenes (Carrusel)
        const imagenesUrls = await subirImagenes();

        const data = {
            titulo: tituloInput.value.trim(),
            fecha: fechaInput.value,
            lugar: lugarInput.value.trim(),
            tipo: document.getElementById("tipo").value,
            imagenes: imagenesUrls,
            // Agregamos las nuevas reglas
            limiteAsistentes: limiteInput ? parseInt(limiteInput) : null,
            listaInvitados: arregloInvitados
        };

        const res = await fetch(`${API_URL}/api/eventos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error("Fallo en el servidor al guardar el evento");

        const evento = await res.json();

        // 🔗 Generar enlace dinámico
        const rutaBase = window.location.pathname.replace("index.html", "");
        const base = window.location.origin + rutaBase;
        const link = `${base}invitacion.html?id=${evento._id}`;

        const contenedorLink = document.getElementById("link");
        contenedorLink.innerHTML = `
            <span style="color: #4CAF50; font-weight: bold;">¡Evento creado con éxito! 🎉</span><br><br>
            <a href="${link}" target="_blank" style="word-break: break-all;">${link}</a><br>
            <button onclick="navigator.clipboard.writeText('${link}').then(()=>alert('¡Enlace copiado!'))" 
                    style="margin-top: 10px; width: auto; padding: 8px 15px;">
                Copiar Enlace
            </button>
        `;

        limpiarFormulario();

    } catch (error) { // ¡ESTA ES LA PARTE QUE FALTABA!
        console.error("Error al crear evento:", error);
        alert("Hubo un error creando el evento. Revisa tu conexión a internet.");
    } finally {
        // Restaurar el botón siempre
        btnCrear.disabled = false;
        btnCrear.innerText = "Generar Invitación";
        mensajeServidor.style.display = "none"; 
    }
}

async function subirImagenes() {
    const fileInput = document.getElementById("imagenes"); 

    if (!fileInput.files.length) return []; 

    const formData = new FormData();
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append("imagenes", fileInput.files[i]);
    }

    try {
        const res = await fetch(`${API_URL}/upload`, {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("Fallo Cloudinary");
        const data = await res.json();
        return data.urls;

    } catch (error) {
        console.error("Error subiendo la imagen:", error);
        alert("No se pudieron subir las imágenes, pero el evento se creará de todos modos.");
        return []; 
    }
}

function limpiarFormulario() {
    document.getElementById("titulo").value = "";
    document.getElementById("fecha").value = "";
    document.getElementById("lugar").value = "";
    document.getElementById("imagenes").value = "";
    document.getElementById("tipo").selectedIndex = 0;
    
    // Limpiamos también los nuevos campos
    const limiteInput = document.getElementById("limite");
    if (limiteInput) limiteInput.value = "";
    
    const listaVipInput = document.getElementById("lista-vip");
    if (listaVipInput) listaVipInput.value = "";
}