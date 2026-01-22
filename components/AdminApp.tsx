
import React, { useState, useEffect } from 'react';
import { User, Platform, Activity, Admin, SystemConfig, Language } from '../types';
import { generatePlatformInfo, generatePlatformLogo } from '../services/geminiService';
import { LANGUAGES } from '../constants';
import { api } from '../services/api';
import {
    Shield, CheckCircle, User as UserIcon, List, Image, Key, LogOut, ArrowLeft,
    LayoutDashboard, Sparkles, Wand2, Zap, Lock, Settings, Mail, Send, Trash2, Power, Plus, X, Save, BarChart3, Pin, Ban, Crown, Wallet,
    Eye
} from 'lucide-react';

interface AdminAppProps {
    users: User[];
    tasks: Platform[];
    activities: Activity[];
    admins: Admin[];
    config: SystemConfig;
    updateTaskStatus: (uid: string, tid: string, status: 'completed' | 'rejected') => void;
    updateUserPassword: (uid: string, pass: string) => void;
    updateConfig: (cfg: SystemConfig) => void;
    sendMessage: (uid: string, title: string, content: string, amount?: number) => void;
    addActivity: (act: Activity) => void;
    addTask: (t: Platform) => void;
    editTask: (id: string, updates: Partial<Platform>) => void;
    addAdmin: (a: Admin) => void;

    manageContent: (type: 'task' | 'activity' | 'user', id: string, action: 'delete' | 'toggle' | 'pin' | 'popup' | 'ban') => void;
    lang: any;
}

const COUNTRIES = [
    { value: 'id', label: 'Indonesia' },
];

// --- ADMIN LOGIN ---
const AdminLogin: React.FC<{ onLogin: (u: string, p: string) => void }> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200"><Shield size={32} className="text-white" /></div>
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">RuangGamer Admin</h2>
                <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" /></div>
                    <button onClick={() => onLogin(username, password)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg">Login</button>
                </div>
                <div className="mt-6 text-center"><a href="/#/" className="text-sm text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2"><ArrowLeft size={14} /> Back to Product</a></div>
            </div>
        </div>
    );
};

// --- DASHBOARD CHART ---
const SimpleLineChart: React.FC<{ data: number[], color: string }> = ({ data, color }) => {
    const max = Math.max(...data, 1);
    const points = data.map((val, i) => `${(i / (data.length - 1)) * 100},${100 - (val / max) * 100}`).join(' ');
    return (
        <div className="h-16 w-full relative overflow-hidden">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
            </svg>
        </div>
    );
};

