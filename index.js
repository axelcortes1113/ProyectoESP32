require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Telemetry = require('./models/Telemetry');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error MongoDB:', err));

// === APIs ===

// POST: Recibir datos del ESP32
app.post('/api/telemetry', async (req, res) => {
  try {
    const data = req.body;
    // Convertir timestamp de segundos a Date
    if (data.timestamp) {
      data.timestamp = new Date(data.timestamp * 1000);
    }
    const telemetry = new Telemetry(data);
    await telemetry.save();
    res.status(201).json({ message: 'Datos guardados', id: telemetry._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Obtener todos los registros
app.get('/api/telemetry', async (req, res) => {
  try {
    const data = await Telemetry.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Contar registros
app.get('/api/telemetry/count', async (req, res) => {
  try {
    const count = await Telemetry.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API corriendo en: http://localhost:${PORT}`);
  console.log(`POST → http://localhost:${PORT}/api/telemetry`);
});