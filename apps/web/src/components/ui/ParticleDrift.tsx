import { memo, useMemo } from 'react';

/**
 * ParticleDrift — floating particles that drift across the screen.
 * Snowfall-style effect with varied sizes, glow, and gentle pulsing.
 */

interface Particle {
    id: number;
    size: number;
    left: number;
    delay: number;
    duration: number;
    opacity: number;
    color: string;
    drift: number;
    glow: boolean;
    pulse: boolean;
}

const COLORS = [
    'rgba(56, 189, 248,',   // sky-400
    'rgba(20, 184, 166,',   // teal-500
    'rgba(99, 102, 241,',   // indigo-400
    'rgba(6, 182, 212,',    // cyan-500
    'rgba(59, 130, 246,',   // blue-500
    'rgba(34, 211, 238,',   // cyan-400
    'rgba(45, 212, 191,',   // teal-400
    'rgba(79, 70, 229,',    // indigo-600
    'rgba(129, 140, 248,',  // indigo-300
    'rgba(103, 232, 249,',  // cyan-300
];

const PARTICLE_COUNT = 40;

// Size categories for visual variety
const SIZE_BUCKETS = [
    3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 32
];

export const ParticleDrift = memo(() => {
    const particles = useMemo<Particle[]>(() => {
        const items: Particle[] = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const seed = (i * 7919 + 104729) % 100;
            const seed2 = (i * 6271 + 51787) % 100;
            const seed3 = (i * 3571 + 73291) % 100;
            const seed4 = (i * 4973 + 29989) % 100;

            // Pick size from buckets for more dramatic variety
            const sizeIdx = (seed + i * 3) % SIZE_BUCKETS.length;
            const size = SIZE_BUCKETS[sizeIdx];

            // Larger particles = slower, more transparent, more glow
            const isLarge = size >= 20;
            const isTiny = size <= 6;

            items.push({
                id: i,
                size,
                left: (seed2 * 1.05) % 100,
                delay: (seed3 / 100) * 25,            // 0-25s stagger
                duration: isTiny ? 8 + (seed % 10) : isLarge ? 18 + (seed % 14) : 12 + (seed % 12),
                opacity: isTiny ? 0.5 + (seed4 % 30) / 100 : isLarge ? 0.25 + (seed4 % 20) / 100 : 0.35 + (seed4 % 35) / 100,
                color: COLORS[i % COLORS.length],
                drift: -50 + (seed3 % 100),            // -50px to +50px sway
                glow: isLarge || (seed4 % 3 === 0),    // large + every 3rd particle glows
                pulse: seed4 % 4 === 0,                // every 4th pulses
            });
        }
        return items;
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className={`particle-drift${p.glow ? ' particle-glow' : ''}${p.pulse ? ' particle-pulse' : ''}`}
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `${p.left}%`,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                        background: `radial-gradient(circle, ${p.color} ${p.opacity}) 0%, ${p.color} ${p.opacity * 0.5}) 50%, transparent 100%)`,
                        boxShadow: p.glow ? `0 0 ${p.size * 0.8}px ${p.size * 0.3}px ${p.color} ${p.opacity * 0.6})` : 'none',
                        '--drift': `${p.drift}px`,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
});

ParticleDrift.displayName = 'ParticleDrift';
