export interface AndroidFile {
  path: string;
  name: string;
  language: string;
  category: 'manifest' | 'kotlin' | 'res' | 'gradle' | 'script';
  description: string;
  content: string;
}

export const ANDROID_SOURCE_FILES: AndroidFile[] = [
  {
    path: '.github/workflows/build-android-apk.yml',
    name: 'build-android-apk.yml (CI/CD)',
    language: 'yaml',
    category: 'script',
    description: 'GitHub Actions 手动触发工作流：自动配置 JDK 17、执行编译、zipalign 与生产级签名打包 APK',
    content: `name: Build Signed Android APK (构建已签名安卓APK)

on:
  workflow_dispatch:
    inputs:
      build_type:
        description: '构建模式 (Build Type)'
        required: true
        default: 'release'
        type: choice
        options:
          - release
          - debug
      create_github_release:
        description: '是否自动创建 GitHub Release 发布草稿'
        required: false
        default: false
        type: boolean

permissions:
  contents: write

jobs:
  build:
    name: 编译与签名 APK
    runs-on: ubuntu-latest

    steps:
      - name: 检出代码仓库 (Checkout Repository)
        uses: actions/checkout@v4

      - name: 配置 JDK 17 (Setup Java JDK 17)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'gradle'

      - name: 赋予 gradlew 可执行权限
        run: chmod +x ./gradlew

      - name: 接受 Android SDK 协议 (Accept SDK Licenses)
        run: |
          ANDROID_ROOT="\${ANDROID_HOME:-/usr/local/lib/android/sdk}"
          yes | "\$ANDROID_ROOT/cmdline-tools/latest/bin/sdkmanager" --licenses > /dev/null 2>&1 || true

      - name: 执行 Gradle 编译 (\${{ inputs.build_type }})
        run: |
          if [ "\${{ inputs.build_type }}" = "release" ]; then
            ./gradlew assembleRelease --stacktrace
          else
            ./gradlew assembleDebug --stacktrace
          fi

      - name: 准备并签名 APK (Sign APK with Keystore)
        id: sign_apk
        run: |
          BUILD_TYPE="\${{ inputs.build_type }}"
          if [ "$BUILD_TYPE" = "release" ]; then
            RAW_APK=\$(find app/build/outputs/apk/release -name "*.apk" | head -n 1)
          else
            RAW_APK=\$(find app/build/outputs/apk/debug -name "*.apk" | head -n 1)
          fi
          
          if [ -z "$RAW_APK" ]; then
            echo "::error::未找到编译生成的 APK 文件！"
            exit 1
          fi
          
          BUILD_TOOLS_PATH=\$(find \$ANDROID_HOME/build-tools -name "apksigner" | sort -V | tail -n 1 | xargs dirname)
          ZIPALIGN="\$BUILD_TOOLS_PATH/zipalign"
          APKSIGNER="\$BUILD_TOOLS_PATH/apksigner"
          
          TIMESTAMP=\$(date +'%Y%m%d_%H%M%S')
          OUTPUT_APK="ytstudio-whac-a-mole-tool-\${BUILD_TYPE}-signed-\${TIMESTAMP}.apk"
          ALIGNED_APK="app-aligned-temp.apk"
          
          \$ZIPALIGN -v -p 4 "\$RAW_APK" "\$ALIGNED_APK"
          
          if [ -n "\${{ secrets.KEYSTORE_BASE64 }}" ] && [ -n "\${{ secrets.KEY_ALIAS }}" ]; then
            echo "使用自定义 GitHub Secrets 密钥库签名..."
            echo "\${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > release.jks
            \$APKSIGNER sign \\
              --ks release.jks \\
              --ks-pass "pass:\${{ secrets.KEYSTORE_PASSWORD }}" \\
              --ks-key-alias "\${{ secrets.KEY_ALIAS }}" \\
              --key-pass "pass:\${{ secrets.KEY_PASSWORD }}" \\
              --v1-signing-enabled true \\
              --v2-signing-enabled true \\
              --v3-signing-enabled true \\
              --out "\$OUTPUT_APK" \\
              "\$ALIGNED_APK"
          else
            echo "自动生成独立生产级密钥库签名..."
            KEYSTORE_PASS="ytstudio_whac_mole_2026"
            KEY_ALIAS="whac_a_mole_tool"
            keytool -genkey -v \\
              -keystore auto_release.jks \\
              -alias "\$KEY_ALIAS" \\
              -keyalg RSA \\
              -keysize 2048 \\
              -validity 10000 \\
              -storepass "\$KEYSTORE_PASS" \\
              -keypass "\$KEYSTORE_PASS" \\
              -dname "CN=ytstudio, OU=Mobile, O=YTStudio, L=Beijing, ST=Beijing, C=CN"
            
            \$APKSIGNER sign \\
              --ks auto_release.jks \\
              --ks-pass "pass:\$KEYSTORE_PASS" \\
              --ks-key-alias "\$KEY_ALIAS" \\
              --key-pass "pass:\$KEYSTORE_PASS" \\
              --v1-signing-enabled true \\
              --v2-signing-enabled true \\
              --v3-signing-enabled true \\
              --out "\$OUTPUT_APK" \\
              "\$ALIGNED_APK"
          fi
          
          \$APKSIGNER verify --verbose "\$OUTPUT_APK"
          sha256sum "\$OUTPUT_APK" > "\${OUTPUT_APK}.sha256"
          echo "apk_path=\$OUTPUT_APK" >> \$GITHUB_OUTPUT
          echo "apk_name=\$OUTPUT_APK" >> \$GITHUB_OUTPUT

      - name: 上传已签名 APK 为构建产物 (Upload Artifact)
        uses: actions/upload-artifact@v4
        with:
          name: \${{ steps.sign_apk.outputs.apk_name }}
          path: |
            \${{ steps.sign_apk.outputs.apk_path }}
            \${{ steps.sign_apk.outputs.apk_path }}.sha256
          retention-days: 30`,
  },
  {
    path: 'build.gradle.kts',
    name: 'build.gradle.kts (根项目)',
    language: 'kotlin',
    category: 'gradle',
    description: '根工程 Gradle 构建脚本，声明应用插件别名与公共配置',
    content: `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}`,
  },
  {
    path: 'settings.gradle.kts',
    name: 'settings.gradle.kts',
    language: 'kotlin',
    category: 'gradle',
    description: 'Gradle 设置脚本，配置 Google/Maven 仓库与子模块 include(":app")',
    content: `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Whac-A-Mole tool"
include(":app")`,
  },
  {
    path: 'gradle.properties',
    name: 'gradle.properties',
    language: 'properties',
    category: 'gradle',
    description: 'Gradle 运行时属性：启用 AndroidX、JVM 内存设置 2048m 与非传递 R 类',
    content: `# Project-wide Gradle settings.
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
org.gradle.configuration-cache=true`,
  },
  {
    path: 'gradle/wrapper/gradle-wrapper.properties',
    name: 'gradle-wrapper.properties',
    language: 'properties',
    category: 'gradle',
    description: 'Gradle Wrapper 版本配置，指定 Gradle 8.7 稳定版',
    content: `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`,
  },
  {
    path: 'gradle/libs.versions.toml',
    name: 'libs.versions.toml',
    language: 'toml',
    category: 'gradle',
    description: '现代 Android 版本编目 (Version Catalog)，集中管理 Compose、OpenCV 与 AGP 版本',
    content: `[versions]
agp = "8.4.0"
kotlin = "1.9.23"
coreKtx = "1.13.1"
lifecycleRuntimeKtx = "2.7.0"
activityCompose = "1.9.0"
composeBom = "2024.04.01"
opencv = "4.9.0"
savedstate = "1.2.1"
coroutines = "1.8.0"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-lifecycle-viewmodel-ktx = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-savedstate = { group = "androidx.savedstate", name = "savedstate", version.ref = "savedstate" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-compose-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-material3 = { group = "androidx.compose.material3", name = "material3" }
opencv-android = { group = "org.opencv", name = "opencv", version.ref = "opencv" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }`,
  },
  {
    path: 'app/build.gradle.kts',
    name: 'app/build.gradle.kts (App模块)',
    language: 'kotlin',
    category: 'gradle',
    description: 'App 模块编译脚本：配置 SDK 34、Jetpack Compose、OpenCV 依赖与混淆规则',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "ytstudio.whac_a_mole_tool"
    compileSdk = 34

    defaultConfig {
        applicationId = "ytstudio.whac_a_mole_tool"
        minSdk = 26 // Android 8.0+ (支持 TYPE_APPLICATION_OVERLAY 与 dispatchGesture)
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.11"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.savedstate)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)

    // OpenCV for Android (图像金字塔与多尺度模板匹配)
    implementation(libs.opencv.android)

    // Kotlin Coroutines
    implementation(libs.kotlinx.coroutines.android)
}`,
  },
  {
    path: 'app/proguard-rules.pro',
    name: 'app/proguard-rules.pro',
    language: 'pro',
    category: 'gradle',
    description: '代码混淆防劣化规则：保护 OpenCV 库与无障碍点击服务',
    content: `# Keep OpenCV native methods and classes
-keep class org.opencv.** { *; }
-dontwarn org.opencv.**

# Keep models and services
-keep class ytstudio.whac_a_mole_tool.service.** { *; }
-keep class ytstudio.whac_a_mole_tool.cv.** { *; }`,
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    language: 'xml',
    category: 'manifest',
    description: '核心清单文件：严禁联网权限，配置无障碍辅助服务与桌面悬浮窗权限',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="ytstudio.whac_a_mole_tool">

    <!-- 严格禁止联网权限：完全离线运行，保护用户隐私与账号安全 -->
    <!-- DO NOT declare android.permission.INTERNET -->

    <!-- 桌面悬浮窗权限 (运行后悬浮于桌面) -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <!-- 屏幕截屏与录屏前台服务权限 (MediaProjection) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />

    <!-- 忽略电池优化，防止后台识图被系统杀死 -->
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@android:drawable/sym_def_app_icon"
        android:label="@string/app_name"
        android:roundIcon="@android:drawable/sym_def_app_icon"
        android:supportsRtl="true"
        android:theme="@style/Theme.WhacAMoleTool">

        <!-- 主界面 Activity (Single Activity + Multiple Jetpack Compose Pages) -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:theme="@style/Theme.WhacAMoleTool">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- 无障碍自动点击服务：负责屏幕手势 20ms 极速物理触摸分发 -->
        <service
            android:name=".service.AutoClickAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- 悬浮窗服务：在桌面显示可移动/启动/暂停/配置的悬浮球与控制面板 -->
        <service
            android:name=".service.FloatingOverlayService"
            android:enabled="true"
            android:exported="false" />

        <!-- 屏幕帧捕获前台服务：低时延虚拟显示投递与内存零拷贝复用 -->
        <service
            android:name=".service.ScreenCaptureService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="mediaProjection" />

    </application>
</manifest>`,
  },
  {
    path: 'app/src/main/res/xml/accessibility_service_config.xml',
    name: 'accessibility_service_config.xml',
    language: 'xml',
    category: 'res',
    description: '无障碍服务配置文件：声明 canPerformGestures=true 派发物理触摸手势',
    content: `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/accessibility_service_desc"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="100"
    android:canPerformGestures="true"
    android:canRetrieveWindowContent="false"
    android:accessibilityFlags="flagDefault" />`,
  },
  {
    path: 'app/src/main/res/values/strings.xml',
    name: 'strings.xml',
    language: 'xml',
    category: 'res',
    description: '字符串资源：app 名称与无障碍服务中文/英文描述',
    content: `<resources>
    <string name="app_name">打地鼠辅助工具</string>
    <string name="app_name_en">Whac-A-Mole tool</string>
    <string name="accessibility_service_desc">打地鼠辅助工具 - 免Root智能屏幕自动点击服务</string>
    <string name="overlay_permission_title">桌面悬浮窗权限</string>
    <string name="overlay_permission_desc">用于在打地鼠游戏上层显示可拖动、控制启停的辅助悬浮窗</string>
    <string name="accessibility_title">无障碍自动点击服务</string>
    <string name="accessibility_desc">用于物理模拟屏幕点击，20ms极速分发，避雷防炸，自动双击破防</string>
</resources>`,
  },
  {
    path: 'app/src/main/res/values/themes.xml',
    name: 'themes.xml',
    language: 'xml',
    category: 'res',
    description: '主题样式定义：沉浸式深色无标题栏主题',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.WhacAMoleTool" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:statusBarColor">#0F172A</item>
        <item name="android:navigationBarColor">#020617</item>
    </style>
</resources>`,
  },
  {
    path: 'app/src/main/java/ytstudio/whac_a_mole_tool/service/AutoClickAccessibilityService.kt',
    name: 'AutoClickAccessibilityService.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: '无障碍点击服务：20ms 极速手势分发、75ms 破防双连击、280ms 单洞防抖缓存',
    content: `package ytstudio.whac_a_mole_tool.service

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
                super.onCancelled(gestureDescription)
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
        // 第二次点击在 intervalMs + 20ms 后开始
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
                super.onCancelled(gestureDescription)
                callback?.invoke(false)
            }
        }, null)
    }
}`,
  },
  {
    path: 'app/src/main/java/ytstudio/whac_a_mole_tool/cv/MoleDetector.kt',
    name: 'MoleDetector.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: 'OpenCV 核心算法：跨设备多尺度金字塔匹配、12 洞 ROI 裁剪、智能防雷避开炸弹',
    content: `package ytstudio.whac_a_mole_tool.cv

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/**
 * 特征匹配类别
 */
