export type TargetType = 'normal_mole' | 'bucket_mole' | 'clock' | 'chest' | 'bomb';

export interface TargetMetadata {
  type: TargetType;
  name: string;
  enName: string;
  clicksRequired: number;
  scoreBonus: number;
  timeBonusSec?: number;
  description: string;
  actionCode: string;
  ruleSummary: string;
  color: string;
  isBlacklist?: boolean;
}

export const TARGET_METAS: Record<TargetType, TargetMetadata> = {
  normal_mole: {
    type: 'normal_mole',
    name: '普通地鼠',
    enName: 'Normal Mole',
    clicksRequired: 1,
    scoreBonus: 2,
    description: '标准地鼠，头部带有小果实标志，命中后击晕。',
    actionCode: 'AutoClickAccessibilityService.click(x, y)',
    ruleSummary: '只需点击 1 次 (+2分)，20ms 极速物理触摸。',
    color: '#EE8A22',
  },
  bucket_mole: {
    type: 'bucket_mole',
    name: '铁桶地鼠',
    enName: 'Bucket Mole',
    clicksRequired: 2,
    scoreBonus: 4,
    description: '头戴坚硬水桶/钢盔的地鼠，需快速双击破防并收分。',
    actionCode: 'AutoClickAccessibilityService.doubleClick(x, y, 75L)',
    ruleSummary: '必须点击 2 次 (第1次破桶破防，第2次击晕收分 +4分)，间隔 75ms 极速连击。',
    color: '#1C86D9',
  },
  clock: {
    type: 'clock',
    name: '闹钟',
    enName: 'Alarm Clock',
    clicksRequired: 1,
    scoreBonus: 0,
    timeBonusSec: 3,
    description: '金色双耳复古闹钟，击打后为对局争取宝贵的延续时间。',
    actionCode: 'AutoClickAccessibilityService.click(x, y)',
    ruleSummary: '只需点击 1 次，击打后游戏倒计时立即 +3 秒延时！',
    color: '#FFB300',
  },
  chest: {
    type: 'chest',
    name: '宝箱',
    enName: 'Treasure Chest',
    clicksRequired: 2,
    scoreBonus: 6,
    description: '系有金色丝带与问号的金锁神秘宝箱，内含大量金币奖励。',
    actionCode: 'AutoClickAccessibilityService.doubleClick(x, y, 75L)',
    ruleSummary: '必须点击 2 次 (第1次解开金锁，第2次完全爆开大礼包 +6分)，自动连招双击！',
    color: '#D32F2F',
  },
  bomb: {
    type: 'bomb',
    name: '炸弹',
    enName: 'Danger Bomb',
    clicksRequired: 0,
    scoreBonus: -50,
    description: '引线燃烧的骷髅铁球炸弹，击中直接炸伤扣分甚至中断连击！',
    actionCode: 'Strict Blacklist: No Dispatch (置信度 > 0.68 禁止点击)',
    ruleSummary: '0 次点击 (严格禁止点击，避雷黑名单)。OpenCV 第一优先级检测，置信度 > 0.68 时禁止向该洞派发任何点击。',
    color: '#4B6584',
    isBlacklist: true,
  },
};

export interface ActiveTarget {
  id: string;
  type: TargetType;
  holeIndex: number;
  spawnTime: number;
  lifetimeMs: number;
  state: 'rising' | 'idle' | 'hit_stage1' | 'hit_stage2' | 'retreating' | 'exploded';
  currentHp: number;
  maxHp: number;
  hitCount: number;
  x: number;
  y: number;
}

export interface HoleConfig {
  index: number;
  row: number;
  col: number;
  xPercent: number; // percentage in game canvas
  yPercent: number;
  label: string;
}

export interface HoleStatus {
  cooldownUntil: number; // timestamp
  isBlacklisted: boolean;
  detectedType: TargetType | null;
  confidence: number;
  lastClickTime: number;
}

export interface ToolSettings {
  autoEnabled: boolean;
  bombThreshold: number; // 0.68
  targetThreshold: number; // 0.75
  debounceMs: number; // 280
  doubleClickIntervalMs: number; // 75
  pyramidScales: number; // 5
  overlayPermissionGranted: boolean;
  accessibilityGranted: boolean;
  showVisionOverlay: boolean;
  gameSpeed: 'normal' | 'fast' | 'turbo';
  soundMuted: boolean;
}

export interface RecognitionResult {
  holeIndex: number;
  detectedType: TargetType;
  confidence: number;
  isBlacklisted: boolean;
  actionTaken: 'click' | 'double_click' | 'blocked' | 'cooldown_skip';
  timestamp: number;
  x: number;
  y: number;
}

export interface DispatchLog {
  id: string;
  timeStr: string;
  holeIndex: number;
  targetType: TargetType;
  confidence: number;
  action: string;
  status: 'dispatched' | 'blocked' | 'debounced';
  scoreDelta: number;
}

export interface FloatingWindowState {
  x: number;
  y: number;
  isExpanded: boolean;
  isMinimized: boolean;
}
