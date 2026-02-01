const https = require('https');

const host = 'pocketbase.circumambule.synology.me';
const email = 'n8n@circumambule.test';
const pass = '15Milliards!';

function post(path, data) {
    return new Promise((resolve) => {
        const payload = JSON.stringify(data);
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                resolve({ status: res.statusCode, body });
            });
        });

        req.on('error', (e) => resolve({ status: 0, body: e.message }));
        req.write(payload);
        req.end();
    });
}

async function run() {
    console.log(`Checking ${host}...`);

    // 1. Legacy Admins
    const r1 = await post('/api/admins/auth-with-password', { identity: email, password: pass });
    console.log(`Legacy Admin (/api/admins/auth-with-password): Status ${r1.status}`);

    // 2. Superusers
    const r2 = await post('/api/collections/_superusers/auth-with-password', { identity: email, password: pass });
    console.log(`Superuser (/api/collections/_superusers/auth-with-password): Status ${r2.status}`);

    // Some versions use 'email' instead of 'identity' for admins
    const r1b = await post('/api/admins/auth-with-password', { email: email, password: pass });
    console.log(`Legacy Admin (email key): Status ${r1b.status}`);

    // Users
    const r3 = await post('/api/collections/users/auth-with-password', { identity: email, password: pass });
    console.log(`Regular User (/api/collections/users/auth-with-password): Status ${r3.status}`);

    console.log("\n--- DETAILED BODIES (if not 200/404) ---");
    if (r1.status !== 404 && r1.status !== 200) console.log(`R1: ${r1.body}`);
    if (r2.status !== 404 && r2.status !== 200) console.log(`R2: ${r2.body}`);
    if (r3.status !== 404 && r3.status !== 200) console.log(`R3: ${r3.body}`);
}

run();
