const dayjs = require('dayjs');

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

function rotateAgents(agents, idx) {
  if (!agents.length) {
    return null;
  }
  return agents[idx % agents.length];
}

function getDatesRange(period, startDate, endDate) {
  const dates = [];
  const start = dayjs(startDate).startOf('day');
  const end = endDate ? dayjs(endDate).endOf('day') : (period === 'weekly' ? dayjs(startDate).add(6, 'day') : dayjs(startDate).endOf('month'));
  for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
    dates.push(d.format('YYYY-MM-DD'));
  }
  return dates;
}

function generateSchedule({ period = 'weekly', startDate, endDate, shiftLengths = [8], startTimes = ['08:00'], agents, notes }) {
  const schedule = [];
  const shiftsToSave = [];
  const assignIndex = 0;

  // Para cada horário de início configurado
  startTimes.forEach((startTime, si) => {
    const hours = Number(shiftLengths[si] || shiftLengths[0]);

    // Para cada agente selecionado
    agents.forEach(agent => {
      // Calcular horário de término baseado na duração
      const startDateTime = dayjs(`${startDate} ${startTime}`);
      const endDateTime = startDateTime.add(hours, 'hour');
      const endTime = endDateTime.format('HH:mm');

      // Verificar se o turno termina no dia seguinte
      const endDateForShift = endDateTime.format('YYYY-MM-DD');
      const spansMultipleDays = endDateForShift !== startDate;

      // Calcular duração e tipo de turno
      const { durationHours, isOvernight, is24h } = calcDuration(startDate, startTime, endTime);

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