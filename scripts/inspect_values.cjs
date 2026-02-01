const PB_URL = 'https://pocketbase.circumambule.synology.me';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';

async function inspect(collection, field) {
    try {
        const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        const { token } = await authRes.json();

        const listRes = await fetch(`${PB_URL}/api/collections/${collection}/records?perPage=200`, {
            headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
        });
        const data = await listRes.json();
        const values = [...new Set(data.items.map(i => i[field]))];
        console.log(`Unique values for ${collection}.${field} (first 200):`, values);
    } catch (err) { console.error(err); }
}

async function run() {
    await inspect('config_filters', 'Type');
    await inspect('jobs', 'ID_Annonce');
}
run();
