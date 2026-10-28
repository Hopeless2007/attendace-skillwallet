// IndexedDB Persistent Local Storage Layer
// Multimodal Attendance & Engagement Agent

(function() {
    const DB_NAME = 'AttendanceEngagementDB';
    const DB_VERSION = 1;

    let dbInstance = null;

    const STORES = {
        CLASSES: 'classes',
        STUDENTS: 'students',
        ENROLLMENTS: 'class_enrollments',
        SESSIONS: 'sessions',
        ATTENDANCE: 'attendance_records',
        ANALYTICS: 'session_analytics',
        ANNOTATIONS: 'session_annotations',
        SUGGESTIONS: 'teaching_suggestions',
        AUDIT: 'audit_events',
        SYNC_QUEUE: 'sync_queue',
        SETTINGS: 'app_settings'
    };

    function openDatabase() {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                return resolve(dbInstance);
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Core entities
                if (!db.objectStoreNames.contains(STORES.CLASSES)) {
                    const store = db.createObjectStore(STORES.CLASSES, { keyPath: 'id' });
                    store.createIndex('status', 'status', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
                    const store = db.createObjectStore(STORES.STUDENTS, { keyPath: 'id' });
                    store.createIndex('student_code', 'student_code', { unique: true });
                }

                if (!db.objectStoreNames.contains(STORES.ENROLLMENTS)) {
                    const store = db.createObjectStore(STORES.ENROLLMENTS, { keyPath: 'id' });
                    store.createIndex('class_id', 'class_id', { unique: false });
                    store.createIndex('student_id', 'student_id', { unique: false });
                    store.createIndex('class_student', ['class_id', 'student_id'], { unique: true });
                }

                if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
                    const store = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
                    store.createIndex('class_id', 'class_id', { unique: false });
                    store.createIndex('session_date', 'session_date', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
                    const store = db.createObjectStore(STORES.ATTENDANCE, { keyPath: 'id' });
                    store.createIndex('session_id', 'session_id', { unique: false });
                    store.createIndex('student_id', 'student_id', { unique: false });
                    store.createIndex('session_student', ['session_id', 'student_id'], { unique: true });
                }

                if (!db.objectStoreNames.contains(STORES.ANALYTICS)) {
                    const store = db.createObjectStore(STORES.ANALYTICS, { keyPath: 'id' });
                    store.createIndex('session_id', 'session_id', { unique: false });
                    store.createIndex('window_start_at', 'window_start_at', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.ANNOTATIONS)) {
                    const store = db.createObjectStore(STORES.ANNOTATIONS, { keyPath: 'id' });
                    store.createIndex('session_id', 'session_id', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.SUGGESTIONS)) {
                    const store = db.createObjectStore(STORES.SUGGESTIONS, { keyPath: 'id' });
                    store.createIndex('session_id', 'session_id', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.AUDIT)) {
                    const store = db.createObjectStore(STORES.AUDIT, { keyPath: 'id' });
                    store.createIndex('session_id', 'session_id', { unique: false });
                    store.createIndex('entity_id', 'entity_id', { unique: false });
                }

                // Durable offline synchronization queue
                if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Local application preferences & cache metadata
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };

            request.onerror = (event) => {
                console.error('IndexedDB open error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Generic CRUD operations
    async function getAll(storeName) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async function getById(storeName, id) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async function put(storeName, item) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(item);
            request.onsuccess = () => resolve(item);
            request.onerror = () => reject(request.error);
        });
    }

    async function putBatch(storeName, items) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            for (const item of items) {
                store.put(item);
            }
            tx.oncomplete = () => resolve(items);
            tx.onerror = () => reject(tx.error);
        });
    }

    async function deleteItem(storeName, id) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async function clear(storeName) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async function getByIndex(storeName, indexName, value) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Sync Queue Management
    async function enqueueSyncOperation(operation) {
        const record = {
            id: operation.id || ('sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)),
            entity: operation.entity,           // 'classes', 'sessions', 'attendance_records', etc.
            entity_id: operation.entity_id,
            action: operation.action,           // 'INSERT', 'UPDATE', 'DELETE'
            payload: operation.payload,
            timestamp: operation.timestamp || new Date().toISOString(),
            status: 'pending',                 // 'pending', 'processing', 'failed'
            retry_count: 0,
            last_error: null
        };
        await put(STORES.SYNC_QUEUE, record);
        return record;
    }

    async function getPendingSyncQueue() {
        const queue = await getAll(STORES.SYNC_QUEUE);
        return queue
            .filter(item => item.status === 'pending' || item.status === 'failed')
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    async function updateSyncItem(id, updates) {
        const existing = await getById(STORES.SYNC_QUEUE, id);
        if (existing) {
            const updated = { ...existing, ...updates };
            await put(STORES.SYNC_QUEUE, updated);
            return updated;
        }
        return null;
    }

    async function removeSyncItem(id) {
        return deleteItem(STORES.SYNC_QUEUE, id);
    }

    async function getQueueCount() {
        const items = await getPendingSyncQueue();
        return items.length;
    }

    window.AppDB = {
        STORES,
        openDatabase,
        getAll,
        getById,
        put,
        putBatch,
        deleteItem,
        clear,
        getByIndex,
        enqueueSyncOperation,
        getPendingSyncQueue,
        updateSyncItem,
        removeSyncItem,
        getQueueCount
    };
})();
