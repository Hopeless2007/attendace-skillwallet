// Privacy-Preserving Audio Signal Processing
// Multimodal Attendance & Engagement Agent
// Strictly non-identifying acoustic signal metrics: volume, speech activity indicator, silence detection

(function() {
    let audioContext = null;
    let analyserNode = null;
    let microphoneSource = null;
    let mediaStream = null;
    let sampleIntervalId = null;
    let isProcessing = false;
    let isPaused = false;

    // Sliding history for intervals
    const HISTORY_LENGTH = 30; // 30 samples * 500ms = 15 second sliding window
    let speechActivityHistory = [];
    let silenceHistory = [];
    let totalSamples = 0;
    let droppedSamples = 0;

    let latestMetrics = {
        soundLevelDb: -100,
        soundLevelNormalized: 0,
        audioActivityIndicator: 0,
        speechActivityPercent: 0,
        silencePercent: 100,
        signalQuality: 'Good',
        isMicActive: false,
        error: null
    };

    let metricsListeners = [];

    async function requestMicPermission() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Microphone API is not supported in this browser environment or requires HTTPS/localhost.');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false
                },
                video: false
            });
            mediaStream = stream;
            return stream;
        } catch (err) {
            console.error('Microphone access denied or failed:', err);
            latestMetrics.error = err.message;
            throw err;
        }
    }

    async function startProcessing() {
        if (isProcessing) return;

        if (!mediaStream) {
            await requestMicPermission();
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            throw new Error('Web Audio API not supported in this browser.');
        }

        audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 512;
        analyserNode.smoothingTimeConstant = 0.6;

        microphoneSource = audioContext.createMediaStreamSource(mediaStream);
        microphoneSource.connect(analyserNode);
        // Note: Do not connect analyserNode to audioContext.destination to avoid audio feedback loop

        isProcessing = true;
        isPaused = false;
        latestMetrics.isMicActive = true;
        latestMetrics.error = null;

        const sampleIntervalMs = window.APP_CONFIG.SENSORS.AUDIO_SAMPLING_INTERVAL_MS || 500;
        sampleIntervalId = setInterval(sampleAcousticMetrics, sampleIntervalMs);
    }

    function pauseProcessing() {
        isPaused = true;
    }

    function resumeProcessing() {
        isPaused = false;
    }

    function stopProcessing() {
        isProcessing = false;
        isPaused = false;

        if (sampleIntervalId) {
            clearInterval(sampleIntervalId);
            sampleIntervalId = null;
        }

        if (microphoneSource) {
            microphoneSource.disconnect();
            microphoneSource = null;
        }

        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        speechActivityHistory = [];
        silenceHistory = [];
        latestMetrics.isMicActive = false;
        notifyListeners();
    }

    // Compute RMS, Decibels, speech presence without storing any audio data
    function sampleAcousticMetrics() {
        if (!isProcessing || isPaused || !analyserNode) {
            return;
        }

        try {
            const timeData = new Float32Array(analyserNode.fftSize);
            analyserNode.getFloatTimeDomainData(timeData);

            // Calculate Root Mean Square (RMS)
            let sumSquares = 0;
            for (let i = 0; i < timeData.length; i++) {
                sumSquares += timeData[i] * timeData[i];
            }
            const rms = Math.sqrt(sumSquares / timeData.length);

            // Convert RMS to dB: 20 * log10(rms)
            // Reference min ~ -100 dB
            let db = rms > 0.00001 ? 20 * Math.log10(rms) : -100;
            db = Math.max(-100, Math.min(0, db));

            // Normalized sound level: 0.0 to 1.0
            const soundLevelNormalized = Math.max(0, Math.min(1.0, (db + 80) / 70));

            // Threshold checks from config
            const silenceThreshold = window.APP_CONFIG.SENSORS.AUDIO_SILENCE_THRESHOLD_DB || -45;
            const speechThreshold = window.APP_CONFIG.SENSORS.AUDIO_SPEECH_THRESHOLD_DB || -30;

            const isSilent = db < silenceThreshold;
            const isSpeechActive = db >= speechThreshold;

            speechActivityHistory.push(isSpeechActive ? 1 : 0);
            silenceHistory.push(isSilent ? 1 : 0);

            if (speechActivityHistory.length > HISTORY_LENGTH) {
                speechActivityHistory.shift();
            }
            if (silenceHistory.length > HISTORY_LENGTH) {
                silenceHistory.shift();
            }

            const speechPercent = Math.round(
                (speechActivityHistory.reduce((a, b) => a + b, 0) / speechActivityHistory.length) * 100
            );
            const silencePercent = Math.round(
                (silenceHistory.reduce((a, b) => a + b, 0) / silenceHistory.length) * 100
            );

            totalSamples++;

            latestMetrics = {
                soundLevelDb: Math.round(db),
                soundLevelNormalized: parseFloat(soundLevelNormalized.toFixed(3)),
                audioActivityIndicator: parseFloat((speechPercent / 100).toFixed(2)),
                speechActivityPercent: speechPercent,
                silencePercent: silencePercent,
                signalQuality: rms > 0.95 ? 'Clipping' : (rms < 0.0005 ? 'Low Input' : 'Optimal'),
                isMicActive: true,
                error: null
            };

            notifyListeners();
        } catch (err) {
            console.error('Audio sampling error:', err);
            droppedSamples++;
        }
    }

    function addListener(fn) {
        metricsListeners.push(fn);
        fn(latestMetrics);
        return () => {
            metricsListeners = metricsListeners.filter(l => l !== fn);
        };
    }

    function notifyListeners() {
        for (const fn of metricsListeners) {
            try {
                fn(latestMetrics);
            } catch (e) {
                console.error('Audio listener error:', e);
            }
        }
    }

    window.AudioSensor = {
        requestMicPermission,
        startProcessing,
        pauseProcessing,
        resumeProcessing,
        stopProcessing,
        getMetrics: () => latestMetrics,
        addListener,
        isSupported: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext))
    };
})();
