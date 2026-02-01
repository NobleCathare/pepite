const https = require('https');

const APP_ID = 'CSEKHVMS53';
const API_KEY = '4bd8f6215d0cc52b26430765769e65a0';
const INDEX_NAME = 'wttj_jobs_production_fr';
const QUERY = 'boulanger';

const url = `https://${APP_ID}-dsn.algolia.net/1/indexes/${INDEX_NAME}/query`;

const data = JSON.stringify({
    query: QUERY,
    hitsPerPage: 5 // Just check if we get existing results
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
                console.log(`Status: ${res.statusCode}`);
                console.log(`Found: ${json.nbHits} results for "${QUERY}"`);
                if (json.hits && json.hits.length > 0) {
                    console.log('--- Top 3 Hits ---');
                    json.hits.slice(0, 3).forEach(hit => {
                        // Check nested properties often found in WTTJ Algolia records
                        const title = hit.name || hit.title || (hit.title_fr) || 'No title';
                        const company = hit.n_organization ? hit.n_organization.name : (hit.company ? hit.company.name : 'No Company');
                        console.log(`- ${title} @ ${company}`);
                    });
                }
            } catch (e) {
                console.error("Error parsing JSON:", e.message);
                console.log("Body:", body);
            }
        } else {
            console.error(`Error: ${res.statusCode} ${res.statusText}`);
            console.log("Body:", body);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
