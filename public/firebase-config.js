// Firebase Configuration
// Supports both Live and Emulator modes

// Project ID from .firebaserc
const PROJECT_ID = "financialanaliyst";

// For emulators, we can use the actual project ID - emulators work with any project ID
const isEmulatorMode = () => {
    const hostname = window.location.hostname;
    return (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') 
        && (window.location.port === '5000' || window.location.port === '');
};

export const firebaseConfig = {
    // For emulators, use dummy values (emulators don't validate these)
    // For production, replace with actual values from Firebase Console
    apiKey: isEmulatorMode() ? "demo-api-key" : "<YOUR_API_KEY>",
    authDomain: isEmulatorMode() ? `${PROJECT_ID}.firebaseapp.com` : "<YOUR_PROJECT_ID>.firebaseapp.com",
    projectId: PROJECT_ID, // Use actual project ID for both emulator and production
    storageBucket: isEmulatorMode() ? `${PROJECT_ID}.firebasestorage.app` : "<YOUR_PROJECT_ID>.firebasestorage.app",
    messagingSenderId: isEmulatorMode() ? "123456789" : "<YOUR_SENDER_ID>",
    appId: isEmulatorMode() ? "1:123456789:web:abcdef" : "<YOUR_APP_ID>",
    measurementId: isEmulatorMode() ? undefined : "<YOUR_MEASUREMENT_ID>",
    // Google OAuth Client ID for Drive/Sheets API access
    oauthClientId: "<YOUR_OAUTH_CLIENT_ID>",
    // Builder.io Public API Key (Space ID)
    builderApiKey: "8f07f9dafbb844f980657a324fe9a7ec"
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
