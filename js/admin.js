const PASSWORD = "Eventos-2538"; // cámbiala por la que quieras
const GUARDADO = localStorage.getItem("auth");

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
        `;

        contenedor.appendChild(li);
    });
}

async function verAsistentes(id) {
    const res = await fetch(`https://invitaciones-backend.onrender.com/api/eventos/${id}/asistentes`);
    const asistentes = await res.json();

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

if (verificarAcceso()) {
    cargarEventos();
}