// Comprehensive Test Suite
// Multimodal Attendance & Engagement Agent

const fs = require('fs');
const path = require('path');

// Test 1: Verify all required files exist
function testFilesExist() {
    console.log('\n--- Test 1: Files and Dependencies Integrity ---');
    const requiredFiles = [
        'index.html',
        'manifest.json',
        'sw.js',
        'server.js',
        'libs/supabase.min.js',
        'libs/qrcode.min.js',
        'css/main.css',
        'css/components.css',
        'css/monitor.css',
        'js/config.js',
        'js/db/indexeddb.js',
        'js/db/supabaseClient.js',
        'js/db/sync.js',
        'js/sensors/vision.js',
        'js/sensors/audio.js',
        'js/engine/suggestions.js',
        'js/modules/dashboard.js',
        'js/modules/classes.js',
        'js/modules/students.js',
        'js/modules/sessions.js',
        'js/modules/attendance.js',
        'js/modules/monitor.js',
        'js/modules/analytics.js',
        'js/modules/suggestionsView.js',
        'js/modules/reports.js',
        'js/modules/settings.js',
        'js/app.js'
    ];

    let passed = 0;
    for (const f of requiredFiles) {
        const fullPath = path.join(__dirname, f);
        if (fs.existsSync(fullPath)) {
            const size = fs.statSync(fullPath).size;
            console.log(`  ✓ ${f} (${size} bytes)`);
            passed++;
        } else {
            console.error(`  ✗ Missing file: ${f}`);
        }
    }
    console.log(`Passed: ${passed}/${requiredFiles.length}`);
    return passed === requiredFiles.length;
}

// Test 2: Verify Pedagogical Recommendation Engine logic
function testRecommendationEngine() {
    console.log('\n--- Test 2: Deterministic Rule-Based Teaching Suggestion Engine ---');

    // Simulate browser window object
    global.window = {
        APP_CONFIG: {
            SENSORS: {
                AGGREGATION_WINDOW_SECONDS: 60
            }
        }
    };

    // Load suggestions engine
    const engineCode = fs.readFileSync(path.join(__dirname, 'js/engine/suggestions.js'), 'utf8');
    eval(engineCode);

    const engine = global.window.TeachingSuggestionEngine;
    if (!engine) {
        console.error('  ✗ Failed to load TeachingSuggestionEngine');
        return false;
    }
    console.log(`  ✓ Engine loaded successfully. Version: ${engine.ENGINE_VERSION}`);

    // Scenario A: Extended lecture with low movement and low speech -> Should prompt interactive question
    const windowsScenarioA = [
        { movement_indicator: 0.05, audio_activity_indicator: 0.10, observation_coverage: 95 },
        { movement_indicator: 0.08, audio_activity_indicator: 0.12, observation_coverage: 94 },
        { movement_indicator: 0.06, audio_activity_indicator: 0.09, observation_coverage: 96 }
    ];
    const annotationsA = [
        { annotation_type: 'Lecture', content: 'Introduction to Convolutional Neural Networks', timestamp: new Date(Date.now() - 35 * 60000).toISOString() }
    ];
    const sessionInfoA = {
        actual_start_at: new Date(Date.now() - 35 * 60000).toISOString()
    };

    const suggestionsA = engine.evaluateSession('ses_test_1', windowsScenarioA, annotationsA, sessionInfoA);
    console.log(`  Scenario A (Extended Lecture) generated ${suggestionsA.length} suggestion(s):`);
    for (const s of suggestionsA) {
        console.log(`    - [${s.supporting_evidence.rule}] ${s.suggestion_text}`);
    }
    const hasPassiveIntervention = suggestionsA.some(s => s.supporting_evidence.rule === 'PASSIVE_LISTENING_INTERVENTION');
    console.log(`  ✓ Rule PASSIVE_LISTENING_INTERVENTION triggered: ${hasPassiveIntervention}`);

    // Scenario B: Discussion with low speech -> Should prompt discussion clarification
    const windowsScenarioB = [
        { movement_indicator: 0.15, audio_activity_indicator: 0.12, observation_coverage: 90 },
        { movement_indicator: 0.18, audio_activity_indicator: 0.15, observation_coverage: 92 }
    ];
    const annotationsB = [
        { annotation_type: 'Discussion', content: 'Breakout discussion on ethics in AI', timestamp: new Date(Date.now() - 10 * 60000).toISOString() }
    ];

    const suggestionsB = engine.evaluateSession('ses_test_2', windowsScenarioB, annotationsB, { actual_start_at: new Date(Date.now() - 10 * 60000).toISOString() });
    console.log(`  Scenario B (Discussion with Low Audio) generated ${suggestionsB.length} suggestion(s):`);
    for (const s of suggestionsB) {
        console.log(`    - [${s.supporting_evidence.rule}] ${s.suggestion_text}`);
    }
    const hasDiscussionIntervention = suggestionsB.some(s => s.supporting_evidence.rule === 'LOW_DISCUSSION_PARTICIPATION');
    console.log(`  ✓ Rule LOW_DISCUSSION_PARTICIPATION triggered: ${hasDiscussionIntervention}`);

    // Scenario C: Sensor coverage dipped below 75% -> Sensor coverage warning
    const windowsScenarioC = [
        { movement_indicator: 0.20, audio_activity_indicator: 0.30, observation_coverage: 60 },
        { movement_indicator: 0.22, audio_activity_indicator: 0.28, observation_coverage: 65 }
    ];
    const suggestionsC = engine.evaluateSession('ses_test_3', windowsScenarioC, [], {});
    const hasCoverageWarning = suggestionsC.some(s => s.supporting_evidence.rule === 'SENSOR_COVERAGE_CHECK');
    console.log(`  ✓ Rule SENSOR_COVERAGE_CHECK triggered: ${hasCoverageWarning}`);

    return hasPassiveIntervention && hasDiscussionIntervention && hasCoverageWarning;
}

