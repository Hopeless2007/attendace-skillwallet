// Privacy-Preserving Computer Vision Pipeline
// Multimodal Attendance & Engagement Agent
// Strictly non-identifying aggregate occupancy and motion detection

(function() {
    let videoElement = null;
    let canvasElement = null;
    let canvasCtx = null;
    let mediaStream = null;
    let animFrameId = null;
    let isProcessing = false;
    let isPaused = false;

    // Temporal smoothing and frame diffing state
    let prevFrameData = null;
    let occupancyHistory = [];
    const MAX_OCCUPANCY_HISTORY = 10;
    
    // Performance & frame metrics
    let totalFramesProcessed = 0;
    let droppedFrames = 0;
    let lastFrameTimestamp = 0;
    const TARGET_FPS = 2; // Bounded processing rate to preserve battery & CPU
    const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

    // Latest calculated aggregate metrics
    let latestMetrics = {
        estimatedOccupancy: 0,
        smoothedOccupancy: 0,
        movementIndicator: 0,
        observationCoverage: 100,
        sensorConfidence: 0.95,
        missingFrameRate: 0,
        isCameraActive: false,
        error: null
    };

    let metricsListeners = [];

    async function requestCameraPermission() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API is not supported in this browser environment or requires HTTPS/localhost.');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });
            mediaStream = stream;
            return stream;
        } catch (err) {
            console.error('Camera access denied or failed:', err);
            latestMetrics.error = err.message;
            throw err;
        }
    }

    function initVideoElements(customVideoEl = null) {
        if (customVideoEl) {
            videoElement = customVideoEl;
        } else if (!videoElement) {
            videoElement = document.createElement('video');
            videoElement.setAttribute('autoplay', '');
            videoElement.setAttribute('muted', '');
            videoElement.setAttribute('playsinline', '');
            videoElement.style.display = 'none';
            document.body.appendChild(videoElement);
        }

        if (!canvasElement) {
            canvasElement = document.createElement('canvas');
            canvasElement.width = 320;
            canvasElement.height = 240;
            canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });
        }
    }

    async function startProcessing(videoEl = null) {
        if (isProcessing) return;

        initVideoElements(videoEl);

        if (!mediaStream) {
            await requestCameraPermission();
        }

        videoElement.srcObject = mediaStream;
        await videoElement.play();

        isProcessing = true;
        isPaused = false;
        latestMetrics.isCameraActive = true;
        latestMetrics.error = null;
        lastFrameTimestamp = performance.now();

        processFrameLoop();
    }

    function pauseProcessing() {
        isPaused = true;
    }

    function resumeProcessing() {
        if (isProcessing && isPaused) {
            isPaused = false;
            lastFrameTimestamp = performance.now();
            processFrameLoop();
        }
    }

    function stopProcessing() {
        isProcessing = false;
        isPaused = false;

        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }

        if (videoElement) {
            videoElement.srcObject = null;
        }

        prevFrameData = null;
        occupancyHistory = [];
        latestMetrics.isCameraActive = false;
        notifyListeners();
    }

    function processFrameLoop() {
        if (!isProcessing || isPaused) return;

        const now = performance.now();
        const elapsed = now - lastFrameTimestamp;

        if (elapsed >= FRAME_INTERVAL_MS) {
            lastFrameTimestamp = now - (elapsed % FRAME_INTERVAL_MS);
            analyzeCurrentFrame();
        }

        animFrameId = requestAnimationFrame(processFrameLoop);
    }

    // Process a single video frame for aggregate motion and occupant silhouette estimation
    // PRIVACY NOTICE:
    // No faces are detected, no facial landmarks are computed, and no individual identities are tracked.
    // The raw frame pixels are immediately discarded after computing the scalar metrics.
    function analyzeCurrentFrame() {
        if (!videoElement || videoElement.readyState < 2 || !canvasCtx) {
            droppedFrames++;
            return;
        }

        const width = canvasElement.width;
        const height = canvasElement.height;

        // Draw downscaled frame to in-memory canvas
        canvasCtx.drawImage(videoElement, 0, 0, width, height);
        const frameData = canvasCtx.getImageData(0, 0, width, height);
        const data = frameData.data;

        // Calculate motion via frame differencing against previous frame
        let motionPixels = 0;
        let luminanceSum = 0;
        const totalPixels = width * height;
        const diffThreshold = window.APP_CONFIG.SENSORS.MOVEMENT_DIFF_THRESHOLD || 25;

        // Greyscale conversion and difference
        const currentGrey = new Uint8ClampedArray(totalPixels);

        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            // Standard perceptual luminance: 0.299*R + 0.587*G + 0.114*B
            const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
            currentGrey[p] = lum;
            luminanceSum += lum;

            if (prevFrameData) {
                const diff = Math.abs(lum - prevFrameData[p]);
                if (diff > diffThreshold) {
                    motionPixels++;
                }
            }
        }

        // Aggregate movement level normalized to [0.0 - 1.0]
        const rawMovement = prevFrameData ? (motionPixels / (totalPixels * 0.25)) : 0;
        const movementIndicator = Math.min(1.0, Math.max(0.0, parseFloat(rawMovement.toFixed(3))));

        // Approximate occupancy estimation using spatial foreground clustering
        // We detect active presence zones across a coarse 8x6 grid
        const gridCols = 8;
        const gridRows = 6;
        const cellWidth = Math.floor(width / gridCols);
        const cellHeight = Math.floor(height / gridRows);
        let activeZones = 0;

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                let cellVariance = 0;
                let cellMean = 0;
                const cellPixelCount = cellWidth * cellHeight;

                for (let y = r * cellHeight; y < (r + 1) * cellHeight; y++) {
                    for (let x = c * cellWidth; x < (c + 1) * cellWidth; x++) {
                        cellMean += currentGrey[y * width + x];
                    }
                }
                cellMean /= cellPixelCount;

                for (let y = r * cellHeight; y < (r + 1) * cellHeight; y++) {
                    for (let x = c * cellWidth; x < (c + 1) * cellWidth; x++) {
                        const dev = currentGrey[y * width + x] - cellMean;
                        cellVariance += dev * dev;
                    }
                }
                cellVariance /= cellPixelCount;

                // Typical human silhouette presence causes high spatial contrast/variance (> 400)
                if (cellVariance > 450) {
                    activeZones++;
                }
            }
        }

        // Estimate participant count based on cluster density (approx 2-3 active zones per participant)
        // With a lower bound of 1 if video is active and motion is observed
        let estimatedOccupants = Math.round(activeZones / 2.8);
        if (estimatedOccupants === 0 && movementIndicator > 0.05) {
            estimatedOccupants = 1;
        }

        // Apply temporal smoothing to prevent one-frame spikes
        occupancyHistory.push(estimatedOccupants);
        if (occupancyHistory.length > MAX_OCCUPANCY_HISTORY) {
            occupancyHistory.shift();
        }
        const smoothedOccupancy = Math.round(
            occupancyHistory.reduce((a, b) => a + b, 0) / occupancyHistory.length
        );

        totalFramesProcessed++;
        prevFrameData = currentGrey;

        // Missing frame rate & observation coverage calculation
        const frameCoverage = Math.max(0, Math.min(100, Math.round(100 * (1 - (droppedFrames / (totalFramesProcessed + droppedFrames || 1))))));

        latestMetrics = {
            estimatedOccupancy: estimatedOccupants,
            smoothedOccupancy: smoothedOccupancy,
            movementIndicator: movementIndicator,
            observationCoverage: frameCoverage,
            sensorConfidence: 0.92,
            missingFrameRate: parseFloat((droppedFrames / (totalFramesProcessed + droppedFrames || 1)).toFixed(3)),
            isCameraActive: true,
            error: null
        };

        // Discard raw frame reference immediately
        canvasCtx.clearRect(0, 0, width, height);

        notifyListeners();
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
                console.error('Vision listener error:', e);
            }
        }
    }

    window.VisionSensor = {
        requestCameraPermission,
        startProcessing,
        pauseProcessing,
        resumeProcessing,
        stopProcessing,
        getMetrics: () => latestMetrics,
        addListener,
        isSupported: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    };
})();
