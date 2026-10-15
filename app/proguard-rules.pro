# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /Users/username/Library/Android/sdk/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.

# Keep OpenCV native methods and classes
-keep class org.opencv.** { *; }
-dontwarn org.opencv.**

# Keep models and services
-keep class ytstudio.whac_a_mole_tool.service.** { *; }
-keep class ytstudio.whac_a_mole_tool.cv.** { *; }
