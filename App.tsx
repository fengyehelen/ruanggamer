
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Language, Platform, User, SortOption, Activity, Admin, SystemConfig, BankAccount, Transaction } from './types';
import { TRANSLATIONS } from './constants';
import { api } from './services/api';
import Layout from './components/Layout';
import AdminApp from './components/AdminApp';
import {
    HomeView, TaskDetailView, MyTasksView, ProfileView, ReferralView,
    ActivityDetailView, UserLogin, MailboxView, StaticPageView, TransactionHistoryView, TasksView, RewardPopup
} from './components/UserApp';
import { useSupabaseRealtime } from './hooks/useSupabaseRealtime';
import InstallAppButton from './components/InstallAppButton';
import ReactPixel from 'react-facebook-pixel';
import { useLocation } from 'react-router-dom';

// Sub-component to handle route tracking within Router context
const PixelTracker: React.FC = () => {
    const location = useLocation();
    useEffect(() => {
        ReactPixel.pageView();
    }, [location]);
    return null;
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    // Hardcoded to ID for RuangGamer
    const lang: Language = 'id';
    const [sort, setSort] = useState<SortOption>(SortOption.NEWEST);
    const [hasUnreadTx, setHasUnreadTx] = useState(false);
    const [hasUnreadMisi, setHasUnreadMisi] = useState(false); // NEW: For mission red dot
    const [hasUnreadMsg, setHasUnreadMsg] = useState(false); // NEW
    const [rewardPopupTx, setRewardPopupTx] = useState<Transaction | null>(null);

    // System Config State
    const [config, setConfig] = useState<SystemConfig>({
        initialBalance: {}, minWithdrawAmount: {}, telegramLinks: {}, customerServiceLinks: {}, hypeLevel: 5, helpContent: '', aboutContent: '', vipConfig: {}
    });


    // Meta Pixel Tracking (Initialize and handle Advanced Matching)
    useEffect(() => {
        const advancedMatching = user ? { em: user.email, external_id: user.id } : undefined;
        // @ts-ignore - Following user data mapping requirements
        ReactPixel.init('2606996086367085', advancedMatching);

        // As per instruction: trigger PageView after init with test code
        // @ts-ignore
        ReactPixel.pageView({ test_event_code: 'TEST64765' });
    }, [user?.id]);

    // Load Initial Data from MockDB (Client Side)
    useEffect(() => {
        // --- ENV DIAGNOSTICS ---
        const sUrl = import.meta.env.VITE_SUPABASE_URL;
        const sKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const gKey = import.meta.env.VITE_GEMINI_API_KEY;

        console.log('--- Environment Check ---');
        console.log('Supabase URL:', sUrl ? `${sUrl.substring(0, 10)}...` : 'MISSING');
        console.log('Supabase Key:', sKey ? 'DETECTED' : 'MISSING');
        console.log('Gemini Key:', gKey ? 'DETECTED' : 'MISSING');
        console.log('-------------------------');

        // Capture referral code from URL if present
        const search = window.location.hash.split('?')[1] || window.location.search.substring(1);
        const params = new URLSearchParams(search);
        const ref = params.get('ref');
        if (ref) {
            localStorage.setItem('pending_referral', ref);
        }

        api.getInitialData().then(data => {
            const sortedPlatforms = (data.platforms || []).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
            setPlatforms(sortedPlatforms);
            setActivities(data.activities || []);
        }).catch(err => console.error("Failed to load data", err));

        api.getConfig().then(c => {
            if (c) setConfig(c);
        }).catch(err => console.error("Failed to load config", err));

        const savedUserId = localStorage.getItem('ruanggamer_session');
        if (savedUserId) {
            api.getUser(savedUserId).then(u => {
                if (u) {
                    setUser(u);
                    checkUnread(u);
                    // If admin, load all users
                    if (u.role === 'admin') {
                        api.getAllUsers().then(data => setAllUsers(data.users));
                    }
                }
            });
        }

    }, []);

    const checkUnread = (u: User) => {
        // 1. Check for unread transactions indicator (red dot)
        const lastReadTime = localStorage.getItem('last_tx_read_time');
        if (u.transactions && u.transactions.length > 0) {
            // Sort to get latest
            const latestTx = u.transactions[0];

            if (!lastReadTime) {
                setHasUnreadTx(true);
            } else {
                const latestTxDate = new Date(latestTx.date).getTime();
                const lastReadDate = new Date(lastReadTime).getTime();
                if (latestTxDate > lastReadDate) {
                    setHasUnreadTx(true);
                } else {
                    setHasUnreadTx(false);
                }
            }

            // 2. Check for POPUP Reward (Req 4)
            // Logic: If latest TX is positive (income) and hasn't been shown in popup yet
            const lastPopupId = localStorage.getItem('last_popup_tx_id');
            // Check if latest transaction is income and is different from last popup
            if (latestTx.amount > 0 && latestTx.id !== lastPopupId) {
                setRewardPopupTx(latestTx);
            }

        } else {
            setHasUnreadTx(false);
        }

        // 3. Check for unread messages (Direct check from user.messages)
        const unreadCount = (u.messages || []).filter(m => !m.read).length;
        setHasUnreadMsg(unreadCount > 0);
    };

    const handleCloseRewardPopup = () => {
        if (rewardPopupTx) {
            localStorage.setItem('last_popup_tx_id', rewardPopupTx.id);
            setRewardPopupTx(null);
        }
    };

    const handleClearUnreadTx = () => {
        setHasUnreadTx(false);
        localStorage.setItem('last_tx_read_time', new Date().toISOString());
    };

    const handleClearUnreadMisi = () => {
        setHasUnreadMisi(false);
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        try {
            await api.markAllMessagesRead(user.id);
            setHasUnreadMsg(false);
            // Refresh user data to get updated read status
            const updatedUser = await api.getUser(user.id);
            if (updatedUser) setUser(updatedUser);
        } catch (e) {
            console.error("Mark all read failed", e);
        }
    };

    const handleAuth = async (email: string, pass: string, isReg: boolean, invite?: string): Promise<string | null> => {
        try {
            let data;
            if (isReg) {
                data = await api.register(email, pass, '9527', invite);
            } else {
                data = await api.login(email, pass);
            }

            if (data && data.user) {
                // Meta Pixel: CompleteRegistration
                if (isReg) {
                    // @ts-ignore - Following user specific requirements for tracking
                    ReactPixel.track('CompleteRegistration', { content_name: 'New User Signup' });
                }

                setUser(data.user);
                checkUnread(data.user);
                localStorage.setItem('ruanggamer_session', data.user.id);

                // If admin, load all users
                if (data.user.role === 'admin') {
                    api.getAllUsers().then(res => setAllUsers(res.users));
                }
                return null;
            }

            return "Unknown error";
        } catch (e: any) {
            try {
                const errObj = JSON.parse(e.message);
                return errObj.error || "Auth Failed";
            } catch {
                return "Authentication Failed";
            }
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('ruanggamer_session');
    };

    const handleStartTask = (platform: Platform) => {
        if (!user) {
            window.location.hash = '#/login';
            return;
        }

        // --- OPTIMISTIC UI: START ---
        // 1. Immediately show instructions
        alert("Anda telah berpartisipasi dalam misi ini. Sistem akan segera mengalihkan Anda ke URL tujuan. Silakan kembali ke RuangGamer untuk mengambil hadiah setelah menyelesaikan misi.");

        // 2. Immediately open link
        let url = platform.downloadLink;
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        window.open(url, '_blank');

        // 3. Execute API call in background
        (async () => {
            try {
                await api.startTask(user.id, platform.id);
                const updatedUser = await api.getUser(user.id);
                if (updatedUser) setUser(updatedUser);

                // Set unread mission red dot
                setHasUnreadMisi(true);

                // Refresh users if admin
                if (user?.role === 'admin') {
                    api.getAllUsers().then(res => setAllUsers(res.users));
                }
            } catch (e: any) {
                const errorMsg = e.message || '';
                // Only alert on real errors (not "already started")
                if (!errorMsg.includes("already started") && !errorMsg.includes("Task already taken")) {
                    console.error("Background task start failed:", errorMsg);
                    // Silently fail or minimal toast if needed
                }
            }
        })();
        // --- OPTIMISTIC UI: END ---
    };


    const handleBindPhone = async (phone: string) => {
        if (!user) return;
        try {
            const updatedUser = await api.bindPhone(user.id, phone);
            setUser(updatedUser);
            alert("Phone Bound Successfully!");
        } catch (e: any) {
            alert("Gagal bind HP: " + e.message);
        }
    };

    const handleBindCard = async (account: Omit<BankAccount, 'id'>) => {
        if (!user) return;
        try {
            const updatedUser = await api.bindBank(user.id, account);
            setUser(updatedUser);
            alert("Bank Account Bound Successfully!");
        } catch (e: any) {
            alert("Gagal bind akun: " + e.message);
        }
    };

    const handleWithdraw = async (amount: number, accountId: string) => {
        if (!user) return;
        try {
            const updatedUser = await api.withdraw(user.id, amount, accountId);
            setUser(updatedUser);
            checkUnread(updatedUser);
            alert("Penarikan Berhasil Diajukan!");
        } catch (e: any) {
            alert("Gagal withdraw: " + e.message);
        }
    };

    // NEW: Like Task Logic (Optimistic UI)
    const handleLikeTask = (platformId: string) => {
        if (!user) return window.location.hash = '#/login';

        // Prevent multiple likes if already liked
        if (user.likedTaskIds?.includes(platformId)) return;

        // --- OPTIMISTIC UI: START ---
        // 1. Snapshot previous state for rollback
        const prevUser = { ...user };
        const prevPlatforms = [...platforms];

        // 2. Update User state immediately
        const updatedUser = {
            ...user,
            likedTaskIds: [...(user.likedTaskIds || []), platformId]
        };
        setUser(updatedUser);

        // 3. Update Platforms list immediately
        const updatedPlatforms = [...platforms];
        const idx = updatedPlatforms.findIndex(p => p.id === platformId);
        if (idx !== -1) {
            updatedPlatforms[idx] = {
                ...updatedPlatforms[idx],
                likes: (updatedPlatforms[idx].likes || 0) + 1
            };
            setPlatforms(updatedPlatforms);
        }

        // 4. Execute API in background
        (async () => {
            try {
                const finalUserFromBackend = await api.likeTask(user.id, platformId);
                setUser(finalUserFromBackend);
            } catch (e: any) {
                console.error("Background like failed:", e);
                // Rollback on error
                setUser(prevUser);
                setPlatforms(prevPlatforms);
                // alert("Gagal memberikan like. Silakan coba lagi.");
            }
        })();
        // --- OPTIMISTIC UI: END ---
    };

    const handleSubmitProof = async (taskId: string, imgUrl: string) => {
        if (!user) return;
        try {
            await api.submitTaskProof(user.id, taskId, imgUrl);
            const updatedUser = await api.getUser(user.id);
            if (updatedUser) setUser(updatedUser);
            // alert("Proof submitted successfully!");
        } catch (e: any) {
            alert("Failed to submit proof: " + e.message);
        }
    };


    // For Admin - In this MVP we just pass empty lists or fetch specifically
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    // --- REALTIME SUBSCRIPTION (User Specific) ---
    const userRealtimeConfig = React.useMemo(() => [
        {
            channelName: `user-tasks-${user?.id}`,
            table: 'user_tasks',
            event: '*' as const,
            filter: `user_id=eq.${user?.id}`
        },
        {
            channelName: `user-messages-${user?.id}`,
            table: 'messages',
            event: '*' as const,
            filter: `user_id=eq.${user?.id}`
        },
        {
            channelName: `user-transactions-${user?.id}`,
            table: 'transactions',
            event: '*' as const,
            filter: `user_id=eq.${user?.id}`
        }
    ], [user?.id]);

    useSupabaseRealtime(userRealtimeConfig, async (payload) => {
        console.log('User Realtime Update:', payload);

        if (!user?.id) return;

        // Fetch updated user data to ensure local state consistency
        const updatedUser = await api.getUser(user.id);
        if (!updatedUser) return;

        // Logic for Task Audit Results
        if (payload.table === 'user_tasks' && payload.event === 'UPDATE') {
            const oldTask = user.myTasks?.find(t => t.id === payload.new.id);
            if (oldTask?.status !== 'completed' && payload.new.status === 'completed') {
                alert("Selamat! Hadiah tugas Anda telah masuk ke saldo.");
                setHasUnreadMisi(true);

                // --- Meta Pixel: Purchase Event ---
                const userData = {
                    em: updatedUser.email,
                    external_id: updatedUser.id
                };
                // @ts-ignore - User requested specific parameters for tracking
                ReactPixel.track(
                    'Purchase',
                    {
                        value: Number(payload.new.reward_amount),
                        currency: 'IDR',
                        content_ids: [payload.new.id],
                        content_name: payload.new.task_name || 'Task Reward',
                        content_type: 'product',
                        user_data: userData
                    },
                    {
                        eventID: payload.new.id.toString()
                    }
                );
            } else if (oldTask?.status !== 'rejected' && payload.new.status === 'rejected') {
                alert(`Tugas "${payload.new.platform_name}" ditolak. Alasan: ${payload.new.reject_reason || 'Tidak ada alasan'}`);
            }
        }

        // Logic for Transaction Status Updates (e.g. Withdrawal Success)
        if (payload.table === 'transactions' && payload.event === 'UPDATE') {
            const oldTx = user.transactions?.find(tx => tx.id === payload.new.id);
            if (oldTx?.status === 'pending' && payload.new.status === 'success') {
                alert(`Penarikan ${payload.new.amount} berhasil diproses.`);
            } else if (oldTx?.status === 'pending' && payload.new.status === 'failed') {
                alert(`Penarikan ${payload.new.amount} gagal.`);
            }
        }

        // Logic for New Messages
        if (payload.table === 'messages' && payload.event === 'INSERT') {
            alert("Anda menerima pesan baru dari sistem.");
        }

        // Always update user state for balance, transactions, etc.
        setUser(updatedUser);
        checkUnread(updatedUser);
    });

    const setLang = (_l: Language) => { };

    return (
        <Router>
            <InstallAppButton />
            <PixelTracker />
            {/* REWARD POPUP OVERLAY */}
            {rewardPopupTx && (
                <RewardPopup tx={rewardPopupTx} onClose={handleCloseRewardPopup} />
            )}

            <Routes>
                {/* Admin Route */}
                <Route path="/admin" element={
                    <AdminApp
                        users={allUsers} tasks={platforms} activities={activities} admins={admins} config={config} lang={lang}
                        updateTaskStatus={async (userId, taskId, status) => {
                            try {
                                await api.auditTask(userId, taskId, status);
                                const res = await api.getAllUsers();
                                setAllUsers(res.users);
                            } catch (e: any) { alert("Audit Failed: " + e.message); }
                        }}
                        updateUserPassword={async (userId, newPass) => {
                            try {
                                await api.resetUserPassword(userId, newPass);
                                alert("Password Reset Success");
                            } catch (e: any) { alert("Reset Failed: " + e.message); }
                        }}
                        sendMessage={async (userId, title, content, amount) => {
                            try {
                                await api.sendMessage(userId, title, content, amount);
                                alert("Message Sent");
                                const res = await api.getAllUsers();
                                setAllUsers(res.users);
                            } catch (e: any) { alert("Send failed: " + e.message); }
                        }}
                        addAdmin={async (username, pass, role) => {
                            try {
                                await api.createAdmin(username, pass, role);
                                alert("Admin Created");
                            } catch (e: any) { alert("Create failed: " + e.message); }
                        }}


                        updateConfig={async (newCfg) => {
                            try {
                                // Optimistic update
                                setConfig(newCfg);
                                await api.updateConfig(newCfg);
                            } catch (e: any) { alert("Config update failed: " + e.message); }
                        }}

                        addTask={async (task) => {
                            try {
                                await api.addTask(task);
                                const data = await api.getInitialData();
                                const sortedPlatforms = (data.platforms || []).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
                                setPlatforms(sortedPlatforms);
                            } catch (e: any) { alert("Add Task Failed: " + e.message); }
                        }}

                        editTask={async (id, updates) => {
                            try {
                                await api.updateTask(id, updates);
                                const data = await api.getInitialData();
                                const sortedPlatforms = (data.platforms || []).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
                                setPlatforms(sortedPlatforms);
                            } catch (e: any) { alert("Update Task Failed: " + e.message); }
                        }}


                        addActivity={async (act) => {
                            try {
                                await api.addActivity(act);
                                const data = await api.getInitialData();
                                const sortedActivities = (data.activities || []).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
                                setActivities(sortedActivities);
                            } catch (e: any) { alert("Add Activity Failed"); }
                        }}

                        manageContent={async (type, id, action) => {
                            try {
                                if (type === 'task') {
                                    if (action === 'delete') {
                                        if (!confirm('Delete task?')) return;
                                        await api.deleteTask(id);
                                    }
                                    else if (action === 'toggle') {
                                        const t = platforms.find(p => p.id === id);
                                        if (t) await api.updateTask(id, { status: t.status === 'online' ? 'offline' : 'online' });
                                    }
                                    else if (action === 'pin') {
                                        const t = platforms.find(p => p.id === id);
                                        if (t) await api.updateTask(id, { isPinned: !t.isPinned });
                                    }
                                    const data = await api.getInitialData();
                                    const sortedPlatforms = (data.platforms || []).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
                                    setPlatforms(sortedPlatforms);
                                }
                                else if (type === 'activity') {
                                    if (action === 'delete') {
                                        if (!confirm('Delete activity?')) return;
                                        await api.deleteActivity(id);
                                    }
                                    else if (action === 'toggle') {
                                        const a = activities.find(x => x.id === id);
                                        if (a) await api.updateActivity(id, { active: !a.active });
                                    }
                                    else if (action === 'popup') {
                                        const a = activities.find(x => x.id === id);
                                        if (a) await api.updateActivity(id, { showPopup: !a.showPopup });
                                    }
                                    const data = await api.getInitialData();
                                    const sortedActivities = (data.activities || []).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
                                    setActivities(sortedActivities);
                                }
                            } catch (e: any) { alert("Action Failed: " + e.message); }
                        }}
                    />

                } />

                {/* Login Route */}
                <Route path="/login" element={
                    !user ? <UserLogin onAuth={handleAuth as any} t={TRANSLATIONS[lang]} lang={lang} customerServiceLink={config.customerServiceLinks['id']} /> : <Navigate to="/" />
                } />

                <Route element={
                    <Layout
                        lang={lang} setLang={setLang} theme={'gold'}
                        telegramLink={config.telegramLinks['id']}
                        customerServiceLink={config.customerServiceLinks['id']}
                        hasUnreadMsg={hasUnreadMsg} hasUnreadTx={hasUnreadTx}
                        hasUnreadMisi={hasUnreadMisi}
                    >
                        <Outlet />
                    </Layout>
                }>

                    {/* Public Routes (Accessible without Login) */}
                    <Route path="/" element={
                        <HomeView
                            platforms={platforms} t={TRANSLATIONS[lang]}
                            setSort={setSort} sort={sort} lang={lang}
                            activities={activities} user={user} config={config}
                            onLikeTask={handleLikeTask}
                            onQuickJoin={handleStartTask}
                        />
                    } />
                    <Route path="/tasks" element={
                        <TasksView
                            platforms={platforms} t={TRANSLATIONS[lang]}
                            setSort={setSort} sort={sort} lang={lang}
                            user={user} config={config}
                            onLikeTask={handleLikeTask}
                            onQuickJoin={handleStartTask}
                        />
                    } />
                    <Route path="/task-detail/:id" element={<TaskDetailView platforms={platforms} onStartTask={handleStartTask} t={TRANSLATIONS[lang]} lang={lang} user={user} />} />
                    <Route path="/activity/:id" element={<ActivityDetailView activities={activities} t={TRANSLATIONS[lang]} />} />

                    {/* Hybrid Route - Profile handles guest state internally */}
                    <Route path="/profile" element={
                        <ProfileView
                            user={user} t={TRANSLATIONS[lang]} logout={handleLogout}
                            lang={lang} onBindCard={handleBindCard} onWithdraw={handleWithdraw}
                            toggleTheme={() => { }} minWithdraw={(() => {
                                const val = config.minWithdrawAmount;
                                return typeof val === 'object' ? (val.id || val.value || 50000) : (Number(val) || 50000);
                            })()}
                            clearUnreadTx={handleClearUnreadTx} config={config}
                            onBindPhone={handleBindPhone}
                        />
                    } />
                    <Route path="/help" element={<StaticPageView title="Bantuan" content={config.helpContent || "Hubungi Admin via Telegram jika ada kendala."} />} />
                    <Route path="/about" element={<StaticPageView title="Tentang Kami" content={config.aboutContent || "RuangGamer adalah platform gaming reward nomor 1 di Indonesia."} />} />

                    {/* Protected Routes (Redirect to Login if null) */}
                    <Route path="/my-tasks" element={user ? <MyTasksView user={user} t={TRANSLATIONS[lang]} onSubmitProof={handleSubmitProof} lang={lang} clearUnreadMisi={handleClearUnreadMisi} config={config} /> : <Navigate to="/login" />} />
                    <Route path="/referral" element={user ? <ReferralView user={user} users={[]} t={TRANSLATIONS[lang]} config={config} lang={lang} /> : <Navigate to="/login" />} />
                    <Route path="/mailbox" element={user ? <MailboxView user={user} t={TRANSLATIONS[lang]} markAllRead={handleMarkAllRead} /> : <Navigate to="/login" />} />
                    <Route path="/transactions" element={user ? <TransactionHistoryView user={user} t={TRANSLATIONS[lang]} /> : <Navigate to="/login" />} />
                </Route>
            </Routes>
        </Router>
    );
};

export default App;
