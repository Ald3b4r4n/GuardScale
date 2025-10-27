/*
 * Módulo: Usuários (admin)
 * Lista, cria, edita (papel/ativo) e reseta senha.
 */
import { api } from '../api.js';

function userRow(u) {
  const roleBadge = u.role === 'admin'
    ? `<span class='px-2 py-1 rounded text-xs bg-purple-100 text-purple-700'>admin</span>`
    : `<span class='px-2 py-1 rounded text-xs bg-gray-100 text-gray-700'>user</span>`;
  const activeBadge = u.active
    ? `<span class='px-2 py-1 rounded text-xs bg-green-100 text-green-700'>ativo</span>`
    : `<span class='px-2 py-1 rounded text-xs bg-red-100 text-red-700'>inativo</span>`;
  return `<tr class='border-b border-gray-200 dark:border-gray-700'>
    <td class='p-2'>
      <div class='font-medium'>${u.email}</div>
      <div class='text-xs text-gray-500'>${new Date(u.createdAt).toLocaleString()}</div>
    </td>
    <td class='p-2'>${roleBadge}</td>
    <td class='p-2'>${activeBadge}</td>
    <td class='p-2'>
      <div class='flex gap-2'>
        <button class='edit btn-secondary px-3 py-1.5 text-xs rounded-lg whitespace-nowrap' title='Editar usuário' aria-label='Editar usuário' data-id='${u._id}'>Editar</button>
        <button class='reset btn-primary px-3 py-1.5 text-xs rounded-lg whitespace-nowrap' title='Resetar senha' aria-label='Resetar senha' data-id='${u._id}' data-email='${u.email}'>Resetar senha</button>
      </div>
    </td>
  </tr>`;
}

function userCard(u) {
  const roleBadge = u.role === 'admin'
    ? `<span class='px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700'>admin</span>`
    : `<span class='px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700'>user</span>`;
  const activeBadge = u.active
    ? `<span class='px-2 py-0.5 rounded text-xs bg-green-100 text-green-700'>ativo</span>`
    : `<span class='px-2 py-0.5 rounded text-xs bg-red-100 text-red-700'>inativo</span>`;
  return `
    <div class='rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3'>
      <div class='min-w-0'>
        <div class='font-medium break-all'>${u.email}</div>
        <div class='text-xs text-gray-500'>${new Date(u.createdAt).toLocaleString()}</div>
      </div>
      <div class='mt-2 flex items-center gap-2'>${roleBadge} ${activeBadge}</div>
      <div class='mt-3 flex items-center gap-2'>
        <button class='edit btn-secondary px-3 py-1.5 text-xs rounded-lg whitespace-nowrap' data-id='${u._id}'>Editar</button>
        <button class='reset btn-primary px-3 py-1.5 text-xs rounded-lg whitespace-nowrap' data-id='${u._id}' data-email='${u.email}'>Resetar senha</button>
      </div>
    </div>`;
}

