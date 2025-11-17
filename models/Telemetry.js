const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
    device_id: String,
    temperature: Number,
    humidity: Number,
    cpu_cores: Number,
    flash_size_mb: Number,
    free_heap: Number,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Telemetry', telemetrySchema);