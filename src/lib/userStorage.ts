export let activeUserId: string | 'guest' = 'guest';

// Attempt synchronous initialization from Supabase auth token
try {
    const supabaseKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (supabaseKey) {
        const sessionStr = localStorage.getItem(supabaseKey);
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (session?.user?.id) {
                activeUserId = session.user.id;
            }
        }
    }
} catch (e) {
    // Ignore parsing errors
}

// Called when auth state changes (e.g., login/logout)
export function setActiveUserId(id: string | null) {
    activeUserId = id || 'guest';
}

export function getNamespacedKey(baseKey: string): string {
    return `${baseKey}_${activeUserId}`;
}

// Wrapper for localStorage that automatically namespaces keys
export const userStorage = {
    getItem: (baseKey: string): string | null => {
        const namespacedKey = getNamespacedKey(baseKey);
        let val = localStorage.getItem(namespacedKey);

        if (val !== null) return val;

        // For Guest, we can read the old global key for backward compatibility
        if (activeUserId === 'guest') {
            const legacyVal = localStorage.getItem(baseKey);
            if (legacyVal !== null) {
                // Save it to new guest key and remove old global key to migrate cleanly
                localStorage.setItem(namespacedKey, legacyVal);
                localStorage.removeItem(baseKey);
                return legacyVal;
            }
        }

        return null;
    },

    setItem: (baseKey: string, value: string) => {
        localStorage.setItem(getNamespacedKey(baseKey), value);
    },

    removeItem: (baseKey: string) => {
        localStorage.removeItem(getNamespacedKey(baseKey));
    },

    // This helps when we want to forcefully access the guest data (e.g. to sync to cloud)
    getGuestItem: (baseKey: string): string | null => {
        return localStorage.getItem(`${baseKey}_guest`) || localStorage.getItem(baseKey);
    },

    clearGuestItem: (baseKey: string) => {
        localStorage.removeItem(`${baseKey}_guest`);
        localStorage.removeItem(baseKey);
    }
};
