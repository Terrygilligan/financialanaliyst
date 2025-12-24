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
    
    // Bug Fix: Add defensive checks for assignment modal buttons
    // Ensure buttons exist before attaching listeners (they're in hidden modal)
    const assignmentModalCloseBtn = document.getElementById('assignment-modal-close-btn');
    const closeAssignmentModalBtn = document.getElementById('close-assignment-modal-btn');
    const assignUsersBtn = document.getElementById('assign-users-btn');
    const assignEntityBtn = document.getElementById('assign-entity-btn');
    
    if (assignmentModalCloseBtn) {
        assignmentModalCloseBtn.addEventListener('click', hideAssignmentModal);
    } else {
        console.warn('[Admin Sheets] assignment-modal-close-btn not found');
    }
    
    if (closeAssignmentModalBtn) {
        closeAssignmentModalBtn.addEventListener('click', hideAssignmentModal);
    } else {
        console.warn('[Admin Sheets] close-assignment-modal-btn not found');
    }
    
    if (assignUsersBtn) {
        assignUsersBtn.addEventListener('click', assignSelectedUsers);
    } else {
        console.warn('[Admin Sheets] assign-users-btn not found');
    }
    
    if (assignEntityBtn) {
        assignEntityBtn.addEventListener('click', assignSelectedEntity);
    } else {
        console.warn('[Admin Sheets] assign-entity-btn not found');
    }
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Phase 4: Mode switching (existing vs create new sheet)
    document.getElementsByName('sheet-mode').forEach(radio => {
        radio.addEventListener('change', handleModeChange);
    });
    
    // Phase 4: Auto-share button
    document.getElementById('auto-share-btn').addEventListener('click', handleAutoShare);
    
    // Guide tabs toggle
    const toggleGuidesBtn = document.getElementById('toggle-guides-btn');
    const guidesContent = document.getElementById('guides-content');
    const guidesToggleText = document.getElementById('guides-toggle-text');
    
    if (toggleGuidesBtn && guidesContent) {
        toggleGuidesBtn.addEventListener('click', () => {
            const isVisible = guidesContent.style.display !== 'none';
            guidesContent.style.display = isVisible ? 'none' : 'block';
            guidesToggleText.textContent = isVisible ? 'Show Guides' : 'Hide Guides';
        });
        
        // Setup guide tab switching
        document.querySelectorAll('.guide-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs and contents
                document.querySelectorAll('.guide-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.guide-tab-content').forEach(c => {
                    c.style.display = 'none';
                    c.classList.remove('active');
                });
                
                // Add active to clicked tab
                tab.classList.add('active');
                const tabName = tab.getAttribute('data-guide-tab');
                const tabContent = document.getElementById(tabName + '-guide');
                if (tabContent) {
                    tabContent.style.display = 'block';
                    tabContent.classList.add('active');
                }
            });
        });
    }
});

/**
 * Check if user is admin via custom claims OR Firestore admins collection
 */
