import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pocketbase.circumambule.synology.me/');

async function inspectConfigs() {
    console.log('🔍 INSPECTION CONFIGURATIONS RECHERCHE\n');

    const users = await pb.collection('users').getFullList();
    const user = users[0];

    console.log(`👤 Utilisateur: ${user.prenom} ${user.nom}`);

    const configs = await pb.collection('config_search').getFullList({
        filter: `ownerId = '${user.id}'`,
        sort: '-created'
    });

    console.log(`📋 Total Configs: ${configs.length}`);
    const activeConfigs = configs.filter(c => c.Actif === true || c.Actif === 'true');
    console.log(`✅ Actives: ${activeConfigs.length}\n`);

    console.log('--- DÉTAILS DES CONFIGURATIONS ACTIVES ---');
    activeConfigs.forEach((c, i) => {
        console.log(`\n#${i + 1} MOT-CLÉ: "${c.Mot_Cle}"`);
        if (c.Codes_ROME) console.log(`   - ROME: ${c.Codes_ROME}`);
        if (c.Type_Lieu) console.log(`   - Lieu [${c.Type_Lieu}]: ${c.Code_Lieu}`);
        if (c.Km) console.log(`   - Rayon: ${c.Km} km`);
        if (c.Contrat) console.log(`   - Contrat: ${c.Contrat}`);
        console.log(`   - Actif: ${c.Actif} (${typeof c.Actif})`);
    });
}

inspectConfigs();
