// KindleGive - Offline Donation Crowdfunding Platform
// All data stored in localStorage - Demo application only

// ==================== CONSTANTS ====================
const STORAGE_KEYS = {
    USERS: 'kindleGive_users',
    CAMPAIGNS: 'kindleGive_campaigns',
    DONATIONS: 'kindleGive_donations',
    WITHDRAWALS: 'kindleGive_withdrawals',
    NOTIFICATIONS: 'kindleGive_notifications',
    CURRENT_USER: 'kindleGive_currentUser'
};

const CATEGORIES = ['medical', 'education', 'personal', 'emergency', 'community', 'environment', 'animals', 'other'];

// ==================== STATE ====================
let currentUser = null;
let currentCampaign = null;
let pendingDonation = null;

// ==================== HELPER FUNCTIONS ====================

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get data from localStorage
function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// Save data to localStorage
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Sanitize user input to prevent XSS
function sanitizeInput(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Format currency
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Format relative time
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <span class="toast-message">${sanitizeInput(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Check if user is logged in
function isLoggedIn() {
    return currentUser !== null;
}

// Require login for action
function requireLogin(callback) {
    if (isLoggedIn()) {
        callback();
    } else {
        showToast('Please login to continue', 'error');
        navigateTo('#login');
    }
}

// ==================== DATA MANAGEMENT ====================

// Initialize first user as admin
function initializeAdmin() {
    const users = getData(STORAGE_KEYS.USERS);
    if (users.length === 0) {
        // First user will become admin on registration
        return true;
    }
    return false;
}

// Register user
function registerUser(name, email, password) {
    const users = getData(STORAGE_KEYS.USERS);
    
    // Check if email already exists
    if (users.find(u => u.email === email)) {
        showToast('Email already registered', 'error');
        return null;
    }
    
    const isFirstUser = users.length === 0;
    const user = {
        id: generateId(),
        name: sanitizeInput(name),
        email: sanitizeInput(email),
        password: password, // Plain text for demo only
        role: isFirstUser ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        avatarUrl: ''
    };
    
    users.push(user);
    saveData(STORAGE_KEYS.USERS, users);
    
    // Auto login
    currentUser = user;
    saveData(STORAGE_KEYS.CURRENT_USER, user);
    
    showToast(`Welcome ${name}! You are ${isFirstUser ? 'the admin' : 'registered'}!`, 'success');
    return user;
}

// Login user
function loginUser(email, password) {
    const users = getData(STORAGE_KEYS.USERS);
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        showToast('Invalid email or password', 'error');
        return null;
    }
    
    currentUser = user;
    saveData(STORAGE_KEYS.CURRENT_USER, user);
    
    showToast(`Welcome back, ${user.name}!`, 'success');
    return user;
}

// Logout user
function logoutUser() {
    currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    showToast('Logged out successfully', 'info');
    navigateTo('#home');
}

// Create campaign
function createCampaign(campaignData) {
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    
    const campaign = {
        id: generateId(),
        creatorId: currentUser.id,
        title: sanitizeInput(campaignData.title),
        shortDescription: sanitizeInput(campaignData.shortDescription),
        fullDescription: sanitizeInput(campaignData.fullDescription),
        goalAmount: parseFloat(campaignData.goalAmount),
        raisedAmount: 0,
        deadline: campaignData.deadline,
        category: campaignData.category,
        coverImageUrl: sanitizeInput(campaignData.coverImageUrl || ''),
        location: sanitizeInput(campaignData.location),
        status: 'pending',
        isFeatured: false,
        rejectionReason: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    campaigns.push(campaign);
    saveData(STORAGE_KEYS.CAMPAIGNS, campaigns);
    
    showToast('Campaign submitted for approval!', 'success');
    return campaign;
}

// Update campaign
function updateCampaign(campaignId, updates) {
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    const index = campaigns.findIndex(c => c.id === campaignId);
    
    if (index === -1) {
        showToast('Campaign not found', 'error');
        return null;
    }
    
    campaigns[index] = {
        ...campaigns[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    saveData(STORAGE_KEYS.CAMPAIGNS, campaigns);
    showToast('Campaign updated!', 'success');
    return campaigns[index];
}

// Process donation
function processDonation(campaignId, amount, message, anonymous) {
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    const donations = getData(STORAGE_KEYS.DONATIONS);
    const notifications = getData(STORAGE_KEYS.NOTIFICATIONS);
    
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    if (campaignIndex === -1) {
        showToast('Campaign not found', 'error');
        return false;
    }
    
    const campaign = campaigns[campaignIndex];
    
    // Check if campaign is live
    if (campaign.status !== 'live') {
        showToast('This campaign is not accepting donations', 'error');
        return false;
    }
    
    // Check deadline
    if (new Date(campaign.deadline) < new Date()) {
        campaign.status = 'closed';
        campaigns[campaignIndex] = campaign;
        saveData(STORAGE_KEYS.CAMPAIGNS, campaigns);
        showToast('Campaign has closed', 'error');
        return false;
    }
    
    // Create donation record
    const donation = {
        id: generateId(),
        campaignId: campaignId,
        donorId: currentUser.id,
        donorName: anonymous ? 'Anonymous' : currentUser.name,
        amount: parseFloat(amount),
        anonymous: anonymous,
        message: sanitizeInput(message || ''),
        createdAt: new Date().toISOString()
    };
    
    donations.push(donation);
    saveData(STORAGE_KEYS.DONATIONS, donations);
    
    // Update campaign raised amount
    campaign.raisedAmount += parseFloat(amount);
    campaigns[campaignIndex] = campaign;
    saveData(STORAGE_KEYS.CAMPAIGNS, campaigns);
    
    // Create notification for campaign creator
    const creator = getData(STORAGE_KEYS.USERS).find(u => u.id === campaign.creatorId);
    if (creator && creator.id !== currentUser.id) {
        notifications.push({
            id: generateId(),
            userId: creator.id,
            type: 'new_donation',
            message: `You received a donation of ${formatCurrency(amount)} for "${campaign.title}"`,
            read: false,
            relatedId: campaignId,
            createdAt: new Date().toISOString()
        });
        saveData(STORAGE_KEYS.NOTIFICATIONS, notifications);
    }
    
    showToast('Donation successful! Thank you for your generosity!', 'success');
    alert('Mock receipt sent to your email: ' + currentUser.email);
    
    return true;
}

// Create withdrawal request
function createWithdrawalRequest(campaignId) {
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    const withdrawals = getData(STORAGE_KEYS.WITHDRAWALS);
    
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        showToast('Campaign not found', 'error');
        return null;
    }
    
    if (campaign.status !== 'closed') {
        showToast('Only closed campaigns can request withdrawal', 'error');
        return null;
    }
    
    if (campaign.creatorId !== currentUser.id) {
        showToast('Only the creator can request withdrawal', 'error');
        return null;
    }
    
    // Check if already requested
    const existing = withdrawals.find(w => w.campaignId === campaignId && w.status === 'pending');
    if (existing) {
        showToast('Withdrawal request already pending', 'error');
        return null;
    }
    
    const withdrawal = {
        id: generateId(),
        campaignId: campaignId,
        creatorId: currentUser.id,
        amount: campaign.raisedAmount,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        processedAt: null
    };
    
    withdrawals.push(withdrawal);
    saveData(STORAGE_KEYS.WITHDRAWALS, withdrawals);
    
    showToast('Withdrawal request submitted!', 'success');
    return withdrawal;
}

// Process withdrawal (admin only)
function processWithdrawal(withdrawalId, action, reason = '') {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return false;
    }
    
    const withdrawals = getData(STORAGE_KEYS.WITHDRAWALS);
    const notifications = getData(STORAGE_KEYS.NOTIFICATIONS);
    const index = withdrawals.findIndex(w => w.id === withdrawalId);
    
    if (index === -1) {
        showToast('Withdrawal request not found', 'error');
        return false;
    }
    
    const withdrawal = withdrawals[index];
    withdrawal.status = action === 'approve' ? 'paid' : 'rejected';
    withdrawal.processedAt = new Date().toISOString();
    
    if (action === 'reject') {
        withdrawal.rejectionReason = reason;
    }
    
    withdrawals[index] = withdrawal;
    saveData(STORAGE_KEYS.WITHDRAWALS, withdrawals);
    
    // Notify creator
    notifications.push({
        id: generateId(),
        userId: withdrawal.creatorId,
        type: 'withdrawal_approved',
        message: action === 'approve' 
            ? `Your withdrawal of ${formatCurrency(withdrawal.amount)} has been processed and marked as paid.`
            : `Your withdrawal request was rejected: ${reason}`,
        read: false,
        relatedId: withdrawal.campaignId,
        createdAt: new Date().toISOString()
    });
    saveData(STORAGE_KEYS.NOTIFICATIONS, notifications);
    
    showToast(`Withdrawal ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
    return true;
}

// Approve/Reject campaign (admin only)
function moderateCampaign(campaignId, action, reason = '') {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return false;
    }
    
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    const notifications = getData(STORAGE_KEYS.NOTIFICATIONS);
    const index = campaigns.findIndex(c => c.id === campaignId);
    
    if (index === -1) {
        showToast('Campaign not found', 'error');
        return false;
    }
    
    const campaign = campaigns[index];
    
    if (action === 'approve') {
        campaign.status = 'live';
        campaign.rejectionReason = '';
        
        // Notify creator
        notifications.push({
            id: generateId(),
            userId: campaign.creatorId,
            type: 'campaign_approved',
            message: `Your campaign "${campaign.title}" has been approved and is now live!`,
            read: false,
            relatedId: campaignId,
            createdAt: new Date().toISOString()
        });
        
        showToast('Campaign approved!', 'success');
    } else {
        campaign.status = 'rejected';
        campaign.rejectionReason = sanitizeInput(reason);
        showToast('Campaign rejected', 'info');
    }
    
    campaigns[index] = campaign;
    saveData(STORAGE_KEYS.CAMPAIGNS, campaigns);
    saveData(STORAGE_KEYS.NOTIFICATIONS, notifications);
    
    return true;
}

// Toggle featured status (admin only)
function toggleFeatured(campaignId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return false;
    }
    
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    const index = campaigns.findIndex(c => c.id === campaignId);
    
    if (index === -1 || campaigns[index].status !== 'live') {
        showToast('Campaign not found or not live', 'error');
        return false;
    }
    
    campaigns[index].isFeatured = !campaigns[index].isFeatured;
    saveData(STORAGE_KEYS.CAMPAIGNS, campaigns);
    
    showToast(`Campaign ${campaigns[index].isFeatured ? 'featured' : 'unfeatured'}`, 'success');
    return true;
}

// Delete user (admin only)
function deleteUser(userId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return false;
    }
    
    if (userId === currentUser.id) {
        showToast('Cannot delete yourself', 'error');
        return false;
    }
    
    const users = getData(STORAGE_KEYS.USERS);
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
        showToast('User not found', 'error');
        return false;
    }
    
    users.splice(index, 1);
    saveData(STORAGE_KEYS.USERS, users);
    
    showToast('User deleted', 'success');
    return true;
}

// Change user role (admin only)
function changeUserRole(userId, newRole) {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return false;
    }
    
    const users = getData(STORAGE_KEYS.USERS);
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
        showToast('User not found', 'error');
        return false;
    }
    
    users[index].role = newRole;
    saveData(STORAGE_KEYS.USERS, users);
    
    showToast(`User role changed to ${newRole}`, 'success');
    return true;
}

// Get notifications for current user
function getUserNotifications() {
    if (!currentUser) return [];
    const notifications = getData(STORAGE_KEYS.NOTIFICATIONS);
    return notifications
        .filter(n => n.userId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
}

// Mark all notifications as read
function markAllNotificationsRead() {
    if (!currentUser) return;
    const notifications = getData(STORAGE_KEYS.NOTIFICATIONS);
    
    notifications.forEach(n => {
        if (n.userId === currentUser.id) {
            n.read = true;
        }
    });
    
    saveData(STORAGE_KEYS.NOTIFICATIONS, notifications);
    updateNotificationBadge();
}

// Update notification badge
function updateNotificationBadge() {
    if (!currentUser) {
        document.getElementById('notificationBadge').classList.add('hide');
        return;
    }
    
    const notifications = getData(STORAGE_KEYS.NOTIFICATIONS);
    const unreadCount = notifications.filter(
        n => n.userId === currentUser.id && !n.read
    ).length;
    
    const badge = document.getElementById('notificationBadge');
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hide');
    } else {
        badge.classList.add('hide');
    }
}

// Check and close expired campaigns
function checkExpiredCampaigns() {
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    const now = new Date();
    let changed = false;
    
    campaigns.forEach(campaign => {
        if (campaign.status === 'live' && new Date(campaign.deadline) < now) {
            campaign.status = 'closed';
            campaign.updatedAt = now.toISOString();
            changed = true;
        }
    });
    
    if (changed) {
        saveData(STORAGE_KEYS.CAMPAIGNS, campaigns);
    }
}

// ==================== UI RENDERING ====================

// Navigate to page
function navigateTo(hash) {
    window.location.hash = hash;
}

// Handle routing
function handleRouting() {
    const hash = window.location.hash || '#home';
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const pageMap = {
        '#home': 'home-page',
        '#browse': 'browse-page',
        '#campaign-detail': 'campaign-detail-page',
        '#create-campaign': 'create-campaign-page',
        '#edit-campaign': 'edit-campaign-page',
        '#profile': 'profile-page',
        '#admin': 'admin-page',
        '#login': 'login-page',
        '#register': 'register-page'
    };
    
    const pageId = pageMap[hash];
    if (pageId) {
        document.getElementById(pageId).classList.add('active');
    }
    
    // Update nav based on auth state
    updateNav();
    
    // Load page content
    loadPageContent(hash);
    
    // Close mobile menu
    document.getElementById('navMenu').classList.remove('active');
}

// Update navigation based on auth state
function updateNav() {
    const isLoggedIn = currentUser !== null;
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    // Toggle nav items
    document.getElementById('navCreateCampaign').classList.toggle('hide', !isLoggedIn);
    document.getElementById('navProfile').classList.toggle('hide', !isLoggedIn);
    document.getElementById('navAdmin').classList.toggle('hide', !isAdmin);
    document.getElementById('navLogin').classList.toggle('hide', isLoggedIn);
    document.getElementById('navRegister').classList.toggle('hide', isLoggedIn);
    document.getElementById('navLogout').classList.toggle('hide', !isLoggedIn);
    
    updateNotificationBadge();
}

// Load page content
function loadPageContent(hash) {
    switch(hash) {
        case '#home':
            renderHomePage();
            break;
        case '#browse':
            renderBrowsePage();
            break;
        case '#campaign-detail':
            renderCampaignDetail();
            break;
        case '#create-campaign':
            if (!isLoggedIn()) {
                requireLogin(() => {});
                return;
            }
            break;
        case '#profile':
            if (!isLoggedIn()) {
                requireLogin(() => {});
                return;
            }
            renderProfilePage();
            break;
        case '#admin':
            if (!currentUser || currentUser.role !== 'admin') {
                showToast('Admin access required', 'error');
                navigateTo('#home');
                return;
            }
            renderAdminPage();
            break;
    }
}

// Render home page
function renderHomePage() {
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    const liveCampaigns = campaigns.filter(c => c.status === 'live');
    
    // Featured campaigns
    const featured = liveCampaigns.filter(c => c.isFeatured).slice(0, 4);
    const featuredContainer = document.getElementById('featuredCampaigns');
    
    if (featured.length > 0) {
        featuredContainer.innerHTML = featured.map(c => createCampaignCard(c)).join('');
        document.getElementById('featuredCampaigns').parentElement.previousElementSibling.classList.remove('hide');
    } else {
        featuredContainer.parentElement.classList.add('hide');
    }
    
    // Latest campaigns
    const latest = liveCampaigns
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6);
    
    const latestContainer = document.getElementById('latestCampaigns');
    if (latest.length > 0) {
        latestContainer.innerHTML = latest.map(c => createCampaignCard(c)).join('');
        latestContainer.parentElement.classList.remove('hide');
    } else {
        latestContainer.parentElement.classList.add('hide');
    }
}

// Create campaign card HTML
function createCampaignCard(campaign) {
    const progress = Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100);
    const daysLeft = Math.ceil((new Date(campaign.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const coverImage = campaign.coverImageUrl || 'https://via.placeholder.com/400x200?text=No+Image';
    
    return `
        <div class="campaign-card" onclick="viewCampaign('${campaign.id}')">
            <div class="campaign-card-image" style="background-image: url('${coverImage}')">
                <span class="campaign-card-status status-${campaign.status}">${campaign.status.toUpperCase()}</span>
            </div>
            <div class="campaign-card-content">
                <h3 class="campaign-card-title">${sanitizeInput(campaign.title)}</h3>
                <p class="campaign-card-desc">${sanitizeInput(campaign.shortDescription)}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <p class="progress-text">${formatCurrency(campaign.raisedAmount)} raised of ${formatCurrency(campaign.goalAmount)}</p>
                <div class="campaign-card-footer">
                    <span class="campaign-location"><i class="fas fa-map-marker-alt"></i> ${sanitizeInput(campaign.location)}</span>
                    <span>${daysLeft > 0 ? daysLeft + ' days left' : 'Ended'}</span>
                </div>
            </div>
        </div>
    `;
}

// View campaign detail
function viewCampaign(campaignId) {
    currentCampaign = getData(STORAGE_KEYS.CAMPAIGNS).find(c => c.id === campaignId);
    if (!currentCampaign) {
        showToast('Campaign not found', 'error');
        return;
    }
    navigateTo('#campaign-detail');
}

// Render browse page
function renderBrowsePage() {
    applyFilters();
}

// Apply filters to browse page
function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;
    const sort = document.getElementById('sortFilter').value;
    
    let campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    
    // Filter by status (only show live and closed to regular users)
    campaigns = campaigns.filter(c => c.status === 'live' || c.status === 'closed');
    
    // Apply filters
    if (search) {
        campaigns = campaigns.filter(c => 
            c.title.toLowerCase().includes(search) || 
            c.shortDescription.toLowerCase().includes(search)
        );
    }
    
    if (category) {
        campaigns = campaigns.filter(c => c.category === category);
    }
    
    if (status) {
        campaigns = campaigns.filter(c => c.status === status);
    }
    
    // Apply sorting
    switch(sort) {
        case 'newest':
            campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'funded':
            campaigns.sort((a, b) => b.raisedAmount - a.raisedAmount);
            break;
        case 'deadline':
            campaigns.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
            break;
    }
    
    const container = document.getElementById('browseCampaigns');
    if (campaigns.length > 0) {
        container.innerHTML = campaigns.map(c => createCampaignCard(c)).join('');
    } else {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <i class="fas fa-search"></i>
                <h3>No campaigns found</h3>
                <p>Try adjusting your filters</p>
            </div>
        `;
    }
}

// Render campaign detail page
function renderCampaignDetail() {
    if (!currentCampaign) {
        navigateTo('#browse');
        return;
    }
    
    const c = currentCampaign;
    const donations = getData(STORAGE_KEYS.DONATIONS).filter(d => d.campaignId === c.id);
    const progress = Math.min((c.raisedAmount / c.goalAmount) * 100, 100);
    const coverImage = c.coverImageUrl || 'https://via.placeholder.com/800x400?text=No+Image';
    const isCreator = currentUser && currentUser.id === c.creatorId;
    const creator = getData(STORAGE_KEYS.USERS).find(u => u.id === c.creatorId);
    const daysLeft = Math.max(0, Math.ceil((new Date(c.deadline) - new Date()) / (1000 * 60 * 60 * 24)));
    
    const donorListHtml = donations.length > 0 
        ? donations
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map(d => `
                <div class="donor-item">
                    <span class="donor-name">${sanitizeInput(d.donorName)}</span>
                    <span class="donor-amount">${formatCurrency(d.amount)}</span>
                    ${d.message ? `<p class="donor-message">"${sanitizeInput(d.message)}"</p>` : ''}
                    <p class="donor-date">${formatRelativeTime(d.createdAt)}</p>
                </div>
            `).join('')
        : '<p style="color: var(--gray-500); padding: 20px; text-align: center;">No donations yet. Be the first!</p>';
    
    const actionButtons = [];
    
    if (c.status === 'live' && !isCreator) {
        actionButtons.push(`
            <button class="btn btn-primary btn-block" onclick="openDonationModal()">
                <i class="fas fa-heart"></i> Donate Now
            </button>
        `);
    } else if (c.status === 'live' && isCreator) {
        actionButtons.push(`
            <button class="btn btn-secondary btn-block" onclick="editCampaign('${c.id}')">
                <i class="fas fa-edit"></i> Edit Campaign
            </button>
        `);
    } else if (c.status === 'closed' && isCreator && c.raisedAmount > 0) {
        const withdrawals = getData(STORAGE_KEYS.WITHDRAWALS);
        const existingWithdrawal = withdrawals.find(w => w.campaignId === c.id && w.status === 'pending');
        
        if (!existingWithdrawal) {
            actionButtons.push(`
                <button class="btn btn-success btn-block" onclick="requestWithdrawal('${c.id}')">
                    <i class="fas fa-money-bill-wave"></i> Request Withdrawal (${formatCurrency(c.raisedAmount)})
                </button>
            `);
        } else {
            actionButtons.push(`
                <button class="btn btn-secondary btn-block" disabled>
                    <i class="fas fa-clock"></i> Withdrawal Pending
                </button>
            `);
        }
    }
    
    const html = `
        <div class="campaign-detail-header" style="background-image: url('${coverImage}')">
            <div class="campaign-detail-title-overlay">
                <h1 class="campaign-detail-title">${sanitizeInput(c.title)}</h1>
                <div class="campaign-detail-meta">
                    <span><i class="fas fa-user"></i> ${creator ? sanitizeInput(creator.name) : 'Unknown'}</span>
                    <span><i class="fas fa-tag"></i> ${c.category}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${sanitizeInput(c.location)}</span>
                    <span><i class="fas fa-calendar"></i> ${daysLeft} days left</span>
                </div>
            </div>
        </div>
        <div class="campaign-detail-body">
            <div class="campaign-detail-content">
                <div class="campaign-story">
                    <h3>About this campaign</h3>
                    <p>${sanitizeInput(c.fullDescription)}</p>
                    
                    <div class="share-buttons">
                        <button class="share-btn copy" onclick="shareCampaign()">
                            <i class="fas fa-link"></i> Copy Link
                        </button>
                    </div>
                </div>
                
                <div class="donation-card">
                    <h3>${c.status === 'closed' ? 'Campaign Closed' : 'Support this cause'}</h3>
                    <p class="donation-goal">${formatCurrency(c.goalAmount)}</p>
                    <p class="donation-raised">${formatCurrency(c.raisedAmount)} raised by ${donations.length} donors</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <p style="margin-bottom: 20px; font-size: 13px; color: var(--gray-600);">
                        ${progress.toFixed(0)}% funded
                        ${c.status === 'closed' ? ' • Campaign ended' : ''}
                    </p>
                    ${actionButtons.join('')}
                </div>
            </div>
            
            <div class="donor-list">
                <h4>${donations.length} Donations</h4>
                ${donorListHtml}
            </div>
        </div>
    `;
    
    document.getElementById('campaignDetail').innerHTML = html;
}

// Share campaign
function shareCampaign() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy link', 'error');
    });
}

