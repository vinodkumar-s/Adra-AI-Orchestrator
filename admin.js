// ===================================
// Configuration
// ===================================
const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',

    // Toggle between Supabase and Legacy N8N
    USE_SUPABASE: true,
    N8N_WEBHOOK_URL: 'https://vinod3.app.n8n.cloud/webhook/chatbot',

    FIELDS: [
        'name', 'email', 'company', 'product_idea',
        'budget', 'timeline', 'market', 'kpi',
        'expectations', 'stage', 'urgency', 'project_requirements'
    ],
    STORAGE_KEY: 'adra_clients_data',
    CONVERSATION_API: 'https://vinod3.app.n8n.cloud/webhook/admin/conversation'
};

// Initialize Supabase Client
let supabaseClient = null;

async function initSupabase() {
    if (window.location.protocol === 'file:') {
        console.error('ERROR: Dashboard opened as file. Use http://localhost:8000/admin.html');
        alert('⚠️ IMPORTANT: You are viewing this dashboard as a local file. The AI Expert and Database connection will NOT work. \n\nPlease open http://localhost:8000/admin.html instead.');
    }

    try {
        const resp = await fetch('/config');
        const config = await resp.json();
        CONFIG.SUPABASE_URL = config.SUPABASE_URL;
        CONFIG.SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;

        if (CONFIG.USE_SUPABASE && CONFIG.SUPABASE_URL) {
            supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized successfully');
        }

        // Also update the widget's webhook if it exists
        if (config.ADMIN_AI_WEBHOOK_URL) {
            window.ADRA_AI_WEBHOOK_URL = config.ADMIN_AI_WEBHOOK_URL;
        }
    } catch (e) {
        console.error('❌ Failed to fetch config from backend:', e);
    }
}

// ===================================
// State Management
// ===================================
const state = {
    clients: [],
    fileUploads: {}, // Map of email -> array of files
    filteredClients: [],
    currentSort: { field: 'last_active', direction: 'desc' },
    filters: {
        search: '',
        status: 'all',
        completion: 'all'
    },
    // Notification System State
    activityFeed: [],
    activityBadge: 0,
    currentTab: 'details',
    selectedProjectId: null
};

// ===================================
// DOM Elements
// ===================================
const elements = {
    // Metrics
    totalClients: document.getElementById('total-clients'),
    qualifiedLeads: document.getElementById('qualified-leads'),
    avgCompletion: document.getElementById('avg-completion'),
    activeToday: document.getElementById('active-today'),

    // Controls
    searchInput: document.getElementById('search-input'),
    statusFilter: document.getElementById('status-filter'),
    completionFilter: document.getElementById('completion-filter'),
    clearFilters: document.getElementById('clear-filters'),
    refreshBtn: document.getElementById('refresh-btn'),
    exportBtn: document.getElementById('export-btn'),

    // Table
    clientsTable: document.getElementById('clients-table'),
    clientsTbody: document.getElementById('clients-tbody'),
    showingCount: document.getElementById('showing-count'),
    totalCount: document.getElementById('total-count'),
    emptyState: document.getElementById('empty-state'),

    // Modal
    modal: document.getElementById('client-modal'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.getElementById('modal-close'),

    // Notification Elements
    activityToggle: document.getElementById('activity-toggle'),
    activityBadge: document.getElementById('activity-badge'),
    activitySidebar: document.getElementById('activity-sidebar'),
    activityList: document.getElementById('activity-list'),
    closeActivity: document.getElementById('close-activity'),
    activityPills: document.querySelectorAll('.activity-pill')
};

// ===================================
// Mock Data Generator
// ===================================
function generateMockData() {
    const names = [
        'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Kim',
        'Jessica Williams', 'Robert Taylor', 'Amanda Martinez', 'James Anderson',
        'Lisa Thompson', 'Christopher Lee', 'Jennifer White', 'Daniel Harris'
    ];

    const companies = [
        'TechVision Inc', 'InnovateLabs', 'CloudScale Solutions', 'DataDrive Co',
        'NextGen Systems', 'SmartFlow Tech', 'Quantum Dynamics', 'FutureWorks',
        'Synergy Digital', 'Apex Innovations', 'Velocity Labs', 'Horizon Tech'
    ];

    const productIdeas = [
        'AI-powered analytics platform',
        'Mobile fitness tracking app',
        'B2B SaaS collaboration tool',
        'E-commerce marketplace',
        'Healthcare management system',
        'Educational learning platform',
        'Real estate CRM software',
        'Financial planning dashboard'
    ];

    const budgets = ['$10k-$25k', '$25k-$50k', '$50k-$100k', '$100k-$250k', '$250k+'];
    const timelines = ['1-3 months', '3-6 months', '6-12 months', '12+ months'];
    const markets = ['B2B SaaS', 'B2C Mobile', 'Enterprise', 'E-commerce', 'Healthcare', 'Education'];
    const stages = ['Ideation', 'MVP', 'Growth', 'Scale'];
    const urgencies = ['Low', 'Medium', 'High', 'Critical'];

    const mockClients = [];

    for (let i = 0; i < 15; i++) {
        const name = names[i % names.length];
        const email = name.toLowerCase().replace(' ', '.') + '@example.com';
        const company = companies[i % companies.length];

        const completedFields = Math.floor(Math.random() * 12);
        const completionPercentage = Math.round((completedFields / 11) * 100);

        const qualificationData = {
            name: name,
            email: email,
            company: company,
            product_idea: Math.random() > 0.3 ? productIdeas[Math.floor(Math.random() * productIdeas.length)] : null,
            budget: Math.random() > 0.4 ? budgets[Math.floor(Math.random() * budgets.length)] : null,
            timeline: Math.random() > 0.4 ? timelines[Math.floor(Math.random() * timelines.length)] : null,
            market: Math.random() > 0.3 ? markets[Math.floor(Math.random() * markets.length)] : null,
            kpi: Math.random() > 0.5 ? 'User engagement and retention' : null,
            expectations: Math.random() > 0.5 ? 'MVP within timeline and budget' : null,
            stage: Math.random() > 0.4 ? stages[Math.floor(Math.random() * stages.length)] : null,
            urgency: Math.random() > 0.4 ? urgencies[Math.floor(Math.random() * urgencies.length)] : null
        };

        const actualCompleted = Object.values(qualificationData).filter(v => v !== null).length;

        const daysAgo = Math.floor(Math.random() * 30);
        const lastActive = new Date();
        lastActive.setDate(lastActive.getDate() - daysAgo);

        const createdDaysAgo = daysAgo + Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - createdDaysAgo);

        let status = 'new';
        if (completionPercentage >= 70) status = 'qualified';
        else if (completionPercentage >= 30) status = 'in-progress';

        mockClients.push({
            client_id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
            created_at: createdAt.toISOString(),
            last_active: lastActive.toISOString(),
            qualification_data: qualificationData,
            completed_fields: actualCompleted,
            completion_percentage: Math.round((actualCompleted / 11) * 100),
            status: status
        });
    }

    return mockClients;
}

