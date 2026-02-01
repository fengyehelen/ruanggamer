import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { api } from '../services/api';
import { Platform, Activity, User, Transaction, UserTask, Message } from '../types';

// Generic fetcher that uses our existing API service
const fetcher = (url: string) => {
    // Basic mapping: if it starts with /api remove it and use existing api methods
    // However, since our api service is already robust, we can just use it directly in hooks.
    // But SWR needs a key and a fetcher.
    return Promise.reject("Fetcher not directly used; hooks use api service methods.");
};

/**
 * Hook for fetching initial data (platforms and activities)
 */
export const useInitialData = () => {
    const { data, error, mutate } = useSWR('initial-data', () => api.getInitialData(), {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // 1 minute cache
    });

    return {
        platforms: data?.platforms || [],
        activities: data?.activities || [],
        isLoading: !error && !data,
        isError: error,
        mutate
    };
};

/**
 * Hook for fetching system configuration
 */
export const useConfig = () => {
    const { data, error, mutate } = useSWR('config', () => api.getConfig(), {
        revalidateOnFocus: false,
        dedupingInterval: 60000 * 5, // 5 minutes cache
    });

    return {
        config: data,
        isLoading: !error && !data,
        isError: error,
        mutate
    };
};

/**
 * Hook for fetching a single config item (e.g., large text content)
 */
export const useConfigItem = (key: string | undefined) => {
    const { data, error } = useSWR(key ? `config/${key}` : null, () => api.getConfigItem(key!), {
        revalidateOnFocus: false,
        dedupingInterval: 60000 * 10,
    });

    return {
        content: data?.value || "",
        isLoading: !error && !data,
        isError: error
    };
};

/**
 * Hook for fetching platform/task detail
 */
export const useTaskDetail = (id: string | undefined) => {
    const { data, error } = useSWR(id ? `tasks/${id}` : null, () => api.getTaskDetail(id!), {
        revalidateOnFocus: false,
        dedupingInterval: 60000 * 5,
    });

    return {
        platform: data,
        isLoading: !error && !data,
        isError: error
    };
};

/**
 * Hook for fetching activity detail
 */
export const useActivityDetail = (id: string | undefined) => {
    const { data, error } = useSWR(id ? `activities/${id}` : null, () => api.getActivityDetail(id!), {
        revalidateOnFocus: false,
        dedupingInterval: 60000 * 5,
    });

    return {
        activity: data,
        isLoading: !error && !data,
        isError: error
    };
};

/**
 * Paginated Transactions Hook
 */
export const useTransactions = (userId: string | undefined, pageSize: number = 20) => {
    const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite(
        (index) => userId ? `users/${userId}/transactions?page=${index + 1}` : null,
        async (key) => {
            const page = parseInt(key.split('page=')[1]);
            return api.getUserTransactions(userId!, page, pageSize);
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    const transactions = data ? data.flatMap(p => p.transactions) : [];
    const total = data ? data[0]?.total : 0;
    const isLoading = (!data && !error);
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
    const hasMore = transactions.length < total;

    return {
        transactions,
        total,
        isLoading,
        isLoadingMore,
        isValidating,
        hasMore,
        size,
        setSize,
        mutate,
        isError: error
    };
};

/**
 * Paginated Tasks Hook
 */
export const useTasks = (userId: string | undefined, pageSize: number = 20) => {
    const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite(
        (index) => userId ? `users/${userId}/tasks?page=${index + 1}` : null,
        async (key) => {
            const page = parseInt(key.split('page=')[1]);
            return api.getUserTasks(userId!, page, pageSize);
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    const tasks = data ? data.flatMap(p => p.tasks) : [];
    const total = data ? data[0]?.total : 0;
    const isLoading = (!data && !error);
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
    const hasMore = tasks.length < total;

    return {
        tasks,
        total,
        isLoading,
        isLoadingMore,
        isValidating,
        hasMore,
        size,
        setSize,
        mutate,
        isError: error
    };
};

/**
 * Paginated Messages Hook
 */
export const useMessages = (userId: string | undefined, pageSize: number = 20) => {
    const { data, error, size, setSize, isValidating, mutate } = useSWRInfinite(
        (index) => userId ? `users/${userId}/messages?page=${index + 1}` : null,
        async (key) => {
            const page = parseInt(key.split('page=')[1]);
            return api.getUserMessages(userId!, page, pageSize);
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    );

    const messages = data ? data.flatMap(p => p.messages) : [];
    const total = data ? data[0]?.total : 0;
    const isLoading = (!data && !error);
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
    const hasMore = messages.length < total;

    return {
        messages,
        total,
        isLoading,
        isLoadingMore,
        isValidating,
        hasMore,
        size,
        setSize,
        mutate,
        isError: error
    };
};
