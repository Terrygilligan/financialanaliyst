// public/forgot-password.js
// Tenant-Aware Account Recovery Logic

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to be globally available
    const waitForFirebase = async (maxWait = 5000) => {
        const startTime = Date.now();
        while (!window.firebase && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return !!window.firebase;
    };

    const firebaseReady = await waitForFirebase();
    if (!firebaseReady) {
        console.error('Firebase not initialized.');
        return;
    }

    const { 
        sendPasswordResetEmail 
    } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    const { 
        doc, 
        getDoc 
    } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const { auth, db } = window.firebase;

    // DOM Elements
    const recoveryForm = document.getElementById('recovery-form');
    const emailInput = document.getElementById('email-input');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const submitBtn = document.getElementById('submit-btn');

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

    recoveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim().toLowerCase();
        
        if (!email) {
            showError('Please enter your email address.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Identifying tenant...';
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        try {
            // 1. Tenant Detection: Look up the user's businessId
            // This collection allows unauthenticated read for specific document
            const lookupRef = doc(db, 'user_lookup', email);
            const lookupSnap = await getDoc(lookupRef);

            let tenantId = null;
            if (lookupSnap.exists()) {
                tenantId = lookupSnap.data().businessId;
                console.log(`🏠 Tenant identified: ${tenantId}`);
            } else {
                // Fallback: If no lookup record, try global pool (not ideal for multi-tenancy)
                console.warn('⚠️ No tenant mapping found for this email. Proceeding with global context.');
            }

            // 2. Set Tenant Context
            // This ensures the correct email template and silo rules are used
            if (tenantId) {
                auth.tenantId = tenantId;
            }

            // 3. Trigger Password Reset
            await sendPasswordResetEmail(auth, email);
            
            showSuccess(`✅ Reset link sent! Please check your inbox at ${email}.`);
            recoveryForm.style.display = 'none';
            submitBtn.style.display = 'none';

        } catch (error) {
            console.error('Recovery error:', error);
            let message = 'Failed to send reset link. Please try again.';
            
            if (error.code === 'auth/user-not-found') {
                message = 'No account found with this email address.';
            } else if (error.code === 'permission-denied') {
                message = 'Security violation: Unauthorized lookup attempt.';
            }
            
            showError(`Error: ${message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
        }
    });
});

