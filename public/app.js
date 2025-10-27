/* eslint quotes: 0 */
/*
 * GuardScale — App Frontend (SPA)
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Script principal da SPA. Faz roteamento por hash, inicializa o
 * tema (claro/escuro), integra com Socket.IO para atualizações em tempo real
 * e orquestra a renderização dos módulos (Agentes, Escalas, Relatórios).
 */
import { renderAgents } from "./modules/agents.js";
import { renderSchedules } from "./modules/schedules.js";
import { renderReports } from "./modules/reports.js";
import { renderUsers } from "./modules/users.js";
import { renderLogin } from "./modules/login.js";
import { showToast, showLoader } from "./modules/ui.js";
import { api } from "./api.js";

/**
 * Exibe um toast (banner) de feedback para o usuário.
 * @param {'success'|'error'|'info'|'warning'} type Tipo do toast
 * @param {string} msg Mensagem a exibir
 */
function banner(type, msg) {
  // Wrapper para manter compatibilidade com módulos existentes
  showToast(type, msg);
}

/**
 * Executa o logout no backend, limpa estado local e envia para a tela de login.
 * Também é usada pela rota #logout para facilitar o acesso.
 */
async function performLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch (_e) {
    // ignore
  }
  window.__authUser = null;
  localStorage.removeItem("operator");
  location.hash = "#login";
}

// Operador e realtime
const operator = JSON.parse(localStorage.getItem("operator") || "{}");
if (!operator.name) {
  operator.name = "Operador";
  operator.avatarUrl = "";
}

/**
 * Aplica o tema e persiste no localStorage.
 * @param {'light'|'dark'} [next]
 */
function applyTheme(next) {
  const root = document.documentElement; // aplicar no <html> para cobrir toda a página
  const theme = next || localStorage.getItem("theme") || "light";
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/**
 * Renderiza dados do operador (nome e avatar) no cabeçalho.
 * Caso não haja avatar, exibe as iniciais como fallback.
 */
function renderOperator() {
  const nameEl = document.getElementById("opName");
  const emailEl = document.getElementById("opEmail");
  const avatarImg = document.getElementById("opAvatar");
  const avatarFallback = document.getElementById("opAvatarFallback");
  const authEmail = (window.__authUser && window.__authUser.email) || "";
  const displayName = operator.name || authEmail || "Operador";
  nameEl.textContent = displayName;
  if (emailEl) {
    emailEl.textContent = authEmail;
  }
  if (operator.avatarUrl) {
    avatarImg.src = operator.avatarUrl;
    avatarImg.classList.remove("hidden");
    avatarFallback.classList.add("hidden");
  } else {
    avatarImg.classList.add("hidden");
    avatarFallback.classList.remove("hidden");
    avatarFallback.textContent = (displayName || "OP")
      .slice(0, 2)
      .toUpperCase();
  }
}

/** Ligações de eventos do menu do operador e modal de edição de perfil */
/**
 * Liga as ações do menu do operador e o modal de edição de perfil.
 * Inclui abrir/fechar menu, popular o formulário e salvar no localStorage.
 */
function bindOperatorActions() {
  const btn = document.getElementById("opActionsBtn");
  const menu = document.getElementById("opActionsMenu");
  const modal = document.getElementById("opModal");
  const form = document.getElementById("opForm");
  const cancel = document.getElementById("opCancel");
  if (!btn || !menu) {
    return;
  } // defensivo: se header não estiver pronto
  btn.onclick = () => {
    menu.classList.toggle("hidden");
  };
  document.body.addEventListener("click", (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add("hidden");
    }
  });
  const editBtn = document.getElementById("actEditProfile");
  if (editBtn && modal && form) {
    editBtn.onclick = () => {
      form.name.value = operator.name || "";
      form.avatarUrl.value = operator.avatarUrl || "";
      modal.style.display = "flex";
      menu.classList.add("hidden");
    };
  }
  const logoutBtn = document.getElementById("actLogout");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await performLogout();
      menu.classList.add("hidden");
    };
  }
  if (cancel && modal) {
    cancel.onclick = () => {
      modal.style.display = "none";
    };
  }
  if (form && modal) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      operator.name = data.name;
      operator.avatarUrl = data.avatarUrl;
      localStorage.setItem("operator", JSON.stringify(operator));
      renderOperator();
      modal.style.display = "none";
      banner("success", "Perfil atualizado");
    };
  }
}

