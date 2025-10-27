/*
 * Módulo: Relatórios
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Consolida métricas e listas de escalas para análise e exportação.
 */
import { api } from '../api.js';
import { skeletonTableRows, skeletonLines } from '../modules/ui.js';

/**
 * Renderiza uma linha da tabela de resumo do relatório (por agente).
 * @param {{agentName:string,totalHours:number,totalAmount:number}} r
 */
function row(r) {
  return `<tr class='border-b'>
     <td class='p-2'>${r.agentName}</td>
     <td class='p-2'>${r.totalHours}</td>
     <td class='p-2 text-green-600'>R$ ${r.totalAmount.toFixed(2)}</td>
   </tr>`;
}

/**
 * Renderiza o módulo de Relatórios.
 * Exibe métricas e uma tabela de resumo por agente para um período selecionado.
 */
export async function renderReports({ _banner }) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const html = `
  <div class='flex items-center justify-between mb-4'>
    <h1 class='text-3xl font-bold'>Relatórios</h1>
  </div>
  <div class='grid grid-cols-1 md:grid-cols-3 gap-4'>
    <div class='card p-4'>
      <h2 class='text-xl font-semibold mb-2'>Período</h2>
      <form id='repForm' class='grid gap-3'>
        <div class='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <div>
            <label class='text-sm'>Início</label>
            <input name='startDate' type='date' value='${start}' class='w-full border rounded px-3 py-2' />
          </div>
          <div>
            <label class='text-sm'>Fim</label>
            <input name='endDate' type='date' value='${end}' class='w-full border rounded px-3 py-2' />
          </div>
        </div>
        <button id='generate' class='btn-primary btn-block'>Gerar</button>
      </form>
    </div>

    <div class='md:col-span-2 card p-4'>
      <div class='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3'>
        <div class='p-3 bg-grayLight dark:bg-gray-700/40 rounded'><div class='text-sm text-grayMid'>Total Mensal</div><div id='totalMensal' class='text-2xl font-bold text-green-600'>R$ 0,00</div></div>
        <div class='p-3 bg-grayLight dark:bg-gray-700/40 rounded'><div class='text-sm text-grayMid'>Média Semanal</div><div id='mediaSemanal' class='text-xl font-semibold'>0 h</div></div>
        <div class='p-3 bg-grayLight dark:bg-gray-700/40 rounded'><div class='text-sm text-grayMid'>Horas Totais</div><div id='horasTotais' class='text-xl font-semibold'>0 h</div></div>
      </div>
      <div class='overflow-x-auto rounded-lg border border-white/30 dark:border-white/10'>
        <table class='w-full text-left table-condensed min-w-[480px]'>
          <thead><tr class='border-b table-header'>
            <th class='cell-condensed text-gray-700 dark:text-gray-200'>Agente</th><th class='cell-condensed text-gray-700 dark:text-gray-200'>Horas</th><th class='cell-condensed text-gray-700 dark:text-gray-200'>Valor</th>
          </tr></thead>
          <tbody id='repBody'></tbody>
        </table>
      </div>
    </div>
  </div>`;

  // Após injetar o HTML, ligar eventos e realizar primeira carga de dados
  setTimeout(() => {
    const form = document.getElementById('repForm');
    const tbody = document.getElementById('repBody');
    const totalMensal = document.getElementById('totalMensal');
    const mediaSemanal = document.getElementById('mediaSemanal');
    const horasTotais = document.getElementById('horasTotais');

    /**
     * Carrega dados do backend, aplicando skeletons enquanto aguarda,
     * e popula as métricas e a tabela de resumo.
     */
    async function load() {
      const fd = new FormData(form);
      const q = Object.fromEntries(fd);
      // Skeleton placeholders
      tbody.innerHTML = skeletonTableRows(6, 3);
      totalMensal.innerHTML = skeletonLines(1, { className: 'w-32' });
      mediaSemanal.innerHTML = skeletonLines(1, { className: 'w-24' });
      horasTotais.innerHTML = skeletonLines(1, { className: 'w-24' });
      const report = await api.get(
        `/api/reports?startDate=${q.startDate}&endDate=${q.endDate}`
      );
      tbody.innerHTML = report.summary.map(row).join('');
      horasTotais.textContent = `${report.grandTotalHours} h`;
      totalMensal.textContent = `R$ ${report.grandTotalAmount.toFixed(2)}`;
      mediaSemanal.textContent = `${(report.grandTotalHours / 4).toFixed(1)} h`;
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      load();
    };
    load();
  }, 0);

  return html;
}
