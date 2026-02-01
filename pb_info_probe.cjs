const https = require('https');

const host = 'pocketbase.circumambule.synology.me';

function get(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'GET',
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                resolve({ status: res.statusCode, body });
            });
        });

        req.on('error', (e) => resolve({ status: 0, body: e.message }));
        req.end();
    });
}

async function run() {
    console.log(`Checking Collections info...`);

    // 1. Health (detailed)
    const h = await get('/api/health');
    console.log(`Health: ${h.status} - ${h.body}`);

    // 2. List Collections (if public)
    const c = await get('/api/collections?perPage=20');
    console.log(`Collections: ${c.status}`);
    if (c.status === 200) {
        try {
            const data = JSON.parse(c.body);
            console.log("Found collections:", data.items.map(i => i.name).join(', '));
        } catch (e) {
            console.log("Error parsing collections body.");
        }
    } else {
        console.log(`Collections fail: ${c.body}`);
    }

    // 3. Try to hit common public endpoints to guess version
    const p1 = await get('/api/collections/_superusers/records');
    console.log(`Check /api/collections/_superusers: ${p1.status}`);

    const p2 = await get('/api/admins');
    console.log(`Check /api/admins: ${p2.status}`);
}

run();
