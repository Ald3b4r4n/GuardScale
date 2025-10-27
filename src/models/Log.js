/**
 * Modelo: Log (Registro de eventos)
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Mantém logs simples para auditoria/diagnóstico.
 * Campos:
 * - ts: timestamp do evento
 * - user: operador/autor da ação
 * - entity: domínio afetado (agents|shifts|configs)
 * - operation: tipo da operação (create|update|delete|generate|...)
 * - before/after: estado anterior/posterior para auditoria
 */
const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema(
  {
    ts: { type: Date, default: () => new Date() },
    user: { type: String },
    entity: { type: String }, // agents|shifts|configs
    operation: { type: String }, // create|update|delete|generate
    before: { type: Object },
    after: { type: Object }
  },
  { collection: 'logs' }
);

const Log = mongoose.models.Log || mongoose.model('Log', LogSchema);
module.exports = { Log };