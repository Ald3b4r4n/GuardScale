/*
 * GuardScale — API/Servidor Express
 * Autor: Antonio Rafael Souza Cruz de Noronha — rafasouzacruz@gmail.com
 * Descrição: Servidor HTTP com Socket.IO, rotas REST para agentes, turnos
 * (shifts) e relatórios, além de geração de PDF. Inclui limpeza de dados
 * órfãos e regras de deleção em cascata.
 */
'use strict';
require('dotenv').config();
// Alias de timezone: permite usar APP_TIMEZONE em vez de TZ
const appTZ = process.env.APP_TIMEZONE || process.env.TZ;
if (appTZ) {
  // Nota: Node lê TZ no start; ainda assim mantemos para libs que o consultam
  process.env.TZ = appTZ;
}
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
// http/socket.io serão inicializados condicionalmente (ambiente serverful)
const { Log } = require('./src/models/Log');
const { sendSupportEmail } = require('./src/services/mailer');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault(appTZ || 'America/Sao_Paulo');

const { Agent } = require('./src/models/Agent');
const { Shift } = require('./src/models/Shift');
const { validateCPF, validatePhone } = require('./src/utils/validation');
const { generateSchedule } = require('./src/services/scheduleService');
const { buildSchedulePDF } = require('./src/pdf/schedulePdf');
const { computeReports } = require('./src/services/reportService');
const { User } = require('./src/models/User');

const app = express();
app.use(helmet());
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());
// Middleware de logs HTTP (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(express.static(path.join(__dirname, 'public')));

// Inicializa HTTP server e Socket.IO apenas fora do ambiente Vercel
let server = null;
let io = { emit: () => {} };
if (!process.env.VERCEL) {
  const http = require('http');
  const { Server } = require('socket.io');
  server = http.createServer(app);
  io = new Server(server, { cors: { origin: '*' } });
}

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/guardscale';

// Conexão com MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB conectado:', MONGO_URI);
  })
  .catch((err) => {
    console.error('Erro ao conectar MongoDB', err);
  });

// ======== Auth helpers/middlewares ========
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const COOKIE_NAME = 'gs_auth';
const isProd = process.env.NODE_ENV === 'production';

function signToken(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h', ...opts });
}

function authRequired(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { sub, email, role }
    return next();
  } catch (_e) {
    return res.status(401).json({ error: 'Sessão expirada' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    return next();
  };
}

// Rate limiter para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

// Seed inicial: cria um admin se não existir nenhum usuário
async function ensureAdminSeed() {
  const count = await User.countDocuments();
  if (count === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@local';
    const pass = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(pass, 10);
    await User.create({ email, passwordHash, role: 'admin', active: true });
    console.log(
      '[auth] Usuário admin criado:',
      email,
      '(senha padrão: admin123)'
    );
  }
}
ensureAdminSeed().catch(() => {});

// Atualização pontual de credenciais do admin via variáveis de ambiente
async function applyAdminUpdate() {
  try {
    const oldEmail = process.env.ADMIN_OLD_EMAIL;
    const newEmail = process.env.ADMIN_NEW_EMAIL;
    const newPassword = process.env.ADMIN_NEW_PASSWORD;
    if (!oldEmail || !newEmail || !newPassword) {
      return; // nada a aplicar
    }
    const admin = await User.findOne({ email: String(oldEmail).toLowerCase(), role: 'admin' });
    if (!admin) {
      console.warn('[auth] Admin com email antigo não encontrado:', oldEmail);
      return;
    }
    const conflict = await User.findOne({ email: String(newEmail).toLowerCase(), _id: { $ne: admin._id } });
    if (conflict) {
      console.warn('[auth] Novo email já em uso:', newEmail);
      return;
    }
    admin.email = String(newEmail).toLowerCase();
    admin.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await admin.save();
    console.log('[auth] Admin atualizado para', newEmail);
  } catch (e) {
    console.error('[auth] Falha ao aplicar atualização de admin', e);
  }
}
applyAdminUpdate().catch(() => {});

// ======== Auth routes (não protegidas) ========
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe email e senha' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = signToken({
      sub: String(user._id),
      email: user.email,
      role: user.role
    });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 2 // 2h
    });
    return res.json({
      ok: true,
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (_e) {
    return res.status(500).json({ error: 'Falha no login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd
  });
  res.json({ ok: true });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  const user = await User.findById(req.user.sub).select('email role active');
  if (!user || !user.active) {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
  res.json({ id: user._id, email: user.email, role: user.role });
});

// Troca de senha do próprio usuário
app.post('/api/auth/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Informe senha atual e nova senha' });
    }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
    if (!strong.test(String(newPassword))) {
      return res.status(400).json({ error: 'Senha fraca: mínimo 8, maiúscula, minúscula, número e símbolo' });
    }
    const user = await User.findById(req.user.sub);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Sessão inválida' });
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!ok) {
      return res.status(403).json({ error: 'Senha atual incorreta' });
    }
    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    res.json({ ok: true });
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao trocar senha' });
  }
});

