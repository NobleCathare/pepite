async function test() {
    const url = 'https://pocketbase.circumambule.synology.me/api/health';
    console.log("Fetching:", url);
    try {
        const res = await fetch(url);
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Data:", data);
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}
test();
