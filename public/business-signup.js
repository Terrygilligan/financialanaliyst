// public/business-signup.js
// SaaS Silo Provisioning Logic
// Handles business initialization and identity setup.

async function waitForFirebase(maxWait = 5000) {
    const startTime = Date.now();
    while (!window.firebase && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return !!window.firebase;
}

document.addEventListener('DOMContentLoaded', async () => {
    const firebaseReady = await waitForFirebase();
    if (!firebaseReady) {
        console.error('Firebase not initialized.');
        return;
    }

    const { 
        signInWithPopup,
        GoogleAuthProvider,
        onAuthStateChanged,
        createUserWithEmailAndPassword,
        sendEmailVerification
    } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    const { httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');

    const { auth, functions, googleProvider } = window.firebase;

    // DOM Elements
    const authStep = document.getElementById('auth-step');
    const provisioningStep = document.getElementById('provisioning-step');
    const businessNameInput = document.getElementById('business-name');
    const adminEmailInput = document.getElementById('admin-email');
    const adminPasswordInput = document.getElementById('admin-password');
    const emailSignupBtn = document.getElementById('email-signup-btn');
    const toggleEmailBtn = document.getElementById('toggle-email-btn');
    const toggleGoogleBtn = document.getElementById('toggle-google-btn');
    const emailSignupSection = document.getElementById('email-signup-section');
    const googleSignupSection = document.getElementById('google-signup-section');
    const googleSignupBtn = document.getElementById('google-signup-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    // --- TRIAL MODE CHECK ---
    const isTrial = window.location.search.includes('trial=true');
    if (isTrial) {
        console.log('🌟 Initializing Trial Registration...');
        const trialBadge = document.getElementById('trial-badge');
        const signupTitle = document.getElementById('signup-title');
        const signupSubtitle = document.getElementById('signup-subtitle');
        
        if (trialBadge) trialBadge.style.display = 'block';
        if (signupTitle) signupTitle.textContent = '🚀 Start Your 14-Day Trial';
        if (signupSubtitle) signupSubtitle.textContent = 'Unlock full enterprise AI features for your business today.';
    }
    // ------------------------

    // ... existing functions (showError, showSuccess, showLoading, hideLoading, checkExistingBusiness) ...

    async function handleEmailSignup() {
        const businessName = businessNameInput.value.trim();
        const email = adminEmailInput.value.trim();
        const password = adminPasswordInput.value;

        if (!businessName || !email || !password) {
            showError('Please fill in all fields (Business Name, Email, and Password).');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }

        showLoading('Creating your account and business silo...');
        
        try {
            // 1. Create User Account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Send Verification Email
            await sendEmailVerification(user);

            // 3. Provision Silo via Cloud Function
            const provisionNewBusiness = httpsCallable(functions, 'provisionNewBusiness');
            const provisionResult = await provisionNewBusiness({ businessName });

            if (provisionResult.data.success) {
                hideLoading();
                showSuccess(`✅ Account created and Silo "${businessName}" provisioned! Please check your email to verify your account before logging in.`);
                
                // Sign out so they have to verify first
                await auth.signOut();
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 5000);
            }
        } catch (error) {
            console.error('Email signup error:', error);
            hideLoading();
            showError(`Error: ${error.message || 'Failed to create account'}`);
            // Clean up: If account was created but provisioning failed, we might have an issue
            // but the Cloud Function should handle most of this.
        }
    }

    async function handleProvisioning() {
        // ... (existing Google handleProvisioning logic) ...
        const businessName = businessNameInput.value.trim();
        if (!businessName) {
            showError('Please enter a business name');
            return;
        }

        showLoading('Initializing your secure business silo...');
        
        try {
            // 1. Authenticate with Google
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            if (!user.emailVerified) {
                showError('Please verify your email first.');
                await auth.signOut();
                hideLoading();
                return;
            }

            // 2. Provision Silo via Cloud Function
            const provisionNewBusiness = httpsCallable(functions, 'provisionNewBusiness');
            const provisionResult = await provisionNewBusiness({ businessName });

            if (provisionResult.data.success) {
                showLoading('Updating your security credentials...');
                
                // 3. FORCE TOKEN REFRESH
                // This is critical to pick up the new businessId claim immediately
                await user.getIdToken(true);
                
                hideLoading();
                showSuccess(`✅ Silo "${businessName}" created successfully!`);
                
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Provisioning error:', error);
            hideLoading();
            showError(`Error: ${error.message || 'Failed to create account'}`);
        }
    }

    // Toggles
    toggleEmailBtn?.addEventListener('click', () => {
        emailSignupSection.style.display = 'flex';
        googleSignupSection.style.display = 'none';
    });

    toggleGoogleBtn?.addEventListener('click', () => {
        emailSignupSection.style.display = 'none';
        googleSignupSection.style.display = 'block';
    });

    emailSignupBtn?.addEventListener('click', handleEmailSignup);

    // Set up custom button handler
    const buttonContainer = document.getElementById('google-signin-btn-container');
    if (buttonContainer) {
        buttonContainer.innerHTML = `
            <button type="button" id="start-provisioning-btn" class="btn-google" style="width: 100%; display: flex; align-items: center; justify-content: center; padding: 12px; border: 1px solid #dadce0; border-radius: 4px; background: white; cursor: pointer; font-size: 14px; font-weight: 500;">
                Create Account & Sign In
            </button>
        `;
        document.getElementById('start-provisioning-btn')?.addEventListener('click', handleProvisioning);
    }

    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            const business = await checkExistingBusiness();
            if (business) {
                showSuccess(`Redirecting to your business: ${business.name}`);
                setTimeout(() => window.location.href = 'admin.html', 1500);
            }
        }
    });
});
