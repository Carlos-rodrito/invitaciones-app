require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs"); 
const crypto = require("crypto"); 
// 🟢 NUEVAS LIBRERÍAS DE SEGURIDAD
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
// 1. MODELO DE USUARIO (NUEVO)
// ==========================================
const UsuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true } // Aquí se guardará encriptada
});
const Usuario = mongoose.model("Usuario", UsuarioSchema);

// ==========================================
// 2. MODELO DE EVENTOS (ACTUALIZADO)
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
    pendientes: [{ nombrePrincipal: String, acompanantes: [String] }],
    // 🟢 NUEVO: Este campo vincula el evento con el usuario que lo creó
    creadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
});
const Evento = mongoose.model("Evento", EventoSchema);

// ==========================================
// 3. CANDADO DE SEGURIDAD (MIDDLEWARE)
// ==========================================
// Esta función revisa si el usuario trae un Token válido antes de dejarlo pasar
const verificarToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ error: "Acceso denegado. Se necesita un token." });

    try {
        // Quitamos la palabra "Bearer " que suele venir con el token
        const tokenLimpio = token.replace("Bearer ", "");
        const decodificado = jwt.verify(tokenLimpio, process.env.JWT_SECRET);
        req.usuario = decodificado; // Guardamos los datos del usuario en la petición
        next(); // Le damos pase
    } catch (error) {
        res.status(401).json({ error: "Token inválido o expirado." });
    }
};

// ==========================================
// 4. RUTAS DE AUTENTICACIÓN (LOGIN Y REGISTRO)
// ==========================================
app.post("/api/auth/registro", async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        
        // Revisar si el correo ya existe
        const existe = await Usuario.findOne({ email });
        if (existe) return res.status(400).json({ error: "El correo ya está registrado." });

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        const nuevoUsuario = new Usuario({ nombre, email, password: passwordEncriptada });
        await nuevoUsuario.save();

        res.json({ mensaje: "Usuario creado exitosamente. Ya puedes iniciar sesión." });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar usuario." });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const usuario = await Usuario.findOne({ email });
        if (!usuario) return res.status(400).json({ error: "Correo o contraseña incorrectos." });

        // Comparar la contraseña ingresada con la encriptada
        const passCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passCorrecta) return res.status(400).json({ error: "Correo o contraseña incorrectos." });

        // Crear el Token (Pase VIP)
        const token = jwt.sign({ id: usuario._id, nombre: usuario.nombre }, process.env.JWT_SECRET, { expiresIn: "7d" });
        
        res.json({ token, nombre: usuario.nombre });
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor al iniciar sesión." });
    }
});

// ==========================================
// 5. RUTAS DE EVENTOS
// ==========================================
app.get("/", (req, res) => res.json({ estado: "Online" }));

// 🟢 MODIFICADO: Protegido con verificarToken. Solo devuelve los eventos DEL USUARIO.
app.get("/api/eventos", verificarToken, async (req, res) => {
    try {
        const eventos = await Evento.find({ creadorId: req.usuario.id }).sort({ _id: -1 });
        res.json(eventos);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo eventos" });
    }
});

// 🟢 MODIFICADO: Protegido con verificarToken. Asigna el creadorId automáticamente.
app.post("/api/eventos", verificarToken, async (req, res) => {
    try {
        const tokenGenerado = crypto.randomBytes(8).toString('hex');
        const evento = new Evento({
            ...req.body,
            asistentes: [],
            pendientes: [],
            tokenCliente: tokenGenerado,
            creadorId: req.usuario.id // Vinculamos el evento al usuario logueado
        });
        await evento.save();
        res.json(evento);
    } catch (error) {
        res.status(500).json({ error: "Error creando el evento" });
    }
});

// GET público para cargar un evento específico (No necesita token, para que los invitados puedan verlo)
app.get("/api/eventos/:id", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado" });
        res.json(evento);
    } catch (error) {
        res.status(500).json({ error: "ID inválido" });
    }
});

