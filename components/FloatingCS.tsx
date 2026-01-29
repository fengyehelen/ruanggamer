import React, { useState, useRef, useEffect } from 'react';
import { Phone, MessageCircle } from 'lucide-react';

interface FloatingCSProps {
    link?: string;
}

const FloatingCS: React.FC<FloatingCSProps> = ({ link }) => {
    // Target: 50% size of original (w-14) -> w-7 (28px)
    // Position: "Right of VIRAL text". VIRAL is a sticky header below banner.
    // Estimated banner+stats height ~ 250px.
    // VIRAL text is on the left. So we place it at x ~ 100-120.

    const [pos, setPos] = useState({ x: 120, y: 280 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Adjust for mobile vs desktop if needed, but fixed logic is safer for "specific location"
        // User requested initial position: Right of VIRAL.
        // We set default state above, but can refine here if needed.
        // Ensuring it doesn't spawn off-screen on very small screens?
        setPos(p => ({
            x: Math.min(p.x, window.innerWidth - 40),
            y: Math.min(p.y, window.innerHeight - 40)
        }));

        const handleResize = () => {
            // Keep it within bounds on resize
            setPos(p => ({
                x: Math.min(p.x, window.innerWidth - 30),
                y: Math.min(p.y, window.innerHeight - 30)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleStart = (clientX: number, clientY: number) => {
        isDragging.current = false;
        dragStart.current = { x: clientX, y: clientY };
        initialPos.current = { x: pos.x, y: pos.y };

        // Attach global move/up listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    };

    const handleMove = (clientX: number, clientY: number) => {
        const dx = clientX - dragStart.current.x;
        const dy = clientY - dragStart.current.y;

        // Threshold for drag detection
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isDragging.current = true;
        }

        let newX = initialPos.current.x + dx;
        let newY = initialPos.current.y + dy;

        // Boundary Checks
        // Button size 28px (w-7)
        const size = 28;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        // Clamp
        if (newX < 0) newX = 0;
        if (newX > screenW - size) newX = screenW - size;
        if (newY < 0) newY = 0;
        if (newY > screenH - size) newY = screenH - size;

        setPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
    };

    // MOUSE EVENTS
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent text selection
        handleStart(e.clientX, e.clientY);
    };
    const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        handleMove(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
        handleEnd();
    };

    // TOUCH EVENTS
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => {
        handleEnd();
    };

    const handleClick = () => {
        if (!isDragging.current) {
            if (link) {
                window.open(link, '_blank');
            } else {
                alert("CS Link not configured");
            }
        }
    };

    return (
        <div
            ref={buttonRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={handleClick}
            style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                zIndex: 9999,
                touchAction: 'none', // Crucial for touch dragging
                cursor: 'pointer'
            }}
            className="w-7 h-7 bg-green-500 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex items-center justify-center text-white hover:brightness-110 active:scale-95 transition-transform"
        >
            {/* WhatsApp Style Icon - Reduced size */}
            <Phone size={14} fill="white" className="drop-shadow-sm" />

            {/* Optional: Notification Badge or animation ring */}
            <div className="absolute inset-0 border border-white/20 rounded-full animate-ping opacity-20 pointer-events-none"></div>
        </div>
    );
};

export default FloatingCS;
