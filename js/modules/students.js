// Module 3: Students Management
// Multimodal Attendance & Engagement Agent

(function() {
    let studentsList = [];
    let classesList = [];
    let enrollmentsList = [];
    let attendanceList = [];
    let sessionsList = [];
    let searchQuery = '';
    let selectedStudentId = null;

    async function render(container) {
        container.innerHTML = `
            <div class="module-header">
                <div>
                    <h1 class="page-title">Student Directory</h1>
                    <p class="page-subtitle">Manage institutional student records, course memberships, and verified attendance histories</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="btn-register-student-modal">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Register Student
                    </button>
                </div>
            </div>

            <!-- Search and Filter Bar -->
            <div class="search-bar-container mb-4">
                <div class="search-input-wrap">
                    <svg class="search-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5z"/></svg>
                    <input type="text" id="student-search-input" class="form-control" placeholder="Search by student code or full name...">
                </div>
            </div>

            <!-- Students List Table -->
            <div class="card">
                <div class="card-body no-padding" id="students-table-container">
                    <div class="loading-state">Loading student records...</div>
                </div>
            </div>

            <!-- Student Detail Modal -->
            <div class="modal" id="modal-student-detail" style="display: none;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-header">
                        <h3 class="modal-title" id="detail-student-name">Student Profile</h3>
                        <button class="modal-close" onclick="window.StudentsModule.closeDetailModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="modal-student-detail-content">
                        <!-- Populated dynamically -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="window.StudentsModule.closeDetailModal()">Close</button>
                    </div>
                </div>
            </div>

            <!-- Register / Edit Student Modal -->
            <div class="modal" id="modal-student-form" style="display: none;">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title" id="student-modal-title">Register Student</h3>
                        <button class="modal-close" onclick="window.StudentsModule.closeFormModal()">&times;</button>
                    </div>
                    <form id="form-student">
                        <input type="hidden" id="student-form-id" value="">
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="student-code">Institutional Student Code / ID *</label>
                                <input type="text" id="student-code" class="form-control" required placeholder="e.g., STU-2026-001, CS101">
                            </div>
                            <div class="form-group">
                                <label for="student-name">Full Display Name *</label>
                                <input type="text" id="student-name" class="form-control" required placeholder="e.g., Jane Doe, Alex Rivera">
                            </div>
                            <div class="form-group">
                                <label for="student-status">Enrollment Status</label>
                                <select id="student-status" class="form-control">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive / Withdrawn</option>
                                </select>
                            </div>
                            <p class="privacy-note">
                                <strong>Privacy Notice:</strong> Students are verified through explicit check-in workflows (QR Code, Check-In PIN, or Instructor verification). No biometric or facial recognition profiles are stored.
                            </p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="window.StudentsModule.closeFormModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Student</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('btn-register-student-modal')?.addEventListener('click', () => {
            openCreateModal();
        });

        document.getElementById('student-search-input')?.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderTable();
        });

        document.getElementById('form-student')?.addEventListener('submit', handleSaveStudent);

        await loadData();
    }

    async function loadData() {
        try {
            studentsList = await window.AppDB.getAll(window.AppDB.STORES.STUDENTS);
            classesList = await window.AppDB.getAll(window.AppDB.STORES.CLASSES);
            enrollmentsList = await window.AppDB.getAll(window.AppDB.STORES.ENROLLMENTS);
            attendanceList = await window.AppDB.getAll(window.AppDB.STORES.ATTENDANCE);
            sessionsList = await window.AppDB.getAll(window.AppDB.STORES.SESSIONS);

            renderTable();
        } catch (err) {
            console.error('Failed to load students:', err);
        }
    }

    function renderTable() {
        const container = document.getElementById('students-table-container');
        if (!container) return;

        let filtered = studentsList;
        if (searchQuery) {
            filtered = studentsList.filter(s =>
                s.display_name.toLowerCase().includes(searchQuery) ||
                s.student_code.toLowerCase().includes(searchQuery)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state p-4">
                    <p class="empty-title">${searchQuery ? 'No matching students found' : 'No students registered'}</p>
                    <p class="empty-desc">${searchQuery ? 'Try adjusting your search query.' : 'Register students to build class rosters and record verified attendance.'}</p>
                    ${!searchQuery ? '<button class="btn btn-primary btn-sm" onclick="window.StudentsModule.openCreateModal()">Register Student</button>' : ''}
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
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Enrolled Classes</th>
                            <th>Attendance Record</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const s of filtered) {
            const studentEnrollments = enrollmentsList.filter(e => e.student_id === s.id && e.status === 'active');
            const classNames = studentEnrollments.map(e => classMap.get(e.class_id)).filter(Boolean);

            const studentAtt = attendanceList.filter(a => a.student_id === s.id);
            const presentCount = studentAtt.filter(a => a.status === 'present' || a.status === 'late').length;
            const totalSessions = studentAtt.length;
            const attRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

            html += `
                <tr>
                    <td><code>${escapeHtml(s.student_code)}</code></td>
                    <td><strong>${escapeHtml(s.display_name)}</strong></td>
                    <td>
                        ${classNames.length > 0 ? classNames.map(cn => `<span class="badge badge-neutral">${escapeHtml(cn)}</span>`).join(' ') : '<span class="text-muted">Not enrolled</span>'}
                    </td>
                    <td>
                        <span class="badge ${attRate >= 80 ? 'badge-success' : (totalSessions === 0 ? 'badge-neutral' : 'badge-warning')}">
                            ${totalSessions > 0 ? `${presentCount}/${totalSessions} (${attRate}%)` : 'No sessions yet'}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}">${s.status}</span>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-xs btn-outline" onclick="window.StudentsModule.viewStudent('${s.id}')">View History</button>
                            <button class="btn btn-xs btn-outline" onclick="window.StudentsModule.openEditModal('${s.id}')">Edit</button>
                        </div>
                    </td>
                </tr>
            `;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    function viewStudent(id) {
        selectedStudentId = id;
        const student = studentsList.find(s => s.id === id);
        if (!student) return;

        document.getElementById('detail-student-name').textContent = `${student.display_name} (${student.student_code})`;

        const classMap = new Map(classesList.map(c => [c.id, c.name]));
        const sessionMap = new Map(sessionsList.map(ses => [ses.id, ses]));

        const studentEnrollments = enrollmentsList.filter(e => e.student_id === id);
        const studentAtt = attendanceList.filter(a => a.student_id === id);

        const contentEl = document.getElementById('modal-student-detail-content');
        contentEl.innerHTML = `
            <div class="detail-summary-grid mb-4">
                <div class="summary-box">
                    <span class="summary-label">Status</span>
                    <strong>${student.status}</strong>
                </div>
                <div class="summary-box">
                    <span class="summary-label">Registered On</span>
                    <strong>${new Date(student.created_at).toLocaleDateString()}</strong>
                </div>
                <div class="summary-box">
                    <span class="summary-label">Enrolled Classes</span>
                    <strong>${studentEnrollments.length}</strong>
                </div>
                <div class="summary-box">
                    <span class="summary-label">Total Verified Attendance</span>
                    <strong>${studentAtt.filter(a => a.status === 'present').length} Sessions</strong>
                </div>
            </div>

            <h4 class="text-md font-bold mb-2">Verified Attendance History</h4>
            ${renderStudentAttendanceHistory(studentAtt, sessionMap, classMap)}
        `;

        document.getElementById('modal-student-detail').style.display = 'flex';
    }

    function renderStudentAttendanceHistory(records, sessionMap, classMap) {
        if (records.length === 0) {
            return '<div class="empty-state p-3"><p class="empty-desc">No attendance records found for this student.</p></div>';
        }

        let html = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Session Title</th>
                            <th>Class</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Verification Method</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const r of records) {
            const ses = sessionMap.get(r.session_id);
            const title = ses ? ses.title : 'Session Record';
            const className = ses ? (classMap.get(ses.class_id) || 'Unknown') : 'Unknown';
            const date = ses ? ses.session_date : 'N/A';
            const checkinTime = r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString() : 'N/A';

            html += `
                <tr>
                    <td><strong>${escapeHtml(title)}</strong></td>
                    <td>${escapeHtml(className)}</td>
                    <td>${date}</td>
                    <td><span class="badge ${getStatusBadgeClass(r.status)}">${r.status}</span></td>
                    <td><code>${r.verification_method || 'manual'}</code></td>
                    <td>${checkinTime}</td>
                </tr>
            `;
        }

        html += '</tbody></table></div>';
        return html;
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'present': return 'badge-success';
            case 'late': return 'badge-warning';
            case 'absent': return 'badge-danger';
            case 'excused': return 'badge-neutral';
            default: return 'badge-neutral';
        }
    }

    function closeDetailModal() {
        const modal = document.getElementById('modal-student-detail');
        if (modal) modal.style.display = 'none';
    }

    function openCreateModal() {
        document.getElementById('student-modal-title').textContent = 'Register Student';
        document.getElementById('student-form-id').value = '';
        document.getElementById('student-code').value = '';
        document.getElementById('student-name').value = '';
        document.getElementById('student-status').value = 'active';
        document.getElementById('modal-student-form').style.display = 'flex';
    }

    function openEditModal(id) {
        const s = studentsList.find(item => item.id === id);
        if (!s) return;
        document.getElementById('student-modal-title').textContent = 'Edit Student';
        document.getElementById('student-form-id').value = s.id;
        document.getElementById('student-code').value = s.student_code;
        document.getElementById('student-name').value = s.display_name;
        document.getElementById('student-status').value = s.status || 'active';
        document.getElementById('modal-student-form').style.display = 'flex';
    }

    function closeFormModal() {
        const modal = document.getElementById('modal-student-form');
        if (modal) modal.style.display = 'none';
    }

    async function handleSaveStudent(e) {
        e.preventDefault();
        const id = document.getElementById('student-form-id').value;
        const student_code = document.getElementById('student-code').value.trim();
        const display_name = document.getElementById('student-name').value.trim();
        const status = document.getElementById('student-status').value;

        if (!student_code || !display_name) {
            alert('Student Code and Display Name are required.');
            return;
        }

        // Check duplicate student code
        const duplicate = studentsList.find(s => s.student_code.toLowerCase() === student_code.toLowerCase() && s.id !== id);
        if (duplicate) {
            alert(`A student with code "${student_code}" already exists.`);
            return;
        }

        const studentRecord = {
            id: id || ('stu_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
            student_code,
            display_name,
            status
        };

        await window.SyncManager.saveRecord(window.AppDB.STORES.STUDENTS, studentRecord, {
            isUpdate: !!id,
            conflictTarget: 'id'
        });

        closeFormModal();
        window.AppToast.show(`Student "${display_name}" saved.`, 'success');
        await loadData();
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.StudentsModule = {
        render,
        viewStudent,
        openCreateModal,
        openEditModal,
        closeFormModal,
        closeDetailModal,
        reload: loadData
    };
})();
