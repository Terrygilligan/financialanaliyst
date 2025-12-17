// PWA Install Prompt Handler
let deferredPrompt;
let installButton;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install button
    showInstallPromotion();
});

function showInstallPromotion() {
    // Create install banner if it doesn't exist
    if (!document.getElementById('pwa-install-banner')) {
        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="pwa-install-content">
                <div class="pwa-install-icon">📱</div>
                <div class="pwa-install-text">
                    <strong>Install App</strong>
                    <p>Install Financial Analyst for a better experience</p>
                </div>
                <button id="pwa-install-btn" class="btn-primary pwa-install-btn">Install</button>
                <button id="pwa-dismiss-btn" class="pwa-dismiss-btn">×</button>
            </div>
        `;
        document.body.appendChild(banner);

        // Setup event listeners
        installButton = document.getElementById('pwa-install-btn');
        const dismissButton = document.getElementById('pwa-dismiss-btn');

        installButton.addEventListener('click', installApp);
        dismissButton.addEventListener('click', dismissBanner);

        // Show banner with animation
        setTimeout(() => {
            banner.classList.add('show');
        }, 1000);
    }
}

async function installApp() {
    if (!deferredPrompt) {
        return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferredPrompt
    deferredPrompt = null;

    // Hide the install banner
    dismissBanner();
}

function dismissBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.remove('show');
        setTimeout(() => {
            banner.remove();
        }, 300);
    }
    // Remember that user dismissed (don't show again for 7 days)
    localStorage.setItem('pwa-install-dismissed', Date.now());
}

// Check if already dismissed recently
const dismissed = localStorage.getItem('pwa-install-dismissed');
if (dismissed) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) {
        // Don't show banner if dismissed within last 7 days
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            // Don't show banner
        });
    }
}

// Listen for the app installed event
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    // Hide the install promotion
    dismissBanner();
    // Clear the deferredPrompt
    deferredPrompt = null;
    // Show a success message
    showInstallSuccess();
});

function showInstallSuccess() {
    const successMsg = document.createElement('div');
    successMsg.className = 'pwa-install-success';
    successMsg.innerHTML = `
        <div class="success-content">
            <span class="success-icon">✓</span>
            <span>App installed successfully!</span>
        </div>
    `;
    document.body.appendChild(successMsg);

    setTimeout(() => {
        successMsg.classList.add('show');
    }, 100);

    setTimeout(() => {
        successMsg.classList.remove('show');
        setTimeout(() => {
            successMsg.remove();
        }, 300);
    }, 3000);
}

// Service Worker update notification
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        showUpdateNotification();
    });
}

function showUpdateNotification() {
    const updateMsg = document.createElement('div');
    updateMsg.className = 'pwa-update-notification';
    updateMsg.innerHTML = `
        <div class="update-content">
            <span>New version available!</span>
            <button id="reload-btn" class="btn-primary btn-sm">Reload</button>
        </div>
    `;
    document.body.appendChild(updateMsg);

    setTimeout(() => {
        updateMsg.classList.add('show');
    }, 100);

    document.getElementById('reload-btn').addEventListener('click', () => {
        window.location.reload();
    });
}