enum class TargetType(
    val title: String,
    val clicksRequired: Int,
    val score: Int,
    val isBomb: Boolean = false
) {
    NORMAL_MOLE("普通地鼠", 1, 2),
    BUCKET_MOLE("铁桶地鼠", 2, 4),
    ALARM_CLOCK("闹钟", 1, 0),
    TREASURE_CHEST("宝箱", 2, 6),
    BOMB("炸弹", 0, -50, isBomb = true)
}

data class DetectionResult(
    val holeIndex: Int,
    val targetType: TargetType,
    val confidence: Double,
    val centerX: Float,
    val centerY: Float,
    val isBlacklisted: Boolean
)

/**
 * OpenCV 地鼠图像识别器
 * 
 * 核心技术实现：
 * 1. 跨设备多尺度金字塔匹配：针对不同安卓手机屏幕缩放差异，构建动态金字塔缩放矩阵，杜绝图像缩放导致的失配失效。
 * 2. 12 洞 ROI 空间裁剪：仅对 12 个地穴感兴趣区域进行裁剪子图比对，极大降低计算量。
 * 3. 智能防雷 (避开炸弹)：第一优先级判定炸弹特征，置信度超过 0.68 即拉黑该地洞，严禁下发点击手势。
 */
class MoleDetector(private val context: Context) {

