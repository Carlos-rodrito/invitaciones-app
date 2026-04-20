const imagenUrl = await subirImagen();

async function crearEvento() {
    const data = {
        titulo: document.getElementById("titulo").value,
        fecha: document.getElementById("fecha").value,
        lugar: document.getElementById("lugar").value,
        tipo: document.getElementById("tipo").value,
        imagen: imagenUrl,
        video: document.getElementById("video").value,
        musica: document.getElementById("musica").value
    };

    const res = await fetch("https://invitaciones-backend.onrender.com/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const evento = await res.json();

    const base = window.location.origin + "/invitaciones-app/";
    const link = `${base}invitacion.html?id=${evento._id}`;
    document.getElementById("link").innerText = link;
}
app.get("/api/eventos/:id/asistentes", (req, res) => {
    const evento = eventos.find(e => e.id === req.params.id);

    if (!evento) return res.status(404).send("Evento no encontrado");

    res.json(evento.asistentes);
});

async function subirImagen() {
    const file = document.getElementById("imagen").files[0];

    const formData = new FormData();
    formData.append("imagen", file);

    const res = await fetch("https://invitaciones-backend.onrender.com/upload", {
        method: "POST",
        body: formData
    });

    const data = await res.json();
    return data.url;
}