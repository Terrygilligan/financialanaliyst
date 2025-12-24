// Business Signup Logic
// Handles business provisioning after user authentication

// Wait for Firebase to be initialized
async function waitForFirebase(maxWait = 5000) {
    const startTime = Date.now();
    while (!window.firebase && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return !!window.firebase;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Firebase to be initialized (module script may load async)
    const firebaseReady = await waitForFirebase();
    if (!firebaseReady) {
        console.error('Firebase not initialized. Please check your Firebase configuration.');
        return;
    }

    // Import Firebase modules
    const { 
        signInWithCredential,
        signInWithPopup,
        GoogleAuthProvider,
        onAuthStateChanged
    } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    
    const { httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');

    const { auth, functions, googleProvider } = window.firebase;

    // DOM Elements
    const authStep = document.getElementById('auth-step');
    const provisioningStep = document.getElementById('provisioning-step');
    const businessNameInput = document.getElementById('business-name');
    const googleSignupBtn = document.getElementById('google-signup-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    // Show error
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 8000);
    }

    // Show success
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    // Show loading
    function showLoading(text = 'Loading...') {
        loadingText.textContent = text;
        loadingOverlay.classList.add('active');
    }

    // Hide loading
    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }

    // Password toggle functionality (for future password fields)
    // Example usage if you add password fields:
    /*
    const passwordToggle = document.getElementById('password-toggle');
    const passwordInput = document.getElementById('password-input');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeOffIcon = document.getElementById('eye-off-icon');
    
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            if (type === 'password') {
                eyeIcon.style.display = 'block';
                eyeOffIcon.style.display = 'none';
            } else {
                eyeIcon.style.display = 'none';
                eyeOffIcon.style.display = 'block';
            }
        });
    }
    */

    // Check if user already has a business
    async function checkExistingBusiness(user) {
        try {
            const getBusinessDetails = httpsCallable(functions, 'getBusinessDetails');
            const result = await getBusinessDetails({});
            
            if (result.data.success && result.data.business) {
                // User already has a business
                showSuccess(`You already have a business: ${result.data.business.name}`);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                return true;
            }
        } catch (error) {
            // No business found or error - continue with provisioning
            console.log('No existing business found, proceeding with signup');
        }
        return false;
    }

    // Provision business (Service Account handles sheet creation - no OAuth token needed)
    async function provisionBusiness(user, googleAccessToken) {
        const businessName = businessNameInput.value.trim();
        
        if (!businessName) {
            showError('Please enter a business name');
            return;
        }

        showLoading('Creating your Google Drive folder...');
        
        try {
            const provisionNewBusiness = httpsCallable(functions, 'provisionNewBusiness');
            
            // Pass OAuth token to backend (allows creating sheets in user's Drive)
            const result = await provisionNewBusiness({
                businessName,
                googleAccessToken: googleAccessToken || undefined // Pass token if available
            });

            if (result.data.success) {
                showLoading('Setting up your Google Sheet...');
                
                // Wait a moment for sheet creation
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                hideLoading();
                showSuccess(`✅ Business "${businessName}" created successfully!`);
                
                // Show business details
                const business = result.data.business;
                if (business.googleDrive) {
                    setTimeout(() => {
                        if (confirm(`Business created! Would you like to open your Google Sheet?`)) {
                            window.open(business.googleDrive.sheetUrl, '_blank');
                        }
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                }
            } else {
                throw new Error('Business provisioning failed');
            }
        } catch (error) {
            console.error('Error provisioning business:', error);
            hideLoading();
            
            let errorMsg = 'Failed to create business: ';
            if (error.message) {
                errorMsg += error.message;
            } else if (error.code) {
                errorMsg += error.code;
            } else {
                errorMsg += 'Unknown error';
            }
            
            showError(errorMsg);
            
            // Show auth step again
            authStep.style.display = 'flex';
            provisioningStep.style.display = 'none';
        }
    }

    // Initialize Google Sign-In using signInWithPopup to get OAuth access token
    // This is needed because service accounts can't create Google Sheets (quota limitation)
    async function initializeGoogleSignIn() {
        // Set up click handler for Google Sign-In button
        const buttonContainer = document.getElementById('google-signin-btn-container');
        const googleSignupBtn = document.getElementById('google-signup-btn');
        
        async function handleGoogleSignIn() {
            try {
                // Validate business name before proceeding
                const businessName = businessNameInput.value.trim();
                if (!businessName) {
                    showError('Please enter a business name first');
                    businessNameInput.focus();
                    return;
                }
                
                showLoading('Signing in with Google...');
                
                // Use signInWithPopup to get OAuth access token
                const result = await signInWithPopup(auth, googleProvider);
                const user = result.user;
                
                console.log('[Business Signup] ✅ Firebase Auth successful:', user.email);
                
                // Get OAuth access token from the credential
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const googleAccessToken = credential?.accessToken;
                
                if (googleAccessToken) {
                    console.log('[Business Signup] ✅ OAuth access token received (length:', googleAccessToken.length, ')');
                } else {
                    console.warn('[Business Signup] ⚠️ No OAuth access token - backend will try service account');
                }
                
                // Verify email is verified (required for business creation)
                if (!user.emailVerified) {
                    hideLoading();
                    showError('Please verify your email address before creating a business. Check your inbox for the verification link.');
                    await auth.signOut();
                    return;
                }
                
                // Check if user already has a business
                const hasBusiness = await checkExistingBusiness(user);
                if (hasBusiness) {
                    hideLoading();
                    return;
                }
                
                // Show provisioning step
                authStep.style.display = 'none';
                provisioningStep.style.display = 'block';
                
                // Provision business with OAuth token (allows creating sheets in user's Drive)
                await provisionBusiness(user, googleAccessToken);
                
            } catch (error) {
                hideLoading();
                console.error('[Business Signup] Sign-in error:', error);
                
                if (error.code === 'auth/popup-closed-by-user') {
                    // User closed popup, no need to show error
                    return;
                }
                
                showError('Sign-in error: ' + (error.message || 'Unknown error'));
            }
        }
        
        // Set up button click handler
        if (buttonContainer) {
            // Create a custom button if GIS button container exists
            buttonContainer.innerHTML = `
                <button type="button" id="google-signin-custom-btn" class="btn-google" style="width: 100%; display: flex; align-items: center; justify-content: center; padding: 12px; border: 1px solid #dadce0; border-radius: 4px; background: white; cursor: pointer; font-size: 14px; font-weight: 500;">
                    <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                        <path fill="#FBBC05" d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.172.282-1.712V4.956H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.044l3.007-2.332z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.956L3.964 7.288C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    Sign in with Google
                </button>
            `;
            document.getElementById('google-signin-custom-btn')?.addEventListener('click', handleGoogleSignIn);
        } else if (googleSignupBtn) {
            // Use fallback button
            googleSignupBtn.style.display = 'block';
            googleSignupBtn.addEventListener('click', handleGoogleSignIn);
        }
    }

    // Initialize Google Sign-In when DOM is ready
    initializeGoogleSignIn();
    

    // Note: Email signup removed - business admins must use Google login
    // Regular users can use email/password on the regular login page

    // Check if user is already signed in
    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            // User is signed in and verified
            // Check if they already have a business
            const hasBusiness = await checkExistingBusiness(user);
            
            if (!hasBusiness) {
                // User is signed in but no business - show business name input
                businessNameInput.focus();
            }
        } else if (user && !user.emailVerified) {
            // User signed in but not verified
            showError('Please verify your email address before creating a business. Check your inbox for the verification link.');
        }
    });
});

