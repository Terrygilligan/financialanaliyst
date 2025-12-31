// Builder.io SDK Initialization and Component Registration
import { firebaseConfig } from './firebase-config.js';

// Load Builder.io SDK
(function() {
  const script = document.createElement('script');
  script.src = 'https://cdn.builder.io/js/browser@latest';
  script.async = true;
  script.onload = initBuilder;
  document.head.appendChild(script);
})();

function initBuilder() {
  if (!window.Builder) return;

  // Initialize with API Key
  Builder.init(firebaseConfig.builderApiKey);

  // Register Tenant Selector Component
  Builder.registerComponent('TenantSelector', {
    name: 'Tenant Selector',
    inputs: [
      {
        name: 'title',
        type: 'string',
        defaultValue: 'Your Business Silo',
      },
      {
        name: 'showSwitchButton',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  });

  // Global helper for the component to use
  window.renderTenantSelector = function(props) {
    const businessId = window.businessId || 'Not associated';
    return `
      <div class="builder-tenant-selector" style="padding: 15px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin: 20px 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="background: #eff6ff; padding: 10px; border-radius: 10px;">
            <span style="font-size: 24px;">🏢</span>
          </div>
          <div>
            <div style="font-size: 14px; color: #64748b; font-weight: 500;">${props.title || 'Your Business Silo'}</div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${businessId}</div>
          </div>
        </div>
        ${props.showSwitchButton ? `
          <div style="margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            <a href="/business-signup.html" style="font-size: 13px; color: #2563eb; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 4px;">
              Manage business settings <span>→</span>
            </a>
          </div>
        ` : ''}
      </div>
    `;
  };

  // Add implementation for the component
  // In vanilla JS SDK, we can use a custom template or element
  // For this demo, we'll look for any elements with data-builder-component="TenantSelector"
  const observer = new MutationObserver((mutations) => {
    document.querySelectorAll('builder-component[name="TenantSelector"]').forEach(el => {
      if (!el.dataset.rendered) {
        const title = el.getAttribute('title') || 'Your Business Silo';
        const showSwitch = el.getAttribute('showSwitchButton') !== 'false';
        el.innerHTML = window.renderTenantSelector({ title, showSwitchButton: showSwitch });
        el.dataset.rendered = 'true';
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

