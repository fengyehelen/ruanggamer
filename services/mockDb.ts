
import { User, Platform, Activity, Admin, SystemConfig, VipTier } from '../types';
import { MOCK_PLATFORMS, MOCK_ACTIVITIES } from '../constants';

// Keys for LocalStorage
const KEYS = {
  USERS: 'betbounty_users',
  PLATFORMS: 'betbounty_platforms',
  ACTIVITIES: 'betbounty_activities',
  ADMINS: 'betbounty_admins',
  CONFIG: 'betbounty_config'
};

// Default Admin
const DEFAULT_ADMIN: Admin = {
  id: 'admin_01',
  username: 'admin',
  password: '123',
  role: 'super_admin'
};

// Generate 20 VIP Levels with increasing difficulty
const generateDefaultVipConfig = (): VipTier[] => {
    const levels: VipTier[] = [];
    let threshold = 0;
    let reward = 0;
    for(let i=1; i<=20; i++) {
        // Simple progression formula
        if (i > 1) {
            threshold += i * 50000; // Increase threshold
            reward += i * 10000;    // Increase reward
        }
        levels.push({
            level: i,
            threshold: threshold, 
            reward: reward 
        });
    }
    return levels;
};

// Default Config
const DEFAULT_CONFIG: SystemConfig = {
  initialBalance: { en: 0, zh: 0, id: 0, th: 0, vi: 0, ms: 0, tl: 0 },
  minWithdrawAmount: { en: 10, zh: 100, id: 50000, th: 100, vi: 100000, ms: 50, tl: 200 },
  telegramLinks: {
    en: 'https://t.me/betbounty_global',
    zh: 'https://t.me/betbounty_cn',
    id: 'https://t.me/betbounty_id',
    th: 'https://t.me/betbounty_th',
    vi: 'https://t.me/betbounty_vn',
    ms: 'https://t.me/betbounty_my',
    tl: 'https://t.me/betbounty_ph'
  },
  hypeLevel: 5, 
  helpContent: 'Welcome to the help center.',
  aboutContent: 'About us content goes here.',
  vipConfig: { id: generateDefaultVipConfig(), en: generateDefaultVipConfig() }
};

// Ensure mock platforms have 'likes' property if old data is loaded
const enrichPlatforms = (platforms: Platform[]): Platform[] => {
    return platforms.map(p => ({
        ...p,
        likes: p.likes !== undefined ? p.likes : Math.floor(Math.random() * 50) + 200
    }));
};

// Helper to safely save to localStorage without crashing
const safeSave = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to ${key}:`, error);
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
       console.warn("LocalStorage Quota Exceeded. Data not saved to disk, but stays in memory.");
    }
  }
};

export const MockDb = {
  // --- Users ---
  getUsers: (): User[] => {
    try {
      const data = localStorage.getItem(KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },
  saveUsers: (users: User[]) => {
    safeSave(KEYS.USERS, users);
  },

  // --- Platforms (Tasks) ---
  getPlatforms: (): Platform[] => {
    try {
      const data = localStorage.getItem(KEYS.PLATFORMS);
      return data ? enrichPlatforms(JSON.parse(data)) : enrichPlatforms(MOCK_PLATFORMS);
    } catch { return enrichPlatforms(MOCK_PLATFORMS); }
  },
  savePlatforms: (platforms: Platform[]) => {
    safeSave(KEYS.PLATFORMS, platforms);
  },

  // --- Activities ---
  getActivities: (): Activity[] => {
    try {
      const data = localStorage.getItem(KEYS.ACTIVITIES);
      return data ? JSON.parse(data) : MOCK_ACTIVITIES;
    } catch { return MOCK_ACTIVITIES; }
  },
  saveActivities: (activities: Activity[]) => {
    safeSave(KEYS.ACTIVITIES, activities);
  },

  // --- Admins ---
  getAdmins: (): Admin[] => {
    try {
      const data = localStorage.getItem(KEYS.ADMINS);
      if (!data) {
        safeSave(KEYS.ADMINS, [DEFAULT_ADMIN]);
        return [DEFAULT_ADMIN];
      }
      return JSON.parse(data);
    } catch { return [DEFAULT_ADMIN]; }
  },
  saveAdmins: (admins: Admin[]) => {
    safeSave(KEYS.ADMINS, admins);
  },

  // --- System Config ---
  getConfig: (): SystemConfig => {
    try {
      const data = localStorage.getItem(KEYS.CONFIG);
      const loaded = data ? JSON.parse(data) : DEFAULT_CONFIG;
      // Merge for backward compatibility
      return { ...DEFAULT_CONFIG, ...loaded };
    } catch { return DEFAULT_CONFIG; }
  },
  saveConfig: (config: SystemConfig) => {
    safeSave(KEYS.CONFIG, config);
  }
};