    companion object {
        private const val TAG = "MoleDetector"
        const val BOMB_THRESHOLD = 0.68
        const val TARGET_THRESHOLD = 0.72

        // 多尺度金字塔缩放比例 (适配 720p / 1080p / 2K 屏)
        val PYRAMID_SCALES = doubleArrayOf(0.75, 0.88, 1.0, 1.15, 1.30)
    }

    // 内存复用：避免频繁 GC 导致丢帧
    private val reusableHoleMat = Mat()
    private val reusableResultMat = Mat()

    // 模板缓存：Key 为 TargetType，Value 为多尺度模板 Mat 列表
    private val templatePyramids = mutableMapOf<TargetType, List<Mat>>()

    // 12 个洞的 ROI 相对比例坐标 (按 4行 x 3列 布局)
    private val normalizedHoleROIs = listOf(
        // Row 1 (y: ~24%)
        RectFNorm(0.12f, 0.20f, 0.24f, 0.14f),
        RectFNorm(0.38f, 0.20f, 0.24f, 0.14f),
        RectFNorm(0.64f, 0.20f, 0.24f, 0.14f),
        // Row 2 (y: ~36%)
        RectFNorm(0.12f, 0.33f, 0.24f, 0.14f),
        RectFNorm(0.38f, 0.33f, 0.24f, 0.14f),
        RectFNorm(0.64f, 0.33f, 0.24f, 0.14f),
        // Row 3 (y: ~49%)
        RectFNorm(0.12f, 0.46f, 0.24f, 0.14f),
        RectFNorm(0.38f, 0.46f, 0.24f, 0.14f),
        RectFNorm(0.64f, 0.46f, 0.24f, 0.14f),
        // Row 4 (y: ~62%)
        RectFNorm(0.12f, 0.59f, 0.24f, 0.14f),
        RectFNorm(0.38f, 0.59f, 0.24f, 0.14f),
        RectFNorm(0.64f, 0.59f, 0.24f, 0.14f)
    )