// GET público para el panel del cliente
app.get("/api/eventos/compartido/:token", async (req, res) => {
    try {
        const evento = await Evento.findOne({ tokenCliente: req.params.token });
        if (!evento) return res.status(404).json({ error: "Enlace inválido o expirado" });
        res.json({
            titulo: evento.titulo, fecha: evento.fecha, lugar: evento.lugar,
            asistentes: evento.asistentes, pendientes: evento.pendientes,
            limiteAsistentes: evento.limiteAsistentes,
            totalLista: evento.listaInvitados ? evento.listaInvitados.length : 0
        });
    } catch (error) {
        res.status(500).json({ error: "Error del servidor" });
    }
});

// RUTAS PÚBLICAS (RSVP y Responder solicitudes) - Estas quedan igual porque las usan los invitados/clientes, no tú.
app.post("/api/eventos/:id/rsvp", async (req, res) => {
    // ... (El código exacto que ya tenías para RSVP)
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

        const nombrePrincipal = req.body.nombrePrincipal ? req.body.nombrePrincipal.trim() : "";
        const acompanantes = req.body.acompanantes || []; 

        if (!nombrePrincipal) return res.status(400).json({ error: "El nombre principal es requerido" });

        const yaConfirmado = evento.asistentes.some(a => a.toLowerCase() === nombrePrincipal.toLowerCase());
        if (yaConfirmado) return res.status(400).json({ error: "Este invitado ya confirmó." });

        const totalNuevos = 1 + acompanantes.length; 

        if (evento.listaInvitados && evento.listaInvitados.length > 0) {
            const estaEnLista = evento.listaInvitados.some(invitado => 
                invitado.trim().toLowerCase() === nombrePrincipal.toLowerCase()
            );
            
            if (!estaEnLista) {
                const yaPendiente = evento.pendientes.some(p => p.nombrePrincipal.toLowerCase() === nombrePrincipal.toLowerCase());
                if (yaPendiente) return res.status(400).json({ error: "Ya enviaste una solicitud. Está en revisión." });

                evento.pendientes.push({ nombrePrincipal, acompanantes });
                await evento.save();
                return res.json({ ok: true, waitlist: true, mensaje: "Aprobación pendiente" });
            }
        }

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

app.post("/api/eventos/compartido/:token/aprobar", async (req, res) => {
    // ... (El código exacto que ya tenías)
    try {
        const evento = await Evento.findOne({ tokenCliente: req.params.token });
        if (!evento) return res.status(404).json({ error: "Token inválido" });

        const index = req.body.index; 
        const solicitud = evento.pendientes[index];
        if (!solicitud) return res.status(400).json({ error: "Solicitud no existe" });

        const totalNuevos = 1 + solicitud.acompanantes.length;
        if (evento.limiteAsistentes && (evento.asistentes.length + totalNuevos) > evento.limiteAsistentes) {
            return res.status(403).json({ error: "No hay cupo suficiente para aprobar esta solicitud." });
        }

        evento.asistentes.push(solicitud.nombrePrincipal);
        solicitud.acompanantes.forEach(extra => {
            evento.asistentes.push(`${extra} (Acompañante de ${solicitud.nombrePrincipal})`);
        });

        evento.pendientes.splice(index, 1);
        await evento.save();
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "Error aprobando" });
    }
});

app.post("/api/eventos/compartido/:token/rechazar", async (req, res) => {
    // ... (El código exacto que ya tenías)
    try {
        const evento = await Evento.findOne({ tokenCliente: req.params.token });
        if (!evento) return res.status(404).json({ error: "Token inválido" });

        const index = req.body.index;
        if (evento.pendientes[index]) {
            evento.pendientes.splice(index, 1);
            await evento.save();
        }
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: "Error rechazando" });
    }
});

// GET asistentes público (para que Admin y Cliente puedan verlo)
app.get("/api/eventos/:id/asistentes", async (req, res) => {
    try {
        const evento = await Evento.findById(req.params.id);
        if (!evento) return res.status(404).json({ error: "No encontrado" });
        res.json(evento.asistentes);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo asistentes" });
    }
});

// 🟢 MODIFICADO: Protegido con verificarToken. Nadie puede subir fotos a tu Cloudinary sin estar logueado.
app.post("/upload", verificarToken, upload.any(), async (req, res) => {
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