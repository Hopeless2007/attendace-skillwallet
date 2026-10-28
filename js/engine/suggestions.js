// Rule-Based Pedagogical Suggestion Engine
// Multimodal Attendance & Engagement Agent
// Offline-first deterministic analysis of aggregate classroom signals & annotations

(function() {
    const ENGINE_VERSION = 'v1.0-deterministic-pedagogical-engine';

    /**
     * Evaluates active session metrics, annotations, and aggregate trends to generate teaching suggestions.
     * @param {string} sessionId
     * @param {Array} analyticsWindows - recent session_analytics rows
     * @param {Array} annotations - session_annotations rows
     * @param {Object} sessionInfo - session object with planned/actual times and title
     * @returns {Array} newly generated suggestion objects
     */
    function evaluateSession(sessionId, analyticsWindows = [], annotations = [], sessionInfo = {}) {
        const suggestions = [];

        if (!sessionId) return suggestions;

        // Ensure we have enough data to form meaningful observations
        if (!analyticsWindows || analyticsWindows.length === 0) {
            return suggestions;
        }

        const recentWindows = analyticsWindows.slice(-5); // Look at last 5 observation windows (e.g. last 5-15 mins)
        const avgMovement = recentWindows.reduce((acc, w) => acc + (Number(w.movement_indicator) || 0), 0) / recentWindows.length;
        const avgAudio = recentWindows.reduce((acc, w) => acc + (Number(w.audio_activity_indicator) || 0), 0) / recentWindows.length;
        const avgCoverage = recentWindows.reduce((acc, w) => acc + (Number(w.observation_coverage) || 100), 0) / recentWindows.length;

        // Calculate session duration in minutes
        let sessionMinutes = 0;
        if (sessionInfo.actual_start_at) {
            sessionMinutes = Math.max(1, Math.round((Date.now() - new Date(sessionInfo.actual_start_at).getTime()) / 60000));
        } else {
            sessionMinutes = recentWindows.length * 2; // approximation based on windows
        }

        // Get the most recent instructor annotation / activity type
        const latestAnnotation = annotations.length > 0 ? annotations[annotations.length - 1] : null;
        const currentActivityType = latestAnnotation ? (latestAnnotation.annotation_type || 'lecture').toLowerCase() : 'lecture';
        const annotationContent = latestAnnotation ? latestAnnotation.content : 'General Instruction';

        // RULE 1: Sensor Coverage Warning
        if (avgCoverage < 75) {
            suggestions.push(createSuggestion(
                sessionId,
                "Sensor observation coverage has dipped below 75%. Check camera positioning or microphone permissions to ensure representative aggregate observations.",
                {
                    average_coverage_percent: Math.round(avgCoverage),
                    recent_windows_analyzed: recentWindows.length,
                    rule: 'SENSOR_COVERAGE_CHECK'
                },
                `Observed observation coverage averaged ${Math.round(avgCoverage)}% over the last ${recentWindows.length} observation windows.`
            ));
        }

        // RULE 2: Extended Lecture with Low Activity -> Prompt Interaction
        if ((currentActivityType.includes('lecture') || currentActivityType.includes('presentation')) && sessionMinutes > 25 && avgMovement < 0.15 && avgAudio < 0.20) {
            suggestions.push(createSuggestion(
                sessionId,
                "Classroom has been in a sustained passive listening state for over 25 minutes. Consider introducing an interactive prompt, quick quiz, or worked example to activate participation.",
                {
                    activity_type: currentActivityType,
                    session_elapsed_minutes: sessionMinutes,
                    average_movement: parseFloat(avgMovement.toFixed(2)),
                    average_audio_activity: parseFloat(avgAudio.toFixed(2)),
                    rule: 'PASSIVE_LISTENING_INTERVENTION'
                },
                `Session has progressed ${sessionMinutes} mins in '${annotationContent}' with low aggregate movement (${(avgMovement*100).toFixed(0)}%) and acoustic speech activity (${(avgAudio*100).toFixed(0)}%).`
            ));
        }

        // RULE 3: Discussion/Group Exercise with Low Audio Activity
        if ((currentActivityType.includes('discussion') || currentActivityType.includes('collaborative') || currentActivityType.includes('group')) && avgAudio < 0.25) {
            suggestions.push(createSuggestion(
                sessionId,
                "Audio activity remains relatively low during a designated discussion or collaborative segment. Consider verifying whether groups have clear roles or clarifying discussion prompts.",
                {
                    activity_type: currentActivityType,
                    average_audio_activity: parseFloat(avgAudio.toFixed(2)),
                    rule: 'LOW_DISCUSSION_PARTICIPATION'
                },
                `Instructor marked '${annotationContent}', but acoustic speech indicator averaged only ${(avgAudio*100).toFixed(0)}% across recent intervals.`
            ));
        }

        // RULE 4: Group Exercise with High Positive Engagement
        if ((currentActivityType.includes('group') || currentActivityType.includes('workshop') || currentActivityType.includes('lab')) && avgMovement >= 0.25 && avgAudio >= 0.35) {
            suggestions.push(createSuggestion(
                sessionId,
                "Dynamic aggregate movement and active acoustic interaction detected during this collaborative exercise. Review this activity structure for potential reuse in upcoming sessions.",
                {
                    activity_type: currentActivityType,
                    average_movement: parseFloat(avgMovement.toFixed(2)),
                    average_audio_activity: parseFloat(avgAudio.toFixed(2)),
                    rule: 'SUCCESSFUL_COLLABORATION_PATTERN'
                },
                `Healthy collaborative indicators observed: ${(avgMovement*100).toFixed(0)}% movement and ${(avgAudio*100).toFixed(0)}% conversational speech activity during '${annotationContent}'.`
            ));
        }

        // RULE 5: High Restlessness / Movement during Extended Solo Work
        if ((currentActivityType.includes('reading') || currentActivityType.includes('quiz') || currentActivityType.includes('individual')) && avgMovement > 0.45) {
            suggestions.push(createSuggestion(
                sessionId,
                "Higher aggregate movement detected during individual focus time. Students may be encountering blockers or completing tasks early; consider checking in with individual tables.",
                {
                    activity_type: currentActivityType,
                    average_movement: parseFloat(avgMovement.toFixed(2)),
                    rule: 'FOCUS_PERIOD_RESTLESSNESS'
                },
                `Movement index elevated to ${(avgMovement*100).toFixed(0)}% during individual work segment '${annotationContent}'.`
            ));
        }

        return suggestions;
    }

    function createSuggestion(sessionId, suggestionText, supportingEvidence, evidenceDescription) {
        return {
            id: 'sug_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7),
            session_id: sessionId,
            suggestion_text: suggestionText,
            supporting_evidence: {
                ...supportingEvidence,
                evidence_description: evidenceDescription,
                generated_at: new Date().toISOString()
            },
            rule_version: ENGINE_VERSION,
            status: 'pending', // 'pending', 'accepted', 'dismissed', 'reviewed'
            instructor_notes: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    window.TeachingSuggestionEngine = {
        ENGINE_VERSION,
        evaluateSession,
        createSuggestion
    };
})();
