import React, { useState, useEffect } from 'react';
import { Share, SquarePlus, X, Download } from 'lucide-react';

const InstallAppButton: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSModal, setShowIOSModal] = useState(false);

    useEffect(() => {
        // Detect if already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        if (isStandalone) {
            setIsVisible(false);
            return;
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        if (ios) {
            setIsVisible(true);
        }

        // Handle Android/Chrome prompt
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSModal(true);
            return;
        }

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setIsVisible(false);
            }
        }
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Top Sticky Banner (official download hint style) */}
            <div className="fixed top-0 left-0 right-0 z-[60] animate-slideDown">
                <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-3 shadow-lg flex items-center justify-between border-b border-white/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-inner overflow-hidden border border-white/10">
                            <img src="/pwa-192x192.png" className="w-full h-full object-cover" alt="logo" />
                        </div>
                        <div>
                            <p className="text-slate-900 font-bold text-sm leading-tight">RuangGamer</p>
                            <p className="text-slate-900/70 text-[10px] uppercase tracking-tighter font-semibold">Install untuk akses instan!</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleInstallClick}
                            className="bg-slate-900 text-yellow-500 text-xs font-bold px-4 py-2 rounded-full shadow-md active:scale-95 transition-transform flex items-center gap-1.5"
                        >
                            <Download size={14} /> Install Aplikasi
                        </button>
                        <button onClick={() => setIsVisible(false)} className="text-slate-900/50 hover:text-slate-900 p-1">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* iOS Installation Instructions Modal */}
            {showIOSModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-slate-800 border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scaleUp">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-6 text-center">Install ke HP Kamu</h2>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-yellow-500 text-slate-900 font-bold flex items-center justify-center flex-shrink-0">1</div>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        Klik tombol <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 text-white mx-1"><Share size={14} /> Share</span> di bar bawah browser.
                                    </p>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-yellow-500 text-slate-900 font-bold flex items-center justify-center flex-shrink-0">2</div>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        Geser ke bawah dan pilih menu <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 text-white mx-1"><SquarePlus size={14} /> Tambah ke Utama</span>.
                                    </p>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-yellow-500 text-slate-900 font-bold flex items-center justify-center flex-shrink-0">3</div>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        Klik <span className="font-bold text-yellow-500 underline mx-1">Tambah</span> di pojok kanan atas.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowIOSModal(false)}
                                className="w-full mt-10 bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-900 font-bold py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-wide"
                            >
                                Saya Mengerti
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallAppButton;
