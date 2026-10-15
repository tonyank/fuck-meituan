import React, { useState } from 'react';
import { ANDROID_SOURCE_FILES, AndroidFile } from '../data/androidSourceFiles';
import { FileCode, Download, Copy, Check, X, Folder, Sparkles } from 'lucide-react';
import JSZip from 'jszip';

interface AndroidCodeBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidCodeBrowserModal: React.FC<AndroidCodeBrowserModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<AndroidFile>(ANDROID_SOURCE_FILES[3]); // Default to AutoClickAccessibilityService
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add readme
      zip.file(
        'README.md',
        `# 打地鼠辅助工具 (Whac-A-Mole tool)

本项目为基于 Kotlin + Jetpack Compose + OpenCV + Accessibility Service 编写的原生 Android 辅助工具。
- 包名: ytstudio.whac_a_mole_tool
- 应用名: 打地鼠辅助工具
- 免 Root 物理手势模拟 (dispatchGesture 20ms)
- OpenCV 多尺度金字塔 12 洞 ROI 匹配
- 智能防雷避开炸弹 (置信度 > 0.68 黑名单)
- 280ms 单洞防抖冷却
- 75ms 破防双连击
- 桌面悬浮窗实时控制
- 严格杜绝网络权限 (完全离线无安全风险)

## 在 Android Studio 中运行：
1. 打开 Android Studio -> File -> Open... 选择解压后的根目录。
2. 同步 Gradle 依赖。
3. 部署安装至真机或模拟器。
4. 在应用中授予「桌面悬浮窗权限」并开启「打地鼠无障碍自动点击服务」。
5. 打开游戏开始畅玩！`
      );

      // Add all project source files
      ANDROID_SOURCE_FILES.forEach((f) => {
        zip.file(f.path, f.content);
      });

      // Include gradlew scripts and binary wrapper jar if accessible
      try {
        const [gradlewRes, gradlewBatRes, wrapperJarRes] = await Promise.all([
          fetch('/gradle-dist/gradlew'),
          fetch('/gradle-dist/gradlew.bat'),
          fetch('/gradle-dist/gradle/wrapper/gradle-wrapper.jar'),
        ]);

        if (gradlewRes.ok) {
          const gradlewBlob = await gradlewRes.blob();
          zip.file('gradlew', gradlewBlob, { unixPermissions: '755' });
        }
        if (gradlewBatRes.ok) {
          const gradlewBatBlob = await gradlewBatRes.blob();
          zip.file('gradlew.bat', gradlewBatBlob);
        }
        if (wrapperJarRes.ok) {
          const jarBlob = await wrapperJarRes.blob();
          zip.file('gradle/wrapper/gradle-wrapper.jar', jarBlob);
        }
      } catch (err) {
        console.warn('Could not bundle wrapper binary:', err);
      }

      // Generate blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ytstudio_whac_a_mole_tool_android_project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to create zip', e);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Android 原生工程源码浏览器
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  Kotlin + Compose + OpenCV
                </span>
              </h2>
              <p className="text-xs text-slate-400">package: ytstudio.whac_a_mole_tool (已严格剔除 INTERNET 权限)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isZipping ? '打包中...' : '一键下载 Android Studio 原生工程 (ZIP)'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Left Sidebar File Tree + Right Code View */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tree */}
          <div className="w-72 bg-slate-950/70 border-r border-slate-800/80 p-3 overflow-y-auto space-y-1">
            <div className="text-[11px] font-mono font-semibold text-slate-400 px-2 py-1.5 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              项目源文件结构
            </div>
            {ANDROID_SOURCE_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="truncate flex items-center gap-2">
                    <FileCode
                      className={`w-3.5 h-3.5 shrink-0 ${
                        file.category === 'kotlin'
                          ? 'text-purple-400'
                          : file.category === 'manifest'
                          ? 'text-emerald-400'
                          : file.category === 'res'
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                      }`}
                    />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-500">
                    {file.language}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            {/* File info bar */}
            <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-mono text-slate-300">
                <span className="text-emerald-400 font-bold">{selectedFile.path}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">{selectedFile.description}</span>
              </div>

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 font-mono text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '已复制' : '复制源码'}
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 bg-slate-950/80">
              <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre selection:bg-emerald-500/30 selection:text-emerald-200">
                {selectedFile.content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
