// Module 4: Sessions Management
// Multimodal Attendance & Engagement Agent

(function() {
    let sessionsList = [];
    let classesList = [];
    let enrollmentsList = [];
    let attendanceList = [];
    let filterClassId = '';

    async function render(container, params = {}) {
        if (params.classId) {
            filterClassId = params.classId;
        }

        container.innerHTML = `
            <div class="module-header">
                <div>
                    <h1 class="page-title">Classroom Sessions</h1>
                    <p class="page-subtitle">Schedule, initiate, pause, monitor, and finalize real classroom sessions</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="btn-create-session-modal">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Schedule Session
                    </button>
                </div>
            </div>

            <!-- Filters -->
            <div class="filter-bar mb-4">
                <div class="filter-group">
                    <label for="session-filter-class">Filter by Class:</label>
                    <select id="session-filter-class" class="form-control form-control-sm">
                        <option value="">All Classes</option>
                    </select>
                </div>
            </div>

            <!-- Sessions List -->
            <div class="card">
                <div class="card-body no-padding" id="sessions-table-container">
                    <div class="loading-state">Loading sessions...</div>
                </div>
            </div>

            <!-- Create Session Modal -->
            <div class="modal" id="modal-session-form" style="display: none;">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title">Schedule Classroom Session</h3>
                        <button class="modal-close" onclick="window.SessionsModule.closeModal()">&times;</button>
                    </div>
                    <form id="form-session">
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="session-class-id">Target Class *</label>
                                <select id="session-class-id" class="form-control" required>
                                    <option value="">-- Select Class --</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="session-title">Session Title / Topic *</label>
                                <input type="text" id="session-title" class="form-control" required placeholder="e.g., Week 4: Neural Networks & Convolutions">
                            </div>
                            <div class="form-group">
                                <label for="session-date">Session Date *</label>
                                <input type="date" id="session-date" class="form-control" required>
                            </div>
                            <div class="form-row">
                                <div class="form-group col">
                                    <label for="session-start-time">Planned Start Time</label>
                                    <input type="time" id="session-start-time" class="form-control" value="09:00">
                                </div>
                                <div class="form-group col">
                                    <label for="session-end-time">Planned End Time</label>
                                    <input type="time" id="session-end-time" class="form-control" value="10:30">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="session-notes">Instructor Agenda & Notes</label>
                                <textarea id="session-notes" class="form-control" rows="2" placeholder="Planned activities: 30m lecture, 30m group lab, 15m Q&A"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="window.SessionsModule.closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Create Session</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Set default date to today
        const todayStr = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('session-date');
        if (dateInput) dateInput.value = todayStr;

        document.getElementById('btn-create-session-modal')?.addEventListener('click', openCreateModal);
        document.getElementById('session-filter-class')?.addEventListener('change', (e) => {
            filterClassId = e.target.value;
            renderTable();
        });
        document.getElementById('form-session')?.addEventListener('submit', handleCreateSession);

        await loadData();
    }

    async function loadData() {
        try {
            sessionsList = await window.AppDB.getAll(window.AppDB.STORES.SESSIONS);
            classesList = await window.AppDB.getAll(window.AppDB.STORES.CLASSES);
            enrollmentsList = await window.AppDB.getAll(window.AppDB.STORES.ENROLLMENTS);
            attendanceList = await window.AppDB.getAll(window.AppDB.STORES.ATTENDANCE);

            // Populate filter select
            const filterSelect = document.getElementById('session-filter-class');
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">All Classes</option>';
                for (const c of classesList) {
                    const sel = c.id === filterClassId ? 'selected' : '';
                    filterSelect.innerHTML += `<option value="${c.id}" ${sel}>${escapeHtml(c.name)}</option>`;
                }
            }

            renderTable();
        } catch (err) {
            console.error('Failed to load sessions:', err);
        }
    }

    function renderTable() {
        const container = document.getElementById('sessions-table-container');
        if (!container) return;

        let filtered = sessionsList;
        if (filterClassId) {
            filtered = sessionsList.filter(s => s.class_id === filterClassId);
        }

        // Sort by date/start time descending
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state p-4">
                    <p class="empty-title">No sessions found</p>
                    <p class="empty-desc">Create your first classroom session to launch attendance tracking and engagement monitoring.</p>
                    <button class="btn btn-primary btn-sm" onclick="window.SessionsModule.openCreateModal()">Schedule Session</button>
                </div>
            `;
            return;
        }

        const classMap = new Map(classesList.map(c => [c.id, c.name]));

        let html = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Session Title</th>
                            <th>Class</th>
                            <th>Date & Time</th>
                            <th>Status</th>
                            <th>Verified Roster</th>
                            <th>Session Lifecycle Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const s of filtered) {
            const className = classMap.get(s.class_id) || 'Unknown Class';
            const att = attendanceList.filter(a => a.session_id === s.id);
            const presentCount = att.filter(a => a.status === 'present' || a.status === 'late').length;
            const totalCount = att.length;

            const timeStr = formatSessionTime(s);

            html += `
                <tr class="${s.status === 'active' ? 'row-active-highlight' : ''}">
                    <td>
                        <strong class="session-name">${escapeHtml(s.title)}</strong>
                        ${s.notes ? `<div class="session-notes-hint">${escapeHtml(s.notes)}</div>` : ''}
                    </td>
                    <td>${escapeHtml(className)}</td>
                    <td>
                        <div>${s.session_date}</div>
                        <small class="text-muted">${timeStr}</small>
                    </td>
                    <td>${getStatusBadge(s.status)}</td>
                    <td>
                        <span class="badge ${presentCount > 0 ? 'badge-success' : 'badge-neutral'}">
                            ${presentCount} / ${totalCount} present
                        </span>
                    </td>
                    <td>
                        <div class="btn-group">
                            ${renderLifecycleButtons(s)}
                            <button class="btn btn-xs btn-outline" onclick="window.AppRouter.navigate('attendance', { sessionId: '${s.id}' })">Attendance</button>
                            <button class="btn btn-xs btn-outline" onclick="window.AppRouter.navigate('analytics', { sessionId: '${s.id}' })">Analytics</button>
                            <button class="btn btn-xs btn-outline" onclick="window.AppRouter.navigate('reports', { sessionId: '${s.id}' })">Report</button>
                        </div>
                    </td>
                </tr>
            `;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    function renderLifecycleButtons(session) {
        if (session.status === 'planned') {
            return `
                <button class="btn btn-xs btn-success" onclick="window.SessionsModule.startSession('${session.id}')">Start Session</button>
            `;
        } else if (session.status === 'active') {
            return `
                <button class="btn btn-xs btn-primary pulse" onclick="window.AppRouter.navigate('monitor', { sessionId: '${session.id}' })">Live Monitor</button>
                <button class="btn btn-xs btn-warning" onclick="window.SessionsModule.pauseSession('${session.id}')">Pause</button>
                <button class="btn btn-xs btn-danger" onclick="window.SessionsModule.endSession('${session.id}')">End Session</button>
            `;
        } else if (session.status === 'paused') {
            return `
                <button class="btn btn-xs btn-success" onclick="window.SessionsModule.resumeSession('${session.id}')">Resume</button>
                <button class="btn btn-xs btn-danger" onclick="window.SessionsModule.endSession('${session.id}')">End Session</button>
            `;
        } else {
            return `<span class="badge badge-neutral">Finalized</span>`;
        }
    }

    function formatSessionTime(s) {
        if (s.actual_start_at) {
            const start = new Date(s.actual_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (s.actual_end_at) {
                const end = new Date(s.actual_end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `${start} – ${end} (Actual)`;
            }
            return `Started at ${start}`;
        }
        if (s.planned_start_at && s.planned_end_at) {
            const start = new Date(s.planned_start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const end = new Date(s.planned_end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `${start} – ${end} (Planned)`;
        }
        return 'Time not specified';
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

    function openCreateModal() {
        const select = document.getElementById('session-class-id');
        select.innerHTML = '<option value="">-- Select Class --</option>';

        const activeClasses = classesList.filter(c => c.status === 'active');
        if (activeClasses.length === 0) {
            alert('Please create an active class first before scheduling a session.');
            window.AppRouter.navigate('classes');
            return;
        }

        for (const c of activeClasses) {
            const isSel = c.id === filterClassId ? 'selected' : '';
            select.innerHTML += `<option value="${c.id}" ${isSel}>${escapeHtml(c.name)}</option>`;
        }

        document.getElementById('session-title').value = '';
        document.getElementById('session-notes').value = '';
        document.getElementById('modal-session-form').style.display = 'flex';
    }

    function closeModal() {
        const modal = document.getElementById('modal-session-form');
        if (modal) modal.style.display = 'none';
    }

    async function handleCreateSession(e) {
        e.preventDefault();
        const class_id = document.getElementById('session-class-id').value;
        const title = document.getElementById('session-title').value.trim();
        const session_date = document.getElementById('session-date').value;
        const startTime = document.getElementById('session-start-time').value;
        const endTime = document.getElementById('session-end-time').value;
        const notes = document.getElementById('session-notes').value.trim();

        if (!class_id || !title || !session_date) {
            alert('Class, Title, and Date are required.');
            return;
        }

        const planned_start_at = startTime ? `${session_date}T${startTime}:00` : null;
        const planned_end_at = endTime ? `${session_date}T${endTime}:00` : null;

        const sessionRecord = {
            id: 'ses_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            class_id,
            title,
            session_date,
            planned_start_at,
            planned_end_at,
            actual_start_at: null,
            actual_end_at: null,
            status: 'planned',
            notes,
            instructor_id: null
        };

        await window.SyncManager.saveRecord(window.AppDB.STORES.SESSIONS, sessionRecord, {
            isUpdate: false,
            conflictTarget: 'id'
        });

        // Initialize unconfirmed attendance records for all students currently enrolled in the class
        await initializeAttendanceForSession(sessionRecord);

        closeModal();
        window.AppToast.show(`Session "${title}" scheduled.`, 'success');
        await loadData();
    }

    async function initializeAttendanceForSession(session) {
        const enrolled = enrollmentsList.filter(e => e.class_id === session.class_id && e.status === 'active');
        for (const enr of enrolled) {
            const attRecord = {
                id: 'att_' + session.id + '_' + enr.student_id,
                session_id: session.id,
                student_id: enr.student_id,
                status: 'unconfirmed',
                verification_method: null,
                check_in_at: null,
                check_out_at: null,
                marked_by: null
            };
            await window.SyncManager.saveRecord(window.AppDB.STORES.ATTENDANCE, attRecord, {
                isUpdate: false,
                conflictTarget: 'session_id,student_id'
            });
        }
    }

    async function startSession(sessionId) {
        const session = sessionsList.find(s => s.id === sessionId);
        if (!session) return;

        session.status = 'active';
        session.actual_start_at = new Date().toISOString();

        await window.SyncManager.saveRecord(window.AppDB.STORES.SESSIONS, session, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        window.AppToast.show(`Session started! Redirecting to Live Classroom Monitor...`, 'success');
        window.AppRouter.navigate('monitor', { sessionId: session.id });
    }

    async function pauseSession(sessionId) {
        const session = sessionsList.find(s => s.id === sessionId);
        if (!session) return;

        session.status = 'paused';
        await window.SyncManager.saveRecord(window.AppDB.STORES.SESSIONS, session, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        window.AppToast.show('Session paused.', 'warning');
        await loadData();
    }

    async function resumeSession(sessionId) {
        const session = sessionsList.find(s => s.id === sessionId);
        if (!session) return;

        session.status = 'active';
        await window.SyncManager.saveRecord(window.AppDB.STORES.SESSIONS, session, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        window.AppToast.show('Session resumed.', 'success');
        await loadData();
    }

    async function endSession(sessionId) {
        if (!confirm('Are you sure you want to end this classroom session? This will finalize timestamps and aggregate analytics.')) {
            return;
        }

        const session = sessionsList.find(s => s.id === sessionId);
        if (!session) return;

        session.status = 'completed';
        session.actual_end_at = new Date().toISOString();

        await window.SyncManager.saveRecord(window.AppDB.STORES.SESSIONS, session, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        window.AppToast.show('Session finalized successfully.', 'info');
        await loadData();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.SessionsModule = {
        render,
        openCreateModal,
        closeModal,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        reload: loadData
    };
})();