// Open donation modal
function openDonationModal() {
    if (!isLoggedIn()) {
        requireLogin(() => openDonationModal());
        return;
    }
    
    document.getElementById('donationCampaignId').value = currentCampaign.id;
    document.getElementById('donationCampaignInfo').innerHTML = `
        <p style="margin-bottom: 15px; color: var(--gray-600);">
            Donating to: <strong>${sanitizeInput(currentCampaign.title)}</strong>
        </p>
    `;
    document.getElementById('donationModal').classList.remove('hide');
}

// Close donation modal
function closeDonationModal() {
    document.getElementById('donationModal').classList.add('hide');
    document.getElementById('donationForm').reset();
}

// Open payment modal
function openPaymentModal(amount) {
    document.getElementById('paymentAmountDisplay').textContent = formatCurrency(amount);
    document.getElementById('paymentModal').classList.remove('hide');
}

// Close payment modal
function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hide');
}

// Confirm payment (mock)
function confirmPayment() {
    if (!pendingDonation) return;
    
    const { campaignId, amount, message, anonymous } = pendingDonation;
    
    closePaymentModal();
    closeDonationModal();
    
    const success = processDonation(campaignId, amount, message, anonymous);
    
    if (success) {
        renderCampaignDetail(); // Refresh to show updated progress
    }
}

