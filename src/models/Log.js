/*
 * Modelo: Log (auditoria e eventos)
 * Campos flexíveis para registrar operações, solicitações e metadados.
 */
const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema(
  {
    ts: { type: Date, default: () => new Date(), index: true },
    level: { type: String, default: 'info' },
    type: { type: String },
    message: { type: String },
    user: { type: String },
    entity: { type: String },
    operation: { type: String },
    before: {},
    after: {},
    meta: {},
    requestId: { type: String }
  },
  { collection: 'logs' }
);

const Log = mongoose.models.Log || mongoose.model('Log', LogSchema);
module.exports = { Log };