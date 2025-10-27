/*
 * Módulo: Login
 * Descrição: Tela de autenticação com layout responsivo e SEO.
 * Visual: Águia heráldica desenhada, com escudo central onde fica o formulário.
 */
import { api } from '../api.js';
import { showToast } from './ui.js';

/** Atualiza título e meta description para SEO na rota de login */
function updateSEO() {
  document.title = 'Entrar — GuardScale';
  const desc =
    'Acesse o GuardScale para gerenciar agentes, escalas e relatórios com segurança.';
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', desc);
}

export async function renderLogin() {
  updateSEO();

  const html = `
<section class='min-h-[100svh] sm:min-h-screen relative overflow-hidden flex items-center justify-center bg-[#071427]'>
  <!-- Fundo com gradientes e "aura" dourada -->
  <div class='absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(10,24,48,1)_0%,rgba(7,20,39,1)_40%,rgba(5,16,31,1)_100%)]'></div>
  <div class='absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] bg-[radial-gradient(closest-side,rgba(255,210,100,0.18),transparent_70%)] blur-2xl -z-10'></div>

  <!-- Marca no topo (desktop somente) -->
  <h1 class='hidden sm:block absolute top-8 text-white text-4xl font-extrabold tracking-wide drop-shadow-lg z-20 select-none'>GuardScale</h1>

  <!-- Hero com tilt/parallax -->
  <div id='loginHero' class='relative w-full max-w-[1080px] px-6 sm:px-8 md:px-10'>
    <!-- Ornamento "asas" com gradiente -->
    <div aria-hidden='true' class='pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-[680px] h-[280px] bg-[radial-gradient(60%_100%_at_0%_50%,rgba(255,221,150,0.14),transparent_70%),radial-gradient(60%_100%_at_100%_50%,rgba(255,221,150,0.14),transparent_70%)] blur-sm opacity-80'></div>

    <!-- Card "glass-shield" -->
    <div id='loginCard' class='relative mx-auto w-full max-w-[480px] md:max-w-[480px] lg:max-w-[520px]'>
      <!-- Glow dinâmico -->
      <div id='cardGlow' class='absolute -inset-12 -z-10 rounded-[36px] bg-[radial-gradient(600px_600px_at_50%_50%,rgba(255,215,120,0.18),transparent_60%)] blur-xl transition-[background] duration-300'></div>

      <div class='relative p-6 sm:p-7 rounded-[28px] bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/15 shadow-[0_20px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10'>
        <!-- Top notch decor -->
        <div class='absolute -top-4 left-1/2 -translate-x-1/2 w-[140px] h-[10px] rounded-full bg-gradient-to-r from-amber-300/60 via-yellow-300/40 to-amber-300/60 blur-[1px]'></div>
        <div class='sm:hidden text-center text-white text-3xl font-extrabold mb-2'>GuardScale</div>

        <h2 class='text-2xl font-bold text-center mb-1 text-white'>Bem-vindo</h2>
        <p class='text-center text-sm text-gray-300 mb-5'>Acesse o painel GuardScale</p>

        <form id='loginForm' class='grid gap-3'>
          <div>
            <label for='lg_email' class='text-sm text-gray-200'>E-mail</label>
            <input id='lg_email' name='email' type='email' autocomplete='username' class='w-full border border-white/20 bg-white/5 text-white placeholder:text-gray-400 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-300/60' required />
          </div>
          <div>
            <label for='lg_pass' class='text-sm text-gray-200'>Senha</label>
            <div class='relative'>
              <input id='lg_pass' name='password' type='password' autocomplete='current-password' class='w-full border border-white/20 bg-white/5 text-white placeholder:text-gray-400 rounded-lg px-3 py-2 mt-1 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-300/60' required />
              <button id='togglePass' type='button' class='absolute right-2 top-1/2 -translate-y-1/2 text-gray-200 hover:text-white transition'>
                <i class='fa-solid fa-eye'></i>
              </button>
            </div>
            <div id='capsWarn' class='hidden mt-1 text-xs text-amber-300/80'>Caps Lock ativado</div>
          </div>

          <button type='submit' class='btn-primary btn-block'>Entrar</button>
          <button id='forgotLink' type='button' class='btn-secondary btn-block mt-2'>Esqueci a senha/Solicitar acesso</button>
        </form>
      </div>
    </div>
  </div>
</section>`;

  // Modal: ajuda de acesso (esqueci senha / solicitar acesso)
  const modal = `
  <div id='forgotModal' class='fixed inset-0 bg-black/40 hidden items-center justify-center z-50'>
    <div class='modal-panel p-0 w-[min(520px,92vw)] max-h-[80vh] overflow-y-auto ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden'>
      <div class='px-4 pt-4 pb-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white'>
        <div class='flex items-center gap-2'>
          <i class='fa-solid fa-life-ring'></i>
          <h2 class='text-lg font-semibold'>Ajuda de acesso</h2>
        </div>
        <p class='text-xs mt-1 opacity-90'>Selecione abaixo a opção desejada.</p>
        <div class='flex gap-2 mt-3'>
          <button id='tabForgot' class='px-3 py-1.5 rounded-lg text-sm border border-white/0 bg-blue-600 text-white transition-colors'>Esqueci a senha</button>
          <button id='tabCreate' class='px-3 py-1.5 rounded-lg text-sm border border-white/20 bg-white/20 text-white hover:bg-white/30 transition-colors'>Solicitar acesso</button>
        </div>
      </div>
      <div class='p-4 bg-white dark:bg-gray-900'>
        <form id='forgotForm' class='grid gap-3'>
          <div>
            <label class='text-sm text-gray-700 dark:text-gray-200'>E-mail do usuário</label>
            <input name='email' type='email' placeholder='seuemail@exemplo.com' class='w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500' required />
          </div>
          <p class='text-xs text-gray-500 dark:text-gray-400'>O suporte receberá sua solicitação e retornará por e-mail.</p>
          <div class='flex flex-col sm:flex-row justify-end gap-2'>
            <button type='button' id='forgotCancel' class='btn-secondary btn-block'>Cancelar</button>
            <button class='btn-primary btn-block'>Enviar</button>
          </div>
        </form>
        <form id='createForm' class='grid gap-3 hidden'>
          <div class='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label class='text-sm text-gray-700 dark:text-gray-200'>Nome completo</label>
              <input name='name' placeholder='Seu nome' class='w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500' required />
            </div>
            <div>
              <label class='text-sm text-gray-700 dark:text-gray-200'>E-mail</label>
              <input name='email' type='email' placeholder='seuemail@exemplo.com' class='w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500' required />
            </div>
          </div>
          <div>
            <label class='text-sm text-gray-700 dark:text-gray-200'>Telefone (opcional)</label>
            <input name='phone' placeholder='(11) 99999-9999' class='w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500' />
          </div>
          <div>
            <label class='text-sm text-gray-700 dark:text-gray-200'>Observações</label>
            <textarea name='notes' class='w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500' rows='3' placeholder='Informações adicionais (empresa, motivo, etc.)'></textarea>
          </div>
          <p class='text-xs text-gray-500 dark:text-gray-400'>O suporte receberá sua solicitação e retornará por e-mail.</p>
          <div class='flex flex-col sm:flex-row justify-end gap-2'>
            <button type='button' id='createCancel' class='btn-secondary btn-block'>Cancelar</button>
            <button class='btn-primary btn-block'>Solicitar</button>
          </div>
        </form>
      </div>
    </div>
  </div>`;
  const page = html + modal;

  // --- Lógica de UI e microinterações ---
  setTimeout(() => {
    const form = document.getElementById('loginForm');
    const hero = document.getElementById('loginHero');
    const card = document.getElementById('loginCard');
    const glow = document.getElementById('cardGlow');
    if (!form) {
      return;
    }

    const toggle = document.getElementById('togglePass');
    if (toggle) {
      toggle.onclick = () => {
        const input = document.getElementById('lg_pass');
        if (!input) {
          return;
        }
        input.type = input.type === 'password' ? 'text' : 'password';
        toggle.innerHTML =
          input.type === 'password'
            ? '<i class="fa-solid fa-eye"></i>'
            : '<i class="fa-solid fa-eye-slash"></i>';
      };
    }

    // Tilt/parallax suave no card (desativado em telas touch ou pequenas)
    const isTouch =
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      window.innerWidth < 640;
    if (hero && card && !isTouch) {
      const onMove = (e) => {
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - y) * 8; // rotateX
        const ry = (x - 0.5) * 10; // rotateY
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        if (glow) {
          glow.style.background = `radial-gradient(600px 600px at ${x * 100}% ${
            y * 100
          }%, rgba(255,215,120,0.22), transparent 60%)`;
        }
      };
      const reset = () => {
        card.style.transform = 'perspective(900px) rotateX(0) rotateY(0)';
      };
      hero.addEventListener('mousemove', onMove);
      hero.addEventListener('mouseleave', reset);
    }

    // Caps Lock aviso
    const passInput = document.getElementById('lg_pass');
    const capsWarn = document.getElementById('capsWarn');
    if (passInput && capsWarn) {
      passInput.addEventListener('keydown', (ev) => {
        try {
          const on = ev.getModifierState && ev.getModifierState('CapsLock');
          capsWarn.classList.toggle('hidden', !on);
        } catch (_) {}
      });
      passInput.addEventListener('blur', () =>
        capsWarn.classList.add('hidden')
      );
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('button[type="submit"], .btn-primary');
      const prev = btn ? btn.textContent : '';
      if (btn) {
        btn.textContent = 'Entrando...';
        btn.disabled = true;
      }
      try {
        const r = await api.post('/api/auth/login', body);
        window.__authUser = r.user;
        // Atualiza cabeçalho com dados do usuário logado
        try {
          if (typeof window.renderOperator === 'function') {
            window.renderOperator();
          }
        } catch (_e) {}
        showToast('success', 'Bem-vindo!');
        location.hash = '#agents';
      } catch (_err) {
        showToast('error', 'Credenciais inválidas');
      } finally {
        if (btn) {
          btn.textContent = prev || 'Entrar';
          btn.disabled = false;
        }
      }
    };

    // Bind: Esqueci a senha / Solicitar acesso
    const forgotLink = document.getElementById('forgotLink');
    const forgotModal = document.getElementById('forgotModal');
    const tabForgot = document.getElementById('tabForgot');
    const tabCreate = document.getElementById('tabCreate');
    const forgotForm = document.getElementById('forgotForm');
    const createForm = document.getElementById('createForm');
    if (forgotLink && forgotModal) {
      forgotLink.onclick = () => {
        forgotModal.style.display = 'flex';
      };
    }
    const showForgot = () => {
      if (!forgotForm || !createForm) {
        return;
      }
      forgotForm.classList.remove('hidden');
      createForm.classList.add('hidden');
    };
    const showCreate = () => {
      if (!forgotForm || !createForm) {
        return;
      }
      createForm.classList.remove('hidden');
      forgotForm.classList.add('hidden');
    };
    const setActiveTab = (active) => {
      [tabForgot, tabCreate].forEach((el) => {
        if (!el) {
          return;
        }
        const on = el === active;
        // limpar estados
        el.classList.remove(
          'bg-blue-600',
          'border-white/0',
          'bg-white/20',
          'hover:bg-white/30',
          'border-white/20'
        );
        // aplicar estado
        if (on) {
          el.classList.add('bg-blue-600', 'border-white/0');
        } else {
          el.classList.add(
            'bg-white/20',
            'hover:bg-white/30',
            'border-white/20'
          );
        }
      });
    };
    if (tabForgot) {
      tabForgot.onclick = () => {
        showForgot();
        setActiveTab(tabForgot);
      };
    }
    if (tabCreate) {
      tabCreate.onclick = () => {
        showCreate();
        setActiveTab(tabCreate);
      };
    }
    // estado inicial
    setActiveTab(tabForgot);
    const closeForgot = () => {
      if (forgotModal) {
        forgotModal.style.display = 'none';
      }
    };
    const forgotCancel = document.getElementById('forgotCancel');
    const createCancel = document.getElementById('createCancel');
    if (forgotCancel) {
      forgotCancel.onclick = closeForgot;
    }
    if (createCancel) {
      createCancel.onclick = closeForgot;
    }
    if (forgotForm) {
      forgotForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(forgotForm));
        const btn = forgotForm.querySelector('.btn-primary');
        const prev = btn ? btn.textContent : '';
        if (btn) {
          btn.textContent = 'Enviando...';
          btn.disabled = true;
        }
        try {
          const r = await api.post('/api/auth/request', {
            type: 'forgot_password',
            email: data.email
          });
          const msg =
            r && r.queued
              ? 'Solicitação registrada e será processada por e-mail em instantes.'
              : r && r.emailSent === false
                ? 'Solicitação registrada. Suporte será notificado, mesmo sem envio de e-mail.'
                : 'Solicitação enviada. Você receberá instruções por e-mail.';
          showToast('success', msg);
          closeForgot();
          forgotForm.reset();
        } catch (_e) {
          let txt = String((_e && _e.message) || '');
          try {
            const j = JSON.parse(txt);
            if (j && j.detail === 'smtp_not_configured') {
              txt = 'SMTP não configurado. Solicitação registrada sem e-mail.';
            } else if (j && j.detail === 'smtp_send_failed') {
              txt =
                'Falha ao enviar e-mail (SMTP). Verifique credenciais e conexão TLS.';
            }
          } catch {}
          showToast('error', txt || 'Falha ao enviar solicitação');
        } finally {
          if (btn) {
            btn.textContent = prev || 'Enviar';
            btn.disabled = false;
          }
        }
      };
    }
    if (createForm) {
      createForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(createForm));
        const btn = createForm.querySelector('.btn-primary');
        const prev = btn ? btn.textContent : '';
        if (btn) {
          btn.textContent = 'Enviando...';
          btn.disabled = true;
        }
        try {
          const r = await api.post('/api/auth/request', {
            type: 'create_access',
            email: data.email,
            payload: { name: data.name, phone: data.phone, notes: data.notes }
          });
          const msg =
            r && r.queued
              ? 'Solicitação registrada e será processada por e-mail em instantes.'
              : r && r.emailSent === false
                ? 'Solicitação registrada. Suporte será notificado, mesmo sem envio de e-mail.'
                : 'Solicitação de acesso enviada. Em breve entraremos em contato.';
          showToast('success', msg);
          closeForgot();
          createForm.reset();
        } catch (_e) {
          let txt = String((_e && _e.message) || '');
          try {
            const j = JSON.parse(txt);
            if (j && j.detail === 'smtp_not_configured') {
              txt = 'SMTP não configurado. Solicitação registrada sem e-mail.';
            } else if (j && j.detail === 'smtp_send_failed') {
              txt =
                'Falha ao enviar e-mail (SMTP). Verifique credenciais e conexão TLS.';
            }
          } catch {}
          showToast('error', txt || 'Falha ao enviar solicitação');
        } finally {
          if (btn) {
            btn.textContent = prev || 'Solicitar';
            btn.disabled = false;
          }
        }
      };
    }
  }, 0);

  return page;
}
