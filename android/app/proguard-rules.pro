# SaveWise ProGuard / R8 Rules

# Preserve all JavaScript Interface annotated methods across minification
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.savewise.app.SmsJsBridge {
    public *;
}

# Keep Biometric and AndroidX Security Crypto components
-keep class androidx.biometric.** { *; }
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**
-dontwarn com.google.crypto.tink.**
