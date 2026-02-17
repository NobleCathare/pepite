const https = require('https');

const APP_ID = 'CSEKHVMS53';
const API_KEY = '4bd8f6215d0cc52b26430765769e65a0';
const INDEX_NAME = 'wttj_jobs_production_fr';
const QUERY = 'boulanger';

const url = `https://${APP_ID}-dsn.algolia.net/1/indexes/${INDEX_NAME}/query`;

const data = JSON.stringify({
    query: QUERY,
    hitsPerPage: 1
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': APP_ID,
        'X-Algolia-API-Key': API_KEY,
        'Content-Length': data.length,
        'Origin': 'https://www.welcometothejungle.com',
        'Referer': 'https://www.welcometothejungle.com/'
    }
};

const req = https.request(url, options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                const json = JSON.parse(body);
                if (json.hits && json.hits.length > 0) {
                    console.log(JSON.stringify(json.hits[0], null, 2));
                }
            } catch (e) {
                console.error("Error parsing JSON:", e.message);
            }
        } else {
            console.error(`Error: ${res.statusCode}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
