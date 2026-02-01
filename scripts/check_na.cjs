const PB_URL = 'https://pocketbase.circumambule.synology.me';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';

const TARGETS = [
    { collection: 'config_filters', field: 'Type', value: 'N/A' },
    { collection: 'jobs', field: 'ID_Annonce', value: 'N/A' },
    { collection: 'ref_insee', field: 'Code_INSEE', value: 'N/A' },
    { collection: 'ref_prenoms', field: 'Prenom', value: 'N/A' },
    { collection: 'ref_rome', field: 'Code_Rome', value: 'N/A' }
];

async function run() {
    try {
        const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        const { token } = await authRes.json();

        for (const target of TARGETS) {
            const filter = `${target.field} = "${target.value}"`;
            const listRes = await fetch(`${PB_URL}/api/collections/${target.collection}/records?filter=${encodeURIComponent(filter)}&perPage=1`, {
                headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
            });
            const data = await listRes.json();
            console.log(`${target.collection} (${target.field} == "${target.value}"): ${data.totalItems} records found.`);

            // Si 0, on teste sans les guillemets ou en minuscule pour voir
            if (data.totalItems === 0) {
                const filterLower = `${target.field} ~ "n/a"`;
                const listRes2 = await fetch(`${PB_URL}/api/collections/${target.collection}/records?filter=${encodeURIComponent(filterLower)}&perPage=1`, {
                    headers: { 'Authorization': token, 'User-Agent': USER_AGENT }
                });
                const data2 = await listRes2.json();
                console.log(`   (Test flou ~ "n/a"): ${data2.totalItems} records found.`);
            }
        }
    } catch (err) { console.error(err); }
}
run();
