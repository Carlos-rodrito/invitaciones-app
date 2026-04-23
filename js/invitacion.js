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
    
    return `${fecha.toLocaleDateString('es-ES', opcionesFecha)} a las ${fecha.toLocaleTimeString('es-ES', opcionesHora)} hrs`;
}

async function cargarEvento() {
    if (!id) {
        document.body.innerHTML = "<h1 style='text-align:center; padding: 50px; font-family: sans-serif;'>Error: Evento no encontrado</h1>";
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

function agregarAcompanante() {
    const contenedor = document.getElementById("contenedor-acompanantes");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "input-acompanante"; 
    input.placeholder = "Nombre del acompañante";
    contenedor.appendChild(input);
}

async function confirmar(event) {
    const inputNombre = document.getElementById("nombre");
    const nombrePrincipal = invitadoVIP ? invitadoVIP : inputNombre.value.trim(); 
    const tituloEvento = document.getElementById("titulo").innerText;

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

    // Cambiar estado del botón
    const btnConfirmar = event.target;
    btnConfirmar.innerText = "Procesando...";
    btnConfirmar.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/eventos/${id}/rsvp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombrePrincipal: nombrePrincipal, acompanantes: acompanantesExtra })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fallo en servidor");

        // Ocultar elementos del formulario
        if (invitadoVIP) document.getElementById("saludo-vip").style.display = "none";
        else document.getElementById("area-ingreso").style.display = "none";

        document.getElementById("contenedor-acompanantes").style.display = "none";
        document.getElementById("btn-add-acompanante").style.display = "none";
        btnConfirmar.style.display = "none";

        // 🟢 PREPARAR EL MENSAJE DE WHATSAPP
        let mensajeWa = "";
        if (data.waitlist) {
            mensajeWa = `¡Hola! Acabo de enviar mi solicitud de asistencia para *${tituloEvento}*. Mi nombre es ${nombrePrincipal}. Quedo a la espera de tu confirmación. ⏳`;
        } else {
            let textoExtras = acompanantesExtra.length > 0 ? ` junto con ${acompanantesExtra.length} acompañante(s)` : "";
            mensajeWa = `¡Hola! Acabo de confirmar mi asistencia a *${tituloEvento}*${textoExtras}. Mi nombre es ${nombrePrincipal}. ¡Ahí nos vemos! 🎉`;
        }
        const urlWa = `https://wa.me/?text=${encodeURIComponent(mensajeWa)}`;

        // 🟢 RENDERIZAR MENSAJE FINAL Y BOTÓN
        const mensajeExito = document.createElement("div");
        mensajeExito.style.textAlign = "center";
        mensajeExito.style.marginTop = "10px";

        if (data.waitlist) {
            mensajeExito.innerHTML = `
                <h2 style="color: #d97706; font-family: 'Playfair Display', serif; margin-bottom: 10px;">¡Solicitud Enviada! ⏳</h2>
                <p style="color: #444; font-size: 14px;">Gracias <strong>${nombrePrincipal}</strong>. Tu solicitud ha sido enviada al organizador para su aprobación.</p>
                <a href="${urlWa}" target="_blank" class="btn-whatsapp">
                    <span style="font-size: 18px; margin-right: 8px;">💬</span> Notificar al organizador
                </a>
            `;
        } else {
            let textoAcompanantes = acompanantesExtra.length > 0 ? `<p style="color: #64748b; font-size: 13px; margin-top: 5px;">+ ${acompanantesExtra.length} acompañante(s) registrado(s)</p>` : "";
            mensajeExito.innerHTML = `
                <h2 style="color: #10b981; font-family: 'Playfair Display', serif; margin-bottom: 10px;">¡Asistencia Confirmada! 🎉</h2>
                <p style="color: #444; font-size: 14px;">Te esperamos en el evento, <strong>${nombrePrincipal}</strong>.</p>
                ${textoAcompanantes}
                <a href="${urlWa}" target="_blank" class="btn-whatsapp">
                    <span style="font-size: 18px; margin-right: 8px;">💬</span> Avisar al organizador
                </a>
            `;
        }
        
        document.querySelector(".card").appendChild(mensajeExito);

    } catch (error) {
        alert(error.message);
        btnConfirmar.innerText = "Confirmar asistencia";
        btnConfirmar.disabled = false;
    }
}

cargarEvento();