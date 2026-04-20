const PASSWORD = "Eventos-2538"; // cámbiala por la que quieras
const GUARDADO = localStorage.getItem("auth");
let asistentesGlobal = [];


function exportarCSV() {
    if (asistentesGlobal.length === 0) {
        alert("No hay asistentes para exportar");
        return;
    }

    let csv = "Nombre\n";

    asistentesGlobal.forEach(nombre => {
        csv += nombre + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "asistentes.xls";
    a.click();

    URL.revokeObjectURL(url);
}

function exportarPDF() {
    if (asistentesGlobal.length === 0) {
        alert("No hay asistentes");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Lista de Asistentes", 10, 10);

    doc.setFontSize(12);

    asistentesGlobal.forEach((nombre, index) => {
        doc.text(`${index + 1}. ${nombre}`, 10, 20 + (index * 8));
    });

    doc.save("asistentes.pdf");
}

function generarQR(id) {
    const base = window.location.origin + "/invitaciones-app/";
    const link = `${base}invitacion.html?id=${id}`;
    document.querySelector("h2").innerText = "QR del evento: " + id;
    const canvas = document.getElementById("qr");

    QRCode.toCanvas(canvas, link, function (error) {
        if (error) {
            console.error(error);
            alert("Error generando QR");
        } else {
            console.log("QR generado");
        }
    });
}

function verificarAcceso() {
    if (localStorage.getItem("auth") === "ok") return true;

    const pass = prompt("Ingresa la contraseña:");

    if (pass !== PASSWORD) {
        alert("Contraseña incorrecta");
        document.body.innerHTML = "<h1>Acceso denegado</h1>";
        return false;
    }

    localStorage.setItem("auth", "ok");
    return true;
}

function compartirWhatsApp(id, titulo) {
    const base = window.location.origin + "/invitaciones-app/";
    const link = `${base}invitacion.html?id=${id}`;

    const mensaje = `🎉 *${titulo}*\n\n📅 ¡Estás invitado!\n\nConfirma aquí 👇\n${link}`;

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank");
}

async function cargarEventos() {
    const res = await fetch("https://invitaciones-backend.onrender.com/api/eventos");
    const eventos = await res.json();


    const contenedor = document.getElementById("eventos");
    contenedor.innerHTML = "";

    eventos.forEach(ev => {
        const li = document.createElement("li");

        li.innerHTML = `
            <strong>${ev.titulo}</strong> - ${ev.fecha}
            <button onclick="verAsistentes('${ev._id}')">Ver asistentes</button>
            <button onclick="copiarLink('${ev._id}')">Copiar enlace</button>
            <button onclick="generarQR('${ev._id}')">QR</button>
            <button onclick="compartirWhatsApp('${ev._id}', '${ev.titulo}')">WhatsApp</button>
            
        `;

        contenedor.appendChild(li);
    });
}

async function verAsistentes(id) {
    const res = await fetch(`https://invitaciones-backend.onrender.com/api/eventos/${id}/asistentes`);
    const asistentes = await res.json();
    asistentesGlobal = asistentes;

    document.getElementById("eventoId").innerText = "Evento ID: " + id;
    document.getElementById("total").innerText = "Total: " + asistentes.length;

    const lista = document.getElementById("lista");
    lista.innerHTML = "";

    asistentes.forEach(nombre => {
        const li = document.createElement("li");
        li.innerText = nombre;
        lista.appendChild(li);
    });
}

function copiarLink(id) {
    const base = window.location.origin + "/invitaciones-app/";
    const link = `${base}invitacion.html?id=${id}`;

    navigator.clipboard.writeText(link)
        .then(() => console.log("Copiado"))
        .catch(() => alert("Error al copiar"));
}

if (verificarAcceso()) {
    cargarEventos();
}