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

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}
const upload = multer({ dest: "uploads/" });

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🟢 MongoDB conectado exitosamente"))
    .catch(err => console.error("🔴 Error conectando a MongoDB:", err));

// ==========================================
// MODELO DE BASE DE DATOS ACTUALIZADO
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
    tokenCliente: String,
    // 🟢 NUEVO: La "Sala de Espera"
    pendientes: [{
        nombrePrincipal: String,
        acompanantes: [String]
    }]
});

const Evento = mongoose.model("Evento", EventoSchema);

// ==========================================
// RUTAS DE LA API
// ==========================================

app.get("/", (req, res) => res.json({ estado: "Online" }));

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

// 🟢 MODIFICADO: El cliente ahora también recibe su lista de pendientes
app.get("/api/eventos/compartido/:token", async (req, res) => {
    try {
        const evento = await Evento.findOne({ tokenCliente: req.params.token });
        if (!evento) return res.status(404).json({ error: "Enlace inválido o expirado" });
        
        res.json({
            titulo: evento.titulo,
            fecha: evento.fecha,
            lugar: evento.lugar,
            asistentes: evento.asistentes,
            pendientes: evento.pendientes, // Enviamos los pendientes al dashboard
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
            pendientes: [],
            tokenCliente: tokenGenerado
        });
        await evento.save();
        res.json(evento);
    } catch (error) {
        res.status(500).json({ error: "Error creando el evento" });
    }
});

// 🟢 MODIFICADO: Lógica de la Lista de Espera
app.post("/api/eventos/:id/rsvp", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

        const nombrePrincipal = req.body.nombrePrincipal ? req.body.nombrePrincipal.trim() : "";
        const acompanantes = req.body.acompanantes || []; 

        if (!nombrePrincipal) return res.status(400).json({ error: "El nombre principal es requerido" });

        const yaConfirmado = evento.asistentes.some(a => a.toLowerCase() === nombrePrincipal.toLowerCase());
        if (yaConfirmado) return res.status(400).json({ error: "Este invitado ya confirmó." });

        const totalNuevos = 1 + acompanantes.length; 

        // Si hay lista VIP y no está en ella, lo mandamos a pendientes
        if (evento.listaInvitados && evento.listaInvitados.length > 0) {
            const estaEnLista = evento.listaInvitados.some(invitado => 
                invitado.trim().toLowerCase() === nombrePrincipal.toLowerCase()
            );
            
            if (!estaEnLista) {
                // Verificamos que no haya enviado solicitud antes
                const yaPendiente = evento.pendientes.some(p => p.nombrePrincipal.toLowerCase() === nombrePrincipal.toLowerCase());
                if (yaPendiente) return res.status(400).json({ error: "Ya enviaste una solicitud. Está en revisión." });

                evento.pendientes.push({ nombrePrincipal, acompanantes });
                await evento.save();
                return res.json({ ok: true, waitlist: true, mensaje: "Aprobación pendiente" });
            }
        }

        // Si pasó los filtros o no había lista VIP, comprobamos cupo normal
        if (evento.limiteAsistentes && (evento.asistentes.length + totalNuevos) > evento.limiteAsistentes) {
            const cuposRestantes = evento.limiteAsistentes - evento.asistentes.length;
            return res.status(403).json({ error: `El evento está lleno. Quedan ${cuposRestantes} cupos.` });
        }

        evento.asistentes.push(nombrePrincipal);
        acompanantes.forEach(nombreExtra => {
            if (nombreExtra.trim()) evento.asistentes.push(`${nombreExtra.trim()} (Acompañante de ${nombrePrincipal})`);
        });

        await evento.save();
        res.json({ ok: true, waitlist: false, mensaje: "Asistencia confirmada" });
    } catch (error) {
        res.status(500).json({ error: "Error interno" });
    }
});

// 🟢 NUEVA RUTA: El cliente aprueba a un pendiente
app.post("/api/eventos/compartido/:token/aprobar", async (req, res) => {
    try {
        const evento = await Evento.findOne({ tokenCliente: req.params.token });
        if (!evento) return res.status(404).json({ error: "Token inválido" });

        const index = req.body.index; // El número en la lista de pendientes
        const solicitud = evento.pendientes[index];
        if (!solicitud) return res.status(400).json({ error: "Solicitud no existe" });

        const totalNuevos = 1 + solicitud.acompanantes.length;
        if (evento.limiteAsistentes && (evento.asistentes.length + totalNuevos) > evento.limiteAsistentes) {
            return res.status(403).json({ error: "No hay cupo suficiente para aprobar esta solicitud." });
        }

        // Lo pasamos a asistentes oficiales
        evento.asistentes.push(solicitud.nombrePrincipal);
        solicitud.acompanantes.forEach(extra => {
            evento.asistentes.push(`${extra} (Acompañante de ${solicitud.nombrePrincipal})`);
        });

        // Lo borramos de pendientes
        evento.pendientes.splice(index, 1);
        await evento.save();

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "Error aprobando" });
    }
});

// 🟢 NUEVA RUTA: El cliente rechaza a un pendiente
app.post("/api/eventos/compartido/:token/rechazar", async (req, res) => {
    try {
        const evento = await Evento.findOne({ tokenCliente: req.params.token });
        if (!evento) return res.status(404).json({ error: "Token inválido" });

        const index = req.body.index;
        if (evento.pendientes[index]) {
            evento.pendientes.splice(index, 1); // Lo borramos
            await evento.save();
        }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "Error rechazando" });
    }
});

app.post("/upload", upload.any(), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.json({ urls: [] });
        const uploadPromises = req.files.map(file => {
            return cloudinary.uploader.upload(file.path).then(result => {
                fs.unlinkSync(file.path); 
                return result.secure_url;
            }).catch(e => { throw e; });
        });
        const urls = await Promise.all(uploadPromises);
        res.json({ urls: urls }); 
    } catch (error) {
        res.status(500).json({ error: "Error subiendo imágenes a la nube" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));