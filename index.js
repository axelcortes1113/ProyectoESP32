require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Telemetry = require('./models/Telemetry');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ===== Conectar a MongoDB =====
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado correctamente'))
  .catch(err => console.error('Error MongoDB:', err));


// =====================================================
// POST → Recibe datos del ESP32 (temp, hum, timestamp)
// =====================================================
app.post('/api/telemetry', async (req, res) => {
  try {
    const { temp, hum, timestamp } = req.body;

    // Validación
    if (temp === undefined || hum === undefined || !timestamp) {
      return res.status(400).json({ error: 'Faltan campos: temp, hum o timestamp' });
    }

    // Convertir el timestamp ISO 8601 enviado por el ESP32 ↓↓↓
    // EJEMPLO: "2025-11-20T14:46:53-06:00"
    const fecha = new Date(timestamp);

    if (isNaN(fecha.getTime())) {
      return res.status(400).json({ error: 'Formato de timestamp inválido' });
    }

    // Guardar en MongoDB
    const nuevoDato = new Telemetry({
      temp,
      hum,
      timestamp: fecha
    });

    await nuevoDato.save();

    console.log(`Guardado → ${temp}°C | ${hum}% | ${fecha.toISOString()}`);

    return res.status(201).json({
      message: "Dato guardado correctamente",
      id: nuevoDato._id
    });

  } catch (err) {
    console.error('Error guardando dato:', err);
    return res.status(500).json({ error: err.message });
  }
});


// =====================================================
// GET → Devuelve todos los registros ordenados por fecha
// =====================================================
app.get('/api/telemetry', async (req, res) => {
  try {
    const datos = await Telemetry.find().sort({ timestamp: -1 });
    res.json(datos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =====================================================
// GET → Total registros
// =====================================================
app.get('/api/telemetry/count', async (req, res) => {
  try {
    const total = await Telemetry.countDocuments();
    res.json({ total_registros: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =====================================================
// Página raíz (opcional)
// =====================================================
app.get('/', (req, res) => {
  res.send(`
    <h1>ESP32 + DHT22 Telemetría</h1>
    <p>API activa correctamente</p>
    <p>POST → /api/telemetry</p>
  `);
});


// PUERTO
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`POST → https://esp32-telemetry.onrender.com/api/telemetry`);
});
