import { pb } from './src/services/pb.js';

async function checkFT() {
    // Authenticate as a user or list all jobs if possible (Guest mode used in app? No, app uses userId)
    // We need a userId. Let's try to find one from a list of users or just list ALL jobs and filter.
    // pb.authStore.clear(); // Guest mode ? 

    try {
        console.log("Fetching latest 20 jobs...");
        const records = await pb.collection('jobs').getList(1, 20, {
            sort: '-created',
        });

        console.log(`Found ${records.totalItems} jobs total.`);

        console.log("--- Latest 5 Jobs ---");
        records.items.slice(0, 5).forEach(r => {
            console.log(`[${r.Source}] ID: ${r.id} | Status: ${r.Statut} | Title: ${r.Titre_poste} | Owner: ${r.ownerId}`);
        });

        console.log("\n--- Checking for FT Source ---");
        const ftJobs = await pb.collection('jobs').getList(1, 5, {
            filter: 'Source = "FT"',
            sort: '-created'
        });

        if (ftJobs.items.length === 0) {
            console.log("WARNING: No jobs found with Source='FT'. Check DB content.");
        } else {
            ftJobs.items.forEach(r => {
                console.log(`[FT FOUND] ID: ${r.id} | Status: ${r.Statut} | Created: ${r.created} | Owner: ${r.ownerId}`);
            });
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

checkFT();