export async function renderUsers({ banner }) {
  const users = await api.get('/api/users');

  const html = `
    <div class='flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4'>
      <h1 class='text-3xl font-bold'>Usuários</h1>
      <div>
        <button id='newUser' class='btn-primary'>Novo</button>
      </div>
    </div>

    <!-- Lista mobile em cartões -->
    <div id='usersListMobile' class='sm:hidden grid gap-2'>
      ${(users || []).map(userCard).join('')}
    </div>

    <!-- Tabela desktop/tablet -->
    <div class='hidden sm:block overflow-x-auto rounded ring-1 ring-gray-200 dark:ring-gray-700'>
      <table class='w-full text-left min-w-[560px]'>
        <thead class='sticky top-0 bg-white dark:bg-gray-900'>
          <tr class='border-b border-gray-200 dark:border-gray-700'>
            <th class='p-2 text-sm w-[45%]'>Email</th>
            <th class='p-2 text-sm'>Papel</th>
            <th class='p-2 text-sm'>Status</th>
            <th class='p-2 text-sm w-[160px]'>Ações</th>
          </tr>
        </thead>
        <tbody id='usersBody'>
          ${(users || []).map(userRow).join('')}
        </tbody>
      </table>
    </div>

    <!-- Drawer lateral criar/editar usuário -->
    <div id='userDrawer' class='fixed inset-y-0 right-0 w-full md:w-[420px] bg-white dark:bg-gray-900 border-l dark:border-gray-700 shadow-xl transform translate-x-full transition z-40'>
      <div class='flex items-center justify-between px-4 py-3 border-b dark:border-gray-700'>
        <h2 id='userDrawerTitle' class='text-lg font-semibold'>Novo Usuário</h2>
        <button id='userDrawerClose' class='btn-secondary text-sm px-2 py-1'>Fechar</button>
      </div>
      <form id='userDrawerForm' class='p-4 grid gap-3'>
        <div>
          <label class='text-sm'>Email</label>
          <input name='email' type='email' class='w-full border rounded px-3 py-2' required />
        </div>
        <div>
          <label class='text-sm'>Senha</label>
          <input name='password' type='password' class='w-full border rounded px-3 py-2' required />
        </div>
        <div class='grid grid-cols-2 gap-3'>
          <div>
            <label class='text-sm'>Papel</label>
            <select name='role' class='w-full border rounded px-3 py-2'>
              <option value='user'>user</option>
              <option value='admin'>admin</option>
            </select>
          </div>
          <div class='flex items-center gap-2'>
            <input id='activeChk' name='active' type='checkbox' checked />
            <label for='activeChk' class='text-sm'>Ativo</label>
          </div>
        </div>
        <div class='flex flex-col sm:flex-row justify-end gap-2'>
          <button type='button' id='userDrawerCancel' class='btn-secondary btn-block'>Cancelar</button>
          <button class='btn-primary btn-block'>Salvar</button>
        </div>
      </form>
    </div>
    <div id='userDrawerOverlay' class='fixed inset-0 bg-black/30 hidden z-30'></div>

    <!-- Modal Resetar Senha -->
    <div id='resetModal' class='fixed inset-0 bg-black/40 hidden items-center justify-center z-50'>
      <div class='bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[min(420px,92vw)] max-h-[80vh] overflow-y-auto p-6'>
        <h3 class='text-lg font-semibold mb-3'>Resetar senha</h3>
        <div class='grid gap-3'>
          <div>
            <label class='text-sm'>Nova senha para <span id='resetEmail' class='font-semibold'></span></label>
            <input id='resetNewPwd' type='password' class='w-full border rounded px-3 py-2' />
          </div>
          <div class='flex flex-col sm:flex-row justify-end gap-2'>
            <button id='resetCancel' class='btn-secondary btn-block'>Cancelar</button>
            <button id='resetConfirm' class='btn-primary btn-block'>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const drawer = document.getElementById('userDrawer');
    const overlay = document.getElementById('userDrawerOverlay');
    const form = document.getElementById('userDrawerForm');
    const title = document.getElementById('userDrawerTitle');
    const btnNew = document.getElementById('newUser');

    function openDrawer(t, submitHandler) {
      title.textContent = t;
      form.onsubmit = submitHandler;
      drawer.classList.remove('translate-x-full');
      overlay.style.display = 'block';
    }
    function closeDrawer() {
      drawer.classList.add('translate-x-full');
      overlay.style.display = 'none';
    }
    document.getElementById('userDrawerClose').onclick = closeDrawer;
    document.getElementById('userDrawerCancel').onclick = closeDrawer;
    overlay.onclick = closeDrawer;

    async function reload() {
      const list = await api.get('/api/users');
      document.getElementById('usersBody').innerHTML = (list || []).map(userRow).join('');
      const listMobile = document.getElementById('usersListMobile');
      if (listMobile) {
        listMobile.innerHTML = (list || []).map(userCard).join('');
      }
      bindRowActions();
    }

    btnNew.onclick = () => {
      form.reset();
      form.elements['active'].checked = true;
      openDrawer('Novo Usuário', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        const body = {
          email: String(data.email || '').trim(),
          password: String(data.password || ''),
          role: String(data.role || 'user')
        };
        try {
          await api.post('/api/users', body);
          banner('success', 'Usuário criado');
        } catch (_err) {
          banner('error', 'Falha ao criar usuário');
        }
        closeDrawer();
        reload();
      });
    };

    function bindRowActions() {
      document.querySelectorAll('button.edit').forEach((btn) => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          const list = await api.get('/api/users');
          const u = (list || []).find((x) => x._id === id);
          if (!u) {
            return;
          }
          // Preencher form
          form.elements['email'].value = u.email;
          form.elements['password'].value = '';
          form.elements['role'].value = u.role || 'user';
          form.elements['active'].checked = !!u.active;
          // No edit, não exigir senha
          form.elements['password'].required = false;
          openDrawer('Editar Usuário', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form));
            const upd = {
              role: String(data.role || 'user'),
              active: form.elements['active'].checked
            };
            const nextEmail = String(data.email || '').trim();
            if (nextEmail && nextEmail !== u.email) {
              upd.email = nextEmail;
            }
            try {
              await api.put(`/api/users/${id}`, upd);
              banner('success', 'Usuário atualizado');
            } catch (_err) {
              banner('error', 'Falha ao atualizar usuário');
            }
            closeDrawer();
            reload();
          });
        };
      });
      // Resetar senha
      const rModal = document.getElementById('resetModal');
      const rCancel = document.getElementById('resetCancel');
      const rConfirm = document.getElementById('resetConfirm');
      const rEmail = document.getElementById('resetEmail');
      const rPwd = document.getElementById('resetNewPwd');
      if (rCancel) {
        rCancel.onclick = () => {
          rModal.style.display = 'none'; rPwd.value = '';
        };
      }
      document.querySelectorAll('button.reset').forEach((b) => {
        b.onclick = () => {
          rEmail.textContent = b.dataset.email || '';
          rPwd.value = '';
          rModal.style.display = 'flex';
          rConfirm.onclick = async () => {
            const id = b.dataset.id;
            const newPassword = String(rPwd.value || '');
            const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
            if (!strong.test(newPassword)) {
              banner('error', 'Senha fraca: mínimo 8, maiúscula, minúscula, número e símbolo');
              return;
            }
            try {
              await api.post(`/api/users/${id}/reset-password`, { newPassword });
              banner('success', 'Senha resetada');
            } catch (_err) {
              banner('error', 'Falha ao resetar senha');
            }
            rModal.style.display = 'none';
            rPwd.value = '';
          };
        };
      });
    }

    bindRowActions();
  });

  return html;
}