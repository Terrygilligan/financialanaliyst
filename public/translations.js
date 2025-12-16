// public/translations.js

/**
 * Multi-language translation support for the AI Financial Analyst app.
 * Falls back to English if translation is missing.
 */

const translations = {
    en: {
        // Navigation
        'nav.home': 'Home',
        'nav.profile': 'Profile',
        'nav.admin': 'Admin',
        'nav.logout': 'Logout',
        
        // Main App
        'app.title': 'AI Financial Analyst',
        'app.upload.title': 'Upload Receipt',
        'app.upload.dragDrop': 'Drag and drop a receipt image here, or click to select',
        'app.upload.selectFile': 'Choose File',
        'app.upload.uploading': 'Uploading...',
        'app.upload.success': 'Upload successful!',
        'app.upload.error': 'Upload failed. Please try again.',
        'app.status.processing': 'Processing...',
        'app.status.complete': 'Complete',
        'app.status.error': 'Error',
        'app.history.title': 'Upload History',
        'app.history.empty': 'No uploads yet',
        
        // Profile
        'profile.title': 'Profile',
        'profile.email': 'Email',
        'profile.created': 'Account Created',
        'profile.verified': 'Verified',
        'profile.notVerified': 'Not Verified',
        'profile.stats.title': 'Statistics',
        'profile.stats.receipts': 'Total Receipts',
        'profile.stats.amount': 'Total Amount',
        'profile.stats.successRate': 'Success Rate',
        'profile.stats.recentActivity': 'Recent Activity',
        'profile.history.title': 'Receipt History',
        'profile.password.change': 'Change Password',
        'profile.password.current': 'Current Password',
        'profile.password.new': 'New Password',
        'profile.password.confirm': 'Confirm Password',
        'profile.password.save': 'Save',
        'profile.password.cancel': 'Cancel',
        'profile.verification.resend': 'Resend Verification Email',
        
        // Admin
        'admin.title': 'Admin Dashboard',
        'admin.stats.title': 'System Statistics',
        'admin.stats.totalReceipts': 'Total Receipts',
        'admin.stats.successful': 'Successful',
        'admin.stats.failed': 'Failed',
        'admin.stats.activeUsers': 'Active Users',
        'admin.stats.totalAmount': 'Total Amount',
        'admin.stats.successRate': 'Success Rate',
        'admin.receipts.title': 'All Receipts',
        'admin.receipts.search': 'Search...',
        'admin.receipts.filter': 'Filter by Status',
        'admin.receipts.refresh': 'Refresh',
        'admin.errors.title': 'Error Logs',
        'admin.users.title': 'User Management',
        
        // Common
        'common.loading': 'Loading...',
        'common.error': 'An error occurred',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.close': 'Close',
        'common.yes': 'Yes',
        'common.no': 'No'
    },
    
    // Add more languages here as needed
    // es: { ... },
    // fr: { ... },
    // de: { ... }
};

/**
 * Get the current language from localStorage or browser settings
 * @returns {string} Language code (default: 'en')
 */
function getCurrentLanguage() {
    // Check localStorage first
    const savedLang = localStorage.getItem('app_language');
    if (savedLang && translations[savedLang]) {
        return savedLang;
    }
    
    // Fall back to browser language
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) {
        return browserLang;
    }
    
    // Default to English
    return 'en';
}

/**
 * Set the current language
 * @param {string} langCode - Language code (e.g., 'en', 'es')
 */
function setLanguage(langCode) {
    if (translations[langCode]) {
        localStorage.setItem('app_language', langCode);
        translateUI();
    } else {
        console.warn(`Language '${langCode}' not available. Falling back to English.`);
    }
}

/**
 * Translate a key to the current language
 * @param {string} key - Translation key (e.g., 'app.title')
 * @param {object} params - Optional parameters for string interpolation
 * @returns {string} Translated text or the key if translation not found
 */
function translate(key, params = {}) {
    const lang = getCurrentLanguage();
    const translation = translations[lang]?.[key] || translations.en[key] || key;
    
    // Simple parameter replacement: {param} -> value
    if (Object.keys(params).length > 0) {
        return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? params[paramKey] : match;
        });
    }
    
    return translation;
}

/**
 * Translate all UI elements with data-translate attribute
 */
function translateUI() {
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(element => {
        const key = element.getAttribute('data-translate');
        const translated = translate(key);
        
        // Update text content or placeholder
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            if (element.type === 'submit' || element.type === 'button') {
                element.value = translated;
            } else {
                element.placeholder = translated;
            }
        } else {
            element.textContent = translated;
        }
    });
    
    // Update title attributes
    const titleElements = document.querySelectorAll('[data-translate-title]');
    titleElements.forEach(element => {
        const key = element.getAttribute('data-translate-title');
        element.title = translate(key);
    });
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { translate, translateUI, setLanguage, getCurrentLanguage };
}

