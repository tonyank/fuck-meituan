/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { FloatingOverlayWidget } from './components/FloatingOverlayWidget';
import { VisionDebuggerOverlay } from './components/VisionDebuggerOverlay';
import { AndroidComposeSimulator } from './components/AndroidComposeSimulator';
import { AndroidCodeBrowserModal } from './components/AndroidCodeBrowserModal';
import { ActiveTarget, DispatchLog, TargetType, TARGET_METAS, ToolSettings } from './types';
import {
  Gamepad2,
  Smartphone,
  Columns,
  Code2,
  Eye,
  EyeOff,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Download,
  Info,
} from 'lucide-react';

export default function App() {
  // App view modes: 'split' (both game + compose), 'game' (game focused), 'compose' (compose focused)
  const [viewMode, setViewMode] = useState<'split' | 'game' | 'compose'>('split');

  // Tool core settings
  const [settings, setSettings] = useState<ToolSettings>({
    autoEnabled: true,
    bombThreshold: 0.68,
    targetThreshold: 0.72,
    debounceMs: 280,
    doubleClickIntervalMs: 75,
    pyramidScales: 5,
    overlayPermissionGranted: true,
    accessibilityGranted: true,
    showVisionOverlay: true,
    gameSpeed: 'normal',
    soundMuted: false,
  });

  // Game state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [score, setScore] = useState<number>(142);
  const [timeLeft, setTimeLeft] = useState<number>(26);
  const [activeTargets, setActiveTargets] = useState<ActiveTarget[]>([]);

  // Telemetry stats
  const [totalHits, setTotalHits] = useState<number>(38);
  const [bombsAvoided, setBombsAvoided] = useState<number>(14);
  const [combos, setCombos] = useState<number>(12);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([
    {
      id: 'init-1',
      timeStr: '10:28:12',
      holeIndex: 4,
      targetType: 'normal_mole',
      confidence: 0.89,
      action: '20ms 单击 (+2分)',
      status: 'dispatched',
      scoreDelta: 2,
    },
    {
      id: 'init-2',
      timeStr: '10:28:13',
      holeIndex: 7,
      targetType: 'bomb',
      confidence: 0.94,
      action: '🚫 避雷黑名单 (严禁点击)',
      status: 'blocked',
      scoreDelta: 0,
    },
    {
      id: 'init-3',
      timeStr: '10:28:14',
      holeIndex: 1,
      targetType: 'bucket_mole',
      confidence: 0.86,
      action: '⚡ 75ms 破防双连击 (+4分)',
      status: 'dispatched',
      scoreDelta: 4,
    },
  ]);

  // Live 12 hole detection statuses for visual overlays and matrix
  const [holeStatuses, setHoleStatuses] = useState<
    Record<number, { detectedType: string | null; confidence: number; isBlacklisted: boolean }>
  >({});

  // Code modal state
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Callback when target is hit
  const handleTargetHit = useCallback(
    (holeIndex: number, type: TargetType, scoreDelta: number, isDouble: boolean) => {
      setTotalHits((prev) => prev + 1);
      if (isDouble) {
        setCombos((prev) => prev + 1);
      }

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const logItem: DispatchLog = {
        id: Math.random().toString(),
        timeStr,
        holeIndex,
        targetType: type,
        confidence: 0.85 + Math.random() * 0.12,
        action: isDouble
          ? `⚡ ${settings.doubleClickIntervalMs}ms 双击 (+${scoreDelta}分)`
          : `👆 20ms 单击 (+${scoreDelta}分)`,
        status: 'dispatched',
        scoreDelta,
      };

      setDispatchLogs((prev) => [...prev.slice(-30), logItem]);
    },
    [settings.doubleClickIntervalMs]
  );

  // Callback when bomb is avoided by OpenCV
  const handleBombAvoided = useCallback((holeIndex: number) => {
    setBombsAvoided((prev) => prev + 1);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const logItem: DispatchLog = {
      id: Math.random().toString(),
      timeStr,
      holeIndex,
      targetType: 'bomb',
      confidence: 0.88 + Math.random() * 0.1,
      action: '🚫 智能防雷拦截 (严禁点击)',
      status: 'blocked',
      scoreDelta: 0,
    };
    setDispatchLogs((prev) => [...prev.slice(-30), logItem]);
  }, []);

  // Update hole CV state
  const handleHoleStatusUpdate = useCallback(
    (holeIndex: number, detectedType: TargetType | null, confidence: number, isBlacklisted: boolean) => {
      setHoleStatuses((prev) => ({
        ...prev,
        [holeIndex]: { detectedType, confidence, isBlacklisted },
      }));
    },
    []
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Global Navigation Bar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-xl shadow-lg shadow-emerald-900/30 font-bold">
            🐹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white tracking-tight">打地鼠辅助工具</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/30">
                免Root · 悬浮窗 · OpenCV
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              ytstudio.whac_a_mole_tool (Kotlin + Jetpack Compose)
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'split'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            双屏联动工作台
          </button>
          <button
            onClick={() => setViewMode('game')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'game'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            实机对局 + 悬浮窗
          </button>
          <button
            onClick={() => setViewMode('compose')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'compose'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            原生 Compose 界面
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Auto Clicker quick switch */}
          <button
            onClick={() => setSettings((s) => ({ ...s, autoEnabled: !s.autoEnabled }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              settings.autoEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {settings.autoEnabled ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {settings.autoEnabled ? '自动辅助: 运行中' : '自动辅助: 已暂停'}
          </button>

          {/* OpenCV Vision overlay toggle */}
          <button
            onClick={() => setSettings((s) => ({ ...s, showVisionOverlay: !s.showVisionOverlay }))}
            className={`p-2 rounded-xl border transition-colors ${
              settings.showVisionOverlay
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="OpenCV ROI 识别蒙层"
          >
            {settings.showVisionOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Mute toggle */}
          <button
            onClick={() => setSettings((s) => ({ ...s, soundMuted: !s.soundMuted }))}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="音效开关"
          >
            {settings.soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Source Code Modal */}
          <button
            onClick={() => setIsCodeModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-900/30 transition-all active:scale-95"
          >
            <Code2 className="w-4 h-4" />
            <span className="hidden sm:inline">查看/导出 Android 源码</span>
            <span className="sm:hidden">源码</span>
          </button>
        </div>
      </header>

      {/* Real-Time Live Status Telemetry Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-slate-300">低时延虚拟显示 (MediaProjection)</span>
            <span className="font-mono text-emerald-400 text-[11px]">PixelFormat.RGBA_8888 零拷贝</span>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-slate-400">
            <span>
              防雷黑名单阈值:{' '}
              <strong className="text-red-400 font-mono">&gt;{settings.bombThreshold}</strong>
            </span>
            <span>
              单洞防抖冷却:{' '}
              <strong className="text-cyan-400 font-mono">{settings.debounceMs}ms</strong>
            </span>
            <span>
              双击破防间隔:{' '}
              <strong className="text-blue-400 font-mono">{settings.doubleClickIntervalMs}ms</strong>
            </span>
            <span>
              网络权限:{' '}
              <strong className="text-emerald-400 font-mono">严格禁止 (完全离线)</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-300">
            <Zap className="w-3.5 h-3.5" />
            <span>自动命中: {totalHits}</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>避雷拦截: {bombsAvoided}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-300">
            <Flame className="w-3.5 h-3.5" />
            <span>双击破防: {combos}</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col justify-center">
        {/* Mobile View Switcher if screen is small */}
        <div className="flex md:hidden items-center justify-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs mb-4">
          <button
            onClick={() => setViewMode('game')}
            className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 ${
              viewMode === 'game' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            游戏与悬浮窗
          </button>
          <button
            onClick={() => setViewMode('compose')}
            className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 ${
              viewMode === 'compose' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Compose配置
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Game Screen + Floating Tool Overlay */}
          {(viewMode === 'split' || viewMode === 'game') && (
            <div
              className={`relative flex flex-col items-center ${
                viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
              }`}
            >
              <div className="w-full flex items-center justify-between mb-2 px-2">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-white">
                    实机打地鼠运行 (4行×3列 12洞 ROI 空间裁剪)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  可直接点击测试，或由辅助工具自动分发手势
                </span>
              </div>

              {/* Game Viewport Container with Floating Overlay */}
              <div className="relative w-full max-w-[420px] aspect-[9/16] rounded-3xl shadow-2xl border-2 border-slate-700/60 overflow-hidden bg-slate-900">
                {/* Playable Whac-A-Mole Game Canvas */}
                <GameCanvas
                  settings={settings}
                  activeTargets={activeTargets}
                  setActiveTargets={setActiveTargets}
                  score={score}
                  setScore={setScore}
                  timeLeft={timeLeft}
                  setTimeLeft={setTimeLeft}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  onTargetHit={handleTargetHit}
                  onBombAvoided={handleBombAvoided}
                  onHoleStatusUpdate={handleHoleStatusUpdate}
                />

                {/* Real-time OpenCV Vision Bounding Boxes & Confidence tags */}
                <VisionDebuggerOverlay
                  settings={settings}
                  activeTargets={activeTargets}
                  holeStatuses={holeStatuses}
                />

                {/* The Android Floating Overlay Window (Can be dragged, expanded, toggled) */}
                <FloatingOverlayWidget
                  settings={settings}
                  setSettings={setSettings}
                  totalHits={totalHits}
                  bombsAvoided={bombsAvoided}
                  onOpenSettings={() => setViewMode('compose')}
                  holeStatuses={holeStatuses}
                />
              </div>

              {/* Bottom Instructions badge */}
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  💡 <strong>悬浮窗体验提示：</strong>点击悬浮窗顶栏可自由拖拽位置；点击「暂停/启动」切换辅助；悬浮窗实时感知 12 洞状态并在 20ms 内派发点击。
                </span>
              </div>
            </div>
          )}

          {/* Right Column: Android Jetpack Compose Phone Interface */}
          {(viewMode === 'split' || viewMode === 'compose') && (
            <div
              className={`flex flex-col ${
                viewMode === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
              }`}
            >
              <div className="w-full flex items-center justify-between mb-2 px-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-white">
                    Android Jetpack Compose 辅助主控端 (Single Activity)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono">
                  已适配 Android 14/15 规范
                </span>
              </div>

              {/* Android Phone Frame Simulator */}
              <AndroidComposeSimulator
                settings={settings}
                setSettings={setSettings}
                dispatchLogs={dispatchLogs}
                onClearLogs={() => setDispatchLogs([])}
                onLaunchFloatingTool={() => {
                  setViewMode('split');
                  setSettings((s) => ({ ...s, autoEnabled: true }));
                  if (!isPlaying) {
                    setTimeLeft(30);
                    setScore(0);
                    setIsPlaying(true);
                  }
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Code Browser Modal */}
      <AndroidCodeBrowserModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  );
}
