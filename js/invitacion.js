// 🌍 Centralizamos la URL de la API para facilitar futuros cambios de servidor
const API_URL = "https://invitaciones-backend.onrender.com";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// Variable global para almacenar el identificador del temporizador
let intervaloContador; 

async function cargarEvento() {
    // 🛡️ Validación preventiva: Si alguien entra a la página sin un ID en la URL
    if (!id) {
        console.error("No se encontró el ID del evento en la URL.");
        document.body.innerHTML = "<h1 style='text-align:center; padding: 50px;'>Error: Evento no encontrado</h1>";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/eventos/${id}`);
        
        if (!res.ok) throw new Error("Evento no encontrado en la base de datos");
        
        const evento = await res.json();
        console.log("Evento cargado:", evento);

        // 🟢 Datos básicos (con un valor por defecto por si algún campo viene vacío)
        document.getElementById("titulo").innerText = evento.titulo || "Evento sin título";
        document.getElementById("fecha").innerText = evento.fecha || "";
        document.getElementById("lugar").innerText = evento.lugar || "";

        // 🖼 Imagen
        if (evento.imagen) {
            document.getElementById("imagenEvento").src = evento.imagen;
        }

        // 🎥 Video
        if (evento.video) {
            document.getElementById("videoEvento").src = evento.video;
        }

        // 🎵 Música
        if (evento.musica) {
            document.getElementById("musica").src = evento.musica;
        }

        // 🎨 Estilo
        if (evento.tipo) {
            document.body.className = evento.tipo;
        }

        // ⏳ Contador
        if (evento.fecha) {
            iniciarContador(evento.fecha);
        }

    } catch (error) {
        console.error("Error cargando el evento:", error);
        alert("Hubo un problema al cargar la información de la invitación.");
    }
}

function iniciarContador(fecha) {
    const destino = new Date(fecha).getTime();

    // 🛡️ Prevenir errores si la fecha es inválida
    if (isNaN(destino)) {
        document.getElementById("contador").innerText = "Fecha pendiente";
        return;
    }

    intervaloContador = setInterval(() => {
        const ahora = new Date().getTime();
        const diferencia = destino - ahora;
        
        // 🛑 Detener el reloj cuando el evento llegue a 0
        if (diferencia <= 0) {
            document.getElementById("contador").innerText = "¡El evento ya comenzó!";
            clearInterval(intervaloContador); 
            return;
        }

        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        
        // Pequeño detalle visual: cambiar texto si es 1 día o varios
        if (dias === 1) {
            document.getElementById("contador").innerText = "Falta 1 día";
        } else if (dias > 1) {
            document.getElementById("contador").innerText = `Faltan ${dias} días`;
        } else {
            document.getElementById("contador").innerText = "¡Es hoy!";
        }
        
    }, 1000);
}

async function confirmar() {
    const inputNombre = document.getElementById("nombre");
    // .trim() elimina los espacios en blanco accidentales que el usuario deje al inicio o al final
    const nombre = inputNombre.value.trim(); 

    // 🛑 Validación: Evitar que confirmen con el campo vacío
    if (!nombre) {
        alert("Por favor, ingresa tu nombre antes de confirmar asistencia.");
        inputNombre.focus(); // Devuelve el cursor al input
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/eventos/${id}/rsvp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre })
        });

        if (!res.ok) throw new Error("Fallo en la respuesta del servidor");

        alert("¡Asistencia confirmada con éxito!");
        inputNombre.value = ""; // Limpiamos la caja de texto para mejor experiencia de usuario

    } catch (error) {
        console.error("Error al confirmar:", error);
        alert("No se pudo confirmar tu asistencia. Revisa tu conexión e intenta de nuevo.");
    }
}

// 🚀 Ejecutar
cargarEvento();