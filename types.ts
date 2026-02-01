
export type Language = 'id';

// 任务步骤，支持文本和可选的图片
export interface TaskStep {
  text: string;
  imageUrl?: string;
}

export interface Platform {
  id: string;
  name: string;
  nameColor?: string;
  logoUrl: string;
  description: string;
  descColor?: string;
  downloadLink: string;
  firstDepositAmount: number;
  rewardAmount: number;
  launchDate: string;
  isHot?: boolean;
  isPinned?: boolean;
  remainingQty: number;
  totalQty: number;
  likes?: number;
  steps: TaskStep[];
  rules: string;
  status: 'online' | 'offline';
  type: 'deposit' | 'register' | 'share';
  targetCountries: Language[];
}

export interface UserTask {
  id: string;
  platformId: string;
  platformName: string;
  logoUrl: string;
  rewardAmount: number;
  status: 'ongoing' | 'reviewing' | 'completed' | 'rejected';
  startTime: string;
  submissionTime?: string;
  proofImageUrl?: string;
  rejectReason?: string;
}

export interface Transaction {
  id: string;
  type: 'task_reward' | 'referral_bonus' | 'withdraw' | 'system_bonus' | 'admin_gift' | 'vip_bonus';
  amount: number;
  date: string;
  description: string;
  status: 'success' | 'pending' | 'failed';
}

export interface Message {
  id: string;
  title: string;
  content: string;
  date: string;
  read: boolean;
  rewardAmount?: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  type: 'bank' | 'ewallet' | 'crypto';
}

export interface User {
  id: string;
  email: string; // Changed: Email is now primary
  phone?: string; // Changed: Phone is optional
  password?: string;
  balance: number;
  currency: string;
  totalEarnings: number;
  vipLevel: number;
  referralCode: string;
  referrerId?: string;
  invitedCount: number;
  myTasks: UserTask[];
  likedTaskIds: string[];
  registrationDate: string;
  bankAccounts: BankAccount[];
  role: 'user' | 'admin';
  messages: Message[];
  transactions: Transaction[];
  theme?: 'dark' | 'gold';
  isBanned?: boolean;
}

export interface Admin {
  id: string;
  username: string;
  password: string;
  role: 'super_admin' | 'editor';
}

export interface Activity {
  id: string;
  title: string;
  titleColor?: string;
  imageUrl: string;
  content: string;
  link: string;
  active: boolean;
  isPinned?: boolean;
  showPopup?: boolean;
  targetCountries: Language[];
}

export interface VipTier {
  level: number;
  threshold: number;
  reward: number;
}

export interface SystemConfig {
  initialBalance: Record<string, number>;
  minWithdrawAmount: Record<string, number>;
  telegramLinks: Record<string, string>;
  customerServiceLinks: Record<string, string>;
  hypeLevel: number;
  helpContent: string;
  aboutContent: string;
  vipConfig: Record<string, VipTier[]>;
  welcomeMessage?: string;
  promoVideoUrl?: string;
}


export enum SortOption {
  NEWEST = 'NEWEST',
  HIGHEST_LIKES = 'HIGHEST_LIKES',
  HIGHEST_REWARD = 'HIGHEST_REWARD',
  MOST_COMPLETED = 'MOST_COMPLETED'
}
