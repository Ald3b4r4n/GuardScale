import { api } from '../api.js';
import { skeletonTableRows } from '../modules/ui.js';

/*
 * Módulo: Escalas (geração, visualização e edição)
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Gera escalas (diária/semanal/mensal), lista resultados com filtros,
 * edita e remove turnos, e exporta PDF. Responsivo com overflow para tabelas.
 */
export async function renderSchedules({ banner }) {
  const agents = await api.get('/api/agents');
  const html = `
  <div class='flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4'>
    <h1 class='text-3xl font-bold'>Escalas</h1>
    <div class='flex gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end'>
      <!-- Autor: Antônio Rafael Souza Cruz, email rafasouzacruz@gmai.com -->
      <select id='exportType' class='border rounded px-2 py-1'>
        <option value='daily' selected>Diário</option>
        <option value='weekly'>Semanal</option>
        <option value='monthly'>Mensal</option>
      </select>
    <button id='exportPdf' class='btn-primary btn-block'>Exportar PDF</button>
    </div>
  </div>

  <div class='grid grid-cols-1 md:grid-cols-3 gap-4'>
    <div class='card p-4'>
      <h2 class='text-xl font-semibold mb-2'>Gerar Escala</h2>
      <form id='genForm' class='grid gap-3'>

        <div class='grid grid-cols-1 gap-3'>
          <div>
            <label class='text-sm'>Início</label>
            <input name='startDate' type='date' class='w-full border rounded px-3 py-2' required value='${new Date()
    .toISOString()
    .slice(0, 10)}' />
          </div>
        </div>
        <div>
          <label class='text-sm'>Agentes</label>
          <!-- Versão mobile: lista com checkboxes para seleção por toque -->
          <div class='md:hidden'>
            <div class='flex items-center justify-between mb-2'>
              <span class='text-xs text-grayMid'>Toque para selecionar múltiplos agentes</span>
              <button type='button' id='selectAllAgents' class='text-xs text-primary hover:underline'>Selecionar todos</button>
            </div>
            <div id='agentCheckList' class='max-h-36 overflow-auto border rounded p-2 space-y-1'>
              ${agents
    .map(
      (a) =>
        `<label class='flex items-center gap-2'><input type='checkbox' class='agentCheck' value='${a._id}' /><span>${a.name}</span></label>`
    )
    .join('')}
            </div>
          </div>
          <!-- Versão desktop: select múltiplo tradicional -->
          <div class='hidden md:block'>
            <select name='selectedAgentIds' id='agentSelect' multiple class='w-full border rounded px-3 py-2 h-32'>
              ${agents
    .map((a) => `<option value='${a._id}'>${a.name}</option>`)
    .join('')}
            </select>
            <div class='text-xs text-grayMid mt-1'>Segure Ctrl/Command para múltipla seleção</div>
          </div>
        </div>
        <div>
          <label class='text-sm'>Horário de Início</label>
          <input name='startTime' type='time' value='08:00' class='w-full border rounded px-3 py-2' />
        </div>
        <div>
          <label class='text-sm'>Duração (horas)</label>
          <input name='shiftLength' type='number' step='0.5' value='12' class='w-full border rounded px-3 py-2' />
        </div>
        <div>
          <label class='text-sm'>Observação</label>
          <input name='notes' class='w-full border rounded px-3 py-2' placeholder='Observação para exportação' />
        </div>
  <button type='submit' class='btn-primary btn-block'>Gerar</button>
      </form>
      <div class='mt-3'>
        <div class='text-sm text-grayMid mb-1'>Visualização (apenas exibição)</div>
        <div class='flex gap-2'>
          <button class='viewBtn px-2 py-1 rounded border hover:bg-gray-200' data-view='daily'>Diário</button>
          <button class='viewBtn px-2 py-1 rounded border hover:bg-gray-200' data-view='weekly'>Semanal</button>
          <button class='viewBtn px-2 py-1 rounded border hover:bg-gray-200' data-view='monthly'>Mensal</button>
        </div>
      </div>
    </div>

    <div class='md:col-span-2 card p-4'>
      <h2 class='text-xl font-semibold mb-2'>Resultado</h2>
      <div id='resultListMobile' class='sm:hidden flex flex-col gap-2'></div>
      <div class='hidden sm:block overflow-x-auto rounded-lg border border-white/30 dark:border-white/10'>
        <table class='table-base table-auto min-w-[720px] w-full'>
          <thead>
            <tr class='border-b table-header'>
              <th class='p-2 text-sm'>Data</th><th class='p-2 text-sm'>Agente</th><th class='p-2 text-sm'>Início</th><th class='p-2 text-sm'>Fim</th><th class='p-2 text-sm'>Horas</th><th class='p-2 text-sm'>Obs.</th><th class='p-2 text-sm'>Ações</th>
            </tr>
          </thead>
          <tbody id='resultBody'></tbody>
        </table>
      </div>
    </div>

    <!-- Modal de edição de escala -->
    <div id='editModal' class='fixed inset-0 bg-black/40 hidden items-center justify-center'>
  <div class='modal-panel p-4 w-[min(420px,92vw)] max-h-[80vh] overflow-y-auto'>
        <h3 class='text-lg font-semibold mb-3'>Editar escala</h3>
        <!-- Autor: Antônio Rafael Souza Cruz, email rafasouzacruz@gmai.com -->
        <form id='editForm' class='grid gap-3'>
          <input type='hidden' name='id' />
          <div class='grid grid-cols-2 gap-3'>
            <div>
              <label class='text-sm'>Início</label>
              <input name='start' type='time' class='w-full border rounded px-3 py-2' />
            </div>
            <div>
              <label class='text-sm'>Duração (horas)</label>
              <input name='duration' type='number' step='0.5' class='w-full border rounded px-3 py-2' />
            </div>
          </div>
          <div>
            <label class='text-sm'>Observação</label>
            <input name='notes' class='w-full border rounded px-3 py-2' />
          </div>
          <div class='flex flex-col sm:flex-row justify-end gap-2'>
            <button type='button' id='editCancel' class='btn-secondary btn-block'>Cancelar</button>
            <button class='btn-primary btn-block'>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  // Retornar HTML primeiro, depois executar JavaScript
  /**
   * Inicializa os bindings do módulo de Escalas após injetar o HTML.
   * - Liga eventos do formulário (gerar, filtrar, exportar PDF)
   * - Liga ações de edição/remoção na tabela
   * - Controla a visualização (diária/semanal/mensal)
   */
  const initializeSchedules = () => {
    const form = document.getElementById('genForm');
    const tbody = document.getElementById('resultBody');
    const mobileList = document.getElementById('resultListMobile');
    const agentSelect = document.getElementById('agentSelect');
    const agentCheckList = document.getElementById('agentCheckList');
    const selectAllAgentsBtn = document.getElementById('selectAllAgents');
    const viewBtns = document.querySelectorAll('[data-view]');
    const exportTypeSel = document.getElementById('exportType');
    const submitBtn =
      form.querySelector('button[type=\'submit\']') ||
      form.querySelector('button');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const editCancel = document.getElementById('editCancel');

    /**
     * Abre o modal de edição com os dados do turno selecionado.
     * @param {{_id:string,start:string,durationHours:number,notes:string}} it
     */
    function openEdit(it) {
      editForm.id.value = it._id;
      editForm.start.value = it.start || '08:00';
      editForm.duration.value = Number(it.durationHours || 12);
      editForm.notes.value = it.notes || '';
      editModal.classList.remove('hidden');
      editModal.classList.add('flex');
    }

    editCancel.onclick = () => {
      editModal.classList.add('hidden');
      editModal.classList.remove('flex');
    };

    /**
     * Salva a edição do turno e recalcula o horário de fim baseado na duração.
     * Ao concluir, fecha o modal e recarrega a lista atual.
     */
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = editForm.id.value;
      if (!id) {
        return;
      }
      const start = editForm.start.value || '08:00';
      const duration = Number(editForm.duration.value || 12);
      const end = (() => {
        const [h, m] = start.split(':').map(Number);
        const dmin = Math.round(duration * 60);
        const endMin = h * 60 + m + dmin;
        const eh = Math.floor(endMin / 60) % 24;
        const em = endMin % 60;
        return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
      })();
      const body = { start, end, notes: editForm.notes.value || '' };
      try {
        await api.put(`/api/shifts/${id}`, body);
        banner('success', 'Escala atualizada');
        editCancel.onclick();
        await loadFromDB();
      } catch (err) {
        console.error('[schedules] edit error', err);
        banner('error', 'Falha ao atualizar');
      }
    };

    if (!form || !tbody || !agentSelect) {
      console.error('[schedules] Required elements not found:', {
        form,
        tbody,
        agentSelect
      });
      return;
    }

    let loadedItems = [];
    // Sempre iniciar com a visualização diária ao entrar em Escalas;
    // porém, se houver um estado efêmero salvo (re-render por realtime), respeitar.
    let currentView =
      (typeof window !== 'undefined' && window.__schedulesCurrentView) ||
      'daily';

    function updateViewButtons() {
      document.querySelectorAll('.viewBtn').forEach((btn) => {
        const isSel = btn.dataset.view === currentView;
        // Limpar estados de cor anteriores (mantém apenas a largura da borda)
        btn.classList.remove(
          'bg-primary',
          'text-white',
          'border-primary',
          'hover:bg-primary/90',
          'bg-transparent',
          'text-gray-800',
          'dark:text-gray-100',
          'border-gray-300',
          'dark:border-gray-600'
        );
        // Remover hover claro para não sobrescrever o ativo
        btn.classList.remove('hover:bg-gray-200');

        if (isSel) {
          // Estado selecionado: manter legível mesmo em hover
          btn.classList.add(
            'bg-primary',
            'text-white',
            'border-primary',
            'hover:bg-primary/90'
          );
          btn.setAttribute('aria-pressed', 'true');
        } else {
          // Estado normal: texto visível e hover leve
          btn.classList.add(
            'bg-transparent',
            'text-gray-800',
            'dark:text-gray-100',
            'border-gray-300',
            'dark:border-gray-600',
            'hover:bg-gray-200'
          );
          btn.setAttribute('aria-pressed', 'false');
        }
      });
      // Sincronizar o select de exportação com a visualização atual
      if (exportTypeSel) {
        exportTypeSel.value = currentView;
      }
      // Persistir estado efêmero para sobreviver a re-render do módulo pelo realtime
      if (typeof window !== 'undefined') {
        window.__schedulesCurrentView = currentView;
      }
    }

    /**
     * Renderiza uma linha da tabela de resultados para um turno.
     * @param {{date:string,endDate?:string,agentName?:string,agentId:string,start:string,end:string,durationHours?:number,notes?:string,_id?:string}} it
     * @returns {string}
     */
    function scheduleRow(it) {
      const formatBR = (iso) => {
        if (!iso) {
          return '';
        }
        const [y, m, d] = String(iso).split('-');
        return `${d}/${m}/${y}`;
      };
      const dateText =
        it.endDate && it.endDate !== it.date
          ? `${formatBR(it.date)} a ${formatBR(it.endDate)}`
          : formatBR(it.date);
      return `<tr class='border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-800/60'>
        <td class='p-2'>${dateText}</td><td class='p-2'>${
  it.agentName || it.agentId
}</td>
        <td class='p-2'>${it.start}</td><td class='p-2'>${it.end}</td>
        <td class='p-2'>${it.durationHours || ''}</td><td class='p-2'>${
  it.notes || ''
}</td>
        <td class='p-2'>
          <div class='flex gap-2'>
            <button class='editBtn btn-secondary flex items-center gap-1' data-id='${
  it._id || ''
}'><i class='fa-solid fa-pen'></i><span>Editar</span></button>
            <button class='delBtn btn-danger flex items-center gap-1' data-id='${
  it._id || ''
}'><i class='fa-solid fa-trash'></i><span>Excluir</span></button>
          </div>
        </td>
      </tr>`;
    }

    // Cartão para mobile (< sm) com as mesmas informações e ações
    function scheduleCard(it) {
      const formatBR = (iso) => {
        if (!iso) return '';
        const [y, m, d] = String(iso).split('-');
        return `${d}/${m}/${y}`;
      };
      const dateText =
        it.endDate && it.endDate !== it.date
          ? `${formatBR(it.date)} a ${formatBR(it.endDate)}`
          : formatBR(it.date);
      return `
        <div class='rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3'>
          <div class='flex items-start justify-between gap-3'>
            <div class='min-w-0'>
              <div class='font-semibold truncate'>${it.agentName || it.agentId}</div>
              <div class='text-xs text-grayMid'>${dateText}</div>
            </div>
            <div class='flex gap-2'>
              <button class='editBtn btn-secondary text-xs px-2 py-1' data-id='${it._id || ''}'>Editar</button>
              <button class='delBtn btn-danger text-xs px-2 py-1' data-id='${it._id || ''}'>Excluir</button>
            </div>
          </div>
          <div class='mt-2 text-sm grid grid-cols-2 gap-x-4 gap-y-1'>
            <div><span class='text-grayMid'>Início:</span> ${it.start}</div>
            <div><span class='text-grayMid'>Fim:</span> ${it.end}</div>
            <div><span class='text-grayMid'>Horas:</span> ${it.durationHours || ''}</div>
            <div class='col-span-2 break-words'><span class='text-grayMid'>Obs.:</span> ${it.notes || ''}</div>
          </div>
        </div>`;
    }

    /**
     * Calcula o intervalo de datas (início/fim) conforme a visualização atual.
     * - Diário: mesmo dia
     * - Semanal: dia inicial + 6 dias
     * - Mensal: primeiro e último dia do mês
     */
    function computeRange() {
      const sd = form.startDate.value;
      if (!sd) {
        return { startDate: undefined, endDate: undefined };
      }
      if (currentView === 'daily') {
        return { startDate: sd, endDate: sd };
      } else if (currentView === 'weekly') {
        const start = new Date(sd);
        const end = new Date(sd);
        end.setDate(start.getDate() + 6);
        const endStr = end.toISOString().slice(0, 10);
        return { startDate: sd, endDate: endStr };
      } else {
        // monthly
        const d = new Date(sd);
        const first = new Date(d.getFullYear(), d.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);
        return { startDate: first, endDate: last };
      }
    }

    /**
     * Busca os turnos no backend com base no intervalo computado e
     * enriquece com nome do agente. Aplica skeleton enquanto carrega.
     */
    async function loadFromDB() {
      const { startDate, endDate } = computeRange();
      if (!startDate) {
        tbody.innerHTML = '';
        return;
      }
      // Skeleton enquanto carrega
      tbody.innerHTML = skeletonTableRows(6, 7);
      if (typeof mobileList !== 'undefined' && mobileList) {
        mobileList.innerHTML = Array.from({ length: 6 })
          .map(
            () =>
              `<div class='rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 p-3 animate-pulse h-20'></div>`
          )
          .join('');
      }
      const shifts = await api.get(
        `/api/shifts?startDate=${startDate}&endDate=${endDate}`
      );
      // Enriquecer com nomes dos agentes se necessário
      const agentMap = new Map(agents.map((a) => [String(a._id), a.name]));
      loadedItems = shifts.map((s) => ({
        ...s,
        agentName:
          agentMap.get(String(s.agentId)) || s.agentName || 'Agente removido'
      }));
      applyView();
    }

    const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

    /** Obtém IDs de agentes selecionados (checkboxes no mobile, select no desktop). */
    function getSelectedAgentIds() {
      // No mobile usamos os checkboxes; no desktop, o <select multiple>
      if (!isDesktop() && agentCheckList) {
        return Array.from(
          agentCheckList.querySelectorAll('.agentCheck:checked')
        ).map((el) => el.value);
      }
      if (agentSelect) {
        return Array.from(agentSelect.selectedOptions).map((o) => o.value);
      }
      return [];
    }

    /**
     * Filtra os itens por agentes selecionados e re-renderiza a tabela.
     * Também aplica bindings de edição e exclusão em cada linha.
     */
    function applyView() {
      const selectedIds = getSelectedAgentIds();
      let items = loadedItems;

      if (selectedIds.length) {
        items = items.filter((i) => selectedIds.includes(String(i.agentId)));
      }

      const html = items.map(scheduleRow).join('');
      tbody.innerHTML = html;
      if (typeof mobileList !== 'undefined' && mobileList) {
        mobileList.innerHTML = items.map(scheduleCard).join('');
      }
      // bind delete
      tbody.querySelectorAll('.delBtn').forEach((btn) => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          if (!id) {
            return;
          }
          if (!confirm('Excluir este turno?')) {
            return;
          }
          try {
            await api.del(`/api/shifts/${id}`);
            banner('success', 'Turno removido');
            await loadFromDB();
          } catch (err) {
            console.error('[schedules] delete error', err);
            banner('error', 'Falha ao remover');
          }
        };
      });
      if (typeof mobileList !== 'undefined' && mobileList) {
        mobileList.querySelectorAll('.delBtn').forEach((btn) => {
          btn.onclick = async () => {
            const id = btn.dataset.id;
            if (!id) return;
            if (!confirm('Excluir este turno?')) return;
            try {
              await api.del(`/api/shifts/${id}`);
              banner('success', 'Turno removido');
              await loadFromDB();
            } catch (err) {
              console.error('[schedules] delete error', err);
              banner('error', 'Falha ao remover');
            }
          };
        });
      }
      // bind edit (botão e duplo clique)
      tbody.querySelectorAll('tr').forEach((tr, idx) => {
        const eb = tr.querySelector('.editBtn');
        if (eb) {
          eb.onclick = () => openEdit(items[idx]);
        }
        tr.ondblclick = () => openEdit(items[idx]);
      });
      if (typeof mobileList !== 'undefined' && mobileList) {
        mobileList.querySelectorAll('.editBtn').forEach((eb) => {
          const id = eb.dataset.id;
          const it = items.find((x) => String(x._id) === String(id));
          if (it) {
            eb.onclick = () => openEdit(it);
          }
        });
      }
    }

    viewBtns.forEach(
      (b) =>
        (b.onclick = () => {
          currentView = b.dataset.view;
          // Não persistir mais a visualização; manter padrão diário ao reabrir o módulo
          updateViewButtons();
          loadFromDB();
        })
    );
    form.startDate.addEventListener('change', loadFromDB);
    // Eventos de filtro por agentes (desktop e mobile)
    if (agentSelect) {
      agentSelect.addEventListener('change', applyView);
    }
    if (agentCheckList) {
      agentCheckList.addEventListener('change', (e) => {
        if (e.target && e.target.classList.contains('agentCheck')) {
          applyView();
          // Atualiza rótulo do botão Selecionar todos para refletir estado
          if (selectAllAgentsBtn) {
            const checks = agentCheckList.querySelectorAll('.agentCheck');
            const checked = agentCheckList.querySelectorAll(
              '.agentCheck:checked'
            );
            selectAllAgentsBtn.textContent =
              checked.length === checks.length
                ? 'Limpar seleção'
                : 'Selecionar todos';
          }
        }
      });
    }
    if (selectAllAgentsBtn && agentCheckList) {
      selectAllAgentsBtn.onclick = () => {
        const checks = Array.from(
          agentCheckList.querySelectorAll('.agentCheck')
        );
        const anyUnchecked = checks.some((c) => !c.checked);
        checks.forEach((c) => (c.checked = anyUnchecked));
        selectAllAgentsBtn.textContent = anyUnchecked
          ? 'Limpar seleção'
          : 'Selecionar todos';
        applyView();
      };
    }
    // Reaplicar filtro ao alternar entre breakpoints (md) para manter consistência
    window.addEventListener('resize', () => {
      applyView();
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const body = Object.fromEntries(fd);
      const selectedAgentIds = getSelectedAgentIds();
      const startTime = form.startTime.value || '08:00';
      const shiftLength = Number(form.shiftLength.value || '12');
      body.selectedAgentIds = selectedAgentIds;
      body.startTimes = [startTime];
      body.shiftLengths = [shiftLength];
      // validações antes de travar botão
      if (!body.startDate) {
        banner('error', 'Selecione a data inicial');
        return;
      }
      if (!selectedAgentIds.length) {
        banner('error', 'Selecione ao menos um agente');
        return;
      }

      if (submitBtn.disabled) {
        return;
      } // evita duplo clique
      submitBtn.disabled = true;
      const prev = submitBtn.textContent;
      submitBtn.textContent = 'Gerando...';
      try {
        const r = await api.post('/api/schedules/generate', body);
        banner('success', `Gerado e salvo ${r.persistedCount} turnos`);
        await loadFromDB();
      } catch (err) {
        console.error('[schedules] generate error', err);
        banner('error', 'Falha ao gerar');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = prev;
      }
    };

    document.getElementById('exportPdf').onclick = async () => {
      // Seleção de tipo de exportação
      const type = document.getElementById('exportType').value;
      let items = [];
      let title = '';

      if (type === 'daily') {
        // Sempre usar o dia atual para exportação diária
        const today = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const todayStr = `${today.getFullYear()}-${pad(
          today.getMonth() + 1
        )}-${pad(today.getDate())}`;
        const shifts = await api.get(
          `/api/shifts?startDate=${todayStr}&endDate=${todayStr}`
        );
        const agentMap = new Map(agents.map((a) => [String(a._id), a.name]));
        items = (shifts || []).map((s) => ({
          ...s,
          agentName:
            agentMap.get(String(s.agentId)) || s.agentName || String(s.agentId)
        }));
        if (!items.length) {
          banner('info', 'Nenhum item para o dia de hoje');
          return;
        }
        title = 'Escala diária';
      } else {
        const { startDate, endDate } = computeRange();
        if (!loadedItems.length) {
          banner('info', 'Nenhum item no período selecionado');
          return;
        }
        items = loadedItems;
        if (type === 'weekly') {
          title = `Escala semanal ${new Date(startDate).toLocaleDateString(
            'pt-BR'
          )} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
        } else {
          const dt = new Date(startDate);
          const month = dt.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
          });
          title = `Escala mensal ${month}`;
        }
      }

      const resp = await fetch('/api/schedules/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, items })
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title.replace(/\s+/g, '_') + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    };

    // Carrega imediatamente usando a visualização persistida (ou diária por padrão)
    updateViewButtons();
    loadFromDB();
  };

  // Executar inicialização após retornar o HTML
  setTimeout(initializeSchedules, 0);

  return html;
}