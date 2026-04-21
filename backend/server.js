require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// ... (después de configurar cloudinary)

const fs = require("fs"); 

// 🟢 SOLUCIÓN IMÁGENES: Crear la carpeta si no existe
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}
const upload = multer({ dest: "uploads/" });

// ... (sigue la conexión a MongoDB)

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🟢 MongoDB conectado exitosamente"))
    .catch(err => console.error("🔴 Error conectando a MongoDB:", err));

// ==========================================
// NUEVO MODELO DE BASE DE DATOS
// ==========================================
const EventoSchema = new mongoose.Schema({
    titulo: String,
    fecha: String,
    lugar: String,
    tipo: String,
    imagenes: [String],
    asistentes: [String],
    // 🟢 NUEVOS CAMPOS:
    limiteAsistentes: Number, 
    listaInvitados: [String] 
});

const Evento = mongoose.model("Evento", EventoSchema);

// ==========================================
// RUTAS DE LA API
// ==========================================

app.get("/", (req, res) => {
    res.json({ estado: "Online", mensaje: "🚀 API de Invitaciones funcionando" });
});

app.get("/api/eventos", async (req, res) => {
    try {
        const eventos = await Evento.find().sort({ _id: -1 });
        res.json(eventos);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo eventos" });
    }
});

app.get("/api/eventos/:id", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado" });
        res.json(evento);
    } catch (error) {
        res.status(500).json({ error: "ID inválido" });
    }
});

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

app.post("/api/eventos/:id/rsvp", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

        const nombreInvitado = req.body.nombre.trim();
        if (!nombreInvitado) return res.status(400).json({ error: "El nombre es requerido" });

        // 🛑 REGLA 1: Evitar que una misma persona confirme dos veces
        const yaConfirmado = evento.asistentes.some(a => a.toLowerCase() === nombreInvitado.toLowerCase());
        if (yaConfirmado) {
            return res.status(400).json({ error: "Este nombre ya ha confirmado su asistencia previamente." });
        }

        // 🛑 REGLA 2: Límite de capacidad
        if (evento.limiteAsistentes && evento.asistentes.length >= evento.limiteAsistentes) {
            return res.status(403).json({ error: "El evento ya ha alcanzado su límite máximo de invitados." });
        }

        // 🛑 REGLA 3: Lista VIP estricta
        if (evento.listaInvitados && evento.listaInvitados.length > 0) {
            const estaEnLista = evento.listaInvitados.some(invitado => 
                invitado.trim().toLowerCase() === nombreInvitado.toLowerCase()
            );
            if (!estaEnLista) {
                return res.status(403).json({ error: "Lo sentimos, tu nombre no aparece en la lista privada de invitados." });
            }
        }

        // Si pasa todas las reglas, lo guardamos
        evento.asistentes.push(nombreInvitado);
        await evento.save();

        res.json({ ok: true, mensaje: "Asistencia confirmada" });
    } catch (error) {
        console.error("Error en RSVP:", error);
        res.status(500).json({ error: "Error interno al confirmar asistencia" });
    }
});

app.get("/api/eventos/:id/asistentes", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "No encontrado" });
        res.json(evento.asistentes);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo asistentes" });
    }
});

// 🟢 NUEVA RUTA DE UPLOAD PARA MÚLTIPLES IMÁGENES (Máximo 5)
app.post("/upload", upload.array("imagenes", 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.json({ urls: [] });
        }
        
        // Subimos todas las imágenes a Cloudinary en paralelo para que sea más rápido
        const uploadPromises = req.files.map(file => {
            return cloudinary.uploader.upload(file.path).then(result => {
                fs.unlinkSync(file.path); // Borramos el archivo temporal
                return result.secure_url;
            });
        });

        const urls = await Promise.all(uploadPromises);
        res.json({ urls: urls }); // Devolvemos el arreglo de URLs

    } catch (error) {
        console.error("Error en /upload:", error);
        res.status(500).json({ error: "Error subiendo imágenes a la nube" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));