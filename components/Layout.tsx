
import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, User as UserIcon, Headset, Gamepad2, ClipboardList, Bell, Mail, Send, Dices } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface Props {
  children: React.ReactNode;
  lang: Language;
  setLang: (lang: Language) => void;
  telegramLink?: string;
  customerServiceLink?: string;
  theme?: 'dark' | 'gold';
  hasUnreadMsg?: boolean;
  hasUnreadTx?: boolean;
  hasUnreadMisi?: boolean; // NEW
}

const Layout: React.FC<Props> = ({ children, lang, telegramLink, customerServiceLink, theme = 'gold', hasUnreadMsg, hasUnreadTx, hasUnreadMisi }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const t = TRANSLATIONS['id'];
  const isMerchant = location.pathname.startsWith('/merchant');

  // Apply theme to body
  useEffect(() => {
    // Default to 'theme-gold'
    document.body.className = 'theme-gold';
    document.body.style.backgroundColor = '#0f172a'; // Ensure background is dark
  }, []);

  if (isMerchant) {
    return <>{children}</>;
  }

  const isActive = (path: string) => location.pathname === path;

  // Theme-based colors (Luxury Black & Gold)
  const navClass = 'bg-slate-900 border-t border-yellow-500/20'; // Dark nav with gold border
  const headerClass = 'bg-slate-900/95 border-b border-yellow-500/20'; // Dark header with gold border
  const textClass = 'text-slate-200';
  const iconInactive = 'text-slate-500';
  const iconActive = 'text-yellow-500';

  const handleCS = () => {
    if (customerServiceLink) window.open(customerServiceLink, '_blank');
    else alert("Hubungi CS via Telegram");
  };

  const handleTelegramChannel = () => {
    // Use the provided link or a default channel link
    const link = telegramLink || "https://t.me/RuangGamer_id";
    window.open(link, '_blank');
  };

  return (
    <div className={`min-h-screen flex flex-col max-w-md mx-auto border-x shadow-2xl relative transition-colors border-slate-800 bg-slate-900`}>
      <header className={`sticky top-0 z-40 backdrop-blur-md px-4 py-3 flex justify-between items-center transition-colors ${headerClass}`}>
        <div className="flex items-center space-x-2">
          {/* Logo matched with Login Screen */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
            <Dices size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-lg bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent hidden sm:block">
            {t.appName}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Telegram Channel Button (New Req 3) */}
          <button onClick={handleTelegramChannel} className={`p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 text-blue-400`}>
            <Send size={18} className="-rotate-12" />
          </button>

          {/* Mailbox (Messages) */}
          <button onClick={() => navigate('/mailbox')} className={`p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 relative ${textClass}`}>
            <Mail size={18} />
            {hasUnreadMsg && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
          </button>

          {/* Notifications (Transactions) */}
          <button onClick={() => navigate('/profile', { state: { openTransactions: true } })} className={`p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 relative ${textClass}`}>
            <Bell size={18} />
            {hasUnreadTx && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
          </button>

          {/* Customer Service Button (Moved to Far Right - Req 2) */}
          <button onClick={handleCS} className={`p-2 rounded-full bg-slate-800 text-yellow-500 hover:bg-slate-700 transition-colors border border-slate-700`}>
            <Headset size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {children}
      </main>

      <nav className={`fixed bottom-0 z-40 w-full max-w-md pb-safe transition-colors ${navClass}`}>
        <div className="flex justify-between items-center px-6 py-3">
          <Link to="/" className={`flex flex-col items-center space-y-1 w-14 ${isActive('/') ? iconActive : iconInactive}`}>
            <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{t.home}</span>
          </Link>

          <Link to="/referral" className={`flex flex-col items-center space-y-1 w-14 ${isActive('/referral') ? iconActive : iconInactive}`}>
            <Users size={22} strokeWidth={isActive('/referral') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{t.referral}</span>
          </Link>

          <div className="relative -top-6">
            <div className="absolute inset-0 bg-yellow-500 rounded-full blur-md opacity-40 animate-pulse"></div>
            <Link to="/" className="btn-earn-anim bg-gradient-to-b from-yellow-400 to-amber-600 w-16 h-16 rounded-full flex items-center justify-center shadow-xl border-4 border-slate-900 text-slate-900 transform transition-transform active:scale-95">
              <span className="font-bold text-xs relative z-10">{t.earn}</span>
              <div className="particle-extra"></div>
            </Link>
          </div>

          <Link to="/my-tasks" className={`flex flex-col items-center space-y-1 w-14 relative ${isActive('/my-tasks') ? iconActive : iconInactive}`}>
            <ClipboardList size={22} strokeWidth={isActive('/my-tasks') ? 2.5 : 2} />
            {hasUnreadMisi && <span className="absolute top-0 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
            <span className="text-[10px] font-medium">{t.tasks}</span>
          </Link>

          <Link to="/profile" className={`flex flex-col items-center space-y-1 w-14 ${isActive('/profile') ? iconActive : iconInactive}`}>
            <UserIcon size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{t.profile}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
