// Firebase Configuration
// Supports both Live and Emulator modes

export const firebaseConfig = {
    apiKey: "<YOUR_API_KEY>",
    authDomain: "<YOUR_PROJECT_ID>.firebaseapp.com",
    projectId: "<YOUR_PROJECT_ID>",
    storageBucket: "<YOUR_PROJECT_ID>.firebasestorage.app",
    messagingSenderId: "<YOUR_SENDER_ID>",
    appId: "<YOUR_APP_ID>",
    measurementId: "<YOUR_MEASUREMENT_ID>",
    // Google OAuth Client ID for Drive/Sheets API access
    oauthClientId: "<YOUR_OAUTH_CLIENT_ID>",
    // Builder.io Public API Key (Space ID)
    builderApiKey: "<YOUR_BUILDER_API_KEY>"
};

/**
 * Determine if we should use emulators
 * 
 * Emulator mode is enabled when:
 * 1. URL contains ?emulator=true parameter, OR
 * 2. localStorage has 'useEmulator' set to 'true', OR
 * 3. Running on localhost (auto-detect for local development)
 * 
 * Otherwise, use live Firebase (recommended for Google Sign-In)
 */
export function shouldUseEmulators() {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('emulator') === 'true') {
        return true;
    }
    
    // Check localStorage (can be toggled via console: localStorage.setItem('useEmulator', 'true'))
    if (localStorage.getItem('useEmulator') === 'true') {
        return true;
    }
    
    // Auto-detect localhost (for local development convenience)
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        // Check if emulators are likely running (port 5000 is hosting emulator)
        const port = window.location.port;
        if (port === '5000' || port === '') {
            return true;
        }
    }
    
    // Default: Use live Firebase (better for Google Sign-In and Google Sheets API)
    return false;
}

/**
 * Get emulator configuration
 */
export const emulatorConfig = {
    auth: {
        host: 'localhost',
        port: 9099
    },
    functions: {
        host: 'localhost',
        port: 5001
    },
    firestore: {
        host: 'localhost',
        port: 8080
    },
    storage: {
        host: 'localhost',
        port: 9199
    }
};
