// Supabase Client, Auth & Realtime Service
// Multimodal Attendance & Engagement Agent

(function() {
    let client = null;
    let realtimeChannel = null;
    let realtimeListeners = [];

    function initClient() {
        if (client) return client;

        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            console.warn('Supabase JS library not loaded yet; using offline fallback mode.');
            return null;
        }

        try {
            client = window.supabase.createClient(
                window.APP_CONFIG.SUPABASE_URL,
                window.APP_CONFIG.SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true,
                        storage: window.localStorage
                    },
                    realtime: {
                        params: {
                            eventsPerSecond: 10
                        }
                    }
                }
            );
            console.log('Supabase client initialized successfully.');
            return client;
        } catch (e) {
            console.error('Error initializing Supabase client:', e);
            return null;
        }
    }

    // Auth helpers
    async function getCurrentUser() {
        const c = initClient();
        if (!c) return null;
        try {
            const { data: { user }, error } = await c.auth.getUser();
            if (error) return null;
            return user;
        } catch (e) {
            return null;
        }
    }

    async function getSession() {
        const c = initClient();
        if (!c) return null;
        try {
            const { data: { session }, error } = await c.auth.getSession();
            if (error) return null;
            return session;
        } catch (e) {
            return null;
        }
    }

    async function signIn(email, password) {
        const c = initClient();
        if (!c) throw new Error('Supabase client offline');
        const res = await c.auth.signInWithPassword({ email, password });
        return res;
    }

    async function signUp(email, password, displayName) {
        const c = initClient();
        if (!c) throw new Error('Supabase client offline');
        const res = await c.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName, role: 'instructor' }
            }
        });
        return res;
    }

    async function signOut() {
        const c = initClient();
        if (c) {
            await c.auth.signOut();
        }
    }

    // Direct Database Query wrappers
    async function select(table, query = {}) {
        const c = initClient();
        if (!c) throw new Error('Supabase client offline');

        let q = c.from(table).select(query.select || '*');
        if (query.eq) {
            for (const [key, val] of Object.entries(query.eq)) {
                q = q.eq(key, val);
            }
        }
        if (query.order) {
            q = q.order(query.order.column, { ascending: query.order.ascending ?? true });
        }
        if (query.limit) {
            q = q.limit(query.limit);
        }

        const { data, error } = await q;
        if (error) throw error;
        return data;
    }

    async function insert(table, records) {
        const c = initClient();
        if (!c) throw new Error('Supabase client offline');
        const { data, error } = await c.from(table).insert(records).select();
        if (error) throw error;
        return data;
    }

    async function upsert(table, records, onConflict = 'id') {
        const c = initClient();
        if (!c) throw new Error('Supabase client offline');
        const { data, error } = await c.from(table).upsert(records, { onConflict }).select();
        if (error) throw error;
        return data;
    }

    async function update(table, updates, matchKey, matchVal) {
        const c = initClient();
        if (!c) throw new Error('Supabase client offline');
        const { data, error } = await c.from(table).update(updates).eq(matchKey, matchVal).select();
        if (error) throw error;
        return data;
    }

    async function remove(table, matchKey, matchVal) {
        const c = initClient();
        if (!c) throw new Error('Supabase client offline');
        const { data, error } = await c.from(table).delete().eq(matchKey, matchVal);
        if (error) throw error;
        return true;
    }

    // Realtime Postgres Change Subscriptions
    function setupRealtimeSubscriptions(onChangeCallback) {
        const c = initClient();
        if (!c) return;

        if (realtimeChannel) {
            c.removeChannel(realtimeChannel);
        }

        realtimeChannel = c.channel('public:attendance-engagement-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, (payload) => {
                notifyListeners('classes', payload);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
                notifyListeners('students', payload);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'class_enrollments' }, (payload) => {
                notifyListeners('class_enrollments', payload);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, (payload) => {
                notifyListeners('sessions', payload);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, (payload) => {
                notifyListeners('attendance_records', payload);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'session_analytics' }, (payload) => {
                notifyListeners('session_analytics', payload);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'session_annotations' }, (payload) => {
                notifyListeners('session_annotations', payload);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teaching_suggestions' }, (payload) => {
                notifyListeners('teaching_suggestions', payload);
            })
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
                if (window.SyncManager) {
                    window.SyncManager.onRealtimeStatusChange(status);
                }
            });
    }

    function addRealtimeListener(fn) {
        realtimeListeners.push(fn);
        return () => {
            realtimeListeners = realtimeListeners.filter(l => l !== fn);
        };
    }

    function notifyListeners(table, payload) {
        for (const listener of realtimeListeners) {
            try {
                listener(table, payload);
            } catch (err) {
                console.error('Error in realtime listener:', err);
            }
        }
    }

    window.SupabaseService = {
        getClient: initClient,
        getCurrentUser,
        getSession,
        signIn,
        signUp,
        signOut,
        select,
        insert,
        upsert,
        update,
        remove,
        setupRealtimeSubscriptions,
        addRealtimeListener
    };
})();
