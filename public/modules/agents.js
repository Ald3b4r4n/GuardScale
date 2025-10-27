/*
 * Módulo: Agentes (lista, criação, edição e exclusão)
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Renderiza cards de agentes, permite CRUD e visualiza escalas do agente.
 */
import { api } from '../api.js';

/**
 * Formata telefone no padrão brasileiro.
 * @param {string} p Telefone livre
 * @returns {string} Telefone formatado
 */
function formatBRPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return p || '';
}

/**
 * Formata CPF no padrão 000.000.000-00 para exibição.
 * Mantém valor original caso não tenha 11 dígitos numéricos.
 * @param {string} v CPF livre
 * @returns {string}
 */
function formatCPF(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length !== 11) {
    return v || '';
  }
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Renderiza um card individual de agente com avatar, status e ações.
 * @param {{_id:string,name:string,cpf:string,phone:string,pix?:string,avatarUrl?:string,status?:string,_isEscalado?:boolean}} a
 * @returns {string}
 */
function agentRow(a) {
  const phone = formatBRPhone(a.phone);
  const cpf = formatCPF(a.cpf);
  const avatar = a.avatarUrl
    ? `<img src='${a.avatarUrl}' class='w-9 h-9 rounded-full object-cover' alt='avatar'/>`
    : `<div class='w-9 h-9 rounded-full bg-grayLight dark:bg-gray-700 flex items-center justify-center text-xs font-semibold'>${(
      a.name || '?'
    )
      .slice(0, 2)
      .toUpperCase()}</div>`;
  const isEscalado = !!a._isEscalado || a.status === 'escalado';
  const statusClass = isEscalado
    ? 'bg-blue-100 text-blue-700'
    : a.status === 'disponível'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';
  const statusEl = isEscalado
    ? `<button data-id='${a._id}' data-name='${a.name}' class='status-escalado px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 hover:bg-blue-200'>escalado</button>`
    : `<span class='px-2 py-1 rounded text-xs ${statusClass}'>${a.status || 'disponível'}</span>`;
  return `
    <tr class='border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-800/60'>
      <td class='p-2'>
        <div class='flex items-center gap-3'>
          ${avatar}
          <div>
            <div class='font-semibold'>${a.name}</div>
            <div class='text-xs text-grayMid'>CPF: ${cpf}</div>
          </div>
        </div>
      </td>
      <td class='p-2 text-sm whitespace-nowrap'>${phone}</td>
      <td class='p-2 text-sm whitespace-nowrap'>${a.pix || ''}</td>
      <td class='p-2 text-sm whitespace-nowrap'>${statusEl}</td>
      <td class='p-2'>
        <div class='flex items-center gap-2'>
          <button data-id='${a._id}' class='edit btn-secondary text-xs px-2 py-1'>Editar</button>
          <button data-id='${a._id}' class='delete btn-danger text-xs px-2 py-1'>Excluir</button>
        </div>
      </td>
    </tr>`;
}

/**
 * Renderiza a lista de agentes e liga eventos de CRUD e visualização de escalas.
 * @param {{banner:(type:string,msg:string)=>void}} _ctx
 */