// ===================================
// Activity Notification Engine
// (Derives live insights from lead data)
// ===================================
function generateActivityFeed() {
    const events = [];
    const now = new Date();

    state.clients.forEach(client => {
        const lastActive = new Date(client.last_active);
        const createdAt = new Date(client.created_at);
        const diffMs = now - lastActive;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const createdDiffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        const name = client.qualification_data.name || 'Unknown Lead';
        const completion = client.completion_percentage;

        // 1. New Sign-ups (Created in last 48 hours)
        if (createdDiffDays <= 2) {
            events.push({
                id: `new-${client.client_id}`,
                type: 'new',
                title: `<b>${name}</b> just joined Adra!`,
                timestamp: createdAt,
                client: client,
                icon: 'user-plus'
            });
        }

        // 2. High Value Completion (Reached 70%+)
        if (completion >= 70 && createdDiffDays <= 7) {
            events.push({
                id: `milestone-${client.client_id}`,
                type: 'milestone',
                title: `<b>${name}</b> reached <b>${completion}%</b> completion.`,
                timestamp: lastActive,
                client: client,
                icon: 'award'
            });
        }

        // 3. Significant Progress
        if (completion >= 30 && completion < 70 && createdDiffDays <= 5) {
            events.push({
                id: `progress-${client.client_id}`,
                type: 'milestone',
                title: `<b>${name}</b> is onboarding (<b>${completion}%</b>)`,
                timestamp: lastActive,
                client: client,
                icon: 'trending-up'
            });
        }

        // 4. Inactivity Alerts
        if (diffDays >= 5 && completion < 100) {
            events.push({
                id: `alert-${client.client_id}`,
                type: 'alert',
                title: `<b>${name}</b> has been inactive for <b>${diffDays} days</b>.`,
                timestamp: lastActive,
                client: client,
                icon: 'alert-circle'
            });
        }
    });

    state.activityFeed = events.sort((a, b) => b.timestamp - a.timestamp);
    state.activityBadge = Math.min(state.activityFeed.length, 99);
    updateActivityBadge();
}

function updateActivityBadge() {
    if (state.activityBadge > 0) {
        elements.activityBadge.textContent = state.activityBadge;
        elements.activityBadge.style.display = 'flex';
    } else {
        elements.activityBadge.style.display = 'none';
    }
}

