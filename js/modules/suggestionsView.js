// Module 8: AI Teaching Suggestions Interface
// Multimodal Attendance & Engagement Agent

(function() {
    let currentSessionId = null;
    let filterStatus = 'all';
    let suggestionsList = [];
    let sessionsList = [];
    let classesList = [];

    async function render(container, params = {}) {
        if (params.sessionId) {
            currentSessionId = params.sessionId;
        }

        container.innerHTML = `
            <div class="module-header">
                <div>
                    <h1 class="page-title">AI Teaching Suggestions</h1>
                    <p class="page-subtitle">Pedagogical recommendations generated from aggregate classroom activity and acoustic patterns</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="btn-run-pedagogical-eval">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6c0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6c0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4l-4-4v3z"/></svg>
                        Evaluate Active Observations
                    </button>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="filter-bar mb-4">
                <div class="form-row align-center">
                    <div class="col-auto">
                        <label for="suggestions-session-select" class="font-bold">Session:</label>
                    </div>
                    <div class="col">
                        <select id="suggestions-session-select" class="form-control">
                            <option value="">All Sessions</option>
                        </select>
                    </div>
                    <div class="col-auto">
                        <label for="suggestions-status-filter" class="font-bold">Status:</label>
                    </div>
                    <div class="col-auto">
                        <select id="suggestions-status-filter" class="form-control">
                            <option value="all">All Statuses</option>
                            <option value="pending" selected>Pending Review</option>
                            <option value="accepted">Accepted</option>
                            <option value="dismissed">Dismissed</option>
                            <option value="reviewed">Reviewed</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Suggestions List Container -->
            <div id="suggestions-cards-container">
                <div class="loading-state">Loading teaching suggestions...</div>
            </div>

            <!-- Instructor Note Modal -->
            <div class="modal" id="modal-instructor-note" style="display: none;">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3 class="modal-title">Instructor Pedagogical Note</h3>
                        <button class="modal-close" onclick="window.TeachingSuggestionsView.closeNoteModal()">&times;</button>
                    </div>
                    <form id="form-suggestion-note">
                        <input type="hidden" id="note-suggestion-id" value="">
                        <div class="modal-body">
                            <p class="text-sm text-muted mb-3" id="note-modal-suggestion-text"></p>
                            <div class="form-group">
                                <label for="input-instructor-notes">Your Reflection / Adaptation Plan:</label>
                                <textarea id="input-instructor-notes" class="form-control" rows="3" placeholder="e.g., Conducted 3-minute peer discussion which successfully raised vocal interaction." required></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="window.TeachingSuggestionsView.closeNoteModal()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Reflection</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('suggestions-session-select')?.addEventListener('change', (e) => {
            currentSessionId = e.target.value;
            renderSuggestionsList();
        });

        document.getElementById('suggestions-status-filter')?.addEventListener('change', (e) => {
            filterStatus = e.target.value;
            renderSuggestionsList();
        });

        document.getElementById('btn-run-pedagogical-eval')?.addEventListener('click', handleManualEvaluation);
        document.getElementById('form-suggestion-note')?.addEventListener('submit', handleSaveNote);

        await loadData();
    }

    async function loadData() {
        try {
            suggestionsList = await window.AppDB.getAll(window.AppDB.STORES.SUGGESTIONS);
            sessionsList = await window.AppDB.getAll(window.AppDB.STORES.SESSIONS);
            classesList = await window.AppDB.getAll(window.AppDB.STORES.CLASSES);

            populateSessionSelect();
            renderSuggestionsList();
        } catch (err) {
            console.error('Error loading suggestions view:', err);
        }
    }

    function populateSessionSelect() {
        const select = document.getElementById('suggestions-session-select');
        if (!select) return;

        select.innerHTML = '<option value="">All Sessions</option>';
        const classMap = new Map(classesList.map(c => [c.id, c.name]));
        sessionsList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        for (const s of sessionsList) {
            const className = classMap.get(s.class_id) || 'Course';
            const isSel = s.id === currentSessionId ? 'selected' : '';
            select.innerHTML += `<option value="${s.id}" ${isSel}>${escapeHtml(s.title)} (${escapeHtml(className)} - ${s.session_date})</option>`;
        }
    }

    function renderSuggestionsList() {
        const container = document.getElementById('suggestions-cards-container');
        if (!container) return;

        let filtered = suggestionsList;
        if (currentSessionId) {
            filtered = filtered.filter(s => s.session_id === currentSessionId);
        }
        if (filterStatus !== 'all') {
            filtered = filtered.filter(s => s.status === filterStatus);
        }

        // Sort descending
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="empty-state p-4">
                            <p class="empty-title">No teaching suggestions found</p>
                            <p class="empty-desc">Run Live Classroom Monitor or click "Evaluate Active Observations" to analyze aggregate classroom signals.</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const sessionMap = new Map(sessionsList.map(s => [s.id, s]));
        const classMap = new Map(classesList.map(c => [c.id, c.name]));

        let html = '<div class="suggestions-grid">';

        for (const sug of filtered) {
            const session = sessionMap.get(sug.session_id);
            const sessionTitle = session ? session.title : 'Session';
            const className = session ? (classMap.get(session.class_id) || 'Class') : 'Class';
            const dateStr = new Date(sug.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            const evidence = sug.supporting_evidence || {};
            const evidenceDesc = evidence.evidence_description || 'Deterministic rule-based analysis on aggregate video and audio metrics.';

            html += `
                <div class="card suggestion-item-card mb-3">
                    <div class="card-header">
                        <div>
                            <div class="flex-row align-center gap-2">
                                <span class="badge ${getStatusBadgeClass(sug.status)}">${sug.status.toUpperCase()}</span>
                                <strong class="text-sm">${escapeHtml(sessionTitle)} · ${escapeHtml(className)}</strong>
                            </div>
                            <span class="text-xs text-muted">Generated ${dateStr} · Engine: ${escapeHtml(sug.rule_version || 'v1.0')}</span>
                        </div>
                        <div class="btn-group">
                            ${sug.status === 'pending' ? `
                                <button class="btn btn-xs btn-success" onclick="window.TeachingSuggestionsView.accept('${sug.id}')">Accept</button>
                                <button class="btn btn-xs btn-outline" onclick="window.TeachingSuggestionsView.dismiss('${sug.id}')">Dismiss</button>
                            ` : ''}
                            <button class="btn btn-xs btn-outline" onclick="window.TeachingSuggestionsView.openNoteModal('${sug.id}')">
                                ${sug.instructor_notes ? 'Edit Note' : '+ Add Note'}
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <p class="suggestion-main-text">${escapeHtml(sug.suggestion_text)}</p>
                        
                        <div class="evidence-box mt-3">
                            <div class="evidence-label">Supporting Non-Identifying Observations:</div>
                            <p class="evidence-desc">${escapeHtml(evidenceDesc)}</p>
                        </div>

                        ${sug.instructor_notes ? `
                            <div class="instructor-note-callout mt-3">
                                <strong>Instructor Reflection:</strong> ${escapeHtml(sug.instructor_notes)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    async function accept(suggestionId) {
        const sug = suggestionsList.find(s => s.id === suggestionId);
        if (!sug) return;

        sug.status = 'accepted';
        await window.SyncManager.saveRecord(window.AppDB.STORES.SUGGESTIONS, sug, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        window.AppToast.show('Suggestion marked as Accepted.', 'success');
        renderSuggestionsList();
    }

    async function dismiss(suggestionId) {
        const sug = suggestionsList.find(s => s.id === suggestionId);
        if (!sug) return;

        sug.status = 'dismissed';
        await window.SyncManager.saveRecord(window.AppDB.STORES.SUGGESTIONS, sug, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        window.AppToast.show('Suggestion dismissed.', 'info');
        renderSuggestionsList();
    }

    function openNoteModal(suggestionId) {
        const sug = suggestionsList.find(s => s.id === suggestionId);
        if (!sug) return;

        document.getElementById('note-suggestion-id').value = sug.id;
        document.getElementById('note-modal-suggestion-text').textContent = `"${sug.suggestion_text}"`;
        document.getElementById('input-instructor-notes').value = sug.instructor_notes || '';
        document.getElementById('modal-instructor-note').style.display = 'flex';
    }

    function closeNoteModal() {
        document.getElementById('modal-instructor-note').style.display = 'none';
    }

    async function handleSaveNote(e) {
        e.preventDefault();
        const id = document.getElementById('note-suggestion-id').value;
        const note = document.getElementById('input-instructor-notes').value.trim();

        const sug = suggestionsList.find(s => s.id === id);
        if (!sug) return;

        sug.instructor_notes = note;
        if (sug.status === 'pending') {
            sug.status = 'reviewed';
        }

        await window.SyncManager.saveRecord(window.AppDB.STORES.SUGGESTIONS, sug, {
            isUpdate: true,
            conflictTarget: 'id'
        });

        closeNoteModal();
        window.AppToast.show('Instructor reflection saved.', 'success');
        renderSuggestionsList();
    }

    async function handleManualEvaluation() {
        if (!currentSessionId) {
            const activeSession = sessionsList.find(s => s.status === 'active') || sessionsList[0];
            if (!activeSession) {
                alert('Please schedule and conduct a session first.');
                return;
            }
            currentSessionId = activeSession.id;
        }

        const analytics = await window.AppDB.getByIndex(window.AppDB.STORES.ANALYTICS, 'session_id', currentSessionId);
        const annotations = await window.AppDB.getByIndex(window.AppDB.STORES.ANNOTATIONS, 'session_id', currentSessionId);
        const sessionInfo = sessionsList.find(s => s.id === currentSessionId);

        if (!analytics || analytics.length === 0) {
            alert('No observation windows found for this session yet. Start Live Classroom Monitor to record aggregate signals.');
            return;
        }

        const newSuggestions = window.TeachingSuggestionEngine.evaluateSession(
            currentSessionId,
            analytics,
            annotations,
            sessionInfo
        );

        if (newSuggestions.length === 0) {
            window.AppToast.show('Classroom metrics evaluated. No new interventions indicated at this time.', 'info');
            return;
        }

        let addedCount = 0;
        for (const sug of newSuggestions) {
            const isDuplicate = suggestionsList.some(s => s.session_id === currentSessionId && s.suggestion_text === sug.suggestion_text);
            if (!isDuplicate) {
                await window.SyncManager.saveRecord(window.AppDB.STORES.SUGGESTIONS, sug);
                suggestionsList.push(sug);
                addedCount++;
            }
        }

        window.AppToast.show(`Evaluation complete: ${addedCount} suggestion(s) generated.`, 'success');
        renderSuggestionsList();
    }

    function getStatusBadgeClass(status) {
        switch (status) {
            case 'pending': return 'badge-warning';
            case 'accepted': return 'badge-success';
            case 'dismissed': return 'badge-neutral';
            case 'reviewed': return 'badge-primary';
            default: return 'badge-neutral';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.TeachingSuggestionsView = {
        render,
        accept,
        dismiss,
        openNoteModal,
        closeNoteModal,
        reload: loadData
    };
})();
