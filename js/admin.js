const API_URL = "https://invitaciones-backend.onrender.com";
const PASSWORD = "Eventos-2538"; 

let asistentesGlobal = [];

// ==========================================
// SISTEMA DE ACCESO (LOGIN)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("auth") === "ok") {
        mostrarDashboard();
    }
});

function intentarAcceso() {
    const pass = document.getElementById("pass").value;
    
    if (pass === PASSWORD) {
        localStorage.setItem("auth", "ok");
        mostrarDashboard();
    } else {
        document.getElementById("login-error").style.display = "block";
    }
}

function mostrarDashboard() {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    cargarEventos();
}

// ==========================================
// UTILIDADES PARA ENLACES
// ==========================================
function obtenerEnlaceInvitacion(id) {
    const rutaBase = window.location.pathname.replace("admin.html", "");
    const base = window.location.origin + rutaBase;
    return `${base}invitacion.html?id=${id}`;
}

// ==========================================
// GESTIÓN DE EVENTOS
// ==========================================
async function cargarEventos() {
    try {
        const res = await fetch(`${API_URL}/api/eventos`);
        if (!res.ok) throw new Error("Fallo al obtener eventos");
        
        const eventos = await res.json();
        const contenedor = document.getElementById("eventos");
        contenedor.innerHTML = ""; // Limpiar el "Cargando..."

        if (eventos.length === 0) {
            contenedor.innerHTML = "<p style='text-align:center;'>Aún no hay eventos creados.</p>";
            return;
        }

        eventos.forEach(ev => {
            const div = document.createElement("div");
            div.className = "evento-item";

            div.innerHTML = `
                <div class="evento-info">
                    <strong>${ev.titulo}</strong>
                    <span>📅 ${ev.fecha || "Fecha sin definir"}</span>
                </div>
                <div class="evento-acciones">
                    <button onclick="verDetalles('${ev._id}', '${ev.titulo}')">Ver Asistentes / QR</button>
                    <button onclick="copiarLink('${ev._id}')">Copiar Enlace</button>
                    <button onclick="compartirWhatsApp('${ev._id}', '${ev.titulo}')" style="background:#25D366; color:white;">WhatsApp</button>
                </div>
            `;
            contenedor.appendChild(div);
        });
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("eventos").innerHTML = "<p style='color:red;'>Error al conectar con el servidor.</p>";
    }
}

async function verDetalles(id, titulo) {
    document.getElementById("detalles-evento").style.display = "block";
    document.getElementById("evento-titulo-detalle").innerText = `Detalles: ${titulo}`;
    
    // 1. Generar QR
    generarQR(id);

    // 2. Cargar Asistentes
    try {
        const res = await fetch(`${API_URL}/api/eventos/${id}/asistentes`);
        const asistentes = await res.json();
        asistentesGlobal = asistentes;

        document.getElementById("total").innerText = asistentes.length;

        const lista = document.getElementById("lista");
        lista.innerHTML = "";

        if (asistentes.length === 0) {
            lista.innerHTML = "<li style='color:#888;'>Nadie ha confirmado aún.</li>";
        } else {
            asistentes.forEach(nombre => {
                const li = document.createElement("li");
                li.innerText = `👤 ${nombre}`;
                lista.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error cargando asistentes", error);
    }
}

// ==========================================
// FUNCIONES DE COMPARTIR Y EXPORTAR
// ==========================================
function copiarLink(id) {
    const link = obtenerEnlaceInvitacion(id);
    navigator.clipboard.writeText(link)
        .then(() => alert("¡Enlace copiado al portapapeles!"))
        .catch(() => alert("Error al copiar el enlace"));
}

function compartirWhatsApp(id, titulo) {
    const link = obtenerEnlaceInvitacion(id);
    const mensaje = `🎉 *${titulo}*\n\n📅 ¡Estás invitado!\n\nConfirma tu asistencia aquí 👇\n${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
}

function generarQR(id) {
    const link = obtenerEnlaceInvitacion(id);
    const canvas = document.getElementById("qr");

    QRCode.toCanvas(canvas, link, { width: 180, margin: 1 }, function (error) {
        if (error) console.error("Error generando QR", error);
    });
}

function exportarCSV() {
    if (asistentesGlobal.length === 0) {
        alert("No hay asistentes para exportar.");
        return;
    }

    let csv = "Nombre del Asistente\n";
    asistentesGlobal.forEach(nombre => {
        csv += `"${nombre}"\n`; // Comillas por si el nombre tiene comas
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lista_asistentes.csv"; // Extensión correcta
    a.click();
    URL.revokeObjectURL(url);
}

function exportarPDF() {
    if (asistentesGlobal.length === 0) {
        alert("No hay asistentes para exportar.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    const titulo = document.getElementById("evento-titulo-detalle").innerText;
    doc.text(titulo, 10, 15);
    
    doc.setFontSize(12);
    doc.text(`Total de confirmados: ${asistentesGlobal.length}`, 10, 25);

    doc.setFontSize(10);
    asistentesGlobal.forEach((nombre, index) => {
        // Imprime en lista hacia abajo, calculando la posición Y
        doc.text(`${index + 1}. ${nombre}`, 10, 40 + (index * 8));
    });

    doc.save("asistentes_evento.pdf");
}