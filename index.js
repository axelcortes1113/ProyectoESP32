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
  .then(() => console.log('MongoDB conectado correctamente'))
  .catch(err => console.error('Error MongoDB:', err));

// === APIs ===
// POST: Recibe datos del ESP32 con DHT22
app.post('/api/telemetry', async (req, res) => {
  try {
    const { temp, hum, timestamp } = req.body;

    // Validación básica
    if (temp === undefined || hum === undefined || !timestamp) {
      return res.status(400).json({ error: 'Faltan campos: temp, hum o timestamp' });
    }

    // Convertir el string de timestamp a objeto Date (acepta ISO o tu formato)
    const fecha = new Date(timestamp);
    if (isNaN(fecha.getTime())) {
      return res.status(400).json({ error: 'Formato de timestamp inválido' });
    }

    const nuevoDato = new Telemetry({
      temp,
      hum,
      timestamp: fecha  // Se guarda en UTC en la base de datos
    });

    await nuevoDato.save();

    // Formatear la fecha en hora local de México para la respuesta
    const timestampLocal = fecha.toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    console.log(`Dato guardado → ${temp}°C | ${hum}% | ${timestampLocal} (CDMX)`);

    res.status(201).json({ 
      message: 'Dato DHT22 guardado correctamente',
      id: nuevoDato._id,
      dato: {
        temp: nuevoDato.temp,
        hum: nuevoDato.hum,
        timestamp_utc: nuevoDato.timestamp,           // UTC (como está en MongoDB)
        timestamp_local: timestampLocal               // Hora de México formateada
      }
    });

  } catch (err) {
    console.error('Error guardando dato:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Todos los registros (ordenados por fecha descendente)
app.get('/api/telemetry', async (req, res) => {
  try {
    const datos = await Telemetry.find().sort({ timestamp: -1 });

    // Convertir a hora local (Querétaro)
    const datosFormateados = datos.map(d => ({
      temp: d.temp,
      hum: d.hum,
      timestamp_local: d.timestamp.toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City'
      }),
      timestamp_utc: d.timestamp
    }));

    res.json(datosFormateados);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW ENDPOINT: Política de actualización (JSON)
// Devuelve un intervalo aleatorio entre 4 y 60 segundos,
// junto con metadatos para que el ESP32 sepa cuándo volver a consultar.
// Respuesta ejemplo:
// {
//   "intervalSeconds": 12,
//   "intervalMs": 12000,
//   "validUntil": "2025-12-04T12:34:56.000Z",
//   "nextCheckHint": "Consulta nuevamente al expirar validUntil",
//   "message": "Usa este intervalo para envío de datos"
// }
app.get('/api/update-interval', (req, res) => {
  // Se puede personalizar por dispositivo con query ?device=...
  const device = (req.query.device || '').toString();

  // Intervalo base aleatorio 4–60s
  const intervalSeconds = Math.floor(Math.random() * (60 - 4 + 1)) + 4;

  // Ejemplo de política sencilla: si el dispositivo incluye "lab",
  // reducimos ligeramente el intervalo pero manteniendo límites.
  const adjustedSeconds = device.includes('lab')
    ? Math.max(4, Math.min(60, intervalSeconds - 2))
    : intervalSeconds;

  const intervalMs = adjustedSeconds * 1000;
  const validUntil = new Date(Date.now() + intervalMs).toISOString();

  res.json({
    intervalSeconds: adjustedSeconds,
    intervalMs,
    validUntil,
    nextCheckHint: 'Consulta nuevamente al expirar validUntil',
    message: 'Usa este intervalo para envío de datos',
    device: device || undefined
  });
});

// GET: Contador total
app.get('/api/telemetry/count', async (req, res) => {
  try {
    const count = await Telemetry.countDocuments();
    res.json({ total_registros: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta raíz (opcional, para ver que funciona)
app.get('/', (req, res) => {
  res.send(`
    <h1>ESP32 + DHT22 Telemetría</h1>
    <p><strong>Estado:</strong> API funcionando</p>
    <p><strong>Endpoint POST:</strong> <code>/api/datos</code></p>
    <p><strong>Total registros:</strong> <span id="count">cargando...</span></p>
    <script>
      fetch('/api/datos/count').then(r => r.json()).then(d => {
        document.getElementById('count').textContent = d.total_registros;
      });
    </script>
  `);
});
// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`POST → https://telemetry-gamma.vercel.app/api/telemetry`);
  console.log(`UPDATE → https://telemetry-gamma.vercel.app/api/update-interval`);
});