

async function crearEvento() {
    try {
        // 👇 subir imagen primero
        const imagenUrl = await subirImagen();

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

    } catch (error) {
        console.error(error);
        alert("Error creando evento");
    }
}


async function subirImagen() {
    const fileInput = document.getElementById("imagen");

    // 👉 si no seleccionó imagen
    if (!fileInput.files.length) return "";

    const formData = new FormData();
    formData.append("imagen", fileInput.files[0]);

    const res = await fetch("https://invitaciones-backend.onrender.com/upload", {
        method: "POST",
        body: formData
    });

    const data = await res.json();
    return data.url;
}