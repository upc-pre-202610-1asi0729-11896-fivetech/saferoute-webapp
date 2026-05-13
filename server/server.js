const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// ── CORS ──
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

server.use(middlewares);
server.use(jsonServer.bodyParser);

// ── URL rewriter: maps /api/v1/* → /* so Azure calls work the same as local ──
const routes = require('./routes.json');
server.use(jsonServer.rewriter(routes));

// ── Custom auth routes (work both locally and on Azure after rewrite) ──
server.post('/sign-in', (req, res) => {
  const { email, password } = req.body || {};
  const users = router.db.get('users').value() || [];
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'invalid-credentials' });
  return res.json({
    token: `dev-token-${user.id}-${Date.now()}`,
    id: user.id,
    role: user.role,
    organizationId: user.organizationId,
  });
});

server.post('/sign-up', (req, res) => {
  const body = req.body || {};
  const users = router.db.get('users');
  if (users.value().some((u) => u.email === body.email)) {
    return res.status(409).json({ message: 'email-already-registered' });
  }
  const nextId = users.value().reduce((m, u) => Math.max(m, Number(u.id) || 0), 0) + 1;
  const user = { id: nextId, ...body };
  users.push(user).write();
  return res.status(201).json(user);
});

server.use(router);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\nSafeRoute json-server running on http://localhost:${PORT}`);
  console.log(`Resources: organizations, users, routes, trips, vehicles, parents, children, plans, subscriptions, notifications, incidents`);
  console.log(`Auth:      POST /sign-in  (also /api/v1/sign-in)`);
  console.log(`           POST /sign-up  (also /api/v1/sign-up)\n`);
});
