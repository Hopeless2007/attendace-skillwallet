// Offline-First Synchronization Manager
// Multimodal Attendance & Engagement Agent

(function() {
    const SYNC_STATUS = {
        SYNCED: 'Synced',
        SAVING: 'Saving',
        OFFLINE_QUEUED: 'Offline — Changes Queued',
        SYNC_ERROR: 'Sync Error'
    };

    let currentStatus = SYNC_STATUS.SYNCED;
    let syncListeners = [];
    let isSynchronizing = false;
    let syncErrorDetails = null;

    // Entity dependency hierarchy for safe replay ordering
    const ENTITY_PRIORITY = {
        classes: 1,
        students: 2,
        class_enrollments: 3,
        sessions: 4,
        attendance_records: 5,
        session_analytics: 6,
        session_annotations: 7,
        teaching_suggestions: 8,
        audit_events: 9
    };

    function setStatus(newStatus, error = null) {
        currentStatus = newStatus;
        syncErrorDetails = error;
        for (const fn of syncListeners) {
            try {
                fn(currentStatus, error);
            } catch (err) {
                console.error('Sync listener error:', err);
            }
        }
    }

    function onStatusChange(callback) {
        syncListeners.push(callback);
        callback(currentStatus, syncErrorDetails);
        return () => {
            syncListeners = syncListeners.filter(fn => fn !== callback);
        };
    }

    function isOnline() {
        return navigator.onLine;
    }

    // High level save: Saves locally to IndexedDB, and if online, pushes to Supabase; otherwise queues
    async function saveRecord(storeName, record, options = { isUpdate: false, conflictTarget: 'id' }) {
        if (!record.id) {
            record.id = 'uuid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        record.updated_at = new Date().toISOString();
        if (!record.created_at) {
            record.created_at = record.updated_at;
        }

        // 1. Always save to local IndexedDB first for instant UI response and offline safety
        await window.AppDB.put(storeName, record);

        // 2. If offline, enqueue and mark status
        if (!isOnline()) {
            await window.AppDB.enqueueSyncOperation({
                entity: storeName,
                entity_id: record.id,
                action: options.isUpdate ? 'UPDATE' : 'UPSERT',
                payload: record,
                conflictTarget: options.conflictTarget
            });
            setStatus(SYNC_STATUS.OFFLINE_QUEUED);
            return { record, cloudSynced: false, queued: true };
        }

        // 3. Online: attempt immediate Supabase sync
        try {
            setStatus(SYNC_STATUS.SAVING);
            const client = window.SupabaseService.getClient();
            if (!client) {
                throw new Error('Supabase client unavailable');
            }

            if (options.isUpdate) {
                await window.SupabaseService.update(storeName, record, 'id', record.id);
            } else {
                await window.SupabaseService.upsert(storeName, [record], options.conflictTarget);
            }

            const queueCount = await window.AppDB.getQueueCount();
            if (queueCount > 0) {
                setStatus(SYNC_STATUS.OFFLINE_QUEUED);
            } else {
                setStatus(SYNC_STATUS.SYNCED);
            }

            return { record, cloudSynced: true, queued: false };
        } catch (err) {
            console.warn(`Online push failed for ${storeName}/${record.id}, queuing offline operation:`, err);
            await window.AppDB.enqueueSyncOperation({
                entity: storeName,
                entity_id: record.id,
                action: options.isUpdate ? 'UPDATE' : 'UPSERT',
                payload: record,
                conflictTarget: options.conflictTarget
            });
            setStatus(SYNC_STATUS.OFFLINE_QUEUED, err.message);
            return { record, cloudSynced: false, queued: true, error: err.message };
        }
    }

    // Delete record helper
    async function deleteRecord(storeName, id) {
        await window.AppDB.deleteItem(storeName, id);

        if (!isOnline()) {
            await window.AppDB.enqueueSyncOperation({
                entity: storeName,
                entity_id: id,
                action: 'DELETE',
                payload: { id }
            });
            setStatus(SYNC_STATUS.OFFLINE_QUEUED);
            return;
        }

        try {
            setStatus(SYNC_STATUS.SAVING);
            await window.SupabaseService.remove(storeName, 'id', id);
            const queueCount = await window.AppDB.getQueueCount();
            setStatus(queueCount > 0 ? SYNC_STATUS.OFFLINE_QUEUED : SYNC_STATUS.SYNCED);
        } catch (err) {
            await window.AppDB.enqueueSyncOperation({
                entity: storeName,
                entity_id: id,
                action: 'DELETE',
                payload: { id }
            });
            setStatus(SYNC_STATUS.OFFLINE_QUEUED, err.message);
        }
    }

    // Flush and replay pending offline queue
    async function syncPendingQueue() {
        if (isSynchronizing) return;
        if (!isOnline()) {
            setStatus(SYNC_STATUS.OFFLINE_QUEUED);
            return;
        }

        const queue = await window.AppDB.getPendingSyncQueue();
        if (queue.length === 0) {
            setStatus(SYNC_STATUS.SYNCED);
            return;
        }

        isSynchronizing = true;
        setStatus(SYNC_STATUS.SAVING);

        // Sort by dependency priority then timestamp
        queue.sort((a, b) => {
            const pA = ENTITY_PRIORITY[a.entity] || 99;
            const pB = ENTITY_PRIORITY[b.entity] || 99;
            if (pA !== pB) return pA - pB;
            return new Date(a.timestamp) - new Date(b.timestamp);
        });

        let failures = 0;

        for (const item of queue) {
            try {
                if (item.action === 'DELETE') {
                    await window.SupabaseService.remove(item.entity, 'id', item.entity_id);
                } else if (item.action === 'UPDATE') {
                    await window.SupabaseService.update(item.entity, item.payload, 'id', item.entity_id);
                } else {
                    // UPSERT default
                    const target = item.conflictTarget || 'id';
                    await window.SupabaseService.upsert(item.entity, [item.payload], target);
                }

                // Removed once confirmed written
                await window.AppDB.removeSyncItem(item.id);
            } catch (err) {
                console.error(`Failed to sync item ${item.id} (${item.entity}):`, err);
                failures++;
                await window.AppDB.updateSyncItem(item.id, {
                    status: 'failed',
                    retry_count: (item.retry_count || 0) + 1,
                    last_error: err.message
                });
            }
        }

        isSynchronizing = false;

        const remaining = await window.AppDB.getQueueCount();
        if (remaining === 0) {
            setStatus(SYNC_STATUS.SYNCED);
        } else if (failures > 0) {
            setStatus(SYNC_STATUS.SYNC_ERROR, `${failures} items failed to sync to cloud`);
        } else {
            setStatus(SYNC_STATUS.OFFLINE_QUEUED);
        }
    }

    // Reconcile and pull fresh data from Supabase to IndexedDB
    async function pullCloudData() {
        if (!isOnline()) return;

        try {
            const client = window.SupabaseService.getClient();
            if (!client) return;

            const tables = ['classes', 'students', 'class_enrollments', 'sessions', 'attendance_records', 'session_analytics', 'session_annotations', 'teaching_suggestions', 'audit_events'];
            
            for (const table of tables) {
                try {
                    const records = await window.SupabaseService.select(table);
                    if (records && records.length > 0) {
                        await window.AppDB.putBatch(table, records);
                    }
                } catch (e) {
                    console.warn(`Could not pull fresh data for ${table}:`, e.message);
                }
            }
        } catch (e) {
            console.warn('Pull cloud data failed:', e.message);
        }
    }

    function onRealtimeStatusChange(status) {
        if (status === 'SUBSCRIBED') {
            console.log('Realtime connected to Supabase.');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('Realtime channel interrupted.');
        }
    }

    // Initialize network listeners
    function init() {
        window.addEventListener('online', async () => {
            console.log('Network connected. Resuming synchronization...');
            await syncPendingQueue();
            await pullCloudData();
        });

        window.addEventListener('offline', () => {
            console.log('Network disconnected. Operating in offline mode.');
            setStatus(SYNC_STATUS.OFFLINE_QUEUED);
        });

        // Check initial queue
        setTimeout(async () => {
            const count = await window.AppDB.getQueueCount();
            if (count > 0) {
                if (isOnline()) {
                    await syncPendingQueue();
                } else {
                    setStatus(SYNC_STATUS.OFFLINE_QUEUED);
                }
            } else {
                setStatus(isOnline() ? SYNC_STATUS.SYNCED : SYNC_STATUS.OFFLINE_QUEUED);
            }
        }, 1000);
    }

    window.SyncManager = {
        SYNC_STATUS,
        getStatus: () => currentStatus,
        getErrorDetails: () => syncErrorDetails,
        onStatusChange,
        saveRecord,
        deleteRecord,
        syncPendingQueue,
        pullCloudData,
        onRealtimeStatusChange,
        init
    };
})();