/** Inicializa Socket.IO e re-renderiza a rota atual quando houver eventos */
/**
 * Inicializa a conexão Socket.IO e re-renderiza o módulo ativo
 * quando um evento de atualização de dados ocorrer.
 * O indicador visual (rtIndicator) foi mantido defensivo caso exista no DOM.
 */
function initRealtime() {
  const rt = document.getElementById("rtIndicator");
  if (!window.io) {
    return;
  } // socket.io script não carregado
  const socket = window.io();
  socket.on("connect", () => {
    if (rt) {
      rt.className = "w-2 h-2 rounded-full bg-success";
    }
  });
  socket.on("disconnect", () => {
    if (rt) {
      rt.className = "w-2 h-2 rounded-full bg-error";
    }
  });
  socket.on("status", () => {
    if (rt) {
      rt.className = "w-2 h-2 rounded-full bg-success";
    }
  });
  socket.on("data-update", (_evt) => {
    if (rt) {
      rt.className = "w-2 h-2 rounded-full bg-warning";
    }
    // Notificações de desktop desativadas para evitar duplicidade; mantemos apenas toasts in-app
    setTimeout(() => {
      if (rt) {
        rt.className = "w-2 h-2 rounded-full bg-success";
      }
    }, 1200);
    const route = location.hash.replace("#", "") || "agents";
    const app = document.getElementById("app");
    const stop = showLoader(app);
    let p;
    if (route === "agents") {
      p = renderAgents({ banner });
    } else if (route === "schedules") {
      p = renderSchedules({ banner });
    } else if (route === "users") {
      p = renderUsers({ banner });
    } else {
      p = renderReports({ banner });
    }
    p.then((html) => {
      document.getElementById("app").innerHTML = html;
    }).finally(stop);
  });
}

// initNotifications removido — notificações de desktop desativadas

/** Roteador simples baseado em window.location.hash */
/**
 * Roteador baseado no hash da URL.
 * Responsável por carregar dinamicamente o módulo selecionado e
 * aplicar feedback visual de seleção no menu.
 */
async function router() {
  const route = location.hash.replace("#", "") || "agents";
  const app = document.getElementById("app");
  const stop = showLoader(app);
  // Esconder/mostrar shell (header/sidebars) conforme rota
  const headerEl = document.querySelector("header");
  const sideDesktop = document.getElementById("sidebar");
  const sideMobile = document.getElementById("mobileSidebar");
  const sideOverlay = document.getElementById("mobileOverlay");
  const isLogin = route === "login";
  if (headerEl) {
    headerEl.classList.toggle("hidden", isLogin);
  }
  if (sideDesktop) {
    // Manter a sidebar desktop SEMPRE oculta em mobile (classe 'hidden' fixa)
    sideDesktop.classList.add("hidden");
    // Controlar apenas os estados em md+: oculta no login, mostra nas demais rotas
    sideDesktop.classList.toggle("md:hidden", isLogin);
    sideDesktop.classList.toggle("md:block", !isLogin);
  }
  if (sideMobile) {
    if (isLogin) {
      sideMobile.classList.add("hidden");
    }
  }
  if (sideOverlay) {
    sideOverlay.classList.add("hidden");
  }
  // Ajustar padding do container #app para tela de login ocupar 100%
  if (app) {
    if (isLogin) {
      app.classList.add("p-0");
      app.classList.remove("p-3", "sm:p-4");
    } else {
      app.classList.remove("p-0");
      app.classList.add("p-3", "sm:p-4");
    }
  }
  // Atalho de logout via URL (#logout)
  if (route === "logout") {
    await performLogout();
    stop();
    return;
  }
  // Rotas que exigem autenticação
  const protectedRoutes = new Set(["agents", "schedules", "reports", "users"]);
  // Limpar estado efêmero de visualização de Escalas ao sair da rota
  if (typeof window !== "undefined" && route !== "schedules") {
    try {
      delete window.__schedulesCurrentView;
    } catch (_) {
      window.__schedulesCurrentView = undefined;
    }
  }
  // destacar navegação ativa
  (function setActiveNav() {
    const href = `#${route}`;
    document.querySelectorAll("#sidebar a, #mobileSidebar a").forEach((a) => {
      const isActive = a.getAttribute("href") === href;
      a.classList.toggle("bg-gray-100", isActive);
      a.classList.toggle("text-gray-900", isActive);
      a.classList.toggle("font-semibold", isActive);
    });
  })();
  try {
    // Gate de autenticação
    if (protectedRoutes.has(route)) {
      try {
        if (!window.__authUser) {
          const me = await fetch("/api/auth/me", { credentials: "include" });
          if (me.ok) {
            window.__authUser = await me.json();
            try {
              renderOperator();
            } catch (_e) {
              void 0;
            }
          } else {
            location.hash = "#login";
            app.innerHTML = await renderLogin();
            return;
          }
        }
      } catch (_e) {
        location.hash = "#login";
        app.innerHTML = await renderLogin();
        return;
      }
      // Aplicar visibilidade baseada em papel no menu
      (function applyRoleVisibility() {
        const role = window.__authUser && window.__authUser.role;
        document
          .querySelectorAll('[data-requires-role]')
          .forEach((el) => {
            const req = el.getAttribute('data-requires-role');
            const show = role === req;
            el.classList.toggle('hidden', !show);
          });
      })();
    }

    if (route === "login") {
      app.innerHTML = await renderLogin();
    } else if (route === "agents") {
      app.innerHTML = await renderAgents({ banner });
    } else if (route === "schedules") {
      app.innerHTML = await renderSchedules({ banner });
    } else if (route === "reports") {
      app.innerHTML = await renderReports({ banner });
    } else if (route === "users") {
      if (!window.__authUser || window.__authUser.role !== "admin") {
        banner("error", "Acesso negado: somente administradores");
        location.hash = "#agents";
        app.innerHTML = await renderAgents({ banner });
      } else {
        app.innerHTML = await renderUsers({ banner });
      }
    } else {
      app.innerHTML = `<div class='text-grayMid'>Selecione um módulo</div>`;
    }
  } finally {
    stop();
  }
}