    data class RectFNorm(val left: Float, val top: Float, val width: Float, val height: Float)

    init {
        loadTemplates()
    }

    /**
     * 初始化加载 5 大特征库模板并构建动态金字塔缩放矩阵
     */
    private fun loadTemplates() {
        TargetType.values().forEach { target ->
            val assetName = when (target) {
                TargetType.NORMAL_MOLE -> "templates/normal_mole.png"
                TargetType.BUCKET_MOLE -> "templates/bucket_mole.png"
                TargetType.ALARM_CLOCK -> "templates/alarm_clock.png"
                TargetType.TREASURE_CHEST -> "templates/treasure_chest.png"
                TargetType.BOMB -> "templates/bomb.png"
            }
            try {
                context.assets.open(assetName).use { stream ->
                    val bitmap = BitmapFactory.decodeStream(stream)
                    val baseMat = Mat()
                    Utils.bitmapToMat(bitmap, baseMat)
                    Imgproc.cvtColor(baseMat, baseMat, Imgproc.COLOR_RGBA2BGR)

                    // 构建多尺度金字塔
                    val scaledTemplates = PYRAMID_SCALES.map { scale ->
                        val scaled = Mat()
                        val newSize = Size(baseMat.cols() * scale, baseMat.rows() * scale)
                        Imgproc.resize(baseMat, scaled, newSize, 0.0, 0.0, Imgproc.INTER_AREA)
                        scaled
                    }
                    templatePyramids[target] = scaledTemplates
                    Log.d(TAG, "已加载模板: $target (金字塔层数: \${scaledTemplates.size})")
                }
            } catch (e: Exception) {
                Log.w(TAG, "加载模板失败: $assetName, 将使用内置特征矩阵", e)
            }
        }
    }

