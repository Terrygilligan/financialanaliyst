// public/admin-sheets.js
// Phase 4: Multi-Sheet Management - Admin UI Logic

let currentConfigId = null;
let currentSheetConfigs = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Admin Sheets] Initializing...');
    
    // Show loading state
    showLoading();
    
    // Check authentication and admin status
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            console.log('[Admin Sheets] No user, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('[Admin Sheets] User authenticated:', user.email);
        
        const isAdmin = await checkAdminStatus(user);
        if (!isAdmin) {
            console.log('[Admin Sheets] User is not admin, showing access denied');
            showAccessDenied();
            return;
        }
        
        console.log('[Admin Sheets] Admin verified, loading sheet configs');
        hideLoading();
        showMainContent();
        
        // Load sheet configurations
        await loadSheetConfigs();
    });
    
    // Event listeners
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('create-sheet-btn').addEventListener('click', showCreateModal);
    document.getElementById('cancel-btn').addEventListener('click', hideConfigModal);
    document.getElementById('modal-close-btn').addEventListener('click', hideConfigModal);
    document.getElementById('verify-sheet-btn').addEventListener('click', verifySheet);
    document.getElementById('sheet-config-form').addEventListener('submit', saveSheetConfig);
    document.getElementById('assignment-modal-close-btn').addEventListener('click', hideAssignmentModal);
    document.getElementById('close-assignment-modal-btn').addEventListener('click', hideAssignmentModal);
    document.getElementById('assign-users-btn').addEventListener('click', assignSelectedUsers);
    document.getElementById('assign-entity-btn').addEventListener('click', assignSelectedEntity);
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
});

/**
 * Check if user is admin
 */
async function checkAdminStatus(user) {
    try {
        const idTokenResult = await user.getIdTokenResult(true);
        return idTokenResult.claims.admin === true;
    } catch (error) {
        console.error('[Admin Sheets] Error checking admin status:', error);
        return false;
    }
}

/**
 * UI State Management
 */
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('access-denied').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showAccessDenied() {
    hideLoading();
    document.getElementById('access-denied').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
}

function showMainContent() {
    document.getElementById('access-denied').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
}

function showConfigModal() {
    document.getElementById('sheet-config-modal').style.display = 'flex';
}

function hideConfigModal() {
    document.getElementById('sheet-config-modal').style.display = 'none';
    document.getElementById('verification-result').style.display = 'none';
}

function showAssignmentModal() {
    document.getElementById('sheet-assignment-modal').style.display = 'flex';
}

function hideAssignmentModal() {
    document.getElementById('sheet-assignment-modal').style.display = 'none';
}

/**
 * Load all sheet configurations
 */
async function loadSheetConfigs() {
    console.log('[Admin Sheets] Loading sheet configs...');
    
    const getSheetConfigurations = httpsCallable(functions, 'getSheetConfigurations');
    
    try {
        const result = await getSheetConfigurations();
        currentSheetConfigs = result.data.configs;
        
        console.log(`[Admin Sheets] Loaded ${currentSheetConfigs.length} configs`);
        displaySheetConfigs(currentSheetConfigs);
    } catch (error) {
        console.error('[Admin Sheets] Error loading configs:', error);
        alert('Failed to load sheet configurations: ' + error.message);
    }
}

/**
 * Display sheet configurations
 */
