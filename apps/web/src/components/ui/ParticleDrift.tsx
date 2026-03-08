import { memo, useMemo, useState, useCallback } from 'react';

/**
 * ParticleDrift — floating particles that drift across the screen.
 * Snowfall-style effect with varied sizes, glow, and gentle pulsing.
 * Includes burst mode triggered by triggerBurst().
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
const BURST_COUNT = 150;

// Size categories for visual variety
const SIZE_BUCKETS = [
    3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 32
];

function generateParticles(count: number, offset: number, maxDelay: number): Particle[] {
    const items: Particle[] = [];
    for (let i = 0; i < count; i++) {
        const seed = ((i + offset) * 7919 + 104729) % 100;
        const seed2 = ((i + offset) * 6271 + 51787) % 100;
        const seed3 = ((i + offset) * 3571 + 73291) % 100;
        const seed4 = ((i + offset) * 4973 + 29989) % 100;

        const sizeIdx = (seed + i * 3) % SIZE_BUCKETS.length;
        const size = SIZE_BUCKETS[sizeIdx];
        const isLarge = size >= 20;
        const isTiny = size <= 6;

        items.push({
            id: i + offset,
            size,
            left: (seed2 * 1.05) % 100,
            delay: (seed3 / 100) * maxDelay,
            duration: isTiny ? 3 + (seed % 4) : isLarge ? 4 + (seed % 3) : 3.5 + (seed % 3),
            opacity: isTiny ? 0.6 + (seed4 % 25) / 100 : isLarge ? 0.35 + (seed4 % 20) / 100 : 0.45 + (seed4 % 30) / 100,
            color: COLORS[i % COLORS.length],
            drift: -30 + (seed3 % 60),
            glow: isLarge || (seed4 % 3 === 0),
            pulse: false,
        });
    }
    return items;
}

interface ParticleDriftProps {
    onBurstRef?: (fn: () => void) => void;
}

export const ParticleDrift = memo<ParticleDriftProps>(({ onBurstRef }) => {
    const [burstParticles, setBurstParticles] = useState<Particle[]>([]);

    // Ambient particles (always visible)
    const particles = useMemo<Particle[]>(() => {
        const items: Particle[] = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const seed = (i * 7919 + 104729) % 100;
            const seed2 = (i * 6271 + 51787) % 100;
            const seed3 = (i * 3571 + 73291) % 100;
            const seed4 = (i * 4973 + 29989) % 100;

            const sizeIdx = (seed + i * 3) % SIZE_BUCKETS.length;
            const size = SIZE_BUCKETS[sizeIdx];
            const isLarge = size >= 20;
            const isTiny = size <= 6;

            items.push({
                id: i,
                size,
                left: (seed2 * 1.05) % 100,
                delay: (seed3 / 100) * 25,
                duration: isTiny ? 8 + (seed % 10) : isLarge ? 18 + (seed % 14) : 12 + (seed % 12),
                opacity: isTiny ? 0.5 + (seed4 % 30) / 100 : isLarge ? 0.25 + (seed4 % 20) / 100 : 0.35 + (seed4 % 35) / 100,
                color: COLORS[i % COLORS.length],
                drift: -50 + (seed3 % 100),
                glow: isLarge || (seed4 % 3 === 0),
                pulse: seed4 % 4 === 0,
            });
        }
        return items;
    }, []);

    // Burst trigger — multiple waves that taper off naturally
    const triggerBurst = useCallback(() => {
        // Wave 1: Heavy burst
        const wave1 = generateParticles(150, 10000, 2);
        setBurstParticles(wave1);

        // Wave 2: Medium (adds to existing)
        setTimeout(() => {
            const wave2 = generateParticles(80, 20000, 2);
            setBurstParticles(prev => [...prev, ...wave2]);
        }, 2000);

        // Wave 3: Light
        setTimeout(() => {
            const wave3 = generateParticles(40, 30000, 1.5);
            setBurstParticles(prev => [...prev, ...wave3]);
        }, 4000);

        // Wave 4: Drizzle (final taper)
        setTimeout(() => {
            const wave4 = generateParticles(20, 40000, 1);
            setBurstParticles(prev => [...prev, ...wave4]);
        }, 5500);

        // Cleanup after all waves finish falling
        setTimeout(() => setBurstParticles([]), 18000);
    }, []);

    // Expose burst function to parent
    if (onBurstRef) {
        onBurstRef(triggerBurst);
    }

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[2]">
            {/* Ambient particles */}
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

            {/* Burst particles */}
            {burstParticles.map((p) => (
                <div
                    key={`burst-${p.id}`}
                    className={`particle-drift${p.glow ? ' particle-glow' : ''}`}
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
