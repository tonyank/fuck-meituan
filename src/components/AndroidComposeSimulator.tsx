import React, { useState } from 'react';
import { TARGET_METAS, TargetType, ToolSettings, DispatchLog } from '../types';
import {
  NormalMoleSvg,
  BucketMoleSvg,
  ClockSvg,
  ChestSvg,
  BombSvg,
} from '../assets/gameIcons';
import {
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AndroidComposeSimulatorProps {
  settings: ToolSettings;
  setSettings: React.Dispatch<React.SetStateAction<ToolSettings>>;
  dispatchLogs: DispatchLog[];
  onClearLogs: () => void;
  onLaunchFloatingTool: () => void;
}

export const AndroidComposeSimulator: React.FC<AndroidComposeSimulatorProps> = ({
  settings,
  setSettings,
  dispatchLogs,
  onClearLogs,
  onLaunchFloatingTool,
}) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'library' | 'algorithm' | 'logs'>('permissions');
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const handleGrantOverlay = () => {
    setSettings((s) => ({ ...s, overlayPermissionGranted: true }));
    setPermissionNotice('已模拟系统授予「桌面悬浮窗权限」 (android.permission.SYSTEM_ALERT_WINDOW)');
    setTimeout(() => setPermissionNotice(null), 3000);
  };

  const handleGrantAccessibility = () => {
    setSettings((s) => ({ ...s, accessibilityGranted: true }));
    setPermissionNotice('已模拟系统开启「无障碍自动点击服务」 (AutoClickAccessibilityService)');
    setTimeout(() => setPermissionNotice(null), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[740px]">
      {/* Android Device Status Bar Simulation */}
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80">
        <span>10:28</span>
        <div className="flex items-center gap-2">
          <span>ytstudio.whac_a_mole_tool</span>
          <span>5G</span>
          <span>100%</span>
        </div>
      </div>

      {/* Jetpack Compose TopAppBar */}
      <div className="bg-slate-800/90 backdrop-blur px-5 py-3 border-b border-slate-700/60 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            打地鼠辅助工具
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-normal">
              v1.0.0
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">Whac-A-Mole tool (Kotlin + Compose)</p>
        </div>

        <button
          onClick={() => setSettings((s) => ({ ...s, soundMuted: !s.soundMuted }))}
          className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
          title="音效开关"
        >
          {settings.soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Permission Notice Banner */}
      {permissionNotice && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{permissionNotice}</span>
        </div>
      )}

      {/* Compose Navigation Bar (Tabs) */}
      <div className="grid grid-cols-4 bg-slate-950/60 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('permissions')}
          className={`py-2.5 font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'permissions'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          服务配置
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`py-2.5 font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'library'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          特征库
        </button>
        <button
          onClick={() => setActiveTab('algorithm')}
          className={`py-2.5 font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'algorithm'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          算法调优
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2.5 font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'logs'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          手势日志
        </button>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200">
        {/* Tab 1: Permissions Configuration */}
        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 text-xs text-slate-300 leading-relaxed">
              根据系统需求规格说明书，本 app 免 Root 运行，无需联网权限（禁止 INTERNET）。运行前请确保以下两大核心服务已就绪：
            </div>

            {/* Android 13/14+ 受限设置特别提示条 */}
            <div className="bg-blue-950/40 border border-blue-500/40 rounded-2xl p-3 text-xs space-y-2">
              <div className="flex items-center gap-2 text-blue-300 font-bold">
                <span>💡 安卓 13/14/15 或国产系统（小米/华为/OPPO/VIVO）提示：</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                1. 若在真机上开启无障碍时提示「受限制的设置」或开关置灰：请进入手机【设置】→【应用管理】→【打地鼠辅助工具】→ 点击右上角三点菜单选择【允许受限制的设置】后再次开启。<br/>
                2. 若您已经在系统设置中打开，但系统检测存在延迟或沙盒阻隔，可直接开启卡片内的「强制通过/手动就绪」开关直接激活！
              </p>
            </div>

            {/* 1. 桌面悬浮窗权限卡片 */}
            <div
              className={`rounded-2xl p-4 border transition-all ${
                settings.overlayPermissionGranted
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                  : 'bg-rose-950/20 border-rose-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      settings.overlayPermissionGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">1. 桌面悬浮窗权限</h3>
                    <p className="text-[11px] text-slate-400 font-mono">Settings.canDrawOverlays(context)</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                    settings.overlayPermissionGranted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {settings.overlayPermissionGranted ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> 已就绪
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" /> 未配置
                    </>
                  )}
                </span>
              </div>

              <p className="text-xs text-slate-300 mb-3">
                允许本工具在系统桌面及打地鼠游戏窗口上层悬浮显示控制胶囊，支持任意拖拽贴边、启动、暂停与快速配置。
              </p>

              {/* 手动覆盖开关 */}
              <div className="mb-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">系统已开启但未识别？</div>
                  <div className="text-[10px] text-slate-400">勾选手动就绪，绕过厂商 ROM 检测延迟</div>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, overlayPermissionGranted: !s.overlayPermissionGranted }))}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    settings.overlayPermissionGranted ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.overlayPermissionGranted ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleGrantOverlay}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    settings.overlayPermissionGranted
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/40'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                  }`}
                >
                  <ExternalLink className="w-3 h-3" />
                  {settings.overlayPermissionGranted ? '权限已正常 (点击重新配置)' : '前往系统授权'}
                </button>
              </div>
            </div>

            {/* 2. 无障碍自动点击服务卡片 */}
            <div
              className={`rounded-2xl p-4 border transition-all ${
                settings.accessibilityGranted
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                  : 'bg-amber-950/20 border-amber-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      settings.accessibilityGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">2. 无障碍自动点击服务</h3>
                    <p className="text-[11px] text-slate-400 font-mono">AutoClickAccessibilityService</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                    settings.accessibilityGranted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {settings.accessibilityGranted ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> 服务运行中
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" /> 未开启
                    </>
                  )}
                </span>
              </div>

              <p className="text-xs text-slate-300 mb-3">
                基于 Android 无障碍手势派发（dispatchGesture）进行物理级 20ms 极速触摸模拟。具备 280ms 单洞防抖与 75ms 破防双连击。
              </p>

              {/* 手动覆盖开关 */}
              <div className="mb-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">系统已开启但未识别？</div>
                  <div className="text-[10px] text-slate-400">勾选手动就绪，立即启用无障碍点击通道</div>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, accessibilityGranted: !s.accessibilityGranted }))}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                    settings.accessibilityGranted ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.accessibilityGranted ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleGrantAccessibility}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    settings.accessibilityGranted
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/40'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                  }`}
                >
                  <ExternalLink className="w-3 h-3" />
                  {settings.accessibilityGranted ? '服务正常运行 (点击重新配置)' : '前往系统开启服务'}
                </button>
              </div>
            </div>

            {/* Launch Floating Overlay Button */}
            <div className="pt-2">
              <button
                onClick={onLaunchFloatingTool}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Layers className="w-4 h-4" />
                开启桌面悬浮辅助窗 (进入实机打地鼠)
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Feature Library (特征库) */}
        {activeTab === 'library' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400">
              包含 5 大预置特征模板与派发规则，严格遵循说明书规范：
            </div>

            {/* 1. 普通地鼠 */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3 flex gap-3 items-center">
              <div className="w-16 h-16 shrink-0 bg-amber-500/10 rounded-xl p-1 flex items-center justify-center border border-amber-500/20">
                <NormalMoleSvg />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">1. 普通地鼠</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    +2分 | 单击 1 次
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-1.5">
                  标准地鼠，头部带有小果实标志。只需点击 1 次。
                </p>
                <div className="font-mono text-[10px] text-cyan-300 bg-slate-900/80 px-2 py-1 rounded">
                  {TARGET_METAS.normal_mole.actionCode}
                </div>
              </div>
            </div>

            {/* 2. 铁桶地鼠 */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3 flex gap-3 items-center">
              <div className="w-16 h-16 shrink-0 bg-blue-500/10 rounded-xl p-1 flex items-center justify-center border border-blue-500/20">
                <BucketMoleSvg />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">2. 铁桶地鼠 (蓝头盔)</h4>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                    +4分 | 双击 2 次
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-1.5">
                  必须点击 2 次 (第1次破桶破防，第2次击晕地鼠收分)。
                </p>
                <div className="font-mono text-[10px] text-cyan-300 bg-slate-900/80 px-2 py-1 rounded">
                  {TARGET_METAS.bucket_mole.actionCode}
                </div>
              </div>
            </div>

            {/* 3. 闹钟 */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3 flex gap-3 items-center">
              <div className="w-16 h-16 shrink-0 bg-amber-500/10 rounded-xl p-1 flex items-center justify-center border border-amber-500/20">
                <ClockSvg />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">3. 闹钟</h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    +3秒延时 | 单击 1 次
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-1.5">
                  只需点击 1 次。击打后游戏倒计时立即 +3 秒延时！
                </p>
                <div className="font-mono text-[10px] text-cyan-300 bg-slate-900/80 px-2 py-1 rounded">
                  {TARGET_METAS.clock.actionCode}
                </div>
              </div>
            </div>

            {/* 4. 宝箱 */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-3 flex gap-3 items-center">
              <div className="w-16 h-16 shrink-0 bg-rose-500/10 rounded-xl p-1 flex items-center justify-center border border-rose-500/20">
                <ChestSvg />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-white">4. 宝箱</h4>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                    +6分 | 双击 2 次
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-1.5">
                  必须点击 2 次 (第1次破开金锁，第2次完全爆开大礼包)。
                </p>
                <div className="font-mono text-[10px] text-cyan-300 bg-slate-900/80 px-2 py-1 rounded">
                  {TARGET_METAS.chest.actionCode}
                </div>
              </div>
            </div>

            {/* 5. 炸弹 */}
            <div className="bg-slate-800/60 border border-red-500/50 rounded-2xl p-3 flex gap-3 items-center bg-red-950/10">
              <div className="w-16 h-16 shrink-0 bg-red-500/10 rounded-xl p-1 flex items-center justify-center border border-red-500/30">
                <BombSvg />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-red-400">5. 炸弹 (避雷黑名单)</h4>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                    🚫 严禁点击 (0次)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-1.5">
                  第一优先级判定炸弹特征，置信度超过 0.68 即拉黑该地洞，严禁下发点击手势。
                </p>
                <div className="font-mono text-[10px] text-red-300 bg-red-950/60 border border-red-500/30 px-2 py-1 rounded">
                  {TARGET_METAS.bomb.actionCode}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: OpenCV Algorithm Tuning */}
        {activeTab === 'algorithm' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              调节核心 OpenCV 多尺度金字塔与无障碍手势时序参数：
            </div>

            {/* Bomb Threshold Slider */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  智能防雷拉黑阈值 (置信度)
                </label>
                <span className="font-mono text-sm font-bold text-red-400">
                  {settings.bombThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.9"
                step="0.01"
                value={settings.bombThreshold}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, bombThreshold: parseFloat(e.target.value) }))
                }
                className="w-full accent-red-500"
              />
              <p className="text-[11px] text-slate-400">
                说明书规范默认值：0.68。置信度超过该值时，第一优先级拉黑该地洞，禁止下发任何点击。
              </p>
            </div>

            {/* Single Hole Debounce ms */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  单洞防抖冷却时间 (Debounce)
                </label>
                <span className="font-mono text-sm font-bold text-cyan-400">
                  {settings.debounceMs} ms
                </span>
              </div>
              <input
                type="range"
                min="150"
                max="500"
                step="10"
                value={settings.debounceMs}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, debounceMs: parseInt(e.target.value) }))
                }
                className="w-full accent-cyan-500"
              />
              <p className="text-[11px] text-slate-400">
                说明书规范默认值：280ms。防止击中后地鼠退洞动画未消失导致的二次误点击。
              </p>
            </div>

            {/* Double Click Interval ms */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  铁桶/宝箱破防双连击间隔
                </label>
                <span className="font-mono text-sm font-bold text-blue-400">
                  {settings.doubleClickIntervalMs} ms
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="120"
                step="5"
                value={settings.doubleClickIntervalMs}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, doubleClickIntervalMs: parseInt(e.target.value) }))
                }
                className="w-full accent-blue-500"
              />
              <p className="text-[11px] text-slate-400">
                说明书规范默认值：75ms~90ms 极速自动连击 2 次，破防后一波带走。
              </p>
            </div>

            {/* Reset to defaults */}
            <button
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  bombThreshold: 0.68,
                  targetThreshold: 0.75,
                  debounceMs: 280,
                  doubleClickIntervalMs: 75,
                  pyramidScales: 5,
                }))
              }
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 pt-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复说明书标准算法默认值 (0.68 / 280ms / 75ms)
            </button>
          </div>
        )}

        {/* Tab 4: Live Dispatch Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">实时手势派发与避雷日志 ({dispatchLogs.length})</span>
              <button
                onClick={onClearLogs}
                className="text-rose-400 hover:text-rose-300 text-[11px]"
              >
                清空日志
              </button>
            </div>

            {dispatchLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                暂无派发记录，请在实机打地鼠中启动辅助工具...
              </div>
            ) : (
              <div className="space-y-2 font-mono text-[11px]">
                {dispatchLogs.slice(-12).reverse().map((log) => {
                  const isBlocked = log.status === 'blocked';
                  return (
                    <div
                      key={log.id}
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        isBlocked
                          ? 'bg-red-950/20 border-red-500/40 text-red-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px]">{log.timeStr}</span>
                        <span className="font-bold">洞 #{log.holeIndex}</span>
                        <span>{TARGET_METAS[log.targetType].name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          置信度 {log.confidence.toFixed(2)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Jetpack Compose Bottom Bar status */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              settings.autoEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          {settings.autoEnabled ? '后台自动识别中' : '自动点击已暂停'}
        </span>
        <span className="font-mono text-[11px]">MediaProjection RGBA_8888</span>
      </div>
    </div>
  );
};
