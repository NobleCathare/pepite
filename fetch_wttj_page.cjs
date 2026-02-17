const https = require('https');

// 1. Search Algolia to get a valid URL
const APP_ID = 'CSEKHVMS53';
const API_KEY = '4bd8f6215d0cc52b26430765769e65a0';
const INDEX_NAME = 'wttj_jobs_production_fr';
const QUERY = 'boulanger';

function searchAlgolia() {
    return new Promise((resolve, reject) => {
        const url = `https://${APP_ID}-dsn.algolia.net/1/indexes/${INDEX_NAME}/query`;
        const data = JSON.stringify({ query: QUERY, hitsPerPage: 1 });
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Algolia-Application-Id': APP_ID, 'X-Algolia-API-Key': API_KEY,
                'Content-Length': data.length
            }
        };
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.hits && json.hits.length > 0) {
                        resolve(json.hits[0]);
                    } else reject("No hits");
                } catch (e) { reject(e); }
            });
        });
        req.write(data);
        req.end();
    });
}

function fetchPage(url) {
    console.log(`Fetching ${url}...`);
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(body));
        });
        req.on('error', reject);
    });
}

async function run() {
    try {
        const hit = await searchAlgolia();
        const orgSlug = hit.organization?.slug || hit.company?.slug || 'unknown';
        const jobSlug = hit.slug || 'unknown';

        if (orgSlug === 'unknown' || jobSlug === 'unknown') {
            console.error("Could not build URL from hit:", hit);
            return;
        }

        const url = `https://www.welcometothejungle.com/fr/companies/${orgSlug}/jobs/${jobSlug}`;
        const html = await fetchPage(url);

        console.log("HTML Length:", html.length);

        // Try to find description Content
        // Look for sections or standard WTTJ classes
        const matches = html.match(/<div[^>]*id="description"[^>]*>([\s\S]*?)<\/div>/i); // Naive
        if (matches) {
            console.log("Found #description div!");
            console.log(matches[1].substring(0, 200));
        } else {
            console.log("No #description div found.");
            // Look for generic content indicators
            const contentIndicator = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
            if (contentIndicator) {
                console.log("Found <main> content overlap...");
            }

            // Look for specific class 
            // wttj uses styled components, classes are randomized like 'sc-...'
            // But usually they put structured data in __NEXT_DATA__
            const nextData = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (nextData) {
                console.log("Found __NEXT_DATA__!");
                const json = JSON.parse(nextData[1]);
                console.log("Next Data Keys:", Object.keys(json.props.pageProps));
                // Try to find job in props
                const job = json.props.pageProps.job;
                if (job) {
                    console.log("Found job in __NEXT_DATA__!");
                    console.log("Content present?", !!job.content);
                    console.log("Description present?", !!job.description);
                }
            }
        }

    } catch (e) {
        console.error(e);
    }
}

run();
