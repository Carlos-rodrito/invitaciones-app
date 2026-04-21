const API_URL = "https://invitaciones-backend.onrender.com";
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

// Guardamos la lista de asistentes globalmente para que el cliente la pueda exportar
let asistentesDelCliente = [];
let tituloDelEvento = "Reporte_Evento";

async function cargarDatosCliente() {
    // 1. Si no hay token en la URL, mostrar error inmediato
    if (!token) {
        mostrarError();
        return;
    }

    try {
        // 2. Pedirle los datos al servidor usando el token
        const res = await fetch(`${API_URL}/api/eventos/compartido/${token}`);
        
        if (!res.ok) {
            throw new Error("Token inválido o expirado");
        }

        const evento = await res.json();
        
        // 3. Guardar datos para exportación
        asistentesDelCliente = evento.asistentes;
        tituloDelEvento = evento.titulo;

        // 4. Llenar la interfaz con los datos
        document.getElementById("titulo-evento").innerText = evento.titulo;
        
        // Formatear la fecha bonito (igual que en invitacion.js)
        let fechaTexto = "Fecha sin definir";
        if (evento.fecha) {
            const dateObj = new Date(evento.fecha);
            if (!isNaN(dateObj.getTime())) {
                fechaTexto = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }
        
        document.getElementById("detalles-fecha-lugar").innerText = `📅 ${fechaTexto} | 📍 ${evento.lugar || 'Lugar por confirmar'}`;

        // Llenar estadísticas
        document.getElementById("stat-confirmados").innerText = evento.asistentes.length;
        document.getElementById("stat-limite").innerText = evento.limiteAsistentes || "Ilimitado";

        // Llenar la lista de confirmados
        const lista = document.getElementById("lista-clientes");
        lista.innerHTML = "";

        if (evento.asistentes.length === 0) {
            lista.innerHTML = "<li style='justify-content: center; color:#888;'>Aún no hay confirmaciones.</li>";
        } else {
            evento.asistentes.forEach(nombre => {
                const li = document.createElement("li");
                li.innerHTML = `✅ <strong>${nombre}</strong>`;
                lista.appendChild(li);
            });
        }

        // 5. Ocultar pantalla de carga y mostrar el panel
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

// Iniciar la carga al abrir la página
cargarDatosCliente();