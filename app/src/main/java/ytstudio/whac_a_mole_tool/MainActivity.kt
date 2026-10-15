package ytstudio.whac_a_mole_tool

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ytstudio.whac_a_mole_tool.service.AutoClickAccessibilityService
import ytstudio.whac_a_mole_tool.service.FloatingOverlayService

/**
 * 主界面 Activity
 * 
 * 遵循 SRS 规范：
 * 1. 采用 Single Activity + Multiple Jetpack Compose Pages
 * 2. 必备配置界面 2 大内容：
 *    - 桌面悬浮窗权限：查看权限状态，未授予时一键进入配置界面
 *    - 无障碍自动点击服务：查看服务运行状态，未开启时一键进入配置界面
 * 3. 特征库规则展示与 OpenCV 核心识别参数调优
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MaterialTheme {
                MainComposeApp(
                    onCheckOverlayPermission = { checkOverlayPermission() },
                    onRequestOverlayPermission = { requestOverlayPermission() },
                    onCheckAccessibilityPermission = { checkAccessibilityService() },
                    onRequestAccessibilityPermission = { requestAccessibilityPermission() },
                    onStartFloatingOverlay = { startFloatingOverlay() }
                )
            }
        }
    }

    private fun checkOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivity(intent)
        }
    }

    private fun checkAccessibilityService(): Boolean {
        val am = getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_GENERIC)
        return enabledServices.any { it.resolveInfo.serviceInfo.packageName == packageName }
    }

    private fun requestAccessibilityPermission() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
    }

    private fun startFloatingOverlay() {
        val intent = Intent(this, FloatingOverlayService::class.java)
        startService(intent)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainComposeApp(
    onCheckOverlayPermission: () -> Boolean,
    onRequestOverlayPermission: () -> Unit,
    onCheckAccessibilityPermission: () -> Boolean,
    onRequestAccessibilityPermission: () -> Unit,
    onStartFloatingOverlay: () -> Unit
) {
    var hasOverlayPermission by remember { mutableStateOf(onCheckOverlayPermission()) }
    var hasAccessibility by remember { mutableStateOf(onCheckAccessibilityPermission()) }
    var selectedTab by remember { mutableStateOf(0) }

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
                    // 配置界面：两大权限状态与跳转
                    item {
                        Text("必要系统权限配置", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }

                    // 1. 桌面悬浮窗权限卡片
                    item {
                        PermissionCard(
                            title = "1. 桌面悬浮窗权限",
                            description = "允许工具悬浮在桌面及打地鼠游戏窗口上层，以便随时移动、启停与配置。",
                            isGranted = hasOverlayPermission,
                            buttonText = if (hasOverlayPermission) "权限已授予" else "前往授权",
                            onAction = onRequestOverlayPermission
                        )
                    }

                    // 2. 无障碍自动点击服务卡片
                    item {
                        PermissionCard(
                            title = "2. 无障碍自动点击服务",
                            description = "用于物理模拟屏幕 20ms 极速手势触摸，无需 Root，智能避开炸弹并双击铁桶破防。",
                            isGranted = hasAccessibility,
                            buttonText = if (hasAccessibility) "服务运行中" else "前往开启服务",
                            onAction = onRequestAccessibilityPermission
                        )
                    }

                    // 启动桌面悬浮窗操作
                    item {
                        Button(
                            onClick = onStartFloatingOverlay,
                            enabled = hasOverlayPermission && hasAccessibility,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("开启桌面悬浮辅助窗", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
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
}

@Composable
fun PermissionCard(
    title: String,
    description: String,
    isGranted: Boolean,
    buttonText: String,
    onAction: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(12.dp),
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
                    Text(if (isGranted) "已就绪" else "未配置", color = Color.White)
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = description, fontSize = 13.sp, color = Color(0xFF4B5563))
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedButton(
                onClick = onAction,
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = if (isGranted) Color(0xFF166534) else Color(0xFFDC2626)
                )
            ) {
                Text(buttonText)
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
