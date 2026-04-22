const API_URL = "https://invitaciones-backend.onrender.com";
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const invitadoVIP = params.get("invitado"); 

let intervaloContador; 
let imagenActual = 0; 

function formatearFecha(fechaIso) {
    if (!fechaIso) return "Fecha por definir";
    
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return fechaIso;

    const opcionesFecha = { day: 'numeric', month: 'long', year: 'numeric' };
    const opcionesHora = { hour: '2-digit', minute: '2-digit' };
    
    const fechaTexto = fecha.toLocaleDateString('es-ES', opcionesFecha);
    const horaTexto = fecha.toLocaleTimeString('es-ES', opcionesHora);
    
    return `${fechaTexto} a las ${horaTexto} hrs`;
}

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
        document.getElementById("fecha").innerText = formatearFecha(evento.fecha);
        document.getElementById("lugar").innerText = evento.lugar || "";

        if (evento.imagenes && evento.imagenes.length > 0) {
            const contenedorCarrusel = document.getElementById("carrusel");
            const divImagenes = document.getElementById("carrusel-imagenes");
            
            contenedorCarrusel.style.display = "block"; 
            
            evento.imagenes.forEach((imgUrl, index) => {
                const img = document.createElement("img");
                img.src = imgUrl;
                img.className = "img-evento slide";
                img.style.display = index === 0 ? "block" : "none"; 
                divImagenes.appendChild(img);
            });

            if (evento.imagenes.length === 1) {
                document.querySelector(".prev").style.display = "none";
                document.querySelector(".next").style.display = "none";
            }
        }
        
        if (invitadoVIP) {
            document.getElementById("area-ingreso").style.display = "none"; 
            const saludo = document.getElementById("saludo-vip");
            saludo.style.display = "block"; 
            saludo.innerText = `¡Hola, ${invitadoVIP}!`;
        }

        if (evento.tipo) document.body.className = evento.tipo;
        if (evento.fecha) iniciarContador(evento.fecha);

    } catch (error) {
        alert("Problema al cargar la invitación.");
    }
}

function moverCarrusel(direccion) {
    const slides = document.querySelectorAll(".slide");
    if (slides.length === 0) return;

    slides[imagenActual].style.display = "none";
    imagenActual = imagenActual + direccion;
    
    if (imagenActual >= slides.length) imagenActual = 0; 
    if (imagenActual < 0) imagenActual = slides.length - 1; 

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

// 🟢 NUEVA FUNCIÓN: Agrega cajitas de texto para acompañantes
function agregarAcompanante() {
    const contenedor = document.getElementById("contenedor-acompanantes");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "input-acompanante"; // Clase para identificarlos luego
    input.placeholder = "Nombre del acompañante";
    input.style.marginTop = "10px";
    contenedor.appendChild(input);
}

// 🟢 MODIFICADA: Enviar titular + acompañantes
// ... (arriba queda igual)

async function confirmar(event) {
    const inputNombre = document.getElementById("nombre");
    const nombrePrincipal = invitadoVIP ? invitadoVIP : inputNombre.value.trim(); 

    if (!nombrePrincipal) {
        alert("Ingresa tu nombre antes de confirmar asistencia.");
        inputNombre.focus(); 
        return;
    }

    const inputsAcompanantes = document.querySelectorAll(".input-acompanante");
    const acompanantesExtra = [];
    inputsAcompanantes.forEach(input => {
        if (input.value.trim() !== "") acompanantesExtra.push(input.value.trim());
    });

    try {
        const res = await fetch(`${API_URL}/api/eventos/${id}/rsvp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombrePrincipal: nombrePrincipal, acompanantes: acompanantesExtra })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fallo en servidor");

        // Ocultar formulario
        if (invitadoVIP) document.getElementById("saludo-vip").style.display = "none";
        else document.getElementById("area-ingreso").style.display = "none";

        document.getElementById("contenedor-acompanantes").style.display = "none";
        document.getElementById("btn-add-acompanante").style.display = "none";
        
        if (event && event.target) event.target.style.display = "none";
        else document.getElementById("btn-confirmar").style.display = "none";

        // 🟢 NUEVO: Decidir qué mensaje mostrar
        const mensajeExito = document.createElement("div");
        mensajeExito.style.textAlign = "center";
        mensajeExito.style.marginTop = "20px";

        if (data.waitlist) {
            // Mensaje de Lista de Espera
            mensajeExito.innerHTML = `
                <h2 style="color: #FF9800; margin-bottom: 5px;">¡Solicitud Enviada! ⏳</h2>
                <p style="color: #444; font-size: 15px;">Gracias <strong>${nombrePrincipal}</strong>. Al ser un evento de lista privada, tu solicitud ha sido enviada al organizador para su aprobación.</p>
                <p style="color: #888; font-size: 13px;">Te notificaremos si se abren cupos.</p>
            `;
        } else {
            // Mensaje de Éxito Normal
            let textoAcompanantes = "";
            if (acompanantesExtra.length > 0) {
                textoAcompanantes = `<p style="color: #888; font-size: 13px; margin-top: 5px;">+ ${acompanantesExtra.length} acompañante(s) registrado(s)</p>`;
            }
            mensajeExito.innerHTML = `
                <h2 style="color: #4CAF50; margin-bottom: 5px;">¡Asistencia Confirmada! 🎉</h2>
                <p style="color: #444; font-size: 15px;">Te esperamos en el evento, <strong>${nombrePrincipal}</strong>.</p>
                ${textoAcompanantes}
            `;
        }
        
        document.querySelector(".card").appendChild(mensajeExito);

    } catch (error) {
        alert(error.message); 
    }
}

cargarEvento();