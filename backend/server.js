require("dotenv").config(); // Carga las variables de entorno
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs"); // Para borrar los archivos locales temporales

const app = express();

// Middleware
app.use(cors()); // Permite que GitHub Pages se comunique con este servidor
app.use(express.json()); // Permite recibir datos en formato JSON

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const upload = multer({ dest: "uploads/" });

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🟢 MongoDB conectado exitosamente"))
    .catch(err => console.error("🔴 Error conectando a MongoDB:", err));

// ==========================================
// MODELO DE BASE DE DATOS
// ==========================================
const EventoSchema = new mongoose.Schema({
    titulo: String,
    fecha: String,
    lugar: String,
    tipo: String,
    imagen: String,
    video: String,
    musica: String,
    asistentes: [String]
});

const Evento = mongoose.model("Evento", EventoSchema);

// ==========================================
// RUTAS DE LA API
// ==========================================

// 1. Ruta de estado (Evita el "Cannot GET /" en Render)
app.get("/", (req, res) => {
    res.json({ 
        estado: "Online", 
        mensaje: "🚀 API de Invitaciones funcionando correctamente",
        fecha: new Date().toISOString()
    });
});

// 2. Obtener TODOS los eventos
app.get("/api/eventos", async (req, res) => {
    try {
        const eventos = await Evento.find().sort({ _id: -1 });
        res.json(eventos);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo los eventos" });
    }
});

// 3. Obtener un evento específico por ID
app.get("/api/eventos/:id", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado" });
        res.json(evento);
    } catch (error) {
        res.status(500).json({ error: "ID inválido o error de servidor" });
    }
});

// 4. Crear un nuevo evento
app.post("/api/eventos", async (req, res) => {
    try {
        const evento = new Evento({
            ...req.body,
            asistentes: []
        });
        await evento.save();
        res.json(evento);
    } catch (error) {
        res.status(500).json({ error: "Error creando el evento" });
    }
});

// 5. Confirmar asistencia a un evento
app.post("/api/eventos/:id/rsvp", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

        if (!req.body.nombre) return res.status(400).json({ error: "El nombre es requerido" });

        evento.asistentes.push(req.body.nombre);
        await evento.save();

        res.json({ ok: true, mensaje: "Asistencia confirmada" });
    } catch (error) {
        res.status(500).json({ error: "Error al confirmar asistencia" });
    }
});

// 6. Obtener lista de asistentes
app.get("/api/eventos/:id/asistentes", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

        res.json(evento.asistentes);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo asistentes" });
    }
});

// 7. Subir imagen a Cloudinary
app.post("/upload", upload.single("imagen"), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ url: "" }); // Si no manda imagen, devuelve string vacío
        }
        
        const result = await cloudinary.uploader.upload(req.file.path);
        
        // Eliminar el archivo temporal del servidor de Render
        fs.unlinkSync(req.file.path); 

        res.json({ url: result.secure_url });
    } catch (error) {
        console.error("Error en /upload:", error);
        res.status(500).json({ error: "Error subiendo la imagen a la nube" });
    }
});

// ==========================================
// INICIAR EL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});