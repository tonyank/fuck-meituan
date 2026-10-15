import React, { useState, useRef, useEffect } from 'react';
import { ToolSettings } from '../types';
import { Play, Pause, Settings as SettingsIcon, Eye, EyeOff, ShieldAlert, Zap, Move } from 'lucide-react';

interface FloatingOverlayWidgetProps {
  settings: ToolSettings;
  setSettings: React.Dispatch<React.SetStateAction<ToolSettings>>;
  totalHits: number;
  bombsAvoided: number;
  onOpenSettings: () => void;
  holeStatuses: Record<number, { detectedType: string | null; confidence: number; isBlacklisted: boolean }>;
}

export const FloatingOverlayWidget: React.FC<FloatingOverlayWidgetProps> = ({
  settings,
  setSettings,
  totalHits,
  bombsAvoided,
  onOpenSettings,
  holeStatuses,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 140 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: Math.max(10, Math.min(window.innerWidth - 240, dragRef.current.initialX + dx)),
      y: Math.max(20, Math.min(window.innerHeight - 300, dragRef.current.initialY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
      }}
      className="absolute top-0 left-0 z-40 select-none transition-shadow"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl rounded-2xl p-2.5 text-white w-64 ring-1 ring-white/10">
        {/* Floating Window Header: Draggable */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 cursor-move"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                settings.autoEnabled
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                  : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
              }`}
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-tight flex items-center gap-1">
                打地鼠辅助工具
                <Move className="w-3 h-3 text-slate-400" />
              </span>
              <span className="text-[10px] text-slate-400 leading-none">
                {settings.autoEnabled ? 'OpenCV 自动分发中' : '已暂停 (待命)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-sky-400 hover:text-sky-300 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              {isExpanded ? '收起' : '展开'}
            </button>
          </div>
        </div>

        {/* Compact Quick Actions */}
        <div className="flex items-center gap-1.5 mb-2">
          <button
            onClick={() => setSettings((s) => ({ ...s, autoEnabled: !s.autoEnabled }))}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
              settings.autoEnabled
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {settings.autoEnabled ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                暂停辅助
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                启动辅助
              </>
            )}
          </button>

          <button
            onClick={() =>
              setSettings((s) => ({ ...s, showVisionOverlay: !s.showVisionOverlay }))
            }
            title="切换 OpenCV ROI 识别框蒙层"
            className={`p-1.5 rounded-xl border transition-colors ${
              settings.showVisionOverlay
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {settings.showVisionOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            title="打开 Compose 配置页面"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Expanded Telemetry & Hole Status Matrix */}
        {isExpanded && (
          <div className="space-y-2 pt-1 border-t border-slate-800 text-[11px]">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-slate-800/80 rounded-lg p-1.5 border border-slate-700/50 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400">总击中数</div>
                  <div className="font-bold text-white font-mono">{totalHits} 次</div>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-lg p-1.5 border border-slate-700/50 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <div>
                  <div className="text-[10px] text-slate-400">防雷拦截</div>
                  <div className="font-bold text-rose-400 font-mono">{bombsAvoided} 次</div>
                </div>
              </div>
            </div>

            {/* 12 Hole Real-Time Status Mini-Matrix */}
            <div>
              <div className="text-[10px] text-slate-400 mb-1 flex justify-between">
                <span>12 洞 ROI 监测状态:</span>
                <span className="text-emerald-400 font-mono text-[9px]">280ms防抖保护</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 12 }).map((_, i) => {
                  const status = holeStatuses[i];
                  const isBomb = status?.isBlacklisted;
                  const isTarget = !!status?.detectedType && !isBomb;

                  let bgClass = 'bg-slate-800 text-slate-500 border-slate-700';
                  if (isBomb) {
                    bgClass = 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse';
                  } else if (isTarget) {
                    bgClass = 'bg-emerald-500/30 text-emerald-300 border-emerald-400 font-bold';
                  }

                  return (
                    <div
                      key={i}
                      className={`h-5 rounded border text-[9px] flex items-center justify-center font-mono transition-colors ${bgClass}`}
                    >
                      {isBomb ? '💣' : isTarget ? '🎯' : `#${i}`}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Algorithm info badge */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>金字塔 5 阶匹配</span>
              <span className="font-mono text-cyan-300">手势: 20ms | 连击: 75ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
