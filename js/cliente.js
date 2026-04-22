const API_URL = "https://invitaciones-backend.onrender.com";
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

// Guardamos la lista de asistentes globalmente para que el cliente la pueda exportar
let asistentesDelCliente = [];
let tituloDelEvento = "Reporte_Evento";

async function cargarDatosCliente() {
    if (!token) {
        mostrarError();
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/eventos/compartido/${token}`);
        
        if (!res.ok) {
            throw new Error("Token inválido o expirado");
        }

        const evento = await res.json();
        
        asistentesDelCliente = evento.asistentes;
        tituloDelEvento = evento.titulo;

        document.getElementById("titulo-evento").innerText = evento.titulo;
        
        // Formatear la fecha
        let fechaTexto = "Fecha sin definir";
        if (evento.fecha) {
            const dateObj = new Date(evento.fecha);
            if (!isNaN(dateObj.getTime())) {
                fechaTexto = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }
        
        document.getElementById("detalles-fecha-lugar").innerText = `📅 ${fechaTexto} | 📍 ${evento.lugar || 'Lugar por confirmar'}`;

        // 🟢 NUEVA LÓGICA DE CÁLCULO DE CUPOS
        const totalConfirmados = evento.asistentes.length;
        document.getElementById("stat-confirmados").innerText = totalConfirmados;

        if (evento.limiteAsistentes && evento.limiteAsistentes > 0) {
            document.getElementById("stat-limite").innerText = evento.limiteAsistentes;
            
            // Calculamos cuántos quedan (evitando que de números negativos si el admin sobrevendió)
            const cuposRestantes = evento.limiteAsistentes - totalConfirmados;
            document.getElementById("stat-disponibles").innerText = cuposRestantes > 0 ? cuposRestantes : 0;
            
            // Si ya se llenó, lo ponemos en rojo
            if (cuposRestantes <= 0) {
                document.getElementById("stat-disponibles").style.color = "red";
            }
        } else {
            // Si el admin dejó el campo vacío al crear el evento
            document.getElementById("stat-limite").innerText = "∞";
            document.getElementById("stat-disponibles").innerText = "Ilimitado";
            document.getElementById("stat-disponibles").style.fontSize = "18px"; // Ajuste visual
        }

        // Llenar la lista de confirmados
        const lista = document.getElementById("lista-clientes");
        lista.innerHTML = "";

        if (evento.asistentes.length === 0) {
            lista.innerHTML = "<li style='justify-content: center; color:#888;'>Aún no hay confirmaciones.</li>";
        } else {
            evento.asistentes.forEach(nombre => {
                const li = document.createElement("li");
                
                // Si es un acompañante, lo mostramos un poco más pequeño para diferenciar
                if (nombre.includes("(Acompañante")) {
                    li.innerHTML = `<span style="color:#888;">↳</span> <span style="font-size: 13px; color: #555;">${nombre}</span>`;
                } else {
                    li.innerHTML = `✅ <strong>${nombre}</strong>`;
                }
                
                lista.appendChild(li);
            });
        }

        document.getElementById("pantalla-carga").style.display = "none";
        document.getElementById("panel-cliente").style.display = "block";

    } catch (error) {
        console.error("Error validando enlace:", error);
        mostrarError();
    }
}

function mostrarError() {
    document.getElementById("pantalla-carga").style.display = "none";
    document.getElementById("mensaje-error").style.display = "block";
}

// ==========================================
// FUNCIONES DE EXPORTACIÓN EXCLUSIVAS DEL CLIENTE
// ==========================================

function exportarClienteCSV() {
    if (asistentesDelCliente.length === 0) {
        alert("Aún no hay invitados confirmados para descargar.");
        return;
    }

    let csv = "Lista de Confirmados\n";
    asistentesDelCliente.forEach(nombre => {
        csv += `"${nombre}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Confirmados_${tituloDelEvento.replace(/\s+/g, '_')}.csv`;
    a.click();
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