async function checkAdminStatus(user) {
    if (!user) {
        console.log('[Admin Sheets] ❌ No user provided');
        return false;
    }
    
    console.log('[Admin Sheets] 🔍 Checking admin status for:', user.email);
    
    try {
        // Method 1: Check custom claims (preferred, faster)
        const idTokenResult = await user.getIdTokenResult(true); // Force refresh
        console.log('[Admin Sheets] 📋 Token claims:', idTokenResult.claims);
        
        if (idTokenResult.claims.admin === true) {
            console.log('[Admin Sheets] ✅ Admin status confirmed via custom claims');
            return true;
        }
        
        // Method 2: Check Firestore admins collection (fallback)
        console.log('[Admin Sheets] 🔍 Custom claims not found, checking Firestore admins collection...');
        const { getDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const adminDoc = await getDoc(doc(db, 'admins', user.email));
        console.log('[Admin Sheets] 📄 Admin doc exists:', adminDoc.exists());
        
        if (adminDoc.exists()) {
            console.log('[Admin Sheets] ✅ Admin status confirmed via Firestore admins collection');
            return true;
        }
        
        console.log('[Admin Sheets] ❌ User is not an admin');
        return false;
    } catch (error) {
        console.error('[Admin Sheets] ❌ Error checking admin status:', error);
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
    const modal = document.getElementById('sheet-assignment-modal');
    if (!modal) {
        console.error('[Admin Sheets] Assignment modal not found');
        return;
    }
    
    modal.style.display = 'flex';
    
    // Bug Fix: Re-attach event listeners when modal is shown (defensive)
    // This ensures listeners work even if buttons were created dynamically
    const assignUsersBtn = document.getElementById('assign-users-btn');
    const assignEntityBtn = document.getElementById('assign-entity-btn');
    const closeBtn = document.getElementById('close-assignment-modal-btn');
    const headerCloseBtn = document.getElementById('assignment-modal-close-btn'); // X button in header
    
    if (assignUsersBtn && !assignUsersBtn.dataset.listenerAttached) {
        assignUsersBtn.addEventListener('click', assignSelectedUsers);
        assignUsersBtn.dataset.listenerAttached = 'true';
    }
    
    if (assignEntityBtn && !assignEntityBtn.dataset.listenerAttached) {
        assignEntityBtn.addEventListener('click', assignSelectedEntity);
        assignEntityBtn.dataset.listenerAttached = 'true';
    }
    
    if (closeBtn && !closeBtn.dataset.listenerAttached) {
        closeBtn.addEventListener('click', hideAssignmentModal);
        closeBtn.dataset.listenerAttached = 'true';
    }
    
    if (headerCloseBtn && !headerCloseBtn.dataset.listenerAttached) {
        headerCloseBtn.addEventListener('click', hideAssignmentModal);
        headerCloseBtn.dataset.listenerAttached = 'true';
    }
}

function hideAssignmentModal() {
    const modal = document.getElementById('sheet-assignment-modal');
    if (modal) {
        modal.style.display = 'none';
    }
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
                    <button onclick="saveAsTemplate('${config.id}')" class="btn-secondary" title="Save as template for reuse">💾 Save Template</button>
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
    
    // Show modal first so elements are in DOM
    showConfigModal();
    
    // Reset to "existing" mode by default (after modal is shown)
    setTimeout(() => {
        const existingRadio = document.querySelector('input[name="sheet-mode"][value="existing"]');
        if (existingRadio) {
            existingRadio.checked = true;
            handleModeChange({ target: existingRadio });
        }
    }, 100);
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
    
    // Bug Fix: Complete editConfig implementation - load all fields and set mode correctly
    // Show modal first so form elements are in DOM and visible
    showConfigModal();
    
    // Set title and populate form fields
    document.getElementById('modal-title').textContent = 'Edit Sheet Configuration';
    document.getElementById('config-name').value = config.name;
    document.getElementById('config-sheet-id').value = config.sheetId;
    document.getElementById('config-main-tab').value = config.config?.mainTabName || '';
    document.getElementById('config-accountant-tab').value = config.config?.accountantTabName || '';
    document.getElementById('config-default').checked = config.isDefault || false;
    document.getElementById('verification-result').style.display = 'none';
    
    // Set mode to "existing" since we're editing an existing sheet
    // Use setTimeout to ensure modal is fully rendered before setting mode
    setTimeout(() => {
        const existingRadio = document.querySelector('input[name="sheet-mode"][value="existing"]');
        if (existingRadio) {
            existingRadio.checked = true;
            handleModeChange({ target: existingRadio });
        }
    }, 100);
}

/**
 * Verify sheet health
 */
async function verifySheet() {
    const mode = document.querySelector('input[name="sheet-mode"]:checked')?.value;
    
    // If creating new sheet, can't verify yet
    if (mode === 'create') {
        alert('Please create the sheet first, then you can verify it.');
        return;
    }
    
    const sheetIdInput = document.getElementById('config-sheet-id').value.trim();
    const sheetId = extractSheetId(sheetIdInput);
    
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
    const sheetIdInput = document.getElementById('config-sheet-id').value.trim();
    const sheetId = extractSheetId(sheetIdInput);
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
 * Extract sheet ID from URL or return as-is if already an ID
 * Handles formats like:
 * - https://docs.google.com/spreadsheets/d/SHEET_ID/edit
 * - SHEET_ID/edit?gid=0#gid=0
 * - SHEET_ID
 */
function extractSheetId(input) {
    if (!input) return '';
    
    const trimmed = input.trim();
    
    // If it's already just an ID (no slashes, no query params), return as-is
    if (!trimmed.includes('/') && !trimmed.includes('?') && !trimmed.includes('#')) {
        return trimmed;
    }
    
    // Try to extract from Google Sheets URL
    const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
        return urlMatch[1];
    }
    
    // Try to extract from partial URL (just the ID part before /edit)
    const idMatch = trimmed.match(/^([a-zA-Z0-9-_]+)(?:\/|$)/);
    if (idMatch) {
        return idMatch[1];
    }
    
    // If all else fails, try to get the first part before any special characters
    const firstPart = trimmed.split(/[\/\?#]/)[0];
    if (firstPart && firstPart.length > 10) {
        return firstPart;
    }
    
    return trimmed; // Fallback: return as-is
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

/**
 * Phase 4: Handle mode change (existing vs create new sheet)
 */
function handleModeChange(e) {
    const mode = e.target.value;
    const existingFields = document.getElementById('existing-sheet-fields');
    const createInfo = document.getElementById('create-sheet-info');
    const sheetIdInput = document.getElementById('config-sheet-id');
    const verifyBtn = document.getElementById('verify-sheet-btn');
    
    if (!existingFields || !sheetIdInput || !verifyBtn) {
        console.warn('[Admin Sheets] Some form elements not found');
        return;
    }
    
    const openSheetBtn = document.getElementById('open-sheet-btn');
    
    if (mode === 'create') {
        // Hide existing sheet fields, show create info
        existingFields.style.display = 'none';
        if (createInfo) {
            createInfo.style.display = 'block';
        }
        sheetIdInput.removeAttribute('required');
        verifyBtn.disabled = true;
        verifyBtn.title = 'Create the sheet first to verify';
        if (openSheetBtn) openSheetBtn.style.display = 'none';
    } else {
        // Show existing sheet fields, hide create info
        existingFields.style.display = 'block';
        if (createInfo) {
            createInfo.style.display = 'none';
        }
        sheetIdInput.setAttribute('required', 'required');
        verifyBtn.disabled = false;
        verifyBtn.title = '';
        // Show open sheet button if sheet ID is entered
        if (openSheetBtn) {
            openSheetBtn.style.display = sheetIdInput.value.trim() ? 'inline-block' : 'none';
        }
    }
    
    // Update open sheet button visibility when sheet ID changes
    if (sheetIdInput && openSheetBtn) {
        sheetIdInput.addEventListener('input', () => {
            if (mode !== 'create') {
                openSheetBtn.style.display = sheetIdInput.value.trim() ? 'inline-block' : 'none';
            }
        });
    }
}

/**
 * Phase 4: Handle auto-share button click
 */
async function handleAutoShare() {
    const sheetIdInput = document.getElementById('config-sheet-id');
    const sheetId = sheetIdInput.value.trim();
    const resultDiv = document.getElementById('share-result');
    const shareBtn = document.getElementById('auto-share-btn');
    
    if (!sheetId) {
        alert('Please enter a Google Sheet ID first');
        sheetIdInput.focus();
        return;
    }
    
    // Show loading state
    shareBtn.disabled = true;
    shareBtn.classList.add('btn-loading');
    resultDiv.style.display = 'block';
    resultDiv.className = 'share-result loading';
    resultDiv.textContent = '🔄 Sharing sheet with service account...';
    
    try {
        const shareSheetWithService = httpsCallable(functions, 'shareSheetWithService');
        const result = await shareSheetWithService({ sheetId });
        
        console.log('[Admin Sheets] Share result:', result.data);
        
        // Show success
        resultDiv.className = 'share-result success';
        resultDiv.innerHTML = '✅ Sheet shared successfully!<br><small>Service account now has editor access</small>';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error('[Admin Sheets] Share error:', error);
        
        // Show error with helpful guidance
        resultDiv.className = 'share-result error';
        
        let errorMessage = escapeHtml(error.message);
        let guidance = '';
        
        if (error.message.includes('Permission denied') || error.message.includes('owner')) {
            guidance = `
                <div style="margin-top: 10px; padding: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 4px;">
                    <strong>Manual Sharing Required:</strong><br>
                    1. Open the Google Sheet<br>
                    2. Click "Share" button<br>
                    3. Add: <code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 3px;">financial-output@financialanaliyst.iam.gserviceaccount.com</code><br>
                    4. Set permission to "Editor"<br>
                    5. Click "Send"
                </div>
            `;
        }
        
        resultDiv.innerHTML = `❌ Failed to share sheet automatically<br><small>${errorMessage}</small>${guidance}`;
    } finally {
        // Reset button state
        shareBtn.disabled = false;
        shareBtn.classList.remove('btn-loading');
    }
}

/**
 * Phase 4: Update saveSheetConfig to handle sheet creation
 */
const originalSaveSheetConfig = saveSheetConfig;
async function saveSheetConfig(e) {
    e.preventDefault();
    
    const mode = document.querySelector('input[name="sheet-mode"]:checked').value;
    const name = document.getElementById('config-name').value.trim();
    const mainTab = document.getElementById('config-main-tab').value.trim();
    const accountantTab = document.getElementById('config-accountant-tab').value.trim();
    const isDefault = document.getElementById('config-default').checked;
    
    if (!name) {
        alert('Name is required');
        return;
    }
    
    // Phase 4: Handle sheet creation mode
    if (mode === 'create') {
        await handleCreateNewSheet(name, mainTab, accountantTab, isDefault);
    } else {
        // Existing mode - use original logic
        const sheetIdInput = document.getElementById('config-sheet-id').value.trim();
        const sheetId = extractSheetId(sheetIdInput);
        
        if (!sheetId) {
            alert('Sheet ID is required');
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
                // Create new with existing sheet
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
}

/**
 * Phase 4: Create new Google Sheet
 */
async function handleCreateNewSheet(name, mainTab, accountantTab, isDefault) {
    const submitBtn = document.querySelector('#sheet-config-form button[type="submit"]');
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    
    try {
        // Get Google OAuth access token from current user
        let googleAccessToken = null;
        const user = auth.currentUser;
        
        if (user) {
            // Check if user signed in with Google
            const providerData = user.providerData.find(p => p.providerId === 'google.com');
            if (providerData) {
                // User signed in with Google - get OAuth token
                try {
                    // Get the OAuth credential from Firebase Auth
                    // Note: Firebase Auth doesn't directly expose Google OAuth token
                    // We'll need to request it via a Cloud Function that exchanges the ID token
                    console.log('[Admin Sheets] User signed in with Google, requesting OAuth token...');
                } catch (tokenError) {
                    console.warn('[Admin Sheets] Could not get Google OAuth token:', tokenError);
                }
            }
        }
        
        const createNewGoogleSheet = httpsCallable(functions, 'createNewGoogleSheet');
        
        const result = await createNewGoogleSheet({
            sheetName: name,
            accountantTabName: accountantTab || 'Accountant_CSV_Ready',
            isDefault,
            googleAccessToken: googleAccessToken, // Pass OAuth token if available
            config: {
                mainTabName: mainTab || undefined,
                accountantTabName: accountantTab || undefined,
                createTabsIfMissing: true,
                headerRow: 1
            }
        });
        
        console.log('[Admin Sheets] Sheet created:', result.data);
        
        hideConfigModal();
        await loadSheetConfigs();
        
        showSuccessMessage('✨ New Google Sheet created and configured successfully!');
        
        // Show the sheet link
        if (result.data.sheetConfig && result.data.sheetConfig.sheetId) {
            setTimeout(() => {
                if (confirm('Sheet created! Would you like to open it in a new tab?')) {
                    openSheet(result.data.sheetConfig.sheetId);
                }
            }, 500);
        }
        
    } catch (error) {
        console.error('[Admin Sheets] Error creating sheet:', error);
        alert('Failed to create new sheet: ' + error.message);
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-loading');
        submitBtn.textContent = originalText;
    }
}

/**
 * Save configuration as template
 */
async function saveAsTemplate(configId) {
    const config = currentSheetConfigs.find(c => c.id === configId);
    if (!config) {
        alert('Config not found');
        return;
    }
    
    const templateName = prompt('Enter a name for this template:', config.name + ' Template');
    if (!templateName) return;
    
    try {
        // Save to localStorage (could also save to Firestore for persistence)
        const templates = JSON.parse(localStorage.getItem('sheetTemplates') || '[]');
        const template = {
            id: Date.now().toString(),
            name: templateName,
            savedAt: new Date().toISOString(),
            config: {
                name: config.name,
                mainTabName: config.config?.mainTabName || '',
                accountantTabName: config.config?.accountantTabName || 'Accountant_CSV_Ready',
                isDefault: config.isDefault || false
            }
        };
        
        templates.push(template);
        localStorage.setItem('sheetTemplates', JSON.stringify(templates));
        
        alert('✅ Template saved! You can load it from "Load Template" button.');
    } catch (error) {
        console.error('[Admin Sheets] Error saving template:', error);
        alert('Failed to save template: ' + error.message);
    }
}

/**
 * Show template selection modal
 */
function showTemplateModal() {
    const templates = JSON.parse(localStorage.getItem('sheetTemplates') || '[]');
    
    if (templates.length === 0) {
        alert('No saved templates found. Save a template by clicking "💾 Save Template" on any sheet configuration.');
        return;
    }
    
    // Create modal HTML
    const modalHtml = `
        <div id="template-modal" class="modal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📋 Load Template</h2>
                    <button class="modal-close" onclick="document.getElementById('template-modal').style.display='none'">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <p>Select a template to load:</p>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${templates.map(t => `
                            <div style="padding: 15px; margin: 10px 0; background: #f5f5f5; border-radius: 8px; cursor: pointer; border: 2px solid transparent;" 
                                 onmouseover="this.style.borderColor='#667eea'" 
                                 onmouseout="this.style.borderColor='transparent'"
                                 onclick="loadTemplate('${t.id}')">
                                <h4 style="margin: 0 0 5px 0;">${escapeHtml(t.name)}</h4>
                                <p style="margin: 0; font-size: 12px; color: #666;">
                                    Saved: ${new Date(t.savedAt).toLocaleString()}<br>
                                    Main Tab: ${escapeHtml(t.config.mainTabName || 'Auto-detect')}<br>
                                    Accountant Tab: ${escapeHtml(t.config.accountantTabName || 'Accountant_CSV_Ready')}
                                </p>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <button onclick="clearAllTemplates()" class="btn-danger" style="float: right;">🗑️ Clear All Templates</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existing = document.getElementById('template-modal');
    if (existing) existing.remove();
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Load template into form
 */
function loadTemplate(templateId) {
    const templates = JSON.parse(localStorage.getItem('sheetTemplates') || '[]');
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
        alert('Template not found');
        return;
    }
    
    // Close modal
    document.getElementById('template-modal').style.display = 'none';
    
    // Show create modal
    showCreateModal();
    
    // Populate form with template data
    document.getElementById('config-name').value = template.config.name;
    document.getElementById('config-main-tab').value = template.config.mainTabName || '';
    document.getElementById('config-accountant-tab').value = template.config.accountantTabName || 'Accountant_CSV_Ready';
    document.getElementById('config-default').checked = template.config.isDefault || false;
    
    // Set to "Use Existing Sheet" mode (templates don't include sheet IDs)
    document.querySelector('input[name="sheet-mode"][value="existing"]').checked = true;
    handleModeChange({ target: document.querySelector('input[name="sheet-mode"][value="existing"]') });
    
    alert('✅ Template loaded! Enter a Sheet ID to use this configuration.');
}

/**
 * Clear all templates
 */
function clearAllTemplates() {
    if (confirm('Are you sure you want to delete all saved templates?')) {
        localStorage.removeItem('sheetTemplates');
        document.getElementById('template-modal').style.display = 'none';
        alert('✅ All templates cleared.');
    }
}

// Make functions globally accessible for onclick handlers
window.editConfig = editConfig;
window.deleteConfig = deleteConfig;
window.checkHealth = checkHealth;
window.openSheet = openSheet;
window.openAssignmentModal = openAssignmentModal;
/**
 * Show manual sharing instructions
 */
function showManualShareInstructions() {
    const instructions = `
📋 Manual Sharing Instructions:

1. Open your Google Sheet in a new tab
2. Click the "Share" button (top right)
3. In the "Add people and groups" field, enter:
   financial-output@financialanaliyst.iam.gserviceaccount.com
4. Set permission to "Editor"
5. Uncheck "Notify people" (service accounts don't need notifications)
6. Click "Share"

✅ The service account will then have access to write to your sheet.
    `;
    
    alert(instructions);
}

window.saveAsTemplate = saveAsTemplate;
window.loadTemplate = loadTemplate;
window.clearAllTemplates = clearAllTemplates;
/**
 * Open sheet from input field
 */
function openSheetFromInput() {
    const sheetIdInput = document.getElementById('config-sheet-id').value.trim();
    const sheetId = extractSheetId(sheetIdInput);
    if (sheetId) {
        openSheet(sheetId);
    } else {
        alert('Please enter a Sheet ID first');
    }
}

window.showManualShareInstructions = showManualShareInstructions;
window.openSheetFromInput = openSheetFromInput;