function renderActivityFeed(filterType = 'all') {
    elements.activityList.innerHTML = '';

    const filteredEvents = filterType === 'all'
        ? state.activityFeed
        : state.activityFeed.filter(e => e.type === filterType);

    if (filteredEvents.length === 0) {
        elements.activityList.innerHTML = `
            <div class="activity-empty">
                <p>No activity found for this category.</p>
            </div>
        `;
        return;
    }

    filteredEvents.forEach(event => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon ${event.type}">
                ${getNotificationIcon(event.icon)}
            </div>
            <div class="activity-content">
                <div class="activity-title">${event.title}</div>
                <div class="activity-meta">
                    <span>${formatTimeAgo(event.timestamp)}</span>
                    <span class="activity-dot"></span>
                    <span>${event.client.qualification_data.company || 'Private Lead'}</span>
                </div>
            </div>
        `;

        item.addEventListener('click', () => {
            openClientModal(event.client);
            toggleActivitySidebar(false);
        });

        elements.activityList.appendChild(item);
    });
}

function getNotificationIcon(iconName) {
    const icons = {
        'user-plus': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>',
        'award': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>',
        'trending-up': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
        'alert-circle': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
    };
    return icons[iconName] || icons['user-plus'];
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = { 'day': 86400, 'hr': 3600, 'min': 60 };
    for (let [name, val] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / val);
        if (interval >= 1) return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
}

function toggleActivitySidebar(show) {
    if (show) {
        elements.activitySidebar.classList.add('active');
        state.activityBadge = 0;
        updateActivityBadge();
        renderActivityFeed();
    } else {
        elements.activitySidebar.classList.remove('active');
    }
}

// ===================================
// Data Management
// ===================================
async function loadClientsData() {
    if (CONFIG.USE_SUPABASE) {
        await fetchFromSupabase();
    } else if (CONFIG.N8N_WEBHOOK_URL) {
        await fetchFromN8N();
    } else {
        loadFallbackData();
    }
    state.filteredClients = [...state.clients];
    generateActivityFeed();
}

function loadFallbackData() {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (stored) {
        try {
            state.clients = JSON.parse(stored);
        } catch (e) {
            state.clients = generateMockData();
        }
    } else {
        state.clients = generateMockData();
        saveClientsData();
    }
}

// ===================================
// Supabase Integration
// ===================================
async function fetchFromSupabase() {
    try {
        console.log('📡 Fetching data from Supabase...');

        if (!supabaseClient) {
            console.error('❌ Supabase client not initialized. Check your URL and Key.');
            loadFallbackData();
            return;
        }

        // 1. Fetch Leads with their Projects
        const { data: leads, error: leadsError } = await supabaseClient
            .from('leads')
            .select('*, projects(*)');

        if (leadsError) {
            console.error('❌ Error fetching from "leads" table:', leadsError);
            throw leadsError;
        }

        console.log('📊 Raw data from Supabase (leads + projects):', leads);

        // 2. Map Files to Leads by email
        state.fileUploads = {};
        if (leads) {
            leads.forEach(lead => {
                const email = lead.email;
                if (!email) return;

                if (lead.files) {
                    try {
                        let parsedFiles = typeof lead.files === 'string' ? JSON.parse(lead.files) : lead.files;
                        if (Array.isArray(parsedFiles)) {
                            state.fileUploads[email] = parsedFiles;
                        }
                    } catch (e) {
                        console.warn('⚠️ Error parsing files JSON for lead:', email, e);
                    }
                }
                if (!state.fileUploads[email]) state.fileUploads[email] = [];
            });
        }

        // 3. Transform leads to internal state format
        state.clients = (leads || []).map(lead => {
            // Sort projects by last_updated desc
            const projects = (lead.projects || []).sort((a, b) => 
                new Date(b.last_updated || b.created_at) - new Date(a.last_updated || a.created_at)
            );

            // Use the most recent project for overall lead status/progess calculations if available
            const latestProject = projects[0] || {};
            
            const completedFields = CONFIG.FIELDS.filter(field => {
                let val = (lead[field] && lead[field] !== '') ? lead[field] : latestProject[field];
                
                // Strict check for empty/placeholder values
                if (val === undefined || val === null || val === '') return false;
                
                // Ignore common placeholders
                const placeholders = ['not provided', 'n/a', 'none', 'unknown', 'null'];
                if (typeof val === 'string' && placeholders.includes(val.toLowerCase().trim())) return false;
                
                if (Array.isArray(val)) return val.length > 0;
                if (typeof val === 'object') return Object.keys(val).length > 0;
                
                return true;
            }).length;
            const completionPercentage = Math.round((completedFields / CONFIG.FIELDS.length) * 100);

            // Debug first client's completion
            if (leads.indexOf(lead) === 0) {
                console.log(`🔍 DEBUG [${lead.email}]:`, {
                    completed_count: completedFields,
                    total_fields: CONFIG.FIELDS.length,
                    percentage: completionPercentage,
                    fields_analysis: CONFIG.FIELDS.map(f => ({
                        field: f,
                        val: lead[f] || latestProject[f],
                        is_counted: CONFIG.FIELDS.filter(innerF => {
                             let v = (lead[innerF] && lead[innerF] !== '') ? lead[innerF] : latestProject[innerF];
                             if (v === undefined || v === null || v === '') return false;
                             const p = ['not provided', 'n/a', 'none', 'unknown', 'null'];
                             if (typeof v === 'string' && p.includes(v.toLowerCase().trim())) return false;
                             if (Array.isArray(v)) return v.length > 0;
                             if (typeof v === 'object') return Object.keys(v).length > 0;
                             return true;
                        }).includes(f)
                    }))
                });
            }

            const createdAt = lead.created_at || latestProject.created_at || new Date().toISOString();
            const lastActive = lead.last_updated || latestProject.last_updated || lead.updated_at || createdAt;

            return {
                client_id: lead.client_id || lead.id || `client_${lead.email}`,
                created_at: createdAt,
                last_active: lastActive,
                phone: lead.phone || '',
                projects: projects,
                qualification_data: {
                    name: lead.name || '',
                    email: lead.email || '',
                    company: lead.company || '',
                    stage: lead.stage || '',
                    sessionid: lead.sessionid || '',
                    // Keep compatibility with existing code that might expect these on qualification_data
                    product_idea: latestProject.product_idea || '',
                    budget: latestProject.budget || '',
                    timeline: latestProject.timeline || '',
                    market: latestProject.market || '',
                    kpi: latestProject.kpi || '',
                    expectations: latestProject.expectations || '',
                    urgency: latestProject.urgency || '',
                    project_insight: latestProject.project_insight || '',
                    notification_sent: lead.notification_sent || ''
                },
                completed_fields: completedFields,
                completion_percentage: completionPercentage,
                status: lead.status || latestProject.status || 'new'
            };
        });

        // 5. Sort by last_active
        state.clients.sort((a, b) => new Date(b.last_active) - new Date(a.last_active));

        saveClientsData();
        console.log('✅ Successfully loaded', state.clients.length, 'clients from Supabase');
    } catch (error) {
        console.error('❌ Critical error in fetchFromSupabase:', error);
        loadFallbackData();
    }
}

// ===================================
// N8N API Integration (Legacy)
// ===================================
async function fetchFromN8N() {
    try {
        console.log('📡 Fetching client data from N8N webhook...');

        const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        state.clients = transformGoogleSheetsData(data);
        saveClientsData();
    } catch (error) {
        console.error('❌ Error fetching from N8N:', error);
        loadFallbackData();
    }
}

function transformGoogleSheetsData(sheetsData) {
    if (!Array.isArray(sheetsData)) {
        console.warn('Expected array from Google Sheets, got:', typeof sheetsData);
        return [];
    }

    return sheetsData.map((row, index) => {
        const qualificationData = {
            name: row.name || row.Name || row.client_name || '',
            email: row.email || row.Email || '',
            company: row.company || row.Company || '',
            product_idea: row.product_idea || row.product || row.idea || '',
            budget: row.budget || row.Budget || '',
            timeline: row.timeline || row.Timeline || '',
            market: row.market || row.Market || row.target_market || '',
            kpi: row.kpi || row.KPI || row.key_metrics || '',
            expectations: row.expectations || row.Expectations || '',
            stage: row.stage || row.Stage || row.project_stage || '',
            urgency: row.urgency || row.Urgency || row.priority || ''
        };

        const completedFields = Object.values(qualificationData).filter(v => v && v !== '').length;
        const completionPercentage = Math.round((completedFields / 11) * 100);

        let status = 'new';
        if (completionPercentage >= 70) status = 'qualified';
        else if (completionPercentage >= 30) status = 'in-progress';

        const createdAt = row.created_at || row.timestamp || row.date || new Date().toISOString();
        const lastActive = row.last_active || row.updated_at || createdAt;

        return {
            client_id: row.client_id || row.id || `client_${Date.now()}_${index}`,
            created_at: createdAt,
            last_active: lastActive,
            qualification_data: qualificationData,
            completed_fields: completedFields,
            completion_percentage: completionPercentage,
            status: status
        };
    }).filter(client => client.qualification_data.name || client.qualification_data.email);
}

function saveClientsData() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.clients));
}

// ===================================
// Metrics Calculation
// ===================================
function updateMetrics() {
    const total = state.clients.length;
    const qualified = state.clients.filter(c => c.status === 'qualified').length;
    const avgCompletion = total > 0
        ? Math.round(state.clients.reduce((sum, c) => sum + c.completion_percentage, 0) / total)
        : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeToday = state.clients.filter(c => {
        const lastActive = new Date(c.last_active);
        lastActive.setHours(0, 0, 0, 0);
        return lastActive.getTime() === today.getTime();
    }).length;

    animateNumber(elements.totalClients, total);
    animateNumber(elements.qualifiedLeads, qualified);
    animateNumber(elements.avgCompletion, avgCompletion, '%');
    animateNumber(elements.activeToday, activeToday);
}

function animateNumber(element, target, suffix = '') {
    const duration = 1000;
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.round(current) + suffix;
    }, 16);
}

// ===================================
// Filtering and Sorting
// ===================================
function applyFilters() {
    let filtered = [...state.clients];

    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filtered = filtered.filter(client => {
            const data = client.qualification_data;
            return (
                (data.name && data.name.toLowerCase().includes(search)) ||
                (data.email && data.email.toLowerCase().includes(search)) ||
                (data.company && data.company.toLowerCase().includes(search)) ||
                (data.product_idea && data.product_idea.toLowerCase().includes(search))
            );
        });
    }

    if (state.filters.status !== 'all') {
        filtered = filtered.filter(c => c.status === state.filters.status);
    }

    if (state.filters.completion !== 'all') {
        filtered = filtered.filter(c => {
            const pct = c.completion_percentage;
            if (state.filters.completion === 'high') return pct > 70;
            if (state.filters.completion === 'medium') return pct >= 30 && pct <= 70;
            if (state.filters.completion === 'low') return pct < 30;
            return true;
        });
    }

    state.filteredClients = filtered;
    applySorting();
}

function applySorting() {
    const { field, direction } = state.currentSort;

    state.filteredClients.sort((a, b) => {
        let aVal, bVal;

        if (field === 'name') {
            aVal = a.qualification_data.name || '';
            bVal = b.qualification_data.name || '';
        } else if (field === 'email') {
            aVal = a.qualification_data.email || '';
            bVal = b.qualification_data.email || '';
        } else if (field === 'company') {
            aVal = a.qualification_data.company || '';
            bVal = b.qualification_data.company || '';
        } else if (field === 'completion') {
            aVal = a.completion_percentage;
            bVal = b.completion_percentage;
        } else if (field === 'status') {
            aVal = a.status;
            bVal = b.status;
        } else if (field === 'last_active') {
            aVal = new Date(a.last_active).getTime();
            bVal = new Date(b.last_active).getTime();
        } else if (field === 'files') {
            aVal = (state.fileUploads[a.qualification_data.email] || []).length;
            bVal = (state.fileUploads[b.qualification_data.email] || []).length;
        }

        if (state.currentSort.direction === 'asc' ? aVal > bVal : aVal < bVal) return 1;
        if (state.currentSort.direction === 'asc' ? aVal < bVal : aVal > bVal) return -1;
        return 0;
    });

    renderTable();
}

// ===================================
// Table Rendering
// ===================================
function renderTable() {
    elements.clientsTbody.innerHTML = '';
    elements.showingCount.textContent = state.filteredClients.length;
    elements.totalCount.textContent = state.clients.length;

    if (state.filteredClients.length === 0) {
        elements.emptyState.style.display = 'block';
        return;
    }

    elements.emptyState.style.display = 'none';

    state.filteredClients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="client-name">${client.qualification_data.name || 'Unknown'}</div>
            </td>
            <td>
                <div class="client-email">${client.qualification_data.email || 'No email'}</div>
            </td>
            <td>${client.qualification_data.company || 'N/A'}</td>
            <td>
                <div class="project-count-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                    </svg>
                    <span>${client.projects.length} ${client.projects.length === 1 ? 'project' : 'projects'}</span>
                </div>
            </td>
            <td>
                <div class="completion-bar">
                    ${renderProgressRing(client.completion_percentage)}
                    <span>${client.completion_percentage}%</span>
                </div>
            </td>
            <td>
                <div class="file-count-badge ${(state.fileUploads[client.qualification_data.email] || []).length > 0 ? 'has-files' : ''}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <span>${(state.fileUploads[client.qualification_data.email] || []).length}</span>
                </div>
            </td>
            <td>
                <span class="status-badge ${client.status}">${client.status}</span>
            </td>
            <td>
                <span class="time-ago">${formatTimeAgo(client.last_active)}</span>
            </td>
            <td>
                <button class="action-btn" data-client-id="${client.client_id}">View Details</button>
            </td>
        `;

        const viewBtn = row.querySelector('.action-btn');
        viewBtn.addEventListener('click', () => openClientModal(client));

        elements.clientsTbody.appendChild(row);
    });

    document.querySelectorAll('.clients-table thead th').forEach(th => {
        th.classList.remove('sorted', 'asc', 'desc');
        if (th.dataset.sort === state.currentSort.field) {
            th.classList.add('sorted', state.currentSort.direction);
        }
    });
}

