const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const multer = require("multer");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const upload = multer({ dest: "uploads/" });

// 🔗 Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB conectado"))
    .catch(err => console.log(err));

// 🧱 Modelo
const EventoSchema = new mongoose.Schema({
    titulo: String,
    fecha: String,
    lugar: String,
    tipo: String,        // 👈 nuevo
    imagen: String,      // 👈 nuevo
    video: String,       // 👈 nuevo
    musica: String,      // 👈 nuevo
    asistentes: [String]
});

const Evento = mongoose.model("Evento", EventoSchema);

// 🟢 Ruta base
app.get("/", (req, res) => {
    res.send("API funcionando");
});

// 🟡 Obtener TODOS los eventos
app.get("/api/eventos", async (req, res) => {
    const eventos = await Evento.find().sort({ _id: -1 });
    res.json(eventos);
});

// 🟢 Crear evento
app.post("/api/eventos", async (req, res) => {
    const evento = new Evento({
        ...req.body,
        asistentes: []
    });

    await evento.save();
    res.json(evento);
});

// 🔵 Obtener evento
app.get("/api/eventos/:id", async (req, res) => {
    const evento = await Evento.findById(req.params.id);
    res.json(evento);
});

// 🟣 Confirmar asistencia
app.post("/api/eventos/:id/rsvp", async (req, res) => {
    const evento = await Evento.findById(req.params.id);

    if (!evento) return res.status(404).send("No encontrado");

    evento.asistentes.push(req.body.nombre);
    await evento.save();

    res.json({ ok: true });
});

// 🟡 Obtener asistentes
app.get("/api/eventos/:id/asistentes", async (req, res) => {
    const evento = await Evento.findById(req.params.id);

    if (!evento) return res.status(404).send("Evento no encontrado");

    res.json(evento.asistentes);
});

// 🚀 Puerto (Render)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto", PORT);
});

app.post("/upload", upload.single("imagen"), async (req, res) => {
    const result = await cloudinary.uploader.upload(req.file.path);
    res.json({ url: result.secure_url });
});