/**
 * Serviço: scheduleService
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Regras de geração de escalas (diária, semanal, mensal) e salvamento.
 * Contratos principais:
 * - calcDuration(date, start, end): retorna { durationHours, isOvernight, is24h }
 * - generateSchedule({ period, startDate, endDate, shiftLengths, startTimes, agents, notes })
 *   => { schedule, shiftsToSave }
 */
const dayjs = require('dayjs');

/**
 * Calcula a duração (em horas) e flags (pernoite/24h) de um turno.
 * Considera virada de dia quando end <= start.
 */
function calcDuration(date, start, end) {
  const startDT = dayjs(`${date} ${start}`);
  let endDT = dayjs(`${date} ${end}`);
  let isOvernight = false;
  let is24h = false;
  if (endDT.isBefore(startDT) || endDT.isSame(startDT)) {
    // terminou no dia seguinte ou 24h
    endDT = endDT.add(1, 'day');
    isOvernight = true;
    if (endDT.diff(startDT, 'hour', true) === 24) {
      is24h = true;
    }
  }
  const durationHours = Number((endDT.diff(startDT, 'minute') / 60).toFixed(2));
  return { durationHours, isOvernight, is24h };
}

// Rotaciona agentes por índice (não utilizado no fluxo atual; mantido para extensão)
function _rotateAgents(agents, idx) {
  if (!agents.length) {
    return null;
  }
  return agents[idx % agents.length];
}

// Gera um intervalo de datas baseado em período (não utilizado na versão atual)
function _getDatesRange(period, startDate, endDate) {
  const dates = [];
  const start = dayjs(startDate).startOf('day');
  const end = endDate
    ? dayjs(endDate).endOf('day')
    : period === 'weekly'
      ? dayjs(startDate).add(6, 'day')
      : dayjs(startDate).endOf('month');
  for (
    let d = start;
    d.isBefore(end) || d.isSame(end, 'day');
    d = d.add(1, 'day')
  ) {
    dates.push(d.format('YYYY-MM-DD'));
  }
  return dates;
}

/**
 * Gera uma programação de turnos a partir de horários e agentes fornecidos.
 * Notas:
 * - Atualmente gera uma linha por agente para cada horário inicial.
 * - A duração é aplicada por horário (shiftLengths alinhado a startTimes).
 */
function generateSchedule({
  period: _period = 'weekly',
  startDate,
  endDate: _endDate,
  shiftLengths = [8],
  startTimes = ['08:00'],
  agents,
  notes
}) {
  const schedule = [];
  const shiftsToSave = [];
  const _assignIndex = 0;

  // Para cada horário de início configurado
  startTimes.forEach((startTime, si) => {
    const hours = Number(shiftLengths[si] || shiftLengths[0]);

    // Para cada agente selecionado
    agents.forEach((agent) => {
      // Calcular horário de término baseado na duração
      const startDateTime = dayjs(`${startDate} ${startTime}`);
      const endDateTime = startDateTime.add(hours, 'hour');
      const endTime = endDateTime.format('HH:mm');

      // Verificar se o turno termina no dia seguinte
      const endDateForShift = endDateTime.format('YYYY-MM-DD');
      const spansMultipleDays = endDateForShift !== startDate;

      // Calcular duração e tipo de turno
      const { durationHours, isOvernight, is24h } = calcDuration(
        startDate,
        startTime,
        endTime
      );

      // Criar item único para este turno
      const item = {
        date: startDate,
        start: startTime,
        end: endTime,
        agentId: agent._id,
        agentName: agent.name,
        notes,
        durationHours,
        isOvernight,
        is24h,
        // Se o turno termina em outro dia, armazenar a data de término
        endDate: spansMultipleDays ? endDateForShift : undefined
      };

      schedule.push(item);
      shiftsToSave.push({
        agentId: agent._id,
        date: startDate,
        start: startTime,
        end: endTime,
        notes,
        durationHours,
        isOvernight,
        is24h,
        endDate: spansMultipleDays ? endDateForShift : undefined
      });
    });
  });

  return { schedule, shiftsToSave };
}

module.exports = { generateSchedule, calcDuration };