function renderProgressRing(percentage) {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let color = '#6366f1';
    if (percentage >= 70) color = '#34d399';
    else if (percentage >= 30) color = '#f59e0b';

    return `
        <div class="progress-ring">
            <svg width="40" height="40">
                <circle class="progress-ring-bg" cx="20" cy="20" r="${radius}" />
                <circle class="progress-ring-fill" cx="20" cy="20" r="${radius}"
                    stroke="${color}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}" />
            </svg>
            <div class="progress-text">${percentage}%</div>
        </div>
    `;
}

// ===================================
// Modal System
// ===================================
function openClientModal(client) {
    state.currentTab = 'details'; // Reset to default
    state.selectedProjectId = client.projects.length > 0 ? client.projects[0].id : null;
    renderModalContent(client);
    elements.modal.classList.add('active');
    updateMsgCount(client);
}

async function updateMsgCount(client) {
    const badge = document.getElementById('msg-count-badge');
    const email = client.qualification_data.email;
    if (!badge) return;
    
    try {
        const response = await fetch(`${CONFIG.CONVERSATION_API}?email=${encodeURIComponent(email)}`);
        if (response.ok) {
            const data = await response.json();
            badge.textContent = data.total || (data.messages ? data.messages.length : 0);
        }
    } catch (e) {
        badge.textContent = '0';
    }
}

function renderModalContent(client) {
    const data = client.qualification_data;
    
    // Header with Tabs
    elements.modalBody.innerHTML = `
        <div class="modal-tabs">
            <button class="modal-tab ${state.currentTab === 'details' ? 'active' : ''}" id="tab-details">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                Details
            </button>
            <button class="modal-tab ${state.currentTab === 'conversation' ? 'active' : ''}" id="tab-conversation">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Conversation <span class="tab-badge" id="msg-count-badge">...</span>
            </button>
        </div>
        <div id="tab-content-container">
            ${state.currentTab === 'details' ? renderDetailsTabContent(client) : renderConversationTabContent(client)}
        </div>
    `;

    // Add Tab Listeners
    document.getElementById('tab-details').addEventListener('click', () => {
        state.currentTab = 'details';
        renderModalContent(client);
    });
    
    document.getElementById('tab-conversation').addEventListener('click', () => {
        state.currentTab = 'conversation';
        renderModalContent(client);
        fetchConversation(client);
    });

    // Handle Project Selection Change
    const projectSelector = document.getElementById('project-selector');
    if (projectSelector) {
        projectSelector.addEventListener('change', (e) => {
            state.selectedProjectId = parseInt(e.target.value);
            renderModalContent(client);
        });
    }

    // If on conversation tab, we don't need to do anything special here as fetchConversation will handle it
    if (state.currentTab === 'conversation') {
        fetchConversation(client);
    }
}

function renderDetailsTabContent(client) {
    const leadFields = ['name', 'email', 'phone', 'company', 'stage'];
    const leadInfoHtml = leadFields.map(field => {
        const value = client.qualification_data[field] || client[field];
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return `
            <div class="info-card">
                <div class="info-label">${label}</div>
                <div class="info-value ${!value ? 'empty' : ''}">${value || 'Not provided'}</div>
            </div>
        `;
    }).join('');

    const projects = client.projects || [];
    const selectedProject = projects.find(p => p.id === state.selectedProjectId) || projects[0];

    let projectsContent = '';
    if (projects.length === 0) {
        projectsContent = `
            <div class="qualification-progress">
                <h3>Projects</h3>
                <p class="info-value empty">No projects yet for this lead.</p>
            </div>
        `;
    } else {
        projectsContent = `
            <div class="qualification-progress">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>Projects</h3>
                    ${projects.length > 1 ? `
                        <select class="project-dropdown" id="project-selector">
                            ${projects.map(p => `<option value="${p.id}" ${p.id === selectedProject.id ? 'selected' : ''}>${p.product_idea || 'Untitled Project'}</option>`).join('')}
                        </select>
                    ` : ''}
                </div>

                ${renderProjectDetail(selectedProject)}
            </div>
        `;
    }

    return `
        <div class="client-info-grid">
            ${leadInfoHtml}
        </div>

        ${projectsContent}

        <div class="qualification-progress">
            <h3>Uploaded Files</h3>
            <div class="files-list">
                ${renderFileList(client.qualification_data.email)}
            </div>
        </div>

        <div class="qualification-progress">
            <h3>Timeline</h3>
            <div class="client-info-grid">
                <div class="info-card">
                    <div class="info-label">Lead Created</div>
                    <div class="info-value">${formatDate(client.created_at)}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Last Interaction</div>
                    <div class="info-value">${formatDate(client.last_active)}</div>
                </div>
            </div>
        </div>
    `;
}

