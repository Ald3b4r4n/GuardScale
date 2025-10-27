/*
 * Utilidades de UI: toast, loaders e skeletons
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Fornece funções reutilizáveis para feedback ao usuário e estados
 * de carregamento. Projetado para ser simples e sem dependências.
 */

// Contêiner global de toasts (mantido em memória para evitar recriação)
let __toastContainer;

/**
 * Garante que exista um contêiner no DOM para empilhar toasts.
 * Cria um elemento fixo no canto superior direito.
 */
function ensureToastContainer() {
  if (!__toastContainer) {
    __toastContainer = document.createElement('div');
    __toastContainer.id = 'toastContainer';
    // Mobile: bottom-center (menos intrusivo), Desktop: bottom-right
    __toastContainer.className = [
      'fixed z-[60]',
      // posicionamento
      'bottom-4 left-4 right-4',
      'sm:left-auto sm:right-4 sm:bottom-4',
      // empilhamento e layout
      'flex flex-col-reverse gap-2 items-stretch sm:items-end',
      // evitar bloquear cliques fora dos toasts
      'pointer-events-none',
      // respeitar safe-area no iOS
      'pb-[env(safe-area-inset-bottom,0px)]'
    ].join(' ');
    __toastContainer.setAttribute('aria-live', 'polite');
    __toastContainer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(__toastContainer);
  }
}

/**
 * Exibe um toast (banner) temporário.
 * @param {'success'|'error'|'warning'|'info'} type Tipo de feedback visual
 * @param {string} message Mensagem a exibir
 * @param {{timeout?:number}} [opts] Opções (tempo de exibição em ms)
 * @returns {() => void} Função para remover o toast manualmente
 */
export function showToast(
  type = 'info',
  message = '',
  { timeout = 2800 } = {}
) {
  ensureToastContainer();
  const colors = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-600 text-white'
  };
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.className = [
    // dimensões
    'px-4 py-2 rounded-lg shadow-lg ring-1 ring-black/5',
    'w-full sm:w-auto',
    'max-w-[92vw] sm:max-w-sm',
    // interação e pilha
    'pointer-events-auto',
    // animação
    'transition-all duration-300 ease-out',
    'opacity-0 translate-y-2',
    // cor
    colors[type] || colors.info
  ].join(' ');
  el.textContent = message;
  __toastContainer.appendChild(el);
  // Entrada suave
  requestAnimationFrame(() => {
    el.classList.remove('opacity-0', 'translate-y-2');
    el.classList.add('opacity-100', 'translate-y-0');
  });
  const remove = () => {
    el.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => el.remove(), 250);
  };
  setTimeout(remove, timeout);
  el.addEventListener('click', remove);
  return remove;
}

/**
 * Exibe um overlay de carregamento (spinner) sobre um container.
 * Retorna uma função para encerrar o overlay.
 * @param {HTMLElement} target Elemento alvo a ser coberto
 * @returns {() => void}
 */
export function showLoader(target) {
  if (!target) {
    return () => {};
  }
  const wrapper = document.createElement('div');
  wrapper.className =
    'absolute inset-0 bg-white/60 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-40';
  wrapper.innerHTML =
    '<div class="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>';
  target.style.position = target.style.position || 'relative';
  target.appendChild(wrapper);
  return () => {
    wrapper.remove();
  };
}

// Skeleton helpers — atalhos para gerar placeholders
/**
 * Gera linhas de skeleton (texto) para estados de carregamento.
 * @param {number} [count]
 * @param {{className?:string}} [opts]
 */
export function skeletonLines(count = 3, { className = '' } = {}) {
  return Array.from(
    { length: count },
    () => `<div class="skeleton skeleton-text ${className}"></div>`
  ).join('<div class="h-2"></div>');
}

/**
 * Gera linhas e colunas de skeleton para tabelas.
 * @param {number} rows Número de linhas
 * @param {number} cols Número de colunas
 */
export function skeletonTableRows(rows = 5, cols = 5) {
  const td = () =>
    '<td class="p-2"><div class="skeleton skeleton-sm w-24"></div></td>';
  return Array.from(
    { length: rows },
    () => `<tr>${Array.from({ length: cols }, td).join('')}</tr>`
  ).join('');
}
