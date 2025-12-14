// Login Page Logic

document.addEventListener('DOMContentLoaded', async () => {
    // Check if Firebase is initialized
    if (!window.firebase) {
        console.error('Firebase not initialized. Please check your Firebase configuration.');
        return;
    }

    // Import Firebase modules
    const { 
        signInWithEmailAndPassword, 
        createUserWithEmailAndPassword, 
        signInWithPopup,
        sendEmailVerification,
        onAuthStateChanged 
    } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

    const { auth, googleProvider } = window.firebase;

    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const googleSignupBtn = document.getElementById('google-signup-btn');
    const errorMessage = document.getElementById('error-message');
    const verificationMessage = document.getElementById('verification-message');
    const passwordInput = document.getElementById('password-input');
    const signupPasswordInput = document.getElementById('signup-password');
    const passwordToggle = document.getElementById('password-toggle');
    const signupPasswordToggle = document.getElementById('signup-password-toggle');

    // Show error
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Password Toggle Functionality
    passwordToggle?.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const eyeIcon = document.getElementById('eye-icon');
        const eyeOffIcon = document.getElementById('eye-off-icon');
        if (type === 'password') {
            eyeIcon.style.display = 'block';
            eyeOffIcon.style.display = 'none';
        } else {
            eyeIcon.style.display = 'none';
            eyeOffIcon.style.display = 'block';
        }
    });

    signupPasswordToggle?.addEventListener('click', () => {
        const type = signupPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        signupPasswordInput.setAttribute('type', type);
        const eyeIcon = document.getElementById('signup-eye-icon');
        const eyeOffIcon = document.getElementById('signup-eye-off-icon');
        if (type === 'password') {
            eyeIcon.style.display = 'block';
            eyeOffIcon.style.display = 'none';
        } else {
            eyeIcon.style.display = 'none';
            eyeOffIcon.style.display = 'block';
        }
    });

    // Check URL for verification parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verify') === 'true') {
        verificationMessage.style.display = 'block';
        verificationMessage.innerHTML = `
            <p>📧 Please verify your email address. Check your inbox for the verification link.</p>
        `;
    }

    // Redirect if already logged in and verified
    onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
            // User is signed in and verified, redirect to main page
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'index.html';
            }
        } else if (user && !user.emailVerified) {
            // User is signed in but not verified
            verificationMessage.style.display = 'block';
            verificationMessage.innerHTML = `
                <p>📧 Please verify your email address. Check your inbox for the verification link.</p>
                <button type="button" id="resend-verification" class="btn-link" style="margin-top: 8px; background: none; border: none; color: var(--primary-color); cursor: pointer; text-decoration: underline;">Resend verification email</button>
            `;
            document.getElementById('resend-verification')?.addEventListener('click', async () => {
                try {
                    await sendEmailVerification(user);
                    showError('Verification email sent! Please check your inbox.');
                } catch (error) {
                    showError('Error sending verification email: ' + error.message);
                }
            });
        }
    });

    // Toggle between login and signup forms
    signupToggle?.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
    });

    loginToggle?.addEventListener('click', () => {
        signupForm.style.display = 'none';
        loginForm.style.display = 'flex';
    });

    // Login Form
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Check if email is verified
            if (!user.emailVerified) {
                await auth.signOut();
                showError('Please verify your email address before logging in. Check your inbox for the verification link.');
                verificationMessage.style.display = 'block';
                verificationMessage.innerHTML = `
                    <p>📧 Please verify your email address. Check your inbox for the verification link.</p>
                    <button type="button" id="resend-verification-login" class="btn-link" style="margin-top: 8px; background: none; border: none; color: var(--primary-color); cursor: pointer; text-decoration: underline;">Resend verification email</button>
                `;
                document.getElementById('resend-verification-login')?.addEventListener('click', async () => {
                    try {
                        // Re-authenticate to send verification
                        await signInWithEmailAndPassword(auth, email, password);
                        const currentUser = auth.currentUser;
                        if (currentUser) {
                            await sendEmailVerification(currentUser);
                            await auth.signOut();
                            showError('Verification email sent! Please check your inbox.');
                        }
                    } catch (error) {
                        showError('Error sending verification email: ' + error.message);
                    }
                });
                return;
            }
            // Email is verified, redirect will happen automatically via onAuthStateChanged
        } catch (error) {
            showError('Login error: ' + error.message);
        }
    });

    // Signup Form
    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log('User created:', user.email);
            
            // Send verification email (user must be signed in to send)
            try {
                await sendEmailVerification(user, {
                    url: window.location.origin + '/login.html',
                    handleCodeInApp: false
                });
                console.log('Verification email sent successfully');
                
                // Show verification message
                verificationMessage.style.display = 'block';
                errorMessage.style.display = 'none';
                verificationMessage.innerHTML = `
                    <p>📧 Verification email sent to ${email}! Please check your inbox (and spam folder) and click the verification link to activate your account.</p>
                    <p style="margin-top: 8px; font-size: 12px;">After verifying, you can log in.</p>
                    <button type="button" id="resend-verification-signup" class="btn-link" style="margin-top: 8px; background: none; border: none; color: var(--primary-color); cursor: pointer; text-decoration: underline;">Resend verification email</button>
                `;
                
                // Add resend button handler
                document.getElementById('resend-verification-signup')?.addEventListener('click', async () => {
                    try {
                        // User needs to be signed in to resend
                        await signInWithEmailAndPassword(auth, email, password);
                        const currentUser = auth.currentUser;
                        if (currentUser) {
                            await sendEmailVerification(currentUser);
                            await auth.signOut();
                            showError('Verification email resent! Please check your inbox.');
                        }
                    } catch (error) {
                        showError('Error resending verification email: ' + error.message);
                    }
                });
                
                // Sign out the user after a short delay to ensure email is sent
                setTimeout(async () => {
                    await auth.signOut();
                    console.log('User signed out after verification email sent');
                }, 1000);
                
            } catch (verifyError) {
                console.error('Error sending verification email:', verifyError);
                showError('Account created but failed to send verification email: ' + verifyError.message);
                // Still sign out
                await auth.signOut();
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            showError('Signup error: ' + error.message);
        }
    });

    // Google Sign-In (Login)
    googleLoginBtn?.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // Redirect will happen automatically via onAuthStateChanged
        } catch (error) {
            if (error.code === 'auth/popup-closed-by-user') {
                return; // User closed popup, no error needed
            }
            showError('Google sign-in error: ' + error.message);
        }
    });

    // Google Sign-In (Signup)
    googleSignupBtn?.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // Redirect will happen automatically via onAuthStateChanged
        } catch (error) {
            if (error.code === 'auth/popup-closed-by-user') {
                return; // User closed popup, no error needed
            }
            showError('Google sign-in error: ' + error.message);
        }
    });
});
