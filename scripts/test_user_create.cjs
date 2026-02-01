const PB_URL = 'https://pocketbase.circumambule.synology.me';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ADMIN_EMAIL = 'test@test.com';
const ADMIN_PASS = 'testtesttest';
const TARGET_UID = 'oyIrfuuqjuXzcZqzG4maFEjaYMv1';

async function test() {
    const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await authRes.json();

    console.log("Creating user with ID:", TARGET_UID);
    const res = await fetch(`${PB_URL}/api/collections/users/records`, {
        method: 'POST',
        headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
        body: JSON.stringify({
            id: TARGET_UID,
            username: 'user_pepite',
            email: 'user@pepite.me',
            password: 'Password123!',
            passwordConfirm: 'Password123!',
            name: 'Utilisateur Pépite'
        })
    });

    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
}
test();
