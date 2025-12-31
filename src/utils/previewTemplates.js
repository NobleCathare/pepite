
// ===================================================================
// HTML GENERATION TEMPLATES
// ===================================================================

// Placeholder for signature, to be passed from component or context if needed
// Or we can fetch it if strictly required here, but for now we assume it's passed or handled via CSS
const SIGNATURE_PLACEHOLDER = "DATA_SIGNATURE_HERE";

const generateCVHTML = (data) => {
    // Default config values
    const CONFIG = {
        prenom: "Franck",
        nom: "Ferrenbach",
        telephone: "+33 7 82 94 59 49",
        telephone_whatsapp: "33782945949",
        email: "franckferrenbach@gmail.com",
        adresse: "34360 Saint-Chinian",
        linkedin_url: "https://www.linkedin.com/in/franck-ferrenbach/",
        linkedin_display: "linkedin.com/in/franck-ferrenbach",
        audio_note: "Veuillez laisser un message audio au premier contact par téléphone, sms ou bien WhatsApp, pour vous identifier."
    };

    const cvData = data || {};
    const titre = cvData.titre || "Cadre Organisation & Développement";
    const profilProfessionnel = cvData.profil_professionnel || "Cadre expérimenté...";

    const competences = Array.isArray(cvData.competences) ? cvData.competences : ["Gestion de projet"];
    const outils = Array.isArray(cvData.outils) ? cvData.outils : ["Office 365"];

    // Determine languages
    const langues = Array.isArray(cvData.langues) ? cvData.langues : [
        { langue: "Français", niveau: "Natif" },
        { langue: "Anglais", niveau: "B1" }
    ];

    const experiences = Array.isArray(cvData.experiences) ? cvData.experiences : [];

    const formations = Array.isArray(cvData.formations) ? cvData.formations : [
        { diplome: "Diplôme d'Université de Gestion (DUG)", etablissement: "IAE Montpellier", annee: "2012" }
    ];

    // GENERATION DES FRAGMENTS HTML
    const competencesHtml = competences.map(c => `                    <li>${c}</li>`).join('\n');
    const outilsHtml = outils.map(o => `                    <li>${o}</li>`).join('\n');

    const languesHtml = langues.map(l => {
        const langName = typeof l === 'object' ? l.langue : l;
        const langLevel = typeof l === 'object' ? l.niveau : '';

        if (langLevel && langLevel.length <= 3) {
            return `                    <li>${langName} <b>${langLevel}</b></li>`;
        } else {
            return `                    <li>${langName} ${langLevel ? `(${langLevel})` : ''}</li>`;
        }
    }).join('\n');

    const experiencesHtml = experiences.map(exp => {
        const realisationsHtml = Array.isArray(exp.realisations)
            ? exp.realisations.map(r => `                        <li>${r}</li>`).join('\n')
            : '';

        return `
            <div class="experience-item">
                <div class="job-header">
                    <div>
                        <div class="job-title">${exp.titre || ''}</div>
                        <div class="job-company">${exp.entreprise || ''}</div>
                    </div>
                    <div class="job-date">${exp.date || ''}</div>
                </div>
                <div class="job-description">
                    <ul>
${realisationsHtml}
                    </ul>
                </div>
            </div>`;
    }).join('\n');

    const formationsHtml = formations.map(f => `
            <div class="education-item">
                <span class="year">${f.annee || ''}</span>
                <div class="degree">${f.diplome || ''}</div>
                <div class="school">${f.etablissement || ''}</div>
            </div>`).join('\n');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>CV - Franck Ferrenbach</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Roboto', sans-serif; -webkit-print-color-adjust: exact; box-sizing: border-box; background-color: #555; }
        .page { width: 210mm; min-height: 297mm; margin: 20px auto; background-color: white; display: flex; box-shadow: 0 0 10px rgba(0,0,0,0.5); position: relative; }
        @media print { body { background-color: white; margin: 0; } .page { margin: 0; box-shadow: none; width: 100%; height: 100%; } }
        .sidebar { width: 28%; background-color: #2c3e50; color: #ffffff; padding: 30px 15px 15px 15px; display: flex; flex-direction: column; }
        .content { width: 72%; padding: 30px 15px 5px 15px; background-color: #ffffff; color: #333; display: flex; flex-direction: column; }
        
        .profile-section h1 { font-size: 50px; text-transform: uppercase; margin: 0; line-height: 0.9; }
        .profile-section h2 { font-size: 31px; text-transform: uppercase; color: #bdc3c7; margin: 0 0 25px 0; }
        .contact-info p { font-size: 13px; margin: 3px 0 12px 0; }
        .contact-info a { color: #ffffff; text-decoration: none; border-bottom: 1px dotted #bdc3c7; }
        .contact-label { font-weight: bold; display: block; color: #95a5a6; font-size: 11px; text-transform: uppercase; margin-top: 8px; }
        .qr-container { margin: 15px 0; text-align: center; } .qr-code { width: 100px; height: 100px; }
        .sidebar-title { color: #ecf0f1; text-transform: uppercase; font-weight: 700; font-size: 14px; border-bottom: 1px solid #7f8c8d; padding-bottom: 4px; margin-bottom: 10px; }
        .skill-list, .lang-list { list-style: none; padding: 0; margin: 0; }
        .skill-list li, .lang-list li { margin-bottom: 5px; font-size: 13px; }
        .audio-note { font-size: 10px; font-style: italic; color: #95a5a6; border-top: 1px solid #7f8c8d; padding-top: 10px; margin-top: auto; }
        
        .main-job-title { font-size: 26px; text-transform: uppercase; font-weight: 700; color: #2c3e50; margin-bottom: 5px; }
        .cv-section-title { color: #2c3e50; font-size: 18px; text-transform: uppercase; font-weight: 700; border-bottom: 2px solid #2c3e50; margin: 10px 0; padding-bottom: 3px; }
        .summary-text { font-size: 13px; line-height: 1.2; text-align: justify; color: #444; margin-bottom: 5px; }
        
        .experience-item { margin-bottom: 20px; }
        .job-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
        .job-title { font-size: 16px; font-weight: 700; color: #2c3e50; }
        .job-company { font-size: 14px; font-weight: 500; color: #7f8c8d; }
        .job-date { font-size: 13px; color: #e74c3c; font-weight: 700; text-align: right; min-width: 100px; }
        .job-description { font-size: 13px; line-height: 1.4; color: #333; }
        .job-description ul { margin: 3px 0; padding-left: 18px; }

        .sidebar-section { padding-top: 20px; }
        .experience-item { margin-bottom: 10px; }
        .education-item { margin-bottom: 5px; }
        .degree { font-weight: 700; font-size: 14px; color: #2c3e50; margin-bottom: 2px; }
        .school { font-style: italic; font-size: 13px; }
        .year { font-size: 13px; color: #666; float: right; }
    </style>
</head>
<body>
    <div class="page">
        <div class="sidebar">
            <div class="profile-section">
                <h1>Franck</h1>
                <h2>Ferrenbach</h2>
                <div class="contact-info">
                    <span class="contact-label">Téléphone</span>
                    <p><a href="https://wa.me/33782945949" target="_blank">+33 7 82 94 59 49</a></p>
                    <span class="contact-label">Email</span>
                    <p><a href="mailto:franckferrenbach@gmail.com">franckferrenbach@gmail.com</a></p>
                    <span class="contact-label">Domicile</span>
                    <p>34360 Saint-Chinian</p>
                    <span class="contact-label">LinkedIn</span>
                    <p><a href="https://www.linkedin.com/in/franck-ferrenbach/" target="_blank">linkedin.com/in/franck-ferrenbach</a></p>
                    <div class="qr-container">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Fwww.linkedin.com%2Fin%2Ffranck-ferrenbach%2F&bgcolor=2C3E50&color=FFFFFF&margin=0" alt="QR Code LinkedIn" class="qr-code">
                    </div>
                </div>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-title">Compétences</div>
                <ul class="skill-list">              ${competencesHtml}</ul>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-title">Langues</div>
                <ul class="lang-list">                    ${languesHtml}</ul>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-title">Outils</div>
                <ul class="skill-list">     
                    ${outilsHtml}</ul>
            </div>
            <div class="audio-note">Veuillez laisser un message audio au premier contact par téléphone, sms ou bien WhatsApp, pour vous identifier.</div>
        </div>
        <div class="content">
            <div class="main-job-title">${titre}</div>
            <div class="cv-section-title">Profil Professionnel</div>
            <div class="summary-text">${profilProfessionnel}</div>
            <div class="cv-section-title">Expériences Professionnelles</div>
            ${experiencesHtml}
            <div class="cv-section-title">Formation</div>
            ${formationsHtml}
        </div>
    </div>
</body>
</html>`;
};

const generateLMHTML = (data, signatureImg) => {
    const rawInput = data || {};
    const corps = rawInput.corps || {};
    const destinataire = rawInput.destinataire || {};

    const dateJour = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Lettre de Motivation - Franck Ferrenbach</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
        body { margin: 0; padding: 0; font-family: 'Roboto', sans-serif; -webkit-print-color-adjust: exact; box-sizing: border-box; background-color: #555; }
        .page { width: 210mm; min-height: 297mm; margin: 20px auto; background-color: white; display: flex; box-shadow: 0 0 10px rgba(0,0,0,0.5); position: relative; }
        @media print { body { background-color: white; margin: 0; } .page { margin: 0; box-shadow: none; width: 100%; height: 100%; } }
        .sidebar { width: 28%; background-color: #2c3e50; color: #ffffff; padding: 30px 15px 15px 15px; display: flex; flex-direction: column; }
        .profile-section h1 { font-size: 50px; text-transform: uppercase; margin: 0; line-height: 0.9; }
        .profile-section h2 { font-size: 31px; text-transform: uppercase; color: #bdc3c7; margin: 0 0 25px 0; }
        .contact-info { margin-bottom: 25px; }
        .contact-info p { font-size: 13px; margin: 3px 0 12px 0; }
        .contact-info a { color: #ffffff; text-decoration: none; border-bottom: 1px dotted #bdc3c7; }
        .contact-info a:hover { color: #bdc3c7; }
        .contact-label { font-weight: bold; display: block; color: #95a5a6; font-size: 11px; text-transform: uppercase; margin-top: 8px; }
        .qr-container { margin: 15px 0; text-align: center; } .qr-code { width: 100px; height: 100px; }
        .audio-note { font-size: 10px; font-style: italic; color: #95a5a6; border-top: 1px solid #7f8c8d; padding-top: 10px; margin-top: auto; }
        .content { width: 72%; padding: 30px 15px 5px 15px; background-color: #ffffff; color: #333; display: flex; flex-direction: column; }
        .recipient-section { display: flex; flex-direction: column; align-items: flex-end; margin-bottom: 30px; font-size: 14px; line-height: 1.4; }
        .recipient-name { font-weight: 700; color: #2c3e50; font-size: 16px; }
        .date-location { margin-top: 15px; font-style: italic; color: #666; font-size: 13px; align-self: flex-end; margin-bottom: 30px; }
        .object-line { font-weight: 700; font-size: 15px; color: #2c3e50; margin-bottom: 25px; border-bottom: 2px solid #2c3e50; padding-bottom: 5px; display: inline-block; width: 100%; }
        .letter-body { font-size: 14px; line-height: 1.4; text-align: justify; color: #444; flex-grow: 1; }
        .letter-body p { margin-bottom: 15px; }
        .signature-block { margin-top: 10px; display: flex; flex-direction: column; align-items: flex-end; position: relative; height: 80px; }
        .signature-img { max-width: 180px; margin-top: -20px; z-index: 2; }
        .signature-name-typed { font-weight: 700; margin-top: 0px; z-index: 1; color: #2c3e50; }
    </style>
</head>
<body>
    <div class="page">
        <div class="sidebar">
            <div class="profile-section">
                <h1>Franck</h1>
                <h2>Ferrenbach</h2>
                <div class="contact-info">
                    <span class="contact-label">Téléphone</span>
                    <p><a href="https://wa.me/33782945949" target="_blank">+33 7 82 94 59 49</a></p>
                    <span class="contact-label">Email</span>
                    <p><a href="mailto:franckferrenbach@gmail.com">franckferrenbach@gmail.com</a></p>
                    <span class="contact-label">Domicile</span>
                    <p>34360 Saint-Chinian</p>
                    <span class="contact-label">LinkedIn</span>
                    <p><a href="https://www.linkedin.com/in/franck-ferrenbach/" target="_blank">linkedin.com/in/franck-ferrenbach</a></p>
                    <div class="qr-container">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Fwww.linkedin.com%2Fin%2Ffranck-ferrenbach%2F&bgcolor=2C3E50&color=FFFFFF&margin=0" alt="QR Code LinkedIn" class="qr-code">
                    </div>
                </div>
			</div>
            <div class="audio-note">
                Veuillez laisser un message audio au premier contact par téléphone, sms ou bien WhatsApp, pour vous identifier.
            </div>
        </div>
        <div class="content">
            <div class="recipient-section">
                <div class="recipient-name">${destinataire.nom || 'À l\'attention du Recruteur'}</div>
                <div>${destinataire.titre || ''}</div>
                <div>${destinataire.entreprise || rawInput.entreprise_nom}</div>
                <div>${destinataire.adresse || ''}</div>
            </div>
            <div class="date-location">Fait à Saint-Chinian, le ${dateJour}</div>
            <div class="object-line">Objet : ${rawInput.objet || ''}</div>
            <div class="letter-body">
                <p>Madame, Monsieur,</p>
                <p> ${corps.accroche || ''}</p>
                <p> ${corps.apport_candidat || ''}</p>
                <p> ${corps.projection || ''}</p>
                <p> ${rawInput.politesse || ''}</p>
            </div>
            <div class="signature-block">
                <div class="signature-name-typed">Franck Ferrenbach</div>
                <img src="${signatureImg}" class="signature-img">
            </div>
        </div>
    </div>
</body>
</html>`;
};

export { generateCVHTML, generateLMHTML };
