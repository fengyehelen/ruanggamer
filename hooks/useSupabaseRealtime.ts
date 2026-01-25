import { useEffect } from 'react';
import { supabase } from '../services/supabase';

/**
 * Supabase 实时监听 Hook
 * 
 * @param config 订阅配置
 * @param onUpdate 当数据发生变化时的回调函数
 */
export const useSupabaseRealtime = (
    config: {
        channelName: string;
        table: string;
        event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
        filter?: string;
    }[],
    onUpdate: (payload: { table: string; event: string; new: any; old: any }) => void
) => {
    useEffect(() => {
        const channelNames = config.map(c => c.channelName).join('-');
        const channel = supabase.channel(`realtime-${channelNames}`);

        config.forEach((c) => {
            channel.on(
                'postgres_changes' as any,
                {
                    event: c.event,
                    schema: 'public',
                    table: c.table,
                    filter: c.filter,
                },
                (payload) => {
                    onUpdate({
                        table: c.table,
                        event: payload.eventType,
                        new: payload.new,
                        old: payload.old
                    });
                }
            );
        });

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`Successfully subscribed to realtime channel: ${channelNames}`);
            }
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [JSON.stringify(config)]); // Use stringified config as dependency
};