function renderProjectDetail(project) {
    if (!project) return '<p class="info-value empty">Project details missing.</p>';

    const budget = formatBudget(project.budget);
    const date = formatDateShort(project.created_at);

    return `
        <div class="project-detail-card glass-card">
            <div class="project-header">
                <div class="project-title">
                    <h4>${project.product_idea || 'Untitled Project'}</h4>
                    <span class="status-badge ${project.status === 'active' ? 'active' : 'closed'}">${project.status || 'active'}</span>
                </div>
                <span class="project-date">Created ${date}</span>
            </div>

            <div class="project-grid">
                <div class="info-card mini">
                    <div class="info-label">Budget</div>
                    <div class="info-value">${budget}</div>
                </div>
                <div class="info-card mini">
                    <div class="info-label">Timeline</div>
                    <div class="info-value">${project.timeline || 'Not provided'}</div>
                </div>
                <div class="info-card mini">
                    <div class="info-label">Stage</div>
                    <div class="info-value" style="text-transform: capitalize;">${project.stage || 'Not provided'}</div>
                </div>
                <div class="info-card mini">
                    <div class="info-label">Urgency</div>
                    <div class="info-value" style="text-transform: capitalize;">${project.urgency || 'Not provided'}</div>
                </div>
            </div>

            <div class="project-section">
                <div class="info-label">Secondary Details</div>
                <div class="project-grid">
                    <div class="info-card secondary">
                        <div class="info-label">Target Market</div>
                        <div class="info-value">${project.market || 'Not provided'}</div>
                    </div>
                    <div class="info-card secondary">
                        <div class="info-label">Key KPIs</div>
                        <div class="info-value">${project.kpi || 'Not provided'}</div>
                    </div>
                    <div class="info-card secondary">
                        <div class="info-label">Expectations</div>
                        <div class="info-value">${project.expectations || 'Not provided'}</div>
                    </div>
                </div>
            </div>

            <div class="project-section">
                <div class="info-label">Requirements</div>
                <div class="requirements-tags">
                    ${renderRequirementsTags(project.project_requirements)}
                </div>
            </div>

            <div class="project-section collapsible-section">
                <button class="insight-toggle" onclick="this.nextElementSibling.classList.toggle('active'); this.querySelector('.arrow').classList.toggle('rotated');">
                    <span>Project Insight</span>
                    <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <div class="insight-content">
                    <div class="info-value content-markdown">
                        ${formatMarkdown(project.project_insight) || 'No insight available for this project.'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function formatBudget(value) {
    if (!value) return '<span class="empty">Not provided</span>';
    const valStr = String(value);
    if (valStr.includes('$') || valStr.includes('USD')) return valStr;
    if (valStr.includes('₹')) return valStr;
    
    // Format as ₹ if just a number or simple string
    const num = parseFloat(valStr.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return valStr;
    
    return '₹' + num.toLocaleString('en-IN');
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function renderRequirementsTags(reqs) {
    if (!reqs || !Array.isArray(reqs) || reqs.length === 0) {
        return '<p class="info-value empty">No requirements specified.</p>';
    }
    return reqs.map(req => `<span class="req-tag">${req}</span>`).join('');
}

function renderConversationTabContent(client) {
    return `
        <div class="chat-wrapper">
            <div class="chat-header-actions">
                <button class="chat-refresh-btn" id="chat-refresh" title="Refresh conversation">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                </button>
            </div>
            <div class="chat-container" id="chat-messages-container">
                <div class="chat-loading">
                    <span></span><span></span><span></span>
                </div>
            </div>
            <button class="scroll-top-btn" id="scroll-top">Scroll to top</button>
        </div>
    `;
}

async function fetchConversation(client) {
    const container = document.getElementById('chat-messages-container');
    const badge = document.getElementById('msg-count-badge');
    const refreshBtn = document.getElementById('chat-refresh');
    const email = client.qualification_data.email;

    if (!container) return;

    // Show loading
    container.innerHTML = `
        <div class="chat-loading">
            <span></span><span></span><span></span>
        </div>
    `;

    try {
        const response = await fetch(`${CONFIG.CONVERSATION_API}?email=${encodeURIComponent(email)}`);
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        const messages = data.messages || [];
        
        console.log('💬 Conversation data received:', data);
        if (messages.length > 0) console.log('📄 Sample message object:', messages[0]);
        
        // Update badge
        if (badge) badge.textContent = messages.length;
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="chat-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>No conversation history for this lead.</p>
                </div>
            `;
        } else {
            container.innerHTML = messages.map(msg => `
                <div class="msg-group ${msg.type}">
                    <div class="msg-label">${msg.type === 'human' ? 'User' : 'Adra AI'}</div>
                    <div class="msg-bubble">
                        <div class="msg-content">${msg.content}</div>
                        ${msg.has_file ? `
                            <div class="file-ref">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                </svg>
                                <em>Contains file attachment</em>
                            </div>
                        ` : ''}
                    </div>
                    <div class="msg-id">
                        #${msg.id} ${ (msg.timestamp || msg.created_at || msg.time) ? `&bull; ${formatMessageTime(msg.timestamp || msg.created_at || msg.time)}` : '' }
                    </div>
                </div>
            `).join('');
            
            // Auto scroll to bottom
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }

        // Add refresh listener
        if (refreshBtn) {
            refreshBtn.onclick = () => fetchConversation(client);
        }

        // Add scroll listener for "Scroll to top"
        const scrollTopBtn = document.getElementById('scroll-top');
        if (scrollTopBtn) {
            container.onscroll = () => {
                if (container.scrollTop > 200) {
                    scrollTopBtn.classList.add('visible');
                } else {
                    scrollTopBtn.classList.remove('visible');
                }
            };
            scrollTopBtn.onclick = () => {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            };
        }

    } catch (error) {
        console.error('Error fetching conversation:', error);
        container.innerHTML = `
            <div class="chat-error">
                <p>Failed to load conversation. Try again.</p>
                <button id="retry-chat">Retry</button>
            </div>
        `;
        const retryBtn = document.getElementById('retry-chat');
        if (retryBtn) {
            retryBtn.onclick = () => fetchConversation(client);
        }
    }
}

function renderRequirementsList(requirements) {
    if (!requirements || requirements.length === 0) {
        return '<p class="info-value empty">No structured requirements extracted yet.</p>';
    }

    return requirements.map(req => {
        // If it starts with SOURCE:, format it slightly differently
        if (typeof req === 'string' && req.startsWith('SOURCE:')) {
            return `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;"><em>${req}</em></div>`;
        }

        return `
            <div style="padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px; font-size: 0.9rem;">
                <span style="color: var(--accent-purple); margin-right: 8px;">•</span> ${req}
            </div>
        `;
    }).join('');
}

function renderFileList(email) {
    const files = state.fileUploads[email] || [];

    if (files.length === 0) {
        return '<p class="info-value empty">No files uploaded by this lead.</p>';
    }

    return files.map((file) => {
        // Attempt to find a valid URL/Path in various possible columns
        // For S3 uploads via JSON array, it's usually inside s3_url
        let fileLink = file.s3_url || file.drive_link || file.file_url || file.url || file.link || file.public_url || file.file || file.path || '#';

        // Support multiple common column names for filename
        // It might be nested in the s3_url path for the new schema
        let fileName = file.file_name || file.name || file.filename;
        if (!fileName && file.s3_url) {
            fileName = file.s3_url.split('/').pop();
        }

        // If filename is missing but we have a drive link, try to make it readable
        if (!fileName && file.drive_link) {
            fileName = 'Google Drive File';
        } else if (!fileName) {
            fileName = 'Untitled File';
        }

        // If it looks like a Supabase storage path (not a full URL), construct the public URL
        if (fileLink !== '#' && !fileLink.startsWith('http')) {
            // Default to 'leads' bucket if not specified
            const bucket = file.bucket || file.bucket_name || 'leads';
            fileLink = `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileLink}`;
        }

        // Derive file type and ensure it's clean for comparison
        let fileType = file.file_type || fileName.split('.').pop() || 'FILE';
        if (typeof fileType === 'string') fileType = fileType.trim().toUpperCase();

        // Added 'uploaded_at' as high priority based on console feedback
        const fileDate = file.uploaded_at || file.created_at || file.timestamp;
        const uploadedAt = fileDate ? formatDate(fileDate) : 'Unknown date';

        // Log if we couldn't find a link
        if (fileLink === '#') {
            console.warn(`⚠️ No URL found for file: ${fileName}`, file);
        }

        return `
            <div class="file-item" style="display: flex; flex-direction: column;" id="file-${Math.random().toString(36).substr(2, 9)}">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <a href="${fileLink}" target="_blank" rel="noopener noreferrer" class="file-info" 
                       onclick="if(this.getAttribute('href') === '#') { event.preventDefault(); console.error('❌ Link is empty for file:', ${JSON.stringify(file)}); alert('File link is missing in database. Check console for details.'); }">
                        <div class="file-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                <polyline points="13 2 13 9 20 9"></polyline>
                            </svg>
                        </div>
                        <div class="file-details">
                            <span class="file-name">${fileName}</span>
                            <span class="file-meta">${fileType} • Uploaded ${uploadedAt}</span>
                        </div>
                    </a>
                    
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${(fileType === 'PDF' || fileName.toLowerCase().endsWith('.pdf')) ? `
                            <button class="btn-analyze-file" data-file-url="${fileLink}" data-file-name="${fileName}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <path d="M12 3l1.912 5.886L20 10.8l-5.886 1.912L12 21l-1.912-5.886L4 12.2l5.886-1.912L12 3z"></path>
                                </svg>
                                Analyze
                            </button>
                        ` : ''}
                        
                        <a href="${fileLink}" target="_blank" rel="noopener noreferrer" class="view-link"
                           onclick="if(this.getAttribute('href') === '#') { event.preventDefault(); alert('Error: File URL not found in database.'); }">
                            View
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
                
                <div class="file-insight-container" style="display: none; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 12px; margin-top: 10px; border: 1px solid rgba(147, 51, 234, 0.2);">
                    <div class="file-insight-title" style="font-size: 0.75rem; font-weight: 800; color: #c084fc; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M12 3l1.912 5.886L20 10.8l-5.886 1.912L12 21l-1.912-5.886L4 12.2l5.886-1.912L12 3z"></path>
                        </svg>
                        Elite AI Document Analyst
                    </div>
                    <div class="file-insight-body" style="font-size: 0.85rem; line-height: 1.6; color: white; white-space: pre-wrap;"></div>
                </div>
            </div>`;
    }).join('');
}

