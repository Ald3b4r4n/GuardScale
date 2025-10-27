const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST;
  const service = process.env.SMTP_SERVICE; // opcional: 'gmail', etc.
  if (!host && !service) {
    return null;
  }
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587));
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const baseAuth = user && pass ? { user, pass } : undefined;
  const opts = host
    ? { host, port, secure, pool: true, maxConnections: 1, maxMessages: 10, auth: baseAuth, tls: { rejectUnauthorized: false } }
    : { service, pool: true, maxConnections: 1, maxMessages: 10, auth: baseAuth, tls: { rejectUnauthorized: false } };
  return nodemailer.createTransport(opts);
}

/**
 * Envia e-mail de suporte para solicitações de acesso.
 * @param {{ type: 'forgot_password'|'create_access', email: string, payload?: any, ua?: string, ip?: string, user?: { id?: string, email?: string, role?: string, active?: boolean, createdAt?: string, updatedAt?: string } }} req
*/
async function sendSupportEmail(req) {
  const to = process.env.SUPPORT_EMAIL_TO || 'rafasouzacruz@gmail.com';
  const from = process.env.SUPPORT_EMAIL_FROM || process.env.SMTP_USER || 'no-reply@guardscale.local';
  const subj = req.type === 'forgot_password'
    ? 'GuardScale: Solicitação de recuperação de acesso'
    : 'GuardScale: Solicitação de criação de acesso';
  const now = new Date().toLocaleString('pt-BR');
  const userBlock = req.type === 'forgot_password'
    ? `
        <h3>Dados do usuário (banco)</h3>
        <ul>
          <li><strong>Status:</strong> ${req.user ? 'Encontrado' : 'Não encontrado'}</li>
          ${req.user ? `
            <li><strong>ID:</strong> ${req.user.id || ''}</li>
            <li><strong>Email:</strong> ${req.user.email || ''}</li>
            <li><strong>Papel:</strong> ${req.user.role || ''}</li>
            <li><strong>Ativo:</strong> ${typeof req.user.active === 'boolean' ? (req.user.active ? 'Sim' : 'Não') : ''}</li>
            <li><strong>Criado em:</strong> ${req.user.createdAt || ''}</li>
            <li><strong>Atualizado em:</strong> ${req.user.updatedAt || ''}</li>
          ` : ''}
        </ul>
      `
    : '';

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;">
      <h2>${subj}</h2>
      <p><strong>Quando:</strong> ${now}</p>
      <p><strong>Origem:</strong> IP ${req.ip || ''} — UA ${req.ua || ''}</p>
      <p><strong>Email informado:</strong> ${req.email}</p>
      ${req.type === 'create_access' ? `
        <h3>Dados da solicitação de acesso</h3>
        <ul>
          <li><strong>Nome:</strong> ${req.payload?.name || ''}</li>
          <li><strong>Telefone:</strong> ${req.payload?.phone || ''}</li>
          <li><strong>Observações:</strong> ${req.payload?.notes || ''}</li>
        </ul>
      ` : ''}
      ${userBlock}
    </div>`;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const transport = createTransport();
  if (!transport) {
    console.warn('[mail] SMTP não configurado; não foi possível enviar e-mail');
    return { ok: false, reason: 'smtp_not_configured' };
  }
  try {
    const info = await transport.sendMail({ to, from, subject: subj, html, text });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error('[mail] Falha ao enviar e-mail', e);
    return { ok: false, reason: 'smtp_send_failed', error: String(e && e.message || e) };
  }
}

module.exports = { sendSupportEmail };