// models/Telemetry.js
const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
    device_id: { type: String, required: true },
    spo2: { type: Number },          // Saturación de oxígeno (%)
    heart_rate: { type: Number },    // Frecuencia cardíaca (BPM)
    cpu_cores: Number,
    flash_size_mb: Number,
    free_heap: Number,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Telemetry', telemetrySchema);