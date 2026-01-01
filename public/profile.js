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

    // Show testing helper if in emulator mode
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        const testingHelper = document.getElementById('testingHelper');
        if (testingHelper) {
            testingHelper.style.display = 'block';
            
            // Setup tab switching
            const guideTabs = document.querySelectorAll('.guide-tab');
            guideTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove active class from all tabs and contents
                    guideTabs.forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.guide-tab-content').forEach(content => {
                        content.classList.remove('active');
                    });
                    
                    // Add active class to clicked tab and corresponding content
                    tab.classList.add('active');
                    const tabId = tab.getAttribute('data-tab') + '-tab';
                    const tabContent = document.getElementById(tabId);
                    if (tabContent) {
                        tabContent.classList.add('active');
                    }
                });
            });
        }
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
        if (!user) {
            console.log('❌ checkAdminStatus: No user provided');
            return false;
        }
        
        console.log('🔍 [Profile] Checking admin status for:', user.email);
        
        try {
            // Check custom claims (secure, instant check)
            const idTokenResult = await user.getIdTokenResult(true); // Force refresh
            console.log('📋 [Profile] Token claims:', idTokenResult.claims);
            
            if (idTokenResult.claims.admin === true) {
                console.log('✅ [Profile] Admin status confirmed via custom claims');
                return true;
            }
            
            console.log('❌ [Profile] User is not an admin');
            return false;
        } catch (error) {
            console.error('❌ [Profile] Error checking admin status:', error);
            return false;
        }
    }

    // Authentication State
    onAuthStateChanged(auth, async (user) => {
        const isDemo = window.location.search.includes('demo=true') || sessionStorage.getItem('demo_mode') === 'true';
        
        if (user) {
            // ... existing auth logic ...
            // Multi-tenant: Get businessId from custom claims (Identity & Context Rule)
            const idTokenResult = await user.getIdTokenResult(true);
            window.businessId = idTokenResult.claims.businessId;
            console.log(`🏢 Profile context: ${window.businessId || 'None'}`);

            // Check if email is verified
            if (!user.emailVerified) {
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html?verify=true';
                }
                return;
            }
            // User is signed in and verified
            await loadProfileData(user);
            
            console.log('🔑 [Profile] User authenticated, checking admin status...');
            const isAdmin = await checkAdminStatus(user);
            console.log('👤 [Profile] Is admin?', isAdmin);
            
            if (isAdmin && adminLinkContainer) {
                console.log('✅ [Profile] Showing admin link');
                adminLinkContainer.style.display = 'inline';
            } else if (adminLinkContainer) {
                console.log('ℹ️ [Profile] User is not admin, hiding admin link');
                adminLinkContainer.style.display = 'none';
            }
        } else if (isDemo) {
            console.log('🌟 Profile: User is guest but in Demo Mode');
            await loadProfileData(null);
            
            // Show demo badge in header
            const headerH1 = document.querySelector('header h1');
            if (headerH1 && !document.getElementById('demo-badge')) {
                const badge = document.createElement('span');
                badge.id = 'demo-badge';
                badge.textContent = 'Demo Mode';
                badge.style.cssText = 'background: var(--warning-color); color: black; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; margin-left: 10px; text-transform: uppercase;';
                headerH1.parentElement.appendChild(badge);
            }
            
            // Unlock nav links for demo
            document.querySelectorAll('.nav-link').forEach(link => {
                if (link.href.includes('.html')) {
                    const url = new URL(link.href);
                    url.searchParams.set('demo', 'true');
                    link.href = url.toString();
                }
            });
            
            if (userInfo) userInfo.style.display = 'flex';
            if (adminLinkContainer) adminLinkContainer.style.display = 'inline'; // Show admin in demo
        } else {
            // User is signed out - redirect to login
            window.location.href = 'login.html';
        }
    });

    // Load profile data
    async function loadProfileData(user) {
        mainContent.style.display = 'grid';
        
        // --- DEMO MODE CHECK ---
        const isDemo = window.location.search.includes('demo=true');
        if (isDemo) {
            console.log('🌟 Profile in Demo Mode');
            userEmailDisplay.textContent = 'demo.executive@acme-global.com';
            avatarInitial.textContent = 'D';
            accountCreated.textContent = 'Account created: 01/01/2025';
            verificationStatus.textContent = '✓ Verified Enterprise Account';
            verificationStatus.style.color = 'var(--primary-color)';
            
            // Mock Stats
            document.getElementById('total-receipts').textContent = '1,284';
            document.getElementById('total-amount').textContent = '$42,950.20';
            document.getElementById('success-rate').textContent = '99.4%';
            document.getElementById('recent-activity').textContent = '12';
            
            // Mock History
            document.getElementById('receipt-history-container').innerHTML = `
                <div class="history-item">
                    <div class="history-details">
                        <div class="file-name">executive_travel_q4.pdf</div>
                        <div class="history-meta">
                            <span>Vendor: British Airways</span>
                            <span>Amount: $1,240.00</span>
                            <span>Category: Travel</span>
                        </div>
                    </div>
                    <span class="file-status complete">processed</span>
                </div>
            `;
            return; // Skip Firebase load
        }
        // -------------------------

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

    // Load receipt statistics from business silo (Silo Rule)
    async function loadReceiptStatistics(userId) {
        try {
            const businessId = window.businessId;
            if (!businessId) {
                console.warn('⚠️ No businessId found for user stats');
                return;
            }

            // Read from siloed users collection for fast statistics
            const userRef = doc(db, 'businesses', businessId, 'users', userId);
            const userSnap = await getDoc(userRef);
            
            // Also get activity data from the silo (replacing legacy batches)
            const activityRef = doc(db, 'businesses', businessId, 'activity', userId);
            const activitySnap = await getDoc(activityRef);

            let receiptsCount = 0;
            let totalAmountValue = 0;
            let successCount = 0;
            let errorCount = 0;
            let recentCount = 0;

            // Get statistics from siloed user doc
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

            // Get status information from activity log
            if (activitySnap.exists()) {
                const activityData = activitySnap.data();
                if (activityData.status === 'complete' || activityData.status === 'processed') {
                    successCount = 1;
                } else if (activityData.status === 'error') {
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

    // Load receipt history (Siloed)
    async function loadReceiptHistory(userId) {
        try {
            const businessId = window.businessId;
            if (!businessId) {
                console.warn('⚠️ No businessId found for user history');
                return;
            }

            // Read from siloed receipts collection (The Silo Rule)
            const receiptsRef = collection(db, 'businesses', businessId, 'receipts');
            const q = query(receiptsRef, where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(10));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                receiptHistoryContainer.innerHTML = '<p class="empty-state">No receipt history yet. Upload your first receipt to get started!</p>';
                return;
            }

            const historyItems = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                historyItems.push({
                    id: doc.id,
                    ...data
                });
            });

            // Display history
            receiptHistoryContainer.innerHTML = historyItems.map(item => `
                <div class="history-item">
                    <div class="history-details">
                        <div class="file-name">${item.fileName || 'Unknown'}</div>
                        <div class="history-meta">
                            ${item.vendorName ? `<span>Vendor: ${item.vendorName}</span>` : ''}
                            ${item.transactionDate ? `<span>Date: ${item.transactionDate}</span>` : ''}
                            ${item.totalAmount ? `<span>Amount: $${(item.totalAmount || 0).toFixed(2)}</span>` : ''}
                            ${item.category ? `<span>Category: ${item.category}</span>` : ''}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                            ${item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                        </div>
                    </div>
                    <span class="file-status ${item.status}">${item.status || 'unknown'}</span>
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