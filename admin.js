// ===================================
// Configuration
// ===================================
const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',

    // Toggle between Supabase and Legacy N8N
    USE_SUPABASE: true,
    N8N_WEBHOOK_URL: 'https://vinod2.app.n8n.cloud/webhook/b3b0a7fe-5eef-4449-b480-7ef11c51ae63/chat',

    FIELDS: [
        'name', 'email', 'company', 'product_idea',
        'budget', 'timeline', 'market', 'kpi',
        'expectations', 'stage', 'urgency'
    ],
    STORAGE_KEY: 'adra_clients_data'
};

// Initialize Supabase Client
let supabaseClient = null;

async function initSupabase() {
    try {
        const resp = await fetch('http://localhost:8000/config');
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
    }
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
    modalClose: document.getElementById('modal-close')
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

        // 1. Fetch Leads
        const { data: leads, error: leadsError } = await supabaseClient
            .from('leads')
            .select('*');

        if (leadsError) {
            console.error('❌ Error fetching from "leads" table:', leadsError);
            throw leadsError;
        }

        console.log('📊 Raw leads data from Supabase:', leads);

        // 2. Map Files to Leads by email (New Logic: using JSON column)
        state.fileUploads = {};
        if (leads) {
            leads.forEach(lead => {
                const email = lead.email;
                if (!email) return;

                // Parse the JSON files column if it exists
                if (lead.files) {
                    try {
                        let parsedFiles = typeof lead.files === 'string' ? JSON.parse(lead.files) : lead.files;
                        if (Array.isArray(parsedFiles)) {
                            state.fileUploads[email] = parsedFiles;
                        }
                    } catch (e) {
                        console.warn('⚠️ Error parsing files JSON for lead:', email, e);
                        state.fileUploads[email] = [];
                    }
                } else {
                    state.fileUploads[email] = [];
                }
            });
        }

        // 3. Transform leads to internal state format
        state.clients = (leads || []).map(lead => {
            const completedFields = CONFIG.FIELDS.filter(field => lead[field] && lead[field] !== '').length;
            const completionPercentage = Math.round((completedFields / CONFIG.FIELDS.length) * 100);

            let status = lead.status || 'new';
            if (!lead.status) {
                if (completionPercentage >= 70) status = 'qualified';
                else if (completionPercentage >= 30) status = 'in-progress';
            }

            const createdAt = lead.created_at || new Date().toISOString();
            const lastActive = lead.last_active || lead.updated_at || createdAt;

            // Parse requirements JSON
            let requirementsList = [];
            if (lead.requirements) {
                try {
                    requirementsList = typeof lead.requirements === 'string' ? JSON.parse(lead.requirements) : lead.requirements;
                } catch (e) {
                    console.warn("Failed to parse requirements", e);
                }
            }

            return {
                client_id: lead.client_id || lead.id || `client_${lead.email}`,
                created_at: createdAt,
                last_active: lastActive,
                phone: lead.phone || '',
                requirements: requirementsList,
                qualification_data: {
                    name: lead.name || '',
                    email: lead.email || '',
                    company: lead.company || '',
                    product_idea: lead.product_idea || '',
                    budget: lead.budget || '',
                    timeline: lead.timeline || '',
                    market: lead.market || '',
                    kpi: lead.kpi || '',
                    expectations: lead.expectations || '',
                    stage: lead.stage || '',
                    urgency: lead.urgency || ''
                },
                completed_fields: completedFields,
                completion_percentage: completionPercentage,
                status: status
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
    const data = client.qualification_data;

    const fieldsHtml = CONFIG.FIELDS.map(field => {
        const value = data[field];
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return `
            <div class="info-card">
                <div class="info-label">${label}</div>
                <div class="info-value ${!value ? 'empty' : ''}">${value || 'Not provided'}</div>
            </div>
        `;
    }).join('');

    elements.modalBody.innerHTML = `
        <div class="client-info-grid">
            ${fieldsHtml}
        </div>

        <div class="qualification-progress">
            <h3>Qualification Progress</h3>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${client.completion_percentage}%"></div>
            </div>
            <div class="progress-stats">
                <span>${client.completed_fields} of ${CONFIG.FIELDS.length} fields completed</span>
                <span>${client.completion_percentage}%</span>
            </div>
        </div>

        <div class="qualification-progress">
            <h3>Extracted Requirements</h3>
            <div class="files-list">
                ${renderRequirementsList(client.requirements)}
            </div>
        </div>

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
                    <div class="info-label">Created</div>
                    <div class="info-value">${formatDate(client.created_at)}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Last Active</div>
                    <div class="info-value">${formatDate(client.last_active)}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Phone Verified</div>
                    <div class="info-value ${!client.phone ? 'empty' : ''}">${client.phone || 'Not provided'}</div>
                </div>
            </div>
        </div>
    `;

    elements.modal.classList.add('active');
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

        const fileType = file.file_type || (fileName.split('.').pop().toUpperCase()) || 'FILE';

        // Added 'uploaded_at' as high priority based on console feedback
        const fileDate = file.uploaded_at || file.created_at || file.timestamp;
        const uploadedAt = fileDate ? formatDate(fileDate) : 'Unknown date';

        // Log if we couldn't find a link
        if (fileLink === '#') {
            console.warn(`⚠️ No URL found for file: ${fileName}`, file);
        }

        return `
            <div class="file-item">
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
        `;
    }).join('');
}

function closeClientModal() {
    elements.modal.classList.remove('active');
}

// ===================================
// Utility Functions
// ===================================
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.classList.contains('active')) {
            closeClientModal();
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
    const AI_WEBHOOK_URL = window.ADRA_AI_WEBHOOK_URL || 'https://vinod2.app.n8n.cloud/webhook/b3b0a7fe-5eef-4449-b480-7ef11c51ae63/chat';

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
        // Escape HTML first
        let safe = escapeHtml(text);

        // Basic markdown: **bold**, *italic*, `code`, ``` code blocks ```, bullet lists
        // Code blocks (triple backtick)
        safe = safe.replace(/```([^`]*?)```/gs, '<pre><code>$1</code></pre>');
        // Inline code
        safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Bold
        safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Italic
        safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Bullet points
        safe = safe.replace(/^[-•]\s(.+)$/gm, '<li>$1</li>');
        safe = safe.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        // Numbered lists
        safe = safe.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');
        // Line breaks
        safe = safe.replace(/\n/g, '<br>');

        return safe;
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