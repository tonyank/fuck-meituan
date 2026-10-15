package ytstudio.whac_a_mole_tool.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import java.util.concurrent.ConcurrentHashMap

/**
 * 无障碍自动点击服务
 * 
 * 核心特性：
 * 1. dispatchGesture 物理级模拟：通过构造 Path 路径在 20ms 内派发点击，无需 Root，完全兼容各类 Canvas/WebGL 游戏。
 * 2. 去重与冷却防抖：加入 280ms 单洞防抖缓存，防止击中后地鼠退洞动画未消失导致的二次误点击。
 * 3. 蓝头盔/宝箱连击技能：支持 75ms~90ms 间隔快速双连击，直接一波带走。
 */
class AutoClickAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "AutoClickService"
        var instance: AutoClickAccessibilityService? = null
            private set

        val isServiceRunning: Boolean
            get() = instance != null

        // 280ms 单洞防抖缓存：Key 为地洞编号 0..11，Value 为上次派发点击的时间戳
        private val holeDebounceCache = ConcurrentHashMap<Int, Long>()
        private const val DEFAULT_DEBOUNCE_MS = 280L

        /**
         * 检查该地洞是否处于冷却中 (防止击中后地鼠退洞动画未消失导致的二次误点击)
         */
        fun canClickHole(holeIndex: Int, cooldownMs: Long = DEFAULT_DEBOUNCE_MS): Boolean {
            val now = System.currentTimeMillis()
            val lastClick = holeDebounceCache[holeIndex] ?: 0L
            if (now - lastClick >= cooldownMs) {
                holeDebounceCache[holeIndex] = now
                return true
            }
            return false
        }

        /**
         * 单次点击：极速 20ms 物理触摸模拟 (+2分 普通地鼠 / +3秒 闹钟)
         */
        fun click(x: Float, y: Float, callback: ((Boolean) -> Unit)? = null) {
            val service = instance ?: run {
                Log.w(TAG, "AccessibilityService 未运行，无法派发点击")
                callback?.invoke(false)
                return
            }
            service.performClickGesture(x, y, durationMs = 20L, callback = callback)
        }

        /**
         * 快速双连击：用于击破铁桶地鼠(+4分)或宝箱(+6分)
         * 第1次破防，间隔 intervalMs(默认 75ms) 后再次点击收分
         */
        fun doubleClick(x: Float, y: Float, intervalMs: Long = 75L, callback: ((Boolean) -> Unit)? = null) {
            val service = instance ?: run {
                Log.w(TAG, "AccessibilityService 未运行，无法派发连击")
                callback?.invoke(false)
                return
            }
            service.performDoubleClickGesture(x, y, intervalMs, callback)
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "打地鼠无障碍辅助点击服务已连接绑定")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // 无需捕获窗口内容，纯手势派发
    }

    override fun onInterrupt() {
        Log.w(TAG, "打地鼠无障碍服务被中断")
        instance = null
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        holeDebounceCache.clear()
        Log.i(TAG, "打地鼠无障碍服务已销毁")
    }

    /**
     * 物理级 20ms 触摸手势模拟
     */
    private fun performClickGesture(x: Float, y: Float, durationMs: Long = 20L, callback: ((Boolean) -> Unit)?) {
        val path = Path().apply {
            moveTo(x, y)
        }
        val stroke = GestureDescription.StrokeDescription(path, 0L, durationMs)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()

        dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                super.onCompleted(gestureDescription)
                callback?.invoke(true)
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                super.onCompleted(gestureDescription)
                callback?.invoke(false)
            }
        }, null)
    }

    /**
     * 连续两次 20ms 触摸手势，间隔指定毫秒数 (默认 75ms)
     */
    private fun performDoubleClickGesture(x: Float, y: Float, intervalMs: Long, callback: ((Boolean) -> Unit)?) {
        val path1 = Path().apply { moveTo(x, y) }
        val path2 = Path().apply { moveTo(x, y) }

        val stroke1 = GestureDescription.StrokeDescription(path1, 0L, 20L)
        val stroke2 = GestureDescription.StrokeDescription(path2, intervalMs + 20L, 20L)

        val gesture = GestureDescription.Builder()
            .addStroke(stroke1)
            .addStroke(stroke2)
            .build()

        dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                super.onCompleted(gestureDescription)
                callback?.invoke(true)
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                super.onCompleted(gestureDescription)
                callback?.invoke(false)
            }
        }, null)
    }
}
