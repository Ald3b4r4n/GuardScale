/**
 * Serviço: reportService
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Agrega dados de agentes e turnos para relatórios do frontend.
 * Contrato:
 * - computeReports({ period, shifts, agents, startDate, endDate }) =>
 *   { period, range, generatedAt, summary[], grandTotalHours, grandTotalAmount }
 * Observações:
 * - Faz o join por agentId e calcula totais por agente e geral
 */
const dayjs = require('dayjs');

/**
 * Consolida métricas por agente e totais gerais no período.
 */
function computeReports({
  period = 'monthly',
  shifts = [],
  agents = [],
  startDate,
  endDate
}) {
  const agentMap = new Map(agents.map((a) => [String(a._id), a]));
  const totals = {};

  shifts.forEach((s) => {
    const aid = String(s.agentId);
    const agent = agentMap.get(aid);
    const rate = agent?.hourlyRate || 0;
    const amount = Number((rate * (s.durationHours || 0)).toFixed(2));
    if (!totals[aid]) {
      totals[aid] = {
        agentName: agent?.name || aid,
        totalHours: 0,
        totalAmount: 0,
        items: []
      };
    }
    totals[aid].totalHours += s.durationHours || 0;
    totals[aid].totalAmount += amount;
    totals[aid].items.push({
      date: s.date,
      start: s.start,
      end: s.end,
      hours: s.durationHours || 0,
      amount
    });
  });

  const summary = Object.values(totals).map((t) => ({
    agentName: t.agentName,
    totalHours: Number(t.totalHours.toFixed(2)),
    totalAmount: Number(t.totalAmount.toFixed(2)),
    items: t.items
  }));

  return {
    period,
    range: { startDate, endDate },
    generatedAt: dayjs().format(),
    summary,
    grandTotalHours: Number(
      summary.reduce((acc, s) => acc + s.totalHours, 0).toFixed(2)
    ),
    grandTotalAmount: Number(
      summary.reduce((acc, s) => acc + s.totalAmount, 0).toFixed(2)
    )
  };
}

module.exports = { computeReports };
