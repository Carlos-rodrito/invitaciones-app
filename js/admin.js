const API_URL = "https://invitaciones-backend.onrender.com";
let asistentesGlobal = [];

// ==========================================
// 1. SISTEMA DE AUTENTICACIÓN (LOGIN/REGISTRO)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Si ya hay un token guardado, saltamos el login
    if (localStorage.getItem("token")) {
        mostrarDashboard();
    }
});

function mostrarRegistro() {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("registro-box").style.display = "block";
}

function mostrarLogin() {
    document.getElementById("registro-box").style.display = "none";
    document.getElementById("login-box").style.display = "block";
}

async function intentarRegistro() {
    const nombre = document.getElementById("reg-nombre").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-pass").value;

    if (!nombre || !email || !password) return alert("Completa todos los campos");

    const btn = document.getElementById("btn-registro");
    btn.disabled = true;
    btn.innerText = "Creando cuenta...";

    try {
        const res = await fetch(`${API_URL}/api/auth/registro`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, email, password })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error al registrar");
        
        alert("Cuenta creada con éxito. Ahora inicia sesión.");
        mostrarLogin();
        document.getElementById("login-email").value = email;
    } catch (error) {
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Crear Cuenta";
    }
}

async function intentarLogin() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-pass").value;
    const errorMsg = document.getElementById("login-error");

    if (!email || !password) {
        errorMsg.innerText = "Ingresa correo y contraseña";
        errorMsg.style.display = "block";
        return;
    }

    const btn = document.getElementById("btn-login");
    btn.disabled = true;
    btn.innerText = "Verificando...";

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error de acceso");

        // 🟢 ÉXITO: Guardamos el pase VIP en el navegador
        localStorage.setItem("token", data.token);
        localStorage.setItem("nombreUsuario", data.nombre);
        
        mostrarDashboard();
    } catch (error) {
        errorMsg.innerText = error.message;
        errorMsg.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.innerText = "Ingresar al Panel";
    }
}

function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("nombreUsuario");
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("detalles-evento").style.display = "none";
    mostrarLogin();
}

function mostrarDashboard() {
    document.getElementById("login-box").style.display = "none";
    document.getElementById("registro-box").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    cargarEventos();
}

// ==========================================
// 2. GESTIÓN DE EVENTOS (CON SEGURIDAD)
// ==========================================
// Función auxiliar para obtener el token en cada petición
function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
    };
}

function obtenerEnlaceInvitacion(id) {
    const rutaBase = window.location.pathname.replace("admin.html", "");
    const base = window.location.origin + rutaBase;
    return `${base}invitacion.html?id=${id}`;
}

async function cargarEventos() {
    try {
        // 🟢 Ahora enviamos el token al servidor para que nos dé solo NUESTROS eventos
        const res = await fetch(`${API_URL}/api/eventos`, { headers: getHeaders() });
        
        if (res.status === 401) {
            alert("Tu sesión expiró. Inicia sesión de nuevo.");
            cerrarSesion();
            return;
        }
        if (!res.ok) throw new Error("Fallo al obtener eventos");
        
        const eventos = await res.json();
        const contenedor = document.getElementById("eventos");
        contenedor.innerHTML = ""; 

        if (eventos.length === 0) {
            contenedor.innerHTML = "<p style='text-align:center;'>Aún no tienes eventos. ¡Crea el primero en el panel de creación!</p>";
            return;
        }

        eventos.forEach(ev => {
            const div = document.createElement("div");
            div.className = "evento-item";

            const rutaBase = window.location.pathname.replace("admin.html", "");
            const base = window.location.origin + rutaBase;
            const linkCliente = ev.tokenCliente ? `${base}cliente.html?token=${ev.tokenCliente}` : "#";

            div.innerHTML = `
                <div class="evento-info">
                    <strong>${ev.titulo}</strong>
                    <span>📅 ${ev.fecha || "Fecha sin definir"}</span>
                </div>
                <div class="evento-acciones">
                    <button onclick="verDetalles('${ev._id}', '${ev.titulo}')" style="background:#222; color:white;">Administrar</button>
                    <button onclick="copiarLink('${ev._id}')">Link Gral.</button>
                    <button onclick="compartirWhatsApp('${ev._id}', '${ev.titulo}')" style="background:#25D366; color:white;">WhatsApp</button>
                    ${ev.tokenCliente ? `<button onclick="navigator.clipboard.writeText('${linkCliente}').then(()=>alert('¡Enlace del cliente copiado!'))" style="background:#007BFF; color:white;">Link Cliente</button>` : ''}
                </div>
            `;
            contenedor.appendChild(div);
        });
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("eventos").innerHTML = "<p style='color:red;'>Error al conectar. ¿Iniciaste sesión?</p>";
    }
}

// ... (Las funciones verDetalles, responderSolicitudAdmin, exportarCSV y PDF se quedan IGUAL, ya que las peticiones del admin usan las rutas públicas/compartidas para leer los datos del evento).

