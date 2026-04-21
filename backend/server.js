require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs"); // 🟢 Solo declarado una vez
const crypto = require("crypto"); 

const app = express();

app.use(cors());
app.use(express.json());

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// Crear carpeta temporal si no existe en Render
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}
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
    imagenes: [String], // Arreglo para el carrusel
    asistentes: [String],
    limiteAsistentes: Number, 
    listaInvitados: [String],
    tokenCliente: String 
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

// Ruta para el panel del cliente
app.get("/api/eventos/compartido/:token", async (req, res) => {
    try {
        const evento = await Evento.findOne({ tokenCliente: req.params.token });
        if (!evento) return res.status(404).json({ error: "Enlace inválido o expirado" });
        
        res.json({
            titulo: evento.titulo,
            fecha: evento.fecha,
            lugar: evento.lugar,
            asistentes: evento.asistentes,
            limiteAsistentes: evento.limiteAsistentes,
            totalLista: evento.listaInvitados ? evento.listaInvitados.length : 0
        });
    } catch (error) {
        res.status(500).json({ error: "Error del servidor" });
    }
});

app.post("/api/eventos", async (req, res) => {
    try {
        const tokenGenerado = crypto.randomBytes(8).toString('hex');

        const evento = new Evento({
            ...req.body,
            asistentes: [],
            tokenCliente: tokenGenerado
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

        const yaConfirmado = evento.asistentes.some(a => a.toLowerCase() === nombreInvitado.toLowerCase());
        if (yaConfirmado) {
            return res.status(400).json({ error: "Este nombre ya ha confirmado su asistencia." });
        }

        if (evento.limiteAsistentes && evento.asistentes.length >= evento.limiteAsistentes) {
            return res.status(403).json({ error: "El evento ya ha alcanzado su límite de capacidad." });
        }

        if (evento.listaInvitados && evento.listaInvitados.length > 0) {
            const estaEnLista = evento.listaInvitados.some(invitado => 
                invitado.trim().toLowerCase() === nombreInvitado.toLowerCase()
            );
            if (!estaEnLista) {
                return res.status(403).json({ error: "Tu nombre no aparece en la lista privada." });
            }
        }

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

// 🟢 Subida de múltiples imágenes
app.post("/upload", upload.array("imagenes", 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.json({ urls: [] });
        }
        
        const uploadPromises = req.files.map(file => {
            return cloudinary.uploader.upload(file.path).then(result => {
                fs.unlinkSync(file.path); 
                return result.secure_url;
            }).catch(cloudError => {
                console.error("🔴 Error interno de Cloudinary:", cloudError);
                throw cloudError; 
            });
        });

        const urls = await Promise.all(uploadPromises);
        res.json({ urls: urls }); 

    } catch (error) {
        console.error("🔴 Error general en /upload:", error);
        res.status(500).json({ 
            error: "Error subiendo imágenes a la nube", 
            detalle: error.message || JSON.stringify(error) 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));