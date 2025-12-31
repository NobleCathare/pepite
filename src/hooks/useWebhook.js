import { useState } from 'react';
import { triggerWebhook } from '../utils/triggerWebhook';

export function useWebhook() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const executeAction = async (action, id, payload) => {
        setIsSubmitting(true);
        try {
            return await triggerWebhook(action, id, payload);
        } catch (e) {
            console.error("Webhook failed", e);
            return { success: false, error: e.message };
        } finally {
            setIsSubmitting(false);
        }
    };

    return { executeAction, isSubmitting };
}
