const API_URL = "https://invitaciones-backend.onrender.com";

// Función auxiliar para obtener el token de seguridad
function getAuthHeaders(esFormData = false) {
    const headers = {
        "Authorization": `Bearer ${localStorage.getItem("token")}`
    };
    // Si NO es formData (es decir, es JSON), agregamos el Content-Type
    if (!esFormData) {
        headers["Content-Type"] = "application/json";
    }
    return headers;
}

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
    
    const arregloInvitados = listaVipInput
        .split('\n')
        .map(nombre => nombre.trim())
        .filter(nombre => nombre !== ""); 

    btnCrear.disabled = true;
    btnCrear.innerText = "Comprimiendo y subiendo... ⏳";
    mensajeServidor.style.display = "block"; 

    try {
        // 👇 Ahora esto subirá fotos ultra ligeras
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
            // 🟢 Usamos el token guardado en tu navegador
            headers: getAuthHeaders(false),
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            if (res.status === 401) throw new Error("Tu sesión expiró. Ve al panel de Admin e inicia sesión de nuevo.");
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
    
    // 🟢 CONFIGURACIÓN DE COMPRESIÓN (Ultra optimizado)
    const opcionesCompresion = {
        maxSizeMB: 0.5,          // Máximo 500 KB por foto (ideal para móviles)
        maxWidthOrHeight: 1280,  // Resolución máxima de HD
        useWebWorker: true       // Evita que la página se congele mientras comprime
    };

    // 🟢 BUCLE: Comprimir cada foto antes de meterla al paquete
    for (let i = 0; i < fileInput.files.length; i++) {
        let archivoOriginal = fileInput.files[i];
        
        try {
            console.log(`Comprimiendo: ${archivoOriginal.name} (${(archivoOriginal.size / 1024 / 1024).toFixed(2)} MB)`);
            
            // ¡La magia ocurre aquí!
            let archivoComprimido = await imageCompression(archivoOriginal, opcionesCompresion);
            
            console.log(`Comprimido a: ${(archivoComprimido.size / 1024 / 1024).toFixed(2)} MB`);
            
            // Lo añadimos al paquete para enviar
            formData.append("imagenes", archivoComprimido, archivoOriginal.name);
            
        } catch (error) {
            console.warn("No se pudo comprimir la foto, se enviará la original", error);
            // Plan B: si algo falla en el celular del usuario, manda la original
            formData.append("imagenes", archivoOriginal);
        }
    }

    try {
        const res = await fetch(`${API_URL}/upload`, {
            method: "POST",
            // 🟢 Enviamos el Token. (No enviamos Content-Type porque FormData lo pone solo).
            headers: getAuthHeaders(true),
            body: formData
        });

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error(`Render bloqueó la petición (Código ${res.status}). Probablemente la foto original es demasiado grande y el celular no pudo comprimirla.`);
        }

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detalle || data.error || "Error al conectar con Cloudinary");
        }
        
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