// Administração de usuários (apenas admin)
app.get('/api/users', authRequired, requireRole('admin'), async (_req, res) => {
  const list = await User.find().select('email role active createdAt');
  res.json(list);
});
app.post('/api/users', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Informe email e senha' });
    }
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: String(email).toLowerCase(),
      passwordHash,
      role
    });
    res
      .status(201)
      .json({
        id: user._id,
        email: user.email,
        role: user.role,
        active: user.active
      });
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao criar usuário' });
  }
});
// Reset de senha por admin
app.post(
  '/api/users/:id/reset-password',
  authRequired,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { newPassword } = req.body || {};
      if (!newPassword) {
        return res.status(400).json({ error: 'Informe a nova senha' });
      }
      const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strong.test(String(newPassword))) {
        return res.status(400).json({ error: 'Senha fraca: mínimo 8, maiúscula, minúscula, número e símbolo' });
      }
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      user.passwordHash = await bcrypt.hash(String(newPassword), 10);
      await user.save();
      res.json({ ok: true });
    } catch (_e) {
      res.status(500).json({ error: 'Falha ao resetar senha' });
    }
  }
);
app.put(
  '/api/users/:id',
  authRequired,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { role, active, email } = req.body || {};
      const upd = {};
      if (role) {
        upd.role = role;
      }
      if (typeof active === 'boolean') {
        upd.active = active;
      }
      if (email) {
        const nextEmail = String(email).toLowerCase();
        const conflict = await User.findOne({ email: nextEmail, _id: { $ne: req.params.id } });
        if (conflict) {
          return res.status(409).json({ error: 'Email já em uso' });
        }
        upd.email = nextEmail;
      }
      const user = await User.findByIdAndUpdate(req.params.id, upd, {
        new: true
      });
      res.json({
        id: user._id,
        email: user.email,
        role: user.role,
        active: user.active
      });
    } catch (_e) {
      res.status(500).json({ error: 'Falha ao atualizar usuário' });
    }
  }
);

// Remover usuário (apenas admin). Impede excluir a si mesmo e o último admin ativo.
app.delete('/api/users/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    if (String(req.user.sub) === String(id)) {
      return res.status(400).json({ error: 'Não é possível excluir a si mesmo' });
    }
    const user = await User.findById(id).select('role active');
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    if (user.role === 'admin') {
      const otherAdmins = await User.countDocuments({ role: 'admin', active: true, _id: { $ne: id } });
      if (otherAdmins === 0) {
        return res.status(400).json({ error: 'Não é possível excluir o último administrador' });
      }
    }
    await User.deleteOne({ _id: id });
    return res.json({ ok: true });
  } catch (_e) {
    return res.status(500).json({ error: 'Falha ao excluir usuário' });
  }
});

