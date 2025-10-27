/**
 * Modelo: Shift (Turno)
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Armazena turnos gerados, com índices para evitar duplicatas.
 * Observações de modelagem:
 * - date e endDate: strings no formato YYYY-MM-DD para simplificar filtros
 * - start/end: horário (HH:mm) no fuso local
 * - durationHours/isOvernight/is24h: metadados calculados
 * Índices:
 * - Único (agentId, date, start) para impedir duplicidade de turnos
 */
const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    date: { type: String, required: true }, // YYYY-MM-DD no fuso local (data de início)
    endDate: { type: String }, // YYYY-MM-DD (data de fim para escalas contínuas)
    start: { type: String, required: true }, // HH:mm
    end: { type: String, required: true }, // HH:mm
    durationHours: { type: Number, default: 0 },
    isOvernight: { type: Boolean, default: false },
    is24h: { type: Boolean, default: false },
    location: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: () => new Date() }
  },
  { collection: 'shifts' }
);

// Índice único para evitar duplicidade do mesmo agente na mesma data/horário
ShiftSchema.index({ agentId: 1, date: 1, start: 1 }, { unique: true });
ShiftSchema.index({ tenantId: 1, date: 1, start: 1 });

const Shift = mongoose.models.Shift || mongoose.model('Shift', ShiftSchema);
module.exports = { Shift };