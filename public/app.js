// public/app.js

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.firebase) {
        console.error('Firebase not initialized.');
        return;
    }

    const { onAuthStateChanged, signOut } = window.firebase.authModule;
    const { ref, uploadBytesResumable } = window.firebase.storageModule;
    const { doc, setDoc, onSnapshot } = window.firebase.firestoreModule;

    const auth = window.firebase.auth;
    const storage = window.firebase.storage;
    const db = window.firebase.db;

    // --- State Variables ---
    let currentBusinessId = null;

    // --- DOM Elements ---
    const logoutBtn = document.getElementById('logout-btn');
    const mainContent = document.getElementById('main-content');
    const userInfo = document.getElementById('user-info');
    const loginSection = document.getElementById('login-section');
    const fileInput = document.getElementById('file-input');
    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const uploadStatus = document.getElementById('upload-status');
    const statusContainer = document.getElementById('status-container');
    const historyContainer = document.getElementById('history-container');
    const adminLinkContainer = document.getElementById('admin-link-container');

    // --- Authentication ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (!user.emailVerified) {
                window.location.href = 'login.html?verify=true';
                return;
            }

            try {
                const idTokenResult = await user.getIdTokenResult(true); // Force refresh
                currentBusinessId = idTokenResult.claims.businessId;
                const isAdmin = idTokenResult.claims.admin === true;

                if (!currentBusinessId) {
                    throw new Error("Business ID not found in user claims.");
                }

                // UI setup for logged-in user
                userInfo.style.display = 'flex';
                loginSection.style.display = 'none';
                mainContent.style.display = 'grid';
                if (isAdmin && adminLinkContainer) {
                    adminLinkContainer.style.display = 'inline';
                }

                // Start listening for data
                monitorBatchStatus(user.uid, currentBusinessId);

            } catch (error) {
                console.error("Auth error:", error);
                alert("Could not verify your business credentials. Please log in again.");
                await signOut(auth);
            }
        } else {
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });

    logoutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error signing out.');
        }
    });

    // --- File Upload ---
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    async function handleFileUpload(file) {
        const user = auth.currentUser;
        if (!user || !currentBusinessId) {
            alert('Please login first.');
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            alert('File size must be less than 20MB.');
            return;
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const filePath = `tenants/${currentBusinessId}/receipts/${user.uid}/${fileName}`;
        const storageRef = ref(storage, filePath);
        const metadata = { contentType: file.type || 'image/jpeg' };

        uploadProgress.style.display = 'block';
        uploadStatus.textContent = 'Uploading...';

        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressFill.style.width = progress + '%';
                uploadStatus.textContent = `Uploading... ${Math.round(progress)}%`;
            },
            (error) => {
                uploadStatus.textContent = 'Upload failed: ' + error.message;
                uploadStatus.style.color = 'var(--error-color)';
            },
            () => {
                uploadStatus.textContent = 'Upload complete! Processing...';
                // Firestore status is updated by the backend, which we monitor via onSnapshot
            }
        );
    }

    // --- Firestore Data Monitoring ---
    function monitorBatchStatus(userId, businessId) {
        const batchRef = doc(db, `businesses/${businessId}/batches`, userId);
        
        onSnapshot(batchRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                updateStatusDisplay(data);
                updateHistory(data);
            }
        });
    }

    function updateStatusDisplay(data) {
        statusContainer.innerHTML = ''; // Clear previous status
        const fileName = data.lastFileProcessed || data.errorFile || 'your receipt';

        if (data.status === 'processing') {
            statusContainer.innerHTML = `
                <div class="status-message processing">
                    <strong>Processing:</strong> ${fileName}
                    <p>Analyzing with AI...</p>
                </div>`;
        } else if (data.status === 'complete') {
            const receiptData = data.receiptData || {};
            statusContainer.innerHTML = `
                <div class="status-card">
                    <h3>✅ Processing Complete: ${fileName}</h3>
                    <p>Vendor: ${receiptData.vendorName || 'N/A'}</p>
                    <p>Date: ${receiptData.transactionDate || 'N/A'}</p>
                    <p>Amount: $${receiptData.totalAmount?.toFixed(2) || 'N/A'}</p>
                    <p>Category: ${receiptData.category || 'N/A'}</p>
                </div>`;
        } else if (data.status === 'error') {
            statusContainer.innerHTML = `
                <div class="status-message error">
                    <strong>Error processing:</strong> ${fileName}
                    <p>${data.errorMessage || 'Unknown error'}</p>
                </div>`;
        }
    }

    function updateHistory(data) {
        historyContainer.innerHTML = `
            <div class="history-item">
                <div>
                    <div class="file-name">${data.lastFileProcessed || 'Upload'}</div>
                    <div class="timestamp">${new Date(data.timestamp).toLocaleString()}</div>
                </div>
                <span class="file-status ${data.status}">${data.status}</span>
            </div>`;
    }
});
