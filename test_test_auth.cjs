const https = require('https');

const host = 'pocketbase.circumambule.synology.me';
const email = 'test@test.com';
const pass = 'testtesttest';

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
    console.log(`Checking ${email} on ${host}...`);
    const r = await post('/api/admins/auth-with-password', { identity: email, password: pass });
    console.log(`Status: ${r.status}`);
    if (r.status === 200) {
        console.log("✅ SUCCESS! Working credentials found.");
    } else {
        console.log(`❌ FAILED: ${r.body}`);
    }
}

run();
