// Profile Page Logic

document.addEventListener('DOMContentLoaded', async () => {
    // Phase 1.2: Initialize translations first
    if (typeof translateUI === 'function') {
        translateUI();
    }

    // Check if Firebase is initialized
    if (!window.firebase) {
        console.error('Firebase not initialized. Please check your Firebase configuration.');
        return;
    }

    // Import Firebase modules
    const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const { 
        signOut, 
        onAuthStateChanged,
        updatePassword,
        reauthenticateWithCredential,
        EmailAuthProvider,
        sendEmailVerification
    } = authModule;
    const { doc, getDoc, collection, query, where, getDocs, orderBy, limit } = firestoreModule;

    const { auth, db } = window.firebase;

    // DOM Elements
    const mainContent = document.getElementById('main-content');
    const userEmailDisplay = document.getElementById('user-email-display');
    const accountCreated = document.getElementById('account-created');
    const verificationBadge = document.getElementById('verification-badge');
    const verificationStatus = document.getElementById('verification-status');
    const avatarInitial = document.getElementById('avatar-initial');
    const logoutBtn = document.getElementById('logout-btn');
    const backBtn = document.getElementById('back-btn');
    const totalReceipts = document.getElementById('total-receipts');
    const totalAmount = document.getElementById('total-amount');
    const successRate = document.getElementById('success-rate');
    const recentActivity = document.getElementById('recent-activity');
    const receiptHistoryContainer = document.getElementById('receipt-history-container');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const resendVerificationBtn = document.getElementById('resend-verification-btn');
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordForm = document.getElementById('change-password-form');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');
    const passwordError = document.getElementById('password-error');
    const adminLinkContainer = document.getElementById('admin-link-container');

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
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html?verify=true';
                }
                return;
            }
            // User is signed in and verified
            await loadProfileData(user);
            const isAdmin = await checkAdminStatus(user);
            if (isAdmin) {
                adminLinkContainer.style.display = 'inline';
            }
        } else {
            // User is signed out - redirect to login
            window.location.href = 'login.html';
        }
    });

    // Load profile data
    async function loadProfileData(user) {
        mainContent.style.display = 'grid';
        
        // Display user information
        userEmailDisplay.textContent = user.email;
        avatarInitial.textContent = user.email.charAt(0).toUpperCase();
        
        // Account creation date
        if (user.metadata.creationTime) {
            const createdDate = new Date(user.metadata.creationTime);
            accountCreated.textContent = `Account created: ${createdDate.toLocaleDateString()}`;
        }

        // Email verification status
        if (user.emailVerified) {
            verificationStatus.textContent = '✓ Email Verified';
            verificationStatus.style.color = 'var(--secondary-color)';
            resendVerificationBtn.style.display = 'none';
        } else {
            verificationStatus.textContent = '✗ Email Not Verified';
            verificationStatus.style.color = 'var(--error-color)';
            resendVerificationBtn.style.display = 'block';
        }

        // Show change password button only for email/password users
        if (user.providerData && user.providerData.length > 0) {
            const isEmailProvider = user.providerData.some(provider => provider.providerId === 'password');
            changePasswordBtn.style.display = isEmailProvider ? 'block' : 'none';
        }

        // Load receipt statistics
        await loadReceiptStatistics(user.uid);
        await loadReceiptHistory(user.uid);
    }

    // Load receipt statistics from /users collection (optimized)
    async function loadReceiptStatistics(userId) {
        try {
            // Read from /users collection for fast statistics
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            
            // Also get batch data for status information
            const batchRef = doc(db, 'batches', userId);
            const batchSnap = await getDoc(batchRef);

            let receiptsCount = 0;
            let totalAmountValue = 0;
            let successCount = 0;
            let errorCount = 0;
            let recentCount = 0;

            // Get statistics from /users collection (fast)
            if (userSnap.exists()) {
                const userData = userSnap.data();
                receiptsCount = userData.totalReceipts || 0;
                totalAmountValue = userData.totalAmount || 0;
                
                // Check if last receipt was recent (within last 7 days)
                if (userData.lastReceiptTimestamp) {
                    const receiptDate = new Date(userData.lastReceiptTimestamp);
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    if (receiptDate > sevenDaysAgo) {
                        recentCount = receiptsCount; // Approximate recent count
                    }
                }
            }

            // Get status information from batch
            if (batchSnap.exists()) {
                const batchData = batchSnap.data();
                if (batchData.status === 'complete') {
                    successCount = 1;
                } else if (batchData.status === 'error') {
                    errorCount = 1;
                }
            }

            // Update UI
            totalReceipts.textContent = receiptsCount;
            totalAmount.textContent = `$${totalAmountValue.toFixed(2)}`;
            
            // Calculate success rate (approximate based on latest status)
            const successRateValue = receiptsCount > 0 ? 
                (successCount > 0 ? 100 : (errorCount > 0 ? 0 : 100)) : 0;
            successRate.textContent = `${successRateValue}%`;
            
            recentActivity.textContent = recentCount;
        } catch (error) {
            console.error('Error loading receipt statistics:', error);
        }
    }

    // Load receipt history
    async function loadReceiptHistory(userId) {
        try {
            const batchRef = doc(db, 'batches', userId);
            const batchSnap = await getDoc(batchRef);

            if (!batchSnap.exists()) {
                receiptHistoryContainer.innerHTML = '<p class="empty-state">No receipt history yet. Upload your first receipt to get started!</p>';
                return;
            }

            const data = batchSnap.data();
            const historyItems = [];

            if (data.receiptData) {
                const receipt = data.receiptData;
                const status = data.status || 'unknown';
                const fileName = data.fileName || data.lastFileProcessed || 'Unknown';
                const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

                historyItems.push({
                    fileName,
                    status,
                    receipt,
                    timestamp
                });
            }

            if (historyItems.length === 0) {
                receiptHistoryContainer.innerHTML = '<p class="empty-state">No receipt history yet.</p>';
                return;
            }

            // Display history
            receiptHistoryContainer.innerHTML = historyItems.map(item => `
                <div class="history-item">
                    <div class="history-details">
                        <div class="file-name">${item.fileName}</div>
                        <div class="history-meta">
                            ${item.receipt.vendorName ? `<span>Vendor: ${item.receipt.vendorName}</span>` : ''}
                            ${item.receipt.transactionDate ? `<span>Date: ${item.receipt.transactionDate}</span>` : ''}
                            ${item.receipt.totalAmount ? `<span>Amount: $${item.receipt.totalAmount.toFixed(2)}</span>` : ''}
                            ${item.receipt.category ? `<span>Category: ${item.receipt.category}</span>` : ''}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                            ${item.timestamp.toLocaleString()}
                        </div>
                    </div>
                    <span class="file-status ${item.status}">${item.status}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading receipt history:', error);
            receiptHistoryContainer.innerHTML = '<p class="empty-state">Error loading receipt history.</p>';
        }
    }

    // Back button
    backBtn?.addEventListener('click', () => {
        window.location.href = '/index.html';
    });
    
    // Home link - ensure it works
    const homeLink = document.getElementById('home-link');
    homeLink?.addEventListener('click', (e) => {
        // Allow default navigation, but ensure it goes to the right place
        window.location.href = '/index.html';
        e.preventDefault(); // Prevent default, use our navigation
    });

    // Logout
    logoutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error signing out: ' + error.message);
        }
    });

    // Change Password
    changePasswordBtn?.addEventListener('click', () => {
        changePasswordModal.style.display = 'flex';
    });

    cancelPasswordBtn?.addEventListener('click', () => {
        changePasswordModal.style.display = 'none';
        changePasswordForm.reset();
        passwordError.style.display = 'none';
    });

    changePasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        passwordError.style.display = 'none';

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validation
        if (newPassword.length < 6) {
            passwordError.textContent = 'Password must be at least 6 characters long.';
            passwordError.style.display = 'block';
            return;
        }

        if (newPassword !== confirmPassword) {
            passwordError.textContent = 'New passwords do not match.';
            passwordError.style.display = 'block';
            return;
        }

        const user = auth.currentUser;
        if (!user || !user.email) {
            passwordError.textContent = 'User not found.';
            passwordError.style.display = 'block';
            return;
        }

        try {
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            alert('Password changed successfully!');
            changePasswordModal.style.display = 'none';
            changePasswordForm.reset();
        } catch (error) {
            console.error('Error changing password:', error);
            if (error.code === 'auth/wrong-password') {
                passwordError.textContent = 'Current password is incorrect.';
            } else if (error.code === 'auth/weak-password') {
                passwordError.textContent = 'Password is too weak.';
            } else {
                passwordError.textContent = 'Error: ' + error.message;
            }
            passwordError.style.display = 'block';
        }
    });

    // Resend verification email
    resendVerificationBtn?.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await sendEmailVerification(user);
            alert('Verification email sent! Please check your inbox.');
        } catch (error) {
            console.error('Error sending verification email:', error);
            alert('Error sending verification email: ' + error.message);
        }
    });
});