function displaySheetConfigs(configs) {
    const listContainer = document.getElementById('sheets-list');
    
    if (configs.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <p>📋 No sheet configurations found.</p>
                <p>Create your first sheet configuration to get started!</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = configs.map(config => {
        const stats = config.stats || { totalReceipts: 0 };
        const lastReceipt = stats.lastReceiptAt ? new Date(stats.lastReceiptAt).toLocaleString() : 'Never';
        
        return `
            <div class="sheet-config-card">
                <div class="sheet-config-header">
                    <h3>${escapeHtml(config.name)}</h3>
                    ${config.isDefault ? '<span class="badge-default">Default</span>' : ''}
                    <span class="badge-status badge-${config.status}">${config.status}</span>
                </div>
                <div class="sheet-config-body">
                    <p><strong>Sheet ID:</strong> <code>${escapeHtml(config.sheetId)}</code></p>
                    <p><strong>Main Tab:</strong> ${escapeHtml(config.config?.mainTabName || 'Auto-detect')}</p>
                    <p><strong>Accountant Tab:</strong> ${escapeHtml(config.config?.accountantTabName || 'Accountant_CSV_Ready')}</p>
                    <p><strong>Total Receipts:</strong> ${stats.totalReceipts}</p>
                    <p><strong>Last Receipt:</strong> ${lastReceipt}</p>
                    <p><strong>Created:</strong> ${new Date(config.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="sheet-config-actions">
                    <button onclick="editConfig('${config.id}')" class="btn-secondary">✏️ Edit</button>
                    <button onclick="openAssignmentModal('${config.id}', '${escapeHtml(config.name)}')" class="btn-secondary">👥 Assign</button>
                    <button onclick="checkHealth('${config.id}', '${escapeHtml(config.sheetId)}')" class="btn-secondary">🔍 Health</button>
                    <button onclick="openSheet('${escapeHtml(config.sheetId)}')" class="btn-secondary">📊 Open Sheet</button>
                    <button onclick="deleteConfig('${config.id}')" class="btn-danger">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Show create modal
 */
function showCreateModal() {
    currentConfigId = null;
    document.getElementById('modal-title').textContent = 'Create Sheet Configuration';
    document.getElementById('sheet-config-form').reset();
    document.getElementById('verification-result').style.display = 'none';
    showConfigModal();
}

/**
 * Edit config
 */
async function editConfig(configId) {
    currentConfigId = configId;
    const config = currentSheetConfigs.find(c => c.id === configId);
    
    if (!config) {
        alert('Config not found');
        return;
    }
    
    document.getElementById('modal-title').textContent = 'Edit Sheet Configuration';
    document.getElementById('config-name').value = config.name;
    document.getElementById('config-sheet-id').value = config.sheetId;
    document.getElementById('config-main-tab').value = config.config?.mainTabName || '';
    document.getElementById('config-accountant-tab').value = config.config?.accountantTabName || '';
    document.getElementById('config-default').checked = config.isDefault || false;
    document.getElementById('verification-result').style.display = 'none';
    
    showConfigModal();
}

/**
 * Verify sheet health
 */
async function verifySheet() {
    const sheetId = document.getElementById('config-sheet-id').value;
    
    if (!sheetId) {
        alert('Please enter a Sheet ID first');
        return;
    }
    
    const checkSheetHealth = httpsCallable(functions, 'checkSheetHealth');
    const resultDiv = document.getElementById('verification-result');
    
    resultDiv.style.display = 'block';
    resultDiv.className = 'verification-result';
    resultDiv.innerHTML = '<div class="spinner"></div><p>Verifying sheet...</p>';
    
    try {
        const result = await checkSheetHealth({ sheetId });
        const health = result.data.healthStatus;
        
        if (health.accessible && health.tabsExist) {
            resultDiv.className = 'verification-result success';
            resultDiv.innerHTML = `
                <p>✅ Sheet is accessible and configured correctly!</p>
                <p>✅ Service account has proper permissions</p>
                <p>✅ Sheet tabs found</p>
            `;
        } else {
            resultDiv.className = 'verification-result error';
            resultDiv.innerHTML = `
                <p>❌ Sheet verification failed</p>
                <p><strong>Error:</strong> ${escapeHtml(health.errorMessage || 'Unknown error')}</p>
                <p>Make sure the sheet is shared with: <code>financial-output@financialanaliyst.iam.gserviceaccount.com</code></p>
            `;
        }
    } catch (error) {
        resultDiv.className = 'verification-result error';
        resultDiv.innerHTML = `<p>❌ Verification error: ${escapeHtml(error.message)}</p>`;
    }
}

/**
 * Save sheet config
 */
async function saveSheetConfig(e) {
    e.preventDefault();
    
    const name = document.getElementById('config-name').value.trim();
    const sheetId = document.getElementById('config-sheet-id').value.trim();
    const mainTab = document.getElementById('config-main-tab').value.trim();
    const accountantTab = document.getElementById('config-accountant-tab').value.trim();
    const isDefault = document.getElementById('config-default').checked;
    
    if (!name || !sheetId) {
        alert('Name and Sheet ID are required');
        return;
    }
    
    const configData = {
        name,
        sheetId,
        isDefault,
        config: {
            mainTabName: mainTab || undefined,
            accountantTabName: accountantTab || undefined,
            createTabsIfMissing: true,
            headerRow: 1
        },
        assignedTo: { type: 'all' },
        status: 'active'
    };
    
    try {
        if (currentConfigId) {
            // Update existing
            const updateSheetConfiguration = httpsCallable(functions, 'updateSheetConfiguration');
            await updateSheetConfiguration({ configId: currentConfigId, updates: configData });
            console.log('[Admin Sheets] Config updated');
        } else {
            // Create new
            const createSheetConfiguration = httpsCallable(functions, 'createSheetConfiguration');
            await createSheetConfiguration(configData);
            console.log('[Admin Sheets] Config created');
        }
        
        hideConfigModal();
        await loadSheetConfigs();
        
        showSuccessMessage(currentConfigId ? 'Configuration updated successfully!' : 'Configuration created successfully!');
    } catch (error) {
        console.error('[Admin Sheets] Error saving config:', error);
        alert('Failed to save configuration: ' + error.message);
    }
}

/**
 * Delete config
 */
async function deleteConfig(configId) {
    const config = currentSheetConfigs.find(c => c.id === configId);
    
    if (!config) {
        alert('Config not found');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete "${config.name}"?\n\nThis will deactivate the configuration but won't delete historical data.`)) {
        return;
    }
    
    const deleteSheetConfiguration = httpsCallable(functions, 'deleteSheetConfiguration');
    
    try {
        await deleteSheetConfiguration({ configId });
        console.log('[Admin Sheets] Config deleted');
        await loadSheetConfigs();
        showSuccessMessage('Configuration deleted successfully!');
    } catch (error) {
        console.error('[Admin Sheets] Error deleting config:', error);
        alert('Failed to delete configuration: ' + error.message);
    }
}

/**
 * Check sheet health
 */
async function checkHealth(configId, sheetId) {
    const checkSheetHealth = httpsCallable(functions, 'checkSheetHealth');
    
    try {
        const result = await checkSheetHealth({ sheetId });
        const health = result.data.healthStatus;
        
        if (health.accessible && health.tabsExist) {
            alert('✅ Sheet is healthy and accessible!\n\n✓ Service account has permissions\n✓ Sheet tabs exist');
        } else {
            alert(`❌ Sheet health check failed:\n\n${health.errorMessage || 'Unknown error'}\n\nMake sure the sheet is shared with:\nfinancial-output@financialanaliyst.iam.gserviceaccount.com`);
        }
    } catch (error) {
        alert('❌ Health check error: ' + error.message);
    }
}

/**
 * Open sheet in new tab
 */
function openSheet(sheetId) {
    window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, '_blank');
}

