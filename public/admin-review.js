// Admin Review Interface Logic (Phase 2.6)

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

const auth = window.auth;
const db = window.db;
const functions = window.functions;

// DOM Elements
const loadingEl = document.getElementById('loading');
const emptyStateEl = document.getElementById('empty-state');
const reviewQueueEl = document.getElementById('review-queue');
const reviewModal = document.getElementById('review-modal');
const closeModalBtn = document.getElementById('close-modal');
const adminReviewForm = document.getElementById('admin-review-form');
const approveBtn = document.getElementById('approve-btn');
const rejectBtn = document.getElementById('reject-btn');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');
const searchFilter = document.getElementById('search-filter');
const sortFilter = document.getElementById('sort-filter');

// Stats
const pendingCountEl = document.getElementById('pending-count');
const todayCountEl = document.getElementById('today-count');
const totalValueEl = document.getElementById('total-value');

let receiptsData = [];
let unsubscribeListener = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Phase 1.2: Initialize translations
    if (typeof translateUI === 'function') {
        translateUI();
    }

    // Check authentication and admin status
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '/';
            return;
        }

        // Verify admin status
        const isAdmin = await checkAdminStatus(user);
        if (!isAdmin) {
            alert('Access denied. Admin privileges required.');
            window.location.href = '/';
            return;
        }

        // Load review queue
        loadReviewQueue(user);
    });

    // Event listeners
    logoutBtn?.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = '/';
        });
    });

    closeModalBtn?.addEventListener('click', () => {
        reviewModal.style.display = 'none';
    });

    refreshBtn?.addEventListener('click', () => {
        location.reload();
    });

    searchFilter?.addEventListener('input', () => {
        filterAndDisplayReceipts();
    });

    sortFilter?.addEventListener('change', () => {
        filterAndDisplayReceipts();
    });

    adminReviewForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await approveReceipt();
    });

    rejectBtn?.addEventListener('click', async () => {
        await rejectReceipt();
    });
});

/**
 * Check if user has admin privileges
 */
async function checkAdminStatus(user) {
    try {
        const tokenResult = await user.getIdTokenResult();
        return tokenResult.claims.admin === true;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

/**
 * Load review queue from Firestore
 */
function loadReviewQueue(user) {
    const q = query(
        collection(db, 'pending_receipts'),
        where('status', '==', 'needs_admin_review'),
        orderBy('createdAt', 'desc')
    );

    // Real-time listener
    unsubscribeListener = onSnapshot(q, (snapshot) => {
        receiptsData = [];
        snapshot.forEach((doc) => {
            receiptsData.push({
                id: doc.id,
                ...doc.data()
            });
        });

        updateStats();
        filterAndDisplayReceipts();
        
        // Hide loading, show appropriate state
        loadingEl.style.display = 'none';
        if (receiptsData.length === 0) {
            emptyStateEl.style.display = 'block';
            reviewQueueEl.style.display = 'none';
        } else {
            emptyStateEl.style.display = 'none';
            reviewQueueEl.style.display = 'block';
        }
    }, (error) => {
        console.error('Error loading review queue:', error);
        loadingEl.style.display = 'none';
        alert('Error loading review queue. Please refresh the page.');
    });
}

/**
 * Update statistics
 */
function updateStats() {
    const total = receiptsData.length;
    pendingCountEl.textContent = total;

    // Count today's receipts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = receiptsData.filter(r => {
        const createdAt = new Date(r.createdAt || r.timestamp);
        return createdAt >= today;
    }).length;
    todayCountEl.textContent = todayCount;

    // Calculate total value
    const totalValue = receiptsData.reduce((sum, r) => {
        const amount = r.receiptData?.totalAmount || 0;
        return sum + amount;
    }, 0);
    totalValueEl.textContent = `£${totalValue.toFixed(2)}`;
}

/**
 * Filter and display receipts based on search and sort
 */
