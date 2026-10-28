// Module 1: Overview Dashboard
// Multimodal Attendance & Engagement Agent

(function() {
    async function render(container) {
        container.innerHTML = `
            <div class="module-header">
                <div>
                    <h1 class="page-title">Institution Overview</h1>
                    <p class="page-subtitle">Real-time attendance metrics, aggregate engagement, and pedagogical alerts</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="btn-quick-session">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        New Session
                    </button>
                    <button class="btn btn-secondary" id="btn-quick-class">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/></svg>
                        Add Class
                    </button>
                </div>
            </div>

            <!-- Summary KPI Cards -->
            <div class="kpi-grid">
                <div class="kpi-card" id="kpi-students">
                    <div class="kpi-icon icon-students">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72L5.18 9L12 5.28L18.82 9zM17 15.99l-5 2.73l-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
                    </div>
                    <div class="kpi-content">
                        <span class="kpi-label">Total Students</span>
                        <h2 class="kpi-value" id="val-total-students">0</h2>
                        <span class="kpi-subtext" id="sub-total-students">Enrolled in courses</span>
                    </div>
                </div>

                <div class="kpi-card" id="kpi-classes">
                    <div class="kpi-icon icon-classes">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                    </div>
                    <div class="kpi-content">
                        <span class="kpi-label">Active Classes</span>
                        <h2 class="kpi-value" id="val-total-classes">0</h2>
                        <span class="kpi-subtext" id="sub-total-classes">Institutional cohorts</span>
                    </div>
                </div>

                <div class="kpi-card" id="kpi-sessions">
                    <div class="kpi-icon icon-sessions">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8zm.5-13H11v6l5.25 3.15l.75-1.23l-4.5-2.67z"/></svg>
                    </div>
                    <div class="kpi-content">
                        <span class="kpi-label">Sessions Conducted</span>
                        <h2 class="kpi-value" id="val-total-sessions">0</h2>
                        <span class="kpi-subtext" id="sub-total-sessions">Recorded sessions</span>
                    </div>
                </div>

                <div class="kpi-card" id="kpi-attendance">
                    <div class="kpi-icon icon-present">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19L21 7l-1.41-1.41z"/></svg>
                    </div>
                    <div class="kpi-content">
                        <span class="kpi-label">Attendance Verification</span>
                        <h2 class="kpi-value" id="val-present-count">0 <span class="kpi-unit">verified</span></h2>
                        <span class="kpi-subtext" id="val-attendance-breakdown">0 absent · 0 unconfirmed</span>
                    </div>
                </div>
            </div>

            <!-- Activity & Recommendations Grid -->
            <div class="dashboard-grid">
                <!-- Left: Attendance Trends & Recent Sessions -->
                <div class="card span-2">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">Recent Sessions & Verified Attendance</h3>
                            <p class="card-subtitle">Session logs with verified rosters and aggregate occupancy comparisons</p>
                        </div>
                        <button class="btn btn-sm btn-outline" id="btn-view-all-sessions">View All</button>
                    </div>
                    <div class="card-body" id="dashboard-recent-sessions">
                        <div class="empty-state">
                            <p class="empty-title">No sessions recorded yet</p>
                            <p class="empty-desc">Create your first class and schedule a session to start tracking verified attendance and aggregate engagement.</p>
                            <button class="btn btn-primary btn-sm" id="btn-empty-create-class">Create Class</button>
                        </div>
                    </div>
                </div>

                <!-- Right: Teaching Suggestions & Alerts -->
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">Pending Teaching Suggestions</h3>
                            <p class="card-subtitle">Pedagogical recommendations based on aggregate classroom signals</p>
                        </div>
                    </div>
                    <div class="card-body" id="dashboard-pending-suggestions">
                        <div class="empty-state">
                            <p class="empty-title">No pending suggestions</p>
                            <p class="empty-desc">During active classroom sessions, the recommendation engine generates actionable teaching adjustments.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('btn-quick-session')?.addEventListener('click', () => {
            window.AppRouter.navigate('sessions');
        });
        document.getElementById('btn-quick-class')?.addEventListener('click', () => {
            window.AppRouter.navigate('classes');
        });
        document.getElementById('btn-view-all-sessions')?.addEventListener('click', () => {
            window.AppRouter.navigate('sessions');
        });
        document.getElementById('btn-empty-create-class')?.addEventListener('click', () => {
            window.AppRouter.navigate('classes');
        });

        await loadDashboardData();
    }

    async function loadDashboardData() {
        try {
            // Load real records from IndexedDB (synced with Supabase)
            const students = await window.AppDB.getAll(window.AppDB.STORES.STUDENTS);
            const classes = await window.AppDB.getAll(window.AppDB.STORES.CLASSES);
            const sessions = await window.AppDB.getAll(window.AppDB.STORES.SESSIONS);
            const attendance = await window.AppDB.getAll(window.AppDB.STORES.ATTENDANCE);
            const suggestions = await window.AppDB.getAll(window.AppDB.STORES.SUGGESTIONS);

            // Update KPI cards
            const totalStudentsEl = document.getElementById('val-total-students');
            const totalClassesEl = document.getElementById('val-total-classes');
            const totalSessionsEl = document.getElementById('val-total-sessions');
            const presentCountEl = document.getElementById('val-present-count');
            const attendanceBreakdownEl = document.getElementById('val-attendance-breakdown');

            if (totalStudentsEl) totalStudentsEl.textContent = students.length;
            if (totalClassesEl) totalClassesEl.textContent = classes.filter(c => c.status === 'active').length;
            if (totalSessionsEl) totalSessionsEl.textContent = sessions.length;

            const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
            const absentCount = attendance.filter(a => a.status === 'absent').length;
            const unconfirmedCount = attendance.filter(a => a.status === 'unconfirmed').length;

            if (presentCountEl) {
                presentCountEl.innerHTML = `${presentCount} <span class="kpi-unit">verified</span>`;
            }
            if (attendanceBreakdownEl) {
                attendanceBreakdownEl.textContent = `${absentCount} absent · ${unconfirmedCount} unconfirmed`;
            }

            // Render Recent Sessions Table
            renderRecentSessions(sessions, classes, attendance);

            // Render Pending Suggestions
            renderPendingSuggestions(suggestions);

        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        }
    }

    function renderRecentSessions(sessions, classes, attendance) {
        const container = document.getElementById('dashboard-recent-sessions');
        if (!container) return;

        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-title">No sessions conducted yet</p>
                    <p class="empty-desc">Create your first class and schedule a session to start tracking verified attendance.</p>
                    <button class="btn btn-primary btn-sm" onclick="window.AppRouter.navigate('classes')">Create Class</button>
                </div>
            `;
            return;
        }

        const classMap = new Map(classes.map(c => [c.id, c.name]));
        const sortedSessions = [...sessions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

        let tableHtml = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Session Title</th>
                            <th>Class</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Verified Present</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const s of sortedSessions) {
            const sessionAtt = attendance.filter(a => a.session_id === s.id);
            const present = sessionAtt.filter(a => a.status === 'present' || a.status === 'late').length;
            const total = sessionAtt.length;
            const statusBadge = getStatusBadge(s.status);
            const className = classMap.get(s.class_id) || 'Unknown Class';

            tableHtml += `
                <tr>
                    <td>
                        <strong class="session-name">${escapeHtml(s.title)}</strong>
                    </td>
                    <td>${escapeHtml(className)}</td>
                    <td>${s.session_date || 'N/A'}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <span class="badge ${present > 0 ? 'badge-success' : 'badge-neutral'}">${present} / ${total}</span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-xs btn-outline" onclick="window.AppRouter.navigate('attendance', { sessionId: '${s.id}' })">Attendance</button>
                            <button class="btn btn-xs btn-outline" onclick="window.AppRouter.navigate('reports', { sessionId: '${s.id}' })">Report</button>
                        </div>
                    </td>
                </tr>
            `;
        }

        tableHtml += `</tbody></table></div>`;
        container.innerHTML = tableHtml;
    }

    function renderPendingSuggestions(suggestions) {
        const container = document.getElementById('dashboard-pending-suggestions');
        if (!container) return;

        const pending = suggestions.filter(s => s.status === 'pending');

        if (pending.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-title">All caught up!</p>
                    <p class="empty-desc">No unreviewed teaching suggestions awaiting attention.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="suggestion-list">';
        for (const sug of pending.slice(0, 4)) {
            html += `
                <div class="suggestion-card">
                    <div class="suggestion-header">
                        <span class="badge badge-warning">Pedagogical Alert</span>
                        <span class="suggestion-time">${new Date(sug.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p class="suggestion-text">${escapeHtml(sug.suggestion_text)}</p>
                    <div class="suggestion-actions">
                        <button class="btn btn-xs btn-success" onclick="window.TeachingSuggestionsView.accept('${sug.id}')">Accept</button>
                        <button class="btn btn-xs btn-outline" onclick="window.TeachingSuggestionsView.dismiss('${sug.id}')">Dismiss</button>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
    }

    function getStatusBadge(status) {
        switch (status) {
            case 'active':
                return '<span class="badge badge-primary pulse">Active Live</span>';
            case 'completed':
                return '<span class="badge badge-success">Completed</span>';
            case 'paused':
                return '<span class="badge badge-warning">Paused</span>';
            default:
                return '<span class="badge badge-neutral">Planned</span>';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    window.DashboardModule = {
        render,
        reload: loadDashboardData
    };
})();
