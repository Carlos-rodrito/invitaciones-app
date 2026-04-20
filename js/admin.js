const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function cargarAsistentes() {
    const res = await fetch(`https://invitaciones-backend.onrender.com/api/eventos/${id}/asistentes`);
    const asistentes = await res.json();

    const lista = document.getElementById("lista");
    lista.innerHTML = "";

    asistentes.forEach(nombre => {
        const li = document.createElement("li");
        li.innerText = nombre;
        lista.appendChild(li);
    });
}

cargarAsistentes();