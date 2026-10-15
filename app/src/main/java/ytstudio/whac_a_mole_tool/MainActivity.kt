package ytstudio.whac_a_mole_tool

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import ytstudio.whac_a_mole_tool.service.AutoClickAccessibilityService
import ytstudio.whac_a_mole_tool.service.FloatingOverlayService
import java.lang.reflect.Method

/**
 * 主界面 Activity
 * 
 * 遵循 SRS 规范与深度 ROM 兼容架构：
 * 1. 采用 Single Activity + Multiple Jetpack Compose Pages
 * 2. 必备配置界面 2 大内容：
 *    - 桌面悬浮窗权限：多层级智能检测 (标准API + AppOps + 真实窗口探测 + 手动强制就绪)
 *    - 无障碍自动点击服务：多层级智能检测 (服务单例 + SecureSettings + AccessibilityManager全掩码 + 手动强制就绪)
 * 3. 完美兼容 Android 13/14/15 受限设置 (Restricted Settings) 与小米/华为/OPPO/VIVO 定制 ROM
 * 4. 防卡死机制：提供「手动确认已开启/强制通过」开关与未同步强制启动对话框，杜绝灰色卡死
 */
class MainActivity : ComponentActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    // 响应式权限状态变量
    private var hasOverlayPermission by mutableStateOf(false)
    private var hasAccessibility by mutableStateOf(false)

    // 手动强制就绪覆盖开关（应对定制ROM检测延迟或权限沙盒拦截）
    private var manualOverlayOverride by mutableStateOf(false)
    private var manualAccessibilityOverride by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        refreshPermissions()

        setContent {
            MaterialTheme {
                MainComposeApp(
                    hasOverlayPermission = hasOverlayPermission || manualOverlayOverride,
                    hasAccessibility = hasAccessibility || manualAccessibilityOverride,
                    isRealOverlayGranted = hasOverlayPermission,
                    isRealAccessibilityGranted = hasAccessibility,
                    manualOverlayOverride = manualOverlayOverride,
                    manualAccessibilityOverride = manualAccessibilityOverride,
                    onToggleManualOverlay = { manualOverlayOverride = !manualOverlayOverride },
                    onToggleManualAccessibility = { manualAccessibilityOverride = !manualAccessibilityOverride },
                    onRefreshPermissions = { refreshPermissions() },
                    onRequestOverlayPermission = { requestOverlayPermission() },
                    onRequestAccessibilityPermission = { requestAccessibilityPermission() },
                    onOpenAppDetailsSettings = { openAppDetailsSettings() },
                    onStartFloatingOverlay = { startFloatingOverlay() }
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // 从系统设置页面返回时，立刻重新检测两大权限状态
        refreshPermissions()
    }

    /**
     * 重新检测两大权限状态
     */
    private fun refreshPermissions() {
        hasOverlayPermission = checkOverlayPermission(this)
        hasAccessibility = checkAccessibilityService(this)
        Log.d(TAG, "权限刷新完成 - 悬浮窗: $hasOverlayPermission (覆盖: $manualOverlayOverride), 无障碍: $hasAccessibility (覆盖: $manualAccessibilityOverride)")
    }

    /**
     * 1. 深度多层级检测桌面悬浮窗权限
     * 策略 1: 标准 Settings.canDrawOverlays
     * 策略 2: AppOpsManager 系统 alert window 检查 (兼容 Android 6~14)
     * 策略 3: 小米 MIUI / 华为 / 魅族 反射 Op 检查 (OP 24 / OP 10021)
     * 策略 4: 极小透明窗口探测 (Ground-truth 终极真实探测)
     */
    private fun checkOverlayPermission(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true
        }

        // 策略 1: 标准 Android API
        try {
            if (Settings.canDrawOverlays(context)) {
                return true
            }
        } catch (e: Exception) {
            Log.w(TAG, "canDrawOverlays 检查异常: ${e.message}")
        }

        // 策略 2: AppOpsManager 降级检查
        try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
            if (appOps != null) {
                val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    appOps.unsafeCheckOpNoThrow(
                        AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                        Process.myUid(),
                        context.packageName
                    )
                } else {
                    @Suppress("DEPRECATION")
                    appOps.checkOpNoThrow(
                        AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                        Process.myUid(),
                        context.packageName
                    )
                }
                if (mode == AppOpsManager.MODE_ALLOWED) {
                    return true
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "AppOps 检查失败: ${e.message}")
        }

        // 策略 3: 小米 MIUI / 特殊定制 ROM 反射检查
        try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
            if (appOps != null) {
                val method: Method = AppOpsManager::class.java.getMethod(
                    "checkOp",
                    Int::class.javaPrimitiveType,
                    Int::class.javaPrimitiveType,
                    String::class.java
                )
                // 24 是 OP_SYSTEM_ALERT_WINDOW 内部索引
                val opAlert = method.invoke(appOps, 24, Process.myUid(), context.packageName) as? Int
                if (opAlert == AppOpsManager.MODE_ALLOWED) {
                    return true
                }
            }
        } catch (e: Exception) {
            // 忽略反射异常
        }

        // 策略 4: 极小测试 View 真实挂载探测 (最权威真实判定)
        try {
            val wm = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
            if (wm != null) {
                val testView = View(context)
                val params = WindowManager.LayoutParams(
                    0, 0,
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    } else {
                        @Suppress("DEPRECATION")
                        WindowManager.LayoutParams.TYPE_PHONE
                    },
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                    PixelFormat.TRANSPARENT
                )
                wm.addView(testView, params)
                wm.removeView(testView)
                return true
            }
        } catch (e: Exception) {
            // 若抛出 BadTokenException 或 SecurityException 则说明确实未授予
        }

        return false
    }

    /**
     * 适配各大定制 ROM 的悬浮窗权限跳转
     */
    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // 尝试 1: 直接定位到本应用悬浮窗设置
            try {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
                return
            } catch (e: Exception) {
                Log.w(TAG, "直接包名跳转失败，尝试 ROM 专属跳转: ${e.message}")
            }

            // 尝试 2: 小米 MIUI 专属权限编辑页
            try {
                val miuiIntent = Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                    setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity")
                    putExtra("extra_pkgname", packageName)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(miuiIntent)
                return
            } catch (e: Exception) {
                // 非 MIUI 或版本不匹配
            }

            // 尝试 3: 通用悬浮窗列表页
            try {
                val fallbackIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(fallbackIntent)
            } catch (ex: Exception) {
                // 终极保底: 应用详情页
                openAppDetailsSettings()
            }
        }
    }

    /**
     * 打开应用详情页 (用于处理 Android 13/14 的受限制设置 Restricted Settings)
     */
    private fun openAppDetailsSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            Toast.makeText(this, "Android 13/14+ 若权限置灰：请点击右上角三点 ->【允许受限制的设置】", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "无法打开设置，请在手机设置->应用管理中找到本应用", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * 2. 多重冗余检测无障碍自动点击服务
     * 依次检测：
     * ① AutoClickAccessibilityService 活跃单例 (Ground-truth 活跃标志)
     * ② AccessibilityManager 复合掩码匹配 (FEEDBACK_GENERIC, FEEDBACK_ALL_MASK, 0)
     * ③ 系统 Secure Settings 数据库匹配
     * ④ 系统已安装列表中已开启匹配
     */
    private fun checkAccessibilityService(context: Context): Boolean {
        // 判定 1: 活跃单例是否已连接运行 (最可靠证据)
        if (AutoClickAccessibilityService.isServiceRunning) {
            return true
        }

        // 判定 2: AccessibilityManager 全面掩码查询
        try {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
            if (am != null) {
                // 检测各种反馈掩码组合
                val masks = intArrayOf(
                    AccessibilityServiceInfo.FEEDBACK_GENERIC,
                    AccessibilityServiceInfo.FEEDBACK_ALL_MASK,
                    0,
                    AccessibilityServiceInfo.FEEDBACK_VISUAL,
                    AccessibilityServiceInfo.FEEDBACK_HAPTIC
                )
                for (mask in masks) {
                    val list = am.getEnabledAccessibilityServiceList(mask)
                    if (list.any { info ->
                        val servicePkg = info.resolveInfo?.serviceInfo?.packageName ?: ""
                        val serviceId = info.id ?: ""
                        servicePkg == context.packageName || serviceId.contains(context.packageName)
                    }) {
                        return true
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "AccessibilityManager 查询异常: ${e.message}")
        }

        // 判定 3: 系统 Secure Settings 数据库 (解决部分 ROM 单例启动微秒延迟)
        try {
            val accessibilityEnabled = Settings.Secure.getInt(
                context.contentResolver,
                Settings.Secure.ACCESSIBILITY_ENABLED,
                0
            )
            if (accessibilityEnabled == 1) {
                val settingValue = Settings.Secure.getString(
                    context.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                )
                if (!settingValue.isNullOrEmpty()) {
                    val splitter = TextUtils.SimpleStringSplitter(':')
                    splitter.setString(settingValue)
                    while (splitter.hasNext()) {
                        val accessibilityService = splitter.next()
                        if (accessibilityService.contains(context.packageName, ignoreCase = true) ||
                            accessibilityService.contains("AutoClickAccessibilityService", ignoreCase = true)) {
                            return true
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Secure Settings 查询异常: ${e.message}")
        }

        return false
    }

    private fun requestAccessibilityPermission() {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            Toast.makeText(this, "请在已安装的服务中找到「打地鼠辅助工具」并开启", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "无法自动打开无障碍设置，请在手机系统设置中手动开启", Toast.LENGTH_LONG).show()
        }
    }

    private fun startFloatingOverlay() {
        try {
            val intent = Intent(this, FloatingOverlayService::class.java)
            // 使用 startService，杜绝 startForegroundService 未即时调用 startForeground 导致的崩溃
            startService(intent)
            Toast.makeText(this, "悬浮辅助工具已开启，请进入打地鼠游戏畅玩！", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e(TAG, "启动悬浮窗失败", e)
            Toast.makeText(this, "启动悬浮窗失败: ${e.message}，请确认悬浮窗权限已就绪", Toast.LENGTH_LONG).show()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainComposeApp(
    hasOverlayPermission: Boolean,
    hasAccessibility: Boolean,
    isRealOverlayGranted: Boolean,
    isRealAccessibilityGranted: Boolean,
    manualOverlayOverride: Boolean,
    manualAccessibilityOverride: Boolean,
    onToggleManualOverlay: () -> Unit,
    onToggleManualAccessibility: () -> Unit,
    onRefreshPermissions: () -> Unit,
    onRequestOverlayPermission: () -> Unit,
    onRequestAccessibilityPermission: () -> Unit,
    onOpenAppDetailsSettings: () -> Unit,
    onStartFloatingOverlay: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    var showForceLaunchDialog by remember { mutableStateOf(false) }
    val lifecycleOwner = LocalLifecycleOwner.current

    // 生命周期监听：当 Activity 处于 ON_RESUME（从设置切回应用）时自动重新检测
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                onRefreshPermissions()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // 后台心跳检测：当处于权限配置页时，每隔 1000ms 自动检查一次权限状态
    LaunchedEffect(selectedTab) {
        if (selectedTab == 0) {
            while (isActive) {
                onRefreshPermissions()
                delay(1000)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = stringResource(R.string.app_name),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = stringResource(R.string.app_name_en),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    // 手动刷新按钮
                    IconButton(onClick = onRefreshPermissions) {
                        Text("🔄", fontSize = 16.sp)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    label = { Text("服务配置") },
                    icon = { Text("⚙️") }
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    label = { Text("特征库") },
                    icon = { Text("🎯") }
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    label = { Text("算法调优") },
                    icon = { Text("🧠") }
                )
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            when (selectedTab) {
                0 -> {
                    // 权限配置界面
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("必要系统权限配置", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            TextButton(onClick = onRefreshPermissions) {
                                Text("立即重新检测", fontSize = 12.sp)
                            }
                        }
                    }

                    // Android 13/14+ 受限设置特别提示条
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "💡 安卓 13/14/15 或国产系统提示：",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Color(0xFF1E40AF)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "1. 若无障碍显示「受限制的设置」无法点击开启：请点击下方【打开应用设置】，在右上角三点菜单中点击【允许受限制的设置】。\n2. 若您已在系统开启但此处仍显示未开启，可勾选各卡片中的「我已开启(强制就绪)」直接激活！",
                                    fontSize = 12.sp,
                                    color = Color(0xFF1E3A8A),
                                    lineHeight = 17.sp
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                OutlinedButton(
                                    onClick = onOpenAppDetailsSettings,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("打开应用设置 (解禁受限制设置)", fontSize = 12.sp)
                                }
                            }
                        }
                    }

                    // 1. 桌面悬浮窗权限卡片
                    item {
                        EnhancedPermissionCard(
                            title = "1. 桌面悬浮窗权限",
                            description = "允许工具悬浮在桌面及打地鼠游戏窗口上层，随时移动、启停与配置。",
                            isGranted = hasOverlayPermission,
                            isRealGranted = isRealOverlayGranted,
                            isManualOverride = manualOverlayOverride,
                            buttonText = if (hasOverlayPermission) "权限已就绪 (可再次配置)" else "前往授权",
                            onAction = onRequestOverlayPermission,
                            onToggleManual = onToggleManualOverlay,
                            onRecheck = onRefreshPermissions
                        )
                    }

                    // 2. 无障碍自动点击服务卡片
                    item {
                        EnhancedPermissionCard(
                            title = "2. 无障碍自动点击服务",
                            description = "用于物理模拟屏幕 20ms 极速手势触摸，无需 Root，智能避开炸弹并双击铁桶破防。",
                            isGranted = hasAccessibility,
                            isRealGranted = isRealAccessibilityGranted,
                            isManualOverride = manualAccessibilityOverride,
                            buttonText = if (hasAccessibility) "服务已就绪 (可再次配置)" else "前往开启服务",
                            onAction = onRequestAccessibilityPermission,
                            onToggleManual = onToggleManualAccessibility,
                            onRecheck = onRefreshPermissions
                        )
                    }

                    // 启动桌面悬浮窗操作
                    item {
                        val isAllReady = hasOverlayPermission && hasAccessibility
                        Button(
                            onClick = {
                                if (isAllReady) {
                                    onStartFloatingOverlay()
                                } else {
                                    // 即使检测未绿，点击也弹出强制启动选项，杜绝用户被卡死
                                    showForceLaunchDialog = true
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isAllReady) Color(0xFF16A34A) else Color(0xFF2563EB)
                            )
                        ) {
                            Text(
                                text = if (isAllReady) "开启桌面悬浮辅助窗" else "已开启权限？点击强制启动悬浮窗",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }
                1 -> {
                    item {
                        Text("特征库 (5类核心目标匹配规则)", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                    // 特征库项目展示
                    item {
                        FeatureItemCard("普通地鼠", "只需点击 1 次 (+2分)，20ms 物理极速触摸。")
                        FeatureItemCard("铁桶地鼠", "必须点击 2 次 (破防+收分 +4分)，75ms 极速自动连击。")
                        FeatureItemCard("闹钟", "只需点击 1 次，倒计时立即 +3 秒延时！")
                        FeatureItemCard("宝箱", "必须点击 2 次 (破金锁+爆金币 +6分)，自动连击双击。")
                        FeatureItemCard("炸弹 (禁点黑名单)", "0 次点击！第一优先级识别，置信度 > 0.68 严禁下发手势。")
                    }
                }
                2 -> {
                    item {
                        Text("OpenCV & 点击算法核心参数", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("炸弹防雷阈值: 0.68 (优先判定，大于则拉黑)")
                                Text("目标匹配阈值: 0.72 (TM_CCOEFF_NORMED)")
                                Text("单洞防抖冷却: 280ms (防止地鼠退洞动画二次误触)")
                                Text("破防双击间隔: 75ms (物理级极速手势)")
                                Text("金字塔多尺度: 5 阶动态缩放 (跨设备自适应)")
                            }
                        }
                    }
                }
            }
        }
    }

    // 强制启动确认对话框 (防卡死机制)
    if (showForceLaunchDialog) {
        AlertDialog(
            onDismissRequest = { showForceLaunchDialog = false },
            title = { Text("强制启动悬浮窗确认", fontWeight = FontWeight.Bold) },
            text = {
                Text("系统检测当前权限可能存在延迟同步。如果您已经在手机系统设置中开启了【悬浮窗】与【无障碍】服务，请点击下方【确认启动】直接开启悬浮窗。")
            },
            confirmButton = {
                Button(
                    onClick = {
                        showForceLaunchDialog = false
                        onStartFloatingOverlay()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A))
                ) {
                    Text("确认启动", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showForceLaunchDialog = false }) {
                    Text("再去检查")
                }
            }
        )
    }
}

@Composable
fun EnhancedPermissionCard(
    title: String,
    description: String,
    isGranted: Boolean,
    isRealGranted: Boolean,
    isManualOverride: Boolean,
    buttonText: String,
    onAction: () -> Unit,
    onToggleManual: () -> Unit,
    onRecheck: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isGranted) Color(0xFFF0FDF4) else Color(0xFFFEF2F2)
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = if (isGranted) Color(0xFF166534) else Color(0xFF991B1B)
                )
                Spacer(modifier = Modifier.weight(1f))
                Badge(
                    containerColor = if (isGranted) Color(0xFF22C55E) else Color(0xFFEF4444)
                ) {
                    Text(
                        if (isGranted) (if (isManualOverride && !isRealGranted) "已手动就绪" else "已就绪") else "未配置",
                        color = Color.White
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = description, fontSize = 13.sp, color = Color(0xFF4B5563))
            
            Spacer(modifier = Modifier.height(12.dp))

            // 核心修复: 手动覆盖切换行 (解决厂商ROM拦截/检测延迟卡死)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(if (isGranted) Color(0xFFDCFCE7) else Color(0xFFFEE2E2), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = if (isManualOverride) "已强制标记为已开启" else "系统已开启但未识别？",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isGranted) Color(0xFF15803D) else Color(0xFFB91C1C)
                    )
                    Text(
                        text = "勾选后直接通过检测，不再受限于厂商检测延迟",
                        fontSize = 10.sp,
                        color = Color(0xFF6B7280)
                    )
                }
                Switch(
                    checked = isManualOverride,
                    onCheckedChange = { onToggleManual() },
                    modifier = Modifier.height(28.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = onAction,
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = if (isGranted) Color(0xFF166534) else Color(0xFFDC2626)
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Text(buttonText, fontSize = 13.sp)
                }
                IconButton(onClick = onRecheck) {
                    Text("🔄", fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
fun FeatureItemCard(name: String, rule: String) {
    Card(
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(4.dp))
            Text(rule, fontSize = 12.sp, color = Color.Gray)
        }
    }
}
