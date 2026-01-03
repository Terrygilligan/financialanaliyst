// Admin Dashboard Logic

document.addEventListener('DOMContentLoaded', async () => {
    // Check if Firebase is initialized
    if (!window.firebase) {
        console.error('Firebase not initialized. Please check your Firebase configuration.');
        return;
    }

    // Import Firebase modules
    const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const functionsModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
    
    const { signOut, onAuthStateChanged } = authModule;
    const { 
        doc, 
        getDoc, 
        collection, 
        getDocs, 
        query, 
        where,
        orderBy,
        limit 
    } = firestoreModule;
    const { getFunctions, httpsCallable } = functionsModule;

    const { auth, db } = window.firebase;
    const functions = getFunctions();

    // DOM Elements
    const mainContent = document.getElementById('admin-content');
    const accessDenied = document.getElementById('access-denied');
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const totalReceiptsAdmin = document.getElementById('total-receipts-admin');
    const successfulReceipts = document.getElementById('successful-receipts');
    const failedReceipts = document.getElementById('failed-receipts');
    const activeUsers = document.getElementById('active-users');
    const totalAmountAdmin = document.getElementById('total-amount-admin');
    const successRateAdmin = document.getElementById('success-rate-admin');
    const receiptsTableContainer = document.getElementById('receipts-table-container');
    const errorLogsContainer = document.getElementById('error-logs-container');
    const usersContainer = document.getElementById('users-container');
    const auditLogContainer = document.getElementById('audit-log-container');
    const searchReceipts = document.getElementById('search-receipts');
    const filterStatus = document.getElementById('filter-status');
    const refreshReceipts = document.getElementById('refresh-receipts');

    let allReceiptsData = [];
    let allUsersData = [];
    let categoryChart = null;
    let statusChart = null;
    
    // Tab management
    const tabButtons = document.querySelectorAll('.tab-btn');
    let currentTab = 'errors'; // Default to errors tab

    // Check if user is admin via custom claims
    async function checkAdminStatus(user) {
        if (!user) return false;
        
        // Get the ID token to check custom claims
        try {
            const idTokenResult = await user.getIdTokenResult(true); // Force refresh to get latest claims
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
                window.location.href = 'login.html?verify=true';
                return;
            }

            // Check admin status
            const isAdmin = await checkAdminStatus(user);
            if (!isAdmin) {
                accessDenied.style.display = 'block';
                mainContent.style.display = 'none';
                return;
            }

            // User is admin
            userInfo.style.display = 'flex';
            accessDenied.style.display = 'none';
            mainContent.style.display = 'grid';
            
            // Load admin data
            await loadAdminData();
        } else {
            // User is signed out - redirect to login
            window.location.href = 'login.html';
        }
    });

    // Load all admin data
    async function loadAdminData() {
        await Promise.all([
            loadStatistics(),
            loadAllReceipts(),
            loadErrorLogs(),
            loadUsers(),
            loadAuditLogs()
        ]);
    }

    // --- Audit Log ---

    async function loadAuditLogs() {
        try {
            auditLogContainer.innerHTML = '<div class="loading-state">Loading logs...</div>';
            const businessId = 'global'; // Or from user claims
            const logsRef = collection(db, `businesses/${businessId}/audit_logs`);
            const q = query(logsRef, orderBy('timestamp', 'desc'), limit(20));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                auditLogContainer.innerHTML = '<div class="empty-state">No recent activity found.</div>';
                return;
            }

            const logs = querySnapshot.docs.map(doc => formatLogEntry(doc.data()));
            auditLogContainer.innerHTML = `<div class="timeline">${logs.join('')}</div>`;

        } catch (error) {
            console.error('Error loading audit logs:', error);
            auditLogContainer.innerHTML = '<div class="error-state">Failed to load activity logs.</div>';
        }
    }

    function formatLogEntry(log) {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const actor = log.actorEmail || 'An admin';
        const target = log.targetEmail || 'a user';
        let message = '';
        let color = '';

        switch (log.action) {
            case 'set_role':
                message = `${actor} changed ${target}'s role from <strong>${log.details.oldRole}</strong> to <strong>${log.details.newRole}</strong>.`;
                color = 'blue';
                break;
            case 'revoke_access':
                message = `${actor} revoked access for ${target}.`;
                color = 'red';
                break;
            case 'save_schema':
                message = `${actor} saved a new schema: <strong>${log.details.schemaName}</strong>.`;
                color = 'green';
                break;
            default:
                message = `${actor} performed action: ${log.action}.`;
                color = 'grey';
        }

        return `
            <div class="timeline-item">
                <div class="timeline-dot timeline-${color}"></div>
                <div class="timeline-content">
                    <span class="timeline-time">${time}</span>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }

    // Load statistics
    async function loadStatistics() {
        try {
            const batchesRef = collection(db, 'batches');
            const batchesSnap = await getDocs(batchesRef);

            let totalReceipts = 0;
            let successful = 0;
            let failed = 0;
            let totalAmount = 0;
            const userIds = new Set();
            const categoryCounts = {};
            const statusCounts = {};

            batchesSnap.forEach((docSnap) => {
                const data = docSnap.data();
                const userId = docSnap.id;
                
                userIds.add(userId);
                totalReceipts++;

                // Count status
                const status = data.status || 'unknown';
                statusCounts[status] = (statusCounts[status] || 0) + 1;

                if (status === 'complete') {
                    successful++;
                    if (data.receiptData && data.receiptData.totalAmount) {
                        totalAmount += data.receiptData.totalAmount;
                    }
                    // Count categories
                    if (data.receiptData && data.receiptData.category) {
                        const category = data.receiptData.category;
                        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                    }
                } else if (status === 'error') {
                    failed++;
                }
            });

            // Update UI
            totalReceiptsAdmin.textContent = totalReceipts;
            successfulReceipts.textContent = successful;
            failedReceipts.textContent = failed;
            activeUsers.textContent = userIds.size;
            totalAmountAdmin.textContent = `$${totalAmount.toFixed(2)}`;
            
            const successRate = totalReceipts > 0 ? Math.round((successful / totalReceipts) * 100) : 0;
            successRateAdmin.textContent = `${successRate}%`;

            // Update charts
            updateCategoryChart(categoryCounts);
            updateStatusChart(statusCounts);
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    // Update category chart
    function updateCategoryChart(categoryCounts) {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        const labels = Object.keys(categoryCounts);
        const data = Object.values(categoryCounts);

        if (categoryChart) {
            categoryChart.destroy();
        }

        categoryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#4285f4',
                        '#34a853',
                        '#fbbc04',
                        '#ea4335',
                        '#9aa0a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }

    // Update status chart
    function updateStatusChart(statusCounts) {
        const ctx = document.getElementById('status-chart');
        if (!ctx) return;

        const labels = Object.keys(statusCounts);
        const data = Object.values(statusCounts);

        if (statusChart) {
            statusChart.destroy();
        }

        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#34a853', // complete
                        '#fbbc04', // processing
                        '#ea4335'  // error
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }

    // Load all receipts
    async function loadAllReceipts() {
        try {
            receiptsTableContainer.innerHTML = '<div class="loading-state">Loading receipts...</div>';
            
            const batchesRef = collection(db, 'batches');
            const batchesSnap = await getDocs(batchesRef);

            allReceiptsData = [];
            batchesSnap.forEach((docSnap) => {
                const data = docSnap.data();
                allReceiptsData.push({
                    userId: docSnap.id,
                    ...data
                });
            });

            displayReceipts(allReceiptsData);
        } catch (error) {
            console.error('Error loading receipts:', error);
            receiptsTableContainer.innerHTML = '<div class="error-state">Error loading receipts.</div>';
        }
    }

    // Display receipts with filtering
    function displayReceipts(receipts) {
        const searchTerm = searchReceipts.value.toLowerCase();
        const statusFilter = filterStatus.value;

        let filtered = receipts.filter(receipt => {
            // Tab filter (errors tab shows only errors and processing)
            if (currentTab === 'errors') {
                if (receipt.status !== 'error' && receipt.status !== 'processing') {
                    return false;
                }
            }

            // Search filter
            if (searchTerm) {
                const matchesSearch = 
                    (receipt.fileName && receipt.fileName.toLowerCase().includes(searchTerm)) ||
                    (receipt.receiptData && receipt.receiptData.vendorName && 
                     receipt.receiptData.vendorName.toLowerCase().includes(searchTerm)) ||
                    receipt.userId.toLowerCase().includes(searchTerm);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (statusFilter !== 'all' && receipt.status !== statusFilter) {
                return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            receiptsTableContainer.innerHTML = '<div class="empty-state">No receipts found.</div>';
            return;
        }

        // Sort by timestamp (newest first)
        filtered.sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
        });

        receiptsTableContainer.innerHTML = `
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>File Name</th>
                            <th>Vendor</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(receipt => {
                            const receiptData = receipt.receiptData || {};
                            const timestamp = receipt.timestamp ? new Date(receipt.timestamp).toLocaleString() : 'N/A';
                            const filePath = receipt.errorFile || `receipts/${receipt.userId}/${receipt.fileName || receipt.lastFileProcessed || 'unknown'}`;
                            const storageUrl = `https://console.firebase.google.com/project/financialanaliyst/storage/${filePath}`;
                            
                            return `
                                <tr>
                                    <td class="user-id-cell">${receipt.userId.substring(0, 8)}...</td>
                                    <td>
                                        ${receipt.fileName || receipt.lastFileProcessed || 'N/A'}
                                        ${receipt.status === 'error' ? `<br><a href="${storageUrl}" target="_blank" class="storage-link" title="View in Firebase Storage">📁 View File</a>` : ''}
                                    </td>
                                    <td>${receiptData.vendorName || 'N/A'}</td>
                                    <td>${receiptData.transactionDate || 'N/A'}</td>
                                    <td>${receiptData.totalAmount ? `$${receiptData.totalAmount.toFixed(2)}` : 'N/A'}</td>
                                    <td>${receiptData.category || 'N/A'}</td>
                                    <td><span class="file-status ${receipt.status}">${receipt.status || 'unknown'}</span></td>
                                    <td>${timestamp}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Load error logs
    async function loadErrorLogs() {
        try {
            errorLogsContainer.innerHTML = '<div class="loading-state">Loading error logs...</div>';
            
            const batchesRef = collection(db, 'batches');
            const batchesSnap = await getDocs(batchesRef);

            const errors = [];
            batchesSnap.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.status === 'error') {
                    errors.push({
                        userId: docSnap.id,
                        fileName: data.fileName || data.lastFileProcessed || 'Unknown',
                        errorMessage: data.errorMessage || 'Unknown error',
                        timestamp: data.timestamp || new Date().toISOString()
                    });
                }
            });

            if (errors.length === 0) {
                errorLogsContainer.innerHTML = '<div class="empty-state">No errors found. Great job! 🎉</div>';
                return;
            }

            // Sort by timestamp (newest first)
            errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            errorLogsContainer.innerHTML = errors.map(error => {
                const filePath = `receipts/${error.userId}/${error.fileName}`;
                const storageUrl = `https://console.firebase.google.com/project/financialanaliyst/storage/${filePath}`;
                
                return `
                <div class="error-log-item">
                    <div class="error-header">
                        <strong>User:</strong> ${error.userId.substring(0, 8)}...
                        <span class="error-time">${new Date(error.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="error-file">
                        <strong>File:</strong> ${error.fileName}
                        <a href="${storageUrl}" target="_blank" class="storage-link" title="View in Firebase Storage">📁 View File</a>
                    </div>
                    <div class="error-message"><strong>Error:</strong> ${error.errorMessage}</div>
                </div>
            `;
            }).join('');
        } catch (error) {
            console.error('Error loading error logs:', error);
            errorLogsContainer.innerHTML = '<div class="error-state">Error loading error logs.</div>';
        }
    }

    // Load users using the 'listUsers' Cloud Function
    async function loadUsers() {
        try {
            usersContainer.innerHTML = '<div class="loading-state">Loading users...</div>';
            const listUsers = httpsCallable(functions, 'listUsers');
            const result = await listUsers();
            if (result.data.success) {
                allUsersData = result.data.users;
                displayUsers(allUsersData);
            } else {
                throw new Error('Failed to list users.');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            usersContainer.innerHTML = `<div class="error-state">Error loading users: ${error.message}</div>`;
        }
    }
    
    // Display users with updated actions
    function displayUsers(users) {
        const searchTerm = document.getElementById('search-users')?.value.toLowerCase() || '';
        
        let filtered = users;
        if (searchTerm) {
            filtered = users.filter(user => 
                (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                (user.displayName && user.displayName.toLowerCase().includes(searchTerm)) ||
                user.uid.toLowerCase().includes(searchTerm)
            );
        }
        
        if (filtered.length === 0) {
            usersContainer.innerHTML = '<div class="empty-state">No users found.</div>';
            return;
        }
        
        // Sort by creation time (newest first)
        filtered.sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime));

        usersContainer.innerHTML = `
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Last Signed In</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(user => `
                            <tr class="${user.disabled ? 'disabled-user' : ''}">
                                <td>${user.email || 'N/A'}</td>
                                <td><span class="user-role ${user.role}">${user.role}</span></td>
                                <td><span class="user-status ${user.disabled ? 'disabled' : 'active'}">${user.disabled ? 'Disabled' : 'Active'}</span></td>
                                <td>${new Date(user.creationTime).toLocaleDateString()}</td>
                                <td>${user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleString() : 'N/A'}</td>
                                <td class="actions-cell">
                                    ${user.role !== 'admin' ? `<button class="btn-small" onclick="window.handleRoleChange('${user.uid}', 'admin')">Promote to Admin</button>` : ''}
                                    ${user.role === 'admin' ? `<button class="btn-small btn-secondary" onclick="window.handleRoleChange('${user.uid}', 'user')">Demote to User</button>` : ''}
                                    <button class="btn-small btn-danger" onclick="window.handleRevokeAccess('${user.uid}')" ${user.disabled ? 'disabled' : ''}>Revoke Access</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // --- Action Handlers ---

    window.handleRoleChange = async function(uid, newRole) {
        if (!confirm(`Are you sure you want to change this user to ${newRole}?`)) return;
        
        showLoading(`Updating role to ${newRole}...`);
        try {
            const setRole = httpsCallable(functions, 'setRole');
            await setRole({ uid, role: newRole });

            // Force refresh of the current admin's token to get updated claims if needed
            await auth.currentUser.getIdToken(true);
            showSuccess('Role updated successfully. Refreshing user list...');

            await loadUsers(); // Refresh the list
        } catch (error) {
            console.error('Error setting role:', error);
            showError(`Failed to set role: ${error.message}`);
        }
    };

    window.handleRevokeAccess = async function(uid) {
        if (!confirm('Are you sure you want to revoke access for this user? This action cannot be undone.')) return;

        showLoading('Revoking access...');
        try {
            const revokeAccess = httpsCallable(functions, 'revokeAccess');
            await revokeAccess({ uid });

            await auth.currentUser.getIdToken(true);
            showSuccess('User access revoked. Refreshing user list...');

            await loadUsers(); // Refresh the list
        } catch (error) {
            console.error('Error revoking access:', error);
            showError(`Failed to revoke access: ${error.message}`);
        }
    };

    // --- Invite Admin Modal ---
    const inviteAdminBtn = document.getElementById('invite-admin-btn');
    const inviteAdminModal = document.getElementById('invite-admin-modal');
    const closeBtn = document.querySelector('.close-button');
    const inviteAdminForm = document.getElementById('invite-admin-form');

    inviteAdminBtn?.addEventListener('click', () => {
        inviteAdminModal.style.display = 'block';
    });

    closeBtn?.addEventListener('click', () => {
        inviteAdminModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == inviteAdminModal) {
            inviteAdminModal.style.display = 'none';
        }
    });

    inviteAdminForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        showLoading('Processing invitation...');

        try {
            // 1. Get user UID from email
            const getUserByEmail = httpsCallable(functions, 'getUserByEmail');
            const userResult = await getUserByEmail({ email });

            if (!userResult.data.success) {
                throw new Error(userResult.data.message || 'User not found.');
            }

            const uid = userResult.data.uid;

            // 2. Set role to admin
            const setRole = httpsCallable(functions, 'setRole');
            await setRole({ uid, role: 'admin' });

            showSuccess(`User ${email} is now an admin. Refreshing user list...`);
            inviteAdminModal.style.display = 'none';
            await loadUsers();
        } catch (error) {
            console.error('Error inviting admin:', error);
            showError(`Failed to invite admin: ${error.message}`);
        }
    });

    // --- Simple Notification System ---
    const notification = document.createElement('div');
    notification.id = 'notification';
    document.body.appendChild(notification);

    function showNotification(message, type = 'info') {
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    function showLoading(message) { showNotification(message, 'info'); }
    function showSuccess(message) { showNotification(message, 'success'); }
    function showError(message) { showNotification(message, 'error'); }

    // Event listeners
    searchReceipts?.addEventListener('input', () => {
        displayReceipts(allReceiptsData);
    });

    filterStatus?.addEventListener('change', () => {
        displayReceipts(allReceiptsData);
    });

    refreshReceipts?.addEventListener('click', async () => {
        await loadAllReceipts();
    });
    
    const refreshUsers = document.getElementById('refresh-users');
    refreshUsers?.addEventListener('click', async () => {
        await loadUsers();
    });
    
    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            displayReceipts(allReceiptsData);
        });
    });
    
    // User search
    const searchUsers = document.getElementById('search-users');
    searchUsers?.addEventListener('input', () => {
        displayUsers(allUsersData);
    });

    logoutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
            showError(`Error signing out: ${error.message}`);
        }
    });
});
