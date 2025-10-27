/**
 * Modelo: Agent (Agente)
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Estrutura de dados do agente e hooks para deleção em cascata.
 * Campos principais:
 * - name, phone, cpf, pix: dados cadastrais obrigatórios
 * - status: situação do agente (disponível, escalado, indisponível)
 * - hourlyRate: valor da hora para cálculo de relatórios
 * Hooks:
 * - post('findOneAndDelete'): remove escalas vinculadas (ObjectId e string)
 */
const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    cpf: { type: String, required: true },
    pix: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    status: {
      type: String,
      enum: ['disponível', 'escalado', 'indisponível'],
      default: 'disponível'
    },
    hourlyRate: { type: Number, default: 0 },
    createdAt: { type: Date, default: () => new Date() }
  },
  { collection: 'agents' }
);

// Índice simples por nome para facilitar buscas ordenadas no frontend
AgentSchema.index({ name: 1 });
AgentSchema.index({ tenantId: 1, name: 1 });

// Deleção em cascata: remove turnos quando um agente é deletado via findOneAndDelete
AgentSchema.post('findOneAndDelete', async function (doc) {
  try {
    if (!doc) {
      return;
    }
    const Shift = mongoose.model('Shift');
    const idStr = String(doc._id);
    await Shift.deleteMany({ $or: [{ agentId: doc._id }, { agentId: idStr }] });
  } catch (_e) {
    // noop: fallback deletion also handled in route
  }
});

const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
module.exports = { Agent };