-- ============================================
-- RuangGamer 数据库架构
-- 使用 Supabase PostgreSQL
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 系统配置表
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认配置
INSERT INTO system_config (key, value) VALUES 
('initial_balance', '{"id": 0}'),
('min_withdraw_amount', '{"id": 50000}'),
('telegram_links', '{"id": "https://t.me/RuangGamer_id"}'),
('hype_level', '5'),
('help_content', '"Hubungi Admin via Telegram jika ada kendala."'),
('about_content', '"RuangGamer adalah platform gaming reward nomor 1 di Indonesia."'),
('vip_config', '{"id": []}')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 2. 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'Rp',
    total_earnings DECIMAL(15, 2) DEFAULT 0,
    vip_level INTEGER DEFAULT 1,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    referrer_id UUID REFERENCES users(id),
    invited_count INTEGER DEFAULT 0,
    liked_task_ids TEXT[] DEFAULT '{}',
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    theme VARCHAR(20) DEFAULT 'gold',
    is_banned BOOLEAN DEFAULT FALSE,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON users(referrer_id);

-- ============================================
-- 3. 银行账户表
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'bank' CHECK (type IN ('bank', 'ewallet', 'crypto')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);

-- ============================================
-- 4. 平台/任务表
-- ============================================
CREATE TABLE IF NOT EXISTS platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_color VARCHAR(50),
    logo_url TEXT,
    description TEXT,
    desc_color VARCHAR(50),
    download_link TEXT NOT NULL,
    first_deposit_amount DECIMAL(15, 2) DEFAULT 0,
    reward_amount DECIMAL(15, 2) NOT NULL,
    launch_date DATE,
    is_hot BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    remaining_qty INTEGER DEFAULT 0,
    total_qty INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    steps TEXT[] DEFAULT '{}',
    rules TEXT,
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'offline')),
    type VARCHAR(20) DEFAULT 'deposit' CHECK (type IN ('deposit', 'register', 'share')),
    target_countries TEXT[] DEFAULT '{"id"}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入示例平台数据
INSERT INTO platforms (name, logo_url, description, download_link, first_deposit_amount, reward_amount, launch_date, is_hot, is_pinned, remaining_qty, total_qty, likes, steps, rules, status, type, target_countries) VALUES
('Domino RP - Gacor', 'https://picsum.photos/100/100?random=1', 'Chip ungu termurah, pasti JP kakek zeus.', 'https://google.com', 50000, 15000, '2023-10-01', true, true, 45, 100, 250, '{"Klik \"Ambil Misi\" & Download APK", "Daftar pakai No HP", "Deposit Min 50rb", "Upload SS Bukti Transfer"}', 'Khusus pengguna baru. Dilarang pakai VPN.', 'online', 'deposit', '{"id"}'),
('Slot88 Maxwin', 'https://picsum.photos/100/100?random=2', 'Depo 20rb bonus 20rb. Gasken!', 'https://google.com', 20000, 25000, '2023-11-15', false, false, 12, 50, 180, '{"Daftar Akun", "Depo 20rb", "Mainkan 5x spin"}', 'SS saldo akhir setelah main.', 'online', 'deposit', '{"id"}'),
('Poker Garuda', 'https://picsum.photos/100/100?random=3', 'Turnamen Poker Gratis Hadiah 1 Juta', 'https://google.com', 0, 5000, '2023-12-01', false, false, 88, 200, 320, '{"Download & Install", "Login Tamu", "SS Lobby"}', 'Cukup login saja.', 'online', 'register', '{"id"}')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. 用户任务表
-- ============================================
CREATE TABLE IF NOT EXISTS user_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    platform_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    reward_amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'reviewing', 'completed', 'rejected')),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    submission_time TIMESTAMPTZ,
    proof_image_url TEXT,
    reject_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_platform_id ON user_tasks(platform_id);

-- ============================================
-- 6. 交易记录表
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('task_reward', 'referral_bonus', 'withdraw', 'system_bonus', 'admin_gift', 'vip_bonus')),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'pending', 'failed')),
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

-- ============================================
-- 7. 消息表
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    reward_amount DECIMAL(15, 2),
    read BOOLEAN DEFAULT FALSE,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- ============================================
-- 8. 活动表
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    title_color VARCHAR(50),
    image_url TEXT,
    content TEXT,
    link TEXT,
    active BOOLEAN DEFAULT TRUE,
    show_popup BOOLEAN DEFAULT FALSE,
    target_countries TEXT[] DEFAULT '{"id"}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入示例活动数据
INSERT INTO activities (title, image_url, content, link, active, target_countries) VALUES
('Bonus Kemerdekaan', 'https://picsum.photos/800/400?random=10', 'Deposit 100rb dapat cashback 50rb khusus hari ini! Syarat: WD minimal turnover x1.', '/task/1', true, '{"id"}'),
('Giveaway DANA Kaget', 'https://picsum.photos/800/400?random=11', 'Join grup telegram RuangGamer dan nantikan DANA kaget setiap jam 8 malam WIB.', '#', true, '{"id"}')
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. 管理员表
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'editor' CHECK (role IN ('super_admin', 'editor')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认管理员
INSERT INTO admins (username, password, role) VALUES 
('admin', '123', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 10. 更新时间触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platforms_updated_at ON platforms;
CREATE TRIGGER update_platforms_updated_at
    BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_tasks_updated_at ON user_tasks;
CREATE TRIGGER update_user_tasks_updated_at
    BEFORE UPDATE ON user_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. Row Level Security (RLS) 策略
-- 可选：如果使用 Supabase Auth
-- ============================================
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 公开读取策略（平台和活动）
-- CREATE POLICY "Public can read platforms" ON platforms FOR SELECT USING (true);
-- CREATE POLICY "Public can read activities" ON activities FOR SELECT USING (true);
