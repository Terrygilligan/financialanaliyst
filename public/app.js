// Firebase Authentication and App Logic

// Wait for Firebase to initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check if Firebase is initialized
    if (!window.firebase) {
        console.error('Firebase not initialized. Please check your Firebase configuration.');
        return;
    }

    // Import Firebase modules
    const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const storageModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const { 
        signInWithEmailAndPassword, 
        createUserWithEmailAndPassword, 
        signInWithPopup,
        GoogleAuthProvider,
        signOut, 
        onAuthStateChanged 
    } = authModule;
    const { ref, uploadBytesResumable } = storageModule;
    const { doc, setDoc, getDoc, onSnapshot, collection, getDocs } = firestoreModule;

    const { auth, storage, db } = window.firebase;
    const googleProvider = new GoogleAuthProvider();

    // Function to initialize the app with a user (real or mock)
    async function initializeAppWithUser(user) {
        const landingPage = document.getElementById('landing-page');
        const welcomeSection = document.getElementById('welcome-section');
        userInfo.style.display = 'flex';
        loginSection.style.display = 'none';
        mainContent.style.display = 'grid';
        loginModal.style.display = 'none';
        if (landingPage) landingPage.style.display = 'none';
        if (welcomeSection) welcomeSection.style.display = 'none';

        const isAdmin = user.isAdmin || await checkAdminStatus(user);
        const adminLinkContainer = document.getElementById('admin-link-container');
        if (isAdmin && adminLinkContainer) {
            adminLinkContainer.style.display = 'inline';
        }

        if (!isAdmin) {
            await loadUserProfile(user);
        }
    }

    // DOM Elements
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginModal = document.getElementById('login-modal');
    const closeModal = document.getElementById('close-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const mainContent = document.getElementById('main-content');
    const userInfo = document.getElementById('user-info');
    const loginSection = document.getElementById('login-section');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const uploadStatus = document.getElementById('upload-status');
    const statusContainer = document.getElementById('status-container');
    const historyContainer = document.getElementById('history-container');

    // Check if user is admin via custom claims
    async function checkAdminStatus(user) {
        if (!user) return false;
        if (user.isMock) return user.isAdmin;
        
        // Get the ID token to check custom claims
        try {
            const idTokenResult = await user.getIdTokenResult();
            return idTokenResult.claims.admin === true;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // Fetch user profile and render dynamic form
    async function loadUserProfile(user) {
        if (!user) return;
        const idTokenResult = await user.getIdTokenResult();
        const businessId = idTokenResult.claims.businessId;

        if (!businessId) {
            console.error("User is not associated with a business.");
            return;
        }

        const userRef = doc(db, 'businesses', businessId, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.assignedSchemaId) {
                await renderDynamicForm(businessId, userData.assignedSchemaId);
            }
        }
    }

    // Render dynamic form based on schema
    async function renderDynamicForm(businessId, schemaId) {
        const schemaRef = doc(db, 'businesses', businessId, 'schemas', schemaId);
        const schemaDoc = await getDoc(schemaRef);
        if (schemaDoc.exists()) {
            const schemaData = schemaDoc.data().schema; // The schema is nested under the 'schema' key
            const fieldsContainer = document.getElementById('dynamic-form-fields');
            fieldsContainer.innerHTML = ''; // Clear existing fields
            if (schemaData.fields) {
                schemaData.fields.forEach(field => {
                    const fieldHtml = `
                        <div class="form-field">
                            <label for="${field.id}">${field.label}</label>
                            <input type="${field.type}" id="${field.id}" name="${field.id}" class="admin-input">
                        </div>
                    `;
                    fieldsContainer.insertAdjacentHTML('beforeend', fieldHtml);
                });
            }
        }
    }

    // Authentication State
    onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Check if email is verified
                if (!user.emailVerified) {
                    // Email not verified, redirect to login with message
                    if (!window.location.pathname.includes('login.html')) {
                        window.location.href = 'login.html?verify=true';
                    }
                    return;
                }
                // User is signed in and verified
                initializeAppWithUser(user);
                updateHistory(user.uid);
            } else {
                // User is signed out
                const isHomePage = window.location.pathname.includes('index.html') || 
                                   window.location.pathname === '/' || 
                                   window.location.pathname.endsWith('/');
                const isLoginPage = window.location.pathname.includes('login.html');
                
                if (isHomePage) {
                    // On home page - show landing page, hide main content
                    const mainContent = document.getElementById('main-content');
                    const loginSection = document.getElementById('login-section');
                    const userInfo = document.getElementById('user-info');
                    const landingPage = document.getElementById('landing-page');
                    const welcomeSection = document.getElementById('welcome-section');
                    
                    if (mainContent) mainContent.style.display = 'none';
                    if (loginSection) loginSection.style.display = 'flex';
                    if (userInfo) userInfo.style.display = 'none';
                    if (landingPage) landingPage.style.display = 'block';
                    if (welcomeSection) welcomeSection.style.display = 'none';
                } else if (!isLoginPage) {
                    // Redirect to login only if not on home or login page
                    window.location.href = 'login.html';
                }
            }
        });

    // Login redirect (if login button exists, redirect to login page)
    loginBtn?.addEventListener('click', () => {
        window.location.href = 'login.html';
    });

    logoutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // Show welcome section after logout
            const welcomeSection = document.getElementById('welcome-section');
            const landingPage = document.getElementById('landing-page');
            if (welcomeSection) welcomeSection.style.display = 'block';
            if (landingPage) landingPage.style.display = 'none';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error signing out: ' + error.message);
        }
    });

    closeModal?.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    loginToggle?.addEventListener('click', () => {
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    signupToggle?.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    // Login Form
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value;
        const password = document.getElementById('password-input').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert('Login error: ' + error.message);
        }
    });

    // Signup Form
    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert('Signup error: ' + error.message);
        }
    });

    // Google Sign-In (Login)
    const googleLoginBtn = document.getElementById('google-login-btn');
    googleLoginBtn?.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // Modal will close automatically via onAuthStateChanged
        } catch (error) {
            console.error('Google sign-in error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                // User closed the popup, no need to show error
                return;
            }
            alert('Google sign-in error: ' + error.message);
        }
    });

    // Google Sign-In (Signup)
    const googleSignupBtn = document.getElementById('google-signup-btn');
    googleSignupBtn?.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // Modal will close automatically via onAuthStateChanged
        } catch (error) {
            console.error('Google sign-in error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                // User closed the popup, no need to show error
                return;
            }
            alert('Google sign-in error: ' + error.message);
        }
    });

    // File Upload - Using label approach for better mobile compatibility
    // The label automatically handles clicks/touches, so we just need to handle the file change event
    console.log('File input element:', fileInput);
    console.log('Upload area element:', uploadArea);
    
    // Ensure file input is accessible
    if (!fileInput) {
        console.error('❌ File input not found! Check HTML structure.');
    } else {
        console.log('✅ File input found:', fileInput.id, fileInput.type, fileInput.accept);
    }

    // Drag and drop (desktop only) - only if uploadArea exists and is not a label
    if (uploadArea && uploadArea.tagName !== 'LABEL') {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        });
    }

    if (fileInput) {
        // Handle file selection - use both 'change' and 'input' events for maximum compatibility
        const handleFileSelection = (e) => {
            console.log('File input event fired:', e.type);
            const input = e.target;
            const files = input.files;
            console.log('Files in event:', files, 'Length:', files?.length);
            
            if (files && files.length > 0) {
                const file = files[0];
                console.log('File selected:', {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: new Date(file.lastModified)
                });
                
                // Start upload
                handleFileUpload(file).catch(error => {
                    console.error('Error in handleFileUpload:', error);
                    uploadStatus.textContent = 'Upload failed: ' + error.message;
                    uploadStatus.style.color = 'var(--error-color)';
                    alert('Error uploading file: ' + error.message);
                });
            } else {
                console.log('No file selected or files array is empty');
            }
            
            // Reset input to allow selecting the same file again (after a small delay)
            setTimeout(() => {
                input.value = '';
            }, 100);
        };
        
        fileInput.addEventListener('change', handleFileSelection);
        fileInput.addEventListener('input', handleFileSelection); // Fallback for some mobile browsers
        console.log('✅ File input event listeners attached');
    } else {
        console.error('❌ File input element not found! Check HTML structure.');
    }

    async function handleFileUpload(file) {
        console.log('handleFileUpload called with file:', file?.name, file?.size, file?.type);
        
        if (!file) {
            console.error('No file provided to handleFileUpload');
            alert('No file selected');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            console.error('No user logged in');
            alert('Please login first');
            return;
        }

        const idTokenResult = await user.getIdTokenResult();
        const businessId = idTokenResult.claims.businessId;
        if (!businessId) {
            console.error("User is not associated with a business.");
            alert("Could not upload file. User not part of a business.");
            return;
        }

        // Validate file type
        if (!file.type || !file.type.startsWith('image/')) {
            console.error('Invalid file type:', file.type);
            alert('Please upload an image file');
            return;
        }

        // Validate file size (20MB max)
        if (file.size > 20 * 1024 * 1024) {
            console.error('File too large:', file.size);
            alert('File size must be less than 20MB');
            return;
        }

        console.log('File validation passed, starting upload...');

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const filePath = `receipts/${user.uid}/${fileName}`;
        const storageRef = ref(storage, filePath);

        // Show progress
        uploadProgress.style.display = 'block';
        progressFill.style.width = '0%';
        uploadStatus.textContent = 'Uploading...';

        try {
            // Ensure we send a contentType so some mobile browsers (camera captures) don't stall
            const metadata = { contentType: file.type || 'image/jpeg' };

            // Upload file
            const uploadTask = uploadBytesResumable(storageRef, file, metadata);

            // Detect stalled uploads (common on aggressive blockers)
            let lastProgress = 0;
            let stallTimer = setTimeout(() => {
                if (lastProgress === 0) {
                    uploadStatus.textContent = 'Still waiting to start... If this stays at 0%, disable tracking protection or try Chrome.';
                    uploadStatus.style.color = 'var(--warning-color)' || '#d97706';
                }
            }, 12000);

            // Monitor upload progress
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    lastProgress = progress;
                    progressFill.style.width = progress + '%';
                    uploadStatus.textContent = `Uploading... ${Math.round(progress)}%`;
                },
                (error) => {
                    clearTimeout(stallTimer);
                    console.error('Upload error:', error);
                    uploadStatus.textContent = 'Upload failed: ' + error.message;
                    uploadStatus.style.color = 'var(--error-color)';
                },
                async () => {
                    clearTimeout(stallTimer);
                    // Upload complete
                    uploadStatus.textContent = 'Upload complete! Processing...';
                    uploadStatus.style.color = 'var(--secondary-color)';
                    
                    // Create batch document in Firestore
                    const batchRef = doc(db, 'businesses', businessId, 'batches', user.uid);
                    await setDoc(batchRef, {
                        status: 'processing',
                        fileName: fileName,
                        filePath: filePath,
                        timestamp: new Date().toISOString()
                    }, { merge: true });

                    // Monitor status
                    monitorBatchStatus(user.uid, fileName);
                }
            );
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file: ' + error.message);
        }
    }

    function monitorBatchStatus(userId, fileName) {
        const batchRef = doc(db, 'batches', userId);
        
        onSnapshot(batchRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                updateStatusDisplay(data, fileName);
                updateHistory(userId);
            }
        });
    }

    function updateStatusDisplay(data, fileName) {
        statusContainer.innerHTML = '';

        if (data.status === 'processing') {
            statusContainer.innerHTML = `
                <div class="status-message processing">
                    <strong>Processing:</strong> ${fileName}
                    <p>Analyzing receipt with AI...</p>
                </div>
            `;
        } else if (data.status === 'complete') {
            const receiptData = data.receiptData || {};
            statusContainer.innerHTML = `
                <div class="status-card">
                    <h3>✅ Processing Complete: ${fileName}</h3>
                    <div class="data-row">
                        <span class="data-label">Vendor:</span>
                        <span class="data-value">${receiptData.vendorName || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Date:</span>
                        <span class="data-value">${receiptData.transactionDate || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Amount:</span>
                        <span class="data-value">$${receiptData.totalAmount?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Category:</span>
                        <span class="data-value">${receiptData.category || 'N/A'}</span>
                    </div>
                </div>
            `;
        } else if (data.status === 'error') {
            statusContainer.innerHTML = `
                <div class="status-message error">
                    <strong>Error processing:</strong> ${fileName}
                    <p>${data.errorMessage || 'Unknown error occurred'}</p>
                </div>
            `;
        }
    }

    async function updateHistory(userId) {
        const user = auth.currentUser;
        if (!user) return;

        const idTokenResult = await user.getIdTokenResult();
        const businessId = idTokenResult.claims.businessId;
        if (!businessId) return;

        const batchRef = doc(db, 'businesses', businessId, 'batches', userId);
        const snapshot = await getDoc(batchRef);
        
        if (snapshot.exists()) {
            const data = snapshot.data();
            historyContainer.innerHTML = `
                <div class="history-item">
                    <div>
                        <div class="file-name">${data.lastFileProcessed || 'Unknown'}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            ${new Date(data.timestamp).toLocaleString()}
                        </div>
                    </div>
                    <span class="file-status ${data.status}">${data.status}</span>
                </div>
            `;
        }
    }
});

// Demo mode function (available globally)
window.enterDemoMode = function() {
    // Wait for Firebase to initialize, then create mock user
    if (window.firebase && window.firebase.auth) {
        const mockUser = {
            uid: 'demo-user',
            email: 'demo@example.com',
            emailVerified: true,
            isMock: true,
            isAdmin: false,
            getIdTokenResult: async () => ({
                claims: { businessId: 'demo-business', role: 'driver' }
            })
        };
        
        // Trigger the auth state change handler by calling initializeAppWithUser
        // This is a simplified version - in production you'd want proper auth flow
        const mainContent = document.getElementById('main-content');
        const loginSection = document.getElementById('login-section');
        const userInfo = document.getElementById('user-info');
        const landingPage = document.getElementById('landing-page');
        
        if (mainContent) mainContent.style.display = 'grid';
        if (loginSection) loginSection.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (landingPage) landingPage.style.display = 'none';
    }
};
