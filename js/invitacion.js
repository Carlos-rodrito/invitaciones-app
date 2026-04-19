const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function cargarEvento() {
    const res = await fetch(`https://invitaciones-backend.onrender.com/api/eventos/${id}`);
    const evento = await res.json();

    document.getElementById("titulo").innerText = evento.titulo;
    document.getElementById("fecha").innerText = evento.fecha;
    document.getElementById("lugar").innerText = evento.lugar;
}

async function confirmar() {
    const nombre = document.getElementById("nombre").value;

    await fetch(`https://invitaciones-backend.onrender.com/api/eventos/${id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre })
    });

    alert("Asistencia confirmada");
}

cargarEvento();