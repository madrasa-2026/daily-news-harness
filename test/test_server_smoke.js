const { spawn } = require('child_process');
const http = require('http');

console.log('--- STARTING SERVER SMOKE TEST ---');

const env = { ...process.env, PORT: '10001', NODE_ENV: 'test' };
const server = spawn('node', ['index.js'], { env, cwd: process.cwd() });

let serverOutput = '';
server.stdout.on('data', data => {
  serverOutput += data.toString();
  // console.log(data.toString());
});
server.stderr.on('data', data => {
  serverOutput += data.toString();
  // console.error(data.toString());
});

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 10001,
      path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

setTimeout(async () => {
  try {
    // 1. Test /health
    const health = await request('/health');
    console.log('1. /health Status:', health.status);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Test /admin/login page
    const login = await request('/admin/login');
    console.log('2. /admin/login Status:', login.status, 'Has Bengali:', login.body.includes('জনবার্তা অ্যাডমিন লগইন'));
    if (login.status !== 200 || !login.body.includes('জনবার্তা অ্যাডমিন লগইন')) throw new Error('Admin login page failed');

    // 3. Test unauthenticated /admin redirect
    const adminUnauth = await request('/admin');
    console.log('3. Unauthenticated /admin Status (expected 302):', adminUnauth.status);
    if (adminUnauth.status !== 302) throw new Error('Admin unauth should redirect 302');

    // 4. Test authenticated /admin with cookie
    const token = 'auth_' + Buffer.from('jonobarta_admin_2026').toString('base64');
    const adminAuth = await request('/admin', {
      headers: { Cookie: `jonobarta_admin_session=${token}` }
    });
    console.log('4. Authenticated /admin Status:', adminAuth.status, 'Has Cockpit UI:', adminAuth.body.includes('ADMIN COCKPIT'));
    if (adminAuth.status !== 200 || !adminAuth.body.includes('ADMIN COCKPIT')) throw new Error('Admin cockpit view failed');

    // 5. Test template switch API
    const tplSwitch = await request('/admin/api/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `jonobarta_admin_session=${token}`
      },
      body: JSON.stringify({ templateId: 'minimal' })
    });
    console.log('5. /admin/api/template switch status:', tplSwitch.status, 'Body:', tplSwitch.body);
    if (tplSwitch.status !== 200 || !tplSwitch.body.includes('minimal')) throw new Error('Template switcher API failed');

    console.log('SERVER SMOKE TEST COMPLETED SUCCESSFULLY!');
    server.kill();
    process.exit(0);
  } catch (err) {
    console.error('Smoke test error:', err.message);
    console.error('Server output log tail:\n', serverOutput.slice(-500));
    server.kill();
    process.exit(1);
  }
}, 3000);