function closeClientModal() {
    elements.modal.classList.remove('active');
}

// ===================================
// Utility Functions
// ===================================
function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatMarkdown(text) {
    if (!text) return '';
    
    // 1. Basic Escaping
    let safe = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // 2. Pre-process: Ensure labels and bullets have newlines if they appear mid-text
    // Use [ ] instead of \s to prevent matching across newlines
    safe = safe.replace(/([^A-Za-z0-9\n])\s*([A-Z][A-Za-z ]{2,}:)/g, '$1\n$2'); 
    safe = safe.replace(/(\S)\s*([-•]\s+)/g, '$1\n$2');             // Newline before bullets

    // 3. Bold headers (Label followed by colon at start of line or after newline)
    // Use [ ] instead of \s to prevent the header itself from spanning multiple lines
    // 🔥 Merge broken headings like "Budget\nInsight:" → "Budget Insight:"
    safe = safe.replace(/([A-Za-z]+)\s*\n\s*(Insight:)/g, '$1 $2');

    // 4. Bold markers (**text**)
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 5. Bullet points (- bullet)
    safe = safe.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');

    // 6. Wrap <li> groups in <ul>
    safe = safe.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul style="margin: 10px 0 10px 20px; list-style-type: disc;">${match}</ul>`);

    // 7. Line breaks (only for those not already inside <ul> or <li>)
    safe = safe.replace(/\n/g, '<br>');

    // 8. Merge split bold headers (e.g., <strong>Budget</strong><br><strong>Insight:</strong>)
    // This happens when AI outputs headers with separate bolding on new lines
    safe = safe.replace(/([A-Za-z ]+)\s*\n\s*([A-Za-z ]+:)/g, '$1 $2');

    // Clean up
    safe = safe.replace(/<\/ul><br>/g, '</ul>');
    safe = safe.replace(/<br><ul>/g, '<ul>');
    
    // Fix common AI artifact: double strong tags
    safe = safe.replace(/<strong><strong>(.*?)<\/strong><\/strong>/g, '<strong>$1</strong>');

    return safe;
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    return `${Math.floor(seconds / 2592000)}mo ago`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===================================
// Export Functionality
// ===================================
function exportData() {
    const dataStr = JSON.stringify(state.filteredClients, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `adra-clients-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ===================================
// Event Listeners
// ===================================
function initializeEventListeners() {
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        applyFilters();
    });

    elements.statusFilter.addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        applyFilters();
    });

    elements.completionFilter.addEventListener('change', (e) => {
        state.filters.completion = e.target.value;
        applyFilters();
    });

    elements.clearFilters.addEventListener('click', () => {
        state.filters = { search: '', status: 'all', completion: 'all' };
        elements.searchInput.value = '';
        elements.statusFilter.value = 'all';
        elements.completionFilter.value = 'all';
        applyFilters();
    });

    document.querySelectorAll('.clients-table thead th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            if (state.currentSort.field === field) {
                state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.currentSort.field = field;
                state.currentSort.direction = 'desc';
            }
            applySorting();
        });
    });

    elements.modalClose.addEventListener('click', closeClientModal);
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeClientModal();
        }
    });

    elements.refreshBtn.addEventListener('click', async () => {
        console.log('🔄 Refreshing data...');
        await loadClientsData();
        updateMetrics();
        applyFilters();
        console.log('✅ Data refreshed');
    });

    elements.exportBtn.addEventListener('click', exportData);

    // Activity Sidebar Listeners
    elements.activityToggle.addEventListener('click', () => {
        const isActive = elements.activitySidebar.classList.contains('active');
        toggleActivitySidebar(!isActive);
    });

    elements.closeActivity.addEventListener('click', () => {
        toggleActivitySidebar(false);
    });

    elements.activityPills.forEach(pill => {
        pill.addEventListener('click', () => {
            elements.activityPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const filterType = pill.dataset.type;
            renderActivityFeed(filterType);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.modal && elements.modal.classList.contains('active')) {
                closeClientModal();
            }
            if (elements.activitySidebar && elements.activitySidebar.classList.contains('active')) {
                toggleActivitySidebar(false);
            }
        }
    });

    // Delegated click listener for dynamic modal content
    elements.modalBody.addEventListener('click', async (e) => {
        // Handle Strategic Report
        const insightBtn = e.target.closest('#get-expert-insights');
        if (insightBtn) {
            const clientId = insightBtn.dataset.clientId;
            await fetchAdraInsights(clientId);
            return;
        }

        // Handle PDF Document Analysis
        const analyzeBtn = e.target.closest('.btn-analyze-file');
        if (analyzeBtn) {
            await analyzeDocument(analyzeBtn);
        }
    });
}

// ===================================
// Initialization
// ===================================
async function init() {
    console.log('🚀 Adra Admin Dashboard initializing...');

    await initSupabase();
    await loadClientsData();
    updateMetrics();
    applyFilters();
    initializeEventListeners();

    console.log('✅ Admin Dashboard ready');
    console.log('📊 Total clients:', state.clients.length);
}

