import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center overflow-hidden font-sans">
            {/* Background animated elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[100px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[100px] rounded-full animate-pulse [animation-delay:1s]"></div>

            <div className="relative flex flex-col items-center gap-6">
                {/* Logo or Main Icon */}
                <div className="relative">
                    <div className="w-28 h-28 rounded-[28%] bg-gradient-to-b from-[#f59e0b] to-[#b45309] shadow-[0_15px_30px_rgba(245,158,11,0.2)] animate-float flex items-center justify-center">
                        {/* Dice SVG Logic */}
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white drop-shadow-md">
                            <g transform="rotate(-15 12 12)">
                                {/* Back Dice */}
                                <rect x="8" y="4" width="10" height="10" rx="2" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.2" />
                                <circle cx="11" cy="7" r="0.8" fill="white" />
                                <circle cx="15" cy="11" r="0.8" fill="white" />
                                {/* Front Dice */}
                                <rect x="5" y="9" width="10" height="10" rx="2" fill="white" stroke="white" strokeWidth="1.2" />
                                <circle cx="8" cy="12" r="0.8" fill="#b45309" />
                                <circle cx="12" cy="16" r="0.8" fill="#b45309" />
                            </g>
                        </svg>
                    </div>
                </div>

                {/* Brand Text */}
                <div className="flex flex-col items-center gap-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white">
                        <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">RuangGamer</span>
                    </h1>

                    {/* Progress dots */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-1.5 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/30 animate-bounce"></div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-12px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
