// public/login.js

document.addEventListener('DOMContentLoaded', () => {
    // Ensure Firebase is initialized before using it
    if (!window.firebase || !window.firebase.auth || !window.firebase.db) {
        console.error("Firebase is not properly initialized.");
        return;
    }

    const { 
        signInWithEmailAndPassword, 
        createUserWithEmailAndPassword, 
        sendEmailVerification,
        signInWithPopup,
        GoogleAuthProvider
    } = window.firebase.authModule;

    const { doc, getDoc, setDoc } = window.firebase.firestoreModule;

    const auth = window.firebase.auth;
    const db = window.firebase.db;
    const googleProvider = new GoogleAuthProvider();

    // Handlers for both login and signup forms
    const loginHandler = new window.AuthActionHandler('login-form');
    const signupHandler = new window.AuthActionHandler('signup-form');

    // Store original button text
    loginHandler.saveButtonText();
    signupHandler.saveButtonText();

    // --- DOM Elements ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const googleSignupBtn = document.getElementById('google-signup-btn');
    const passwordInput = document.getElementById('password-input');
    const showPasswordToggle = document.getElementById('show-password-toggle');
    const urlParams = new URLSearchParams(window.location.search);

    // --- Initial UI Setup ---
    // Show verification message if redirected
    if (urlParams.has('verify')) {
        const verificationMessage = document.getElementById('verification-message');
        if (verificationMessage) {
            verificationMessage.style.display = 'block';
        }
    }

    // --- Event Listeners ---
    loginToggle.addEventListener('click', () => {
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    signupToggle.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    showPasswordToggle.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            showPasswordToggle.textContent = 'Hide';
        } else {
            passwordInput.type = 'password';
            showPasswordToggle.textContent = 'Show';
        }
    });

    // --- Form Submissions ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginHandler.setLoading(true);
        loginHandler.hideError();

        const email = document.getElementById('email-input').value;
        const password = passwordInput.value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                loginHandler.showError("Please verify your email before logging in.");
                return;
            }
            // Successful login will be handled by onAuthStateChanged
        } catch (error) {
            loginHandler.showError(error.code);
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        signupHandler.setLoading(true);
        signupHandler.hideError();

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            // Check if user exists in the lookup table to get their businessId
            const lookupRef = doc(db, "user_lookup", email.toLowerCase());
            const lookupDoc = await getDoc(lookupRef);

            if (!lookupDoc.exists()) {
                signupHandler.showError("Your email is not registered with a business. Please contact your administrator.");
                return;
            }

            const { businessId } = lookupDoc.data();

            // Create user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Set custom claims
            await window.firebase.functions.httpsCallable('setCustomClaims')({
                uid: user.uid,
                claims: { businessId }
            });

            // Create user profile in Firestore
            await setDoc(doc(db, `businesses/${businessId}/users`, user.uid), {
                email: user.email,
                createdAt: new Date().toISOString()
            });
            
            // Send verification email
            await sendEmailVerification(user);

            // Show success message and redirect
            signupHandler.showSuccess("Account created! Please check your email to verify your account.");
            setTimeout(() => signupHandler.redirect('/login.html?verify=true'), 3000);

        } catch (error) {
            signupHandler.showError(error.code || error.message);
        }
    });

    // --- Google Sign-In ---
    const handleGoogleSignIn = async (handler) => {
        handler.setLoading(true);
        handler.hideError();

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const email = user.email.toLowerCase();

            // Check if it's a new user
            const isNewUser = result.additionalUserInfo?.isNewUser;

            if (isNewUser) {
                 // Check lookup table for businessId
                const lookupRef = doc(db, "user_lookup", email);
                const lookupDoc = await getDoc(lookupRef);

                if (!lookupDoc.exists()) {
                     // If user is new and not in lookup, deny access
                    await user.delete(); // Clean up the created user
                    handler.showError("Your email is not registered with a business. Please contact your administrator.");
                    return;
                }

                const { businessId } = lookupDoc.data();

                // Set custom claims for the new user
                 await window.firebase.functions.httpsCallable('setCustomClaims')({
                    uid: user.uid,
                    claims: { businessId }
                });

                // Create user profile
                await setDoc(doc(db, `businesses/${businessId}/users`, user.uid), {
                    email: user.email,
                    createdAt: new Date().toISOString()
                });
            }
            // Existing users can sign in directly
            // Auth state change will handle redirect
        } catch (error) {
            handler.showError(error.code || error.message);
        }
    };

    googleLoginBtn.addEventListener('click', () => handleGoogleSignIn(loginHandler));
    googleSignupBtn.addEventListener('click', () => handleGoogleSignIn(signupHandler));
});
