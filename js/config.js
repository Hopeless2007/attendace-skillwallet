// Application Configuration
// Multimodal Attendance & Engagement Agent

window.APP_CONFIG = {
    APP_NAME: 'Multimodal Attendance & Engagement Agent',
    VERSION: '1.0.0',
    SUPABASE_URL: 'https://ftykuvzmuqbslziwqnir.supabase.co',
    // Using Supabase publishable / anon key for client-side access controlled via RLS
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eWt1dnptdXFic2x6aXdxbmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTYxNTAsImV4cCI6MjEwODc3MjE1MH0.CgcvCFQxZH033wcz6XAwzKMaFn40soqR1MFTnRRwDKY',
    
    // Privacy and sensor defaults
    PRIVACY: {
        FACE_RECOGNITION_ENABLED: false, // Strictly enforced: NEVER identify individuals
        RAW_AUDIO_STORAGE: false,        // Strictly enforced: NEVER store raw audio recordings
        RAW_VIDEO_STORAGE: false,        // Strictly enforced: NEVER store raw video frames
        LOCAL_PROCESSING_ONLY: true      // Process video and audio buffers in memory only
    },

    // Sensor processing intervals
    SENSORS: {
        VIDEO_ANALYSIS_FPS: 2,           // 2 frames per sec is optimal for aggregate occupancy & movement
        AUDIO_SAMPLING_INTERVAL_MS: 500, // 500ms audio RMS sampling
        AGGREGATION_WINDOW_SECONDS: 60,  // Default 1-minute time windows (configurable to 300 for 5-min)
        OCCUPANCY_SMOOTHING_FRAMES: 5,   // Temporal smoothing window to prevent one-frame anomalies
        MOVEMENT_DIFF_THRESHOLD: 25,     // Pixel delta threshold for movement detection
        AUDIO_SILENCE_THRESHOLD_DB: -45, // Decibels below which is considered classroom silence
        AUDIO_SPEECH_THRESHOLD_DB: -30   // Decibels above which conversational speech is indicated
    },

    // Storage keys
    STORAGE_KEYS: {
        SETTINGS: 'app_settings_v1',
        ACTIVE_SESSION: 'active_session_state',
        USER_PROFILE: 'current_user_profile'
    }
};
