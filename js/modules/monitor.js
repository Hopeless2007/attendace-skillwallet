// Module 6: Live Classroom Monitor HUD & Sensor Aggregator
// Multimodal Attendance & Engagement Agent

(function() {
    let currentSessionId = null;
    let sessionsList = [];
    let classesList = [];
    let activeAnnotations = [];
    let windowSampleBuffer = [];
    let aggregationIntervalId = null;
    let audioVisualizerAnimId = null;
    let isMonitoringActive = false;
    let isMonitoringPaused = false;

    async function render(container, params = {}) {
        if (params.sessionId) {
            currentSessionId = params.sessionId;
        }

        container.innerHTML = `
            <div class="module-header">
                <div>
                    <h1 class="page-title">Live Classroom Monitor HUD</h1>
                    <p class="page-subtitle">Aggregate computer vision, acoustic metrics, and real-time pedagogical monitoring</p>
                </div>
                <div class="header-actions">
                    <div class="sensor-control-buttons">
                        <button class="btn btn-success" id="btn-start-monitor">
                            <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                            Start Monitoring
                        </button>
                        <button class="btn btn-warning" id="btn-pause-monitor" style="display: none;">
                            <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            Pause
                        </button>
                        <button class="btn btn-primary" id="btn-resume-monitor" style="display: none;">
                            <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                            Resume
                        </button>
                        <button class="btn btn-danger" id="btn-stop-monitor" style="display: none;">
                            <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>
                            Stop Monitoring
                        </button>
                    </div>
                </div>
            </div>

            <!-- Session & Status Ribbon -->
            <div class="monitor-ribbon-card mb-4">
                <div class="form-row align-center">
                    <div class="col-auto">
                        <label for="monitor-session-select" class="font-bold">Monitored Session:</label>
                    </div>
                    <div class="col">
                        <select id="monitor-session-select" class="form-control">
                            <option value="">-- Choose Classroom Session --</option>
                        </select>
                    </div>
                    <div class="col-auto">
                        <div class="status-indicator-cluster">
                            <div class="sensor-pill" id="pill-camera">
                                <span class="dot dot-neutral"></span> Camera: Idle
                            </div>
                            <div class="sensor-pill" id="pill-mic">
                                <span class="dot dot-neutral"></span> Mic: Idle
                            </div>
                            <div class="sensor-pill" id="pill-pipeline">
                                <span class="dot dot-neutral"></span> Pipeline: In-Memory
                            </div>
                            <div class="sensor-pill" id="pill-sync">
                                <span class="dot dot-success"></span> Sync: Synced
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Live HUD Grid -->
            <div class="monitor-grid">
                <!-- Left: Live Video & Aggregate Movement HUD -->
                <div class="card monitor-feed-card">
                    <div class="card-header">
                        <div class="flex-row align-center gap-2">
                            <h3 class="card-title">Computer Vision Stream</h3>
                            <span class="badge badge-neutral" id="feed-privacy-badge">Privacy Preserved: No Face ID</span>
                        </div>
                        <span class="text-xs text-muted" id="vision-fps-label">Target: 2 FPS</span>
                    </div>
                    <div class="card-body feed-container">
                        <div class="video-wrapper">
                            <video id="live-video-preview" autoplay muted playsinline class="video-feed" style="display: none;"></video>
                            <canvas id="live-cv-canvas" class="cv-overlay-canvas"></canvas>
                            <div class="feed-overlay-placeholder" id="feed-placeholder">
                                <svg class="placeholder-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8zm-5-9h10v2H7z"/></svg>
                                <h4>Camera Processing Idle</h4>
                                <p class="text-sm text-muted">Click "Start Monitoring" to initiate camera-based aggregate occupancy and motion tracking.</p>
                            </div>
                        </div>
                        <div class="privacy-banner-strip">
                            <span>🛡️ Raw video frames are analyzed in-memory and discarded immediately. No facial recognition or biometric profiles are created.</span>
                        </div>
                    </div>
                </div>

                <!-- Right: Audio & Acoustic Signal Analysis -->
                <div class="card monitor-audio-card">
                    <div class="card-header">
                        <div class="flex-row align-center gap-2">
                            <h3 class="card-title">Web Audio Acoustic Spectrum</h3>
                            <span class="badge badge-neutral">No Speech Transcribed</span>
                        </div>
                        <span class="text-xs text-muted" id="audio-quality-label">Signal: Idle</span>
                    </div>
                    <div class="card-body">
                        <div class="audio-viz-wrapper mb-3">
                            <canvas id="live-audio-canvas" height="120" class="audio-canvas"></canvas>
                        </div>
                        <div class="audio-meters-grid">
                            <div class="metric-meter">
                                <div class="meter-label">
                                    <span>Relative Sound Level:</span>
                                    <strong id="val-audio-db">-100 dB</strong>
                                </div>
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill" id="bar-audio-db" style="width: 0%;"></div>
                                </div>
                            </div>
                            <div class="metric-meter">
                                <div class="meter-label">
                                    <span>Speech Presence Interval:</span>
                                    <strong id="val-speech-presence">0%</strong>
                                </div>
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill fill-accent" id="bar-speech-presence" style="width: 0%;"></div>
                                </div>
                            </div>
                            <div class="metric-meter">
                                <div class="meter-label">
                                    <span>Silence Interval:</span>
                                    <strong id="val-silence-interval">100%</strong>
                                </div>
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill fill-neutral" id="bar-silence-interval" style="width: 100%;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Real-Time Aggregate Gauges -->
            <div class="kpi-grid my-4">
                <div class="kpi-card">
                    <span class="kpi-label">Estimated Occupancy</span>
                    <h2 class="kpi-value text-xl" id="hud-occupancy">~0</h2>
                    <span class="kpi-subtext">Participants (Smoothed Estimate)</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Movement Intensity</span>
                    <h2 class="kpi-value text-xl" id="hud-movement">0%</h2>
                    <span class="kpi-subtext">Spatial motion delta</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Acoustic Activity</span>
                    <h2 class="kpi-value text-xl" id="hud-acoustic">0%</h2>
                    <span class="kpi-subtext">Classroom voice presence</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Observation Coverage</span>
                    <h2 class="kpi-value text-xl" id="hud-coverage">100%</h2>
                    <span class="kpi-subtext">Sensor reliability & frame health</span>
                </div>
            </div>

            <!-- Instructor Live Annotations Section -->
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Live Pedagogical Context & Annotations</h3>
                        <p class="card-subtitle">Mark teaching activities in real time to provide context for AI pedagogical suggestions</p>
                    </div>
                </div>
                <div class="card-body">
                    <div class="annotation-tags-bar mb-3">
                        <span class="text-sm font-bold mr-2">Quick Tags:</span>
                        <button class="btn btn-xs btn-outline" onclick="window.MonitorModule.quickTag('Lecture / Presentation')">📚 Lecture</button>
                        <button class="btn btn-xs btn-outline" onclick="window.MonitorModule.quickTag('Class Discussion')">💬 Discussion</button>
                        <button class="btn btn-xs btn-outline" onclick="window.MonitorModule.quickTag('Group Collaboration / Lab')">👥 Group Work</button>
                        <button class="btn btn-xs btn-outline" onclick="window.MonitorModule.quickTag('Individual Focus / Quiz')">✍️ Solo Quiz</button>
                        <button class="btn btn-xs btn-outline" onclick="window.MonitorModule.quickTag('Q&A / Feedback')">❓ Q&A</button>
                    </div>
                    <form id="form-add-annotation" class="form-row gap-2">
                        <div class="col">
                            <input type="text" id="input-annotation-text" class="form-control" placeholder="Add custom classroom observation or activity note..." required>
                        </div>
                        <div class="col-auto">
                            <button type="submit" class="btn btn-primary">Save Annotation</button>
                        </div>
                    </form>
                    <div class="annotation-timeline mt-4" id="monitor-annotations-list">
                        <div class="text-xs text-muted">No annotations recorded yet for this session.</div>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('monitor-session-select')?.addEventListener('change', (e) => {
            currentSessionId = e.target.value;
            loadSessionAnnotations();
        });

        document.getElementById('btn-start-monitor')?.addEventListener('click', handleStartMonitoring);
        document.getElementById('btn-pause-monitor')?.addEventListener('click', handlePauseMonitoring);
        document.getElementById('btn-resume-monitor')?.addEventListener('click', handleResumeMonitoring);
        document.getElementById('btn-stop-monitor')?.addEventListener('click', handleStopMonitoring);
        document.getElementById('form-add-annotation')?.addEventListener('submit', handleAddAnnotation);

        // Hook up sync status changes
        window.SyncManager.onStatusChange(updateSyncStatusPill);

        await loadData();
    }

    async function loadData() {
        try {
            sessionsList = await window.AppDB.getAll(window.AppDB.STORES.SESSIONS);
            classesList = await window.AppDB.getAll(window.AppDB.STORES.CLASSES);

            populateSessionSelect();
            await loadSessionAnnotations();
        } catch (err) {
            console.error('Error loading monitor module data:', err);
        }
    }

    function populateSessionSelect() {
        const select = document.getElementById('monitor-session-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Choose Classroom Session --</option>';

        const classMap = new Map(classesList.map(c => [c.id, c.name]));
        sessionsList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        for (const s of sessionsList) {
            const className = classMap.get(s.class_id) || 'Course';
            const isSel = s.id === currentSessionId ? 'selected' : '';
            select.innerHTML += `<option value="${s.id}" ${isSel}>${escapeHtml(s.title)} (${escapeHtml(className)}) [${s.status}]</option>`;
        }

        if (!currentSessionId && sessionsList.length > 0) {
            const activeSession = sessionsList.find(s => s.status === 'active') || sessionsList[0];
            currentSessionId = activeSession.id;
            select.value = currentSessionId;
        }
    }

    async function loadSessionAnnotations() {
        if (!currentSessionId) return;
        activeAnnotations = await window.AppDB.getByIndex(window.AppDB.STORES.ANNOTATIONS, 'session_id', currentSessionId);
        renderAnnotationsTimeline();
    }

    function renderAnnotationsTimeline() {
        const container = document.getElementById('monitor-annotations-list');
        if (!container) return;

        if (activeAnnotations.length === 0) {
            container.innerHTML = '<div class="text-xs text-muted">No annotations recorded yet for this session.</div>';
            return;
        }

        activeAnnotations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let html = '<ul class="timeline-list">';
        for (const ann of activeAnnotations) {
            const timeStr = new Date(ann.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            html += `
                <li class="timeline-item">
                    <span class="timeline-badge">${escapeHtml(ann.annotation_type || 'Note')}</span>
                    <div class="timeline-content">
                        <strong>${escapeHtml(ann.content)}</strong>
                        <span class="timeline-time">${timeStr}</span>
                    </div>
                </li>
            `;
        }
        html += '</ul>';
        container.innerHTML = html;
    }

    async function handleStartMonitoring() {
        if (!currentSessionId) {
            alert('Please select or schedule a session to monitor.');
            return;
        }

        const videoEl = document.getElementById('live-video-preview');
        const placeholder = document.getElementById('feed-placeholder');

        try {
            // 1. Start Vision
            try {
                await window.VisionSensor.startProcessing(videoEl);
                if (videoEl) videoEl.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
                updateCameraPill(true);
            } catch (vErr) {
                console.warn('Camera initiation failed or denied:', vErr);
                updateCameraPill(false, vErr.message);
                window.AppToast.show(`Camera unavailable: ${vErr.message}. Continuing with audio & manual attendance.`, 'warning');
            }

            // 2. Start Audio
            try {
                await window.AudioSensor.startProcessing();
                updateMicPill(true);
                startAudioVisualizerLoop();
            } catch (aErr) {
                console.warn('Microphone initiation failed or denied:', aErr);
                updateMicPill(false, aErr.message);
                window.AppToast.show(`Microphone unavailable: ${aErr.message}.`, 'warning');
            }

            // 3. Register live sensor listeners
            window.VisionSensor.addListener(handleVisionMetrics);
            window.AudioSensor.addListener(handleAudioMetrics);

            // 4. Start time-window aggregation interval (every 60 seconds)
            const windowSeconds = window.APP_CONFIG.SENSORS.AGGREGATION_WINDOW_SECONDS || 60;
            if (aggregationIntervalId) clearInterval(aggregationIntervalId);
            aggregationIntervalId = setInterval(commitAggregationWindow, windowSeconds * 1000);

            // Update UI buttons
            isMonitoringActive = true;
            isMonitoringPaused = false;
            document.getElementById('btn-start-monitor').style.display = 'none';
            document.getElementById('btn-pause-monitor').style.display = 'inline-flex';
            document.getElementById('btn-stop-monitor').style.display = 'inline-flex';
            document.getElementById('btn-resume-monitor').style.display = 'none';

            window.AppToast.show('Live classroom monitoring started.', 'success');
        } catch (err) {
            console.error('Failed to start monitoring:', err);
            alert('Error starting monitoring: ' + err.message);
        }
    }

    function handlePauseMonitoring() {
        window.VisionSensor.pauseProcessing();
        window.AudioSensor.pauseProcessing();
        isMonitoringPaused = true;

        document.getElementById('btn-pause-monitor').style.display = 'none';
        document.getElementById('btn-resume-monitor').style.display = 'inline-flex';
        window.AppToast.show('Monitoring paused.', 'warning');
    }

    function handleResumeMonitoring() {
        window.VisionSensor.resumeProcessing();
        window.AudioSensor.resumeProcessing();
        isMonitoringPaused = false;

        document.getElementById('btn-resume-monitor').style.display = 'none';
        document.getElementById('btn-pause-monitor').style.display = 'inline-flex';
        window.AppToast.show('Monitoring resumed.', 'success');
    }

    function handleStopMonitoring() {
        window.VisionSensor.stopProcessing();
        window.AudioSensor.stopProcessing();

        if (aggregationIntervalId) {
            clearInterval(aggregationIntervalId);
            aggregationIntervalId = null;
        }

        if (audioVisualizerAnimId) {
            cancelAnimationFrame(audioVisualizerAnimId);
            audioVisualizerAnimId = null;
        }

        // Commit final window if samples exist
        commitAggregationWindow();

        isMonitoringActive = false;
        isMonitoringPaused = false;

        const videoEl = document.getElementById('live-video-preview');
        const placeholder = document.getElementById('feed-placeholder');
        if (videoEl) videoEl.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';

        document.getElementById('btn-start-monitor').style.display = 'inline-flex';
        document.getElementById('btn-pause-monitor').style.display = 'none';
        document.getElementById('btn-resume-monitor').style.display = 'none';
        document.getElementById('btn-stop-monitor').style.display = 'none';

        updateCameraPill(false);
        updateMicPill(false);

        window.AppToast.show('Monitoring stopped.', 'info');
    }

    function handleVisionMetrics(metrics) {
        const occEl = document.getElementById('hud-occupancy');
        const movEl = document.getElementById('hud-movement');
        const covEl = document.getElementById('hud-coverage');

        if (occEl) occEl.textContent = `~${metrics.smoothedOccupancy}`;
        if (movEl) movEl.textContent = `${Math.round(metrics.movementIndicator * 100)}%`;
        if (covEl) covEl.textContent = `${metrics.observationCoverage}%`;

        // Render privacy bounding contours on overlay canvas
        renderCvOverlayCanvas(metrics);

        // Store into sample buffer
        windowSampleBuffer.push({
            type: 'vision',
            timestamp: Date.now(),
            occupancy: metrics.smoothedOccupancy,
            movement: metrics.movementIndicator,
            coverage: metrics.observationCoverage
        });
    }

    function handleAudioMetrics(metrics) {
        const dbEl = document.getElementById('val-audio-db');
        const barDb = document.getElementById('bar-audio-db');
        const speechEl = document.getElementById('val-speech-presence');
        const barSpeech = document.getElementById('bar-speech-presence');
        const silEl = document.getElementById('val-silence-interval');
        const barSil = document.getElementById('bar-silence-interval');
        const acousticEl = document.getElementById('hud-acoustic');

        if (dbEl) dbEl.textContent = `${metrics.soundLevelDb} dB`;
        if (barDb) barDb.style.width = `${Math.round(metrics.soundLevelNormalized * 100)}%`;
        if (speechEl) speechEl.textContent = `${metrics.speechActivityPercent}%`;
        if (barSpeech) barSpeech.style.width = `${metrics.speechActivityPercent}%`;
        if (silEl) silEl.textContent = `${metrics.silencePercent}%`;
        if (barSil) barSil.style.width = `${metrics.silencePercent}%`;
        if (acousticEl) acousticEl.textContent = `${metrics.speechActivityPercent}%`;

        windowSampleBuffer.push({
            type: 'audio',
            timestamp: Date.now(),
            soundDb: metrics.soundLevelDb,
            speechActivity: metrics.audioActivityIndicator
        });
    }

    // Render an aesthetic, non-identifying privacy grid on the video overlay
    function renderCvOverlayCanvas(metrics) {
        const canvas = document.getElementById('live-cv-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth || 320;
        canvas.height = canvas.parentElement.clientHeight || 240;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Coarse tracking grid
        const cols = 8;
        const rows = 6;
        const cellW = canvas.width / cols;
        const cellH = canvas.height / rows;

        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= canvas.width; x += cellW) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += cellH) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw movement indicator HUD badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(10, 10, 150, 48);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`Estimated: ~${metrics.smoothedOccupancy} participants`, 18, 28);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Motion: ${Math.round(metrics.movementIndicator * 100)}%`, 18, 46);
    }

    // Render aesthetic audio spectrum visualizer
    function startAudioVisualizerLoop() {
        const canvas = document.getElementById('live-audio-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        function drawWave() {
            if (!isMonitoringActive || isMonitoringPaused) {
                audioVisualizerAnimId = requestAnimationFrame(drawWave);
                return;
            }

            canvas.width = canvas.parentElement.clientWidth || 400;
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            const metrics = window.AudioSensor.getMetrics();
            const norm = metrics.soundLevelNormalized || 0.05;
            const numBars = 32;
            const barWidth = width / numBars - 2;

            for (let i = 0; i < numBars; i++) {
                // Generate dynamic aesthetic spectrum bars based on current RMS & harmonics
                const barHeight = Math.max(4, Math.sin(i / 3 + Date.now() / 200) * (height * 0.4 * norm) + (height * 0.5 * norm));
                const x = i * (barWidth + 2);
                const y = height - barHeight;

                const grad = ctx.createLinearGradient(0, y, 0, height);
                grad.addColorStop(0, '#6366f1');
                grad.addColorStop(1, '#06b6d4');

                ctx.fillStyle = grad;
                ctx.fillRect(x, y, barWidth, barHeight);
            }

            audioVisualizerAnimId = requestAnimationFrame(drawWave);
        }

        drawWave();
    }

    // Commit a time-window aggregate record to session_analytics and run recommendations
    async function commitAggregationWindow() {
        if (!currentSessionId || windowSampleBuffer.length === 0) return;

        const now = new Date();
        const windowDurationMs = (window.APP_CONFIG.SENSORS.AGGREGATION_WINDOW_SECONDS || 60) * 1000;
        const windowStart = new Date(now.getTime() - windowDurationMs);

        const visionSamples = windowSampleBuffer.filter(s => s.type === 'vision');
        const audioSamples = windowSampleBuffer.filter(s => s.type === 'audio');

        const avgOcc = visionSamples.length > 0 ?
            Math.round(visionSamples.reduce((a, b) => a + b.occupancy, 0) / visionSamples.length) : 0;
        const avgMov = visionSamples.length > 0 ?
            parseFloat((visionSamples.reduce((a, b) => a + b.movement, 0) / visionSamples.length).toFixed(3)) : 0;
        const avgCov = visionSamples.length > 0 ?
            Math.round(visionSamples.reduce((a, b) => a + b.coverage, 0) / visionSamples.length) : 100;
        const avgAudio = audioSamples.length > 0 ?
            parseFloat((audioSamples.reduce((a, b) => a + b.speechActivity, 0) / audioSamples.length).toFixed(3)) : 0;

        const analyticsRecord = {
            id: 'anl_' + currentSessionId + '_' + Date.now(),
            session_id: currentSessionId,
            window_start_at: windowStart.toISOString(),
            window_end_at: now.toISOString(),
            estimated_occupancy: avgOcc,
            movement_indicator: avgMov,
            audio_activity_indicator: avgAudio,
            observation_coverage: avgCov,
            sensor_status: {
                camera_active: visionSamples.length > 0,
                microphone_active: audioSamples.length > 0,
                samples_evaluated: windowSampleBuffer.length
            }
        };

        // Reset buffer for next window
        windowSampleBuffer = [];

        // Save locally and sync to Supabase
        await window.SyncManager.saveRecord(window.AppDB.STORES.ANALYTICS, analyticsRecord);

        // Run Rule-Based Pedagogical Suggestion Engine
        await runTeachingEngineEvaluation(analyticsRecord);
    }

    async function runTeachingEngineEvaluation(latestWindow) {
        if (!window.TeachingSuggestionEngine) return;

        const allWindows = await window.AppDB.getByIndex(window.AppDB.STORES.ANALYTICS, 'session_id', currentSessionId);
        const sessionInfo = sessionsList.find(s => s.id === currentSessionId) || {};

        const newSuggestions = window.TeachingSuggestionEngine.evaluateSession(
            currentSessionId,
            allWindows,
            activeAnnotations,
            sessionInfo
        );

        for (const sug of newSuggestions) {
            // Check if similar suggestion generated recently
            const existing = await window.AppDB.getByIndex(window.AppDB.STORES.SUGGESTIONS, 'session_id', currentSessionId);
            const isDuplicate = existing.some(e => e.suggestion_text === sug.suggestion_text);
            if (!isDuplicate) {
                await window.SyncManager.saveRecord(window.AppDB.STORES.SUGGESTIONS, sug);
                window.AppToast.show('New pedagogical teaching suggestion generated!', 'info');
            }
        }
    }

    function quickTag(tagText) {
        document.getElementById('input-annotation-text').value = tagText;
        document.getElementById('form-add-annotation').dispatchEvent(new Event('submit'));
    }

    async function handleAddAnnotation(e) {
        e.preventDefault();
        const input = document.getElementById('input-annotation-text');
        const content = input.value.trim();
        if (!content || !currentSessionId) return;

        let annotationType = 'Observation';
        if (content.toLowerCase().includes('lecture')) annotationType = 'Lecture';
        else if (content.toLowerCase().includes('discussion')) annotationType = 'Discussion';
        else if (content.toLowerCase().includes('group') || content.toLowerCase().includes('lab')) annotationType = 'Group Work';
        else if (content.toLowerCase().includes('quiz')) annotationType = 'Quiz';
        else if (content.toLowerCase().includes('q&a')) annotationType = 'Q&A';

        const record = {
            id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            session_id: currentSessionId,
            instructor_id: null,
            timestamp: new Date().toISOString(),
            annotation_type: annotationType,
            content: content
        };

        await window.SyncManager.saveRecord(window.AppDB.STORES.ANNOTATIONS, record);
        activeAnnotations.push(record);
        renderAnnotationsTimeline();

        input.value = '';
        window.AppToast.show('Classroom annotation recorded.', 'success');
    }

    function updateCameraPill(active, error = null) {
        const pill = document.getElementById('pill-camera');
        if (!pill) return;
        if (error) {
            pill.innerHTML = `<span class="dot dot-danger"></span> Camera: Error`;
            pill.title = error;
        } else if (active) {
            pill.innerHTML = `<span class="dot dot-success pulse"></span> Camera: Active`;
        } else {
            pill.innerHTML = `<span class="dot dot-neutral"></span> Camera: Idle`;
        }
    }

    function updateMicPill(active, error = null) {
        const pill = document.getElementById('pill-mic');
        if (!pill) return;
        if (error) {
            pill.innerHTML = `<span class="dot dot-danger"></span> Mic: Error`;
            pill.title = error;
        } else if (active) {
            pill.innerHTML = `<span class="dot dot-success pulse"></span> Mic: Active`;
        } else {
            pill.innerHTML = `<span class="dot dot-neutral"></span> Mic: Idle`;
        }
    }

    function updateSyncStatusPill(status, error = null) {
        const pill = document.getElementById('pill-sync');
        if (!pill) return;
        switch (status) {
            case window.SyncManager.SYNC_STATUS.SYNCED:
                pill.innerHTML = `<span class="dot dot-success"></span> Sync: Synced`;
                break;
            case window.SyncManager.SYNC_STATUS.SAVING:
                pill.innerHTML = `<span class="dot dot-warning pulse"></span> Sync: Saving`;
                break;
            case window.SyncManager.SYNC_STATUS.OFFLINE_QUEUED:
                pill.innerHTML = `<span class="dot dot-warning"></span> Sync: Offline Queued`;
                break;
            case window.SyncManager.SYNC_STATUS.SYNC_ERROR:
                pill.innerHTML = `<span class="dot dot-danger"></span> Sync: Error`;
                break;
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.MonitorModule = {
        render,
        quickTag,
        stopMonitoring: handleStopMonitoring
    };
})();