// ===================================
// Adra Expert Insights logic
// ===================================
async function fetchAdraInsights(clientId) {
    const client = state.clients.find(c => c.client_id === clientId);
    if (!client) return;

    const data = client.qualification_data || {};
    const resultContainer = document.getElementById(`expert-result-${clientId}`);
    const btn = document.getElementById('get-expert-insights');

    // 1. Loading State
    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
        <div class="expert-loader">
            <span></span><span></span><span></span>
        </div>
    `;
    resultContainer.innerHTML = `
        <div class="expert-placeholder">
            <div class="expert-loader"><span></span><span></span><span></span></div>
            <p>Adra Expert is calculating feasibility and strategic outlook...</p>
        </div>
    `;

    try {
        const response = await fetch('/expert-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idea: data.product_idea || 'No idea provided',
                budget: data.budget || 'No budget provided',
                context: {
                    urgency: data.urgency,
                    market: data.market
                }
            })
        });

        const result = await response.json();

        // 2. Clear Loading
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Review Done
        `;

        // 3. Render with Typewriter effect
        resultContainer.innerHTML = `<div class="expert-text" id="expert-text-content"></div>`;
        const textEl = document.getElementById('expert-text-content');

        await typewriterEffect(textEl, result.insight || "Sorry, I couldn't generate an insight at this time.");

    } catch (error) {
        console.error('Expert Insight Fetch Error:', error);
        resultContainer.innerHTML = `
            <div class="info-value error" style="padding: 15px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; margin-top: 10px; border: 1px solid rgba(239, 68, 68, 0.2);">
                <strong>⚠️ Connection Failed</strong><br>
                <small style="opacity: 0.8; display: block; margin-top: 4px;">${error.message}</small>
                <p style="font-size: 0.8rem; margin-top: 10px; opacity: 0.7;">This happens if <b>agent_server.py</b> is not running or is a stale version.</p>
            </div>
        `;
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 3l1.912 5.886L20 10.8l-5.886 1.912L12 21l-1.912-5.886L4 12.2l5.886-1.912L12 3z"></path>
            </svg>
            RETRY STRATEGY
        `;
    }
}

async function analyzeDocument(btn) {
    const fileUrl = btn.getAttribute('data-file-url');
    const fileName = btn.getAttribute('data-file-name');
    const item = btn.closest('.file-item');
    const container = item.querySelector('.file-insight-container');
    const body = container.querySelector('.file-insight-body');

    // Toggle if already open
    if (container.style.display === 'block') {
        container.style.display = 'none';
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 3l1.912 5.886L20 10.8l-5.886 1.912L12 21l-1.912-5.886L4 12.2l5.886-1.912L12 3z"></path>
            </svg>
            Analyze
        `;
        return;
    }

    // 1. Loading State
    container.style.display = 'block';
    btn.disabled = true;
    btn.innerHTML = 'Analyzing...';
    body.innerHTML = `
        <div style="display: flex; gap: 6px; padding: 10px 0;">
            <div style="width: 6px; height: 6px; background: #c084fc; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both;"></div>
            <div style="width: 6px; height: 6px; background: #c084fc; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.16s;"></div>
            <div style="width: 6px; height: 6px; background: #c084fc; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: 0.32s;"></div>
        </div>
    `;

    try {
        const response = await fetch('/analyze-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: fileUrl, name: fileName })
        });

        if (!response.ok) throw new Error('Analysis failed');
        const data = await response.json();

        // 2. Clear Loading & Typewrite
        body.innerHTML = '';
        btn.innerHTML = 'Close Insight';
        btn.disabled = false;

        await typewriterEffect(body, data.analysis || "No requirements found in document.");

    } catch (error) {
        console.error('Doc Analysis Error:', error);
        body.innerHTML = `<span style="color: #ef4444; font-size: 0.8rem;">⚠️ Error: ${error.message}. Make sure the file exists and is accessible.</span>`;
        btn.innerHTML = 'Retry';
        btn.disabled = false;
    }
}

function typewriterEffect(element, text) {
    return new Promise((resolve) => {
        let i = 0;
        element.innerHTML = '<span class="typewriter-cursor"></span>';

        // Basic Markdown Support (bolding)
        // Use the global formatMarkdown utility
        const formattedText = formatMarkdown(text);

        const timer = setInterval(() => {
            if (i < formattedText.length) {
                if (formattedText[i] === '<') {
                    const tagEnd = formattedText.indexOf('>', i);
                    if (tagEnd !== -1) { i = tagEnd + 1; }
                } else {
                    i++;
                }
                element.innerHTML = formattedText.substring(0, i) + '<span class="typewriter-cursor"></span>';

                // Auto-scroll modal body as typewriter progresses
                elements.modalBody.scrollTop = elements.modalBody.scrollHeight;
            } else {
                clearInterval(timer);
                const cursor = element.querySelector('.typewriter-cursor');
                if (cursor) cursor.remove();
                resolve();
            }
        }, 12);
    });
}

document.addEventListener('DOMContentLoaded', init);

