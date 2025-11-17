require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Telemetry = require('./models/Telemetry');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error MongoDB:', err));

// === RUTAS ===

// POST: Recibir datos del ESP32 con MAX30102
app.post('/api/telemetry', async (req, res) => {
  try {
    const data = req.body;

    // Convertir timestamp de segundos (del ESP32) a Date
    if (data.timestamp) {
      data.timestamp = new Date(data.timestamp * 1000);
    }

    const telemetry = new Telemetry(data);
    await telemetry.save();

    console.log(`Datos recibidos → SpO₂: ${data.spo2}% | BPM: ${data.heart_rate}`);
    res.status(201).json({ 
      message: 'Datos de MAX30102 guardados', 
      id: telemetry._id 
    });
  } catch (err) {
    console.error('Error guardando datos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Todos los registros (ordenados por fecha)
app.get('/api/telemetry', async (req, res) => {
  try {
    const data = await Telemetry.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Contar cuántos registros hay
app.get('/api/telemetry/count', async (req, res) => {
  try {
    const count = await Telemetry.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.send(`
    <h1>ESP32 + MAX30102 Telemetría</h1>
    <p>Registros guardados: <b>${Telemetry.countDocuments()}</b></p>
    <p>POST → /api/telemetry</p>
    <p>GET → /api/telemetry</p>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`POST → https://esp32-telemetry.onrender.com/api/telemetry`);
});