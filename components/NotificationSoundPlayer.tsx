import React, { useEffect, useRef } from 'react';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';

interface NotificationSoundPlayerProps {
    enabled: boolean;
    soundUrl?: string;
}

const NotificationSoundPlayer: React.FC<NotificationSoundPlayerProps> = ({ enabled, soundUrl = '/notification.mp3' }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastPlayedRef = useRef<number>(0);

    // Initialize Audio
    useEffect(() => {
        audioRef.current = new Audio(soundUrl);
    }, [soundUrl]);

    const playSound = () => {
        if (!enabled || !audioRef.current) return;

        const now = Date.now();
        // Debounce: prevent overlapping sounds (wait 2 seconds between plays)
        if (now - lastPlayedRef.current < 2000) {
            console.log('Sound debounced');
            return;
        }

        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => {
            console.log('Sound played successfully');
            lastPlayedRef.current = now;
        }).catch(err => {
            console.warn('Audio playback failed (Autoplay blocked?):', err);
        });
    };

    const realtimeConfig = React.useMemo(() => [
        {
            channelName: 'admin-notifications',
            table: 'user_tasks', // Listen for Status Updates (Proof Submitted)
            event: 'UPDATE' as const
        },
        {
            channelName: 'admin-notifications-tx',
            table: 'transactions', // Listen for New Withdrawals
            event: 'INSERT' as const
        }
    ], []);

    useSupabaseRealtime(realtimeConfig, (payload) => {
        console.log('[Notification] Event:', payload.table, payload.new);

        let shouldPlay = false;

        if (payload.table === 'user_tasks') {
            // Only play if status becomes 'reviewing' (User submitted proof)
            const newUserTask = payload.new;
            if (newUserTask.status === 'reviewing') {
                shouldPlay = true;
            }
        } else if (payload.table === 'transactions') {
            // Check if it is a withdrawal or task reward (usually we care about withdrawals for admin)
            // Or just any transaction? User asked for "Withdrawal request" specifically.
            if (payload.new.type === 'withdraw') {
                shouldPlay = true;
            }
        }

        if (shouldPlay) {
            playSound();
        }
    });

    return null; // Logic only component
};

export default NotificationSoundPlayer;
