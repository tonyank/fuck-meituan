package ytstudio.whac_a_mole_tool.service

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
                                    Log.w(TAG, "洞 #${result.holeIndex} 发现炸弹 (置信度 ${result.confidence}) -> 严禁点击！")
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
}