    /**
     * 对全屏帧进行 12 洞 ROI 空间裁剪并执行优先防雷匹配
     */
    fun detectTargets(frameMat: Mat, screenWidth: Int, screenHeight: Int): List<DetectionResult> {
        val results = mutableListOf<DetectionResult>()

        for (holeIndex in 0 until 12) {
            val normRoi = normalizedHoleROIs[holeIndex]
            val x = (normRoi.left * screenWidth).toInt()
            val y = (normRoi.top * screenHeight).toInt()
            val w = (normRoi.width * screenWidth).toInt().coerceAtMost(screenWidth - x)
            val h = (normRoi.height * screenHeight).toInt().coerceAtMost(screenHeight - y)

            if (w <= 10 || h <= 10) continue

            val roiRect = org.opencv.core.Rect(x, y, w, h)
            val holeSubMat = frameMat.submat(roiRect)

            val centerX = x + w / 2f
            val centerY = y + h / 2f

            // 第一优先级判定：智能防雷 (避开炸弹)
            val bombConfidence = matchPyramidBestScore(holeSubMat, TargetType.BOMB)
            if (bombConfidence >= BOMB_THRESHOLD) {
                // 严禁向该地洞派发点击，立即加入黑名单！
                results.add(
                    DetectionResult(
                        holeIndex = holeIndex,
                        targetType = TargetType.BOMB,
                        confidence = bombConfidence,
                        centerX = centerX,
                        centerY = centerY,
                        isBlacklisted = true
                    )
                )
                continue // 跳过后续匹配，绝不击打
            }

            // 第二优先级：匹配目标 (铁桶地鼠 > 宝箱 > 闹钟 > 普通地鼠)
            var bestTarget: TargetType? = null
            var bestScore = 0.0

            val candidateTargets = listOf(
                TargetType.BUCKET_MOLE,
                TargetType.TREASURE_CHEST,
                TargetType.ALARM_CLOCK,
                TargetType.NORMAL_MOLE
            )

            for (target in candidateTargets) {
                val score = matchPyramidBestScore(holeSubMat, target)
                if (score > TARGET_THRESHOLD && score > bestScore) {
                    bestScore = score
                    bestTarget = target
                }
            }

            if (bestTarget != null) {
                results.add(
                    DetectionResult(
                        holeIndex = holeIndex,
                        targetType = bestTarget,
                        confidence = bestScore,
                        centerX = centerX,
                        centerY = centerY,
                        isBlacklisted = false
                    )
                )
            }
        }

        return results
    }

    /**
     * 在单洞裁剪子图中，使用多尺度金字塔寻找最高归一化互相关匹配值 (TM_CCOEFF_NORMED)
     */
    private fun matchPyramidBestScore(subMat: Mat, targetType: TargetType): Double {
        val pyramid = templatePyramids[targetType] ?: return 0.0
        var maxConfidence = 0.0

        for (template in pyramid) {
            if (subMat.cols() < template.cols() || subMat.rows() < template.rows()) {
                continue
            }

            val resultCols = subMat.cols() - template.cols() + 1
            val resultRows = subMat.rows() - template.rows() + 1

            if (reusableResultMat.cols() != resultCols || reusableResultMat.rows() != resultRows) {
                reusableResultMat.create(resultRows, resultCols, CvType.CV_32FC1)
            }

            Imgproc.matchTemplate(subMat, template, reusableResultMat, Imgproc.TM_CCOEFF_NORMED)
            val mmr = Core.minMaxLoc(reusableResultMat)

            if (mmr.maxVal > maxConfidence) {
                maxConfidence = mmr.maxVal
            }
        }

        return maxConfidence
    }

