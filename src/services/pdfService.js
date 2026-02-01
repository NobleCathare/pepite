/**
 * pdfService.js
 * Service for generating PDF documents (CV, Cover Letter) via Gotenberg server.
 * Replaces n8n workflow '0dbtXdf8DHdzU5p6'.
 */

const GOTENBERG_URL = import.meta.env.VITE_GOTENBERG_URL;

/**
 * Checks if the Gotenberg server is reachable.
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function testGotenbergConnection() {
    if (!GOTENBERG_URL) {
        return { ok: false, message: "URL Gotenberg non configurée" };
    }

    try {
        const response = await fetch(`${GOTENBERG_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            return { ok: true, message: "Connexion OK" };
        } else {
            return { ok: false, message: `Erreur ${response.status}` };
        }
    } catch (error) {
        return { ok: false, message: error.message || "Serveur inaccessible" };
    }
}

/**
 * Generates a PDF document using Gotenberg.
 * Gotenberg expects multipart/form-data with an HTML file.
 * @param {string} htmlContent - Raw HTML string to convert
 * @param {Object} options - PDF options (margins, format, etc.)
 * @returns {Promise<Blob>} - PDF as binary blob
 */
export async function generatePDF(htmlContent, options = {}) {
    if (!GOTENBERG_URL) {
        throw new Error("URL Gotenberg non configurée. Vérifiez VITE_GOTENBERG_URL dans .env");
    }

    // Gotenberg requires multipart/form-data with file named "index.html"
    const formData = new FormData();

    // Create HTML file blob
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    formData.append('files', htmlBlob, 'index.html');

    // Optional: Add PDF options
    if (options.paperWidth) formData.append('paperWidth', options.paperWidth);
    if (options.paperHeight) formData.append('paperHeight', options.paperHeight);
    formData.append('marginTop', options.marginTop || '0.39');
    formData.append('marginBottom', options.marginBottom || '0.39');
    formData.append('marginLeft', options.marginLeft || '0.39');
    formData.append('marginRight', options.marginRight || '0.39');
    formData.append('preferCssPageSize', 'true');
    formData.append('printBackground', 'true');

    try {
        const response = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
            method: 'POST',
            body: formData
            // Note: Don't set Content-Type header - browser sets it automatically with boundary
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gotenberg Error: ${response.status} - ${errText}`);
        }

        // Return PDF blob for download
        return await response.blob();

    } catch (error) {
        console.error("PDF Generation Error:", error);
        throw error;
    }
}

/**
 * Downloads a generated PDF to the user's device.
 * @param {Blob} pdfBlob - PDF binary data
 * @param {string} filename - Desired filename (without extension)
 */
export function downloadPDF(pdfBlob, filename) {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generates and immediately downloads a CV PDF.
 * Uses previewTemplates to generate HTML, then converts via Gotenberg.
 * @param {Object} cvData - CV JSON data
 * @param {Object} userProfile - User profile for personal info
 * @param {Function} generateCVHTML - Template function from previewTemplates
 * @param {Object} options - PDF options
 */
export async function generateAndDownloadCV(cvData, userProfile, generateCVHTML, options = {}) {
    // Generate HTML from template
    const html = generateCVHTML(cvData);

    // Apply custom accent color if provided
    let finalHtml = html;
    if (options.accentColor) {
        finalHtml = html.replace(/#2c3e50/gi, options.accentColor);
    }

    // Convert to PDF via Gotenberg
    const blob = await generatePDF(finalHtml, options);

    // Generate filename
    const candidatName = userProfile?.display_name || userProfile?.prenom || 'Candidat';
    const filename = `CV_${candidatName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    downloadPDF(blob, filename);

    return blob;
}

/**
 * Generates and immediately downloads a Cover Letter PDF.
 * Uses previewTemplates to generate HTML, then converts via Gotenberg.
 * @param {Object} lmData - Letter JSON data
 * @param {Object} userProfile - User profile for signature
 * @param {Function} generateLMHTML - Template function from previewTemplates
 * @param {string} signatureBase64 - Signature image as base64
 * @param {Object} options - PDF options
 */
export async function generateAndDownloadLetter(lmData, userProfile, generateLMHTML, signatureBase64 = '', options = {}) {
    // Generate HTML from template
    const html = generateLMHTML(lmData, signatureBase64);

    // Apply custom accent color if provided
    let finalHtml = html;
    if (options.accentColor) {
        finalHtml = html.replace(/#2c3e50/gi, options.accentColor);
    }

    // Convert to PDF via Gotenberg
    const blob = await generatePDF(finalHtml, options);

    // Generate filename
    const poste = lmData?.objet?.replace(/Candidature au poste de /i, '') || 'Poste';
    const filename = `LM_${poste.replace(/\s+/g, '_').slice(0, 30)}_${new Date().toISOString().slice(0, 10)}`;
    downloadPDF(blob, filename);

    return blob;
}

/**
 * Quick test function to verify Gotenberg is working
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function testPdfGeneration() {
    try {
        const testHtml = `<!DOCTYPE html>
<html><head><title>Test</title></head>
<body><h1>Test PDF Pépite</h1><p>Généré le ${new Date().toLocaleString('fr-FR')}</p></body>
</html>`;

        const blob = await generatePDF(testHtml);

        if (blob && blob.size > 0) {
            return { ok: true, message: `PDF généré avec succès (${(blob.size / 1024).toFixed(1)} KB)` };
        } else {
            return { ok: false, message: "PDF vide retourné" };
        }
    } catch (error) {
        return { ok: false, message: error.message };
    }
}

/**
 * Merges multiple PDF blobs into a single PDF using Gotenberg.
 * @param {Blob[]} pdfBlobs - Array of PDF blobs to merge
 * @returns {Promise<Blob>} - Merged PDF as binary blob
 */
export async function mergePDFs(pdfBlobs) {
    if (!GOTENBERG_URL) {
        throw new Error("URL Gotenberg non configurée. Vérifiez VITE_GOTENBERG_URL dans .env");
    }

    if (!pdfBlobs || pdfBlobs.length === 0) {
        throw new Error("Aucun PDF à fusionner");
    }

    if (pdfBlobs.length === 1) {
        return pdfBlobs[0]; // Nothing to merge
    }

    const formData = new FormData();

    // Gotenberg merge expects files named in alphabetical order
    pdfBlobs.forEach((blob, index) => {
        const filename = `${String(index + 1).padStart(2, '0')}_document.pdf`;
        formData.append('files', blob, filename);
    });

    try {
        const response = await fetch(`${GOTENBERG_URL}/forms/pdfengines/merge`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gotenberg Merge Error: ${response.status} - ${errText}`);
        }

        return await response.blob();

    } catch (error) {
        console.error("PDF Merge Error:", error);
        throw error;
    }
}

/**
 * Generates CV and LM PDFs, then merges them into a single document.
 * @param {Object} cvData - CV JSON data
 * @param {Object} lmData - Letter JSON data
 * @param {Object} userProfile - User profile
 * @param {Function} generateCVHTML - Template function for CV
 * @param {Function} generateLMHTML - Template function for LM
 * @param {string} signatureBase64 - Signature image
 * @param {Object} options - PDF options (accentColor, etc.)
 * @returns {Promise<{cvBlob: Blob, lmBlob: Blob, combinedBlob: Blob}>}
 */
export async function generateAllPDFs(cvData, lmData, userProfile, generateCVHTML, generateLMHTML, signatureBase64 = '', options = {}) {
    const accentColor = options.accentColor || '#2c3e50';

    // Generate CV HTML and PDF
    let cvBlob = null;
    if (cvData) {
        const cvHtml = generateCVHTML(cvData);
        const finalCvHtml = cvHtml.replace(/#2c3e50/gi, accentColor);
        cvBlob = await generatePDF(finalCvHtml, options);
    }

    // Generate LM HTML and PDF
    let lmBlob = null;
    if (lmData) {
        const lmHtml = generateLMHTML(lmData, signatureBase64);
        const finalLmHtml = lmHtml.replace(/#2c3e50/gi, accentColor);
        lmBlob = await generatePDF(finalLmHtml, options);
    }

    // Merge if both exist
    let combinedBlob = null;
    if (cvBlob && lmBlob) {
        combinedBlob = await mergePDFs([cvBlob, lmBlob]);
    }

    return { cvBlob, lmBlob, combinedBlob };
}

/**
 * Generates and downloads all PDFs (CV, LM, and combined).
 * @param {Object} job - Job data containing CV_Texte_Adapte, LM_Texte, etc.
 * @param {Object} userProfile - User profile
 * @param {Function} generateCVHTML - Template function for CV
 * @param {Function} generateLMHTML - Template function for LM
 * @param {Object} options - PDF options
 * @returns {Promise<{success: boolean, cvBlob?: Blob, lmBlob?: Blob, combinedBlob?: Blob}>}
 */
export async function generateJobPDFs(job, userProfile, generateCVHTML, generateLMHTML, options = {}) {
    try {
        // Parse CV data
        let cvData = null;
        if (job.CV_Texte_Adapte) {
            cvData = typeof job.CV_Texte_Adapte === 'string'
                ? JSON.parse(job.CV_Texte_Adapte)
                : job.CV_Texte_Adapte;
        }

        // Parse LM data
        let lmData = null;
        if (job.LM_Texte) {
            lmData = typeof job.LM_Texte === 'string'
                ? JSON.parse(job.LM_Texte)
                : job.LM_Texte;
        }

        const signatureBase64 = userProfile?.signature_base64 || '';
        const accentColor = userProfile?.pdf_accent_color || '#2c3e50';

        const result = await generateAllPDFs(
            cvData,
            lmData,
            userProfile,
            generateCVHTML,
            generateLMHTML,
            signatureBase64,
            { ...options, accentColor }
        );

        return { success: true, ...result };

    } catch (error) {
        console.error("generateJobPDFs Error:", error);
        return { success: false, error: error.message };
    }
}

