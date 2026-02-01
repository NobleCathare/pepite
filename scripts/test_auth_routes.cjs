async function testAuth(route) {
    const url = `https://pocketbase.circumambule.synology.me/api/${route}/auth-with-password`;
    console.log("Testing:", url);
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'test@test.com', password: 'testtesttest' })
    });
    console.log(`Route ${route}: Status ${res.status}`);
    const data = await res.json();
    if (res.ok) console.log("SUCCESS!");
    else console.log("JSON:", data);
}

async function run() {
    await testAuth('admins');
    await testAuth('collections/_superusers');
}
run();
