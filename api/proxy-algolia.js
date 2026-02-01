
export default async function handler(request, response) {
    // CORS configuration
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Algolia-Application-Id, X-Algolia-API-Key'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    const ALGOLIA_URL = 'https://CSEKHVMS53-dsn.algolia.net/1/indexes/wttj_jobs_production_fr/query';

    try {
        const { body, method } = request;

        const upstreamResponse = await fetch(ALGOLIA_URL, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Algolia-Application-Id': 'CSEKHVMS53',
                'X-Algolia-API-Key': '4bd8f6215d0cc52b26430765769e65a0',
                'Referer': 'https://www.welcometothejungle.com/', // SPOOFING REFERER
                'Origin': 'https://www.welcometothejungle.com'
            },
            body: JSON.stringify(body)
        });

        const data = await upstreamResponse.json();
        response.status(upstreamResponse.status).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        response.status(500).json({ error: 'Failed to fetch from Algolia' });
    }
}
