const API_URL = "https://invitaciones-backend.onrender.com";
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const invitadoVIP = params.get("invitado"); // 🟢 NUEVO: Extraemos el nombre del enlace

// ... (código del temporizador y cargar evento)

let intervaloContador; 
let imagenActual = 0; // Controla qué imagen se está viendo

async function cargarEvento() {
    if (!id) {
        document.body.innerHTML = "<h1 style='text-align:center; padding: 50px;'>Error: Evento no encontrado</h1>";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/eventos/${id}`);
        if (!res.ok) throw new Error("Evento no encontrado");
        
        const evento = await res.json();

        document.getElementById("titulo").innerText = evento.titulo || "Evento";
        document.getElementById("fecha").innerText = evento.fecha || "";
        document.getElementById("lugar").innerText = evento.lugar || "";

        // 🖼️ Lógica del Carrusel
        if (evento.imagenes && evento.imagenes.length > 0) {
            const contenedorCarrusel = document.getElementById("carrusel");
            const divImagenes = document.getElementById("carrusel-imagenes");
            
            contenedorCarrusel.style.display = "block"; // Mostramos el carrusel
            
            evento.imagenes.forEach((imgUrl, index) => {
                const img = document.createElement("img");
                img.src = imgUrl;
                img.className = "img-evento slide";
                // Mostramos solo la primera imagen por defecto
                img.style.display = index === 0 ? "block" : "none"; 
                divImagenes.appendChild(img);
            });

            // Si solo hay 1 foto, ocultamos los botones de flechas
            if (evento.imagenes.length === 1) {
                document.querySelector(".prev").style.display = "none";
                document.querySelector(".next").style.display = "none";
            }
        }
        if (invitadoVIP) {
            document.getElementById("area-ingreso").style.display = "none"; // Ocultamos el input
            const saludo = document.getElementById("saludo-vip");
            saludo.style.display = "block"; // Mostramos el saludo
            saludo.innerText = `¡Hola, ${invitadoVIP}!`;
        }

        if (evento.tipo) document.body.className = evento.tipo;
        if (evento.fecha) iniciarContador(evento.fecha);

    } catch (error) {
        alert("Problema al cargar la invitación.");
    }
}

// 🟢 Función para cambiar de imagen en el carrusel
function moverCarrusel(direccion) {
    const slides = document.querySelectorAll(".slide");
    if (slides.length === 0) return;

    // Ocultar la actual
    slides[imagenActual].style.display = "none";

    // Calcular la siguiente (con lógica circular)
    imagenActual = imagenActual + direccion;
    
    if (imagenActual >= slides.length) imagenActual = 0; // Vuelve al inicio
    if (imagenActual < 0) imagenActual = slides.length - 1; // Va al final

    // Mostrar la nueva
    slides[imagenActual].style.display = "block";
}

function iniciarContador(fecha) {
    const destino = new Date(fecha).getTime();
    if (isNaN(destino)) {
        document.getElementById("contador").innerText = "Fecha pendiente";
        return;
    }

    intervaloContador = setInterval(() => {
        const ahora = new Date().getTime();
        const diferencia = destino - ahora;
        
        if (diferencia <= 0) {
            document.getElementById("contador").innerText = "¡El evento ya comenzó!";
            clearInterval(intervaloContador); 
            return;
        }

        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        if (dias === 1) document.getElementById("contador").innerText = "Falta 1 día";
        else if (dias > 1) document.getElementById("contador").innerText = `Faltan ${dias} días`;
        else document.getElementById("contador").innerText = "¡Es hoy!";
        
    }, 1000);
}

async function confirmar() {
    const inputNombre = document.getElementById("nombre");
    const nombre = inputNombre.value.trim(); 
const nombre = invitadoVIP ? invitadoVIP : document.getElementById("nombre").value.trim(); 

    if (!nombre) {
        alert("Ingresa tu nombre antes de confirmar asistencia.");
        document.getElementById("nombre").focus(); 
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/eventos/${id}/rsvp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fallo en servidor");

        alert("¡Asistencia confirmada!");
        if (!invitadoVIP) document.getElementById("nombre").value = ""; 

    } catch (error) {
        alert(error.message); // Muestra "El evento está lleno" o "No estás en la lista"
    }
}

cargarEvento();