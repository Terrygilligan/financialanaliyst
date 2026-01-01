import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-functions.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const auth = getAuth();
const functions = getFunctions();
const db = getFirestore();

const setRole = httpsCallable(functions, 'setRole');
const revokeAccess = httpsCallable(functions, 'revokeAccess');
const getUserByEmail = httpsCallable(functions, 'getUserByEmail');
const listUsers = httpsCallable(functions, 'listUsers');

document.addEventListener('DOMContentLoaded', () => {
    const init = async () => {
        const user = await new Promise((resolve) => auth.onAuthStateChanged(resolve));

        if (user) {
            const idTokenResult = await user.getIdTokenResult(true); // Force refresh
            if (idTokenResult.claims.role !== 'super_admin') {
                window.location.href = '/';
                return;
            }
            loadUsers();
        } else {
            window.location.href = '/login.html';
        }
    };
    init();

    document.getElementById('invite-admin-btn').addEventListener('click', inviteAdmin);
});

async function loadUsers() {
    const userList = document.getElementById('user-list');
    userList.innerHTML = ''; // Clear existing list

    try {
        const result = await listUsers();
        renderUsers(result.data);
    } catch (error) {
        alert('Error loading users: ' + error.message);
    }
}

function renderUsers(users) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        let actions = `<button class="revoke-btn" data-uid="${user.uid}">Revoke Access</button>`;
        if (user.role === 'admin' || user.role === 'super_admin') {
            actions += ` <button class="demote-btn" data-uid="${user.uid}">Demote to User</button>`;
        }
        row.innerHTML = `
            <td>${user.email || 'N/A'}</td>
            <td>${user.uid}</td>
            <td><span class="badge ${user.role}">${user.role || 'user'}</span></td>
            <td>${actions}</td>
        `;
        userList.appendChild(row);
    });

    document.querySelectorAll('.revoke-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const uid = e.target.dataset.uid;
            if (confirm(`Are you sure you want to revoke access for user ${uid}?`)) {
                revokeUserAccess(uid);
            }
        });
    });

    document.querySelectorAll('.demote-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const uid = e.target.dataset.uid;
            if (confirm(`Are you sure you want to demote user ${uid} to 'user'?`)) {
                demoteUser(uid);
            }
        });
    });
}

async function inviteAdmin() {
    const email = document.getElementById('invite-email').value;
    if (!email) {
        alert('Please enter an email.');
        return;
    }

    try {
        const result = await getUserByEmail({ email });
        const uid = result.data.uid;
        await setRole({ uid, role: 'admin' });
        alert('Admin role granted!');
        loadUsers(); // Refresh user list
    } catch (error) {
        alert('Error granting admin role: ' + error.message);
    }
}

async function demoteUser(uid) {
    try {
        await setRole({ uid, role: 'user' });
        alert('User demoted!');
        loadUsers(); // Refresh user list
    } catch (error) {
        alert('Error demoting user: ' + error.message);
    }
}

async function revokeUserAccess(uid) {
    try {
        await revokeAccess({ uid });
        alert('User access revoked!');
        loadUsers(); // Refresh user list
    } catch (error) {
        alert('Error revoking access: ' + error.message);
    }
}
