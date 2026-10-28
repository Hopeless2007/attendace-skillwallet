// Module 7: Engagement Analytics
// Multimodal Attendance & Engagement Agent

(function() {
    let currentSessionId = null;
    let sessionsList = [];
    let classesList = [];
    let analyticsList = [];
    let annotationsList = [];

    async function render(container, params = {}) {
        if (params.sessionId) {
            currentSessionId = params.sessionId;
        }

        container.innerHTML = `
            <div class="module-header">
                <div>
                    <h1 class="page-title">Classroom Engagement Analytics</h1>
                    <p class="page-subtitle">Aggregate occupancy, spatial movement, and acoustic trends without individual profiling</p>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="filter-bar mb-4">
                <div class="form-row align-center">
                    <div class="col-auto">
                        <label for="analytics-session-select" class="font-bold">Select Session:</label>
                    </div>
                    <div class="col">
                        <select id="analytics-session-select" class="form-control">
                            <option value="">-- Choose Classroom Session --</option>
                        </select>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-sm btn-outline" id="btn-refresh-analytics">Refresh</button>
                    </div>
                </div>
            </div>

            <!-- Metric Summary Highlights -->
            <div class="kpi-grid mb-4" id="analytics-kpi-grid">
                <div class="kpi-card">
                    <span class="kpi-label">Average Occupancy</span>
                    <h2 class="kpi-value text-xl" id="ana-avg-occupancy">~0</h2>
                    <span class="kpi-subtext">Estimated aggregate presence</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Average Movement</span>
                    <h2 class="kpi-value text-xl" id="ana-avg-movement">0%</h2>
                    <span class="kpi-subtext">Classroom physical dynamic</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Speech Activity</span>
                    <h2 class="kpi-value text-xl" id="ana-avg-audio">0%</h2>
                    <span class="kpi-subtext">Acoustic interaction intervals</span>
                </div>
                <div class="kpi-card">
                    <span class="kpi-label">Sensor Coverage</span>
                    <h2 class="kpi-value text-xl" id="ana-avg-coverage">100%</h2>
                    <span class="kpi-subtext">Observation integrity</span>
                </div>
            </div>

            <!-- Charts Grid -->
            <div class="analytics-charts-grid">
                <!-- Chart 1: Aggregate Occupancy & Movement Trend -->
                <div class="card mb-4">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">Classroom Dynamics: Occupancy & Movement</h3>
                            <p class="card-subtitle">Temporal progression across 1-minute observation windows</p>
                        </div>
                        <div class="chart-legend">
                            <span class="legend-dot dot-cyan"></span> Occupancy (Est.)
                            <span class="legend-dot dot-indigo ml-2"></span> Movement Index (%)
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-canvas-container" id="chart-dynamics-wrap">
                            <canvas id="chart-dynamics" height="200"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Chart 2: Acoustic Speech Activity vs Silence -->
                <div class="card mb-4">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">Acoustic Profile: Interaction vs Silence</h3>
                            <p class="card-subtitle">Non-identifying sound presence intervals (no transcribed audio)</p>
                        </div>
                        <div class="chart-legend">
                            <span class="legend-dot dot-indigo"></span> Speech Presence (%)
                            <span class="legend-dot dot-neutral ml-2"></span> Relative Silence (%)
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-canvas-container" id="chart-audio-wrap">
                            <canvas id="chart-audio" height="180"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Timeline & Instructor Context Annotations -->
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3 class="card-title">Instructor Activity Timeline</h3>
                            <p class="card-subtitle">Contextual pedagogical phases aligned with sensor windows</p>
                        </div>
                    </div>
                    <div class="card-body" id="analytics-timeline-container">
                        <div class="empty-state p-3">
                            <p class="empty-desc">No instructor annotations recorded during this session.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('analytics-session-select')?.addEventListener('change', (e) => {
            currentSessionId = e.target.value;
            loadSessionData();
        });

        document.getElementById('btn-refresh-analytics')?.addEventListener('click', loadSessionData);

        await loadData();
    }

    async function loadData() {
        try {
            sessionsList = await window.AppDB.getAll(window.AppDB.STORES.SESSIONS);
            classesList = await window.AppDB.getAll(window.AppDB.STORES.CLASSES);

            populateSessionSelect();
            await loadSessionData();
        } catch (err) {
            console.error('Error loading analytics module data:', err);
        }
    }

    function populateSessionSelect() {
        const select = document.getElementById('analytics-session-select');
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
            currentSessionId = sessionsList[0].id;
            select.value = currentSessionId;
        }
    }

    async function loadSessionData() {
        if (!currentSessionId) {
            renderEmptyState('No session selected');
            return;
        }

        try {
            analyticsList = await window.AppDB.getByIndex(window.AppDB.STORES.ANALYTICS, 'session_id', currentSessionId);
            annotationsList = await window.AppDB.getByIndex(window.AppDB.STORES.ANNOTATIONS, 'session_id', currentSessionId);

            analyticsList.sort((a, b) => new Date(a.window_start_at) - new Date(b.window_start_at));
            annotationsList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            if (analyticsList.length === 0) {
                renderEmptyState('Insufficient Observation Data');
                return;
            }

            renderMetricsSummary();
            renderDynamicsChart();
            renderAudioChart();
            renderTimeline();
        } catch (err) {
            console.error('Failed to load session analytics data:', err);
        }
    }

    function renderEmptyState(reason) {
        document.getElementById('ana-avg-occupancy').textContent = '—';
        document.getElementById('ana-avg-movement').textContent = '—';
        document.getElementById('ana-avg-audio').textContent = '—';
        document.getElementById('ana-avg-coverage').textContent = '—';

        const dynWrap = document.getElementById('chart-dynamics-wrap');
        const audWrap = document.getElementById('chart-audio-wrap');

        if (dynWrap) {
            dynWrap.innerHTML = `
                <div class="empty-state p-4">
                    <p class="empty-title">${escapeHtml(reason)}</p>
                    <p class="empty-desc">Run Live Classroom Monitor during the session to record aggregate sensor metrics.</p>
                </div>
            `;
        }
        if (audWrap) {
            audWrap.innerHTML = `
                <div class="empty-state p-4">
                    <p class="empty-desc">No acoustic data available for this session.</p>
                </div>
            `;
        }
    }

    function renderMetricsSummary() {
        const count = analyticsList.length;
        const avgOcc = Math.round(analyticsList.reduce((acc, row) => acc + (Number(row.estimated_occupancy) || 0), 0) / count);
        const avgMov = Math.round((analyticsList.reduce((acc, row) => acc + (Number(row.movement_indicator) || 0), 0) / count) * 100);
        const avgAud = Math.round((analyticsList.reduce((acc, row) => acc + (Number(row.audio_activity_indicator) || 0), 0) / count) * 100);
        const avgCov = Math.round(analyticsList.reduce((acc, row) => acc + (Number(row.observation_coverage) || 100), 0) / count);

        document.getElementById('ana-avg-occupancy').textContent = `~${avgOcc}`;
        document.getElementById('ana-avg-movement').textContent = `${avgMov}%`;
        document.getElementById('ana-avg-audio').textContent = `${avgAud}%`;
        document.getElementById('ana-avg-coverage').textContent = `${avgCov}%`;
    }

    // High performance Native Canvas Line & Area Chart for Occupancy & Movement
    function renderDynamicsChart() {
        const wrap = document.getElementById('chart-dynamics-wrap');
        if (!wrap) return;
        wrap.innerHTML = '<canvas id="chart-dynamics" height="200"></canvas>';

        const canvas = document.getElementById('chart-dynamics');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = wrap.clientWidth || 600;
        const w = canvas.width;
        const h = canvas.height;
        const padding = { top: 20, right: 30, bottom: 30, left: 40 };

        ctx.clearRect(0, 0, w, h);

        const dataPoints = analyticsList;
        const n = dataPoints.length;
        if (n === 0) return;

        const maxOcc = Math.max(10, Math.max(...dataPoints.map(d => Number(d.estimated_occupancy) || 0)) * 1.2);

        // Draw grid lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (h - padding.top - padding.bottom) * (i / 4);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();

            // Y-axis labels
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`${Math.round(maxOcc * (1 - i / 4))}`, 10, y + 3);
        }

        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        // Draw Movement Area (Indigo)
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const x = padding.left + (chartW / (n > 1 ? n - 1 : 1)) * i;
            const mov = Number(dataPoints[i].movement_indicator) || 0;
            const y = padding.top + chartH * (1 - mov);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.lineTo(padding.left + chartW, padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();
        ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
        ctx.fill();

        // Draw Movement Line (Indigo)
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const x = padding.left + (chartW / (n > 1 ? n - 1 : 1)) * i;
            const mov = Number(dataPoints[i].movement_indicator) || 0;
            const y = padding.top + chartH * (1 - mov);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Occupancy Line (Cyan)
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const x = padding.left + (chartW / (n > 1 ? n - 1 : 1)) * i;
            const occ = Number(dataPoints[i].estimated_occupancy) || 0;
            const y = padding.top + chartH * (1 - (occ / maxOcc));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw data dots
        for (let i = 0; i < n; i++) {
            const x = padding.left + (chartW / (n > 1 ? n - 1 : 1)) * i;
            const occ = Number(dataPoints[i].estimated_occupancy) || 0;
            const y = padding.top + chartH * (1 - (occ / maxOcc));
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // High performance Native Canvas Bar Chart for Audio Interaction
    function renderAudioChart() {
        const wrap = document.getElementById('chart-audio-wrap');
        if (!wrap) return;
        wrap.innerHTML = '<canvas id="chart-audio" height="180"></canvas>';

        const canvas = document.getElementById('chart-audio');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = wrap.clientWidth || 600;
        const w = canvas.width;
        const h = canvas.height;
        const padding = { top: 20, right: 30, bottom: 30, left: 40 };

        ctx.clearRect(0, 0, w, h);

        const dataPoints = analyticsList;
        const n = dataPoints.length;
        if (n === 0) return;

        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;
        const barW = Math.max(4, Math.min(24, (chartW / n) * 0.7));

        // Background lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 2; i++) {
            const y = padding.top + chartH * (i / 2);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();

            ctx.fillStyle = '#64748b';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`${100 - i * 50}%`, 10, y + 3);
        }

        // Draw stacked interaction bars (Speech in Cyan/Indigo, Silence in Neutral)
        for (let i = 0; i < n; i++) {
            const cx = padding.left + (chartW / n) * (i + 0.5);
            const x = cx - barW / 2;
            const speechPct = Number(dataPoints[i].audio_activity_indicator) || 0;
            const speechH = chartH * speechPct;
            const silenceH = chartH * (1 - speechPct);

            // Silence part (top)
            ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
            ctx.fillRect(x, padding.top, barW, silenceH);

            // Speech part (bottom)
            ctx.fillStyle = '#6366f1';
            ctx.fillRect(x, padding.top + silenceH, barW, speechH);
        }
    }

    function renderTimeline() {
        const container = document.getElementById('analytics-timeline-container');
        if (!container) return;

        if (annotationsList.length === 0) {
            container.innerHTML = '<div class="empty-state p-3"><p class="empty-desc">No pedagogical annotations recorded for this session.</p></div>';
            return;
        }

        let html = '<div class="timeline-stepper">';
        for (const ann of annotationsList) {
            const timeStr = new Date(ann.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            html += `
                <div class="stepper-step">
                    <div class="step-dot"></div>
                    <div class="step-content">
                        <span class="badge badge-primary mr-2">${escapeHtml(ann.annotation_type || 'Activity')}</span>
                        <strong>${escapeHtml(ann.content)}</strong>
                        <span class="text-xs text-muted ml-2">${timeStr}</span>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    window.AnalyticsModule = {
        render,
        reload: loadData
    };
})();
