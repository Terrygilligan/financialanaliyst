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

    // Check if user is admin via custom claims
    async function checkAdminStatus(user) {
        if (!user) return false;
        
        // Get the ID token to check custom claims
        try {
            const idTokenResult = await user.getIdTokenResult();
            return idTokenResult.claims.admin === true;
        } catch (error) {
            console.error('Error checking admin status:', error);
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
            const isAdmin = await checkAdminStatus(user);
            const adminLinkContainer = document.getElementById('admin-link-container');
            if (isAdmin && adminLinkContainer) {
                adminLinkContainer.style.display = 'inline';
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

        // **Multi-Tenancy**: Get businessId from custom claims, force refresh if needed
        let idTokenResult = await user.getIdTokenResult();
        let businessId = idTokenResult.claims.businessId;

        // If businessId is missing, force a token refresh to get latest claims
        if (!businessId) {
            console.log("businessId claim missing, forcing token refresh...");
            idTokenResult = await user.getIdTokenResult(true); // Force refresh
            businessId = idTokenResult.claims.businessId;
        }

        if (!businessId) {
            console.error('User does not have a businessId claim. Cannot upload.');
            alert('Your account is not associated with a business. Please contact support.');
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

        // **Multi-Tenancy**: Generate unique filename and construct the new siloed path
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const driverId = user.uid;
        const filePath = `tenants/${businessId}/drivers/${driverId}/receipts/${fileName}`;
        const storageRef = ref(storage, filePath);

        // Show progress
        uploadProgress.style.display = 'block';
        progressFill.style.width = '0%';
        uploadStatus.textContent = 'Uploading...';

        try {
            const metadata = { contentType: file.type || 'image/jpeg' };
            const uploadTask = uploadBytesResumable(storageRef, file, metadata);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    progressFill.style.width = progress + '%';
                    uploadStatus.textContent = `Uploading... ${Math.round(progress)}%`;
                },
                (error) => {
                    console.error('Upload error:', error);
                    uploadStatus.textContent = 'Upload failed: ' + error.message;
                    uploadStatus.style.color = 'var(--error-color)';
                },
                async () => {
                    // Upload complete
                    uploadStatus.textContent = 'Upload complete! Processing...';
                    uploadStatus.style.color = 'var(--secondary-color)';
                    
                    // **Multi-Tenancy**: Create receipt document in the correct Firestore silo
                    const receiptId = fileName; // Use filename as receipt ID
                    const receiptRef = doc(db, `businesses/${businessId}/receipts/${receiptId}`);
                    await setDoc(receiptRef, {
                        status: 'processing',
                        driverId: driverId,
                        fileName: fileName,
                        filePath: filePath,
                        timestamp: new Date().toISOString()
                    }, { merge: true });

                    // **Multi-Tenancy**: Monitor status from the new siloed path
                    monitorBatchStatus(businessId, receiptId);
                }
            );
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file: ' + error.message);
        }
    }

    function monitorBatchStatus(businessId, receiptId) {
        const receiptRef = doc(db, `businesses/${businessId}/receipts/${receiptId}`);
        
        onSnapshot(receiptRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                updateStatusDisplay(data);
                updateHistory(businessId); // Refresh history when status changes
            }
        });
    }

    function updateStatusDisplay(data) {
        statusContainer.innerHTML = '';
        const fileName = data.fileName || 'receipt';

        if (data.status === 'processing') {
            statusContainer.innerHTML = `
                <div class="status-message processing">
                    <strong>Processing:</strong> ${fileName}
                    <p>Analyzing receipt with AI...</p>
                </div>
            `;
        } else if (data.status === 'complete') {
            statusContainer.innerHTML = `
                <div class="status-card">
                    <h3>✅ Processing Complete: ${fileName}</h3>
                    <div class="data-row">
                        <span class="data-label">Vendor:</span>
                        <span class="data-value">${data.vendorName || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Date:</span>
                        <span class="data-value">${data.transactionDate || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Amount:</span>
                        <span class="data-value">$${data.totalAmount?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Category:</span>
                        <span class="data-value">${data.category || 'N/A'}</span>
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

    async function updateHistory(businessId) {
        const receiptsRef = collection(db, `businesses/${businessId}/receipts`);
        const querySnapshot = await getDocs(receiptsRef);
        
        historyContainer.innerHTML = ''; // Clear existing history
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            historyContainer.innerHTML += `
                <div class="history-item">
                    <div>
                        <div class="file-name">${data.fileName || 'Unknown'}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            ${new Date(data.timestamp).toLocaleString()}
                        </div>
                    </div>
                    <span class="file-status ${data.status}">${data.status}</span>
                </div>
            `;
        });
    }

    // Initialize history on load
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const idTokenResult = await user.getIdTokenResult();
            const businessId = idTokenResult.claims.businessId;
            if (businessId) {
                updateHistory(businessId);
            }
        }
    });
});
