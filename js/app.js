const API_URL = "https://invitaciones-backend.onrender.com";

async function crearEvento() {
    const btnCrear = document.getElementById("btn-crear"); 
    const mensajeServidor = document.getElementById("mensaje-servidor"); 
    const tituloInput = document.getElementById("titulo");
    const fechaInput = document.getElementById("fecha");
    const lugarInput = document.getElementById("lugar");

    if (!tituloInput.value.trim() || !fechaInput.value || !lugarInput.value.trim()) {
        alert("Por favor, completa al menos el título, la fecha y el lugar.");
        return;
    }

    btnCrear.disabled = true;
    btnCrear.innerText = "Procesando...";
    mensajeServidor.style.display = "block"; 

    // ... dentro de la función crearEvento(), justo antes del 'try' ...

    // 🟢 Extraemos y procesamos la lista VIP
    const limiteInput = document.getElementById("limite").value;
    const listaVipInput = document.getElementById("lista-vip").value;
    
    // Convertimos el texto del textarea en un arreglo (array), separando por saltos de línea
    const arregloInvitados = listaVipInput
        .split('\n')
        .map(nombre => nombre.trim())
        .filter(nombre => nombre !== ""); // Quitamos líneas vacías

    try {
        const imagenesUrls = await subirImagenes();

        const data = {
            titulo: tituloInput.value.trim(),
            fecha: fechaInput.value,
            lugar: lugarInput.value.trim(),
            tipo: document.getElementById("tipo").value,
            imagenes: imagenesUrls,
            // 🟢 Mandamos los nuevos datos al backend
            limiteAsistentes: limiteInput ? parseInt(limiteInput) : null,
            listaInvitados: arregloInvitados
        };

        // ... (El resto del código fetch hacia el backend se queda igual) ...

    try {
        // 👇 Subir arreglo de imágenes
        const imagenesUrls = await subirImagenes();

        const data = {
            titulo: tituloInput.value.trim(),
            fecha: fechaInput.value,
            lugar: lugarInput.value.trim(),
            tipo: document.getElementById("tipo").value,
            imagenes: imagenesUrls // 🟢 Enviamos el arreglo
        };

        const res = await fetch(`${API_URL}/api/eventos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error("Fallo en el servidor");

        const evento = await res.json();
        const rutaBase = window.location.pathname.replace("index.html", "");
        const base = window.location.origin + rutaBase;
        const link = `${base}invitacion.html?id=${evento._id}`;

        const contenedorLink = document.getElementById("link");
        contenedorLink.innerHTML = `
            <span style="color: #4CAF50; font-weight: bold;">¡Evento creado! 🎉</span><br><br>
            <a href="${link}" target="_blank" style="word-break: break-all;">${link}</a><br>
            <button onclick="navigator.clipboard.writeText('${link}').then(()=>alert('¡Copiado!'))" 
                    style="margin-top: 10px; width: auto; padding: 8px 15px;">
                Copiar Enlace
            </button>
        `;

        limpiarFormulario();

    } catch (error) {
        console.error(error);
        alert("Error creando el evento. Revisa tu conexión.");
    } finally {
        btnCrear.disabled = false;
        btnCrear.innerText = "Generar Invitación";
        mensajeServidor.style.display = "none"; 
    }
}

async function subirImagenes() {
    const fileInput = document.getElementById("imagenes"); // 🟢 ID actualizado a plural

    if (!fileInput.files.length) return []; // Retorna arreglo vacío si no hay fotos

    const formData = new FormData();
    // 🟢 Añadimos cada foto al formData
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
        console.error(error);
        alert("No se pudieron subir las imágenes, pero el evento se creará.");
        return []; 
    }
}

function limpiarFormulario() {
    document.getElementById("titulo").value = "";
    document.getElementById("fecha").value = "";
    document.getElementById("lugar").value = "";
    document.getElementById("imagenes").value = "";
    document.getElementById("tipo").selectedIndex = 0;
}