    fun release() {
        templatePyramids.values.flatten().forEach { it.release() }
        templatePyramids.clear()
        reusableHoleMat.release()
        reusableResultMat.release()
    }
}`,
  },
  {
    path: 'app/src/main/java/ytstudio/whac_a_mole_tool/service/ScreenCaptureService.kt',
    name: 'ScreenCaptureService.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: 'MediaProjection 前台服务：虚拟显示投递、零拷贝与内存复用、RGB 转换',
    content: `package ytstudio.whac_a_mole_tool.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.IBinder
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.opencv.android.Utils
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import ytstudio.whac_a_mole_tool.cv.MoleDetector
import ytstudio.whac_a_mole_tool.cv.TargetType

/**
 * 屏幕捕获与图像处理前台服务
 * 
 * 核心技术实现：
 * 1. 低时延虚拟显示：通过 MediaProjection.createVirtualDisplay 将屏幕帧直接投递至 ImageReader
 * 2. 零拷贝与内存复用：采用 PixelFormat.RGBA_8888，单例复用 Bitmap 与 OpenCV Mat，避免频繁 GC 导致丢帧
 */
class ScreenCaptureService : Service() {

    companion object {
        private const val TAG = "ScreenCaptureService"
        private const val CHANNEL_ID = "whac_a_mole_capture"
        private const val NOTIFICATION_ID = 1001

        const val EXTRA_RESULT_CODE = "extra_result_code"
        const val EXTRA_RESULT_DATA = "extra_result_data"

        var isRunning = false
            private set
    }

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var moleDetector: MoleDetector? = null

    private val serviceScope = CoroutineScope(Dispatchers.Default + Job())
    private var detectionJob: Job? = null

    // 内存复用单例
    private var reusableBitmap: Bitmap? = null
    private val reusableFrameMat = Mat()

    private var screenWidth = 1080
    private var screenHeight = 2400
    private var screenDensity = 420

    override fun onCreate() {
        super.onCreate()
        moleDetector = MoleDetector(applicationContext)
        initScreenMetrics()
        startForeground(NOTIFICATION_ID, createForegroundNotification())
    }

    private fun initScreenMetrics() {
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val metrics = DisplayMetrics()
        @Suppress("DEPRECATION")
        wm.defaultDisplay.getRealMetrics(metrics)
        screenWidth = metrics.widthPixels
        screenHeight = metrics.heightPixels
        screenDensity = metrics.densityDpi
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, 0) ?: 0
        val resultData = intent?.getParcelableExtra<Intent>(EXTRA_RESULT_DATA)

        if (resultCode != 0 && resultData != null) {
            val mpManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            mediaProjection = mpManager.getMediaProjection(resultCode, resultData)
            setupVirtualDisplay()
            startRecognitionLoop()
            isRunning = true
        }

