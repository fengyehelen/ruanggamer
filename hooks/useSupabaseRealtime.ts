import { useEffect } from 'react';
import { supabase } from '../services/supabase';

/**
 * Supabase 实时监听 Hook
 * 用于监听 user_tasks, transactions, messages 表的变化
 * 
 * @param userId 当前用户 ID
 * @param onUpdate 当数据发生变化时的回调函数
 */
export const useSupabaseRealtime = (
    userId: string | undefined,
    onUpdate: (payload: { table: string; event: string; new: any; old: any }) => void
) => {
    useEffect(() => {
        if (!userId) return;

        // 监听多个表的通道
        const channel = supabase
            .channel(`realtime-updates-${userId}`)
            // 监听任务变化
            .on(
                'postgres_changes' as any,
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_tasks',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    onUpdate({ table: 'user_tasks', event: payload.eventType, new: payload.new, old: payload.old });
                }
            )
            // 监听交易变化
            .on(
                'postgres_changes' as any,
                {
                    event: '*',
                    schema: 'public',
                    table: 'transactions',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    onUpdate({ table: 'transactions', event: payload.eventType, new: payload.new, old: payload.old });
                }
            )
            // 监听消息变化
            .on(
                'postgres_changes' as any,
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    onUpdate({ table: 'messages', event: payload.eventType, new: payload.new, old: payload.old });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Successfully subscribed to realtime updates for user: ${userId}`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, onUpdate]);
};