async function verDetalles(id, titulo) {
    document.getElementById("detalles-evento").style.display = "block";
    document.getElementById("evento-titulo-detalle").innerText = `Gestionando: ${titulo}`;
    
    generarQR(id);

    try {
        const resEvento = await fetch(`${API_URL}/api/eventos/${id}`);
        const evento = await resEvento.json();

        const resAsistentes = await fetch(`${API_URL}/api/eventos/${id}/asistentes`);
        const asistentes = await resAsistentes.json();
        asistentesGlobal = asistentes;

        document.getElementById("total").innerText = asistentes.length;
        const lista = document.getElementById("lista");
        lista.innerHTML = "";

        if (evento.listaInvitados && evento.listaInvitados.length > 0) {
            lista.innerHTML = `<li style="background: #eef8f1; padding: 10px; font-weight: bold;">👑 Enlaces VIP (Para Enviar):</li>`;
            
            evento.listaInvitados.forEach(invitado => {
                const yaConfirmo = asistentes.some(a => a.toLowerCase() === invitado.toLowerCase());
                const li = document.createElement("li");
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                li.style.alignItems = "center";
                
                const rutaBase = window.location.pathname.replace("admin.html", "");
                const base = window.location.origin + rutaBase;
                const linkVip = `${base}invitacion.html?id=${id}&invitado=${encodeURIComponent(invitado)}`;
                
                const mensajeWa = `¡Hola *${invitado}*! 🎉\nEstás invitado a *${titulo}*.\n\nEste es tu pase personal. Confirma aquí 👇\n${linkVip}`;
                const urlWa = `https://wa.me/?text=${encodeURIComponent(mensajeWa)}`;

                li.innerHTML = `
                    <span>
                        ${yaConfirmo ? "✅" : "⏳"} <strong>${invitado}</strong>
                    </span>
                    <button onclick="window.open('${urlWa}', '_blank')" style="background:#25D366; color:white; padding: 5px 10px; margin:0; font-size: 12px; width: auto; border:none; border-radius:4px; cursor:pointer;">
                        Enviar Link
                    </button>
                `;
                lista.appendChild(li);
            });

            lista.innerHTML += `<li style="margin-top:15px; background: #f0f0f0; padding: 10px; font-weight: bold;">✅ Asistentes Confirmados:</li>`;
        }

        if (asistentes.length === 0) {
            lista.innerHTML += "<li style='color:#888; justify-content:center;'>Nadie ha confirmado aún.</li>";
        } else {
            asistentes.forEach(nombre => {
                const li = document.createElement("li");
                if (nombre.includes("(Acompañante")) {
                    li.innerHTML = `<span style="color:#888; margin-left: 15px;">↳</span> <span style="font-size: 13px; color: #555;">${nombre}</span>`;
                } else {
                    li.innerHTML = `✅ <strong>${nombre}</strong>`;
                }
                lista.appendChild(li);
            });
        }

        const seccionPendientes = document.getElementById("seccion-pendientes-admin");
        const listaPendientes = document.getElementById("lista-pendientes");
        listaPendientes.innerHTML = "";

        if (evento.pendientes && evento.pendientes.length > 0) {
            seccionPendientes.style.display = "block";
            
            evento.pendientes.forEach((solicitud, index) => {
                const li = document.createElement("li");
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                li.style.alignItems = "center";
                li.style.flexWrap = "wrap";
                
                let textoExtra = solicitud.acompanantes.length > 0 ? `<br><small style="color:#888;">+ ${solicitud.acompanantes.length} acompañante(s)</small>` : "";
                
                li.innerHTML = `
                    <div><strong>${solicitud.nombrePrincipal}</strong> ${textoExtra}</div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="responderSolicitudAdmin('${evento.tokenCliente}', '${id}', '${titulo}', ${index}, 'aprobar')" style="background: #4CAF50; color:white; padding: 5px 10px; margin:0; font-size: 12px; width: auto; border:none; border-radius:4px; cursor:pointer;">Aprobar</button>
                        <button onclick="responderSolicitudAdmin('${evento.tokenCliente}', '${id}', '${titulo}', ${index}, 'rechazar')" style="background: #f44336; color:white; padding: 5px 10px; margin:0; font-size: 12px; width: auto; border:none; border-radius:4px; cursor:pointer;">Rechazar</button>
                    </div>
                `;
                listaPendientes.appendChild(li);
            });
        } else {
            seccionPendientes.style.display = "none";
        }

    } catch (error) {
        console.error("Error cargando detalles", error);
    }
}

async function responderSolicitudAdmin(token, eventoId, tituloEvento, index, accion) {
    if (!confirm(`¿Confirmas que deseas ${accion} a este invitado?`)) return;
    try {
        const res = await fetch(`${API_URL}/api/eventos/compartido/${token}/${accion}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fallo al procesar la solicitud");
        verDetalles(eventoId, tituloEvento);
    } catch (error) { alert(error.message); }
}

function copiarLink(id) {
    const link = obtenerEnlaceInvitacion(id);
    navigator.clipboard.writeText(link).then(() => alert("¡Enlace copiado al portapapeles!")).catch(() => alert("Error al copiar el enlace"));
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
    if (asistentesGlobal.length === 0) { alert("No hay asistentes para exportar."); return; }
    let csv = "Nombre del Asistente\n";
    asistentesGlobal.forEach(nombre => { csv += `"${nombre}"\n`; });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lista_asistentes.csv"; a.click();
    URL.revokeObjectURL(url);
}

function exportarPDF() {
    if (asistentesGlobal.length === 0) { alert("No hay asistentes para exportar."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    const titulo = document.getElementById("evento-titulo-detalle").innerText;
    doc.text(titulo, 10, 15);
    doc.setFontSize(12);
    doc.text(`Total de confirmados: ${asistentesGlobal.length}`, 10, 25);
    doc.setFontSize(10);
    asistentesGlobal.forEach((nombre, index) => { doc.text(`${index + 1}. ${nombre}`, 10, 40 + (index * 8)); });
    doc.save("asistentes_evento.pdf");
}