// Test 3: HTTP Server & Static Assets
async function testHttpEndpoints() {
    console.log('\n--- Test 3: HTTP Server & Asset Delivery ---');
    try {
        const res = await fetch('http://localhost:3000/');
        if (res.status !== 200) throw new Error(`HTTP status ${res.status}`);
        const html = await res.text();

        const checks = [
            '<!DOCTYPE html>',
            'Multimodal Attendance & Engagement Agent',
            'id="sidebar"',
            'data-route="dashboard"',
            'data-route="classes"',
            'data-route="students"',
            'data-route="sessions"',
            'data-route="attendance"',
            'data-route="monitor"',
            'data-route="analytics"',
            'data-route="suggestions"',
            'data-route="reports"',
            'data-route="settings"',
            'id="global-sync-pill"'
        ];

        let passed = 0;
        for (const token of checks) {
            if (html.includes(token)) {
                passed++;
            } else {
                console.error(`  ✗ HTML missing expected markup: "${token}"`);
            }
        }
        console.log(`  ✓ HTML structure verified: ${passed}/${checks.length} tokens present`);

        // Check CSS deliverability
        const cssRes = await fetch('http://localhost:3000/css/main.css');
        console.log(`  ✓ main.css delivered: ${cssRes.status === 200} (${(await cssRes.text()).length} chars)`);

        // Check JS deliverability
        const jsRes = await fetch('http://localhost:3000/js/app.js');
        console.log(`  ✓ app.js delivered: ${jsRes.status === 200} (${(await jsRes.text()).length} chars)`);

        return passed === checks.length;
    } catch (err) {
        console.error('HTTP test error:', err.message);
        return false;
    }
}

async function run() {
    console.log('=== MULTIMODAL ATTENDANCE & ENGAGEMENT AGENT TEST RUNNER ===');
    const t1 = testFilesExist();
    const t2 = testRecommendationEngine();
    const t3 = await testHttpEndpoints();

    console.log('\n=========================================');
    console.log(`Final Test Result: ${t1 && t2 && t3 ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
    console.log('=========================================\n');
}

run();