// Render profile page
function renderProfilePage() {
    if (!currentUser) return;
    
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS).filter(c => c.creatorId === currentUser.id);
    const donations = getData(STORAGE_KEYS.DONATIONS).filter(d => d.donorId === currentUser.id);
    
    // Profile info
    document.getElementById('profileInfo').innerHTML = `
        <h3>${sanitizeInput(currentUser.name)}</h3>
        <p><i class="fas fa-envelope"></i> ${sanitizeInput(currentUser.email)}</p>
        <p><i class="fas fa-crown"></i> Role: ${currentUser.role.toUpperCase()}</p>
        <p><i class="fas fa-calendar"></i> Joined: ${formatDate(currentUser.createdAt)}</p>
    `;
    
    // My campaigns
    const campaignsContainer = document.getElementById('myCampaigns');
    if (campaigns.length > 0) {
        campaignsContainer.innerHTML = campaigns.map(c => `
            <div class="campaign-item">
                <div class="campaign-item-info">
                    <h4>${sanitizeInput(c.title)}</h4>
                    <p>Status: <span class="badge badge-${c.status}">${c.status}</span></p>
                    <p>Raised: ${formatCurrency(c.raisedAmount)} of ${formatCurrency(c.goalAmount)}</p>
                </div>
                <div class="campaign-item-actions">
                    <button class="btn btn-small btn-secondary" onclick="viewCampaign('${c.id}')">View</button>
                    ${c.status === 'pending' ? `<button class="btn btn-small btn-secondary" onclick="editCampaign('${c.id}')">Edit</button>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        campaignsContainer.innerHTML = '<p style="color: var(--gray-500); padding: 20px;">No campaigns created yet.</p>';
    }
    
    // My donations
    const donationsContainer = document.getElementById('myDonations');
    if (donations.length > 0) {
        donationsContainer.innerHTML = donations.map(d => {
            const campaign = getData(STORAGE_KEYS.CAMPAIGNS).find(c => c.id === d.campaignId);
            return `
                <div class="donation-item-main">
                    <div class="campaign-item-info">
                        <h4>${campaign ? sanitizeInput(campaign.title) : 'Deleted Campaign'}</h4>
                        <p>Amount: ${formatCurrency(d.amount)}</p>
                        <p>Date: ${formatDate(d.createdAt)}</p>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        donationsContainer.innerHTML = '<p style="color: var(--gray-500); padding: 20px;">No donations made yet.</p>';
    }
}

// Edit campaign
function editCampaign(campaignId) {
    const campaign = getData(STORAGE_KEYS.CAMPAIGNS).find(c => c.id === campaignId);
    
    if (!campaign || campaign.creatorId !== currentUser.id) {
        showToast('Campaign not found or unauthorized', 'error');
        return;
    }
    
    document.getElementById('editCampaignId').value = campaign.id;
    document.getElementById('editCampaignTitle').value = campaign.title;
    document.getElementById('editCampaignShortDesc').value = campaign.shortDescription;
    document.getElementById('editCampaignFullDesc').value = campaign.fullDescription;
    document.getElementById('editCampaignGoal').value = campaign.goalAmount;
    document.getElementById('editCampaignDeadline').value = campaign.deadline.split('T')[0];
    document.getElementById('editCampaignCategory').value = campaign.category;
    document.getElementById('editCampaignLocation').value = campaign.location;
    document.getElementById('editCampaignCoverImage').value = campaign.coverImageUrl;
    
    // Disable fields based on status
    const isPending = campaign.status === 'pending';
    document.getElementById('editCampaignTitle').disabled = !isPending;
    document.getElementById('editCampaignShortDesc').disabled = !isPending;
    document.getElementById('editCampaignGoal').disabled = !isPending;
    document.getElementById('editCampaignDeadline').disabled = !isPending;
    document.getElementById('editCampaignCategory').disabled = !isPending;
    document.getElementById('editCampaignLocation').disabled = !isPending;
    document.getElementById('editCampaignFullDesc').disabled = false;
    document.getElementById('editCampaignCoverImage').disabled = false;
    
    navigateTo('#edit-campaign');
}

// Render admin page
function renderAdminPage() {
    renderAdminStats();
    renderAdminCampaigns();
    renderAdminWithdrawals();
    renderAdminUsers();
}

// Render admin stats
function renderAdminStats() {
    const campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    const donations = getData(STORAGE_KEYS.DONATIONS);
    const users = getData(STORAGE_KEYS.USERS);
    
    const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedAmount, 0);
    const liveCount = campaigns.filter(c => c.status === 'live').length;
    
    document.getElementById('adminStats').innerHTML = `
        <div class="stat-card">
            <h4>Total Campaigns</h4>
            <div class="stat-value">${campaigns.length}</div>
        </div>
        <div class="stat-card">
            <h4>Live Campaigns</h4>
            <div class="stat-value">${liveCount}</div>
        </div>
        <div class="stat-card">
            <h4>Total Donations</h4>
            <div class="stat-value">${donations.length}</div>
        </div>
        <div class="stat-card">
            <h4>Total Raised</h4>
            <div class="stat-value">${formatCurrency(totalRaised)}</div>
        </div>
        <div class="stat-card">
            <h4>Registered Users</h4>
            <div class="stat-value">${users.length}</div>
        </div>
    `;
}

// Render admin campaigns tab
function renderAdminCampaigns() {
    const statusFilter = document.getElementById('adminCampaignStatusFilter').value;
    let campaigns = getData(STORAGE_KEYS.CAMPAIGNS);
    
    if (statusFilter !== 'all') {
        campaigns = campaigns.filter(c => c.status === statusFilter);
    }
    
    const tbody = document.getElementById('adminCampaignsTable');
    
    if (campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">No campaigns found</td></tr>';
        return;
    }
    
    tbody.innerHTML = campaigns.map(c => {
        const creator = getData(STORAGE_KEYS.USERS).find(u => u.id === c.creatorId);
        return `
            <tr>
                <td>${sanitizeInput(c.title)}</td>
                <td>${creator ? sanitizeInput(creator.name) : 'Unknown'}</td>
                <td>${formatCurrency(c.goalAmount)}</td>
                <td>${formatCurrency(c.raisedAmount)}</td>
                <td><span class="badge badge-${c.status}">${c.status}</span></td>
                <td>
                    <div class="admin-actions">
                        ${c.status === 'pending' ? `
                            <button class="btn btn-small btn-success" onclick="moderateCampaign('${c.id}', 'approve')">Approve</button>
                            <button class="btn btn-small btn-danger" onclick="rejectCampaign('${c.id}')">Reject</button>
                        ` : ''}
                        ${c.status === 'live' ? `
                            <button class="btn btn-small ${c.isFeatured ? 'btn-danger' : 'btn-secondary'}" onclick="toggleFeatured('${c.id}')">
                                ${c.isFeatured ? 'Unfeature' : 'Feature'}
                            </button>
                        ` : ''}
                        <button class="btn btn-small btn-secondary" onclick="viewCampaign('${c.id}')">View</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Reject campaign with reason
function rejectCampaign(campaignId) {
    const reason = prompt('Enter rejection reason:');
    if (reason !== null) {
        moderateCampaign(campaignId, 'reject', reason);
        renderAdminCampaigns();
    }
}

// Render admin withdrawals tab
function renderAdminWithdrawals() {
    const withdrawals = getData(STORAGE_KEYS.WITHDRAWALS);
    const tbody = document.getElementById('adminWithdrawalsTable');
    
    if (withdrawals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">No withdrawal requests</td></tr>';
        return;
    }
    
    tbody.innerHTML = withdrawals.map(w => {
        const campaign = getData(STORAGE_KEYS.CAMPAIGNS).find(c => c.id === w.campaignId);
        const creator = getData(STORAGE_KEYS.USERS).find(u => u.id === w.creatorId);
        return `
            <tr>
                <td>${campaign ? sanitizeInput(campaign.title) : 'Deleted'}</td>
                <td>${creator ? sanitizeInput(creator.name) : 'Unknown'}</td>
                <td>${formatCurrency(w.amount)}</td>
                <td>${formatDate(w.requestedAt)}</td>
                <td><span class="badge badge-${w.status}">${w.status}</span></td>
                <td>
                    <div class="admin-actions">
                        ${w.status === 'pending' ? `
                            <button class="btn btn-small btn-success" onclick="processWithdrawal('${w.id}', 'approve')">Mark Paid</button>
                            <button class="btn btn-small btn-danger" onclick="rejectWithdrawal('${w.id}')">Reject</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Reject withdrawal
function rejectWithdrawal(withdrawalId) {
    const reason = prompt('Enter rejection reason:');
    if (reason !== null) {
        processWithdrawal(withdrawalId, 'reject', reason);
        renderAdminWithdrawals();
    }
}

// Render admin users tab
function renderAdminUsers() {
    const users = getData(STORAGE_KEYS.USERS);
    const tbody = document.getElementById('adminUsersTable');
    
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${sanitizeInput(u.name)}</td>
            <td>${sanitizeInput(u.email)}</td>
            <td><span class="badge badge-${u.role === 'admin' ? 'live' : 'closed'}">${u.role}</span></td>
            <td>${formatDate(u.createdAt)}</td>
            <td>
                <div class="admin-actions">
                    ${u.id !== currentUser.id ? `
                        <button class="btn btn-small ${u.role === 'admin' ? 'btn-secondary' : 'btn-success'}" 
                                onclick="changeUserRole('${u.id}', '${u.role === 'admin' ? 'user' : 'admin'}">
                            ${u.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                        <button class="btn btn-small btn-danger" onclick="confirmDeleteUser('${u.id}')">Delete</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Confirm delete user
function confirmDeleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
        deleteUser(userId);
        renderAdminUsers();
    }
}

// Request withdrawal
function requestWithdrawal(campaignId) {
    requireLogin(() => {
        createWithdrawalRequest(campaignId);
        renderCampaignDetail();
    });
}

// Show notifications dropdown
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    dropdown.classList.toggle('hide');
    
    if (!dropdown.classList.contains('hide')) {
        renderNotifications();
    }
}

// Render notifications
function renderNotifications() {
    const notifications = getUserNotifications();
    const list = document.getElementById('notificationList');
    
    if (notifications.length === 0) {
        list.innerHTML = '<p class="no-notifications">No notifications</p>';
        return;
    }
    
    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}">
            <p>${sanitizeInput(n.message)}</p>
            <p class="time">${formatRelativeTime(n.createdAt)}</p>
        </div>
    `).join('');
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    initializeAdmin();
    checkExpiredCampaigns();
    
    // Load current user from localStorage
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    
    // Set up routing
    window.addEventListener('hashchange', handleRouting);
    handleRouting(); // Initial load
    
    // Mobile menu toggle
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
        document.getElementById('navMenu').classList.toggle('active');
    });
    
    // Notification button
    document.getElementById('notificationBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn()) {
            showToast('Please login to view notifications', 'error');
            return;
        }
        toggleNotifications();
    });
    
    // Close notification dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notificationDropdown');
        const btn = document.getElementById('notificationBtn');
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.add('hide');
        }
    });
    
    // Mark all notifications read
    document.getElementById('markAllReadBtn').addEventListener('click', () => {
        markAllNotificationsRead();
        renderNotifications();
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
    });
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        const user = registerUser(name, email, password);
        if (user) {
            navigateTo('#home');
        }
    });
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        const user = loginUser(email, password);
        if (user) {
            navigateTo('#home');
        }
    });
    
    // Create campaign form
    document.getElementById('createCampaignForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const today = new Date();
        const minDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const maxDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
        const deadline = new Date(document.getElementById('campaignDeadline').value);
        
        if (deadline < minDate || deadline > maxDate) {
            showToast('Deadline must be between 7 and 365 days from today', 'error');
            return;
        }
        
        const campaignData = {
            title: document.getElementById('campaignTitle').value,
            shortDescription: document.getElementById('campaignShortDesc').value,
            fullDescription: document.getElementById('campaignFullDesc').value,
            goalAmount: document.getElementById('campaignGoal').value,
            deadline: deadline.toISOString(),
            category: document.getElementById('campaignCategory').value,
            location: document.getElementById('campaignLocation').value,
            coverImageUrl: document.getElementById('campaignCoverImage').value
        };
        
        const campaign = createCampaign(campaignData);
        if (campaign) {
            navigateTo('#profile');
        }
    });
    
    // Edit campaign form
    document.getElementById('editCampaignForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const campaignId = document.getElementById('editCampaignId').value;
        const campaign = getData(STORAGE_KEYS.CAMPAIGNS).find(c => c.id === campaignId);
        
        if (!campaign) {
            showToast('Campaign not found', 'error');
            return;
        }
        
        const updates = {
            fullDescription: document.getElementById('editCampaignFullDesc').value,
            coverImageUrl: document.getElementById('editCampaignCoverImage').value
        };
        
        // If pending, allow editing all fields
        if (campaign.status === 'pending') {
            updates.title = document.getElementById('editCampaignTitle').value;
            updates.shortDescription = document.getElementById('editCampaignShortDesc').value;
            updates.goalAmount = parseFloat(document.getElementById('editCampaignGoal').value);
            updates.deadline = new Date(document.getElementById('editCampaignDeadline').value).toISOString();
            updates.category = document.getElementById('editCampaignCategory').value;
            updates.location = document.getElementById('editCampaignLocation').value;
        }
        
        updateCampaign(campaignId, updates);
        navigateTo('#profile');
    });
    
    // Donation form
    document.getElementById('donationForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('donationAmount').value);
        if (amount < 5) {
            showToast('Minimum donation is $5', 'error');
            return;
        }
        
        pendingDonation = {
            campaignId: document.getElementById('donationCampaignId').value,
            amount: amount,
            message: document.getElementById('donationMessage').value,
            anonymous: document.getElementById('donationAnonymous').checked
        };
        
        closeDonationModal();
        openPaymentModal(amount);
    });
    
    // Close donation modal
    document.getElementById('closeDonationModal').addEventListener('click', closeDonationModal);
    
    // Payment modal buttons
    document.getElementById('cancelPayment').addEventListener('click', closePaymentModal);
    document.getElementById('confirmPayment').addEventListener('click', confirmPayment);
    
    // Browse filters
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('sortFilter').addEventListener('change', applyFilters);
    
    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`admin${tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)}Tab`).classList.add('active');
        });
    });
    
    // Admin campaign filter
    document.getElementById('adminCampaignStatusFilter').addEventListener('change', renderAdminCampaigns);
});

// Make functions globally available
window.viewCampaign = viewCampaign;
window.openDonationModal = openDonationModal;
window.closeDonationModal = closeDonationModal;
window.confirmPayment = confirmPayment;
window.editCampaign = editCampaign;
window.moderateCampaign = moderateCampaign;
window.rejectCampaign = rejectCampaign;
window.toggleFeatured = toggleFeatured;
window.processWithdrawal = processWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.requestWithdrawal = requestWithdrawal;
window.shareCampaign = shareCampaign;
window.confirmDeleteUser = confirmDeleteUser;
window.changeUserRole = changeUserRole;
