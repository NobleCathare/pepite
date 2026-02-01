import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pocketbase.circumambule.synology.me/');

async function addTestConfig() {
    console.log('➕ Ajout de la configuration de test "Boulanger"...\n');

    try {
        const users = await pb.collection('users').getFullList();
        const user = users[0];

        // Vérifier si existe déjà
        const existing = await pb.collection('config_search').getFullList({
            filter: `ownerId = '${user.id}' && Mot_Cle = 'Boulanger - Test'`
        });

        if (existing.length > 0) {
            console.log('✅ Configuration de test déjà existante.');
            // S'assurer qu'elle est active
            if (existing[0].Actif !== 'true' && existing[0].Actif !== true) {
                await pb.collection('config_search').update(existing[0].id, { Actif: true });
                console.log('   (Réactivée)');
            }
            return;
        }

        // Créer la config
        await pb.collection('config_search').create({
            ownerId: user.id,
            Mot_Cle: 'Boulanger - Test', // Suffixe pour la reconnaître facilement
            Codes_ROME: 'D1102', // Boulangerie
            Type_Lieu: 'departement',
            Code_Lieu: '75', // Paris
            Actif: true,
            Km: 10
        });

        console.log('✅ Configuration de test créée avec succès !');

    } catch (e) {
        console.error('❌ Erreur:', e.message);
    }
}

addTestConfig();
