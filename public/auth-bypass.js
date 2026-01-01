
// --- Local Development Auth Bypass ---
if (window.location.hostname === 'localhost') {
    const urlParams = new URLSearchParams(window.location.search);
    const mockRole = urlParams.get('mock');
    if (mockRole) {
        console.log(`%c🚀 MOCK MODE ACTIVATED: ${mockRole}`, 'color: #00f0a0; font-size: 14px; font-weight: bold;');
        const mockUser = {
            uid: mockRole === 'admin' ? 'test-admin-123' : 'test-driver-456',
            email: mockRole === 'admin' ? 'admin@test.com' : 'driver@test.com',
            emailVerified: true,
            isMock: true,
            isAdmin: mockRole === 'admin',
            businessId: 'test-biz-001',
            assignedSchemaId: 'fuel_master_v1' // For driver
        };
        // Set a global flag to be used by app.js and admin.js
        window.mockUser = mockUser;
    }
}
// --- End Bypass ---
