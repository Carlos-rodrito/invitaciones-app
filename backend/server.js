require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs"); 
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
    imagenes: [String], 
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

// 🟢 RUTA RSVP ACTUALIZADA PARA SOPORTAR ACOMPAÑANTES
app.post("/api/eventos/:id/rsvp", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

        // Ahora recibimos al titular y un arreglo de sus acompañantes
        const nombrePrincipal = req.body.nombrePrincipal ? req.body.nombrePrincipal.trim() : "";
        const acompanantes = req.body.acompanantes || []; 

        if (!nombrePrincipal) return res.status(400).json({ error: "El nombre principal es requerido" });

        // 🛑 REGLA 1: Evitar que el titular confirme dos veces
        const yaConfirmado = evento.asistentes.some(a => a.toLowerCase() === nombrePrincipal.toLowerCase());
        if (yaConfirmado) {
            return res.status(400).json({ error: "Este invitado ya ha confirmado su asistencia previamente." });
        }

        // 🛑 REGLA 2: Límite de capacidad (Titular + Acompañantes)
        const totalNuevosAsistentes = 1 + acompanantes.length; 
        if (evento.limiteAsistentes && (evento.asistentes.length + totalNuevosAsistentes) > evento.limiteAsistentes) {
            const cuposRestantes = evento.limiteAsistentes - evento.asistentes.length;
            return res.status(403).json({ error: `El evento está lleno o no tiene suficientes lugares. Solo quedan ${cuposRestantes} cupos disponibles.` });
        }

        // 🛑 REGLA 3: Lista VIP (Solo validamos al Titular)
        if (evento.listaInvitados && evento.listaInvitados.length > 0) {
            const estaEnLista = evento.listaInvitados.some(invitado => 
                invitado.trim().toLowerCase() === nombrePrincipal.toLowerCase()
            );
            if (!estaEnLista) {
                return res.status(403).json({ error: "Lo sentimos, tu nombre no aparece en la lista privada de invitados." });
            }
        }

        // 🟢 ÉXITO: Guardamos a todos en la base de datos
        // 1. Guardamos al titular
        evento.asistentes.push(nombrePrincipal);
        
        // 2. Guardamos a los acompañantes con una etiqueta
        acompanantes.forEach(nombreExtra => {
            if (nombreExtra.trim()) {
                evento.asistentes.push(`${nombreExtra.trim()} (Acompañante de ${nombrePrincipal})`);
            }
        });

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

app.post("/upload", upload.any(), async (req, res) => {
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