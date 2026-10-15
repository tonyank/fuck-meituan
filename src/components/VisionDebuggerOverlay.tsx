import React from 'react';
import { HOLES_LAYOUT } from './GameCanvas';
import { ActiveTarget, TARGET_METAS, ToolSettings } from '../types';

interface VisionDebuggerOverlayProps {
  settings: ToolSettings;
  activeTargets: ActiveTarget[];
  holeStatuses: Record<number, { detectedType: string | null; confidence: number; isBlacklisted: boolean }>;
}

export const VisionDebuggerOverlay: React.FC<VisionDebuggerOverlayProps> = ({
  settings,
  activeTargets,
  holeStatuses,
}) => {
  if (!settings.showVisionOverlay) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-3xl">
      {/* Top CV Stats Bar */}
      <div className="absolute top-12 left-4 right-4 bg-slate-950/85 backdrop-blur-md rounded-lg p-2 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-white">OpenCV 4.9.0 ROI Pipeline</span>
        </div>
        <div className="flex items-center gap-3">
          <span>金字塔: 5层 (0.75x~1.3x)</span>
          <span className="text-red-400 font-semibold">防雷阈值: &gt;{settings.bombThreshold}</span>
          <span className="text-cyan-300 font-semibold">冷却: {settings.debounceMs}ms</span>
        </div>
      </div>

      {/* 12 ROI Bounding Boxes */}
      {HOLES_LAYOUT.map((hole) => {
        const target = activeTargets.find((t) => t.holeIndex === hole.index);
        const status = holeStatuses[hole.index];
        const isBomb = status?.isBlacklisted || target?.type === 'bomb';
        const hasTarget = !!target;

        const borderColor = isBomb
          ? 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
          : hasTarget
          ? 'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
          : 'border-slate-400/40 border-dashed';

        const labelColor = isBomb
          ? 'bg-red-600 text-white'
          : hasTarget
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-800/80 text-slate-300';

        const confidence = status?.confidence
          ? status.confidence.toFixed(2)
          : target
          ? (0.84 + Math.random() * 0.1).toFixed(2)
          : null;

        return (
          <div
            key={hole.index}
            style={{
              left: `${hole.xPercent}%`,
              top: `${hole.yPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute w-24 h-24 pointer-events-none"
          >
            {/* ROI Box */}
            <div className={`w-full h-full rounded-xl border-2 transition-all ${borderColor}`}>
              {/* Corner crosshairs */}
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-current" />
              <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-current" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-current" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-current" />

              {/* Tag Label */}
              <div className="absolute -top-4 left-0 right-0 flex justify-center">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight shadow ${labelColor}`}>
                  {isBomb
                    ? `[炸弹 ${confidence || '0.89'} 🚫黑名单]`
                    : target
                    ? `[${TARGET_METAS[target.type].name} ${confidence || '0.87'}]`
                    : `ROI #${hole.index}`}
                </span>
              </div>

              {/* Dispatch Action Hint */}
              {target && !isBomb && (
                <div className="absolute -bottom-3 left-0 right-0 flex justify-center">
                  <span className="px-1 py-0.2 rounded bg-cyan-900/90 border border-cyan-400/50 text-cyan-200 text-[8px] font-mono">
                    {target.type === 'bucket_mole' || target.type === 'chest'
                      ? '⚡ 75ms双击'
                      : '👆 20ms单击'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
