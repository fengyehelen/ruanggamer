import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center overflow-hidden font-sans">
            {/* Background animated elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[100px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[100px] rounded-full animate-pulse [animation-delay:1s]"></div>

            <div className="relative flex flex-col items-center gap-8">
                {/* Logo or Main Icon */}
                <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-400 p-[2px] shadow-[0_0_40px_rgba(79,70,229,0.3)] animate-float">
                        <div className="w-full h-full rounded-[22px] bg-[#0f172a] flex items-center justify-center">
                            <span className="text-4xl font-black italic bg-gradient-to-br from-indigo-400 to-amber-400 bg-clip-text text-transparent">RG</span>
                        </div>
                    </div>
                </div>

                {/* Progress visualization */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce"></div>
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] pl-[0.3em] animate-pulse">
                        Memuat Pengalaman...
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
