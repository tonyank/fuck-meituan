import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActiveTarget, HoleConfig, TargetType, TARGET_METAS, ToolSettings } from '../types';
import {
  HoleBaseSvg,
  NormalMoleSvg,
  BucketMoleSvg,
  ClockSvg,
  ChestSvg,
  BombSvg,
  HammerSvg,
} from '../assets/gameIcons';
import { sounds } from '../utils/soundEffects';

interface GameCanvasProps {
  settings: ToolSettings;
  onTargetHit?: (holeIndex: number, type: TargetType, scoreDelta: number, isDouble: boolean) => void;
  onBombAvoided?: (holeIndex: number) => void;
  onHoleStatusUpdate?: (holeIndex: number, detectedType: TargetType | null, confidence: number, isBlacklisted: boolean) => void;
  activeTargets: ActiveTarget[];
  setActiveTargets: React.Dispatch<React.SetStateAction<ActiveTarget[]>>;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

// 12 Holes layout: 4 rows x 3 columns matching the video layout
export const HOLES_LAYOUT: HoleConfig[] = [
  // Row 1 (y: 20%)
  { index: 0, row: 0, col: 0, xPercent: 20, yPercent: 22, label: '洞 #0' },
  { index: 1, row: 0, col: 1, xPercent: 50, yPercent: 22, label: '洞 #1' },
  { index: 2, row: 0, col: 2, xPercent: 80, yPercent: 22, label: '洞 #2' },
  // Row 2 (y: 35%)
  { index: 3, row: 1, col: 0, xPercent: 20, yPercent: 37, label: '洞 #3' },
  { index: 4, row: 1, col: 1, xPercent: 50, yPercent: 37, label: '洞 #4' },
  { index: 5, row: 1, col: 2, xPercent: 80, yPercent: 37, label: '洞 #5' },
  // Row 3 (y: 50%)
  { index: 6, row: 2, col: 0, xPercent: 20, yPercent: 52, label: '洞 #6' },
  { index: 7, row: 2, col: 1, xPercent: 50, yPercent: 52, label: '洞 #7' },
  { index: 8, row: 2, col: 2, xPercent: 80, yPercent: 52, label: '洞 #8' },
  // Row 4 (y: 65%)
  { index: 9, row: 3, col: 0, xPercent: 20, yPercent: 67, label: '洞 #9' },
  { index: 10, row: 3, col: 1, xPercent: 50, yPercent: 67, label: '洞 #10' },
  { index: 11, row: 3, col: 2, xPercent: 80, yPercent: 67, label: '洞 #11' },
];

interface FloatingText {
  id: string;
  text: string;
  color: string;
  xPercent: number;
  yPercent: number;
}

interface GestureRipple {
  id: string;
  xPercent: number;
  yPercent: number;
  isDouble?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  settings,
  onTargetHit,
  onBombAvoided,
  onHoleStatusUpdate,
  activeTargets,
  setActiveTargets,
  score,
  setScore,
  timeLeft,
  setTimeLeft,
  isPlaying,
  setIsPlaying,
}) => {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [ripples, setRipples] = useState<GestureRipple[]>([]);
  const [hammerPos, setHammerPos] = useState<{ xPercent: number; yPercent: number; isSwinging: boolean } | null>(null);

  // Debounce record for each hole: timestamp of last click
  const holeCooldownRef = useRef<Record<number, number>>({});
  const activeTargetsRef = useRef(activeTargets);
  activeTargetsRef.current = activeTargets;

  // Sound mute sync
  useEffect(() => {
    sounds.setMuted(settings.soundMuted);
  }, [settings.soundMuted]);

  // Add floating point label
  const showFloatingLabel = useCallback((text: string, color: string, xPercent: number, yPercent: number) => {
    const id = Math.random().toString();
    setFloatingTexts((prev) => [...prev, { id, text, color, xPercent, yPercent }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1000);
  }, []);

  // Trigger dispatch visual ripple & hammer swing
  const triggerVisualClick = useCallback((holeIndex: number, isDouble = false) => {
    const hole = HOLES_LAYOUT[holeIndex];
    if (!hole) return;

    // Show hammer animation
    setHammerPos({ xPercent: hole.xPercent + 4, yPercent: hole.yPercent - 8, isSwinging: true });
    setTimeout(() => {
      setHammerPos(null);
    }, 180);

    // Ripple
    const rippleId = Math.random().toString();
    setRipples((prev) => [...prev, { id: rippleId, xPercent: hole.xPercent, yPercent: hole.yPercent, isDouble }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 450);
  }, []);

  // User manual click or automated accessibility hit handler
  const handleHitHole = useCallback(
    (holeIndex: number, isFromBot = false) => {
      const now = Date.now();
      const lastClick = holeCooldownRef.current[holeIndex] || 0;

      // Check 280ms debounce
      if (now - lastClick < settings.debounceMs) {
        return; // debounce protected
      }
      holeCooldownRef.current[holeIndex] = now;

      const target = activeTargetsRef.current.find(
        (t) => t.holeIndex === holeIndex && (t.state === 'idle' || t.state === 'hit_stage1')
      );
      const hole = HOLES_LAYOUT[holeIndex];

      if (!target) {
        triggerVisualClick(holeIndex, false);
        sounds.playWhack();
        return;
      }

      // Check if target is bomb
      if (target.type === 'bomb') {
        if (isFromBot) {
          // Bot should NEVER hit bomb!
          return;
        }
        // Manual player hit bomb
        sounds.playExplosion();
        triggerVisualClick(holeIndex, false);
        showFloatingLabel('-50 💥BOOM!', '#DC2626', hole.xPercent, hole.yPercent);
        setScore((s) => Math.max(0, s - 50));
        setActiveTargets((prev) =>
          prev.map((t) => (t.id === target.id ? { ...t, state: 'exploded' } : t))
        );
        setTimeout(() => {
          setActiveTargets((prev) => prev.filter((t) => t.id !== target.id));
        }, 600);
        return;
      }

      // If bucket mole or chest -> requires 2 hits
      if (target.type === 'bucket_mole' || target.type === 'chest') {
        if (target.state === 'idle') {
          // First hit: break bucket or break lock
          sounds.playWhack();
          triggerVisualClick(holeIndex, isFromBot);

          if (isFromBot) {
            // Simulated 75ms double click sequence!
            setActiveTargets((prev) =>
              prev.map((t) => (t.id === target.id ? { ...t, state: 'hit_stage1', currentHp: 1 } : t))
            );
            setTimeout(() => {
              // Second hit after 75ms!
              triggerVisualClick(holeIndex, true);
              sounds.playCoin();
              const scoreBonus = target.type === 'chest' ? 6 : 4;
              showFloatingLabel(
                `+${scoreBonus} 破防双击!`,
                target.type === 'chest' ? '#F59E0B' : '#3B82F6',
                hole.xPercent,
                hole.yPercent
              );
              setScore((s) => s + scoreBonus);
              onTargetHit?.(holeIndex, target.type, scoreBonus, true);

              setActiveTargets((prev) =>
                prev.map((t) => (t.id === target.id ? { ...t, state: 'hit_stage2', currentHp: 0 } : t))
              );
              setTimeout(() => {
                setActiveTargets((prev) => prev.filter((t) => t.id !== target.id));
              }, 400);
            }, settings.doubleClickIntervalMs);
          } else {
            // Manual single hit
            setActiveTargets((prev) =>
              prev.map((t) => (t.id === target.id ? { ...t, state: 'hit_stage1', currentHp: 1 } : t))
            );
            showFloatingLabel('破防 1/2', '#60A5FA', hole.xPercent, hole.yPercent);
          }
          return;
        } else if (target.state === 'hit_stage1') {
          // Second hit manual
          sounds.playCoin();
          triggerVisualClick(holeIndex, false);
          const scoreBonus = target.type === 'chest' ? 6 : 4;
          showFloatingLabel(`+${scoreBonus}`, '#F59E0B', hole.xPercent, hole.yPercent);
          setScore((s) => s + scoreBonus);
          onTargetHit?.(holeIndex, target.type, scoreBonus, true);

          setActiveTargets((prev) =>
            prev.map((t) => (t.id === target.id ? { ...t, state: 'hit_stage2', currentHp: 0 } : t))
          );
          setTimeout(() => {
            setActiveTargets((prev) => prev.filter((t) => t.id !== target.id));
          }, 400);
          return;
        }
      }

      // Normal mole (1 click -> +2 score)
      if (target.type === 'normal_mole') {
        sounds.playCoin();
        triggerVisualClick(holeIndex, false);
        showFloatingLabel('+2', '#10B981', hole.xPercent, hole.yPercent);
        setScore((s) => s + 2);
        onTargetHit?.(holeIndex, target.type, 2, false);

        setActiveTargets((prev) =>
          prev.map((t) => (t.id === target.id ? { ...t, state: 'hit_stage1', currentHp: 0 } : t))
        );
        setTimeout(() => {
          setActiveTargets((prev) => prev.filter((t) => t.id !== target.id));
        }, 400);
        return;
      }

      // Clock (1 click -> +3s time bonus)
      if (target.type === 'clock') {
        sounds.playClockBell();
        triggerVisualClick(holeIndex, false);
        showFloatingLabel('+3秒 ⏰', '#F59E0B', hole.xPercent, hole.yPercent);
        setTimeLeft((t) => t + 3);
        onTargetHit?.(holeIndex, target.type, 0, false);

        setActiveTargets((prev) =>
          prev.map((t) => (t.id === target.id ? { ...t, state: 'hit_stage1', currentHp: 0 } : t))
        );
        setTimeout(() => {
          setActiveTargets((prev) => prev.filter((t) => t.id !== target.id));
        }, 400);
        return;
      }
    },
    [
      settings.debounceMs,
      settings.doubleClickIntervalMs,
      triggerVisualClick,
      showFloatingLabel,
      setScore,
      setActiveTargets,
      setTimeLeft,
      onTargetHit,
    ]
  );

  // Spawner loop: spawn random items across 12 holes
  useEffect(() => {
    if (!isPlaying) return;

    const spawnInterval = setInterval(() => {
      setActiveTargets((prev) => {
        // Limit active items simultaneously to 2 ~ 4
        if (prev.length >= 4) return prev;

        const occupiedHoles = new Set(prev.map((t) => t.holeIndex));
        const freeHoles = HOLES_LAYOUT.filter((h) => !occupiedHoles.has(h.index));
        if (freeHoles.length === 0) return prev;

        const chosenHole = freeHoles[Math.floor(Math.random() * freeHoles.length)];

        // Random type distribution matching video:
        // Normal mole 45%, Bucket mole 20%, Clock 12%, Chest 10%, Bomb 13%
        const rand = Math.random();
        let type: TargetType = 'normal_mole';
        let maxHp = 1;

        if (rand < 0.42) {
          type = 'normal_mole';
          maxHp = 1;
        } else if (rand < 0.64) {
          type = 'bucket_mole';
          maxHp = 2;
        } else if (rand < 0.77) {
          type = 'clock';
          maxHp = 1;
        } else if (rand < 0.88) {
          type = 'chest';
          maxHp = 2;
        } else {
          type = 'bomb';
          maxHp = 1;
        }

        const lifetimeMs = type === 'bomb' ? 3200 : 2600 + Math.random() * 800;

        const newTarget: ActiveTarget = {
          id: Math.random().toString(),
          type,
          holeIndex: chosenHole.index,
          spawnTime: Date.now(),
          lifetimeMs,
          state: 'idle',
          currentHp: maxHp,
          maxHp,
          hitCount: 0,
          x: chosenHole.xPercent,
          y: chosenHole.yPercent,
        };

        return [...prev, newTarget];
      });
    }, 750);

    return () => clearInterval(spawnInterval);
  }, [isPlaying, setActiveTargets]);

  // Target timeout/retreat cleanup
  useEffect(() => {
    if (!isPlaying) return;
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setActiveTargets((prev) =>
        prev.filter((t) => {
          if (t.state === 'hit_stage2' || t.state === 'exploded') return true;
          return now - t.spawnTime < t.lifetimeMs;
        })
      );
    }, 200);

    return () => clearInterval(cleanupInterval);
  }, [isPlaying, setActiveTargets]);

  // Game countdown timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setIsPlaying(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, setTimeLeft, setIsPlaying]);

  // MediaProjection + OpenCV + Accessibility BOT LOOP:
  // Runs whenever settings.autoEnabled is true
  useEffect(() => {
    if (!isPlaying || !settings.autoEnabled) return;

    const botInterval = setInterval(() => {
      // 1. Simulate Screen capture & 12 Hole ROI cropping
      HOLES_LAYOUT.forEach((hole) => {
        const target = activeTargetsRef.current.find(
          (t) => t.holeIndex === hole.index && t.state !== 'exploded' && t.state !== 'hit_stage2'
        );

        if (!target) {
          onHoleStatusUpdate?.(hole.index, null, 0, false);
          return;
        }

        // Simulate multi-scale pyramid normalized cross-correlation score
        const baseConfidence = 0.82 + Math.random() * 0.14;

        if (target.type === 'bomb') {
          // BOMB DETECTED: First priority check!
          const bombConfidence = baseConfidence > settings.bombThreshold ? baseConfidence : 0.89;
          onHoleStatusUpdate?.(hole.index, 'bomb', bombConfidence, true);
          onBombAvoided?.(hole.index);
          // STRICT BLACKLIST: Under NO circumstances dispatch click!
          return;
        }

        // Other target detected
        onHoleStatusUpdate?.(hole.index, target.type, baseConfidence, false);

        // Check if confidence exceeds threshold and not in debounce
        if (baseConfidence >= settings.targetThreshold) {
          const now = Date.now();
          const lastClick = holeCooldownRef.current[hole.index] || 0;
          if (now - lastClick >= settings.debounceMs) {
            handleHitHole(hole.index, true);
          }
        }
      });
    }, 60); // 16 FPS ~ 60 FPS recognition rate

    return () => clearInterval(botInterval);
  }, [
    isPlaying,
    settings.autoEnabled,
    settings.bombThreshold,
    settings.targetThreshold,
    settings.debounceMs,
    handleHitHole,
    onHoleStatusUpdate,
    onBombAvoided,
  ]);

  return (
    <div className="relative w-full aspect-[9/16] max-w-[420px] mx-auto select-none overflow-hidden rounded-3xl shadow-2xl border-4 border-emerald-800/40 bg-gradient-to-b from-sky-400 via-emerald-400 to-green-600">
      {/* Background scenery matching game video: Sky, Clouds, Rainbow, Hills */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Rainbow arc */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full border-[18px] border-t-red-400 border-r-yellow-300 border-b-transparent border-l-cyan-300 opacity-30" />

        {/* Fluffy clouds */}
        <div className="absolute top-4 left-6 w-20 h-8 bg-white/70 rounded-full blur-[1px]" />
        <div className="absolute top-10 right-8 w-28 h-10 bg-white/60 rounded-full blur-[1px]" />

        {/* Top green rolling hill */}
        <div className="absolute top-28 -left-12 -right-12 h-36 bg-emerald-500 rounded-[50%] opacity-80" />
      </div>

      {/* Top Header Bar: Game status, Timer & Coins matching video */}
      <div className="relative z-10 px-4 pt-3 pb-2 flex items-center justify-between">
        {/* Timer progress pill */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
          <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center font-black text-white text-xs shadow">
            {timeLeft}
          </div>
          <div className="w-20 h-2.5 bg-gray-700/80 rounded-full overflow-hidden border border-white/20">
            <div
              className={`h-full transition-all duration-300 ${
                timeLeft < 8 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, (timeLeft / 30) * 100)}%` }}
            />
          </div>
        </div>

        {/* Coin Score Counter */}
        <div className="flex items-center gap-1.5 bg-amber-500/90 text-amber-950 font-black px-3.5 py-1 rounded-full shadow-lg border-2 border-amber-200">
          <span className="text-base">🪙</span>
          <span className="text-base tracking-wider font-mono font-bold text-white drop-shadow">
            {score}
          </span>
        </div>

        {/* Game control quick button */}
        <button
          onClick={() => {
            if (!isPlaying) {
              setTimeLeft(30);
              setScore(0);
              setActiveTargets([]);
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          }}
          className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-md transition-all active:scale-95 ${
            isPlaying ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {isPlaying ? '重置' : '开始对局'}
        </button>
      </div>

      {/* 12 Hole Arena Grid */}
      <div className="relative w-full h-[84%]">
        {HOLES_LAYOUT.map((hole) => {
          const target = activeTargets.find((t) => t.holeIndex === hole.index);
          const now = Date.now();
          const lastClick = holeCooldownRef.current[hole.index] || 0;
          const isCoolingDown = now - lastClick < settings.debounceMs;

          return (
            <div
              key={hole.index}
              style={{
                left: `${hole.xPercent}%`,
                top: `${hole.yPercent}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => handleHitHole(hole.index, false)}
              className="absolute w-24 h-24 flex items-center justify-center cursor-pointer group"
            >
              {/* Hole ground base */}
              <div className="absolute inset-x-0 bottom-1 h-14 pointer-events-none">
                <HoleBaseSvg />
              </div>

              {/* 280ms Debounce Cooldown Ring */}
              {isCoolingDown && (
                <div className="absolute inset-1 rounded-full border-2 border-dashed border-cyan-400 animate-spin pointer-events-none opacity-80" />
              )}

              {/* Emerging Target */}
              {target && (
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-150 ${
                    target.state === 'rising' ? 'scale-75 translate-y-4 opacity-50' : 'scale-100 translate-y-0 opacity-100'
                  }`}
                >
                  {target.type === 'normal_mole' && (
                    <NormalMoleSvg isHit={target.state === 'hit_stage1' || target.state === 'hit_stage2'} />
                  )}
                  {target.type === 'bucket_mole' && (
                    <BucketMoleSvg
                      isHitStage1={target.state === 'hit_stage1'}
                      isHitStage2={target.state === 'hit_stage2'}
                    />
                  )}
                  {target.type === 'clock' && <ClockSvg isHit={target.state === 'hit_stage1'} />}
                  {target.type === 'chest' && (
                    <ChestSvg
                      isHitStage1={target.state === 'hit_stage1'}
                      isHitStage2={target.state === 'hit_stage2'}
                    />
                  )}
                  {target.type === 'bomb' && <BombSvg isExploded={target.state === 'exploded'} />}
                </div>
              )}

              {/* Hole index badge */}
              <div className="absolute -bottom-2 px-1.5 py-0.5 rounded-full bg-black/40 text-[9px] font-mono font-medium text-emerald-200 pointer-events-none">
                #{hole.index}
              </div>
            </div>
          );
        })}

        {/* Floating text labels */}
        {floatingTexts.map((item) => (
          <div
            key={item.id}
            style={{
              left: `${item.xPercent}%`,
              top: `${item.yPercent}%`,
              transform: 'translate(-50%, -100%)',
              color: item.color,
            }}
            className="absolute pointer-events-none font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-bounce z-40 transition-all"
          >
            {item.text}
          </div>
        ))}

        {/* Simulated Accessibility 20ms Touch Ripples */}
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            style={{
              left: `${ripple.xPercent}%`,
              top: `${ripple.yPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute pointer-events-none z-30"
          >
            <div className="w-16 h-16 rounded-full border-4 border-amber-400 bg-amber-300/30 animate-ping" />
            {ripple.isDouble && (
              <div className="absolute inset-0 w-20 h-20 -left-2 -top-2 rounded-full border-2 border-cyan-400 bg-cyan-300/20 animate-ping delay-75" />
            )}
          </div>
        ))}

        {/* Animated Wooden Mallet Hammer */}
        {hammerPos && (
          <div
            style={{
              left: `${hammerPos.xPercent}%`,
              top: `${hammerPos.yPercent}%`,
              transform: 'translate(-30%, -60%)',
            }}
            className="absolute w-20 h-20 pointer-events-none z-50 drop-shadow-xl"
          >
            <HammerSvg isSwinging={hammerPos.isSwinging} />
          </div>
        )}
      </div>

      {/* Game Over Modal / Start Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-3xl shadow-xl mb-3">
            🐹
          </div>
          <h2 className="text-2xl font-black mb-1">欢乐打地鼠</h2>
          <p className="text-xs text-emerald-200 mb-4 max-w-xs">
            限时 30s，打到的地鼠越多得分越丰厚！小心不要打到炸弹！
          </p>

          <div className="bg-white/10 rounded-xl p-3 w-full max-w-xs mb-5 text-left text-xs space-y-1.5 border border-white/10">
            <div className="flex justify-between">
              <span className="text-gray-300">上局得分：</span>
              <span className="font-bold text-amber-400">{score} 分</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">辅助工具状态：</span>
              <span className={`font-bold ${settings.autoEnabled ? 'text-emerald-400' : 'text-gray-400'}`}>
                {settings.autoEnabled ? '🟢 自动点击已就绪' : '⚪ 手动模式'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setTimeLeft(30);
              setScore(0);
              setActiveTargets([]);
              setIsPlaying(true);
            }}
            className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 font-black text-base shadow-lg shadow-amber-500/30 hover:brightness-105 active:scale-95 transition-all"
          >
            开始打地鼠
          </button>
        </div>
      )}
    </div>
  );
};