// --- MAIN ADMIN ---
const AdminApp: React.FC<AdminAppProps> = (props) => {

    const [session, setSession] = useState<Admin | null>(null);
    const [view, setView] = useState<'dashboard' | 'audit' | 'withdrawals' | 'users' | 'tasks' | 'activities' | 'admins' | 'config' | 'messages'>('dashboard');
    const [auditTab, setAuditTab] = useState<'queue' | 'history'>('queue');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

    // Local state for admins (fetching from backend)
    const [localAdmins, setLocalAdmins] = useState<Admin[]>([]);
    const [localUsers, setLocalUsers] = useState<User[]>([]);

    // --- FORM STATES ---
    const [actTitle, setActTitle] = useState('');
    const [actTitleColor, setActTitleColor] = useState('#ffffff');
    const [actContent, setActContent] = useState('');
    const [actImage, setActImage] = useState('');
    // Force ID
    const actCountry = 'id';

    const [taskName, setTaskName] = useState('');
    const [taskNameColor, setTaskNameColor] = useState('#ffffff');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskDescColor, setTaskDescColor] = useState('#cbd5e1');
    const [taskReward, setTaskReward] = useState<string>('0');
    const [taskLink, setTaskLink] = useState('');
    const [taskImage, setTaskImage] = useState('');
    // Force ID
    const taskCountry = 'id';
    const [taskTotalQty, setTaskTotalQty] = useState<string>('100');
    const [taskSteps, setTaskSteps] = useState<string[]>(['Download App', 'Register', 'Deposit']);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);


    // Admin Config State
    const vipCountry = 'id';
    const [isGenerating, setIsGenerating] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'editor' });
    const [msgData, setMsgData] = useState({ userId: 'all', title: '', content: '', amount: '0' });
    const [userSort, setUserSort] = useState<'reg' | 'bal' | 'earnings'>('reg');

    useEffect(() => { checkApiKey(); }, []);

    // Fetch initial data and Restore Session
    useEffect(() => {
        const loadInitData = async () => {
            try {
                const [adminsRes, usersRes] = await Promise.all([
                    api.getAdmins().catch(e => ({ admins: [] })),
                    api.getAllUsers().catch(e => ({ users: [] }))
                ]);

                // @ts-ignore
                setLocalAdmins(adminsRes.admins || []);
                setLocalUsers(usersRes.users || []);

                const savedAdminId = localStorage.getItem('ruanggamer_admin_session');
                if (savedAdminId) {
                    const admin = (adminsRes.admins || []).find(a => a.id === savedAdminId);
                    // @ts-ignore
                    if (admin) {
                        setSession(admin);
                        // Restore last view state
                        const savedView = localStorage.getItem('ruanggamer_admin_view');
                        if (savedView) setView(savedView as any);
                    }
                }
            } catch (e) {
                console.error("Failed to load init data", e);
            }
        };
        loadInitData();
    }, []); // Run on mount

    // Save view state when it changes
    useEffect(() => {
        if (session) {
            localStorage.setItem('ruanggamer_admin_view', view);
        }
    }, [view, session]);

    const checkApiKey = async () => {
        // @ts-ignore
        if (window.aistudio && window.aistudio.hasSelectedApiKey && await window.aistudio.hasSelectedApiKey()) setHasApiKey(true);
    };

    const handleConnectAI = async () => {
        // @ts-ignore
        if (window.aistudio) { await window.aistudio.openSelectKey(); setHasApiKey(true); } else { setHasApiKey(true); }
    };

    const handleLogin = async (u: string, p: string) => {
        try {
            const res = await api.adminLogin(u, p);
            if (res.admin) {
                // @ts-ignore
                setSession(res.admin);
                localStorage.setItem('ruanggamer_admin_session', res.admin.id);

                // Refresh admins list after login just in case
                const adminsRes = await api.getAdmins();
                // @ts-ignore
                setLocalAdmins(adminsRes.admins);
            }
        } catch (e: any) {
            alert("Login failed: " + (e.message || "Invalid credentials"));
        }
    };

    const handleLogout = () => {
        setSession(null);
        localStorage.removeItem('ruanggamer_admin_session');
    };

    // --- HELPERS ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 200 * 1024) {
                alert("⚠️ Image too large! Max 200KB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => setter(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // --- ACTIONS ---
    const handleResetUserPassword = async (userId: string) => {
        const newPass = prompt("Enter new password for user:");
        if (newPass) {
            try {
                await api.resetUserPassword(userId, newPass);
                alert("Password updated");
            } catch (e: any) {
                alert("Failed: " + e.message);
            }
        }
    };


    const handleConfigChange = (type: 'init' | 'min', country: string, value: string) => {
        const val = parseInt(value) || 0;
        const newConfig = { ...props.config };
        if (type === 'init') {
            newConfig.initialBalance = { ...newConfig.initialBalance, [country]: val };
        } else {
            newConfig.minWithdrawAmount = { ...newConfig.minWithdrawAmount, [country]: val };
        }
        props.updateConfig(newConfig);
    };

    const handleVipConfigChange = (index: number, field: 'threshold' | 'reward', value: string) => {
        const newConfig = { ...props.config };
        const currentVipConfig = newConfig.vipConfig || {};
        let countryTiers = [...(currentVipConfig[vipCountry] || [])];

        // If empty, initialize with default 20 tiers
        if (countryTiers.length === 0) {
            countryTiers = [
                { level: 1, threshold: 0, reward: 0 },
                { level: 2, threshold: 500000, reward: 20000 },
                { level: 3, threshold: 1000000, reward: 50000 },
                { level: 4, threshold: 2000000, reward: 100000 },
                { level: 5, threshold: 5000000, reward: 250000 },
                { level: 6, threshold: 10000000, reward: 500000 },
                { level: 7, threshold: 20000000, reward: 1000000 },
                { level: 8, threshold: 30000000, reward: 1500000 },
                { level: 9, threshold: 50000000, reward: 2500000 },
                { level: 10, threshold: 100000000, reward: 5000000 },
                { level: 11, threshold: 200000000, reward: 10000000 },
                { level: 12, threshold: 300000000, reward: 15000000 },
                { level: 13, threshold: 500000000, reward: 25000000 },
                { level: 14, threshold: 800000000, reward: 40000000 },
                { level: 15, threshold: 1000000000, reward: 50000000 },
                { level: 16, threshold: 1500000000, reward: 75000000 },
                { level: 17, threshold: 2000000000, reward: 100000000 },
                { level: 18, threshold: 3000000000, reward: 150000000 },
                { level: 19, threshold: 5000000000, reward: 250000000 },
                { level: 20, threshold: 10000000000, reward: 500000000 }
            ];
        }

        // Ensure we have a valid array to update
        if (countryTiers[index]) {
            countryTiers[index] = { ...countryTiers[index], [field]: parseInt(value) || 0 };

            newConfig.vipConfig = {
                ...currentVipConfig,
                [vipCountry]: countryTiers
            };

            props.updateConfig(newConfig);
        }
    };

    const saveConfigManually = () => {
        props.updateConfig(props.config);
        alert("Configuration Saved Successfully!");
    };

    const handleSendMessage = async () => {
        if (!msgData.title || !msgData.content) return alert("Please fill title and content");
        const amount = parseInt(msgData.amount) || 0;
        try {
            await api.sendMessage(msgData.userId, msgData.title, msgData.content, amount);
            alert("Message Sent!");
            setMsgData({ userId: 'all', title: '', content: '', amount: '0' });
        } catch (e: any) {
            alert("Failed: " + e.message);
        }
    };


    const handleEditTask = (task: Platform) => {
        setEditingTaskId(task.id);
        setTaskName(task.name); setTaskNameColor(task.nameColor || '#ffffff');
        setTaskDesc(task.description); setTaskDescColor(task.descColor || '#cbd5e1');
        setTaskReward(task.rewardAmount.toString());
        setTaskLink(task.downloadLink);
        setTaskImage(task.logoUrl);
        setTaskTotalQty(task.totalQty.toString());
        setTaskSteps(task.steps);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetTaskForm = () => {
        setEditingTaskId(null);
        setTaskName(''); setTaskNameColor('#ffffff');
        setTaskDesc(''); setTaskDescColor('#cbd5e1');
        setTaskReward('0'); setTaskLink('');
        setTaskImage(''); setTaskTotalQty('100');
        setTaskSteps(['Download App', 'Register', 'Deposit']);
    };


    const publishTask = () => {
        if (!taskName) return alert("Task Name is required");
        if (!taskLink) return alert("Task Link is required");

        let cleanLink = taskLink.trim();
        if (cleanLink && !cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
            cleanLink = 'https://' + cleanLink;
        }

        if (editingTaskId) {
            props.editTask(editingTaskId, {
                name: taskName,
                nameColor: taskNameColor,
                description: taskDesc || 'No description',
                descColor: taskDescColor,
                logoUrl: taskImage || 'https://via.placeholder.com/100',
                downloadLink: cleanLink,
                rewardAmount: Number(taskReward) || 0,
                totalQty: parseInt(taskTotalQty) || 100,
                steps: [...taskSteps],
            });
            alert("Task Updated Successfully!");
            resetTaskForm();
            return;
        }

        const qty = parseInt(taskTotalQty) || 100;
        const newTask: Platform = {
            id: 't_' + Date.now(),
            name: taskName,
            nameColor: taskNameColor,
            description: taskDesc || 'No description',
            descColor: taskDescColor,
            logoUrl: taskImage || 'https://via.placeholder.com/100',
            downloadLink: cleanLink,

            rewardAmount: Number(taskReward) || 0,
            firstDepositAmount: 0,
            launchDate: new Date().toISOString(),
            remainingQty: qty,
            totalQty: qty,
            likes: Math.floor(Math.random() * 50),
            steps: [...taskSteps],
            rules: '',
            status: 'online',
            type: 'deposit',
            targetCountries: ['id']
        };
        props.addTask(newTask);
        resetTaskForm();
        alert("Task Published Successfully!");
    };


    const publishActivity = () => {
        if (!actTitle) return alert("Title is required");
        const newAct: Activity = {
            id: 'a_' + Date.now(),
            title: actTitle,
            titleColor: actTitleColor,
            content: actContent,
            imageUrl: actImage || 'https://via.placeholder.com/400x200',
            link: '#',
            active: true,
            showPopup: false,
            targetCountries: ['id']
        };
        props.addActivity(newAct);
        setActTitle(''); setActTitleColor('#ffffff'); setActContent(''); setActImage('');
        alert("Activity Published!");
    };

    const aiFillTask = async () => {
        if (!taskName) return alert("Enter a Task Name first");
        setIsGenerating(true);
        try {
            const info = await generatePlatformInfo(taskName);
            setTaskName(info.name);
            setTaskDesc(info.description);
        } finally { setIsGenerating(false); }
    };

    const aiLogoTask = async () => {
        if (!taskName) return alert("Enter a Task Name first");
        setIsGenerating(true);
        try {
            const logo = await generatePlatformLogo(`${taskName} ${taskDesc}`);
            setTaskImage(logo);
        } finally { setIsGenerating(false); }
    };

    if (!session) return <AdminLogin onLogin={handleLogin} />;

    const users = localUsers;

    const auditTasks = users.flatMap(u => (u.myTasks || []).filter(t => t.status === 'reviewing'));
    const auditHistory = users.flatMap(u => (u.myTasks || []).filter(t => t.status === 'completed' || t.status === 'rejected'))
        .sort((a, b) => new Date(b.submissionTime || b.startTime).getTime() - new Date(a.submissionTime || a.startTime).getTime());

    const withdrawals = users.flatMap(u => (u.transactions || [])
        .filter(tx => tx.type === 'withdraw')
        .map(tx => ({ ...tx, user: u }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const sortedUsers = [...users].sort((a, b) => {
        if (userSort === 'bal') return b.balance - a.balance;
        if (userSort === 'earnings') return b.totalEarnings - a.totalEarnings;
        return new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
    });

    const totalUsers = users.length;
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Math.abs(w.amount), 0);
    const totalCommissions = users.flatMap(u => u.transactions).filter(t => t.type === 'referral_bonus').reduce((sum, t) => sum + t.amount, 0);

    const chartData = [12, 19, 3, 5, 2, 3, totalUsers];
    const payoutData = [500, 1000, 750, 200, 1500, 300, totalWithdrawals / 1000];

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">

            {/* IMAGE MODAL */}
            {imageModalUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-10 animate-entry" onClick={() => setImageModalUrl(null)}>
                    <img src={imageModalUrl} className="max-w-full max-h-full rounded-lg shadow-2xl" />
                    <button className="absolute top-5 right-5 text-white bg-slate-800 p-2 rounded-full"><X size={24} /></button>
                </div>
            )}

            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full shadow-2xl z-10">
                <div className="p-6 border-b border-slate-800"><h1 className="text-xl font-bold flex items-center gap-2 text-white"><Shield className="text-yellow-400" /><span>RuangGamer</span></h1></div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <button onClick={() => setView('dashboard')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${view === 'dashboard' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={18} /> <span>Dashboard</span></button>
                    <button onClick={() => setView('audit')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${view === 'audit' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><CheckCircle size={18} /> <span>Audit Queue</span>{auditTasks.length > 0 && <span className="ml-auto bg-red-500 text-[10px] px-2 rounded-full">{auditTasks.length}</span>}</button>
                    <button onClick={() => setView('withdrawals')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${view === 'withdrawals' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><Wallet size={18} /> <span>Withdrawals</span></button>
                    <button onClick={() => setView('users')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${view === 'users' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><UserIcon size={18} /> <span>Users</span></button>
                    <button onClick={() => setView('tasks')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${view === 'tasks' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><List size={18} /> <span>Tasks</span></button>
                    <button onClick={() => setView('activities')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${view === 'activities' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><Image size={18} /> <span>Activities</span></button>
                    <button onClick={() => setView('messages')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${view === 'messages' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><Mail size={18} /> <span>Messages</span></button>
                    <button onClick={() => setView('config')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${view === 'config' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><Settings size={18} /> <span>Config</span></button>
                    {session.role === 'super_admin' && (
                        <button onClick={() => setView('admins')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${view === 'admins' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><Key size={18} /> <span>Admins</span></button>
                    )}
                </nav>
                <div className="p-4 border-t border-slate-800">
                    {!hasApiKey && <button onClick={handleConnectAI} className="w-full bg-slate-800 text-yellow-400 text-xs py-2 rounded border border-slate-700 mb-2"><Zap size={12} className="inline mr-1" /> Connect AI</button>}
                    <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-full px-4 py-2 hover:bg-slate-800 rounded-lg"><LogOut size={16} /> Logout</button>
                </div>
            </aside>

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold text-slate-800 capitalize">{view} Management</h2><div className="text-right"><p className="text-sm font-bold text-slate-800">{session.username}</p><p className="text-xs text-slate-500 uppercase">{session.role}</p></div></header>

                {view === 'dashboard' && (
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Total Players</h3>
                            <p className="text-3xl font-bold text-indigo-600">{totalUsers}</p>
                            <div className="mt-4"><SimpleLineChart data={chartData} color="#4f46e5" /></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Total Withdraw (IDR)</h3>
                            <p className="text-3xl font-bold text-green-600">Rp {totalWithdrawals.toLocaleString()}</p>
                            <div className="mt-4"><SimpleLineChart data={payoutData} color="#16a34a" /></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Commission Paid</h3>
                            <p className="text-3xl font-bold text-orange-500">Rp {totalCommissions.toLocaleString()}</p>
                            <div className="mt-4 h-16 flex items-end gap-1">
                                {[40, 60, 30, 80, 50, 90, 70].map((h, i) => <div key={i} className="flex-1 bg-orange-200 rounded-t" style={{ height: `${h}%` }}></div>)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Simplified Config View for Single Country */}
                {view === 'config' && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">System Configuration (Indonesia)</h3>
                            <button onClick={saveConfigManually} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition-transform flex items-center gap-2"><Save size={16} /> Save Settings</button>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-indigo-800 flex items-center gap-2"><BarChart3 size={16} /> Fake Prosperity Level (Hype)</label><span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-1 rounded">{props.config.hypeLevel || 1} / 10</span></div>
                                <input type="range" min="1" max="10" value={props.config.hypeLevel || 1} onChange={e => props.updateConfig({ ...props.config, hypeLevel: parseInt(e.target.value) })} className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer" />
                            </div>

                            {/* VIP Config Section */}
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-bold text-yellow-800 flex items-center gap-2"><Crown size={16} /> VIP Level Configuration</h4>
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                    {(() => {
                                        // Get existing VIP config or generate default 20 tiers
                                        const vipTiers = props.config.vipConfig?.['id'] && props.config.vipConfig['id'].length > 0
                                            ? props.config.vipConfig['id']
                                            : [
                                                { level: 1, threshold: 0, reward: 0 },
                                                { level: 2, threshold: 500000, reward: 20000 },
                                                { level: 3, threshold: 1000000, reward: 50000 },
                                                { level: 4, threshold: 2000000, reward: 100000 },
                                                { level: 5, threshold: 5000000, reward: 250000 },
                                                { level: 6, threshold: 10000000, reward: 500000 },
                                                { level: 7, threshold: 20000000, reward: 1000000 },
                                                { level: 8, threshold: 30000000, reward: 1500000 },
                                                { level: 9, threshold: 50000000, reward: 2500000 },
                                                { level: 10, threshold: 100000000, reward: 5000000 },
                                                { level: 11, threshold: 200000000, reward: 10000000 },
                                                { level: 12, threshold: 300000000, reward: 15000000 },
                                                { level: 13, threshold: 500000000, reward: 25000000 },
                                                { level: 14, threshold: 800000000, reward: 40000000 },
                                                { level: 15, threshold: 1000000000, reward: 50000000 },
                                                { level: 16, threshold: 1500000000, reward: 75000000 },
                                                { level: 17, threshold: 2000000000, reward: 100000000 },
                                                { level: 18, threshold: 3000000000, reward: 150000000 },
                                                { level: 19, threshold: 5000000000, reward: 250000000 },
                                                { level: 20, threshold: 10000000000, reward: 500000000 }
                                            ];

                                        return vipTiers.map((vip, idx) => (
                                            <div key={vip.level} className="flex items-center gap-3 text-xs">
                                                <span className="font-bold w-12 text-yellow-700">LV {vip.level}</span>
                                                <div className="flex-1 flex items-center gap-2">
                                                    <span>Threshold:</span>
                                                    <input type="number" value={vip.threshold} onChange={e => handleVipConfigChange(idx, 'threshold', e.target.value)} className="w-20 border rounded p-1" />
                                                </div>
                                                <div className="flex-1 flex items-center gap-2">
                                                    <span>Reward:</span>
                                                    <input type="number" value={vip.reward} onChange={e => handleVipConfigChange(idx, 'reward', e.target.value)} className="w-20 border rounded p-1" />
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">New User Bonus (IDR)</label><div className="flex items-center mb-1"><input type="number" value={props.config.initialBalance['id'] || 0} onChange={e => handleConfigChange('init', 'id', e.target.value)} className="flex-1 border p-1 rounded text-sm" /></div></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Min Withdrawal (IDR)</label><div className="flex items-center mb-1"><input type="number" value={props.config.minWithdrawAmount['id'] || 0} onChange={e => handleConfigChange('min', 'id', e.target.value)} className="flex-1 border p-1 rounded text-sm" /></div></div>
                            </div>
                            <div><h4 className="text-sm font-bold mb-2">Telegram Channel</h4><input type="text" value={props.config.telegramLinks['id'] || ''} onChange={e => props.updateConfig({ ...props.config, telegramLinks: { ...props.config.telegramLinks, ['id']: e.target.value } })} className="w-full border p-2 rounded" placeholder="https://t.me/ruanggamer_id" /></div>
                            <div><h4 className="text-sm font-bold mb-2">Customer Service Link</h4><input type="text" value={props.config.customerServiceLinks['id'] || ''} onChange={e => props.updateConfig({ ...props.config, customerServiceLinks: { ...props.config.customerServiceLinks, ['id']: e.target.value } })} className="w-full border p-2 rounded" placeholder="https://t.me/ruanggamer_cs" /></div>
                        </div>
                    </div>
                )}

                {/* Other views remain mostly similar, just contextually updated */}
                {view === 'audit' && (
                    <div className="space-y-4">
                        <div className="flex gap-4 border-b border-slate-200">
                            <button onClick={() => setAuditTab('queue')} className={`px-4 py-2 font-bold text-sm ${auditTab === 'queue' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
                                Queue ({auditTasks.length})
                            </button>
                            <button onClick={() => setAuditTab('history')} className={`px-4 py-2 font-bold text-sm ${auditTab === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
                                History ({auditHistory.length})
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr><th className="p-4">User</th><th className="p-4">Task</th><th className="p-4">Proof</th><th className="p-4">Status / Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {auditTab === 'queue' ? (
                                        <>
                                            {auditTasks.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-400">All caught up!</td></tr>}
                                            {auditTasks.map(task => {
                                                const user = users.find(u => (u.myTasks || []).some(t => t.id === task.id));
                                                return (
                                                    <tr key={task.id}>
                                                        <td className="p-4"><div className="font-bold">{user?.phone}</div><div className="text-xs text-slate-400">ID: {user?.id}</div></td>
                                                        <td className="p-4"><div className="font-bold text-indigo-600">{task.platformName}</div><div className="text-xs">Reward: {task.rewardAmount}</div></td>
                                                        <td className="p-4">
                                                            {task.proofImageUrl ? (
                                                                <button onClick={() => setImageModalUrl(task.proofImageUrl!)} className="flex items-center gap-1 text-indigo-600 text-sm font-bold bg-indigo-50 px-3 py-1 rounded hover:bg-indigo-100">
                                                                    <Eye size={14} /> View
                                                                </button>
                                                            ) : 'No Image'}
                                                        </td>
                                                        <td className="p-4 flex gap-2">
                                                            <button onClick={async () => {
                                                                if (user) {
                                                                    await api.auditTask(user.id, task.id, 'completed');
                                                                    const res = await api.getAllUsers();
                                                                    setLocalUsers(res.users);
                                                                }
                                                            }} className="bg-green-100 text-green-700 px-3 py-1 rounded font-bold hover:bg-green-200">Approve</button>
                                                            <button onClick={async () => {
                                                                if (user) {
                                                                    await api.auditTask(user.id, task.id, 'rejected');
                                                                    const res = await api.getAllUsers();
                                                                    setLocalUsers(res.users);
                                                                }
                                                            }} className="bg-red-100 text-red-700 px-3 py-1 rounded font-bold hover:bg-red-200">Reject</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        <>
                                            {auditHistory.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-400">No history yet.</td></tr>}
                                            {auditHistory.map(task => {
                                                const user = users.find(u => (u.myTasks || []).some(t => t.id === task.id));
                                                return (
                                                    <tr key={task.id} className="opacity-75 grayscale hover:grayscale-0 hover:opacity-100">
                                                        <td className="p-4"><div className="font-bold">{user?.phone}</div><div className="text-xs text-slate-400">ID: {user?.id}</div></td>
                                                        <td className="p-4"><div className="font-bold">{task.platformName}</div><div className="text-xs">Reward: {task.rewardAmount}</div></td>
                                                        <td className="p-4">
                                                            {task.proofImageUrl ? (
                                                                <button onClick={() => setImageModalUrl(task.proofImageUrl!)} className="flex items-center gap-1 text-indigo-600 text-xs bg-indigo-50 px-2 py-1 rounded">
                                                                    <Eye size={12} /> View
                                                                </button>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {task.status}
                                                            </span>
                                                            <div className="text-[10px] text-slate-400 mt-1">{task.submissionTime ? new Date(task.submissionTime).toLocaleString() : ''}</div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'withdrawals' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4">Date</th><th className="p-4">User</th><th className="p-4">Amount</th><th className="p-4">Bank/Wallet</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {withdrawals.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400">No withdrawals found.</td></tr>}
                                {withdrawals.map(tx => (
                                    <tr key={tx.id}>
                                        <td className="p-4 text-xs text-slate-500">{new Date(tx.date).toLocaleString()}</td>
                                        <td className="p-4"><div className="font-bold">{tx.user.phone}</div><div className="text-xs text-slate-400">ID: {tx.user.id}</div></td>
                                        <td className="p-4 font-mono font-bold text-red-600">{Math.abs(tx.amount)}</td>
                                        <td className="p-4 text-sm">{tx.description}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${tx.status === 'success' ? 'bg-green-100 text-green-700' : tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{tx.status}</span></td>
                                        <td className="p-4 flex gap-2">
                                            {tx.status === 'pending' && (
                                                <>
                                                    <button onClick={async () => {
                                                        if (confirm('Approve withdrawal?')) {
                                                            await api.auditWithdrawal(tx.id, 'success');
                                                            // Refresh users to get latest transactions
                                                            const res = await api.getAllUsers();
                                                            setLocalUsers(res.users);
                                                        }
                                                    }} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">Approve</button>
                                                    <button onClick={async () => {
                                                        if (confirm('Reject withdrawal?')) {
                                                            await api.auditWithdrawal(tx.id, 'failed');
                                                            // Refresh users
                                                            const res = await api.getAllUsers();
                                                            setLocalUsers(res.users);
                                                        }
                                                    }} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200">Reject</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                )}

                {view === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex gap-4">
                            <span className="text-xs font-bold uppercase py-2">Sort by:</span>
                            <button onClick={() => setUserSort('reg')} className={`text-xs px-3 py-1 rounded ${userSort === 'reg' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100'}`}>Registration</button>
                            <button onClick={() => setUserSort('bal')} className={`text-xs px-3 py-1 rounded ${userSort === 'bal' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100'}`}>Balance</button>
                            <button onClick={() => setUserSort('earnings')} className={`text-xs px-3 py-1 rounded ${userSort === 'earnings' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100'}`}>Total Earnings</button>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr><th className="p-4">User</th><th className="p-4">Balance</th><th className="p-4">Bank Info</th><th className="p-4">Joined</th><th className="p-4">Total Earned</th><th className="p-4">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedUsers.map(u => (
                                    <tr key={u.id} className={`hover:bg-slate-50 ${u.isBanned ? 'bg-red-50' : ''}`}>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{u.phone}</div>
                                            <div className="text-[10px] text-slate-400">ID: {u.id} | Pwd: {u.password}</div>
                                            {u.isBanned && <span className="text-[10px] text-red-600 font-bold uppercase">BANNED</span>}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-green-600">{u.currency} {u.balance}</td>
                                        <td className="p-4 text-xs max-w-xs break-words">
                                            {(u.bankAccounts || []).map((b, i) => (
                                                <div key={i} className="mb-1 p-1 bg-slate-100 rounded border border-slate-200">
                                                    <div className="font-bold">{b.bankName}</div>
                                                    <div>{b.accountNumber} ({b.accountName})</div>
                                                </div>
                                            ))}
                                            {(!u.bankAccounts || u.bankAccounts.length === 0) && <span className="text-slate-400">-</span>}
                                        </td>
                                        <td className="p-4 text-xs text-slate-500">{u.registrationDate ? new Date(u.registrationDate).toLocaleDateString() + ' ' + new Date(u.registrationDate).toLocaleTimeString() : '-'}</td>
                                        <td className="p-4 font-mono font-bold text-indigo-600">{u.currency} {u.totalEarnings}</td>
                                        <td className="p-4 flex gap-2">

                                            <button onClick={() => handleResetUserPassword(u.id)} className="text-xs border border-slate-300 px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1"><Lock size={10} /> Reset</button>
                                            <button onClick={async () => {
                                                try {
                                                    await api.banUser(u.id, !u.isBanned);
                                                    // Refresh
                                                    const res = await api.getAllUsers();
                                                    setLocalUsers(res.users);
                                                } catch (e: any) { alert("Action failed: " + e.message); }
                                            }} className={`text-xs border px-2 py-1 rounded flex items-center gap-1 ${u.isBanned ? 'border-green-300 bg-green-50 text-green-600' : 'border-red-300 bg-red-50 text-red-600'}`}>
                                                <Ban size={10} /> {u.isBanned ? 'Unban' : 'Ban'}
                                            </button>

                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {view === 'tasks' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg text-slate-800">{editingTaskId ? 'Edit Task' : 'Create New Task'}</h3>
                                <button onClick={resetTaskForm} className="text-xs text-slate-500 hover:text-indigo-600 underline">Reset Form</button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1"><div className="flex justify-between"><label className="text-xs font-bold uppercase text-slate-500">Platform Name</label><button onClick={aiFillTask} disabled={isGenerating} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 rounded flex items-center gap-1 hover:bg-indigo-100"><Sparkles size={10} /> AI Fill</button></div><input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. RoyalWin88" />
                                        <div className="mt-1 flex items-center gap-2"><label className="text-[10px]">Text Color:</label><input type="color" value={taskNameColor} onChange={e => setTaskNameColor(e.target.value)} /></div></div>
                                    <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500">Description</label><input type="text" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg focus:outline-none" placeholder="Short marketing text" />
                                        <div className="mt-1 flex items-center gap-2"><label className="text-[10px]">Text Color:</label><input type="color" value={taskDescColor} onChange={e => setTaskDescColor(e.target.value)} /></div></div>
                                    <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500">Reward Amount (IDR)</label><div className="flex items-center"><span className="bg-slate-100 border border-slate-300 border-r-0 p-2.5 rounded-l-lg text-slate-500 text-sm">Rp</span><input type="number" value={taskReward} onChange={e => setTaskReward(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-r-lg focus:outline-none font-mono font-bold" placeholder="50000" /></div></div>
                                    <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500">Task Link (URL)</label><input type="text" value={taskLink} onChange={e => setTaskLink(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg focus:outline-none" placeholder="https://..." /></div>
                                    <div className="space-y-1"><label className="text-xs font-bold uppercase text-slate-500">Logo</label><div className="flex gap-2 items-center">{taskImage ? <img src={taskImage} className="w-12 h-12 rounded-lg border" /> : <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300"><Image size={20} /></div>}<div className="flex-1"><input type="file" onChange={e => handleImageUpload(e, setTaskImage)} className="text-xs w-full" /><p className="text-[10px] text-indigo-500 font-bold mt-1">Recommended: 100x100, Max 200KB</p></div><button onClick={aiLogoTask} disabled={isGenerating} className="text-xs bg-slate-800 text-white px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-slate-700 whitespace-nowrap"><Wand2 size={12} /> AI Gen</button></div></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2"><label className="text-xs font-bold uppercase text-slate-500">Total Quantity (Limit)</label><input type="number" value={taskTotalQty} onChange={e => setTaskTotalQty(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg focus:outline-none font-mono" placeholder="100" /></div>
                                    <div className="space-y-2"><label className="text-xs font-bold uppercase text-slate-500">Task Steps</label><div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 max-h-48 overflow-y-auto">{taskSteps.map((step, idx) => (<div key={idx} className="flex gap-2"><span className="bg-white border w-6 h-8 flex items-center justify-center rounded text-xs font-bold text-slate-400">{idx + 1}</span><input value={step} onChange={e => { const newSteps = [...taskSteps]; newSteps[idx] = e.target.value; setTaskSteps(newSteps); }} className="flex-1 border p-1 rounded px-2 text-sm focus:outline-none focus:border-indigo-400" /><button onClick={() => setTaskSteps(taskSteps.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500"><X size={16} /></button></div>))}<button onClick={() => setTaskSteps([...taskSteps, 'New Step'])} className="w-full py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded flex items-center justify-center gap-1"><Plus size={12} /> Add Step</button></div></div>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end"><button onClick={publishTask} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-transform hover:-translate-y-1 active:scale-95"><Save size={18} /> {editingTaskId ? 'Update Task' : 'Publish Task'}</button></div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {(props.tasks || []).map(t => (
                                <div key={t.id} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <img src={t.logoUrl || ''} className="w-12 h-12 rounded-lg bg-slate-100 object-cover" />
                                        <div>
                                            <div className="flex items-center gap-2"><h3 className="font-bold text-slate-800" style={{ color: t.nameColor }}>{t.name}</h3>{t.isPinned && <span className="bg-red-100 text-red-600 text-[10px] px-1 rounded font-bold">TOP</span>}</div>
                                            <div className="flex gap-2 mt-1"><span className="bg-slate-100 text-[10px] px-1.5 py-0.5 rounded text-slate-500">Qty: {t.totalQty}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{t.rewardAmount}</span>
                                        <div className="h-6 w-px bg-slate-200"></div>
                                        <button onClick={() => props.manageContent('task', t.id, 'pin')} className={`p-2 rounded-lg ${t.isPinned ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-100'}`}><Pin size={18} /></button>
                                        <button onClick={() => handleEditTask(t)} className="p-2 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100"><Settings size={18} /></button>
                                        <button onClick={() => props.manageContent('task', t.id, 'toggle')} className={`p-2 rounded-lg ${t.status === 'online' ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-100'}`}><Power size={18} /></button>
                                        <button onClick={() => props.manageContent('task', t.id, 'delete')} className="p-2 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>

                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'activities' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100">
                            <h3 className="font-bold text-lg text-slate-800 mb-6">Publish Activity</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div><label className="text-xs font-bold uppercase text-slate-500">Title</label><input value={actTitle} onChange={e => setActTitle(e.target.value)} className="w-full border p-2 rounded-lg mt-1" />
                                        <div className="mt-1 flex items-center gap-2"><label className="text-[10px]">Text Color:</label><input type="color" value={actTitleColor} onChange={e => setActTitleColor(e.target.value)} /></div></div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500">Image</label>
                                        <input type="file" onChange={e => handleImageUpload(e, setActImage)} className="block w-full text-xs mt-1" />
                                        <p className="text-[10px] text-indigo-500 font-bold mt-1">Rec: 400x200, Max 200KB</p>
                                        {actImage && <img src={actImage} className="mt-2 h-32 w-full object-cover rounded-lg border" />}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div><label className="text-xs font-bold uppercase text-slate-500">Content</label><textarea value={actContent} onChange={e => setActContent(e.target.value)} className="w-full border p-2 rounded-lg mt-1 h-32" /></div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end"><button onClick={publishActivity} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><Save size={18} /> Publish Activity</button></div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {(props.activities || []).map(a => (
                                <div key={a.id} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-4"><img src={a.imageUrl || ''} className="w-16 h-10 rounded bg-slate-100 object-cover" /><div><h3 className="font-bold text-slate-800" style={{ color: a.titleColor }}>{a.title}</h3></div></div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => props.manageContent('activity', a.id, 'popup')} className={`p-2 rounded-lg flex items-center gap-1 text-xs font-bold ${a.showPopup ? 'text-purple-600 bg-purple-50' : 'text-slate-400 bg-slate-100'}`}><Image size={14} /> Popup</button>
                                        <button onClick={() => props.manageContent('activity', a.id, 'toggle')} className={`p-2 rounded-lg ${a.active ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-100'}`}><Power size={18} /></button>
                                        <button onClick={() => props.manageContent('activity', a.id, 'delete')} className="p-2 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'messages' && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
                        <h3 className="font-bold mb-4">Send System Message & Money</h3>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Recipient (User ID or 'all')</label><input type="text" value={msgData.userId} onChange={e => setMsgData({ ...msgData, userId: e.target.value })} className="w-full border p-2 rounded" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label><input type="text" value={msgData.title} onChange={e => setMsgData({ ...msgData, title: e.target.value })} className="w-full border p-2 rounded" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Content</label><textarea value={msgData.content} onChange={e => setMsgData({ ...msgData, content: e.target.value })} className="w-full border p-2 rounded h-24" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gift Amount (Optional)</label><input type="number" value={msgData.amount} onChange={e => setMsgData({ ...msgData, amount: e.target.value })} className="w-full border p-2 rounded" /></div>
                            <button onClick={handleSendMessage} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700"><Send size={16} /> Send Message</button>
                        </div>
                    </div>
                )}

                {view === 'admins' && (
                    <div className="space-y-6">
                        {session.role === 'super_admin' ? (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-lg">
                                <h3 className="font-bold mb-4">Create Admin</h3>
                                <div className="space-y-4 mb-4">
                                    <input type="text" placeholder="Username" value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} className="w-full border p-2 rounded" />
                                    <input type="password" placeholder="Password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} className="w-full border p-2 rounded" />
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Role</label>
                                        <select value={newAdmin.role} onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value })} className="w-full border p-2 rounded text-sm bg-white">
                                            <option value="editor">Editor (Admin Sub-account)</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={async () => {
                                    try {
                                        await api.createAdmin(newAdmin.username, newAdmin.password, newAdmin.role as any);
                                        alert('Admin created');
                                        setNewAdmin({ username: '', password: '', role: 'editor' });
                                        // Refresh list
                                        const res = await api.getAdmins();
                                        setLocalAdmins(res.admins);
                                    } catch (e: any) {
                                        alert("Failed: " + e.message);
                                    }
                                }} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold">Create</button>
                            </div>
                        ) : <div className="p-4 bg-yellow-50 text-yellow-800">Editor access only.</div>}
                        <div className="grid gap-3 max-w-2xl">{localAdmins.map(a => <div key={a.id} className="bg-white p-4 rounded border flex justify-between"><span className="font-bold">{a.username}</span><span className="text-xs uppercase">{a.role}</span></div>)}</div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminApp;
