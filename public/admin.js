// Admin Dashboard Logic

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

    // Setup documentation tabs (always visible)
    const docTabs = document.querySelectorAll('.doc-tab');
    docTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all doc tabs and contents
            docTabs.forEach(t => {
                t.classList.remove('active');
                t.style.background = 'rgba(255, 255, 255, 0.2)';
                t.style.boxShadow = 'none';
                t.style.borderBottom = 'none';
            });
            document.querySelectorAll('.doc-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Add active class to clicked tab and show corresponding content
            tab.classList.add('active');
            tab.style.background = 'rgba(255, 255, 255, 0.3)';
            tab.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
            tab.style.borderBottom = '3px solid #ffd700';
            
            const tabId = tab.getAttribute('data-doc-tab') + '-doc-tab';
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.style.display = 'block';
            }
        });
    });

    // Import Firebase modules
    const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
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

    const { auth, db } = window.firebase;

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

    // Check if user is admin via custom claims OR Firestore admins collection
    async function checkAdminStatus(user) {
        if (!user) return false;
        
        try {
            // Method 1: Check custom claims (preferred, faster)
            const idTokenResult = await user.getIdTokenResult(true); // Force refresh to get latest claims
            if (idTokenResult.claims.admin === true) {
                console.log('Admin status confirmed via custom claims');
                return true;
            }
            
            // Method 2: Check Firestore admins collection (fallback)
            const adminDoc = await getDoc(doc(db, 'admins', user.email));
            if (adminDoc.exists()) {
                console.log('Admin status confirmed via Firestore admins collection');
                return true;
            }
            
            console.warn('User is not an admin:', user.email);
            return false;
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
            loadUsers()
        ]);
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

    // Load users (with statistics from /users collection)
    async function loadUsers() {
        try {
            usersContainer.innerHTML = '<div class="loading-state">Loading users...</div>';
            
            // Get users from /users collection (has statistics)
            const usersRef = collection(db, 'users');
            const usersSnap = await getDocs(usersRef);
            
            // Also get batch data for status
            const batchesRef = collection(db, 'batches');
            const batchesSnap = await getDocs(batchesRef);
            
            const userMap = new Map();
            
            // Add users from /users collection
            usersSnap.forEach((docSnap) => {
                const userId = docSnap.id;
                const userData = docSnap.data();
                userMap.set(userId, {
                    userId,
                    receiptCount: userData.totalReceipts || 0,
                    totalAmount: userData.totalAmount || 0,
                    lastActivity: userData.lastReceiptTimestamp || userData.lastUpdated || null,
                    status: 'active'
                });
            });
            
            // Update with batch status
            batchesSnap.forEach((docSnap) => {
                const userId = docSnap.id;
                const batchData = docSnap.data();
                
                if (!userMap.has(userId)) {
                    userMap.set(userId, {
                        userId,
                        receiptCount: 0,
                        totalAmount: 0,
                        lastActivity: batchData.timestamp || null,
                        status: batchData.status || 'unknown'
                    });
                }
                
                const user = userMap.get(userId);
                if (batchData.status) {
                    user.status = batchData.status;
                }
                if (batchData.timestamp) {
                    const timestamp = new Date(batchData.timestamp);
                    if (!user.lastActivity || timestamp > new Date(user.lastActivity)) {
                        user.lastActivity = batchData.timestamp;
                    }
                }
            });

            allUsersData = Array.from(userMap.values());
            displayUsers(allUsersData);
        } catch (error) {
            console.error('Error loading users:', error);
            usersContainer.innerHTML = '<div class="error-state">Error loading users.</div>';
        }
    }
    
    // Display users with search filter
    function displayUsers(users) {
        const searchTerm = document.getElementById('search-users')?.value.toLowerCase() || '';
        
        let filtered = users;
        if (searchTerm) {
            filtered = users.filter(user => 
                user.userId.toLowerCase().includes(searchTerm)
            );
        }
        
        if (filtered.length === 0) {
            usersContainer.innerHTML = '<div class="empty-state">No users found.</div>';
            return;
        }
        
        // Sort by last activity (most recent first)
        filtered.sort((a, b) => {
            if (!a.lastActivity) return 1;
            if (!b.lastActivity) return -1;
            return new Date(b.lastActivity) - new Date(a.lastActivity);
        });

        usersContainer.innerHTML = `
            <div class="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Receipts</th>
                            <th>Total Amount</th>
                            <th>Last Activity</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(user => `
                            <tr>
                                <td class="user-id-cell">${user.userId.substring(0, 12)}...</td>
                                <td>${user.receiptCount}</td>
                                <td>$${(user.totalAmount || 0).toFixed(2)}</td>
                                <td>${user.lastActivity ? new Date(user.lastActivity).toLocaleString() : 'N/A'}</td>
                                <td><span class="file-status ${user.status}">${user.status}</span></td>
                                <td>
                                    <button class="btn-small btn-secondary" onclick="disableUser('${user.userId}')" title="Disable user account">
                                        Disable
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Disable user account (placeholder - requires Cloud Function)
    window.disableUser = async function(userId) {
        if (!confirm(`Are you sure you want to disable user ${userId.substring(0, 8)}...?`)) {
            return;
        }
        
        // TODO: Implement Cloud Function to disable user
        alert('User disable functionality requires a Cloud Function. This is a placeholder.');
        console.log('Would disable user:', userId);
    }

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
            alert('Error signing out: ' + error.message);
        }
    });
});
