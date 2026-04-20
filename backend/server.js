require("dotenv").config(); // Añade esto al inicio
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs"); // Para borrar los archivos locales

const app = express();
app.use(cors());
app.use(express.json());

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const upload = multer({ dest: "uploads/" });

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB conectado"))
    .catch(err => console.log(err));

// ... (Tu modelo EventoSchema va aquí) ...

// RUTA DE UPLOAD (Moverla arriba del app.listen)
app.post("/upload", upload.single("imagen"), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ url: "" });
        }
        const result = await cloudinary.uploader.upload(req.file.path);
        
        // Eliminar el archivo temporal del servidor local
        fs.unlinkSync(req.file.path); 

        res.json({ url: result.secure_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error subiendo imagen" });
    }
});

// ... (El resto de tus rutas de API van aquí) ...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor corriendo en puerto", PORT);
});