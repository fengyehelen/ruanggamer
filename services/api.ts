
import { User, Platform, Activity, UserTask, SystemConfig, BankAccount } from '../types';

// 后端 API 基础地址
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api'
    : '/api';

/**
 * HTTP 请求辅助函数
 * 统一处理请求和错误
 */
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(errorData.detail || 'Request failed');
    }

    return response.json();
}

/**
 * RuangGamer API 客户端
 * 连接 FastAPI 后端
 */
export const api = {
    /**
     * 用户登录
     */
    async login(email: string, pass: string): Promise<{ user: User }> {
        return request<{ user: User }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password: pass }),
        });
    },

    /**
     * 用户注册
     */
    async register(email: string, pass: string, _code: string, invite?: string): Promise<{ user: User }> {
        return request<{ user: User }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password: pass,
                inviteCode: invite
            }),
        });
    },

    /**
     * 绑定手机号
     */
    async bindPhone(userId: string, phone: string): Promise<User> {
        return request<User>(`/users/${userId}/bind-phone`, {
            method: 'POST',
            body: JSON.stringify({ phone }),
        });
    },

    /**
     * 绑定银行/电子钱包账户
     */
    async bindBank(userId: string, account: Omit<BankAccount, 'id'>): Promise<User> {
        return request<User>(`/users/${userId}/bind-bank`, {
            method: 'POST',
            body: JSON.stringify({
                bankName: account.bankName,
                accountName: account.accountName,
                accountNumber: account.accountNumber,
                type: account.type
            }),
        });
    },

    /**
     * 提现申请
     */
    async withdraw(userId: string, amount: number, accountId: string): Promise<User> {
        return request<User>(`/users/${userId}/withdraw`, {
            method: 'POST',
            body: JSON.stringify({
                amount,
                accountId
            }),
        });
    },

    /**
     * 获取初始数据（平台和活动）
     */
    async getTaskDetail(id: string): Promise<Platform> {
        return request<Platform>(`/tasks/${id}`);
    },
    async getActivityDetail(id: string): Promise<Activity> {
        return request<Activity>(`/activities/${id}`);
    },
    async getConfigItem(key: string): Promise<{ key: string, value: any }> {
        return request<{ key: string, value: any }>(`/config/${key}`);
    },
    async getInitialData(): Promise<{ platforms: Platform[], activities: Activity[] }> {
        console.log('Fetching initial data from:', `${API_BASE}/initial-data`);
        return request<{ platforms: Platform[], activities: Activity[] }>('/initial-data');
    },


    /**
     * 获取系统配置
     */
    async getConfig(): Promise<SystemConfig> {
        return request<SystemConfig>('/config');
    },

    /**
     * 获取用户信息
     */
    async getUser(id: string): Promise<User | null> {
        try {
            return await request<User>(`/users/${id}`);
        } catch {
            return null;
        }
    },

    /**
     * 将所有消息标记为已读
     */
    async markAllMessagesRead(userId: string): Promise<void> {
        return request<void>(`/users/${userId}/messages/read`, {
            method: 'PATCH',
        });
    },

    /**
     * 开始任务
     */
    async startTask(userId: string, platformId: string): Promise<UserTask> {
        return request<UserTask>(`/tasks/${platformId}/start?user_id=${userId}`, {
            method: 'POST',
        });
    },

    /**
     * 点赞任务
     */
    async likeTask(userId: string, platformId: string): Promise<User> {
        return request<User>(`/tasks/${platformId}/like?user_id=${userId}`, {
            method: 'POST',
        });
    },

    // ============================================
    // 管理员相关 API
    // ============================================

    /**
     * 管理员登录
     */
    async adminLogin(username: string, password: string): Promise<{ admin: { id: string; username: string; role: string } }> {
        return request<{ admin: { id: string; username: string; role: string } }>('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    },

    /**
     * 获取管理员列表
     */
    async getAdmins(): Promise<{ admins: Array<{ id: string; username: string; role: string }> }> {
        return request<{ admins: Array<{ id: string; username: string; role: string }> }>('/admin/list');
    },

    /**
     * 创建管理员
     */
    async createAdmin(username: string, password: string, role: string = 'editor'): Promise<{ id: string; username: string; role: string }> {
        return request<{ id: string; username: string; role: string }>('/admin/create', {
            method: 'POST',
            body: JSON.stringify({ username, password, role }),
        });
    },

    /**
     * 获取所有用户列表 (Admin)
     */
    async getAllUsers(): Promise<{ users: User[] }> {
        return request<{ users: User[] }>('/admin/users');
    },

    // ============================================
    // Content Management (New)
    // ============================================

    async uploadProof(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE}/tasks/upload`, {

                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Upload failed");
            }

            const data = await response.json();
            return data.url;
        } catch (error: any) {
            console.error("Upload Error:", error);
            throw new Error(error.message || "Upload failed");
        }
    },

    async submitTaskProof(userId: string, taskId: string, proofImageUrl: string): Promise<void> {
        return request<void>('/tasks/submit-proof', {
            method: 'POST',
            body: JSON.stringify({ userId, taskId, proofImageUrl }),
        });
    },

    async addTask(task: Platform): Promise<Platform> {


        const { id, ...data } = task;
        return request<Platform>('/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async updateTask(id: string, updates: Partial<Platform>): Promise<Platform> {
        return request<Platform>(`/tasks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    },

    async deleteTask(id: string): Promise<void> {
        return request<void>(`/tasks/${id}`, {
            method: 'DELETE',
        });
    },

    async addActivity(activity: Activity): Promise<Activity> {
        const { id, ...data } = activity;
        return request<Activity>('/activities', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
        return request<Activity>(`/activities/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
    },

    async deleteActivity(id: string): Promise<void> {
        return request<void>(`/activities/${id}`, {
            method: 'DELETE',
        });
    },

    async updateConfig(config: SystemConfig): Promise<SystemConfig> {
        return request<SystemConfig>('/config', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    },

    async auditTask(userId: string, taskId: string, status: 'completed' | 'rejected'): Promise<void> {
        return request<void>('/admin/audit-task', {
            method: 'POST',
            body: JSON.stringify({ userId, taskId, status }),
        });
    },

    async auditWithdrawal(transactionId: string, status: 'success' | 'failed'): Promise<void> {
        return request<void>('/admin/audit-withdrawal', {
            method: 'POST',
            body: JSON.stringify({ transactionId, status }),
        });
    },


    async sendMessage(userId: string, title: string, content: string, amount: number): Promise<void> {
        return request<void>('/admin/send-message', {
            method: 'POST',
            body: JSON.stringify({ userId, title, content, amount }),
        });
    },

    async banUser(userId: string, isBanned: boolean): Promise<void> {
        return request<void>(`/admin/users/${userId}/ban?is_banned=${isBanned}`, {
            method: 'PATCH'
        });
    },

    async resetUserPassword(userId: string, newPass: string): Promise<void> {
        return request<void>(`/admin/users/${userId}/password`, {
            method: 'PATCH',
            body: JSON.stringify({ newPassword: newPass })
        });
    },

    /**
     * 管理员修改自己的密码
     */
    async changeAdminPassword(adminId: string, oldPass: string, newPass: string): Promise<void> {
        return request<void>('/admin/password', {
            method: 'PATCH',
            body: JSON.stringify({ adminId, oldPassword: oldPass, newPassword: newPass })
        });
    },

    async getAdminMessages(page: number, pageSize: number, search?: string): Promise<{ messages: any[], total: number }> {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
        });
        if (search) params.append('search', search);
        return request<{ messages: any[], total: number }>(`/admin/messages?${params.toString()}`);
    },

    /**
     * 获取指定用户的交易流水 (分页)
     */
    async getUserTransactions(userId: string, page: number, pageSize: number): Promise<{ transactions: any[], total: number }> {
        return request<{ transactions: any[], total: number }>(`/users/${userId}/transactions?page=${page}&per_page=${pageSize}`);
    },

    /**
     * 获取指定用户的任务记录 (分页)
     */
    async getUserTasks(userId: string, page: number, pageSize: number): Promise<{ tasks: any[], total: number }> {
        return request<{ tasks: any[], total: number }>(`/users/${userId}/tasks?page=${page}&per_page=${pageSize}`);
    },

    /**
     * 获取指定用户的消息列表 (分页)
     */
    async getUserMessages(userId: string, page: number, pageSize: number): Promise<{ messages: any[], total: number }> {
        return request<{ messages: any[], total: number }>(`/users/${userId}/messages?page=${page}&per_page=${pageSize}`);
    },

    /**
     * 管理员获取指定用户的交易流水
     */
    async getAdminUserTransactions(userId: string, page: number, pageSize: number): Promise<{ transactions: any[], total: number }> {
        return request<{ transactions: any[], total: number }>(`/admin/users/${userId}/transactions?page=${page}&per_page=${pageSize}`);
    },

    /**
     * 获取仪表盘统计数据 (服务端聚合)
     */
    async getDashboardStats(): Promise<{
        totalUsers: number;
        totalBalance: number;
        pendingWithdrawals: number;
        pendingTasks: number;
        todayRegistrations: number;
    }> {
        return request('/admin/dashboard-stats');
    },

    /**
     * 获取分页用户列表 (精简数据)
     */
    async getPaginatedUsers(page: number, perPage: number, search?: string): Promise<{
        users: any[];
        total: number;
        page: number;
        perPage: number;
    }> {
        const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
        if (search) params.append('search', search);
        return request(`/admin/users?${params.toString()}`);
    },

    /**
     * 获取待审核任务列表
     */
    async getPendingTasks(): Promise<{ tasks: any[]; total: number }> {
        return request('/admin/pending-tasks');
    },

    /**
     * 获取提现记录列表
     */
    async getPendingWithdrawals(page: number = 1, perPage: number = 20): Promise<{ withdrawals: any[]; total: number }> {
        return request(`/admin/pending-withdrawals?page=${page}&per_page=${perPage}`);
    },

    /**
     * 获取已审核任务历史记录
     */
    async getAuditHistory(page: number = 1, perPage: number = 20): Promise<{ tasks: any[]; total: number }> {
        return request(`/admin/audit-history?page=${page}&per_page=${perPage}`);
    }

};
