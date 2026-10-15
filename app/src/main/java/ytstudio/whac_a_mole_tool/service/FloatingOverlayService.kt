package ytstudio.whac_a_mole_tool.service

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.WindowManager
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner

/**
 * 桌面悬浮窗服务
 * 
 * 核心特性：
 * 1. 悬浮状运行于桌面：可自由在屏幕边缘移动/贴边
 * 2. 快捷操作：启动/暂停/配置 自动点击工具
 * 3. 采用 Jetpack Compose 渲染现代化悬浮胶囊与控制小面板
 */
class FloatingOverlayService : LifecycleService() {

    companion object {
        var isOverlayShowing = false
            private set
    }

    private lateinit var windowManager: WindowManager
    private lateinit var overlayParams: WindowManager.LayoutParams
    private lateinit var composeView: ComposeView

    private var isExpanded by mutableStateOf(false)
    private var isBotActive by mutableStateOf(true)

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        setupFloatingWindow()
        isOverlayShowing = true
    }

    private fun setupFloatingWindow() {
        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        overlayParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 30
            y = 200
        }

        composeView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@FloatingOverlayService)
            setViewTreeSavedStateRegistryOwner(this@FloatingOverlayService)
            setContent {
                FloatingPillContent(
                    isBotActive = isBotActive,
                    isExpanded = isExpanded,
                    onToggleActive = { isBotActive = !isBotActive },
                    onToggleExpand = { isExpanded = !isExpanded },
                    onOpenSettings = {
                        val intent = packageManager.getLaunchIntentForPackage(packageName)
                        intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                    },
                    onDragDelta = { dx, dy ->
                        overlayParams.x += dx.toInt()
                        overlayParams.y += dy.toInt()
                        windowManager.updateViewLayout(this, overlayParams)
                    }
                )
            }
        }

        windowManager.addView(composeView, overlayParams)
    }

    override fun onDestroy() {
        super.onDestroy()
        isOverlayShowing = false
        if (::composeView.isInitialized) {
            windowManager.removeView(composeView)
        }
    }
}

@Composable
fun FloatingPillContent(
    isBotActive: Boolean,
    isExpanded: Boolean,
    onToggleActive: () -> Unit,
    onToggleExpand: () -> Unit,
    onOpenSettings: () -> Unit,
    onDragDelta: (Float, Float) -> Unit
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xEE1E293B)),
        elevation = CardDefaults.cardElevation(8.dp),
        modifier = Modifier
            .pointerInput(Unit) {
                detectDragGestures { change, dragAmount ->
                    change.consume()
                    onDragDelta(dragAmount.x, dragAmount.y)
                }
            }
            .padding(4.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterVertically
        ) {
            // 胶囊主栏
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 运行状态指示灯
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(if (isBotActive) Color(0xFF10B981) else Color(0xFFF59E0B))
                )

                Text(
                    text = if (isBotActive) "打地鼠运行中" else "已暂停",
                    color = Color.White,
                    fontSize = 12.sp
                )

                // 启动 / 暂停 切换按钮
                Button(
                    onClick = onToggleActive,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isBotActive) Color(0xFFDC2626) else Color(0xFF16A34A)
                    ),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    modifier = Modifier.height(28.dp)
                ) {
                    Text(if (isBotActive) "暂停" else "启动", fontSize = 11.sp)
                }

                // 展开更多设置
                TextButton(
                    onClick = onToggleExpand,
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                    modifier = Modifier.height(28.dp)
                ) {
                    Text(if (isExpanded) "收起" else "展开", color = Color(0xFF93C5FD), fontSize = 11.sp)
                }
            }

            // 展开后的微调面板
            if (isExpanded) {
                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider(color = Color(0x33FFFFFF))
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("防雷: 0.68 | 防抖: 280ms", color = Color(0xFFCBD5E1), fontSize = 10.sp)
                    Button(
                        onClick = onOpenSettings,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp),
                        modifier = Modifier.height(26.dp)
                    ) {
                        Text("主配置", fontSize = 10.sp)
                    }
                }
            }
        }
    }
}
