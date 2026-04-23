const API_URL = "https://invitaciones-backend.onrender.com";
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

let asistentesDelCliente = [];
let tituloDelEvento = "Reporte_Evento";

async function cargarDatosCliente() {
    if (!token) {
        mostrarError();
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/eventos/compartido/${token}`);
        if (!res.ok) throw new Error("Token inválido o expirado");

        const evento = await res.json();
        asistentesDelCliente = evento.asistentes;
        tituloDelEvento = evento.titulo;

        document.getElementById("titulo-evento").innerText = evento.titulo;
        
        let fechaTexto = "Fecha sin definir";
        if (evento.fecha) {
            const dateObj = new Date(evento.fecha);
            if (!isNaN(dateObj.getTime())) {
                fechaTexto = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }
        document.getElementById("detalles-fecha-lugar").innerText = `📅 ${fechaTexto} | 📍 ${evento.lugar || 'Lugar por confirmar'}`;

        const totalConfirmados = evento.asistentes.length;
        document.getElementById("stat-confirmados").innerText = totalConfirmados;

        if (evento.limiteAsistentes && evento.limiteAsistentes > 0) {
            document.getElementById("stat-limite").innerText = evento.limiteAsistentes;
            const cuposRestantes = evento.limiteAsistentes - totalConfirmados;
            document.getElementById("stat-disponibles").innerText = cuposRestantes > 0 ? cuposRestantes : 0;
            if (cuposRestantes <= 0) document.getElementById("stat-disponibles").style.color = "var(--danger)";
        } else {
            document.getElementById("stat-limite").innerText = "∞";
            document.getElementById("stat-disponibles").innerText = "Libre";
        }

        const lista = document.getElementById("lista-clientes");
        lista.innerHTML = "";
        
        if (evento.asistentes.length === 0) {
            lista.innerHTML = "<li style='justify-content: center; color: var(--text-muted);'>Aún no hay confirmaciones.</li>";
        } else {
            evento.asistentes.forEach(nombre => {
                const li = document.createElement("li");
                if (nombre.includes("(Acompañante")) {
                    li.innerHTML = `<span style="color:#94a3b8; margin-left: 15px;">↳</span> <span style="font-size: 13px; color: #475569;">${nombre}</span>`;
                } else {
                    li.innerHTML = `✅ <strong style="font-weight:500;">${nombre}</strong>`;
                }
                lista.appendChild(li);
            });
        }

        // 🟢 RENDERIZAR PENDIENTES CON BOTÓN DE WHATSAPP
        if (evento.pendientes && evento.pendientes.length > 0) {
            document.getElementById("seccion-pendientes").style.display = "block";
            const listaPendientes = document.getElementById("lista-pendientes");
            listaPendientes.innerHTML = "";

            evento.pendientes.forEach((solicitud, index) => {
                const li = document.createElement("li");
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                li.style.alignItems = "center";
                li.style.flexWrap = "wrap";
                
                let textoExtra = solicitud.acompanantes.length > 0 ? `<br><small style="color:#b45309;">+ ${solicitud.acompanantes.length} acompañante(s)</small>` : "";
                
                let telLimpio = "";
                let botonAvisarHTML = "";
                
                if (solicitud.telefono) {
                    telLimpio = solicitud.telefono.replace(/\D/g, ''); 
                    let textoAsistentesMensaje = solicitud.acompanantes.length > 0 ? ` (Tú y tus ${solicitud.acompanantes.length} acompañantes)` : "";
                    const mensajeAprobado = `¡Hola ${solicitud.nombrePrincipal}! 🎉\n\nNos alegra confirmarte que tu solicitud para asistir a *${tituloDelEvento}* ha sido APROBADA${textoAsistentesMensaje}.\n\n¡Te esperamos!`;
                    const urlConfirmacionWa = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeAprobado)}`;
                    
                    botonAvisarHTML = `<button onclick="window.open('${urlConfirmacionWa}', '_blank')" style="background: #25D366; color:white; padding: 6px 12px; margin:0; font-size: 12px; border:none; border-radius:6px; cursor:pointer;">💬 Avisar</button>`;
                }

                li.innerHTML = `
                    <div style="flex: 1; min-width: 150px; margin-bottom: 5px;">
                        <strong style="color: #92400e;">${solicitud.nombrePrincipal}</strong> 
                        <span style="font-size:11px; color:#666;">${solicitud.telefono ? '📱 ' + solicitud.telefono : ''}</span>
                        ${textoExtra}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="responderSolicitud(${index}, 'aprobar')" style="background: #10b981; color:white; padding: 6px 12px; margin:0; font-size: 12px; border:none; border-radius:6px; cursor:pointer;">Aprobar</button>
                        ${botonAvisarHTML}
                        <button onclick="responderSolicitud(${index}, 'rechazar')" style="background: #ef4444; color:white; padding: 6px 12px; margin:0; font-size: 12px; border:none; border-radius:6px; cursor:pointer;">X</button>
                    </div>
                `;
                listaPendientes.appendChild(li);
            });
        } else {
            document.getElementById("seccion-pendientes").style.display = "none";
        }

        document.getElementById("pantalla-carga").style.display = "none";
        document.getElementById("panel-cliente").style.display = "block";

    } catch (error) {
        console.error("Error validando enlace:", error);
        mostrarError();
    }
}

async function responderSolicitud(index, accion) {
    if (!confirm(`¿Estás seguro de que quieres ${accion} esta solicitud?`)) return;

    try {
        const res = await fetch(`${API_URL}/api/eventos/compartido/${token}/${accion}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fallo al procesar la solicitud");

        cargarDatosCliente();
        
        if(accion === 'aprobar'){
            alert("¡Invitado aprobado! Si dejó su número, recuerda enviarle un mensaje para avisarle.");
        }

    } catch (error) {
        alert(error.message);
    }
}

function mostrarError() {
    document.getElementById("pantalla-carga").style.display = "none";
    document.getElementById("mensaje-error").style.display = "block";
}

function exportarClienteCSV() {
    if (asistentesDelCliente.length === 0) {
        alert("Aún no hay invitados confirmados para descargar.");
        return;
    }
    let csv = "Lista de Confirmados\n";
    asistentesDelCliente.forEach(nombre => { csv += `"${nombre}"\n`; });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Confirmados_${tituloDelEvento.replace(/\s+/g, '_')}.csv`; a.click();
    URL.revokeObjectURL(url);
}

function exportarClientePDF() {
    if (asistentesDelCliente.length === 0) {
        alert("Aún no hay invitados confirmados para descargar.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Reporte: ${tituloDelEvento}`, 10, 15);
    doc.setFontSize(12);
    doc.text(`Total de confirmados: ${asistentesDelCliente.length}`, 10, 25);
    doc.setFontSize(10);
    asistentesDelCliente.forEach((nombre, index) => {
        doc.text(`${index + 1}. ${nombre}`, 10, 40 + (index * 8));
    });
    doc.save(`Confirmados_${tituloDelEvento.replace(/\s+/g, '_')}.pdf`);
}

cargarDatosCliente();