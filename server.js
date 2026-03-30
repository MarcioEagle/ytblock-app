require('dotenv').config();
const express     = require('express');
const cookieSession = require('cookie-session');
const path        = require('path');
const fetch       = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('./mailer');

const app = express();

const supabase      = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
  name:    'ytblock_session',
  keys:    [process.env.SESSION_SECRET || 'ytblock_secret_key'],
  maxAge:  30 * 24 * 60 * 60 * 1000,
  secure:  false,
  sameSite: 'lax'
}));

// ── Guards ────────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Não autorizado.' });
  res.redirect('/');
}
function requireAdmin(req, res, next) {
  if (req.session?.admin) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Acesso negado.' });
  res.redirect('/admin/login');
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINAS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/', (req, res) => {
  if (req.session?.user) return res.redirect('/dashboard');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/dashboard',     requireAuth,  (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/reset-password',              (req, res) => res.sendFile(path.join(__dirname, 'public', 'reset.html')));
app.get('/admin/login',                 (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/admin',         requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ══════════════════════════════════════════════════════════════════════════════
// API USUÁRIO
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: 'Email ou senha incorretos.' });

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', data.user.id).single();
    if (!profile) return res.status(403).json({ error: 'Perfil não encontrado.' });
    if (profile.status !== 'active') return res.status(403).json({ error: 'Assinatura inativa. Renove em ytblock.space' });

    req.session.user = {
      id: data.user.id, email: data.user.email,
      name: profile.name || data.user.email.split('@')[0],
      plan: profile.plan || 'pro', ads_blocked: profile.ads_blocked || 0
    };
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro interno.' }); }
});

app.post('/api/logout', (req, res) => { req.session = null; res.json({ ok: true }); });
app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.session.user }));

app.post('/api/ads-count', requireAuth, async (req, res) => {
  await supabaseAdmin.from('profiles').update({ ads_blocked: req.body.count }).eq('id', req.session.user.id).catch(()=>{});
  req.session.user = { ...req.session.user, ads_blocked: req.body.count };
  res.json({ ok: true });
});

// ── Vídeos ────────────────────────────────────────────────────────────────────
const INVIDIOUS = ['https://inv.nadeko.net','https://invidious.lunar.icu','https://yt.artemislena.eu'];

app.get('/api/videos/trending', requireAuth, async (req, res) => {
  for (const b of INVIDIOUS) {
    try {
      const r = await fetch(`${b}/api/v1/trending?region=BR`, { timeout: 6000 });
      if (!r.ok) continue;
      return res.json((await r.json()).slice(0, 20));
    } catch {}
  }
  res.status(503).json({ error: 'Indisponível.' });
});

app.get('/api/videos/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Query obrigatória.' });
  for (const b of INVIDIOUS) {
    try {
      const r = await fetch(`${b}/api/v1/search?q=${encodeURIComponent(q)}&region=BR`, { timeout: 7000 });
      if (!r.ok) continue;
      return res.json((await r.json()).filter(v => v.type === 'video').slice(0, 16));
    } catch {}
  }
  res.status(503).json({ error: 'Indisponível.' });
});

// ── Webhook Kiwify ─────────────────────────────────────────────────────────
app.post('/api/webhook/kiwify', async (req, res) => {
  const token = req.query.token || req.headers['x-kiwify-token'] || '';
  if (token !== process.env.KIWIFY_TOKEN) return res.status(401).json({ error: 'Token inválido.' });
  const payload = req.body;
  const email  = payload?.Customer?.email || payload?.customer?.email || '';
  const name   = payload?.Customer?.full_name || payload?.customer?.name || '';
  const status = (payload?.order_status || payload?.status || '').toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email não encontrado.' });
  try {
    const ATIVO   = ['paid','approved','complete','active','subscription_renewed'];
    const INATIVO = ['refunded','cancelled','chargeback','subscription_canceled'];
    if (ATIVO.includes(status)) {
      const { data: ex } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
      if (ex) {
        await supabaseAdmin.from('profiles').update({ status: 'active', plan: 'pro' }).eq('id', ex.id);
      } else {
        const pwd = Math.random().toString(36).slice(-8) + 'A1!xZ';
        const { data: nu } = await supabaseAdmin.auth.admin.createUser({ email, password: pwd, email_confirm: true });
        if (nu?.user?.id) {
          await supabaseAdmin.from('profiles').insert({ id: nu.user.id, email, name: name || email.split('@')[0], plan: 'pro', status: 'active', ads_blocked: 0, created_at: new Date().toISOString() });
          await sendWelcomeEmail(email, name || email.split('@')[0]);
        }
      }
    }
    if (INATIVO.includes(status)) {
      await supabaseAdmin.from('profiles').update({ status: 'inactive' }).eq('email', email);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erro interno.' }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// API ADMIN
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASS) {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Credenciais inválidas.' });
});

app.post('/api/admin/logout', (req, res) => { req.session.admin = false; res.json({ ok: true }); });

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const { count: total }    = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
    const { count: active }   = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: inactive } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'inactive');
    const { data: today }     = await supabaseAdmin.from('profiles').select('id').gte('created_at', new Date(Date.now() - 86400000).toISOString());
    res.json({ total: total || 0, active: active || 0, inactive: inactive || 0, today: today?.length || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { search, status, page = 1 } = req.query;
    const limit = 20, offset = (parseInt(page) - 1) * limit;
    let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ users: data, total: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/users/create', requireAdmin, async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });
  try {
    const pwd = Math.random().toString(36).slice(-8) + 'A1!xZ';
    const { data: nu, error } = await supabaseAdmin.auth.admin.createUser({ email, password: pwd, email_confirm: true });
    if (error) return res.status(400).json({ error: error.message });
    await supabaseAdmin.from('profiles').insert({ id: nu.user.id, email, name: name || email.split('@')[0], plan: 'pro', status: 'active', ads_blocked: 0, created_at: new Date().toISOString() });
    await sendWelcomeEmail(email, name || email.split('@')[0]);
    res.json({ ok: true, message: 'Usuário criado e email enviado!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/users/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive', 'blocked'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  try {
    await supabaseAdmin.from('profiles').update({ status }).eq('id', req.params.id);
    if (status === 'blocked') await supabaseAdmin.auth.admin.updateUserById(req.params.id, { ban_duration: '87600h' });
    if (status === 'active')  await supabaseAdmin.auth.admin.updateUserById(req.params.id, { ban_duration: 'none' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin.from('profiles').select('email,name').eq('id', req.params.id).single();
    if (!profile) return res.status(404).json({ error: 'Usuário não encontrado.' });
    await supabase.auth.resetPasswordForEmail(profile.email, { redirectTo: 'https://app.ytblock.space/reset-password' });
    await sendPasswordResetEmail(profile.email, profile.name || profile.email.split('@')[0]);
    res.json({ ok: true, message: 'Email de redefinição enviado!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    await supabaseAdmin.from('profiles').delete().eq('id', req.params.id);
    await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/users/:id/resend-email', requireAdmin, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin.from('profiles').select('email,name').eq('id', req.params.id).single();
    if (!profile) return res.status(404).json({ error: 'Usuário não encontrado.' });
    await sendWelcomeEmail(profile.email, profile.name || '');
    res.json({ ok: true, message: 'Email reenviado!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Start local (Vercel ignora o listen) ─────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(process.env.PORT || 3000, () => console.log(`✅ YTBlock na porta ${process.env.PORT || 3000}`));
}

module.exports = app;
