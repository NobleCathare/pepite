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
    console.log("Checking ref_insee count...");
    const r = await get('/api/collections/ref_insee/records?perPage=1&fields=id');
    console.log(`Status: ${r.status}`);
    if (r.status === 200) {
        const data = JSON.parse(r.body);
        console.log(`Total items in ref_insee: ${data.totalItems}`);
    } else {
        console.log(`Error: ${r.body}`);
    }
}

run();
