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

    // Check if user is admin via custom claims OR Firestore admins collection
    async function checkAdminStatus(user) {
        if (!user) {
            console.log('❌ checkAdminStatus: No user provided');
            return false;
        }
        
        console.log('🔍 Checking admin status for:', user.email);
        
        try {
            // Method 1: Check custom claims (preferred, faster)
            const idTokenResult = await user.getIdTokenResult(true); // Force refresh
            console.log('📋 Token claims:', idTokenResult.claims);
            
            if (idTokenResult.claims.admin === true) {
                console.log('✅ Admin status confirmed via custom claims');
                return true;
            }
            
            // Method 2: Check Firestore admins collection (fallback)
            console.log('🔍 Custom claims not found, checking Firestore admins collection...');
            const adminDoc = await getDoc(doc(db, 'admins', user.email));
            console.log('📄 Admin doc exists:', adminDoc.exists());
            
            if (adminDoc.exists()) {
                console.log('✅ Admin status confirmed via Firestore admins collection');
                return true;
            }
            
            console.log('❌ User is not an admin');
            return false;
        } catch (error) {
            console.error('❌ Error checking admin status:', error);
            return false;
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
            userInfo.style.display = 'flex';
            loginSection.style.display = 'none';
            mainContent.style.display = 'grid';
            loginModal.style.display = 'none';
            
            // Check admin status and show admin link
            console.log('🔑 User authenticated, checking admin status...');
            const isAdmin = await checkAdminStatus(user);
            console.log('👤 Is admin?', isAdmin);
            
            const adminLinkContainer = document.getElementById('admin-link-container');
            console.log('📦 Admin link container:', adminLinkContainer);
            
            if (isAdmin && adminLinkContainer) {
                console.log('✅ Showing admin link');
                adminLinkContainer.style.display = 'inline';
            } else if (!isAdmin) {
                console.log('ℹ️ User is not admin, hiding admin link');
                if (adminLinkContainer) {
                    adminLinkContainer.style.display = 'none';
                }
            }
        } else {
            // User is signed out - redirect to login page only if not already there
            if (!window.location.pathname.includes('login.html')) {
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
                    const batchRef = doc(db, 'batches', user.uid);
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
                    <p style="margin-top: 15px; color: var(--text-secondary);">
                        Data has been written to your Google Sheet.
                    </p>
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
        // This would fetch and display upload history
        // For now, we'll just show a placeholder
        const batchRef = doc(db, 'batches', userId);
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

    // Initialize history on load
    onAuthStateChanged(auth, (user) => {
        if (user) {
            updateHistory(user.uid);
        }
    });

    // Phase 1.2: Initialize translations
    if (typeof translateUI === 'function') {
        translateUI();
    }
});