function filterAndDisplayReceipts() {
    const searchTerm = searchFilter.value.toLowerCase();
    const sortBy = sortFilter.value;

    // Filter
    let filtered = receiptsData.filter(receipt => {
        if (!searchTerm) return true;
        
        const vendor = receipt.receiptData?.vendorName?.toLowerCase() || '';
        const userId = receipt.userId?.toLowerCase() || '';
        return vendor.includes(searchTerm) || userId.includes(searchTerm);
    });

    // Sort
    filtered.sort((a, b) => {
        const aData = a.receiptData || {};
        const bData = b.receiptData || {};

        switch (sortBy) {
            case 'newest':
                return new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp);
            case 'oldest':
                return new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp);
            case 'highest':
                return (bData.totalAmount || 0) - (aData.totalAmount || 0);
            case 'lowest':
                return (aData.totalAmount || 0) - (bData.totalAmount || 0);
            default:
                return 0;
        }
    });

    // Display
    displayReceipts(filtered);
}

/**
 * Display receipts in the queue
 */
function displayReceipts(receipts) {
    reviewQueueEl.innerHTML = '';

    if (receipts.length === 0) {
        reviewQueueEl.innerHTML = '<p style="text-align: center; color: #666;">No receipts match your filters.</p>';
        return;
    }

    receipts.forEach(receipt => {
        const card = createReceiptCard(receipt);
        reviewQueueEl.appendChild(card);
    });
}

/**
 * Create receipt card HTML
 */
