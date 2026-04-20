const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// Mostrar ID (esto sí va fuera)
document.getElementById("eventoId").innerText = "Evento ID: " + id;

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

    // 👉 AQUÍ sí existe asistentes
    document.getElementById("total").innerText = "Total: " + asistentes.length;
}

cargarAsistentes();