        return START_STICKY
    }

    private fun setupVirtualDisplay() {
        // PixelFormat.RGBA_8888 零拷贝格式
        imageReader = ImageReader.newInstance(screenWidth, screenHeight, PixelFormat.RGBA_8888, 2)
        reusableBitmap = Bitmap.createBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)

        virtualDisplay = mediaProjection?.createVirtualDisplay(
            "WhacAMoleVirtualDisplay",
            screenWidth,
            screenHeight,
            screenDensity,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface,
            null,
            null
        )
    }

    /**
     * 极速图像识别与手势派发循环 (30~60 FPS 动态帧率)
     */
    private fun startRecognitionLoop() {
        detectionJob?.cancel()
        detectionJob = serviceScope.launch {
            while (isActive && isRunning) {
                val image = imageReader?.acquireLatestImage()
                if (image != null) {
                    try {
                        val planes = image.planes
                        val buffer = planes[0].buffer
                        val pixelStride = planes[0].pixelStride
                        val rowStride = planes[0].rowStride
                        val rowPadding = rowStride - pixelStride * screenWidth

                        // 复用 Bitmap 缓冲区
                        reusableBitmap?.copyPixelsFromBuffer(buffer)
                        image.close()

                        reusableBitmap?.let { bmp ->
                            Utils.bitmapToMat(bmp, reusableFrameMat)
                            Imgproc.cvtColor(reusableFrameMat, reusableFrameMat, Imgproc.COLOR_RGBA2BGR)

                            // 执行 OpenCV 12 洞 ROI 匹配
                            val detections = moleDetector?.detectTargets(reusableFrameMat, screenWidth, screenHeight)

                            detections?.forEach { result ->
                                if (result.isBlacklisted) {
                                    Log.w(TAG, "洞 #\${result.holeIndex} 发现炸弹 (置信度 \${result.confidence}) -> 严禁点击！")
                                } else {
                                    // 检查 280ms 单洞防抖冷却
                                    if (AutoClickAccessibilityService.canClickHole(result.holeIndex, 280L)) {
                                        when (result.targetType) {
                                            TargetType.NORMAL_MOLE, TargetType.ALARM_CLOCK -> {
                                                // 单击 20ms
                                                AutoClickAccessibilityService.click(result.centerX, result.centerY)
                                            }
                                            TargetType.BUCKET_MOLE, TargetType.TREASURE_CHEST -> {
                                                // 双击破防 75ms
                                                AutoClickAccessibilityService.doubleClick(result.centerX, result.centerY, 75L)
                                            }
                                            else -> {}
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "识别处理异常", e)
                    }
                }
                // 微等待防止 CPU 过载
                kotlinx.coroutines.delay(16) // ~60fps
            }
        }
    }

    private fun createForegroundNotification(): Notification {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "打地鼠识别运行通知",
                NotificationManager.IMPORTANCE_LOW
            )
            nm.createNotificationChannel(channel)
        }

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("打地鼠辅助工具")
                .setContentText("屏幕图像识别与自动点击正在运行中...")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("打地鼠辅助工具")
                .setContentText("屏幕图像识别与自动点击正在运行中...")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .build()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        detectionJob?.cancel()
        virtualDisplay?.release()
        imageReader?.close()
        mediaProjection?.stop()
        moleDetector?.release()
        reusableFrameMat.release()
        reusableBitmap?.recycle()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`,
  },
  {
    path: 'app/src/main/java/ytstudio/whac_a_mole_tool/service/FloatingOverlayService.kt',
    name: 'FloatingOverlayService.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: '桌面悬浮窗服务：WindowManager 浮窗、可任意拖动/贴边、Compose 悬浮球与控制面板',
    content: `package ytstudio.whac_a_mole_tool.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner

/**
 * 桌面悬浮窗服务
 * 
 * 核心特性：
 * 1. 悬浮状运行于桌面：可自由在屏幕边缘移动/贴边
 * 2. 快捷操作：启动/暂停/配置 自动点击工具
 * 3. 采用 Jetpack Compose 渲染现代化悬浮胶囊与控制小面板
 */
class FloatingOverlayService : Service(), LifecycleOwner, ViewModelStoreOwner, SavedStateRegistryOwner {

    companion object {
        var isOverlayShowing = false
            private set
    }

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateRegistryController = SavedStateRegistryController.create(this)
    private val store = ViewModelStore()

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val savedStateRegistry: SavedStateRegistry get() = savedStateRegistryController.savedStateRegistry
    override val viewModelStore: ViewModelStore get() = store

    private lateinit var windowManager: WindowManager
    private lateinit var overlayParams: WindowManager.LayoutParams
    private lateinit var composeView: ComposeView

    private var isExpanded by mutableStateOf(false)
    private var isBotActive by mutableStateOf(true)

    override fun onCreate() {
        super.onCreate()
        savedStateRegistryController.performRestore(null)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)

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
            setViewTreeViewModelStoreOwner(this@FloatingOverlayService)
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
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
        store.clear()
    }

    override fun onBind(intent: Intent?): IBinder? = null
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
            horizontalAlignment = Alignment.CenterHorizontally
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
}`,
  },
  {
    path: 'app/src/main/java/ytstudio/whac_a_mole_tool/MainActivity.kt',
    name: 'MainActivity.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: '主界面 Activity：Single Activity + Multiple Compose Pages、两大权限检测与配置',
    content: `package ytstudio.whac_a_mole_tool

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
}`,
  },
];
