
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { User, Platform, Activity, Language, SortOption, UserTask, Transaction, Message, SystemConfig, BankAccount } from '../types';
import { TRANSLATIONS, LANGUAGES, BANK_OPTIONS } from '../constants';
import { api } from '../services/api';

import {
    ArrowLeft, ChevronRight, Copy, Upload, Clock, XCircle, User as UserIcon, Users,
    List, CheckCircle, Smartphone, Lock, MessageSquare, LogOut, QrCode,
    CreditCard, Eye, EyeOff, ArrowDown, Sparkles, Plus, ShieldCheck, Wallet, History,
    Share2, Facebook, Twitter, Link as LinkIcon, Send, MessageCircle, Dices, Palette, Mail, Volume2, Heart, HelpCircle, Info, Filter, X, Crown, Pin,
    Image as ImageIcon, ChevronLeft, LogIn, AlertTriangle, Headset, Star, ArrowRight, BarChart2, TrendingUp, PlayCircle, Settings, Download
} from 'lucide-react';
import Layout from './Layout';

// Format using User's Currency, not language setting
const formatMoney = (amount: number, currencySymbol: string) => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

// --- REUSABLE COMPONENTS ---

// Banner Carousel with Auto Scroll & Arrows
const BannerCarousel: React.FC<{ activities: Activity[] }> = ({ activities }) => {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const timeoutRef = useRef<number | null>(null);

    const resetTimeout = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    useEffect(() => {
        resetTimeout();
        if (activities.length > 1) {
            timeoutRef.current = window.setTimeout(() => {
                setCurrentIndex((prevIndex) => (prevIndex === activities.length - 1 ? 0 : prevIndex + 1));
            }, 5000);
        }
        return () => resetTimeout();
    }, [currentIndex, activities.length]);

    const next = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex(curr => (curr === activities.length - 1 ? 0 : curr + 1));
    };

    const prev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex(curr => (curr === 0 ? activities.length - 1 : curr - 1));
    };

    if (activities.length === 0) return null;

    return (
        <div className="relative w-full h-40 rounded-2xl overflow-hidden shadow-lg group border border-slate-700">
            {/* Slides */}
            <div className="w-full h-full relative bg-slate-800" onClick={() => navigate(`/activity/${activities[currentIndex].id}`)}>
                {/* Background blurred layer for aspect ratio gaps */}
                <img
                    src={activities[currentIndex].imageUrl}
                    className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md scale-110"
                    alt=""
                />
                {/* Main image */}
                <img
                    src={activities[currentIndex].imageUrl}
                    className="relative w-full h-full object-contain transition-opacity duration-500 ease-in-out cursor-pointer z-10"
                    alt={activities[currentIndex].title}
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-white font-bold transition-opacity duration-300 z-20" style={{ color: activities[currentIndex].titleColor }}>
                    {activities[currentIndex].title}
                </div>
            </div>

            {/* Arrows */}
            {activities.length > 1 && (
                <>
                    <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full backdrop-blur-sm z-10 transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full backdrop-blur-sm z-10 transition-colors">
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Dots */}
            {activities.length > 1 && (
                <div className="absolute top-2 right-2 flex space-x-1 z-10">
                    {activities.map((_, idx) => (
                        <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-yellow-500 w-4' : 'bg-white/50'}`}></div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Fake Prosperity Stats Board (Req 3)
const PlatformStats: React.FC<{ t: any, currency: string }> = ({ t, currency }) => {
    const [payout, setPayout] = useState(8432190000);
    const [completed, setCompleted] = useState(15420);

    useEffect(() => {
        const interval = setInterval(() => {
            setPayout(prev => prev + Math.floor(Math.random() * 50000) + 10000);
            setCompleted(prev => prev + Math.floor(Math.random() * 3) + 1);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="px-4 py-2">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 border border-yellow-500/20 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5"><TrendingUp size={80} className="text-yellow-500" /></div>
                <div className="flex divide-x divide-slate-700 relative z-10">
                    <div className="flex-1 pr-2 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{t.statsPayout}</p>
                        <p className="text-lg font-black text-yellow-500 font-mono animate-pulse">{currency} {payout.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 pl-2 text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{t.statsCompleted}</p>
                        <p className="text-lg font-black text-white font-mono">{completed.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- NEW PAGES ---

// Reward Popup (Req 4)
export const RewardPopup: React.FC<{ tx: Transaction; onClose: () => void }> = ({ tx, onClose }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-entry">
            <div className="w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-1 relative overflow-hidden border border-yellow-500/50 shadow-2xl">
                {/* Confetti Background */}
                <div className="absolute inset-0 z-0 opacity-30">
                    <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
                    <div className="absolute top-20 right-20 w-3 h-3 bg-red-500 rounded-full animate-ping delay-100"></div>
                    <div className="absolute bottom-10 left-20 w-2 h-2 bg-blue-500 rounded-full animate-ping delay-200"></div>
                </div>

                <div className="bg-slate-900/90 rounded-[20px] p-6 text-center relative z-10">
                    <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500 shadow-lg shadow-yellow-500/30">
                        <Wallet size={40} className="text-yellow-500 drop-shadow-md" />
                    </div>

                    <h2 className="text-2xl font-black text-white mb-1 uppercase italic tracking-wider">Congratulations!</h2>
                    <p className="text-slate-400 text-xs mb-6">You received a new reward</p>

                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">{tx.description}</div>
                        <div className="text-3xl font-black text-yellow-400 font-mono">+{formatMoney(tx.amount, 'Rp')}</div>
                        <div className="text-[10px] text-slate-600 mt-1">{new Date(tx.date).toLocaleString()}</div>
                    </div>

                    <button onClick={onClose} className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-900 font-bold py-3 rounded-xl shadow-lg shadow-amber-900/40 hover:brightness-110 active:scale-95 transition-all uppercase tracking-wide">
                        Mantap Jiwa!
                    </button>
                </div>
            </div>
        </div>
    );
};

export const StaticPageView: React.FC<{ title: string; content: string; }> = ({ title, content }) => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-slate-900">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center gap-3 z-20">
                <button onClick={() => navigate(-1)}><ArrowLeft className="text-slate-400" size={24} /></button>
                <h1 className="font-bold text-lg text-slate-200">{title}</h1>
            </div>
            <div className="p-6 text-slate-400 whitespace-pre-wrap text-sm leading-relaxed">
                {content || "No content available."}
            </div>
        </div>
    );
};

export const TransactionHistoryView: React.FC<{ user: User; t: any }> = ({ user, t }) => {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

    const filtered = (user.transactions || []).filter(tx => {
        if (filter === 'all') return true;
        if (filter === 'income') return tx.amount > 0;
        return tx.amount < 0;
    });

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)}><ArrowLeft className="text-slate-400" size={24} /></button>
                    <h1 className="font-bold text-lg text-slate-200">{t.transactions}</h1>
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    {['all', 'income', 'expense'].map(f => (
                        <button key={f} onClick={() => setFilter(f as any)} className={`px-3 py-1 text-xs rounded-md capitalize ${filter === f ? 'bg-yellow-500 text-slate-900 font-bold' : 'text-slate-400'}`}>{f}</button>
                    ))}
                </div>
            </div>
            <div className="p-4 space-y-3">
                {filtered.map(tx => (
                    <div key={tx.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex justify-between items-center">
                        <div>
                            <div className="font-bold text-slate-200 text-sm">{tx.description}</div>
                            <div className="text-xs text-slate-500 mt-1">{new Date(tx.date).toLocaleString()}</div>
                        </div>
                        <div className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {tx.amount > 0 ? '+' : ''}{formatMoney(tx.amount, user.currency)}
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && <div className="text-center py-10 text-slate-500">No records</div>}
            </div>
        </div>
    );
};

// --- USER LOGIN ---
export const UserLogin: React.FC<{ onAuth: (e: string, pw: string, isReg: boolean, invite?: string) => string | null; t: any; lang: Language; customerServiceLink?: string }> = ({ onAuth, t, lang, customerServiceLink }) => {
    const [isRegister, setIsRegister] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const pendingRef = localStorage.getItem('pending_referral');
        if (pendingRef) {
            setInviteCode(pendingRef);
            // Auto switch to register if ref link is used
            setIsRegister(true);
        }
    }, []);

    const handleAuth = async () => {
        if (!email || !password) return alert("Please fill in email and password");
        if (isRegister && password !== confirmPassword) {
            return alert("Konfirmasi kata sandi tidak cocok!"); // Password confirmation doesn't match
        }

        setIsLoading(true);
        setProgress(10);

        // Start progress simulation
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.floor(Math.random() * 15) + 5;
            });
        }, 200);

        try {
            const error = await onAuth(email, password, isRegister, inviteCode);
            clearInterval(interval);
            setProgress(100);

            if (error) {
                setTimeout(() => {
                    alert(error.replace(password, '***'));
                    setIsLoading(false);
                    setProgress(0);
                }, 300);
            } else {
                // Success - clear pending referral
                localStorage.removeItem('pending_referral');
                // The App will redirect automatically via user state change
            }
        } catch (e) {
            clearInterval(interval);
            setIsLoading(false);
            setProgress(0);
        }
    };

    const handleCS = () => {
        if (customerServiceLink) window.open(customerServiceLink, '_blank');
        else alert("Hubungi CS via Telegram");
    };

    return (
        <div className="min-h-screen bg-slate-900 bg-[linear-gradient(45deg,#0f172a,#1e293b,#0f172a)] animate-gradient-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Customer Service Button */}
            <button
                onClick={handleCS}
                className="absolute top-6 right-6 p-3 rounded-2xl bg-slate-800/80 backdrop-blur border border-yellow-500/20 text-yellow-500 shadow-xl hover:bg-slate-700 transition-all z-20 active:scale-95"
            >
                <Headset size={24} />
            </button>
            {/* PROGRESS MODAL */}
            {isLoading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 animate-fadeIn">
                    <div className="w-full max-w-xs text-center">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-8 mx-auto animate-pulse">
                            <Dices size={48} className="text-white drop-shadow-md" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">{isRegister ? "Creating Account..." : "Logging In..."}</h2>
                        <p className="text-slate-400 text-xs mb-8">Sedang menyiapkan pengalaman gaming Anda</p>

                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-400 to-amber-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-widest">{progress}% Loaded</div>
                    </div>
                </div>
            )}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="w-full max-w-sm backdrop-blur-xl bg-slate-900/60 border border-yellow-500/20 p-8 rounded-3xl shadow-2xl animate-entry relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 animate-float">
                        <Dices size={48} className="text-white drop-shadow-md" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">{t.appName}</h1>
                    <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest opacity-80">Premium Gaming Hub</p>
                </div>

                <div className="space-y-4">
                    {/* Email Input */}
                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 flex items-center space-x-3 focus-within:border-yellow-500/50 focus-within:bg-slate-900/80 transition-all">
                        <Mail className="text-slate-400" size={20} />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} className="bg-transparent text-white w-full focus:outline-none placeholder:text-slate-600" />
                    </div>

                    {/* Password Input */}
                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 flex items-center space-x-3 focus-within:border-yellow-500/50 focus-within:bg-slate-900/80 transition-all">
                        <Lock className="text-slate-400" size={20} />
                        <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t.password} className="bg-transparent text-white w-full focus:outline-none placeholder:text-slate-600" />
                        <button onClick={() => setShowPwd(!showPwd)} className="text-slate-500 hover:text-white transition-colors">{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>

                    {/* Confirm Password (Register Only) */}
                    {isRegister && (
                        <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 flex items-center space-x-3 focus-within:border-yellow-500/50 focus-within:bg-slate-900/80 transition-all animate-fadeIn">
                            <ShieldCheck className="text-slate-400" size={20} />
                            <input type={showPwd ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Konfirmasi Kata Sandi" className="bg-transparent text-white w-full focus:outline-none placeholder:text-slate-600" />
                        </div>
                    )}

                    {isRegister && (
                        <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 flex items-center space-x-3 focus-within:border-yellow-500/50 transition-all">
                            <QrCode className="text-slate-400" size={20} />
                            <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder={`${t.inviteCode} (Opsional)`} className="bg-transparent text-white w-full focus:outline-none placeholder:text-slate-600" />
                        </div>
                    )}
                    <button onClick={handleAuth} className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-amber-900/20 mt-6 hover:brightness-110 active:scale-95 transition-all uppercase tracking-wide">
                        {isRegister ? t.register : t.login}
                    </button>
                </div>

                <div className="flex justify-center text-xs text-slate-400 mt-6 px-1">
                    <span className="mr-2 opacity-70">{isRegister ? "Already have an account?" : "Don't have an account?"}</span>
                    <button onClick={() => setIsRegister(!isRegister)} className="text-yellow-500 hover:text-yellow-400 font-bold hover:underline transition-all">
                        {isRegister ? t.login : t.register}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- HOME VIEW (LUXURY GOLD THEME) ---

export const HomeView: React.FC<any> = ({ platforms, t, setSort, sort, lang, activities, user, config, onLikeTask, onQuickJoin }) => {
    const navigate = useNavigate();

    // Sort logic handled in render
    const sortedPlatforms = [...platforms].sort((a, b) => {
        // Priority 1: isPinned
        if (b.isPinned && !a.isPinned) return 1;
        if (a.isPinned && !b.isPinned) return -1;

        // Priority 2: User selected sort
        if (sort === SortOption.NEWEST) {
            // Newest first based on launchDate
            return new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime();
        }
        if (sort === SortOption.HIGHEST_LIKES) return (b.likes || 0) - (a.likes || 0);
        if (sort === SortOption.HIGHEST_REWARD) return b.rewardAmount - a.rewardAmount;
        if (sort === SortOption.MOST_COMPLETED) {
            const completedA = a.totalQty - a.remainingQty;
            const completedB = b.totalQty - b.remainingQty;
            return completedB - completedA;
        }
        return 0;
    });

    return (
        <div className="pb-20 bg-slate-900 min-h-screen">
            {/* Banner */}
            <div className="p-4 pb-0">
                <BannerCarousel activities={activities} />
            </div>

            {/* Fake Prosperity Stats (Req 3) */}
            <PlatformStats t={t} currency={LANGUAGES[lang].currency} />

            {/* Task List Header (Req 2: Sorting) */}
            <div className="px-4 py-4 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-white/5">
                <h3 className="font-bold text-lg text-white flex items-center gap-2"><Sparkles className="text-yellow-500" size={18} /> {t.hot}</h3>
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button onClick={() => setSort(SortOption.HIGHEST_LIKES)} className={`px-2 py-1 text-[10px] rounded-md ${sort === SortOption.HIGHEST_LIKES ? 'bg-yellow-500 text-slate-900 font-bold' : 'text-slate-400'}`}>{t.sortLikes}</button>
                    <button onClick={() => setSort(SortOption.HIGHEST_REWARD)} className={`px-2 py-1 text-[10px] rounded-md ${sort === SortOption.HIGHEST_REWARD ? 'bg-yellow-500 text-slate-900 font-bold' : 'text-slate-400'}`}>{t.sortReward}</button>
                    <button onClick={() => setSort(SortOption.MOST_COMPLETED)} className={`px-2 py-1 text-[10px] rounded-md ${sort === SortOption.MOST_COMPLETED ? 'bg-yellow-500 text-slate-900 font-bold' : 'text-slate-400'}`}>{t.sortCompleted}</button>
                </div>
            </div>

            {/* Task List - Large Cards (Reduced Height to 80%) */}
            <div className="px-4 space-y-6 mt-2">
                {sortedPlatforms.map((p: Platform) => {
                    const isLiked = (user?.likedTaskIds || []).includes(p.id);
                    // Calculate Claimed Percentage for Progress Bar
                    const claimed = p.totalQty - p.remainingQty;
                    const percent = Math.min(100, Math.max(0, (claimed / p.totalQty) * 100));

                    return (
                        <div key={p.id} onClick={() => navigate(`/task-detail/${p.id}`)} className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group cursor-pointer active:scale-[0.99] transition-transform">
                            {/* Background Image with Overlay - Optimized for any aspect ratio */}
                            <div className="absolute inset-0 bg-slate-800">
                                <img src={p.logoUrl} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
                                <img src={p.logoUrl} className="absolute inset-0 w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

                            {/* Content */}
                            <div className="absolute inset-0 p-4 flex flex-col justify-between">
                                {/* Top Badges */}
                                <div className="flex justify-between items-start">
                                    {p.isPinned ? (
                                        <div className="bg-yellow-500 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-yellow-500/40 uppercase flex items-center gap-1">
                                            <Pin size={10} fill="currentColor" /> TOP
                                        </div>
                                    ) : p.isHot ? (
                                        <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-red-600/40 uppercase">HOT</div>
                                    ) : <div></div>}
                                </div>

                                {/* Bottom Info */}
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-0.5 drop-shadow-md">{p.name}</h3>
                                    <p className="text-xs text-slate-300 line-clamp-1 mb-2 drop-shadow">{p.description}</p>

                                    {/* Progress Bar (Req 3) */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                                            <span>Claimed: {claimed}/{p.totalQty}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden border border-white/10">
                                            <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between">
                                        {/* Price/Reward & Likes */}
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gradient-to-r from-yellow-300 to-amber-500 text-slate-900 font-black px-4 py-1.5 rounded-lg text-xl font-mono shadow-[0_0_15px_rgba(250,204,21,0.5)] border border-yellow-200 italic transform -skew-x-6">
                                                <span className="not-italic inline-block skew-x-6">
                                                    {formatMoney(p.rewardAmount, LANGUAGES[lang].currency)}
                                                </span>
                                            </div>
                                            {/* Like Button (Req 5 - Next to price) */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (user) onLikeTask(p.id); }}
                                                className={`flex items-center gap-1 text-xs font-bold transition-colors ${isLiked ? 'text-red-500' : 'text-slate-300 hover:text-white'}`}
                                                disabled={isLiked}
                                            >
                                                <Heart size={16} className={isLiked ? "fill-red-500" : ""} />
                                                <span>{p.likes}</span>
                                            </button>
                                        </div>

                                        {/* Action Button (Req 1 - Arrow Icon for Details) */}
                                        <button
                                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                                        >
                                            <ArrowRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div >
        </div >
    );
}

export const TasksView: React.FC<any> = (props) => {
    return <HomeView {...props} />;
};

export const TaskDetailView: React.FC<any> = ({ platforms, onStartTask, t, lang, user }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const platform = platforms.find((p: Platform) => p.id === id);

    if (!platform) return <div className="p-10 text-center text-white">Task Not Found</div>;

    return (
        <div className="min-h-screen bg-slate-900 pb-24">
            {/* Header Image/Nav */}
            <div className="relative h-56 bg-slate-800 overflow-hidden">
                <img src={platform.logoUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md scale-110" />
                <img src={platform.logoUrl} className="relative w-full h-full object-contain opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-slate-900/50 backdrop-blur p-2 rounded-full text-white border border-white/10"><ArrowLeft size={20} /></button>
                <div className="absolute -bottom-10 left-6">
                    <img src={platform.logoUrl} className="w-24 h-24 rounded-2xl border-4 border-slate-900 shadow-2xl shadow-black/50 bg-slate-800" />
                </div>
            </div>

            <div className="pt-12 px-6">
                <h1 className="text-2xl font-bold text-white mb-1">{platform.name}</h1>
                <p className="text-slate-400 text-sm mb-4">{platform.description}</p>

                <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-slate-800 p-4 rounded-xl border border-yellow-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10"><Wallet size={40} className="text-yellow-500" /></div>
                        <div className="text-xs text-yellow-500 font-bold uppercase mb-1 tracking-wider">{t.reward}</div>
                        <div className="text-xl font-bold text-white font-mono">{formatMoney(platform.rewardAmount, LANGUAGES[lang].currency)}</div>
                    </div>
                    <div className="flex-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="text-xs text-slate-500 font-bold uppercase mb-1 tracking-wider">{t.remaining}</div>
                        <div className="text-xl font-bold text-slate-200 font-mono">{platform.remainingQty}/{platform.totalQty}</div>
                    </div>
                </div>

                {/* REMOVED PREVIEW IMAGES */}

                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-lg"><List size={20} className="text-yellow-500" /> {t.steps}</h3>
                        {/* Steps as Images (Req 5) */}
                        <div className="grid grid-cols-1 gap-4">
                            {platform.steps.map((step: any, i: number) => (
                                <div key={i} className="relative rounded-xl overflow-hidden group border border-slate-700">
                                    <img src={step.imageUrl || `https://picsum.photos/600/200?random=${i}`} className="w-full h-32 object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-transparent flex items-center p-4">
                                        <div className="w-8 h-8 rounded-full bg-yellow-500 text-slate-900 font-bold flex items-center justify-center mr-4">{i + 1}</div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Step {i + 1}</p>
                                            <p className="text-xs text-slate-300">{typeof step === 'string' ? step : step.text}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Replaced Rules section with Main Sekarang button */}
                    <div className="mt-8 mb-8">
                        <button onClick={() => onStartTask(platform)} className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-amber-900/40 hover:brightness-110 transition-all flex items-center justify-center gap-2 text-lg uppercase tracking-wide">
                            <PlayCircle size={24} /> Ikut Sekarang
                        </button>
                    </div>
                </div>
            </div>

            {/* Removed sticky footer to avoid button duplication */}
        </div>
    );
};

export const ActivityDetailView: React.FC<any> = ({ activities, t }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const activity = activities.find((a: Activity) => a.id === id);

    if (!activity) return <div className="p-10 text-center text-white">Activity Not Found</div>;

    return (
        <div className="min-h-screen bg-slate-900">
            <div className="relative h-64 bg-slate-800 overflow-hidden">
                <img src={activity.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md scale-110" />
                <img src={activity.imageUrl} className="relative w-full h-full object-contain" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-slate-900/50 backdrop-blur p-2 rounded-full text-white border border-white/10"><ArrowLeft size={20} /></button>
            </div>
            <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-4">{activity.title}</h1>
                <div className="prose prose-invert prose-sm text-slate-400">
                    {activity.content}
                </div>
            </div>
        </div>
    );
};

export const MyTasksView: React.FC<any> = ({ user, t, onSubmitProof, lang, clearUnreadMisi, config }) => {
    const navigate = useNavigate();
    const tasks = user.myTasks || [];
    const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
    // 示例图片展开状态 - Persist in localStorage
    const [showExample, setShowExample] = useState(() => {
        try {
            const saved = localStorage.getItem('example_image_expanded');
            return saved !== 'false'; // Default to true if null or anything else
        } catch (e) {
            return true;
        }
    });

    useEffect(() => {
        if (clearUnreadMisi) clearUnreadMisi();
    }, []);

    // File Upload Refs and Logic (Req 1)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    const handleUploadClick = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        setActiveTaskId(taskId);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeTaskId) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert("File size too large (Max 5MB)");
                return;
            }

            try {
                setIsUploading(true);
                // Step 1: Upload to Supabase Storage (Wait for this as it's the prerequisite)
                const publicUrl = await api.uploadProof(file);

                // --- OPTIMISTIC UI: START ---
                // Step 2: Immediately show success and reset UI
                alert("Proof uploaded successfully! Kami akan segera meninjau tugas Anda.");
                setIsUploading(false);
                const currentTaskId = activeTaskId;
                setActiveTaskId(null);
                if (fileInputRef.current) fileInputRef.current.value = '';

                // Step 3: API call to notify backend in background
                (async () => {
                    try {
                        await onSubmitProof(currentTaskId, publicUrl);
                    } catch (error: any) {
                        console.error("Background proof submission failed:", error);
                        // Optional: minimal alert if critical
                    }
                })();
                // --- OPTIMISTIC UI: END ---

            } catch (error: any) {
                alert("Upload failed: " + error.message);
                setIsUploading(false);
            }
        }
    };


    const filtered = tasks.filter((task: UserTask) => {
        if (filter === 'all') return true;
        if (filter === 'completed') return task.status === 'completed';
        return task.status === 'ongoing' || task.status === 'reviewing';
    });

    // 获取示例图片
    const exampleImage = config?.misiExampleImage?.[lang] || config?.misiExampleImage?.['id'];

    return (
        <div className="min-h-screen bg-slate-900 pb-24">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />

            <div className="bg-slate-900 p-4 sticky top-0 z-10 border-b border-slate-800">
                <h1 className="font-bold text-lg text-white mb-4">{t.myTasksTitle}</h1>
                <div className="flex gap-2">
                    {[
                        { key: 'all', label: 'semua' },
                        { key: 'ongoing', label: 'berlangsung' },
                        { key: 'completed', label: 'selesai' }
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key as any)} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize ${filter === f.key ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>{f.label}</button>
                    ))}
                </div>
            </div>

            {/* 示例图片展开/收起按钮 */}
            {exampleImage && (
                <div className="px-4 pt-4">
                    <button
                        onClick={() => {
                            const newState = !showExample;
                            setShowExample(newState);
                            localStorage.setItem('example_image_expanded', String(newState));
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:from-blue-500 hover:to-blue-400 transition-all mb-3"
                    >
                        <ImageIcon size={16} />
                        {showExample ? 'Sembunyikan contoh gambar' : '👇 Wajib Lihat Contoh Sebelum Upload'}
                    </button>

                    {showExample && (
                        <div className="overflow-hidden animate-fadeIn">
                            <img
                                src={exampleImage}
                                alt="Task Example"
                                className="w-full rounded-xl shadow-lg border border-slate-700"
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="p-4 space-y-4">
                {filtered.length === 0 && <div className="text-center py-10 text-slate-500">No tasks found</div>}
                {filtered.map((task: UserTask) => (
                    // Req 7: Click opens Detail
                    <div key={task.id} onClick={() => navigate(`/task-detail/${task.platformId}`)} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg cursor-pointer active:scale-[0.98] transition-transform">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-3">
                                <img src={task.logoUrl} className="w-12 h-12 rounded-lg bg-slate-700 object-contain" />
                                <div>
                                    <h4 className="font-bold text-white">{task.platformName}</h4>
                                    <p className="text-xs text-slate-500">{new Date(task.startTime).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${task.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                task.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                    task.status === 'reviewing' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'
                                }`}>
                                {task.status === 'rejected' ? 'Ditolak' :
                                    task.status === 'reviewing' ? 'ditinjau' :
                                        task.status === 'ongoing' ? 'berlangsung' :
                                            task.status === 'completed' ? 'selesai' : task.status}
                            </span>
                        </div>

                        <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-800 mb-4">
                            <span className="text-xs text-slate-500 font-bold uppercase">{t.reward}</span>
                            <span className="text-yellow-500 font-bold font-mono">{formatMoney(task.rewardAmount, LANGUAGES[lang].currency)}</span>
                        </div>

                        {/* Req 1: Changed to Upload Screenshot button */}
                        {(task.status === 'ongoing' || task.status === 'rejected') && (
                            <button onClick={(e) => handleUploadClick(e, task.id)} className={`w-full ${task.status === 'rejected' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'} text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg ${task.status === 'rejected' ? 'shadow-orange-900/20' : 'shadow-blue-900/20'}`}>
                                <Upload size={16} /> Unggah Gambar (lihat contoh)
                            </button>
                        )}
                        {task.status === 'rejected' && task.rejectReason && (
                            <div className="bg-red-500/10 p-3 rounded-lg text-xs text-red-400 mt-2 border border-red-500/20">
                                <strong>Reason:</strong> {task.rejectReason}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ReferralView: React.FC<any> = ({ user, t, config, lang }) => {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(t.copied);
    };

    // Calculate total commission (Req 2)
    const totalCommission = (user.transactions || [])
        .filter((t: Transaction) => t.type === 'referral_bonus')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const refLink = `${window.location.origin}/#/?ref=${user.referralCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(refLink)}`;

    const handleDownloadQR = () => {
        window.open(qrUrl, '_blank');
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'RuangGamer',
                    text: `Gabung RuangGamer dan dapatkan cuan! Gunakan kode: ${user.referralCode}`,
                    url: refLink,
                });
            } catch (err) {
                console.log('Share failed:', err);
                copyToClipboard(refLink);
            }
        } else {
            copyToClipboard(refLink);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            <div className="p-6 bg-gradient-to-b from-slate-800 to-slate-900">
                <h1 className="text-2xl font-bold mb-2 text-center text-yellow-400">{t.referralRules}</h1>
                <p className="text-center text-slate-400 text-sm mb-8">{t.referralDesc}</p>

                <div className="bg-slate-800/50 backdrop-blur border border-yellow-500/20 rounded-2xl p-6 mb-8 text-center shadow-lg">
                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">{t.inviteCode}</div>
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="text-4xl font-black text-white tracking-widest font-mono">{user.referralCode}</div>
                        <button onClick={() => copyToClipboard(user.referralCode)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10">
                            <Copy size={20} className="text-yellow-500" />
                        </button>
                    </div>

                    {/* QR Code Section */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="bg-white p-2 rounded-xl mb-3 shadow-inner">
                            <img src={qrUrl} alt="Referral QR" className="w-40 h-40" />
                        </div>
                        <button onClick={handleDownloadQR} className="text-[10px] text-yellow-500 hover:text-yellow-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                            <Download size={12} /> simpan
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-slate-900/50 p-2.5 rounded-xl border border-slate-700 font-mono text-[10px] text-slate-500 truncate text-left">
                            {refLink}
                        </div>
                        <button onClick={handleShare} className="bg-yellow-500 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors flex items-center gap-2 whitespace-nowrap shadow-lg shadow-yellow-500/10">
                            <Share2 size={16} /> Bagikan
                        </button>
                    </div>
                </div>

                {/* Req 2: Total Team & Total Commission Stat Card */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 flex justify-between divide-x divide-slate-700">
                    <div className="flex-1 text-center px-2">
                        <div className="text-xs text-slate-400 uppercase mb-1 font-bold">Total Tim</div>
                        <div className="text-xl font-bold text-white">{user.invitedCount} Member</div>
                    </div>
                    <div className="flex-1 text-center px-2">
                        <div className="text-xs text-slate-400 uppercase mb-1 font-bold">Total Komisi</div>
                        <div className="text-xl font-bold text-yellow-500">{formatMoney(totalCommission, 'Rp')}</div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center mb-8">
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <div className="text-2xl font-bold text-yellow-500">20%</div>
                        <div className="text-[10px] text-slate-400">Level 1</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <div className="text-2xl font-bold text-yellow-500">10%</div>
                        <div className="text-[10px] text-slate-400">Level 2</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <div className="text-2xl font-bold text-yellow-500">5%</div>
                        <div className="text-[10px] text-slate-400">Level 3</div>
                    </div>
                </div>

                {/* 3-Tier Tree Diagram */}
                <div className="mb-8">
                    <h3 className="font-bold text-lg text-white mb-4 text-center">Struktur Komisi</h3>
                    <div className="flex flex-col items-center">
                        {/* YOU */}
                        <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-slate-900 font-bold border-4 border-slate-700 z-10">YOU</div>
                        <div className="w-0.5 h-6 bg-slate-600"></div>

                        {/* Level 1 (A) */}
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-slate-700 border-2 border-yellow-500 flex items-center justify-center text-xs font-bold text-white mb-1">A</div>
                            <span className="text-[10px] text-yellow-400 font-bold">Earn 20%</span>
                            <div className="w-0.5 h-6 bg-slate-600"></div>
                        </div>

                        {/* Level 2 (B) */}
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center text-[10px] font-bold text-white mb-1">B</div>
                            <span className="text-[10px] text-slate-400 font-bold">Earn 10%</span>
                            <div className="w-0.5 h-6 bg-slate-600"></div>
                        </div>

                        {/* Level 3 (C) */}
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-[8px] font-bold text-white mb-1">C</div>
                            <span className="text-[10px] text-slate-500 font-bold">Earn 5%</span>
                        </div>
                    </div>

                    {/* Calculation Example */}
                    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 mt-6 text-sm text-slate-300">
                        <p className="font-bold text-white mb-2 flex items-center gap-2"><Info size={16} className="text-blue-400" /> Jika downline Anda menyelesaikan tugas dengan hadiah Rp 100.000:</p>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li><strong>Level 1 (A):</strong> Anda mendapat Rp 20.000</li>
                            <li><strong>Level 2 (B):</strong> Anda mendapat Rp 10.000</li>
                            <li><strong>Level 3 (C):</strong> Anda mendapat Rp 5.000</li>
                            <li><strong>Level 4 (D):</strong> Anda mendapat Rp 0</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const MailboxView: React.FC<any> = ({ user, t, markAllRead }) => {
    const navigate = useNavigate();
    const messages = user.messages || [];

    useEffect(() => {
        markAllRead();
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 pb-20">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center gap-3 z-20">
                <button onClick={() => navigate(-1)}><ArrowLeft className="text-slate-400" size={24} /></button>
                <h1 className="font-bold text-lg text-slate-200">{t.messages}</h1>
            </div>
            <div className="p-4 space-y-3">
                {messages.length === 0 && <div className="text-center py-10 text-slate-500">No messages</div>}
                {messages.map((msg: Message) => (
                    <div key={msg.id} className={`bg-slate-800 p-4 rounded-xl border ${msg.read ? 'border-slate-700' : 'border-yellow-500/50'} shadow-sm`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-bold ${msg.read ? 'text-slate-300' : 'text-white'}`}>{msg.title}</h4>
                            <span className="text-[10px] text-slate-500">{new Date(msg.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">{msg.content}</p>
                        {msg.rewardAmount && (
                            <div className="mt-3 bg-yellow-500/10 p-2 rounded text-yellow-500 text-xs font-bold flex items-center gap-2">
                                <Wallet size={12} /> Reward Attached: {msg.rewardAmount}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ProfileView: React.FC<any> = ({ user, t, logout, lang, onBindCard, onWithdraw, config, onBindPhone, clearUnreadTx }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isBindingPhone, setIsBindingPhone] = useState(false);
    const [isBindingCard, setIsBindingCard] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');

    // Bind Card State
    const [cardType, setCardType] = useState('bank');
    const [bankName, setBankName] = useState('');
    const [accName, setAccName] = useState('');
    const [accNumber, setAccNumber] = useState('');

    // Withdraw State
    const [wdAmount, setWdAmount] = useState('');
    const [selectedAccId, setSelectedAccId] = useState('');
    const [minWithdrawal, setMinWithdrawal] = useState<number>(50000);

    useEffect(() => {
        if (location.state?.openTransactions) {
            navigate('/transactions', { replace: true });
            // Clear unread indicator when navigating to history via notification
            clearUnreadTx();
        }

        // --- Step 1: Fetch Dynamic Config ---
        api.getConfig().then(cfg => {
            if (cfg && cfg.minWithdrawAmount) {
                const val = cfg.minWithdrawAmount;
                // Handle different potential formats: {"id": X}, {"value": X}, or just X
                const valNum = typeof val === 'object'
                    ? (val.id !== undefined ? val.id : (val.value !== undefined ? val.value : 50000))
                    : (Number(val) || 50000);
                setMinWithdrawal(Number(valNum));
            }
        }).catch(err => {
            console.error("Failed to fetch min withdrawal config:", err);
            setMinWithdrawal(50000); // Fallback
        });
    }, [location.state]);

    const handleBindPhoneSubmit = () => {
        if (phoneInput.length < 8) return alert("Invalid phone number");
        onBindPhone(phoneInput);
        setIsBindingPhone(false);
    }

    const handleBindCardSubmit = () => {
        if (!bankName || !accName || !accNumber) return alert("Please fill all fields");
        onBindCard({
            bankName,
            accountName: accName,
            accountNumber: accNumber,
            type: cardType as 'bank' | 'ewallet'
        });
        setIsBindingCard(false);
        setBankName(''); setAccName(''); setAccNumber('');
    }

    const handleWithdrawClick = () => {
        if (!user.phone) {
            alert("Bind Phone Number first!");
            setIsBindingPhone(true);
            return;
        }
        if (!user.bankAccounts || user.bankAccounts.length === 0) {
            alert(`Minimum penarikan adalah ${formatMoney(minWithdrawal, 'Rp')}. Silakan ikat akun bank terlebih dahulu.`);
            setIsBindingCard(true);
            return;
        }
        setIsWithdrawing(true);
        // Default to first account
        if (user.bankAccounts.length > 0) setSelectedAccId(user.bankAccounts[0].id);
    }

    const handleWithdrawSubmit = () => {
        const amount = parseInt(wdAmount);

        // --- Step 2: Front-end Form Validation ---
        if (!amount || amount < minWithdrawal) {
            return alert(`Batas penarikan minimum adalah ${formatMoney(minWithdrawal, 'Rp')}`);
        }
        if (!selectedAccId) return alert("Select an account");
        onWithdraw(amount, selectedAccId);
        setIsWithdrawing(false);
        setWdAmount('');
    }

    if (!user) {
        return <div className="p-10 text-center text-slate-400"><Link to="/login" className="text-yellow-500 underline">Login First</Link></div>;
    }

    // Generate 20 levels if not enough provided
    const userCountryEntry = Object.entries(LANGUAGES).find(([k, v]) => v.currency === user.currency);
    const userCountry = userCountryEntry ? userCountryEntry[0] : 'en';
    let vipTiers = config.vipConfig?.[userCountry] || config.vipConfig?.['en'] || [];

    if (vipTiers.length < 20) {
        const existing = vipTiers.length;
        for (let i = existing + 1; i <= 20; i++) {
            vipTiers.push({ level: i, threshold: i * 500000, reward: i * 20000 });
        }
    }

    // Latest Record (Req 5)
    const latestTx = user.transactions && user.transactions.length > 0
        ? user.transactions[0]
        : null;

    return (
        <div className="min-h-screen bg-slate-900 pb-24 font-sans text-slate-200">
            {/* Header Profile - Dark Slate Style (Req 3) */}
            <div className="bg-slate-900 p-6 pt-10 relative pb-16 border-b border-slate-800/50">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border-2 border-slate-800">
                            <UserIcon size={32} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{user.phone || user.id.substring(0, 8)}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="text-xs text-slate-400 font-mono">ID: {user.id}</div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(user.id);
                                        alert(t.copied || "Copied!");
                                    }}
                                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                                    title="Copy ID"
                                >
                                    <Copy size={12} className="text-yellow-500" />
                                </button>
                            </div>

                            {/* Bind Phone Button (Req 6) - Below ID */}
                            {!user.phone ? (
                                <button onClick={() => setIsBindingPhone(true)} className="mt-2 text-[10px] bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-colors">
                                    <AlertTriangle size={10} /> Bind Phone
                                </button>
                            ) : (
                                <div className="mt-2 text-[10px] bg-green-900/30 text-green-500 px-3 py-1 rounded-full font-bold flex items-center gap-1 w-fit border border-green-500/20">
                                    <ShieldCheck size={10} /> Verified
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* Removed Theme Toggle (Req 7: Invalid/Inconsistent) */}
                        <button onClick={logout} className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors border border-slate-700">
                            <LogOut size={16} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Balance Card - Overlapping */}
                <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-3xl p-0.5 shadow-xl shadow-amber-500/10 relative z-10">
                    <div className="bg-slate-900/90 backdrop-blur-sm rounded-[22px] p-5 relative overflow-hidden">
                        {/* Added pointer-events-none to prevent click blocking */}
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Wallet size={100} className="text-yellow-500" /></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">SALDO (IDR)</span>
                                <div className="text-3xl font-black text-white font-mono flex items-center tracking-tight">
                                    <span className="text-xl mr-1 text-yellow-500">Rp</span> {user.balance.toLocaleString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">TOTAL PENDAPATAN</span>
                                <div className="text-xl font-bold text-white font-mono flex items-center justify-end">
                                    <span className="text-sm mr-1 text-yellow-500">Rp</span> {user.totalEarnings.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 relative z-10">
                            <button onClick={handleWithdrawClick} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20 text-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer">
                                <Wallet size={16} /> Tarik
                            </button>
                            <button onClick={() => setIsBindingCard(true)} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer">
                                <CreditCard size={16} /> Akun Bank
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 px-4">
                {/* My Accounts - Dark Theme */}
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 ml-2 flex items-center gap-2"><CreditCard size={14} /> My Accounts</h3>

                {/* Account List */}
                <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
                    <div onClick={() => setIsBindingCard(true)} className="flex-shrink-0 w-24 h-32 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors group relative z-0 snap-start">
                        <Plus size={32} className="text-slate-600 group-hover:text-slate-500 transition-colors mb-2" />
                        <span className="text-[10px] text-slate-500 font-bold">Add New</span>
                    </div>

                    {(user.bankAccounts || []).map(acc => (
                        <div key={acc.id} className="flex-shrink-0 w-56 h-32 rounded-2xl p-4 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex flex-col justify-between shadow-lg snap-start">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-white text-sm">{acc.bankName}</span>
                                <span className="text-[10px] uppercase bg-slate-700 px-2 py-0.5 rounded text-slate-300">{acc.type}</span>
                            </div>
                            <div>
                                <div className="text-slate-400 text-[10px] uppercase">Nomor Akun</div>
                                <div className="font-mono text-white tracking-wider">{acc.accountNumber}</div>
                            </div>
                            <div className="text-xs text-slate-500 truncate">{acc.accountName}</div>
                        </div>
                    ))}
                </div>

                {/* VIP Scroll View (Req 3: Dark Theme) */}
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 ml-2 flex items-center gap-2"><Crown size={14} className="text-yellow-500" /> VIP LEVELS</h3>
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 px-2 no-scrollbar">
                    {vipTiers.map((tier: any) => {
                        // Fix logic: VIP 1 is ALWAYS unlocked (threshold irrelevant if level 1)
                        const isUnlocked = tier.level === 1 || user.totalEarnings >= tier.threshold;

                        return (
                            <div key={tier.level} className={`relative flex-shrink-0 w-72 h-40 rounded-2xl p-5 snap-center overflow-hidden border transition-all shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 ${isUnlocked ? 'border-yellow-500/30' : 'border-slate-700'}`}>
                                {/* Lock Icon for higher levels - Minimalist (Req 8) */}
                                {!isUnlocked && (
                                    <div className="absolute top-4 right-4 z-10">
                                        <div className="w-8 h-8 rounded-full bg-slate-950/50 backdrop-blur flex items-center justify-center border border-slate-700 shadow-sm">
                                            <Lock size={14} className="text-slate-500" />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-6 relative z-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md border ${isUnlocked ? 'bg-yellow-500 text-slate-900 border-yellow-400' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                                            V{tier.level}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-white">VIP Level {tier.level}</div>
                                            <div className={`text-[10px] ${isUnlocked ? 'text-green-500' : 'text-slate-500'}`}>{isUnlocked ? 'Active Status' : (
                                                <span className="flex items-center gap-1"><Lock size={8} /> Locked Status</span>
                                            )}</div>
                                        </div>
                                    </div>
                                    {isUnlocked && <Crown size={20} className="text-yellow-500 drop-shadow-lg" />}
                                </div>

                                <div className="space-y-2 relative z-0">
                                    <div className="flex justify-between text-xs items-center border-b border-dashed border-slate-700 pb-2">
                                        <span className="text-slate-400">Total Pendapatan</span>
                                        <span className="font-mono font-bold text-slate-200">{formatMoney(tier.threshold, 'Rp')}</span>
                                    </div>
                                    <div className="flex justify-between text-xs items-center pt-1">
                                        <span className="text-slate-400">Upgrade Bonus</span>
                                        <span className={`font-mono font-bold ${isUnlocked ? 'text-yellow-400' : 'text-slate-500'}`}>+{formatMoney(tier.reward, 'Rp')}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Menu List - Dark Style */}
            <div className="px-4 space-y-3">
                <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <History size={18} className="text-slate-400" />
                            <span className="font-bold text-sm text-slate-200">Catatan Terbaru</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                    </div>
                    {/* Real Latest Record (Req 5) */}
                    {latestTx ? (
                        <div className="px-4 py-3 bg-slate-800/50">
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-slate-300 font-medium truncate pr-2">{latestTx.description}</div>
                                <div className={`text-xs font-mono font-bold whitespace-nowrap ${latestTx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {latestTx.amount > 0 ? '+' : ''}{formatMoney(latestTx.amount, 'Rp')}
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">{new Date(latestTx.date).toLocaleString()}</div>
                        </div>
                    ) : (
                        <div className="px-4 py-3 text-xs text-slate-500 text-center italic">No records found</div>
                    )}
                </div>

                <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-sm divide-y divide-slate-700">
                    <button onClick={() => navigate('/transactions')} className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center"><History size={16} className="text-blue-400" /></div>
                            <span className="font-bold text-sm text-slate-200">Riwayat Transaksi</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                    <button onClick={() => navigate('/help')} className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center"><HelpCircle size={16} className="text-green-400" /></div>
                            <span className="font-bold text-sm text-slate-200">Pusat Bantuan</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                    <button onClick={() => navigate('/about')} className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-900/30 flex items-center justify-center"><Info size={16} className="text-orange-400" /></div>
                            <span className="font-bold text-sm text-slate-200">Tentang Kami</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-600" />
                    </button>
                </div>
            </div>

            {/* Bind Phone Modal */}
            {isBindingPhone && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm animate-entry">
                    <div className="bg-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-slate-700">
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                                <Smartphone size={24} className="text-yellow-500" />
                            </div>
                        </div>
                        <h3 className="text-white font-bold mb-1 text-center text-lg">Bind Phone Number</h3>
                        <p className="text-slate-400 text-xs text-center mb-6">mankan akun Anda untuk menarik dana.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                                <input type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="08..." className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-xl mt-1 focus:border-yellow-500 outline-none transition-colors" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsBindingPhone(false)} className="flex-1 bg-slate-700 text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-600 transition-colors">batal</button>
                                <button onClick={handleBindPhoneSubmit} className="flex-1 bg-yellow-500 text-slate-900 py-3 rounded-xl font-bold hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-colors">Bind Now</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bind Card Modal */}
            {isBindingCard && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm animate-entry">
                    <div className="bg-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-slate-700">
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                                <CreditCard size={24} className="text-yellow-500" />
                            </div>
                        </div>
                        <h3 className="text-white font-bold mb-1 text-center text-lg">Bind Bank/E-Wallet</h3>

                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Jenis Akun</label>
                                <div className="flex gap-2 mt-1">
                                    <button onClick={() => setCardType('ewallet')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${cardType === 'ewallet' ? 'bg-yellow-500 text-slate-900 border-yellow-500' : 'bg-slate-900 text-slate-400 border-slate-600'}`}>E-Wallet</button>
                                    <button onClick={() => setCardType('bank')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${cardType === 'bank' ? 'bg-yellow-500 text-slate-900 border-yellow-500' : 'bg-slate-900 text-slate-400 border-slate-600'}`}>Bank Transfer</button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Pilih Penyedia</label>
                                <select value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-xl mt-1 focus:border-yellow-500 outline-none">
                                    <option value="">Pilih...</option>
                                    {(BANK_OPTIONS['id'] || []).filter(b => b.type === cardType).map(b => (
                                        <option key={b.name} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nomor Akun</label>
                                <input type="number" value={accNumber} onChange={e => setAccNumber(e.target.value)} placeholder="08..." className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-xl mt-1 focus:border-yellow-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Akun</label>
                                <input type="text" value={accName} onChange={e => setAccName(e.target.value)} placeholder="Sesuai KTP" className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-xl mt-1 focus:border-yellow-500 outline-none" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsBindingCard(false)} className="flex-1 bg-slate-700 text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-600 transition-colors">batal</button>
                                <button onClick={handleBindCardSubmit} className="flex-1 bg-yellow-500 text-slate-900 py-3 rounded-xl font-bold hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-colors">simpan akun</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {isWithdrawing && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm animate-entry">
                    <div className="bg-slate-800 w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-slate-700">
                        <h3 className="text-white font-bold mb-1 text-center text-lg">Withdraw Funds</h3>
                        <p className="text-slate-400 text-[10px] text-center mb-6">Penarikan Minimum: <span className="text-yellow-500 font-bold">{formatMoney(minWithdrawal, 'Rp')}</span></p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Select Account</label>
                                <select value={selectedAccId} onChange={e => setSelectedAccId(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-xl mt-1 focus:border-yellow-500 outline-none">
                                    {(user.bankAccounts || []).map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Amount (IDR)</label>
                                <div className="relative">
                                    <input type="number" value={wdAmount} onChange={e => setWdAmount(e.target.value)} placeholder={minWithdrawal.toString()} className="w-full bg-slate-900 border border-slate-600 text-white p-3 pl-10 rounded-xl mt-1 focus:border-yellow-500 outline-none font-mono font-bold" />
                                    <span className="absolute left-3 top-4 text-slate-500 font-bold">Rp</span>
                                </div>
                                <div className="flex justify-end mt-1">
                                    <span className="text-[10px] text-slate-500">Balance: {formatMoney(user.balance, 'Rp')}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsWithdrawing(false)} className="flex-1 bg-slate-700 text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-600 transition-colors">batal</button>
                                <button onClick={handleWithdrawSubmit} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 shadow-lg shadow-green-500/20 transition-colors">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