function createReceiptCard(receipt) {
    const card = document.createElement('div');
    card.className = 'receipt-card';
    card.style.cssText = 'background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 15px; border-left: 4px solid #fbbc04;';

    const receiptData = receipt.receiptData || {};
    const errors = receipt.validationErrors || [];
    const warnings = receipt.validationWarnings || [];
    const createdDate = receipt.createdAt ? new Date(receipt.createdAt).toLocaleString() : 'N/A';

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
            <div style="flex: 1;">
                <h3 style="margin: 0 0 5px 0; color: #202124;">${receiptData.vendorName || 'Unknown Vendor'}</h3>
                <p style="margin: 0; color: #5f6368; font-size: 0.9em;">
                    User: ${receipt.userId || 'N/A'} | 
                    Date: ${receiptData.transactionDate || 'N/A'} | 
                    Submitted: ${createdDate}
                </p>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.5em; font-weight: bold; color: #202124;">
                    £${(receiptData.totalAmount || 0).toFixed(2)}
                </div>
                <span style="background: #f1f3f4; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">
                    ${receiptData.category || 'Uncategorized'}
                </span>
            </div>
        </div>

        ${errors.length > 0 ? `
            <div style="background: #fef7f7; border-left: 3px solid #d93025; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #d93025;">❌ Validation Errors:</strong>
                <ul style="margin: 5px 0 0 20px; color: #5f6368;">
                    ${errors.map(err => `<li>${err}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        ${warnings.length > 0 ? `
            <div style="background: #fef9e7; border-left: 3px solid #f9ab00; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #f9ab00;">⚠️ Warnings:</strong>
                <ul style="margin: 5px 0 0 20px; color: #5f6368;">
                    ${warnings.map(warn => `<li>${warn}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn btn-primary review-btn" data-receipt-id="${receipt.id}">
                🔍 Review & Decide
            </button>
        </div>
    `;

    // Add event listener to review button
    const reviewBtn = card.querySelector('.review-btn');
    reviewBtn.addEventListener('click', () => {
        openReviewModal(receipt);
    });

    return card;
}

/**
 * Open review modal
 */
function openReviewModal(receipt) {
    const receiptData = receipt.receiptData || {};
    const errors = receipt.validationErrors || [];
    const warnings = receipt.validationWarnings || [];

    // Set receipt ID
    document.getElementById('modal-receipt-id').value = receipt.id;

    // Populate form
    document.getElementById('modal-vendor').value = receiptData.vendorName || '';
    document.getElementById('modal-date').value = receiptData.transactionDate || '';
    document.getElementById('modal-amount').value = receiptData.totalAmount ?? '';
    document.getElementById('modal-category').value = receiptData.category || '';
    document.getElementById('modal-vat').value = receiptData.vatNumber || '';
    document.getElementById('modal-notes').value = '';

    // Display validation info
    const validationInfo = document.getElementById('validation-info');
    validationInfo.innerHTML = `
        ${errors.length > 0 ? `
            <div style="background: #fef7f7; border-left: 3px solid #d93025; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                <strong style="color: #d93025; font-size: 1.1em;">❌ Validation Errors:</strong>
                <ul style="margin: 10px 0 0 20px; color: #5f6368;">
                    ${errors.map(err => `<li>${err}</li>`).join('')}
                </ul>
                <p style="margin: 10px 0 0 0; color: #5f6368; font-size: 0.9em;">
                    <em>Please correct these errors before approving.</em>
                </p>
            </div>
        ` : ''}
        
        ${warnings.length > 0 ? `
            <div style="background: #fef9e7; border-left: 3px solid #f9ab00; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                <strong style="color: #f9ab00; font-size: 1.1em;">⚠️ Warnings:</strong>
                <ul style="margin: 10px 0 0 20px; color: #5f6368;">
                    ${warnings.map(warn => `<li>${warn}</li>`).join('')}
                </ul>
                <p style="margin: 10px 0 0 0; color: #5f6368; font-size: 0.9em;">
                    <em>Warnings can be overridden if you verify the data is correct.</em>
                </p>
            </div>
        ` : ''}

        ${errors.length === 0 && warnings.length === 0 ? `
            <div style="background: #e6f4ea; border-left: 3px solid #1e8e3e; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                <strong style="color: #1e8e3e;">ℹ️ No Critical Issues</strong>
                <p style="margin: 5px 0 0 0; color: #5f6368;">
                    This receipt was flagged for manual review. Please verify the data and approve or reject.
                </p>
            </div>
        ` : ''}
    `;

    reviewModal.style.display = 'flex';
}

/**
 * Approve receipt (admin override)
 */
async function approveReceipt() {
    const receiptId = document.getElementById('modal-receipt-id').value;
    const adminNotes = document.getElementById('modal-notes').value;

    const receiptData = {
        vendorName: document.getElementById('modal-vendor').value.trim(),
        transactionDate: document.getElementById('modal-date').value,
        totalAmount: parseFloat(document.getElementById('modal-amount').value),
        category: document.getElementById('modal-category').value,
        vatNumber: document.getElementById('modal-vat').value.trim() || null
    };

    // Validate
    if (!receiptData.vendorName || !receiptData.transactionDate || 
        receiptData.totalAmount == null || isNaN(receiptData.totalAmount) || !receiptData.category) {
        alert('Please fill in all required fields.');
        return;
    }

    try {
        approveBtn.disabled = true;
        approveBtn.textContent = 'Approving...';

        // Call admin override function
        const adminApprove = httpsCallable(functions, 'adminApproveReceipt');
        const result = await adminApprove({
            receiptId,
            receiptData,
            adminNotes
        });

        if (result.data.success) {
            alert('✅ Receipt approved and finalized successfully!');
            reviewModal.style.display = 'none';
        } else {
            throw new Error(result.data.message || 'Failed to approve receipt');
        }
    } catch (error) {
        console.error('Error approving receipt:', error);
        alert(`Error: ${error.message}`);
    } finally {
        approveBtn.disabled = false;
        approveBtn.textContent = '✅ Approve & Finalize';
    }
}

/**
 * Reject receipt
 */
async function rejectReceipt() {
    const receiptId = document.getElementById('modal-receipt-id').value;
    const adminNotes = document.getElementById('modal-notes').value;

    if (!confirm('Are you sure you want to reject this receipt? This action cannot be undone.')) {
        return;
    }

    if (!adminNotes.trim()) {
        alert('Please add notes explaining why this receipt is being rejected.');
        document.getElementById('modal-notes').focus();
        return;
    }

    try {
        rejectBtn.disabled = true;
        rejectBtn.textContent = 'Rejecting...';

        // Call admin reject function
        const adminReject = httpsCallable(functions, 'adminRejectReceipt');
        const result = await adminReject({
            receiptId,
            adminNotes
        });

        if (result.data.success) {
            alert('❌ Receipt rejected. User will be notified.');
            reviewModal.style.display = 'none';
        } else {
            throw new Error(result.data.message || 'Failed to reject receipt');
        }
    } catch (error) {
        console.error('Error rejecting receipt:', error);
        alert(`Error: ${error.message}`);
    } finally {
        rejectBtn.disabled = false;
        rejectBtn.textContent = '❌ Reject';
    }
}

