// Main Application Coordinator & Navigation Router
// Multimodal Attendance & Engagement Agent

(function() {
    let currentRoute = 'dashboard';
    let currentParams = {};

    const MODULES = {
        dashboard: window.DashboardModule,
        classes: window.ClassesModule,
        students: window.StudentsModule,
        sessions: window.SessionsModule,
        attendance: window.AttendanceModule,
        monitor: window.MonitorModule,
        analytics: window.AnalyticsModule,
        suggestions: window.TeachingSuggestionsView,
        reports: window.ReportsModule,
        settings: window.SettingsModule
    };

    // Toast Notification System
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);

    function showToast(message, type = 'info', duration = 3500) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-message">${message}</span>
            <button class="toast-dismiss">&times;</button>
        `;

        toast.querySelector('.toast-dismiss').onclick = () => toast.remove();
        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, duration);
    }

    // Navigation Router
    async function navigate(route, params = {}) {
        if (!MODULES[route]) {
            console.warn(`Route ${route} not found; defaulting to dashboard.`);
            route = 'dashboard';
        }

        currentRoute = route;
        currentParams = params;

        // Update active class on sidebar navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkRoute = link.getAttribute('data-route');
            if (linkRoute === route) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        const mainContainer = document.getElementById('main-content-view');
        if (!mainContainer) return;

        mainContainer.innerHTML = '<div class="loading-state p-5">Loading module...</div>';

        try {
            await MODULES[route].render(mainContainer, params);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error(`Error rendering route ${route}:`, err);
            mainContainer.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state p-5">
                            <p class="empty-title text-danger">Error Loading Module</p>
                            <p class="empty-desc">${err.message}</p>
                            <button class="btn btn-primary" onclick="window.AppRouter.navigate('dashboard')">Return to Dashboard</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Topbar Sync Indicator Updater
    function updateSyncStatusUI(status, error = null) {
        const pill = document.getElementById('global-sync-pill');
        const text = document.getElementById('global-sync-text');
        if (!pill || !text) return;

        pill.className = 'sync-status-pill';

        switch (status) {
            case window.SyncManager.SYNC_STATUS.SYNCED:
                pill.classList.add('status-synced');
                text.textContent = 'Synced';
                break;
            case window.SyncManager.SYNC_STATUS.SAVING:
                pill.classList.add('status-saving');
                text.textContent = 'Saving...';
                break;
            case window.SyncManager.SYNC_STATUS.OFFLINE_QUEUED:
                pill.classList.add('status-offline');
                text.textContent = 'Offline — Changes Queued';
                break;
            case window.SyncManager.SYNC_STATUS.SYNC_ERROR:
                pill.classList.add('status-error');
                text.textContent = 'Sync Error';
                if (error) pill.title = error;
                break;
        }
    }

    // Register Service Worker for PWA and offline shell support
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.register('./sw.js');
                console.log('ServiceWorker registered with scope:', reg.scope);
            } catch (err) {
                console.warn('ServiceWorker registration error:', err);
            }
        }
    }

    // Realtime Database change dispatcher
    function handleRealtimeChange(table, payload) {
        console.log(`Realtime change received for table [${table}]:`, payload.eventType);
        // Silently update local store and refresh active view if relevant
        if (payload.new) {
            window.AppDB.put(table, payload.new);
        } else if (payload.eventType === 'DELETE' && payload.old) {
            window.AppDB.deleteItem(table, payload.old.id);
        }

        // Notify active module if it has a reload method
        if (MODULES[currentRoute] && typeof MODULES[currentRoute].reload === 'function') {
            MODULES[currentRoute].reload();
        }
    }

    // App Initialization
    async function init() {
        console.log(`Initializing ${window.APP_CONFIG.APP_NAME} v${window.APP_CONFIG.VERSION}`);

        // 1. Initialize IndexedDB
        await window.AppDB.openDatabase();

        // 2. Initialize Sync Manager
        window.SyncManager.init();
        window.SyncManager.onStatusChange(updateSyncStatusUI);

        // 3. Setup Navigation Event Listeners
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                navigate(route);
            });
        });

        // 4. Register Service Worker
        await registerServiceWorker();

        // 5. Connect Supabase Client & Realtime if online
        try {
            window.SupabaseService.getClient();
            window.SupabaseService.setupRealtimeSubscriptions();
            window.SupabaseService.addRealtimeListener(handleRealtimeChange);

            if (navigator.onLine) {
                // Reconcile data from Supabase
                window.SyncManager.pullCloudData().then(() => {
                    if (MODULES[currentRoute] && typeof MODULES[currentRoute].reload === 'function') {
                        MODULES[currentRoute].reload();
                    }
                });
            }
        } catch (e) {
            console.warn('Initial cloud setup warning:', e);
        }

        // 6. Check for URL parameters (e.g. ?checkin=<sessionId>&pin=<pin>)
        const urlParams = new URLSearchParams(window.location.search);
        const checkinSessionId = urlParams.get('checkin');
        if (checkinSessionId) {
            navigate('attendance', { sessionId: checkinSessionId });
        } else {
            navigate('dashboard');
        }
    }

    window.AppToast = { show: showToast };
    window.AppRouter = { navigate, getCurrentRoute: () => currentRoute };

    document.addEventListener('DOMContentLoaded', init);
})();
