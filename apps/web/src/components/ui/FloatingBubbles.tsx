import React, { useEffect, useRef, memo } from 'react';

// Animated floating bubbles that move across the screen using requestAnimationFrame
// Uses direct style manipulation to bypass global * { transform: none } CSS reset

interface Bubble {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    opacity: number;
}

const BUBBLE_CONFIGS: Omit<Bubble, 'x' | 'y'>[] = [
    { vx: 0.3, vy: -0.2, size: 300, color: 'rgba(47, 132, 129, 0.18)', opacity: 0.8 },
    { vx: -0.2, vy: -0.35, size: 250, color: 'rgba(6, 182, 212, 0.15)', opacity: 0.7 },
    { vx: 0.25, vy: 0.15, size: 350, color: 'rgba(139, 92, 246, 0.12)', opacity: 0.6 },
    { vx: -0.15, vy: -0.25, size: 200, color: 'rgba(16, 185, 129, 0.16)', opacity: 0.7 },
    { vx: 0.2, vy: 0.3, size: 280, color: 'rgba(47, 132, 129, 0.14)', opacity: 0.65 },
    { vx: -0.3, vy: 0.2, size: 220, color: 'rgba(99, 102, 241, 0.10)', opacity: 0.6 },
];

export const FloatingBubbles = memo(() => {
    const containerRef = useRef<HTMLDivElement>(null);
    const bubblesRef = useRef<Bubble[]>([]);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Initialize bubbles with random starting positions
        bubblesRef.current = BUBBLE_CONFIGS.map((config) => ({
            ...config,
            x: Math.random() * w,
            y: Math.random() * h,
        }));

        const bubbleElements = container.querySelectorAll<HTMLDivElement>('.js-bubble');

        const animate = () => {
            const bubbles = bubblesRef.current;
            const currentW = window.innerWidth;
            const currentH = window.innerHeight;

            for (let i = 0; i < bubbles.length; i++) {
                const b = bubbles[i];
                b.x += b.vx;
                b.y += b.vy;

                // Wrap around screen edges
                if (b.x > currentW + b.size / 2) b.x = -b.size / 2;
                if (b.x < -b.size / 2) b.x = currentW + b.size / 2;
                if (b.y > currentH + b.size / 2) b.y = -b.size / 2;
                if (b.y < -b.size / 2) b.y = currentH + b.size / 2;

                const el = bubbleElements[i];
                if (el) {
                    el.style.left = `${b.x - b.size / 2}px`;
                    el.style.top = `${b.y - b.size / 2}px`;
                }
            }

            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 0 }}
        >
            {BUBBLE_CONFIGS.map((config, i) => (
                <div
                    key={i}
                    className="js-bubble"
                    style={{
                        position: 'absolute',
                        width: config.size,
                        height: config.size,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${config.color} 0%, transparent 70%)`,
                        opacity: config.opacity,
                        pointerEvents: 'none',
                    }}
                />
            ))}
        </div>
    );
});

FloatingBubbles.displayName = 'FloatingBubbles';