/**
 * Open assignment modal
 */
async function openAssignmentModal(configId, configName) {
    currentConfigId = configId;
    document.getElementById('assign-sheet-name').textContent = configName;
    showAssignmentModal();
    
    // Switch to first tab
    switchTab('assign-users');
    
    // Load users and entities
    await loadUsersAndEntities();
    await loadCurrentAssignments(configId);
}

/**
 * Load users and entities for assignment
 */
async function loadUsersAndEntities() {
    try {
        // Load all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return `<option value="${doc.id}">${data.email || doc.id}</option>`;
        }).join('');
        
        // Load all entities
        const entitiesSnapshot = await getDocs(collection(db, 'entities'));
        const entitySelect = document.getElementById('entity-select');
        entitySelect.innerHTML = '<option value="">-- Select an entity --</option>' + 
            entitiesSnapshot.docs.map(doc => {
                const data = doc.data();
                return `<option value="${doc.id}">${data.name || doc.id}</option>`;
            }).join('');
            
        console.log('[Admin Sheets] Loaded users and entities for assignment');
    } catch (error) {
        console.error('[Admin Sheets] Error loading users/entities:', error);
        alert('Failed to load users and entities: ' + error.message);
    }
}

/**
 * Load current assignments
 */
async function loadCurrentAssignments(configId) {
    const getSheetConfigAssignments = httpsCallable(functions, 'getSheetConfigAssignments');
    
    try {
        const result = await getSheetConfigAssignments({ configId });
        const { users, entities } = result.data;
        
        const usersListDiv = document.getElementById('assigned-users-list');
        const entitiesListDiv = document.getElementById('assigned-entities-list');
        
        usersListDiv.innerHTML = users.length > 0 
            ? users.map(u => `<div class="assignment-item">👤 ${escapeHtml(u.email || u.uid)}</div>`).join('')
            : '<p class="empty-text">No users assigned</p>';
        
        entitiesListDiv.innerHTML = entities.length > 0
            ? entities.map(e => `<div class="assignment-item">🏢 ${escapeHtml(e.name || e.id)}</div>`).join('')
            : '<p class="empty-text">No entities assigned</p>';
            
        console.log(`[Admin Sheets] Loaded assignments: ${users.length} users, ${entities.length} entities`);
    } catch (error) {
        console.error('[Admin Sheets] Error loading assignments:', error);
        document.getElementById('assigned-users-list').innerHTML = '<p class="error-text">Failed to load assignments</p>';
        document.getElementById('assigned-entities-list').innerHTML = '<p class="error-text">Failed to load assignments</p>';
    }
}

