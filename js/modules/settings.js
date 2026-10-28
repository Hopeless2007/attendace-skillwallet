// Module 10: Settings, Privacy Controls & Sync Diagnostics
// Multimodal Attendance & Engagement Agent

(function() {
    async function render(container) {
        const queueCount = await window.AppDB.getQueueCount();
        const pendingQueue = await window.AppDB.getPendingSyncQueue();
        const syncStatus = window.SyncManager.getStatus();
        const errorDetails = window.SyncManager.getErrorDetails();

        container.innerHTML = `
            <div class="module-header">
                <div>
                    <h1 class="page-title">Settings & Privacy Controls</h1>
                    <p class="page-subtitle">Configure sensor thresholds, local processing guarantees, data retention, and cloud synchronization</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="btn-sync-now">
                        <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6c0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6c0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4l-4-4v3z"/></svg>
                        Sync Now (${queueCount} Queued)
                    </button>
                </div>
            </div>

            <div class="settings-grid">
                <!-- Section 1: Privacy Guarantees & Sensor Compliance -->
                <div class="card mb-4">
                    <div class="card-header">
                        <div class="flex-row align-center gap-2">
                            <h3 class="card-title">Institutional Privacy & Ethics Guardrails</h3>
                            <span class="badge badge-success">Strictly Enforced</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <ul class="privacy-checklist">
                            <li>
                                <div class="check-icon">✓</div>
                                <div>
                                    <strong>No Facial Recognition or Individual Biometrics:</strong>
                                    <p class="text-xs text-muted">The computer vision pipeline processes low-resolution silhouettes only for aggregate room occupancy and motion. Individual students are never identified via camera.</p>
                                </div>
                            </li>
                            <li>
                                <div class="check-icon">✓</div>
                                <div>
                                    <strong>Ephemeral In-Memory Frame Processing:</strong>
                                    <p class="text-xs text-muted">Video frames and audio buffers are processed in memory and immediately discarded. No video recordings are saved or uploaded.</p>
                                </div>
                            </li>
                            <li>
                                <div class="check-icon">✓</div>
                                <div>
                                    <strong>Zero Speech Transcription or Voiceprinting:</strong>
                                    <p class="text-xs text-muted">The Web Audio API calculates non-semantic acoustic energy (RMS volume, speech interval presence, silence). Conversations are never transcribed or listened to.</p>
                                </div>
                            </li>
                            <li>
                                <div class="check-icon">✓</div>
                                <div>
                                    <strong>Separation of Verified Attendance from Sensor Observations:</strong>
                                    <p class="text-xs text-muted">Attendance records are verified exclusively through explicit workflows (QR code scan, token PIN, instructor check). Sensor occupancy is marked as an approximate aggregate estimate.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Section 2: Sensor Configuration & Sampling -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h3 class="card-title">Sensor Processing & Aggregation Windows</h3>
                    </div>
                    <div class="card-body">
                        <form id="form-sensor-config">
                            <div class="form-row">
                                <div class="form-group col">
                                    <label for="cfg-window-sec">Aggregation Time Window</label>
                                    <select id="cfg-window-sec" class="form-control">
                                        <option value="60" ${window.APP_CONFIG.SENSORS.AGGREGATION_WINDOW_SECONDS === 60 ? 'selected' : ''}>1 Minute (Default)</option>
                                        <option value="180" ${window.APP_CONFIG.SENSORS.AGGREGATION_WINDOW_SECONDS === 180 ? 'selected' : ''}>3 Minutes</option>
                                        <option value="300" ${window.APP_CONFIG.SENSORS.AGGREGATION_WINDOW_SECONDS === 300 ? 'selected' : ''}>5 Minutes</option>
                                    </select>
                                    <small class="form-hint">Duration over which sensor signals are averaged before storing analytics.</small>
                                </div>
                                <div class="form-group col">
                                    <label for="cfg-video-fps">Computer Vision Sampling Rate</label>
                                    <select id="cfg-video-fps" class="form-control">
                                        <option value="1" ${window.APP_CONFIG.SENSORS.VIDEO_ANALYSIS_FPS === 1 ? 'selected' : ''}>1 Frame/Sec (Power Efficient)</option>
                                        <option value="2" ${window.APP_CONFIG.SENSORS.VIDEO_ANALYSIS_FPS === 2 ? 'selected' : ''}>2 Frames/Sec (Standard)</option>
                                        <option value="4" ${window.APP_CONFIG.SENSORS.VIDEO_ANALYSIS_FPS === 4 ? 'selected' : ''}>4 Frames/Sec (High Precision)</option>
                                    </select>
                                    <small class="form-hint">Controls CPU usage and temporal motion fidelity.</small>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group col">
                                    <label for="cfg-silence-db">Audio Silence Threshold (dB)</label>
                                    <input type="number" id="cfg-silence-db" class="form-control" value="${window.APP_CONFIG.SENSORS.AUDIO_SILENCE_THRESHOLD_DB}">
                                    <small class="form-hint">Decibel floor below which acoustic energy is categorized as silence (e.g. -45 dB).</small>
                                </div>
                                <div class="form-group col">
                                    <label for="cfg-speech-db">Speech Activity Threshold (dB)</label>
                                    <input type="number" id="cfg-speech-db" class="form-control" value="${window.APP_CONFIG.SENSORS.AUDIO_SPEECH_THRESHOLD_DB}">
                                    <small class="form-hint">Decibel level indicating active verbal interaction or discussion (e.g. -30 dB).</small>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-sm btn-primary">Save Sensor Preferences</button>
                        </form>
                    </div>
                </div>

                <!-- Section 3: Cloud Synchronization & Offline Diagnostics -->
                <div class="card mb-4">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">Supabase Cloud Sync & Offline Queue</h3>
                            <p class="card-subtitle">Durable IndexedDB operations awaiting deferred synchronization</p>
                        </div>
                        <span class="badge ${syncStatus === 'Synced' ? 'badge-success' : 'badge-warning'}">
                            ${syncStatus}
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="sync-diagnostics-summary mb-3">
                            <div><strong>Network Connection:</strong> ${navigator.onLine ? '<span class="text-success">Online (Connected)</span>' : '<span class="text-warning">Offline (IndexedDB Cached)</span>'}</div>
                            <div><strong>Supabase Project:</strong> <code>${window.APP_CONFIG.SUPABASE_URL}</code></div>
                            <div><strong>Pending Queue Operations:</strong> <strong>${queueCount}</strong> items</div>
                            ${errorDetails ? `<div class="text-danger mt-1"><strong>Last Sync Alert:</strong> ${escapeHtml(errorDetails)}</div>` : ''}
                        </div>

                        ${renderQueueTable(pendingQueue)}

                        <div class="btn-group mt-3">
                            <button class="btn btn-sm btn-outline" id="btn-pull-cloud">Pull Fresh Data from Cloud</button>
                            <button class="btn btn-sm btn-primary" id="btn-flush-queue">Flush Sync Queue Now</button>
                        </div>
                    </div>
                </div>

                <!-- Section 4: Data Retention & Local Cache Management -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Data Retention & Local Storage Cleanup</h3>
                    </div>
                    <div class="card-body">
                        <p class="text-sm text-muted mb-3">
                            Clear expired local session analytics or reset local IndexedDB caches. Unsynced pending changes are preserved unless explicitly overridden.
                        </p>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-danger" id="btn-clean-analytics">Prune Old Analytics (>30 Days)</button>
                            <button class="btn btn-sm btn-danger" id="btn-reset-cache">Reset Local Cache & Re-sync</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('form-sensor-config')?.addEventListener('submit', handleSaveSensorConfig);
        document.getElementById('btn-sync-now')?.addEventListener('click', handleSyncNow);
        document.getElementById('btn-flush-queue')?.addEventListener('click', handleSyncNow);
        document.getElementById('btn-pull-cloud')?.addEventListener('click', handlePullCloud);
        document.getElementById('btn-clean-analytics')?.addEventListener('click', handlePruneAnalytics);
        document.getElementById('btn-reset-cache')?.addEventListener('click', handleResetCache);
    }

    function renderQueueTable(queue) {
        if (!queue || queue.length === 0) {
            return '<div class="empty-state p-3"><p class="empty-desc">All operations are synchronized with Supabase.</p></div>';
        }

        let html = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Entity</th>
                            <th>Action</th>
                            <th>Timestamp</th>
                            <th>Status</th>
                            <th>Retry Count</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const item of queue.slice(0, 5)) {
            html += `
                <tr>
                    <td><code>${item.entity}</code></td>
                    <td><strong>${item.action}</strong></td>
                    <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
                    <td><span class="badge ${item.status === 'failed' ? 'badge-danger' : 'badge-warning'}">${item.status}</span></td>
                    <td>${item.retry_count || 0}</td>
                </tr>
            `;
        }

        html += '</tbody></table></div>';
        return html;
    }

    async function handleSaveSensorConfig(e) {
        e.preventDefault();
        window.APP_CONFIG.SENSORS.AGGREGATION_WINDOW_SECONDS = parseInt(document.getElementById('cfg-window-sec').value);
        window.APP_CONFIG.SENSORS.VIDEO_ANALYSIS_FPS = parseInt(document.getElementById('cfg-video-fps').value);
        window.APP_CONFIG.SENSORS.AUDIO_SILENCE_THRESHOLD_DB = parseInt(document.getElementById('cfg-silence-db').value);
        window.APP_CONFIG.SENSORS.AUDIO_SPEECH_THRESHOLD_DB = parseInt(document.getElementById('cfg-speech-db').value);

        await window.AppDB.put(window.AppDB.STORES.SETTINGS, {
            key: 'sensor_config',
            value: window.APP_CONFIG.SENSORS
        });

        window.AppToast.show('Sensor configuration updated.', 'success');
    }

    async function handleSyncNow() {
        if (!navigator.onLine) {
            alert('Cannot synchronize to Supabase while offline. Changes remain safely persisted in IndexedDB queue.');
            return;
        }

        window.AppToast.show('Initiating synchronization...', 'info');
        await window.SyncManager.syncPendingQueue();
        const remaining = await window.AppDB.getQueueCount();
        if (remaining === 0) {
            window.AppToast.show('All changes synchronized to Supabase successfully!', 'success');
        } else {
            window.AppToast.show(`${remaining} items remain queued. Check network or server policies.`, 'warning');
        }
        await render(document.getElementById('main-content-view'));
    }

    async function handlePullCloud() {
        if (!navigator.onLine) {
            alert('Cannot pull from cloud while offline.');
            return;
        }

        window.AppToast.show('Reconciling with Supabase database...', 'info');
        await window.SyncManager.pullCloudData();
        window.AppToast.show('Local database updated from Supabase.', 'success');
    }

    async function handlePruneAnalytics() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const all = await window.AppDB.getAll(window.AppDB.STORES.ANALYTICS);
        const old = all.filter(a => a.window_start_at < thirtyDaysAgo);

        for (const item of old) {
            await window.AppDB.deleteItem(window.AppDB.STORES.ANALYTICS, item.id);
        }

        window.AppToast.show(`Pruned ${old.length} historical analytics windows.`, 'info');
    }

    async function handleResetCache() {
        const queueCount = await window.AppDB.getQueueCount();
        if (queueCount > 0) {
            if (!confirm(`Warning: You have ${queueCount} unsynchronized changes in your offline queue. Resetting will clear unsaved changes. Proceed anyway?`)) {
                return;
            }
        } else {
            if (!confirm('Are you sure you want to clear local cache and re-sync from Supabase?')) {
                return;
            }
        }

        const stores = [
            window.AppDB.STORES.CLASSES,
            window.AppDB.STORES.STUDENTS,
            window.AppDB.STORES.ENROLLMENTS,
            window.AppDB.STORES.SESSIONS,
            window.AppDB.STORES.ATTENDANCE,
            window.AppDB.STORES.ANALYTICS,
            window.AppDB.STORES.SUGGESTIONS,
            window.AppDB.STORES.ANNOTATIONS,
            window.AppDB.STORES.SYNC_QUEUE
        ];

        for (const s of stores) {
            await window.AppDB.clear(s);
        }

        if (navigator.onLine) {
            await window.SyncManager.pullCloudData();
        }

        window.AppToast.show('Cache reset and refreshed.', 'success');
        await render(document.getElementById('main-content-view'));
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.SettingsModule = {
        render
    };
})();
