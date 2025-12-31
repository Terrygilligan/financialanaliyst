document.addEventListener('DOMContentLoaded', async () => {
    if (!window.firebase) {
        console.error('Firebase not initialized.');
        return;
    }

    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');

    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    forgotPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;

        const functions = getFunctions();
        const sendPasswordReset = httpsCallable(functions, 'sendPasswordReset');

        try {
            const result = await sendPasswordReset({ email });
            showSuccess(result.data.message);
        } catch (error) {
            console.error('Password reset error:', error);
            showError('An unexpected error occurred. Please try again.');
        }
    });
});
