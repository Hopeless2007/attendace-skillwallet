// Module 9: Session Reports & CSV / Print Exports
// Multimodal Attendance & Engagement Agent

(function() {
    let currentSessionId = null;
    let sessionsList = [];
    let classesList = [];
    let studentsList = [];
    let enrollmentsList = [];
    let attendanceList = [];
    let analyticsList = [];
    let suggestionsList = [];
    let annotationsList = [];

    async function render(container, params = {}) {
        if (params.sessionId) {
            currentSessionId = params.sessionId;
        }

        container.innerHTML = `
            <div class="module-header no-print">
                <div>
                    <h1 class="page-title">Session Reports & Audits</h1>
                    <p class="page-subtitle">Exportable comprehensive session summaries, verified rosters, and aggregate analytics</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" id="btn-export-csv">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1.8 14.5l-1.4 2.1l-1.4-2.1h-1.8l2.3 3.3l-2.3 3.3h1.8l1.4-2.1l1.4 2.1h1.8l-2.3-3.3l2.3-3.3h-1.7zm-2.8-8.5V3.5L18.5 9H13z"/></svg>
                        Export CSV
                    </button>
                    <button class="btn btn-primary" id="btn-print-report">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                        Print / Save PDF
                    </button>
                </div>
            </div>

            <!-- Session Picker Bar -->
            <div class="session-picker-card mb-4 no-print">
                <div class="form-row align-center">
                    <div class="col-auto">
                        <label for="report-session-select" class="font-bold">Select Session for Report:</label>
                    </div>
                    <div class="col">
                        <select id="report-session-select" class="form-control">
                            <option value="">-- Choose Classroom Session --</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Printable Report Document Container -->
            <div class="report-document" id="report-document-body">
                <div class="loading-state">Loading session report...</div>
            </div>
        `;

        document.getElementById('report-session-select')?.addEventListener('change', (e) => {
            currentSessionId = e.target.value;
            loadReport();
        });

        document.getElementById('btn-export-csv')?.addEventListener('click', handleExportCsv);
        document.getElementById('btn-print-report')?.addEventListener('click', () => window.print());

        await loadData();
    }

    async function loadData() {
        try {
            sessionsList = await window.AppDB.getAll(window.AppDB.STORES.SESSIONS);
            classesList = await window.AppDB.getAll(window.AppDB.STORES.CLASSES);
            studentsList = await window.AppDB.getAll(window.AppDB.STORES.STUDENTS);
            enrollmentsList = await window.AppDB.getAll(window.AppDB.STORES.ENROLLMENTS);
            attendanceList = await window.AppDB.getAll(window.AppDB.STORES.ATTENDANCE);
            analyticsList = await window.AppDB.getAll(window.AppDB.STORES.ANALYTICS);
            suggestionsList = await window.AppDB.getAll(window.AppDB.STORES.SUGGESTIONS);
            annotationsList = await window.AppDB.getAll(window.AppDB.STORES.ANNOTATIONS);

            populateSessionSelect();
            await loadReport();
        } catch (err) {
            console.error('Failed to load report data:', err);
        }
    }

    function populateSessionSelect() {
        const select = document.getElementById('report-session-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Choose Classroom Session --</option>';
        const classMap = new Map(classesList.map(c => [c.id, c.name]));
        sessionsList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        for (const s of sessionsList) {
            const className = classMap.get(s.class_id) || 'Course';
            const isSel = s.id === currentSessionId ? 'selected' : '';
            select.innerHTML += `<option value="${s.id}" ${isSel}>${escapeHtml(s.title)} (${escapeHtml(className)} - ${s.session_date}) [${s.status}]</option>`;
        }

        if (!currentSessionId && sessionsList.length > 0) {
            currentSessionId = sessionsList[0].id;
            select.value = currentSessionId;
        }
    }

    async function loadReport() {
        const container = document.getElementById('report-document-body');
        if (!container) return;

        if (!currentSessionId) {
            container.innerHTML = `
                <div class="empty-state p-5">
                    <p class="empty-title">No session selected</p>
                    <p class="empty-desc">Choose a session to generate and inspect the official classroom report.</p>
                </div>
            `;
            return;
        }

        const session = sessionsList.find(s => s.id === currentSessionId);
        if (!session) return;

        const currentClass = classesList.find(c => c.id === session.class_id);
        const className = currentClass ? currentClass.name : 'Unknown Class';

        // Filter session specific data
        const sessionAttendance = attendanceList.filter(a => a.session_id === currentSessionId);
        const sessionAnalytics = analyticsList.filter(a => a.session_id === currentSessionId);
        const sessionSuggestions = suggestionsList.filter(s => s.session_id === currentSessionId);
        const sessionAnnotations = annotationsList.filter(a => a.session_id === currentSessionId);

        // Attendance numbers
        const totalEnrolled = sessionAttendance.length;
        const present = sessionAttendance.filter(a => a.status === 'present').length;
        const late = sessionAttendance.filter(a => a.status === 'late').length;
        const absent = sessionAttendance.filter(a => a.status === 'absent').length;
        const excused = sessionAttendance.filter(a => a.status === 'excused').length;
        const unconfirmed = sessionAttendance.filter(a => a.status === 'unconfirmed').length;

        // Analytics averages
        const sampleCount = sessionAnalytics.length;
        const avgOcc = sampleCount > 0 ? Math.round(sessionAnalytics.reduce((a, b) => a + (Number(b.estimated_occupancy) || 0), 0) / sampleCount) : '—';
        const avgMov = sampleCount > 0 ? Math.round((sessionAnalytics.reduce((a, b) => a + (Number(b.movement_indicator) || 0), 0) / sampleCount) * 100) : '—';
        const avgSpeech = sampleCount > 0 ? Math.round((sessionAnalytics.reduce((a, b) => a + (Number(b.audio_activity_indicator) || 0), 0) / sampleCount) * 100) : '—';
        const avgCov = sampleCount > 0 ? Math.round(sessionAnalytics.reduce((a, b) => a + (Number(b.observation_coverage) || 100), 0) / sampleCount) : '—';

        const studentMap = new Map(studentsList.map(s => [s.id, s]));

        container.innerHTML = `
            <div class="report-header-sheet">
                <div class="report-brand">
                    <h2>Multimodal Attendance & Engagement Report</h2>
                    <span class="report-badge">Official Institutional Record</span>
                </div>
                <div class="report-meta-grid mt-3">
                    <div>
                        <strong>Session Title:</strong> ${escapeHtml(session.title)}
                    </div>
                    <div>
                        <strong>Class / Cohort:</strong> ${escapeHtml(className)}
                    </div>
                    <div>
                        <strong>Session Date:</strong> ${session.session_date}
                    </div>
                    <div>
                        <strong>Lifecycle Status:</strong> <span class="badge ${session.status === 'completed' ? 'badge-success' : 'badge-primary'}">${session.status.toUpperCase()}</span>
                    </div>
                    <div>
                        <strong>Planned Window:</strong> ${formatTime(session.planned_start_at)} – ${formatTime(session.planned_end_at)}
                    </div>
                    <div>
                        <strong>Actual Recorded Duration:</strong> ${formatTime(session.actual_start_at)} – ${formatTime(session.actual_end_at)}
                    </div>
                </div>
            </div>

            <!-- Section 1: Attendance Verification Summary -->
            <div class="report-section mt-4">
                <h3 class="section-heading">1. Verified Attendance Summary</h3>
                <div class="report-stats-grid">
                    <div class="stat-cell">
                        <span class="cell-label">Total Enrolled</span>
                        <strong class="cell-val">${totalEnrolled}</strong>
                    </div>
                    <div class="stat-cell">
                        <span class="cell-label">Verified Present</span>
                        <strong class="cell-val text-success">${present}</strong>
                    </div>
                    <div class="stat-cell">
                        <span class="cell-label">Late Arrivals</span>
                        <strong class="cell-val text-warning">${late}</strong>
                    </div>
                    <div class="stat-cell">
                        <span class="cell-label">Absent</span>
                        <strong class="cell-val text-danger">${absent}</strong>
                    </div>
                    <div class="stat-cell">
                        <span class="cell-label">Excused</span>
                        <strong class="cell-val">${excused}</strong>
                    </div>
                    <div class="stat-cell">
                        <span class="cell-label">Unconfirmed</span>
                        <strong class="cell-val text-muted">${unconfirmed}</strong>
                    </div>
                </div>

                <!-- Roster Verification Table -->
                <div class="table-responsive mt-3">
                    <table class="data-table print-table">
                        <thead>
                            <tr>
                                <th>Student Code</th>
                                <th>Display Name</th>
                                <th>Verified Status</th>
                                <th>Verification Method</th>
                                <th>Check-In Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sessionAttendance.map(att => {
                                const st = studentMap.get(att.student_id);
                                return `
                                    <tr>
                                        <td><code>${escapeHtml(st ? st.student_code : 'N/A')}</code></td>
                                        <td><strong>${escapeHtml(st ? st.display_name : 'Unknown')}</strong></td>
                                        <td><span class="badge ${getStatusBadgeClass(att.status)}">${att.status}</span></td>
                                        <td>${att.verification_method || 'manual'}</td>
                                        <td>${att.check_in_at ? new Date(att.check_in_at).toLocaleTimeString() : '—'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Section 2: Aggregate Classroom Dynamics -->
            <div class="report-section mt-4">
                <h3 class="section-heading">2. Aggregate Classroom Sensor Dynamics</h3>
                <p class="text-xs text-muted mb-2">
                    🛡️ Signals are approximate, non-identifying aggregates computed in-memory. No facial embeddings or voiceprints are recorded.
                </p>
                <div class="report-stats-grid">
                    <div class="stat-cell">
                        <span class="cell-label">Estimated Occupancy</span>
                        <strong class="cell-val">~${avgOcc} <span class="text-xs text-muted font-normal">(Estimate)</span></strong>
                    </div>
                    <div class="stat-cell">
                        <span class="cell-label">Average Movement</span>
                        <strong class="cell-val">${avgMov}%</strong>
                    </div>
                    <div class="stat-cell">
                        <span class="cell-label">Speech Activity Presence</span>
                        <strong class="cell-val">${avgSpeech}%</strong>
                    </div>
                    <div class="stat-cell">
                        <span class="cell-label">Observation Coverage</span>
                        <strong class="cell-val">${avgCov}%</strong>
                    </div>
                </div>
            </div>

            <!-- Section 3: Instructor Annotations & Pedagogical Suggestions -->
            <div class="report-section mt-4">
                <h3 class="section-heading">3. Pedagogical Adaptations & Teaching Suggestions</h3>
                ${renderReportSuggestions(sessionSuggestions)}
            </div>

            <div class="report-footer-stamp mt-5 text-center text-xs text-muted">
                Generated by Multimodal Attendance & Engagement Agent · Certified Realtime & Offline Architecture
            </div>
        `;
    }

    function renderReportSuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            return '<div class="text-xs text-muted">No pedagogical suggestions generated during this session.</div>';
        }

        let html = '<div class="report-suggestions-list">';
        for (const s of suggestions) {
            html += `
                <div class="report-suggestion-card mb-2">
                    <div class="flex-row justify-between align-center">
                        <strong>${escapeHtml(s.suggestion_text)}</strong>
                        <span class="badge ${getStatusBadgeClass(s.status)}">${s.status.toUpperCase()}</span>
                    </div>
                    ${s.instructor_notes ? `<p class="mt-1 text-xs"><strong>Instructor Reflection:</strong> ${escapeHtml(s.instructor_notes)}</p>` : ''}
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    function handleExportCsv() {
        if (!currentSessionId) {
            alert('Please select a session to export.');
            return;
        }

        const session = sessionsList.find(s => s.id === currentSessionId);
        const currentClass = classesList.find(c => c.id === session.class_id);
        const sessionAttendance = attendanceList.filter(a => a.session_id === currentSessionId);
        const studentMap = new Map(studentsList.map(s => [s.id, s]));

        const rows = [
            ['Session Report', session ? session.title : 'Session'],
            ['Class', currentClass ? currentClass.name : 'Class'],
            ['Date', session ? session.session_date : 'Date'],
            ['Status', session ? session.status : 'Status'],
            [],
            ['Student Code', 'Display Name', 'Attendance Status', 'Verification Method', 'Check-In Timestamp']
        ];

        for (const att of sessionAttendance) {
            const st = studentMap.get(att.student_id);
            rows.push([
                st ? st.student_code : 'N/A',
                st ? st.display_name : 'Unknown',
                att.status,
                att.verification_method || 'manual',
                att.check_in_at || ''
            ]);
        }

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `session_attendance_${session.session_date}_${session.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.AppToast.show('CSV report downloaded successfully.', 'success');
    }

    function formatTime(isoStr) {
        if (!isoStr) return '—';
        return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'present': return 'badge-success';
            case 'late': return 'badge-warning';
            case 'absent': return 'badge-danger';
            case 'excused': return 'badge-neutral';
            case 'accepted': return 'badge-success';
            case 'dismissed': return 'badge-neutral';
            default: return 'badge-neutral';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.ReportsModule = {
        render,
        reload: loadData
    };
})();