/**
 * Assign selected users
 */
async function assignSelectedUsers() {
    const userSelect = document.getElementById('user-select');
    const selectedOptions = Array.from(userSelect.selectedOptions);
    
    if (selectedOptions.length === 0) {
        alert('Please select at least one user');
        return;
    }
    
    const userIds = selectedOptions.map(opt => opt.value);
    
    if (!confirm(`Assign ${userIds.length} user(s) to this sheet?`)) {
        return;
    }
    
    const bulkAssignUsersToSheet = httpsCallable(functions, 'bulkAssignUsersToSheet');
    
    try {
        const result = await bulkAssignUsersToSheet({ 
            userIds, 
            sheetConfigId: currentConfigId 
        });
        
        console.log('[Admin Sheets] Bulk assign result:', result.data);
        showSuccessMessage(`Assigned ${result.data.successful} users successfully!`);
        
        // Reload assignments
        await loadCurrentAssignments(currentConfigId);
    } catch (error) {
        console.error('[Admin Sheets] Error assigning users:', error);
        alert('Failed to assign users: ' + error.message);
    }
}

/**
 * Assign selected entity
 */
async function assignSelectedEntity() {
    const entitySelect = document.getElementById('entity-select');
    const entityId = entitySelect.value;
    
    if (!entityId) {
        alert('Please select an entity');
        return;
    }
    
    const entityName = entitySelect.options[entitySelect.selectedIndex].text;
    
    if (!confirm(`Assign "${entityName}" to this sheet?\n\nAll users in this entity will use this sheet.`)) {
        return;
    }
    
    const assignSheetConfigToEntity = httpsCallable(functions, 'assignSheetConfigToEntity');
    
    try {
        await assignSheetConfigToEntity({ 
            entityId, 
            sheetConfigId: currentConfigId 
        });
        
        console.log('[Admin Sheets] Entity assigned');
        showSuccessMessage('Entity assigned successfully!');
        
        // Reload assignments
        await loadCurrentAssignments(currentConfigId);
    } catch (error) {
        console.error('[Admin Sheets] Error assigning entity:', error);
        alert('Failed to assign entity: ' + error.message);
    }
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const tabContent = document.getElementById(tabName);
    
    if (tabBtn && tabContent) {
        tabBtn.classList.add('active');
        tabContent.style.display = 'block';
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-toast';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Logout
 */
async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('[Admin Sheets] Logout error:', error);
        alert('Logout failed: ' + error.message);
    }
}

// Make functions globally accessible for onclick handlers
window.editConfig = editConfig;
window.deleteConfig = deleteConfig;
window.checkHealth = checkHealth;
window.openSheet = openSheet;
window.openAssignmentModal = openAssignmentModal;

