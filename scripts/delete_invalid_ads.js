import PocketBase from 'pocketbase';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const PB_URL = 'https://pocketbase.circumambule.synology.me/';
const pb = new PocketBase(PB_URL);

async function main() {
    const rl = readline.createInterface({ input, output });

    console.log('--- Nettoyage des annonces "Non validée" ---');
    console.log(`Cible : ${PB_URL}`);
    console.log('Veuillez vous authentifier pour effectuer cette action destructive.');

    try {
        console.log('--- MODE ADMINISTRATEUR ---');
        console.log('NOTE : Connectez-vous avec vos identifiants ADMIN PocketBase');
        console.log('       (Ceux que vous utilisez pour accéder à http://.../_/)');
        console.log('       Cela permet de contourner le login Google.');

        const email = await rl.question('Email Admin : ');
        const password = await rl.question('Mot de passe Admin : ');

        console.log('\nConnexion Admin en cours...');
        try {
            // Tentative de connexion Admin
            await pb.admins.authWithPassword(email, password);
            console.log(`Connecté avec succès en tant qu'Administrateur.`);
        } catch (adminErr) {
            console.log('\nÉchec connexion Admin (' + adminErr.message + ').');
            console.log('Tentative connexion Utilisateur classique (au cas où)...');
            // Fallback user au cas où ils auraient un mot de passe user
            await pb.collection('users').authWithPassword(email, password);
            console.log(`Connecté en tant qu'Utilisateur : ${pb.authStore.model.email}`);
        }

        // Recherche des annonces à supprimer
        console.log('\nRecherche des annonces "Non validée"...');
        const jobs = await pb.collection('jobs').getFullList({
            filter: 'Statut = "Non validée"',
        });

        const count = jobs.length;
        if (count === 0) {
            console.log('Aucune annonce "Non validée" trouvée. Tout est propre !');
            rl.close();
            return;
        }

        console.log(`${count} annonce(s) trouvée(s).`);
        const confirm = await rl.question(`Confirmez-vous la suppression DÉFINITIVE de ces ${count} annonces ? (oui/non) : `);

        if (confirm.toLowerCase().trim() !== 'oui') {
            console.log('Opération annulée.');
            rl.close();
            return;
        }

        console.log('Suppression en cours...');
        let deleted = 0;
        for (const job of jobs) {
            try {
                await pb.collection('jobs').delete(job.id);
                deleted++;
                process.stdout.write(`\rSuppression : ${deleted}/${count}`);
            } catch (err) {
                console.error(`\nErreur sur ${job.id}:`, err.message);
            }
        }

        console.log(`\n\nOpération terminée. ${deleted} annonces supprimées.`);

    } catch (err) {
        console.error('\nErreur critique :', err.message);
        console.error('Assurez-vous d\'utiliser le bon email/mot de passe Admin.');
    } finally {
        rl.close();
    }
}

main();
