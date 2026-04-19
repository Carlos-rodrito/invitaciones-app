const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let eventos = [];

app.get("/", (req, res) => {
    res.send("API funcionando");
});

app.post("/api/eventos", (req, res) => {
    const evento = {
        id: Date.now().toString(),
        ...req.body,
        asistentes: []
    };

    eventos.push(evento);
    res.json(evento);
});

app.get("/api/eventos/:id", (req, res) => {
    const evento = eventos.find(e => e.id === req.params.id);
    res.json(evento);
});

app.post("/api/eventos/:id/rsvp", (req, res) => {
    const evento = eventos.find(e => e.id === req.params.id);

    if (!evento) return res.status(404).send("No encontrado");

    evento.asistentes.push(req.body.nombre);
    res.json({ ok: true });
});

// 🔥 IMPORTANTE PARA RENDER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto", PORT);
});