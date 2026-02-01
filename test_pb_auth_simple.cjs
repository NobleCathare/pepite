const PocketBase = require('pocketbase/cjs');

async function testAuth() {
    const pass = process.env.VITE_POCKETBASE_ADMIN_PASSWORD || '15Milliards!';
    console.log(`Testing with password: ${pass[0]}...${pass[pass.length - 1]} (len: ${pass.length})`);

    const urls = [
        'https://pocketbase.circumambule.synology.me/',
        'https://pocketbase.circumambule.synology.me'
    ];

    const emails = [
        'franckferrenbach@gmail.com',
        'n8n@circumambule.test'
    ];

    for (const url of urls) {
        console.log(`\n--- URL: ${url} ---`);
        const pb = new PocketBase(url);
        for (const email of emails) {
            // Admin
            try {
                await pb.admins.authWithPassword(email, pass);
                console.log(`✅ SUCCESS Admin: ${email}`);
                return;
            } catch (e) {
                console.log(`FAIL Admin ${email}: ${e.status}`);
            }
            // Super
            try {
                await pb.collection('_superusers').authWithPassword(email, pass);
                console.log(`✅ SUCCESS Super: ${email}`);
                return;
            } catch (e) {
                console.log(`FAIL Super ${email}: ${e.status}`);
            }
            // User
            try {
                await pb.collection('users').authWithPassword(email, pass);
                console.log(`✅ SUCCESS User: ${email}`);
                return;
            } catch (e) {
                console.log(`FAIL User ${email}: ${e.status}`);
            }
        }
    }
}

testAuth();
