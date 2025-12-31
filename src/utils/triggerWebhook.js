export async function triggerWebhook(action, idAnnonce, payload = {}) {
    const WEBHOOK_URLS = {
        'ENRICH_JOB': import.meta.env.VITE_WEBHOOK_ENRICH_JOB,
        'GENERATE_PDF': import.meta.env.VITE_WEBHOOK_GENERATE_PDF,
        'MARK_SENT': import.meta.env.VITE_WEBHOOK_MARK_SENT,
        'SEND_EMAIL': import.meta.env.VITE_WEBHOOK_SEND_EMAIL,
        'RECALCULATE_SCORES': import.meta.env.VITE_WEBHOOK_RECALCULATE_SCORES
    };

    const url = WEBHOOK_URLS[action];

    if (!url) {
        console.error(`[WEBHOOK] No URL found for action: ${action}`);
        return { success: false, error: "Configuration manquante" };
    }

    if (url.includes('your-n8n-instance') || url.includes('placeholder')) {
        console.warn(`[WEBHOOK] Placeholder URL detected for ${action}`);
        alert(`Attention: L'URL du webhook pour ${action} n'est pas configurée dans le fichier .env`);
        return { success: false };
    }

    console.log(`[WEBHOOK] Sending ${action} to ${url}`, { idAnnonce, ...payload });

    try {
        // Use 'no-cors' if your n8n doesn't handle OPTIONS/CORS (opaque response), 
        // OR standard POST if n8n is configured for CORS.
        // Usually n8n webhooks need to be configured to return "200 OK" and headers for CORS or be accessed via server proxy.
        // For now, we try standard POST.
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action,
                id: idAnnonce,
                timestamp: new Date().toISOString(),
                ...payload
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const data = await response.json().catch(() => ({})); // Handle empty JSON response
        console.log(`[WEBHOOK] Success`, data);
        return { success: true, data };

    } catch (error) {
        console.error(`[WEBHOOK] Failed`, error);
        alert(`Erreur de communication avec n8n: ${error.message}`);
        return { success: false, error: error.message };
    }
}
