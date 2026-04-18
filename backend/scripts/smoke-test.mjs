const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const USERNAME = process.env.SMOKE_USERNAME || 'admin';
const PASSWORD = process.env.SMOKE_PASSWORD || 'admin123';
const ACTOR = process.env.SMOKE_ACTOR || 'smoke-test';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = { raw: text };
  }
  return { ok: response.ok, status: response.status, json, url };
}

function assertStep(name, condition, payload) {
  if (!condition) {
    const error = new Error(`Smoke test gagal pada langkah: ${name}`);
    error.payload = payload;
    throw error;
  }
  console.log(`✔ ${name}`);
}

async function main() {
  console.log(`Menjalankan smoke test ke ${BASE_URL}`);

  const health = await request('/api/health');
  assertStep('health endpoint aktif', health.ok && health.json?.ok, health);

  const runtime = await request('/api/system/runtime-status');
  assertStep('runtime-status endpoint aktif', runtime.ok && runtime.json?.ok, runtime);

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  assertStep('login berhasil', login.ok && login.json?.data?.token, login);
  const token = login.json.data.token;

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Actor-Name': ACTOR,
  };

  const me = await request('/api/auth/me', { headers: authHeaders });
  assertStep('auth/me berhasil', me.ok && me.json?.data?.user?.username, me);

  const permissions = await request('/api/auth/permissions', { headers: authHeaders });
  assertStep('auth/permissions berhasil', permissions.ok && permissions.json?.data?.modules, permissions);

  const orders = await request('/api/orders?page=1&pageSize=5', { headers: authHeaders });
  assertStep('orders list berhasil', orders.ok && Array.isArray(orders.json?.data?.rows), orders);

  const funnels = await request('/api/funnels?page=1&pageSize=5', { headers: authHeaders });
  assertStep('funnels list berhasil', funnels.ok && Array.isArray(funnels.json?.data?.rows), funnels);

  const masters = await request('/api/masters/bootstrap', { headers: authHeaders });
  assertStep('masters bootstrap berhasil', masters.ok && masters.json?.data, masters);

  const backup = await request('/api/system/backup', { headers: authHeaders });
  assertStep('system backup berhasil', backup.ok && backup.json?.data?.bundle, backup);

  const logout = await request('/api/auth/logout', { method: 'POST', headers: authHeaders });
  assertStep('logout berhasil', logout.ok && logout.json?.data?.logged_out, logout);

  console.log('\nSmoke test selesai tanpa error.');
}

main().catch((error) => {
  console.error('\n✖ Smoke test gagal.');
  console.error(error.message);
  if (error.payload) {
    console.error(JSON.stringify(error.payload, null, 2));
  }
  process.exit(1);
});
