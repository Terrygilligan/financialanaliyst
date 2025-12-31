// public/AuthActionHandler.js

/**
 * A centralized handler for common Firebase Authentication UI actions,
 * such as showing errors, handling redirects, and managing UI state.
 */
class AuthActionHandler {
    constructor(formId) {
        this.form = document.getElementById(formId);
        this.messageContainer = this.form ? this.form.querySelector('.error-message') : null;
        this.submitButton = this.form ? this.form.querySelector('button[type="submit"]') : null;

        if (!this.messageContainer && this.form) {
            console.warn(`No .error-message element found in form: #${formId}`);
        }
    }

    /**
     * Shows a formatted error message to the user.
     * @param {string} message The error message to display.
     */
    showError(message) {
        if (!this.messageContainer) return;

        // Clean and map common Firebase auth errors to user-friendly messages
        const userFriendlyMessage = this.mapAuthCodeToMessage(message);

        this.messageContainer.textContent = userFriendlyMessage;
        this.messageContainer.style.display = 'block';
        this.setLoading(false); // Always stop loading on error
    }

    /**
     * Hides the error message container.
     */
    hideError() {
        if (this.messageContainer) {
            this.messageContainer.style.display = 'none';
        }
    }

    /**
     * Shows a success message.
     * @param {string} message The success message to display.
     */
    showSuccess(message) {
        if (!this.messageContainer) return;
        this.messageContainer.textContent = message;
        this.messageContainer.classList.remove('error');
        this.messageContainer.classList.add('success');
        this.messageContainer.style.display = 'block';
        this.setLoading(false);
    }


    /**
     * Sets the loading state of the form, disabling the submit button.
     * @param {boolean} isLoading True to show loading, false to restore.
     */
    setLoading(isLoading) {
        if (!this.submitButton) return;
        this.submitButton.disabled = isLoading;
        this.submitButton.textContent = isLoading ? 'Processing...' : this.submitButton.dataset.originalText || 'Submit';
    }

    /**
     * Saves the original text of the submit button.
     */
    saveButtonText() {
        if (this.submitButton) {
            this.submitButton.dataset.originalText = this.submitButton.textContent;
        }
    }

    /**
     * Redirects the user to a new page.
     * @param {string} url The URL to redirect to.
     */
    redirect(url) {
        window.location.href = url;
    }

    /**
     * Maps common Firebase Auth error codes to more user-friendly messages.
     * @param {string} errorCode The error code from Firebase Auth.
     * @returns {string} A user-friendly error message.
     */
    mapAuthCodeToMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Invalid email or password.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/email-already-in-use':
                return 'An account with this email address already exists.';
            case 'auth/weak-password':
                return 'Your password must be at least 6 characters long.';
            case 'auth/requires-recent-login':
                return 'This action requires you to log in again for security.';
            case 'auth/too-many-requests':
                return 'Access to this account has been temporarily disabled due to too many failed login attempts. You can reset your password or try again later.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your internet connection and try again.';
            default:
                // For other errors, return the original message if it's a string, or a generic message
                return typeof errorCode === 'string' ? errorCode : 'An unexpected error occurred. Please try again.';
        }
    }
}

// Make it available globally or as a module
window.AuthActionHandler = AuthActionHandler;
