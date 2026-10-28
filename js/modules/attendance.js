// Module 5: Attendance Verification & Roster Management
// Multimodal Attendance & Engagement Agent

(function() {
    let currentSessionId = null;
    let sessionsList = [];
    let classesList = [];
    let studentsList = [];
    let enrollmentsList = [];
    let attendanceList = [];
    let auditList = [];

    async function render(container, params = {}) {
        if (params.sessionId) {
            currentSessionId = params.sessionId;
        }

        container.innerHTML = `
            <div class="module-header">
                <div>
                    <h1 class="page-title">Verified Attendance Roster</h1>
                    <p class="page-subtitle">Multi-mode check-in verification, audit logs, and occupancy discrepancy tracking</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" id="btn-show-qr">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 2h2v2h-2v-2zm3 2h3v4h-2v-2h-1v-2zm-5 0h2v4h-2v-4zm2 2h2v2h-2v-2z"/></svg>
                        Session QR Code
                    </button>
                    <button class="btn btn-outline" id="btn-manual-code">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2z"/></svg>
                        Student Code Check-In
                    </button>
                </div>
            </div>

            <!-- Session Selector Bar -->
            <div class="session-selector-card mb-4">
                <div class="form-row align-center">
                    <div class="col-auto">
                        <label for="attendance-session-select" class="font-bold">Active Session:</label>
                    </div>
                    <div class="col">
                        <select id="attendance-session-select" class="form-control">
                            <option value="">-- Choose Classroom Session --</option>
                        </select>
                    </div>
                    <div class="col-auto" id="session-status-pill"></div>
                </div>
            </div>

            <!-- Verification & Aggregate Discrepancy Banner -->
            <div class="discrepancy-banner mb-4" id="discrepancy-card" style="display: none;">
                <div class="discrepancy-content">
                    <div class="discrepancy-icon">
                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    </div>
                    <div>
                        <strong class="discrepancy-title">Occupancy Signal vs Roster Reconciliation</strong>
                        <p class="discrepancy-desc" id="discrepancy-text">
                            Verified roster: 0 students · Camera estimated occupancy: ~0 participants (Aggregate estimate).
                        </p>
                    </div>
                </div>
            </div>

            <!-- Roster Stats Overview -->
            <div class="kpi-grid mb-4" id="roster-metrics-grid">
                <div class="kpi-card mini">
                    <span class="kpi-label">Enrolled</span>
                    <h3 class="kpi-value text-lg" id="val-enrolled-count">0</h3>
                </div>
                <div class="kpi-card mini">
                    <span class="kpi-label">Present</span>
                    <h3 class="kpi-value text-lg text-success" id="val-present-count">0</h3>
                </div>
                <div class="kpi-card mini">
                    <span class="kpi-label">Late</span>
                    <h3 class="kpi-value text-lg text-warning" id="val-late-count">0</h3>
                </div>
                <div class="kpi-card mini">
                    <span class="kpi-label">Absent</span>
                    <h3 class="kpi-value text-lg text-danger" id="val-absent-count">0</h3>
                </div>
                <div class="kpi-card mini">
                    <span class="kpi-label">Unconfirmed</span>
                    <h3 class="kpi-value text-lg text-muted" id="val-unconfirmed-count">0</h3>
                </div>
            </div>

            <!-- Attendance Table -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Enrolled Roster Verification</h3>
                        <p class="card-subtitle">Mark verification status or perform authorized manual corrections with audit logging</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-sm btn-outline" id="btn-mark-all-present">Mark All Present</button>
                    </div>
                </div>
                <div class="card-body no-padding" id="attendance-table-container">
                    <div class="loading-state">Loading roster...</div>
                </div>
            </div>

            <!-- QR Code Check-In Modal -->
            <div class="modal" id="modal-qr" style="display: none;">
                <div class="modal-dialog modal-sm">
                    <div class="modal-header">
                        <h3 class="modal-title">Session QR Code</h3>
                        <button class="modal-close" onclick="window.AttendanceModule.closeQrModal()">&times;</button>
                    </div>
                    <div class="modal-body text-center">
                        <p class="text-sm text-muted mb-3">Project this QR code on the classroom display for student mobile check-in.</p>
                        <div id="qrcode-canvas-container" class="qr-container"></div>
                        <div class="mt-3">
                            <span class="text-xs text-muted">Session Check-In PIN:</span>
                            <div class="pin-display" id="qr-session-pin">------</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary w-full" onclick="window.AttendanceModule.closeQrModal()">Close</button>
                    </div>
                </div>
            </div>

            <!-- Student Code Check-in Modal -->
            <div class="modal" id="modal-code-checkin" style="display: none;">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title">Check-In by Student ID</h3>
                        <button class="modal-close" onclick="window.AttendanceModule.closeCodeModal()">&times;</button>
                    </div>
                    <form id="form-code-checkin">
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="input-student-checkin-code">Enter Student Code / Institutional ID</label>
                                <input type="text" id="input-student-checkin-code" class="form-control" placeholder="e.g. STU-2026-001" required autofocus>
                            </div>
                            <div class="form-group">
                                <label for="select-checkin-status">Mark Status</label>
                                <select id="select-checkin-status" class="form-control">
                                    <option value="present">Present (On-Time)</option>
                                    <option value="late">Late Arrival</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="window.AttendanceModule.closeCodeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Verify Check-In</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Manual Audit Correction Modal -->
            <div class="modal" id="modal-audit-correction" style="display: none;">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title">Authorized Attendance Correction</h3>
                        <button class="modal-close" onclick="window.AttendanceModule.closeCorrectionModal()">&times;</button>
                    </div>
                    <form id="form-audit-correction">
                        <input type="hidden" id="correction-record-id" value="">
                        <input type="hidden" id="correction-prev-status" value="">
                        <div class="modal-body">
                            <p class="mb-3">Modifying attendance record for <strong id="correction-student-name"></strong>.</p>
                            <div class="form-group">
                                <label for="correction-new-status">New Verified Status *</label>
                                <select id="correction-new-status" class="form-control" required>
                                    <option value="present">Present</option>
                                    <option value="late">Late</option>
                                    <option value="absent">Absent</option>
                                    <option value="excused">Excused</option>
                                    <option value="unconfirmed">Unconfirmed</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="correction-reason">Correction Justification (Audit Log) *</label>
                                <textarea id="correction-reason" class="form-control" required rows="2" placeholder="e.g., Student arrived late with medical note / scanner network timeout"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="window.AttendanceModule.closeCorrectionModal()">Cancel</button>
                            <button type="submit" class="btn btn-warning">Save Authorized Correction</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('attendance-session-select')?.addEventListener('change', (e) => {
            currentSessionId = e.target.value;
            renderRoster();
        });

        document.getElementById('btn-show-qr')?.addEventListener('click', openQrModal);
        document.getElementById('btn-manual-code')?.addEventListener('click', openCodeModal);
        document.getElementById('form-code-checkin')?.addEventListener('submit', handleStudentCodeCheckin);
        document.getElementById('form-audit-correction')?.addEventListener('submit', handleSaveCorrection);
        document.getElementById('btn-mark-all-present')?.addEventListener('click', handleMarkAllPresent);

        await loadData();
    }

    async function loadData() {
        try {
            sessionsList = await window.AppDB.getAll(window.AppDB.STORES.SESSIONS);
            classesList = await window.AppDB.getAll(window.AppDB.STORES.CLASSES);
            studentsList = await window.AppDB.getAll(window.AppDB.STORES.STUDENTS);
            enrollmentsList = await window.AppDB.getAll(window.AppDB.STORES.ENROLLMENTS);
            attendanceList = await window.AppDB.getAll(window.AppDB.STORES.ATTENDANCE);
            auditList = await window.AppDB.getAll(window.AppDB.STORES.AUDIT);

            populateSessionSelect();
            renderRoster();
        } catch (err) {
            console.error('Error loading attendance module data:', err);
        }
    }

    function populateSessionSelect() {
        const select = document.getElementById('attendance-session-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Choose Classroom Session --</option>';

        if (sessionsList.length === 0) {
            select.innerHTML = '<option value="" disabled>No sessions created yet</option>';
            return;
        }

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

    async function renderRoster() {
        const container = document.getElementById('attendance-table-container');
        const statusPill = document.getElementById('session-status-pill');
        const discrepancyCard = document.getElementById('discrepancy-card');
        const discrepancyText = document.getElementById('discrepancy-text');

        if (!container) return;

        if (!currentSessionId) {
            container.innerHTML = `
                <div class="empty-state p-4">
                    <p class="empty-title">No session selected</p>
                    <p class="empty-desc">Select a session from the dropdown above or schedule a new session.</p>
                </div>
            `;
            return;
        }

        const session = sessionsList.find(s => s.id === currentSessionId);
        if (!session) return;

        if (statusPill) {
            statusPill.innerHTML = getStatusBadge(session.status);
        }

        // Get class enrollments for this session
        const classEnrollments = enrollmentsList.filter(e => e.class_id === session.class_id && e.status === 'active');
        const enrolledStudentIds = new Set(classEnrollments.map(e => e.student_id));
        const eligibleStudents = studentsList.filter(s => enrolledStudentIds.has(s.id));

        // Get attendance records for this session
        let sessionAttendance = attendanceList.filter(a => a.session_id === currentSessionId);

        // Ensure every enrolled student has a record
        for (const s of eligibleStudents) {
            let record = sessionAttendance.find(a => a.student_id === s.id);
            if (!record) {
                record = {
                    id: 'att_' + currentSessionId + '_' + s.id,
                    session_id: currentSessionId,
                    student_id: s.id,
                    status: 'unconfirmed',
                    verification_method: null,
                    check_in_at: null,
                    check_out_at: null,
                    marked_by: null
                };
                await window.SyncManager.saveRecord(window.AppDB.STORES.ATTENDANCE, record, {
                    isUpdate: false,
                    conflictTarget: 'session_id,student_id'
                });
                sessionAttendance.push(record);
                attendanceList.push(record);
            }
        }

        // Calculate KPI values
        const enrolledCount = eligibleStudents.length;
        const presentCount = sessionAttendance.filter(a => a.status === 'present').length;
        const lateCount = sessionAttendance.filter(a => a.status === 'late').length;
        const absentCount = sessionAttendance.filter(a => a.status === 'absent').length;
        const unconfirmedCount = sessionAttendance.filter(a => a.status === 'unconfirmed').length;

        document.getElementById('val-enrolled-count').textContent = enrolledCount;
        document.getElementById('val-present-count').textContent = presentCount;
        document.getElementById('val-late-count').textContent = lateCount;
        document.getElementById('val-absent-count').textContent = absentCount;
        document.getElementById('val-unconfirmed-count').textContent = unconfirmedCount;

        // Fetch latest session analytics for aggregate occupancy comparison
        const analytics = await window.AppDB.getByIndex(window.AppDB.STORES.ANALYTICS, 'session_id', currentSessionId);
        if (analytics && analytics.length > 0) {
            const latestAnalytics = analytics[analytics.length - 1];
            const estOccupancy = Number(latestAnalytics.estimated_occupancy) || 0;
            const verifiedTotal = presentCount + lateCount;
            const diff = Math.abs(estOccupancy - verifiedTotal);

            if (discrepancyCard && discrepancyText) {
                discrepancyCard.style.display = 'block';
                discrepancyText.innerHTML = `
                    Verified Roster: <strong>${verifiedTotal}</strong> present · Camera Aggregate Occupancy: <strong>~${estOccupancy}</strong> participants (Estimated non-identifying signal).
                    ${diff > 2 ? `<span class="text-warning ml-2 font-bold">Possible variance (${diff} difference). Verify roster or student check-ins.</span>` : '<span class="text-success ml-2 font-bold">Occupancy aligns with verified roster.</span>'}
                `;
            }
        } else if (discrepancyCard) {
            discrepancyCard.style.display = 'none';
        }

        if (eligibleStudents.length === 0) {
            container.innerHTML = `
                <div class="empty-state p-4">
                    <p class="empty-title">No students enrolled in this class</p>
                    <p class="empty-desc">Enroll students in the course roster to conduct attendance.</p>
                    <button class="btn btn-sm btn-outline" onclick="window.AppRouter.navigate('classes', { classId: '${session.class_id}' })">Manage Class Roster</button>
                </div>
            `;
            return;
        }

        const studentMap = new Map(eligibleStudents.map(s => [s.id, s]));

        let html = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Student Code</th>
                            <th>Student Name</th>
                            <th>Current Status</th>
                            <th>Check-In Time</th>
                            <th>Verification Method</th>
                            <th>Quick Verification</th>
                            <th>Audit Correction</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const att of sessionAttendance) {
            const student = studentMap.get(att.student_id);
            if (!student) continue;

            const checkInTime = att.check_in_at ? new Date(att.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
            const methodBadge = att.verification_method ? `<code class="badge badge-neutral">${att.verification_method}</code>` : '<span class="text-muted">—</span>';

            html += `
                <tr>
                    <td><code>${escapeHtml(student.student_code)}</code></td>
                    <td><strong>${escapeHtml(student.display_name)}</strong></td>
                    <td><span class="badge ${getStatusBadgeClass(att.status)}">${att.status}</span></td>
                    <td>${checkInTime}</td>
                    <td>${methodBadge}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-xs ${att.status === 'present' ? 'btn-success' : 'btn-outline-success'}" onclick="window.AttendanceModule.quickVerify('${att.id}', 'present')">Present</button>
                            <button class="btn btn-xs ${att.status === 'late' ? 'btn-warning' : 'btn-outline-warning'}" onclick="window.AttendanceModule.quickVerify('${att.id}', 'late')">Late</button>
                            <button class="btn btn-xs ${att.status === 'absent' ? 'btn-danger' : 'btn-outline-danger'}" onclick="window.AttendanceModule.quickVerify('${att.id}', 'absent')">Absent</button>
                            <button class="btn btn-xs ${att.status === 'excused' ? 'btn-secondary' : 'btn-outline'}" onclick="window.AttendanceModule.quickVerify('${att.id}', 'excused')">Excused</button>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-xs btn-outline" onclick="window.AttendanceModule.openCorrectionModal('${att.id}')">Audit Edit</button>
                    </td>
                </tr>
            `;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    async function quickVerify(attendanceRecordId, status) {
        const record = attendanceList.find(a => a.id === attendanceRecordId);
        if (!record) return;

        const prevStatus = record.status;
        record.status = status;
        record.verification_method = 'instructor_verified';
        if (status === 'present' || status === 'late') {
            if (!record.check_in_at) {
                record.check_in_at = new Date().toISOString();
            }
        }

        await window.SyncManager.saveRecord(window.AppDB.STORES.ATTENDANCE, record, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        // Record audit event
        const auditEvent = {
            id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            actor_id: null,
            session_id: currentSessionId,
            entity_type: 'attendance_records',
            entity_id: record.id,
            action: 'QUICK_VERIFY',
            previous_value: { status: prevStatus },
            new_value: { status: status, method: 'instructor_verified' }
        };
        await window.SyncManager.saveRecord(window.AppDB.STORES.AUDIT, auditEvent);

        renderRoster();
    }

    async function handleMarkAllPresent() {
        if (!currentSessionId) return;
        const sessionAttendance = attendanceList.filter(a => a.session_id === currentSessionId);
        if (sessionAttendance.length === 0) return;

        if (!confirm('Mark all enrolled students in this session as Present?')) return;

        for (const record of sessionAttendance) {
            record.status = 'present';
            record.verification_method = 'instructor_verified';
            if (!record.check_in_at) {
                record.check_in_at = new Date().toISOString();
            }
            await window.SyncManager.saveRecord(window.AppDB.STORES.ATTENDANCE, record, {
                isUpdate: true,
                conflictTarget: 'id'
            });
        }

        window.AppToast.show('All students marked present.', 'success');
        renderRoster();
    }

    function openQrModal() {
        if (!currentSessionId) {
            alert('Please select an active session first.');
            return;
        }

        const qrContainer = document.getElementById('qrcode-canvas-container');
        qrContainer.innerHTML = '';

        // Generate 6-digit session pin based on session ID
        const pin = Math.abs(currentSessionId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 900000 + 100000);
        document.getElementById('qr-session-pin').textContent = pin;

        // Check-in payload url
        const checkinUrl = `${window.location.origin}${window.location.pathname}?checkin=${currentSessionId}&pin=${pin}`;

        if (window.QRCode) {
            new window.QRCode(qrContainer, {
                text: checkinUrl,
                width: 180,
                height: 180,
                colorDark: "#0f172a",
                colorLight: "#ffffff",
                correctLevel: window.QRCode.CorrectLevel.M
            });
        } else {
            qrContainer.innerHTML = `<p class="p-4 text-xs font-mono break-all">${checkinUrl}</p>`;
        }

        document.getElementById('modal-qr').style.display = 'flex';
    }

    function closeQrModal() {
        document.getElementById('modal-qr').style.display = 'none';
    }

    function openCodeModal() {
        if (!currentSessionId) {
            alert('Please select an active session first.');
            return;
        }
        document.getElementById('input-student-checkin-code').value = '';
        document.getElementById('modal-code-checkin').style.display = 'flex';
        setTimeout(() => document.getElementById('input-student-checkin-code').focus(), 100);
    }

    function closeCodeModal() {
        document.getElementById('modal-code-checkin').style.display = 'none';
    }

    async function handleStudentCodeCheckin(e) {
        e.preventDefault();
        const code = document.getElementById('input-student-checkin-code').value.trim();
        const status = document.getElementById('select-checkin-status').value;

        if (!code) return;

        const student = studentsList.find(s => s.student_code.toLowerCase() === code.toLowerCase());
        if (!student) {
            alert(`No student found with institutional ID "${code}".`);
            return;
        }

        const record = attendanceList.find(a => a.session_id === currentSessionId && a.student_id === student.id);
        if (!record) {
            alert(`Student ${student.display_name} is not enrolled in the class for this session.`);
            return;
        }

        record.status = status;
        record.verification_method = 'checkin_code';
        record.check_in_at = new Date().toISOString();

        await window.SyncManager.saveRecord(window.AppDB.STORES.ATTENDANCE, record, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        // Audit log
        await window.SyncManager.saveRecord(window.AppDB.STORES.AUDIT, {
            id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            session_id: currentSessionId,
            entity_type: 'attendance_records',
            entity_id: record.id,
            action: 'CODE_CHECKIN',
            new_value: { student_code: code, status, method: 'checkin_code' }
        });

        closeCodeModal();
        window.AppToast.show(`Check-in verified for ${student.display_name}!`, 'success');
        renderRoster();
    }

    function openCorrectionModal(attendanceRecordId) {
        const record = attendanceList.find(a => a.id === attendanceRecordId);
        if (!record) return;

        const student = studentsList.find(s => s.id === record.student_id);

        document.getElementById('correction-record-id').value = record.id;
        document.getElementById('correction-prev-status').value = record.status;
        document.getElementById('correction-student-name').textContent = student ? student.display_name : 'Student';
        document.getElementById('correction-new-status').value = record.status;
        document.getElementById('correction-reason').value = '';

        document.getElementById('modal-audit-correction').style.display = 'flex';
    }

    function closeCorrectionModal() {
        document.getElementById('modal-audit-correction').style.display = 'none';
    }

    async function handleSaveCorrection(e) {
        e.preventDefault();
        const recordId = document.getElementById('correction-record-id').value;
        const prevStatus = document.getElementById('correction-prev-status').value;
        const newStatus = document.getElementById('correction-new-status').value;
        const reason = document.getElementById('correction-reason').value.trim();

        if (!reason) {
            alert('A justification reason is required for authorized audit corrections.');
            return;
        }

        const record = attendanceList.find(a => a.id === recordId);
        if (!record) return;

        record.status = newStatus;
        record.verification_method = 'manual_correction';

        await window.SyncManager.saveRecord(window.AppDB.STORES.ATTENDANCE, record, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        // Record official audit trail
        const auditRecord = {
            id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            actor_id: null,
            session_id: currentSessionId,
            entity_type: 'attendance_records',
            entity_id: record.id,
            action: 'MANUAL_CORRECTION',
            previous_value: { status: prevStatus },
            new_value: { status: newStatus, reason: reason, timestamp: new Date().toISOString() }
        };

        await window.SyncManager.saveRecord(window.AppDB.STORES.AUDIT, auditRecord);

        closeCorrectionModal();
        window.AppToast.show('Attendance corrected and recorded in audit log.', 'info');
        renderRoster();
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

    function getStatusBadge(status) {
        switch (status) {
            case 'active': return '<span class="badge badge-primary pulse">Live Active</span>';
            case 'completed': return '<span class="badge badge-success">Completed</span>';
            case 'paused': return '<span class="badge badge-warning">Paused</span>';
            default: return '<span class="badge badge-neutral">Planned</span>';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.AttendanceModule = {
        render,
        quickVerify,
        openQrModal,
        closeQrModal,
        openCodeModal,
        closeCodeModal,
        openCorrectionModal,
        closeCorrectionModal,
        reload: loadData
    };
})();
