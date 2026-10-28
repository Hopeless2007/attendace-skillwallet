// Module 2: Classes Management
// Multimodal Attendance & Engagement Agent

(function() {
    let classesList = [];
    let studentsList = [];
    let enrollmentsList = [];
    let selectedClassId = null;

    async function render(container) {
        container.innerHTML = `
            <div class="module-header">
                <div>
                    <h1 class="page-title">Classes & Cohorts</h1>
                    <p class="page-subtitle">Manage courses, student enrollments, rosters, and assigned instructors</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="btn-create-class-modal">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Create New Class
                    </button>
                </div>
            </div>

            <div class="split-layout">
                <!-- Left Column: Class List -->
                <div class="split-sidebar">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Class Roster Directories</h3>
                        </div>
                        <div class="card-body no-padding" id="classes-list-container">
                            <div class="loading-state">Loading classes...</div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Class Details & Enrolled Students -->
                <div class="split-main" id="class-detail-container">
                    <div class="card">
                        <div class="card-body">
                            <div class="empty-state">
                                <p class="empty-title">Select a class</p>
                                <p class="empty-desc">Choose a class from the left sidebar to view details, manage student rosters, and view session history.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Create / Edit Class Modal -->
            <div class="modal" id="modal-class-form" style="display: none;">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title" id="class-modal-title">Create Class</h3>
                        <button class="modal-close" onclick="window.ClassesModule.closeModal()">&times;</button>
                    </div>
                    <form id="form-class">
                        <input type="hidden" id="class-form-id" value="">
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="class-name">Class / Course Name *</label>
                                <input type="text" id="class-name" class="form-control" required placeholder="e.g., Computer Vision 101, Data Science Lab">
                            </div>
                            <div class="form-group">
                                <label for="class-desc">Description / Objectives</label>
                                <textarea id="class-desc" class="form-control" rows="3" placeholder="Outline course syllabus, schedule, or room information"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="class-status">Status</label>
                                <select id="class-status" class="form-control">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="window.ClassesModule.closeModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="btn-save-class">Save Class</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Enroll Student Modal -->
            <div class="modal" id="modal-enroll-student" style="display: none;">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title">Enroll Student in Class</h3>
                        <button class="modal-close" onclick="window.ClassesModule.closeEnrollModal()">&times;</button>
                    </div>
                    <form id="form-enroll">
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="enroll-student-select">Select Registered Student *</label>
                                <select id="enroll-student-select" class="form-control" required>
                                    <option value="">-- Choose Student --</option>
                                </select>
                            </div>
                            <p class="form-hint">Only students who are not already actively enrolled in this class are shown.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="window.ClassesModule.closeEnrollModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Enroll Student</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('btn-create-class-modal')?.addEventListener('click', () => {
            openCreateModal();
        });

        document.getElementById('form-class')?.addEventListener('submit', handleSaveClass);
        document.getElementById('form-enroll')?.addEventListener('submit', handleEnrollStudent);

        await loadData();
    }

    async function loadData() {
        try {
            classesList = await window.AppDB.getAll(window.AppDB.STORES.CLASSES);
            studentsList = await window.AppDB.getAll(window.AppDB.STORES.STUDENTS);
            enrollmentsList = await window.AppDB.getAll(window.AppDB.STORES.ENROLLMENTS);

            renderClassesSidebar();

            if (classesList.length > 0) {
                if (!selectedClassId || !classesList.some(c => c.id === selectedClassId)) {
                    selectedClassId = classesList[0].id;
                }
                renderClassDetail(selectedClassId);
            } else {
                renderEmptyDetail();
            }
        } catch (err) {
            console.error('Error loading classes:', err);
        }
    }

    function renderClassesSidebar() {
        const container = document.getElementById('classes-list-container');
        if (!container) return;

        if (classesList.length === 0) {
            container.innerHTML = `
                <div class="empty-state p-4">
                    <p class="empty-title">No classes created</p>
                    <p class="empty-desc">Get started by creating your first class cohort.</p>
                </div>
            `;
            return;
        }

        let html = '<ul class="nav-list">';
        for (const c of classesList) {
            const count = enrollmentsList.filter(e => e.class_id === c.id && e.status === 'active').length;
            const isSelected = c.id === selectedClassId;
            html += `
                <li class="nav-item ${isSelected ? 'active' : ''}" onclick="window.ClassesModule.selectClass('${c.id}')">
                    <div class="nav-item-content">
                        <strong class="class-name">${escapeHtml(c.name)}</strong>
                        <span class="class-meta">${count} students · ${c.status}</span>
                    </div>
                    <span class="badge ${c.status === 'active' ? 'badge-success' : 'badge-neutral'}">${c.status}</span>
                </li>
            `;
        }
        html += '</ul>';
        container.innerHTML = html;
    }

    function renderEmptyDetail() {
        const container = document.getElementById('class-detail-container');
        if (!container) return;
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <p class="empty-title">No classes available</p>
                        <p class="empty-desc">Create a class to start organizing students and sessions.</p>
                        <button class="btn btn-primary" onclick="window.ClassesModule.openCreateModal()">Create Class</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderClassDetail(classId) {
        selectedClassId = classId;
        renderClassesSidebar();

        const container = document.getElementById('class-detail-container');
        if (!container) return;

        const currentClass = classesList.find(c => c.id === classId);
        if (!currentClass) {
            renderEmptyDetail();
            return;
        }

        const classEnrollments = enrollmentsList.filter(e => e.class_id === classId && e.status === 'active');
        const enrolledStudentIds = new Set(classEnrollments.map(e => e.student_id));
        const enrolledStudents = studentsList.filter(s => enrolledStudentIds.has(s.id));

        container.innerHTML = `
            <div class="card mb-4">
                <div class="card-header">
                    <div>
                        <div class="flex-row gap-2 align-center">
                            <h2 class="card-title text-xl">${escapeHtml(currentClass.name)}</h2>
                            <span class="badge ${currentClass.status === 'active' ? 'badge-success' : 'badge-neutral'}">${currentClass.status}</span>
                        </div>
                        <p class="card-subtitle">${escapeHtml(currentClass.description || 'No description provided')}</p>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline" onclick="window.ClassesModule.openEditModal('${currentClass.id}')">Edit Details</button>
                        <button class="btn btn-sm btn-primary" onclick="window.ClassesModule.openEnrollModal('${currentClass.id}')">+ Enroll Student</button>
                        <button class="btn btn-sm btn-secondary" onclick="window.AppRouter.navigate('sessions', { classId: '${currentClass.id}' })">Schedule Session</button>
                    </div>
                </div>
            </div>

            <!-- Class Roster -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Enrolled Roster (${enrolledStudents.length} Students)</h3>
                        <p class="card-subtitle">Students eligible for attendance and sessions in this class</p>
                    </div>
                </div>
                <div class="card-body no-padding">
                    ${renderRosterTable(enrolledStudents, classEnrollments, currentClass.id)}
                </div>
            </div>
        `;
    }

    function renderRosterTable(students, enrollments, classId) {
        if (students.length === 0) {
            return `
                <div class="empty-state p-4">
                    <p class="empty-title">No students enrolled</p>
                    <p class="empty-desc">Enroll existing registered students or create new student records.</p>
                    <button class="btn btn-sm btn-outline" onclick="window.ClassesModule.openEnrollModal('${classId}')">Enroll First Student</button>
                </div>
            `;
        }

        const enrollmentMap = new Map(enrollments.map(e => [e.student_id, e]));

        let html = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Student Code</th>
                            <th>Display Name</th>
                            <th>Enrolled Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const s of students) {
            const enr = enrollmentMap.get(s.id);
            const enrolledAt = enr ? new Date(enr.enrolled_at).toLocaleDateString() : 'N/A';
            html += `
                <tr>
                    <td><code>${escapeHtml(s.student_code)}</code></td>
                    <td><strong>${escapeHtml(s.display_name)}</strong></td>
                    <td>${enrolledAt}</td>
                    <td><span class="badge badge-success">Enrolled</span></td>
                    <td>
                        <button class="btn btn-xs btn-outline-danger" onclick="window.ClassesModule.removeEnrollment('${enr ? enr.id : ''}')">Remove</button>
                    </td>
                </tr>
            `;
        }

        html += '</tbody></table></div>';
        return html;
    }

    function openCreateModal() {
        document.getElementById('class-modal-title').textContent = 'Create New Class';
        document.getElementById('class-form-id').value = '';
        document.getElementById('class-name').value = '';
        document.getElementById('class-desc').value = '';
        document.getElementById('class-status').value = 'active';
        document.getElementById('modal-class-form').style.display = 'flex';
    }

    function openEditModal(id) {
        const c = classesList.find(item => item.id === id);
        if (!c) return;
        document.getElementById('class-modal-title').textContent = 'Edit Class';
        document.getElementById('class-form-id').value = c.id;
        document.getElementById('class-name').value = c.name;
        document.getElementById('class-desc').value = c.description || '';
        document.getElementById('class-status').value = c.status || 'active';
        document.getElementById('modal-class-form').style.display = 'flex';
    }

    function closeModal() {
        const modal = document.getElementById('modal-class-form');
        if (modal) modal.style.display = 'none';
    }

    async function handleSaveClass(e) {
        e.preventDefault();
        const id = document.getElementById('class-form-id').value;
        const name = document.getElementById('class-name').value.trim();
        const description = document.getElementById('class-desc').value.trim();
        const status = document.getElementById('class-status').value;

        if (!name) {
            alert('Class name is required.');
            return;
        }

        const classRecord = {
            id: id || ('cls_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
            name,
            description,
            status,
            instructor_id: null
        };

        const result = await window.SyncManager.saveRecord(window.AppDB.STORES.CLASSES, classRecord, {
            isUpdate: !!id,
            conflictTarget: 'id'
        });

        closeModal();
        window.AppToast.show(`Class "${name}" saved successfully.`, 'success');
        selectedClassId = classRecord.id;
        await loadData();
    }

    function openEnrollModal(classId) {
        const currentClass = classesList.find(c => c.id === classId);
        if (!currentClass) return;

        const classEnrollments = enrollmentsList.filter(e => e.class_id === classId && e.status === 'active');
        const enrolledStudentIds = new Set(classEnrollments.map(e => e.student_id));
        const availableStudents = studentsList.filter(s => !enrolledStudentIds.has(s.id) && s.status === 'active');

        const selectEl = document.getElementById('enroll-student-select');
        selectEl.innerHTML = '<option value="">-- Choose Student --</option>';

        if (availableStudents.length === 0) {
            selectEl.innerHTML = '<option value="" disabled>No available unenrolled students. Register students first in the Students tab.</option>';
        } else {
            for (const s of availableStudents) {
                selectEl.innerHTML += `<option value="${s.id}">${escapeHtml(s.display_name)} (${escapeHtml(s.student_code)})</option>`;
            }
        }

        document.getElementById('modal-enroll-student').style.display = 'flex';
    }

    function closeEnrollModal() {
        const modal = document.getElementById('modal-enroll-student');
        if (modal) modal.style.display = 'none';
    }

    async function handleEnrollStudent(e) {
        e.preventDefault();
        const studentId = document.getElementById('enroll-student-select').value;
        if (!studentId || !selectedClassId) {
            alert('Please select a student.');
            return;
        }

        const enrollment = {
            id: 'enr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            class_id: selectedClassId,
            student_id: studentId,
            enrolled_at: new Date().toISOString(),
            status: 'active'
        };

        await window.SyncManager.saveRecord(window.AppDB.STORES.ENROLLMENTS, enrollment, {
            isUpdate: false,
            conflictTarget: 'id'
        });

        closeEnrollModal();
        window.AppToast.show('Student enrolled successfully.', 'success');
        await loadData();
    }

    async function removeEnrollment(enrollmentId) {
        if (!enrollmentId) return;
        if (!confirm('Are you sure you want to remove this student from the class roster?')) return;

        await window.SyncManager.deleteRecord(window.AppDB.STORES.ENROLLMENTS, enrollmentId);
        window.AppToast.show('Student removed from class.', 'info');
        await loadData();
    }

    function selectClass(id) {
        renderClassDetail(id);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.ClassesModule = {
        render,
        selectClass,
        openCreateModal,
        openEditModal,
        closeModal,
        openEnrollModal,
        closeEnrollModal,
        removeEnrollment,
        reload: loadData
    };
})();