// ============================================================
// ADRA AI INTELLIGENCE ASSISTANT — Widget Logic
// ============================================================
(function () {
    'use strict';

    // ── CONFIG ──────────────────────────────────────────────
    // n8n Chat Trigger webhook for the Admin Intelligence Agent
    // The Chat Trigger generates a URL like:
    //   https://<your-n8n-host>/webhook/<webhookId>/chat
    const AI_WEBHOOK_URL = 'https://vinod3.app.n8n.cloud/webhook/b3b0a7fe-5eef-4449-b480-7ef11c51ae63/chat';

    // Session ID persisted across page visits so Postgres memory works
    const SESSION_KEY = 'adra_admin_ai_session';
    const HISTORY_KEY = 'adra_admin_ai_history';

    // ── STATE ────────────────────────────────────────────────
    let isOpen = false;
    let isBusy = false;
    let sessionId = localStorage.getItem(SESSION_KEY) || generateSessionId();
    let history = [];  // [{role:'user'|'bot', text:'...'}, ...]

    localStorage.setItem(SESSION_KEY, sessionId);

    function generateSessionId() {
        return 'admin_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    }

    // ── ELEMENT REFS ─────────────────────────────────────────
    const toggleBtn = document.getElementById('adra-ai-toggle');
    const closeBtn = document.getElementById('adra-ai-close');
    const clearBtn = document.getElementById('adra-ai-clear');
    const panel = document.getElementById('adra-ai-panel');
    const messagesEl = document.getElementById('adra-ai-messages');
    const typingEl = document.getElementById('adra-ai-typing');
    const inputEl = document.getElementById('adra-ai-input');
    const sendBtn = document.getElementById('adra-ai-send');
    const badge = document.getElementById('adra-ai-badge');
    const quickPromptsContainer = document.getElementById('adra-quick-prompts');

    if (!toggleBtn) return; // widget not in DOM, bail

    // ── OPEN / CLOSE ─────────────────────────────────────────
    function openPanel() {
        isOpen = true;
        panel.classList.add('adra-open');
        panel.setAttribute('aria-hidden', 'false');
        toggleBtn.setAttribute('aria-expanded', 'true');
        badge.style.display = 'none';

        // Ensure the newly opened panel is visible within screen bounds
        clampWidgetPosition();

        setTimeout(() => inputEl.focus(), 350);
        scrollToBottom();
    }

    function closePanel() {
        isOpen = false;
        panel.classList.remove('adra-open');
        panel.setAttribute('aria-hidden', 'true');
        toggleBtn.setAttribute('aria-expanded', 'false');
    }

    closeBtn.addEventListener('click', closePanel);

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (isOpen && !panel.contains(e.target) && !toggleBtn.contains(e.target)) {
            closePanel();
        }
    });

    // Keyboard: Escape closes
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) closePanel();
    });

    // ── CLEAR CONVERSATION ───────────────────────────────────
    clearBtn.addEventListener('click', () => {
        if (isBusy) return;
        history = [];
        // Remove all messages except the welcome block
        const msgs = messagesEl.querySelectorAll('.adra-ai-msg:not(.adra-ai-msg--welcome)');
        msgs.forEach(m => m.remove());
        // Restore quick prompts
        if (quickPromptsContainer) {
            quickPromptsContainer.style.display = 'flex';
        }
        // New session
        sessionId = generateSessionId();
        localStorage.setItem(SESSION_KEY, sessionId);
    });

    // ── TEXTAREA AUTO-RESIZE ─────────────────────────────────
    inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    });

    // ── SEND ON ENTER (shift+enter = newline) ────────────────
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    // ── QUICK PROMPTS ────────────────────────────────────────
    document.addEventListener('click', (e) => {
        if (e.target.closest('.adra-quick-btn')) {
            const btn = e.target.closest('.adra-quick-btn');
            const prompt = btn.dataset.prompt;
            if (prompt) {
                // Hide quick prompts after first use
                if (quickPromptsContainer) quickPromptsContainer.style.display = 'none';
                submitMessage(prompt);
            }
        }
    });

    // ── CORE SEND ────────────────────────────────────────────
    function sendMessage() {
        const text = inputEl.value.trim();
        if (!text || isBusy) return;
        inputEl.value = '';
        inputEl.style.height = 'auto';
        if (quickPromptsContainer) quickPromptsContainer.style.display = 'none';
        submitMessage(text);
    }

    async function submitMessage(text) {
        if (isBusy) return;

        // Append user message
        appendMessage('user', text);
        history.push({ role: 'user', text });

        // Show typing
        isBusy = true;
        sendBtn.disabled = true;
        inputEl.disabled = true;
        typingEl.style.display = 'flex';
        scrollToBottom();

        try {
            const response = await fetch(AI_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sendMessage',
                    sessionId: sessionId,
                    chatInput: text,
                    metadata: { source: 'admin_dashboard' }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // n8n chat trigger returns: { output: "..." } or { message: "..." }
            const reply = data.output
                || data.message
                || data.text
                || data.response
                || data.content
                || (Array.isArray(data) && data[0]?.output)
                || JSON.stringify(data);

            typingEl.style.display = 'none';
            appendMessage('bot', reply);
            history.push({ role: 'bot', text: reply });

            // If panel is closed, show badge
            if (!isOpen) {
                badge.style.display = 'flex';
            }

        } catch (err) {
            console.error('[Adra AI] Error:', err);
            typingEl.style.display = 'none';

            let errorMsg = '⚠️ Connection error. Please check that the n8n workflow is active and try again.';
            if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
                errorMsg = '⚠️ Could not reach the AI backend. Make sure the n8n workflow is running.';
            } else if (err.message.includes('HTTP 4')) {
                errorMsg = `⚠️ Request rejected (${err.message}). Check the webhook URL configuration.`;
            }

            appendMessage('bot', errorMsg, true);
        } finally {
            isBusy = false;
            sendBtn.disabled = false;
            inputEl.disabled = false;
            inputEl.focus();
            scrollToBottom();
        }
    }

    // ── RENDER MESSAGE ───────────────────────────────────────
    function appendMessage(role, text, isError = false) {
        const isBot = role === 'bot';

        const row = document.createElement('div');
        row.className = `adra-ai-msg adra-ai-msg--${isBot ? 'bot' : 'user'}`;

        // Avatar (only for bot)
        let avatarHtml = '';
        if (isBot) {
            avatarHtml = `
                <div class="adra-ai-msg-avatar">
                    <svg viewBox="0 0 28 28" fill="none" width="28" height="28">
                        <circle cx="14" cy="14" r="13" fill="#1e1b4b"/>
                        <circle cx="14" cy="7" r="1.6" fill="#06b6d4"/>
                        <circle cx="21" cy="11.5" r="1.4" fill="#9333ea"/>
                        <circle cx="21" cy="18.5" r="1.4" fill="#f59e0b"/>
                        <circle cx="14" cy="22.5" r="1.6" fill="#06b6d4"/>
                        <circle cx="7" cy="18.5" r="1.4" fill="#9333ea"/>
                        <circle cx="7" cy="11.5" r="1.4" fill="#f59e0b"/>
                        <circle cx="14" cy="14" r="3" fill="#c084fc"/>
                    </svg>
                </div>`;
        }

        const bubbleClass = isError ? 'adra-ai-bubble adra-ai-bubble--error' : 'adra-ai-bubble';

        if (isBot) {
            row.innerHTML = `
                ${avatarHtml}
                <div class="adra-ai-msg-content">
                    <div class="${bubbleClass}">${formatBotText(text)}</div>
                </div>`;
        } else {
            row.innerHTML = `<div class="${bubbleClass}">${escapeHtml(text)}</div>`;
        }

        messagesEl.appendChild(row);
        scrollToBottom();
    }

    // ── TEXT FORMATTERS ──────────────────────────────────────
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatBotText(text) {
        return formatMarkdown(text);
    }

    // ── SCROLL ──────────────────────────────────────────────
    function scrollToBottom() {
        requestAnimationFrame(() => {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        });
    }

    // -- INITIAL STATE --
    badge.style.display = 'none';
    typingEl.style.display = 'none';

    // -- DRAGGABLE WIDGET --
    const DRAG_THRESHOLD = 5;
    const widget = document.getElementById('adra-ai-widget');

    let _isDragging = false;
    let _hasMoved = false;
    let _startX = 0;
    let _startY = 0;
    let _startLeft = 0;
    let _startTop = 0;

    function ensureFreePos() {
        if (widget.dataset.free === '1') return;
        widget.dataset.free = '1';
        const r = widget.getBoundingClientRect();
        widget.style.bottom = 'auto';
        widget.style.right = 'auto';
        widget.style.left = r.left + 'px';
        widget.style.top = r.top + 'px';
    }

    function onPointerDown(e) {
        // Can drag from toggle button OR panel header
        const isToggle = e.target.closest('#adra-ai-toggle');
        const isHeader = e.target.closest('#adra-ai-drag-handle');

        if (!isToggle && !isHeader) return;
        if (isHeader && e.target.closest('button')) return; // ignore close/clear buttons

        // Don't preventDefault here so native click can still happen
        _isDragging = true;
        _hasMoved = false;

        ensureFreePos();

        // Get fresh reference of where we are
        const r = widget.getBoundingClientRect();
        _startX = e.clientX;
        _startY = e.clientY;
        _startLeft = r.left;
        _startTop = r.top;

        document.addEventListener('pointermove', onPointerMove, { passive: false });
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
        if (!_isDragging) return;
        const dx = e.clientX - _startX;
        const dy = e.clientY - _startY;

        if (!_hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

        _hasMoved = true;
        e.preventDefault(); // Stop text selection while dragging

        updatePosition(_startLeft + dx, _startTop + dy);
    }

    function updatePosition(left, top) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Calculate the actual bounding box based on visible elements
        // When closed: just the toggle button (68x68)
        // When open: the panel (400x580) sits to the LEFT of the widget origin and ABOVE it

        const toggleR = toggleBtn.getBoundingClientRect();
        const panelR = panel.getBoundingClientRect();

        let minX = 0;
        let maxX = vw - toggleR.width;
        let minY = 0;
        let maxY = vh - toggleR.height;

        if (isOpen) {
            // If panel is open, the effective width is the panel width
            // And height is panel height + some spacing
            const panelWidth = panelR.width;
            const panelHeight = panelR.height + 80; // height + bottom offset

            // The widget is anchored at the bottom-right of the visual group
            minX = panelWidth - toggleR.width; // Don't let the panel go off left
            minY = panelHeight - toggleR.height; // Don't let the panel go off top
        }

        let newLeft = Math.max(minX, Math.min(left, maxX));
        let newTop = Math.max(minY, Math.min(top, maxY));

        widget.style.left = newLeft + 'px';
        widget.style.top = newTop + 'px';
    }

    function clampWidgetPosition() {
        const r = widget.getBoundingClientRect();
        updatePosition(r.left, r.top);
    }

    function onPointerUp(e) {
        if (!_isDragging) return;
        _isDragging = false;

        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
    }

    // Intercept clicks in capture phase to block them if we just dragged
    widget.addEventListener('click', (e) => {
        if (_hasMoved) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    widget.addEventListener('pointerdown', onPointerDown);

    // Normal click handler for opening/closing
    toggleBtn.addEventListener('click', (e) => {
        if (!_hasMoved) {
            isOpen ? closePanel() : openPanel();
        }
    });

    toggleBtn.style.cursor = 'grab';
    const panelHdr = document.getElementById('adra-ai-drag-handle');
    if (panelHdr) panelHdr.style.cursor = 'grab';

    // Clamp on resize
    window.addEventListener('resize', () => {
        if (widget.dataset.free !== '1') return;
        clampWidgetPosition();
    });

})();