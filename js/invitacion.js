const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function cargarEvento() {
    const res = await fetch(`https://invitaciones-backend.onrender.com/api/eventos/${id}`);
    const evento = await res.json();

    document.getElementById("titulo").innerText = evento.titulo;
    document.getElementById("fecha").innerText = evento.fecha;
    document.getElementById("lugar").innerText = evento.lugar;
}

if (evento.video) {
    document.getElementById("videoEvento").src = evento.video;
}
if (evento.musica) {
    document.getElementById("musica").src = evento.musica;
}
document.getElementById("imagenEvento").src = evento.imagen;
document.body.className = evento.tipo;

function iniciarContador(fecha) {
    const destino = new Date(fecha).getTime();

    setInterval(() => {
        const ahora = new Date().getTime();
        const diferencia = destino - ahora;

        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

        document.getElementById("contador").innerText =
            "Faltan " + dias + " días";
    }, 1000);
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

iniciarContador(evento.fecha);
cargarEvento();