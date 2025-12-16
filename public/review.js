// Review Receipts Page Logic

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
    const functionsModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
    
    const { 
        signOut, 
        onAuthStateChanged 
    } = authModule;
    const { collection, query, where, getDocs, onSnapshot } = firestoreModule;
    const { httpsCallable } = functionsModule;

    const { auth, db, functions } = window.firebase;

    // DOM Elements
    const mainContent = document.getElementById('main-content');
    const userInfo = document.getElementById('user-info');
    const loginSection = document.getElementById('login-section');
    const logoutBtn = document.getElementById('logout-btn');
    const backBtn = document.getElementById('back-btn');
    const loadingMessage = document.getElementById('loading-message');
    const noReceiptsMessage = document.getElementById('no-receipts-message');
    const receiptsList = document.getElementById('receipts-list');
    const reviewModal = document.getElementById('review-modal');
    const closeReviewModal = document.getElementById('close-review-modal');
    const cancelReviewBtn = document.getElementById('cancel-review-btn');
    const reviewForm = document.getElementById('review-form');
    const finalizeBtn = document.getElementById('finalize-btn');

    // Check if user is admin via custom claims
    let isAdmin = false;

    // Auth state listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Get user token to check custom claims
            try {
                const token = await user.getIdTokenResult();
                isAdmin = token.claims.admin === true;
                
                // Show admin link if user is admin
                const adminLinkContainer = document.getElementById('admin-link-container');
                if (adminLinkContainer) {
                    adminLinkContainer.style.display = isAdmin ? 'inline' : 'none';
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
            }

            userInfo.style.display = 'block';
            loginSection.style.display = 'none';
            mainContent.style.display = 'block';
            
            // Load pending receipts
            loadPendingReceipts(user.uid);
        } else {
            userInfo.style.display = 'none';
            loginSection.style.display = 'block';
            mainContent.style.display = 'none';
        }
    });

    // Logout handler
    logoutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    });

    // Back button handler
    backBtn?.addEventListener('click', () => {
        window.location.href = '/index.html';
    });

    // Close modal handlers
    closeReviewModal?.addEventListener('click', () => {
        reviewModal.style.display = 'none';
    });

    cancelReviewBtn?.addEventListener('click', () => {
        reviewModal.style.display = 'none';
    });

    // Close modal when clicking outside
    reviewModal?.addEventListener('click', (e) => {
        if (e.target === reviewModal) {
            reviewModal.style.display = 'none';
        }
    });

    // Load pending receipts
    async function loadPendingReceipts(userId) {
        try {
            loadingMessage.style.display = 'block';
            noReceiptsMessage.style.display = 'none';
            receiptsList.style.display = 'none';

            const pendingReceiptsRef = collection(db, 'pending_receipts');
            const q = query(pendingReceiptsRef, where('userId', '==', userId), where('status', '==', 'pending_review'));
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                loadingMessage.style.display = 'none';
                noReceiptsMessage.style.display = 'block';
                return;
            }

            receiptsList.innerHTML = '';
            snapshot.forEach((doc) => {
                const receipt = { id: doc.id, ...doc.data() };
                createReceiptCard(receipt);
            });

            loadingMessage.style.display = 'none';
            receiptsList.style.display = 'block';

            // Set up real-time listener
            onSnapshot(q, (snapshot) => {
                if (snapshot.empty) {
                    loadingMessage.style.display = 'none';
                    receiptsList.style.display = 'none';
                    noReceiptsMessage.style.display = 'block';
                    return;
                }

                receiptsList.innerHTML = '';
                snapshot.forEach((doc) => {
                    const receipt = { id: doc.id, ...doc.data() };
                    createReceiptCard(receipt);
                });

                loadingMessage.style.display = 'none';
                receiptsList.style.display = 'block';
            });
        } catch (error) {
            console.error('Error loading pending receipts:', error);
            loadingMessage.innerHTML = '<p style="color: red;">Error loading receipts. Please try again.</p>';
        }
    }

    // Create receipt card
    function createReceiptCard(receipt) {
        const card = document.createElement('div');
        card.className = 'receipt-card';
        card.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 15px; background: white;';

        const receiptData = receipt.receiptData || {};
        const date = new Date(receipt.createdAt || receipt.timestamp).toLocaleDateString();

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h3 style="margin: 0 0 5px 0;">${receiptData.vendorName || 'Unknown Vendor'}</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">${receipt.fileName || 'Receipt'}</p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Uploaded: ${date}</p>
                </div>
                <span style="background: #ffa500; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px;">Pending Review</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                <div>
                    <strong>Date:</strong> ${receiptData.transactionDate || 'N/A'}
                </div>
                <div>
                    <strong>Amount:</strong> $${(receiptData.totalAmount || 0).toFixed(2)}
                </div>
                <div>
                    <strong>Category:</strong> ${receiptData.category || 'N/A'}
                </div>
                <div>
                    <strong>Entity:</strong> ${receiptData.entity || 'Unassigned'}
                </div>
            </div>
            <button class="btn-primary" data-receipt-id="${receipt.id}" style="width: 100%;">Review & Finalize</button>
        `;

        const reviewBtn = card.querySelector('button');
        reviewBtn.addEventListener('click', () => {
            openReviewModal(receipt);
        });

        receiptsList.appendChild(card);
    }

    // Open review modal
    function openReviewModal(receipt) {
        const receiptData = receipt.receiptData || {};
        
        document.getElementById('review-receipt-id').value = receipt.id;
        document.getElementById('review-vendor').value = receiptData.vendorName || '';
        document.getElementById('review-date').value = receiptData.transactionDate || '';
        document.getElementById('review-amount').value = receiptData.totalAmount || '';
        document.getElementById('review-category').value = receiptData.category || '';

        reviewModal.style.display = 'flex';
    }

    // Finalize receipt
    reviewForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const receiptId = document.getElementById('review-receipt-id').value;
        const receiptData = {
            vendorName: document.getElementById('review-vendor').value.trim(),
            transactionDate: document.getElementById('review-date').value,
            totalAmount: parseFloat(document.getElementById('review-amount').value),
            category: document.getElementById('review-category').value
        };

        // Validate
        if (!receiptData.vendorName || !receiptData.transactionDate || 
            !receiptData.totalAmount || !receiptData.category) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            finalizeBtn.disabled = true;
            finalizeBtn.textContent = 'Finalizing...';

            const finalizeReceipt = httpsCallable(functions, 'finalizeReceipt');
            const result = await finalizeReceipt({
                receiptId: receiptId,
                receiptData: receiptData
            });

            if (result.data.success) {
                alert('Receipt finalized successfully!');
                reviewModal.style.display = 'none';
                // Receipt will be removed from list via real-time listener
            } else {
                throw new Error(result.data.message || 'Failed to finalize receipt');
            }
        } catch (error) {
            console.error('Error finalizing receipt:', error);
            alert(`Error: ${error.message || 'Failed to finalize receipt. Please try again.'}`);
        } finally {
            finalizeBtn.disabled = false;
            finalizeBtn.textContent = 'Finalize Receipt';
        }
    });
});

