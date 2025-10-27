/*
 * API frontend
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Wrapper simples sobre fetch para chamadas REST.
 */
export const api = {
  /**
   * Requisição GET.
   * @param {string} path Caminho/rota no backend
   */
  async get(path) {
    const r = await fetch(path, { credentials: 'include' });
    if (!r.ok) {
      throw new Error('Erro GET');
    }
    return r.json();
  },
  /**
   * Requisição POST com JSON.
   * @param {string} path Caminho/rota no backend
   * @param {unknown} body Corpo do POST
   */
  async post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });
    if (!r.ok) {
      throw new Error(await r.text());
    }
    return r.json();
  },
  /**
   * Requisição PUT com JSON.
   * @param {string} path Caminho/rota no backend
   * @param {unknown} body Corpo do PUT
   */
  async put(path, body) {
    const r = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });
    if (!r.ok) {
      throw new Error(await r.text());
    }
    return r.json();
  },
  /**
   * Requisição DELETE.
   * @param {string} path Caminho/rota no backend
   */
  async del(path) {
    const r = await fetch(path, { method: 'DELETE', credentials: 'include' });
    if (!r.ok) {
      throw new Error('Erro DELETE');
    }
    return r.json();
  }
};
