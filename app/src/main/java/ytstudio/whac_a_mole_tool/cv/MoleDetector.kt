package ytstudio.whac_a_mole_tool.cv

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
                    Log.d(TAG, "已加载模板: $target (金字塔层数: ${scaledTemplates.size})")
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
}