// Solicitações de suporte: esqueci senha e criar acesso
const requestLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
app.post('/api/auth/request', requestLimiter, async (req, res) => {
  try {
    const { type, email, payload } = req.body || {};
    if (!type || !email) {
      return res.status(400).json({ error: 'Informe tipo e email' });
    }
    const accepted = new Set(['forgot_password', 'create_access']);
    if (!accepted.has(type)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }
    const ua = req.headers['user-agent'] || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    // Enriquecimento: incluir dados do usuário no caso de esqueci senha
    let userDoc = null;
    if (type === 'forgot_password') {
      try {
        const u = await User.findOne({ email: String(email).toLowerCase() }).select('_id email role active createdAt updatedAt');
        if (u) {
          userDoc = {
            id: String(u._id),
            email: u.email,
            role: u.role,
            active: !!u.active,
            createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString('pt-BR') : undefined,
            updatedAt: u.updatedAt ? new Date(u.updatedAt).toLocaleString('pt-BR') : undefined
          };
        }
      } catch (e) {
        console.warn('[support] Não foi possível consultar usuário (DB indisponível?)');
      }
    }
    try {
      await Log.create({
        type: 'auth_request',
        message: type,
        meta: { email: String(email).toLowerCase(), payload, ua, ip },
        level: 'info'
      });
    } catch (e) {
      console.warn('[support] Falha ao registrar log (DB indisponível?)');
    }
    // Envio assíncrono para reduzir latência da resposta
    sendSupportEmail({ type, email: String(email).toLowerCase(), payload, ua, ip, user: userDoc })
      .then((send) => {
        if (!send.ok) {
          if (send.reason === 'smtp_not_configured') {
            console.warn('[support] SMTP não configurado; solicitação registrada sem envio');
          } else {
            console.error('[support] Falha ao enviar e-mail de suporte', send);
          }
        } else {
          console.log('[support] E-mail enviado:', send.messageId);
        }
      })
      .catch((e) => console.error('[support] Erro ao enviar e-mail (async)', e));

    // Responde imediatamente informando que será processado
    res.json({ ok: true, queued: true });
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao registrar solicitação' });
  }
});

// A partir daqui, todas as rotas /api exigem autenticação
app.use('/api', authRequired);

// Agents CRUD — criação, listagem, atualização e remoção de agentes
app.get('/api/agents', async (req, res) => {
  try {
    const { q } = req.query;
    const base = req.user && req.user.role === 'admin' ? {} : { tenantId: req.user.sub };
    const filter = q
      ? {
        ...base,
        $or: [
          { name: new RegExp(q, 'i') },
          { cpf: new RegExp(q, 'i') },
          { phone: new RegExp(q, 'i') }
        ]
      }
      : { ...base };
    const agents = await Agent.find(filter).sort({ name: 1 });
    res.json(agents);
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao listar agentes' });
  }
});

// Criação de agente (valida CPF/telefone e registra log)
app.post('/api/agents', async (req, res) => {
  try {
    const {
      name,
      phone,
      cpf,
      pix,
      hourlyRate,
      status = 'disponível',
      avatarUrl = ''
    } = req.body;
    if (!name || !phone || !cpf || !pix) {
      return res
        .status(400)
        .json({ error: 'Campos obrigatórios: name, phone, cpf, pix' });
    }
    if (!validateCPF(cpf)) {
      return res.status(400).json({ error: 'CPF inválido' });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Telefone inválido' });
    }
    const agent = await Agent.create({
      name,
      phone,
      cpf,
      pix,
      hourlyRate,
      status,
      avatarUrl,
      tenantId: req.user.sub
    });
    await Log.create({
      user: 'Operador',
      entity: 'agents',
      operation: 'create',
      after: agent
    });
    io.emit('data-update', { type: 'agent', action: 'create', agent });
    res.status(201).json(agent);
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao criar agente' });
  }
});