// Eventos iniciais: executar roteador no carregamento e ao trocar hash
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  renderOperator();
  // expõe para outros módulos atualizarem cabeçalho pós-login
  try {
    window.renderOperator = renderOperator;
  } catch (_e) {
    void 0;
  }
  bindOperatorActions();
  initRealtime();
  // Tema
  applyTheme();
  const themeBtn = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const syncIcon = () => {
    const cur = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    if (themeIcon) {
      themeIcon.className =
        cur === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
  };
  if (themeBtn) {
    themeBtn.onclick = () => {
      const cur = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      const next = cur === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme(next);
      syncIcon();
    };
    syncIcon();
  }
  router();
});

// Sidebar móvel (drawer)
/**
 * Sidebar móvel (drawer): abre/fecha o menu lateral em telas pequenas.
 * Trava o scroll do body ao abrir e fecha ao clicar no overlay ou apertar ESC.
 */
(function bindMobileSidebar() {
  const btn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("mobileSidebar");
  const overlay = document.getElementById("mobileOverlay");
  if (!btn || !sidebar || !overlay) {
    return;
  } // defensivo

  const open = () => {
    sidebar.classList.remove("hidden");
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  };
  const close = () => {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    // Após a transição, ocultar completamente para evitar qualquer traço visual
    setTimeout(() => sidebar.classList.add("hidden"), 220);
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    open();
  });
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
    }
  });

  // Fechar ao navegar por links
  sidebar.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", () => {
      close();
    });
  });
})();

// Ações de troca de senha do operador
(function bindPasswordModal() {
  const btn = document.getElementById('actChangePassword');
  const modal = document.getElementById('pwdModal');
  const form = document.getElementById('pwdForm');
  const cancel = document.getElementById('pwdCancel');
  const menu = document.getElementById('opActionsMenu');
  if (!btn || !modal || !form) {
    return;
  }
  btn.onclick = () => {
    modal.style.display = 'flex';
    if (menu) {
      menu.classList.add('hidden');
    }
  };
  if (cancel) {
    cancel.onclick = () => {
      modal.style.display = 'none';
    };
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      banner('success', 'Senha alterada com sucesso');
      modal.style.display = 'none';
      form.reset();
    } catch (_e) {
      banner('error', 'Falha ao trocar senha');
    }
  };
})();

// Suprimir logs no frontend fora de ambiente local
const __isLocalDev = ["localhost", "127.0.0.1"].includes(location.hostname);
if (!__isLocalDev && typeof console !== "undefined") {
  /* eslint-disable no-console */
  const __noop = () => {};
  console.log = __noop;
  console.info = __noop;
  console.debug = __noop;
  /* eslint-enable no-console */
}