export async function renderAgents({ banner }) {
  const agents = await api.get('/api/agents');
  // Determinar agentes escalados (pelo menos uma escala em qualquer data)
  let escalados = new Set();
  try {
    const allShifts = await api.get('/api/shifts');
    escalados = new Set((allShifts || []).map((s) => String(s.agentId)));
  } catch (err) {
    console.warn('[agents] Falha ao verificar escalas', err);
  }
  const agentsWithDisplay = agents.map((a) => ({
    ...a,
    _isEscalado: escalados.has(String(a._id)),
    status: escalados.has(String(a._id))
      ? 'escalado'
      : a.status || 'disponível'
  }));

  const html = `
  <div class='flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4'>
    <h1 class='text-3xl font-bold'>Agentes</h1>
    <!-- Grupo refluído para mobile: input na 1ª linha; select + botão na 2ª -->
    <div class='w-full md:w-auto flex flex-col sm:flex-row gap-2'>
      <input id='agentSearch' class='w-full sm:w-[320px] border rounded px-3 py-2 text-sm' placeholder='Buscar por nome/CPF/telefone' />
      <div class='flex items-center gap-2'>
        <select id='agentStatusFilter' class='flex-1 border rounded px-2 py-2 text-sm'>
          <option value=''>Todos</option>
          <option value='disponível'>Disponíveis</option>
          <option value='escalado'>Escalados</option>
          <option value='indisponível'>Indisponíveis</option>
        </select>
        <button id='newAgent' class='btn-primary shrink-0'>Novo</button>
      </div>
    </div>
  </div>
  
  <!-- Lista em cartões (mobile) -->
  <div id='agentsListMobile' class='sm:hidden grid gap-2'>
    ${agentsWithDisplay.map(agentCard).join('')}
  </div>

  <!-- Tabela (desktop e tablets) -->
  <div class='hidden sm:block overflow-x-auto rounded ring-1 ring-gray-200 dark:ring-gray-700'>
    <table class='w-full text-left min-w-[640px]'>
      <thead class='sticky top-0 bg-white dark:bg-gray-900'>
        <tr class='border-b border-gray-200 dark:border-gray-700'>
          <th class='p-2 text-sm'>Agente</th>
          <th class='p-2 text-sm'>Telefone</th>
          <th class='p-2 text-sm'>PIX</th>
          <th class='p-2 text-sm'>Status</th>
          <th class='p-2 text-sm'>Ações</th>
        </tr>
      </thead>
      <tbody id='agentsBody'>
        ${agentsWithDisplay.map(agentRow).join('')}
      </tbody>
    </table>
  </div>

  <!-- Drawer lateral para criar/editar agente -->
  <div id='agentDrawer' class='fixed inset-y-0 right-0 w-full md:w-[420px] bg-white dark:bg-gray-900 border-l dark:border-gray-700 shadow-xl transform translate-x-full transition z-40'>
    <div class='flex items-center justify-between px-4 py-3 border-b dark:border-gray-700'>
      <h2 id='drawerTitle' class='text-lg font-semibold'>Novo Agente</h2>
      <button id='drawerClose' class='btn-secondary text-sm px-2 py-1'>Fechar</button>
    </div>
    <form id='drawerForm' class='p-4 grid gap-3'>
      <div>
        <label class='text-sm'>Nome</label>
        <input name='name' class='w-full border rounded px-3 py-2' required />
      </div>
      <div class='grid grid-cols-2 gap-3'>
        <div>
          <label class='text-sm'>Telefone</label>
          <input name='phone' class='w-full border rounded px-3 py-2' required />
        </div>
        <div>
          <label class='text-sm'>CPF</label>
          <input name='cpf' class='w-full border rounded px-3 py-2' required />
        </div>
      </div>
      <div class='grid grid-cols-2 gap-3'>
        <div>
          <label class='text-sm'>Avatar URL</label>
          <input name='avatarUrl' class='w-full border rounded px-3 py-2' placeholder='https://...' />
        </div>
        <div>
          <label class='text-sm'>Status</label>
          <select name='status' class='w-full border rounded px-3 py-2'>
            <option value='disponível'>Disponível</option>
            <option value='escalado'>Escalado</option>
            <option value='indisponível'>Indisponível</option>
          </select>
        </div>
      </div>
      <div>
        <label class='text-sm'>Chave PIX</label>
        <input name='pix' class='w-full border rounded px-3 py-2' required />
      </div>
      <div>
        <label class='text-sm'>Valor Hora (R$)</label>
        <input name='hourlyRate' type='number' step='0.01' class='w-full border rounded px-3 py-2' />
      </div>
      <div class='flex justify-end gap-2'>
        <button type='button' id='drawerCancel' class='btn-secondary'>Cancelar</button>
        <button class='btn-primary'>Salvar</button>
      </div>
    </form>
  </div>
  <div id='drawerOverlay' class='fixed inset-0 bg-black/30 hidden z-30'></div>`;

  // Bind de eventos após inserir no DOM (tabela, busca/filtro, drawer, CRUD e escalas)
  setTimeout(() => {
    const btnNew = document.getElementById('newAgent');
    const drawer = document.getElementById('agentDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const dForm = document.getElementById('drawerForm');
    const dTitle = document.getElementById('drawerTitle');

    function openDrawer(title, submitHandler) {
      dTitle.textContent = title;
      dForm.onsubmit = submitHandler;
      drawer.classList.remove('translate-x-full');
      overlay.style.display = 'block';
    }
    function closeDrawer() {
      drawer.classList.add('translate-x-full');
      overlay.style.display = 'none';
    }
    document.getElementById('drawerClose').onclick = closeDrawer;
    document.getElementById('drawerCancel').onclick = closeDrawer;
    overlay.onclick = closeDrawer;

    btnNew.onclick = () => {
      dForm.reset();
      openDrawer('Novo Agente', async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(dForm));
        body.hourlyRate = Number(body.hourlyRate || 0);
        body.avatarUrl = body.avatarUrl || '';
        body.status = body.status || 'disponível';
        try {
          await api.post('/api/agents', body);
          banner('success', 'Agente criado');
        } catch (_err) {
          banner('error', 'Verifique CPF/telefone');
        }
        closeDrawer();
        location.hash = '#agents';
      });
    };

    // Remover agente com confirmação
    document.querySelectorAll('button.delete').forEach((b) => {
      b.onclick = async () => {
        const id = b.dataset.id;
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-50';
        modal.innerHTML = `
          <div class='bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[min(420px,92vw)] p-6'>
            <h3 class='text-lg font-semibold mb-2'>Remover agente</h3>
            <p class='text-sm text-gray-600 dark:text-gray-300 mb-4'>Essa ação é permanente e não pode ser desfeita. Deseja continuar?</p>
            <div class='flex flex-col sm:flex-row justify-end gap-2'>
              <button id='cancelDel' class='px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 btn-block'>Cancelar</button>
              <button id='confirmDel' class='px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 btn-block'>Remover</button>
            </div>
          </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#cancelDel').onclick = () => modal.remove();
        modal.querySelector('#confirmDel').onclick = async () => {
          try {
            await api.del(`/api/agents/${id}`);
            banner('success', 'Agente removido');
            modal.remove();
            // Reaplicar busca/filtragem atual
            const searchEl = document.getElementById('agentSearch');
            const filterEl = document.getElementById('agentStatusFilter');
            const q = (searchEl.value || '').trim();
            const st = filterEl.value || '';
            await runServerSearch(q, st);
          } catch (_err) {
            modal.remove();
            banner('error', 'Falha ao remover agente');
          }
        };
      };
    });

    // Editar agente
    document.querySelectorAll('button.edit').forEach(
      (b) =>
        (b.onclick = async () => {
          const list = await api.get('/api/agents');
          const agent = list.find((x) => x._id === b.dataset.id);
          dForm.name.value = agent.name;
          dForm.phone.value = agent.phone;
          dForm.cpf.value = agent.cpf;
          dForm.pix.value = agent.pix;
          dForm.hourlyRate.value = agent.hourlyRate || 0;
          dForm.avatarUrl.value = agent.avatarUrl || '';
          dForm.status.value = agent.status || 'disponível';
          openDrawer('Editar Agente', async (e) => {
            e.preventDefault();
            const body = Object.fromEntries(new FormData(dForm));
            body.hourlyRate = Number(body.hourlyRate || 0);
            body.avatarUrl = body.avatarUrl || '';
            body.status = body.status || 'disponível';
            try {
              await api.put(`/api/agents/${agent._id}`, body);
              banner('success', 'Agente atualizado');
            } catch (_err) {
              banner('error', 'Falha ao atualizar');
            }
            closeDrawer();
            location.hash = '#agents';
          });
        })
    );
    // Busca e filtro (server-side com debounce)
    const bodyEl = document.getElementById('agentsBody');
    const mobileList = document.getElementById('agentsListMobile');
    const searchEl = document.getElementById('agentSearch');
    const filterEl = document.getElementById('agentStatusFilter');
    async function runServerSearch(q, st) {
      const qParam = q ? `?q=${encodeURIComponent(q)}` : '';
      const fetched = await api.get(`/api/agents${qParam}`);
      const withDisplay = (fetched || []).map((a) => ({
        ...a,
        _isEscalado: escalados.has(String(a._id)),
        status: escalados.has(String(a._id)) ? 'escalado' : a.status || 'disponível'
      }));
      const filtered = st
        ? withDisplay.filter((a) => (st === 'escalado' ? a.status === 'escalado' : a.status === st))
        : withDisplay;
      bodyEl.innerHTML = filtered.map(agentRow).join('');
      if (mobileList) {
        mobileList.innerHTML = filtered.map(agentCard).join('');
      }
      rebindRowActions();
    }
    let debounceId;
    searchEl.oninput = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        const q = (searchEl.value || '').trim();
        const st = filterEl.value || '';
        runServerSearch(q, st);
      }, 300);
    };
    filterEl.onchange = () => {
      const q = (searchEl.value || '').trim();
      const st = filterEl.value || '';
      runServerSearch(q, st);
    };

    function rebindRowActions() {
      document.querySelectorAll('button.delete').forEach((b) => {
        b.onclick = async () => {
          const id = b.dataset.id;
          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-50';
          modal.innerHTML = `
            <div class='bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[min(420px,92vw)] p-6'>
              <h3 class='text-lg font-semibold mb-2'>Remover agente</h3>
              <p class='text-sm text-gray-600 dark:text-gray-300 mb-4'>Essa ação é permanente e não pode ser desfeita. Deseja continuar?</p>
              <div class='flex flex-col sm:flex-row justify-end gap-2'>
                <button id='cancelDel' class='px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 btn-block'>Cancelar</button>
                <button id='confirmDel' class='px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 btn-block'>Remover</button>
              </div>
            </div>`;
          document.body.appendChild(modal);
          modal.querySelector('#cancelDel').onclick = () => modal.remove();
          modal.querySelector('#confirmDel').onclick = async () => {
            try {
              await api.del(`/api/agents/${id}`);
              banner('success', 'Agente removido');
              modal.remove();
              const q = (searchEl.value || '').trim();
              const st = filterEl.value || '';
              await runServerSearch(q, st);
            } catch (_err) {
              modal.remove();
              banner('error', 'Falha ao remover agente');
            }
          };
        };
      });
      document.querySelectorAll('button.edit').forEach(
        (b) =>
          (b.onclick = async () => {
            const list = await api.get('/api/agents');
            const agent = list.find((x) => x._id === b.dataset.id);
            dForm.name.value = agent.name;
            dForm.phone.value = agent.phone;
            dForm.cpf.value = agent.cpf;
            dForm.pix.value = agent.pix;
            dForm.hourlyRate.value = agent.hourlyRate || 0;
            dForm.avatarUrl.value = agent.avatarUrl || '';
            dForm.status.value = agent.status || 'disponível';
            openDrawer('Editar Agente', async (e) => {
              e.preventDefault();
              const body = Object.fromEntries(new FormData(dForm));
              body.hourlyRate = Number(body.hourlyRate || 0);
              body.avatarUrl = body.avatarUrl || '';
              body.status = body.status || 'disponível';
              try {
                await api.put(`/api/agents/${agent._id}`, body);
                banner('success', 'Agente atualizado');
              } catch (_err) {
                banner('error', 'Falha ao atualizar');
              }
              closeDrawer();
              location.hash = '#agents';
            });
          })
      );
      document.querySelectorAll('button.status-escalado').forEach((b) => {
        const agentId = b.dataset.id;
        const agentName = b.dataset.name || 'Agente';
        b.onclick = () => openAgentShiftsModal(agentId, agentName);
      });
    }

    // Botão de status "escalado": abre modal com todas as escalas do agente
    /** Formata data ISO (yyyy-mm-dd) para dd/mm/yyyy */
    function formatBRDate(iso) {
      if (!iso) {
        return '';
      }
      const s = String(iso);
      const base = s.includes('T') ? s.slice(0, 10) : s;
      const [y, m, d] = base.split('-');
      return `${d}/${m}/${y}`;
    }
    /**
     * Abre um modal listando todas as escalas de um agente.
     * @param {string} agentId
     * @param {string} agentName
     */
    function openAgentShiftsModal(agentId, agentName) {
      const modal2 = document.createElement('div');
      modal2.id = 'shiftsModal';
      modal2.className =
        'fixed inset-0 bg-black/40 flex items-center justify-center z-50';
      modal2.innerHTML = `
        <div class='modal-panel p-4 w-[min(720px,92vw)] max-h-[80vh] overflow-y-auto'>
          <h2 class='text-xl font-semibold mb-3'>Escalas de ${agentName}</h2>
          <div id='shiftsContent' class='max-h-[480px] overflow-y-auto'>
            <div class='text-sm text-grayMid'>Carregando...</div>
          </div>
          <div class='flex flex-col sm:flex-row justify-end gap-2 mt-3'>
            <button id='closeShifts' class='btn-secondary btn-block'>Fechar</button>
          </div>
        </div>`;
      document.body.appendChild(modal2);
      document.getElementById('closeShifts').onclick = () => {
        modal2.remove();
      };
      (async () => {
        try {
          const shifts = await api.get('/api/shifts?agentId=' + agentId);
          const rows = (shifts || [])
            .map(
              (s) => `
          <tr class='border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-800/60'>
          <td class='p-2'>${
        s.endDate && s.endDate !== s.date
          ? `${formatBRDate(s.date)} a ${formatBRDate(s.endDate)}`
          : formatBRDate(s.date)
        }</td>
          <td class='p-2'>${s.start}</td>
          <td class='p-2'>${s.end}</td>
          <td class='p-2'>${s.durationHours || ''}</td>
          <td class='p-2'>${s.notes || ''}</td>
          </tr>
          `
            )
            .join('');
          const table = `
          <table class='w-full text-left'>
          <thead>
          <tr class='border-b'>
          <th class='p-2 text-sm'>Data</th><th class='p-2 text-sm'>Início</th><th class='p-2 text-sm'>Fim</th><th class='p-2 text-sm'>Horas</th><th class='p-2 text-sm'>Obs.</th>
          </tr>
          </thead>
          <tbody>${rows}</tbody>
          </table>`;
          document.getElementById('shiftsContent').innerHTML = rows
            ? table
            : '<div class=\'text-sm text-grayMid\'>Sem escalas para este agente.</div>';
        } catch (_err) {
          document.getElementById('shiftsContent').innerHTML =
            '<div class=\'text-sm text-red-600\'>Falha ao carregar escalas.</div>';
        }
      })();
    }

    // Bind inicial de ações de linha
    rebindRowActions();
  }, 0);

  return html;
}

/**
 * Card compacto (mobile < sm) exibindo todas as informações visíveis sem corte
 * e com as mesmas ações da tabela.
 */
function agentCard(a) {
  const phone = formatBRPhone(a.phone);
  const cpf = formatCPF(a.cpf);
  const avatar = a.avatarUrl
    ? `<img src='${a.avatarUrl}' class='w-10 h-10 rounded-full object-cover' alt='avatar'/>`
    : `<div class='w-10 h-10 rounded-full bg-grayLight dark:bg-gray-700 flex items-center justify-center text-xs font-semibold'>${(a.name || '?').slice(0, 2).toUpperCase()}</div>`;
  const isEscalado = !!a._isEscalado || a.status === 'escalado';
  const statusClass = isEscalado
    ? 'bg-blue-100 text-blue-700'
    : a.status === 'disponível'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';
  const statusEl = isEscalado
    ? `<button data-id='${a._id}' data-name='${a.name}' class='status-escalado px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 hover:bg-blue-200'>escalado</button>`
    : `<span class='px-2 py-0.5 rounded text-xs ${statusClass}'>${a.status || 'disponível'}</span>`;
  return `
    <div class='rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3'>
      <div class='flex items-start justify-between gap-3'>
        <div class='flex items-center gap-3 min-w-0'>
          ${avatar}
          <div class='min-w-0'>
            <div class='font-semibold truncate'>${a.name}</div>
            <div class='text-xs text-grayMid break-all'>CPF: ${cpf}</div>
          </div>
        </div>
        <div>${statusEl}</div>
      </div>
      <div class='mt-2 text-sm grid gap-1'>
        <div><span class='text-grayMid'>Telefone:</span> ${phone}</div>
        <div class='break-all'><span class='text-grayMid'>PIX:</span> ${a.pix || ''}</div>
      </div>
      <div class='mt-3 flex items-center gap-2'>
        <button data-id='${a._id}' class='edit btn-secondary text-xs px-2 py-1'>Editar</button>
        <button data-id='${a._id}' class='delete btn-danger text-xs px-2 py-1'>Excluir</button>
      </div>
    </div>`;
}