// Atualização de agente com validações opcionais
app.put('/api/agents/:id', async (req, res) => {
  try {
    const base = req.user && req.user.role === 'admin' ? {} : { tenantId: req.user.sub };
    const filter = { _id: req.params.id, ...base };
    const before = await Agent.findOne(filter);
    if (!before) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    const { name, phone, cpf, pix, hourlyRate, status, avatarUrl } = req.body;
    if (cpf && !validateCPF(cpf)) {
      return res.status(400).json({ error: 'CPF inválido' });
    }
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Telefone inválido' });
    }
    const updated = await Agent.findOneAndUpdate(
      filter,
      { name, phone, cpf, pix, hourlyRate, status, avatarUrl },
      { new: true }
    );
    await Log.create({
      user: 'Operador',
      entity: 'agents',
      operation: 'update',
      before,
      after: updated
    });
    io.emit('data-update', { type: 'agent', action: 'update', agent: updated });
    res.json(updated);
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao atualizar agente' });
  }
});

// Exclusão de agente + deleção em cascata de escalas (ObjectId, string e legado)
app.delete('/api/agents/:id', async (req, res) => {
  try {
    const base = req.user && req.user.role === 'admin' ? {} : { tenantId: req.user.sub };
    const filterAgent = { _id: req.params.id, ...base };
    const before = await Agent.findOne(filterAgent);
    if (!before) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    await Agent.deleteOne(filterAgent);
    // Remover todas as escalas (shifts) vinculadas a este agente
    // Considera registros antigos com agentId salvo como string ou ObjectId
    const idStr = String(req.params.id);
    const isValid = mongoose.Types.ObjectId.isValid(idStr);
    const objId = isValid ? new mongoose.Types.ObjectId(idStr) : null;
    // Apagar registros com agentId como ObjectId
    let delObj = { deletedCount: 0 };
    if (objId) {
      delObj = await Shift.deleteMany({ agentId: objId, ...base });
    }
    // Apagar registros com agentId salvo como string crua (bypass casting)
    const delStr = await Shift.collection.deleteMany({
      agentId: idStr,
      ...(base.tenantId ? { tenantId: base.tenantId } : {})
    });
    // Apagar registros com agentId string em formato legado: e.g., "ObjectId(\"<id>\")" ou "new ObjectId(\"<id>\")"
    const legacyPattern = new RegExp(
      `^(?:${idStr}|ObjectId\\("${idStr}"\\)|new ObjectId\\("${idStr}"\\))$`
    );
    const delLegacy = await Shift.collection.deleteMany({
      agentId: { $regex: legacyPattern },
      ...(base.tenantId ? { tenantId: base.tenantId } : {})
    });
    const del = {
      deletedCount:
        (delObj.deletedCount || 0) +
        (delStr.deletedCount || 0) +
        (delLegacy.deletedCount || 0)
    };

    // Limpeza adicional: remover quaisquer escalas órfãs (agentId não existe mais na coleção Agents)
    try {
      const agents = await Agent.find(base).select('_id');
      const validObjIds = agents.map((a) => a._id);
      const validStrIds = validObjIds.map((x) => String(x));
      const orphanDel = await Shift.deleteMany({
        $and: [
          { agentId: { $nin: validObjIds } },
          { agentId: { $nin: validStrIds } }
        ],
        ...base
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[cleanup-orphans] removed=${orphanDel.deletedCount}`);
      }
    } catch (_e) {
      // noop
    }
    await Log.create({
      user: 'Operador',
      entity: 'agents',
      operation: 'delete',
      before,
      after: { shiftsDeleted: del.deletedCount }
    });
    // Notificar frontend
    io.emit('data-update', {
      type: 'agent',
      action: 'delete',
      agentId: req.params.id
    });
    io.emit('data-update', {
      type: 'shift',
      action: 'bulk-delete',
      agentId: req.params.id,
      count: del.deletedCount
    });
    res.json({ ok: true, shiftsDeleted: del.deletedCount });
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao remover agente' });
  }
});

// Shifts CRUD — turnos individuais
app.get('/api/shifts', async (req, res) => {
  try {
    const { startDate, endDate, agentId } = req.query;
    const base = req.user && req.user.role === 'admin' ? {} : { tenantId: req.user.sub };
    const filter = { ...base };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = startDate;
      }
      if (endDate) {
        filter.date.$lte = endDate;
      }
    }
    if (agentId) {
      filter.agentId = agentId;
    }
    const shifts = await Shift.find(filter).sort({ date: 1, start: 1 });
    res.json(shifts);
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao listar turnos' });
  }
});

// Contadores simples de chamadas
const callCounters = { generate: 0, createShift: 0 };

// Criação de turno individual com idempotência (upsert)
app.post('/api/shifts', async (req, res) => {
  try {
    callCounters.createShift++;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    res.set('X-Request-ID', requestId);
    const { agentId, date, start, end, location, notes } = req.body;
    if (!agentId || !date || !start || !end) {
      return res
        .status(400)
        .json({ error: 'Campos obrigatórios: agentId, date, start, end' });
    }
    // Determinar tenant do turno a partir do agente (admin) ou do usuário logado
    let tenantForShift = null;
    if (req.user && req.user.role === 'admin') {
      const ag = await Agent.findById(agentId).select('tenantId');
      tenantForShift = ag ? ag.tenantId : null;
    } else {
      // Validar que o agente pertence ao tenant do usuário
      const ag = await Agent.findOne({ _id: agentId, tenantId: req.user.sub });
      if (!ag) {
        return res.status(403).json({ error: 'Agente não pertence ao seu tenant' });
      }
      tenantForShift = req.user.sub;
    }
    const { calcDuration } = require('./src/services/scheduleService');
    const { durationHours, isOvernight, is24h } = calcDuration(
      date,
      start,
      end
    );
    const filter = tenantForShift
      ? { agentId, date, start, tenantId: tenantForShift }
      : { agentId, date, start };
    const update = {
      $setOnInsert: {
        agentId,
        date,
        start,
        end,
        location,
        notes,
        durationHours,
        isOvernight,
        is24h,
        ...(tenantForShift ? { tenantId: tenantForShift } : {})
      }
    };
    const result = await Shift.updateOne(filter, update, { upsert: true });
    const doc = await Shift.findOne(filter);
    if (result.upsertedCount === 1) {
      await Log.create({
        user: 'Operador',
        entity: 'shifts',
        operation: 'create',
        after: doc,
        requestId
      });
      io.emit('data-update', { type: 'shift', action: 'create', shift: doc });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[createShift:${requestId}] inserido`);
      }
      return res.status(201).json(doc);
    } else {
      await Log.create({
        user: 'Operador',
        entity: 'shifts',
        operation: 'noop_exists',
        after: doc,
        requestId
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[createShift:${requestId}] já existia`);
      }
      return res.json({ ok: true, existed: true, shift: doc });
    }
  } catch (e) {
    console.error('Erro ao criar turno', e);
    res.status(500).json({ error: 'Falha ao criar turno' });
  }
});

// Atualização de turno (recalcula duração e fim quando necessário)
app.put('/api/shifts/:id', async (req, res) => {
  try {
    const base = req.user && req.user.role === 'admin' ? {} : { tenantId: req.user.sub };
    const filter = { _id: req.params.id, ...base };
    const before = await Shift.findOne(filter);
    if (!before) {
      return res.status(404).json({ error: 'Turno não encontrado' });
    }
    const start =
      typeof req.body.start === 'string' ? req.body.start : before.start;
    const end = typeof req.body.end === 'string' ? req.body.end : before.end;
    const notes =
      typeof req.body.notes === 'string' ? req.body.notes : before.notes;
    const { calcDuration } = require('./src/services/scheduleService');
    const dayjs = require('dayjs');
    const { durationHours, isOvernight, is24h } = calcDuration(
      before.date,
      start,
      end
    );
    const endDate = isOvernight
      ? dayjs(before.date).add(1, 'day').format('YYYY-MM-DD')
      : undefined;
    const updated = await Shift.findOneAndUpdate(
      filter,
      { start, end, notes, durationHours, isOvernight, is24h, endDate },
      { new: true }
    );
    await Log.create({
      user: 'Operador',
      entity: 'shifts',
      operation: 'update',
      before,
      after: updated
    });
    io.emit('data-update', { type: 'shift', action: 'update', shift: updated });
    res.json(updated);
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao atualizar turno' });
  }
});

// Remoção de turno e registro de log
app.delete('/api/shifts/:id', async (req, res) => {
  try {
    const base = req.user && req.user.role === 'admin' ? {} : { tenantId: req.user.sub };
    const filter = { _id: req.params.id, ...base };
    const before = await Shift.findOne(filter);
    if (!before) {
      return res.status(404).json({ error: 'Turno não encontrado' });
    }
    await Shift.deleteOne(filter);
    await Log.create({
      user: 'Operador',
      entity: 'shifts',
      operation: 'delete',
      before
    });
    io.emit('data-update', {
      type: 'shift',
      action: 'delete',
      shiftId: req.params.id
    });
    res.json({ ok: true });
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao remover turno' });
  }
});

// Schedule generation — geração em massa de escalas por período
// Autor: Antônio Rafael Souza Cruz, email rafasouzacruz@gmai.com
// Endpoint de geração de escalas: aceita 'notes' e evita conflito no bulkWrite
app.post('/api/schedules/generate', async (req, res) => {
  try {
    callCounters.generate++;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    res.set('X-Request-ID', requestId);
    const {
      period = 'weekly',
      startDate,
      endDate,
      shiftLengths = [8],
      startTimes = ['08:00'],
      selectedAgentIds = [],
      notes
    } = req.body;
    const base = req.user && req.user.role === 'admin' ? {} : { tenantId: req.user.sub };
    const agents = selectedAgentIds.length
      ? await Agent.find({ _id: { $in: selectedAgentIds }, ...base }).sort({ name: 1 })
      : await Agent.find({ status: 'disponível', ...base }).sort({ name: 1 });
    const tenantByAgent = new Map(agents.map((a) => [String(a._id), String(a.tenantId || '')]));
    const result = generateSchedule({
      period,
      startDate,
      endDate,
      shiftLengths,
      startTimes,
      agents,
      notes
    });

    const ops = result.shiftsToSave.map((s) => {
      // Removemos 'notes' do $setOnInsert para não conflitar com $set
      const onInsert = { ...s };
      delete onInsert.notes;
      const tId = tenantByAgent.get(String(s.agentId)) || (req.user && req.user.role !== 'admin' ? req.user.sub : undefined);
      const update = { $setOnInsert: onInsert };
      if (typeof s.notes !== 'undefined') {
        update.$set = { notes: s.notes };
      }
      return {
        updateOne: {
          filter: tId ? { agentId: s.agentId, date: s.date, start: s.start, tenantId: tId } : { agentId: s.agentId, date: s.date, start: s.start },
          update: tId ? { ...update, $setOnInsert: { ...onInsert, tenantId: tId } } : update,
          upsert: true
        }
      };
    });

    const session = await mongoose.startSession();
    let upsertedCount = 0;
    await session
      .withTransaction(async () => {
        const bw = await Shift.bulkWrite(ops, { ordered: false, session });
        upsertedCount =
          bw.upsertedCount ||
          (bw.result && bw.result.upserted ? bw.result.upserted.length : 0);
        await Log.create(
          {
            user: 'Operador',
            entity: 'shifts',
            operation: 'generate',
            after: {
              requested: ops.length,
              upsertedCount,
              period,
              startDate,
              endDate,
              requestId
            }
          },
          { session }
        );
      })
      .catch(async (err) => {
        if (String(err).includes('Transaction')) {
          const bw = await Shift.bulkWrite(ops, { ordered: false });
          upsertedCount =
            bw.upsertedCount ||
            (bw.result && bw.result.upserted ? bw.result.upserted.length : 0);
          await Log.create({
            user: 'Operador',
            entity: 'shifts',
            operation: 'generate',
            after: {
              requested: ops.length,
              upsertedCount,
              period,
              startDate,
              endDate,
              requestId,
              fallback: true
            }
          });
        } else {
          throw err;
        }
      })
      .finally(() => session.endSession());

    io.emit('data-update', {
      type: 'schedule',
      action: 'generate',
      count: upsertedCount
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[generate:${requestId}] ops=${ops.length} upserted=${upsertedCount} calls=${callCounters.generate}`
      );
    }
    res.json({ schedule: result.schedule, persistedCount: upsertedCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao gerar escalas' });
  }
});

// Schedule PDF — geração de PDF a partir de itens recebidos
app.post('/api/schedules/pdf', async (req, res) => {
  try {
    const { title = 'Escala', items = [] } = req.body; // items: [{ date, agentName, start, end, durationHours }]
    const pdfBuffer = await buildSchedulePDF({ title, items });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${title.replace(/\s+/g, '_')}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao gerar PDF' });
  }
});

// Debug endpoint — somente para diagnóstico em desenvolvimento
app.get('/api/debug/shifts', async (req, res) => {
  try {
    const shifts = await Shift.find().sort({ date: 1, start: 1 });
    const agents = await Agent.find();
    const agentMap = new Map(agents.map((a) => [String(a._id), a.name]));
    const enriched = shifts.map((s) => ({
      ...s.toObject(),
      agentName: agentMap.get(String(s.agentId))
    }));
    res.json({ count: shifts.length, shifts: enriched });
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao listar turnos debug' });
  }
});

// Limpeza manual de órfãos (apenas desenvolvimento)
app.post('/api/debug/cleanup-orphan-shifts', async (req, res) => {
  try {
    const agents = await Agent.find().select('_id');
    const validObjIds = agents.map((a) => a._id);
    const validStrIds = validObjIds.map((x) => String(x));
    const orphanDel = await Shift.deleteMany({
      $and: [
        { agentId: { $nin: validObjIds } },
        { agentId: { $nin: validStrIds } }
      ]
    });
    res.json({ removed: orphanDel.deletedCount });
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao limpar órfãos' });
  }
});

// Alias GET para limpeza via navegador (sem cliente REST)
app.get('/api/debug/cleanup-orphan-shifts', async (req, res) => {
  try {
    const agents = await Agent.find().select('_id');
    const validObjIds = agents.map((a) => a._id);
    const validStrIds = validObjIds.map((x) => String(x));
    const orphanDel = await Shift.deleteMany({
      $and: [
        { agentId: { $nin: validObjIds } },
        { agentId: { $nin: validStrIds } }
      ]
    });
    res.json({ removed: orphanDel.deletedCount });
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao limpar órfãos' });
  }
});

// Reports — consolidação de métricas e totais por período
app.get('/api/reports', async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;
    const base = req.user && req.user.role === 'admin' ? {} : { tenantId: req.user.sub };
    const shifts = await Shift.find({
      date: { $gte: startDate, $lte: endDate },
      ...base
    });
    const agents = await Agent.find(base);
    const report = computeReports({
      period,
      shifts,
      agents,
      startDate,
      endDate
    });
    res.json(report);
  } catch (_e) {
    res.status(500).json({ error: 'Falha ao gerar relatório' });
  }
});

// Socket.IO — notifica clientes sobre alterações (connect/status)

if (io && typeof io.on === 'function') {
  io.on('connection', (socket) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('socket connected', socket.id);
    }
    socket.emit('status', { ok: true, ts: Date.now() });
  });
}

// Replace app.listen with server.listen
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () =>
    console.log(`GuardScale rodando em http://localhost:${PORT}`)
  );
}

module.exports = app;
