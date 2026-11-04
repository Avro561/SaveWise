package com.savewise.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.util.concurrent.Executor;

public class MainActivity extends FragmentActivity {

    public static final int SMS_PERMISSION_REQUEST_CODE = 1001;
    private static final String PREF_NAME = "savewise_prefs";
    private static final String KEY_APP_LOCK_ENABLED = "app_lock_enabled";
    private static final long LOCK_TIMEOUT_MS = 30_000L; // 30s background lock timeout

    private static MainActivity sInstance;

    public static MainActivity getInstance() {
        return sInstance;
    }

    private WebView mWebView;
    private LinearLayout mLockOverlay;
    private boolean mIsUnlocked = false;
    private long mBackgroundTimestamp = 0L;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        sInstance = this;
        super.onCreate(savedInstanceState);

        // Configure system bars
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#0d1117"));
            window.setNavigationBarColor(Color.parseColor("#161b22"));
        }

        // Apply FLAG_SECURE if app lock / screen protection is enabled
        if (isAppLockEnabled()) {
            window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        }

        FrameLayout rootLayout = new FrameLayout(this);

        // WebView configuration
        mWebView = new WebView(this);
        rootLayout.addView(mWebView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Create Security Lock Overlay (covers screen until authenticated)
        createLockOverlay();
        rootLayout.addView(mLockOverlay, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(rootLayout);

        // Hardened WebSettings
        WebSettings webSettings = mWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(false);
        webSettings.setAllowContentAccess(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Configure safe local asset loader
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        // Expose AndroidSms JavaScript Bridge
        mWebView.addJavascriptInterface(new SmsJsBridge(this), "AndroidSms");

        // Hardened WebViewClient
        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("appassets.androidplatform.net".equals(url.getHost())) {
                    return assetLoader.shouldInterceptRequest(url);
                }
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("appassets.androidplatform.net".equals(uri.getHost())) {
                    return false;
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (hasSmsPermissions()) {
                    new Thread(() -> {
                        int added = SmsScanner.scanInbox(MainActivity.this);
                        if (added > 0) {
                            runOnUiThread(() -> {
                                if (mWebView != null) {
                                    mWebView.evaluateJavascript("if (window.onNewSmsQueued) window.onNewSmsQueued();", null);
                                }
                            });
                        }
                    }).start();
                }
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
                if (isDebuggable) {
                    android.util.Log.d("SaveWiseJS", consoleMessage.message() + " -- From line "
                            + consoleMessage.lineNumber() + " of "
                            + consoleMessage.sourceId());
                }
                return true;
            }
        });

        mWebView.postDelayed(() -> {
            mWebView.evaluateJavascript("if (window.SmsSyncController) window.SmsSyncController.syncPending();", null);
        }, 1500);

        // Remote debugging enabled only for debuggable builds
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            WebView.setWebContentsDebuggingEnabled(isDebuggable);
        }

        // Load offline web bundle
        mWebView.loadUrl("https://appassets.androidplatform.net/assets/index.html");

        // Check lock state on cold start
        if (isAppLockEnabled()) {
            mIsUnlocked = false;
            mLockOverlay.setVisibility(View.VISIBLE);
            mLockOverlay.post(() -> showBiometricPrompt(false));
        } else {
            mIsUnlocked = true;
            mLockOverlay.setVisibility(View.GONE);
        }
    }

    private void createLockOverlay() {
        mLockOverlay = new LinearLayout(this);
        mLockOverlay.setOrientation(LinearLayout.VERTICAL);
        mLockOverlay.setGravity(Gravity.CENTER);
        mLockOverlay.setBackgroundColor(Color.parseColor("#0d1117"));
        mLockOverlay.setClickable(true);
        mLockOverlay.setFocusable(true);

        TextView icon = new TextView(this);
        icon.setText("🛡️");
        icon.setTextSize(48);
        icon.setGravity(Gravity.CENTER);

        TextView title = new TextView(this);
        title.setText("SaveWise Protected");
        title.setTextColor(Color.WHITE);
        title.setTextSize(20);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 24, 0, 8);

        TextView subtitle = new TextView(this);
        subtitle.setText("Authentication required to view your finances");
        subtitle.setTextColor(Color.parseColor("#8b949e"));
        subtitle.setTextSize(14);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(40, 0, 40, 32);

        Button unlockBtn = new Button(this);
        unlockBtn.setText("Unlock with Biometric / PIN");
        unlockBtn.setTextColor(Color.WHITE);
        unlockBtn.setBackgroundColor(Color.parseColor("#238636"));
        unlockBtn.setPadding(48, 20, 48, 20);
        unlockBtn.setOnClickListener(v -> showBiometricPrompt(false));

        mLockOverlay.addView(icon);
        mLockOverlay.addView(title);
        mLockOverlay.addView(subtitle);
        mLockOverlay.addView(unlockBtn);
    }

    @Override
    protected void onPause() {
        super.onPause();
        mBackgroundTimestamp = System.currentTimeMillis();
    }

    @Override
    protected void onResume() {
        super.onResume();

        // Enforce lock if returning from background after timeout
        if (isAppLockEnabled()) {
            long elapsed = System.currentTimeMillis() - mBackgroundTimestamp;
            if (!mIsUnlocked || (mBackgroundTimestamp > 0 && elapsed > LOCK_TIMEOUT_MS)) {
                mIsUnlocked = false;
                if (mLockOverlay != null) {
                    mLockOverlay.setVisibility(View.VISIBLE);
                }
                showBiometricPrompt(false);
            }
        }

        // Scan missed SMS if permission is active
        if (hasSmsPermissions()) {
            new Thread(() -> {
                int added = SmsScanner.scanInbox(MainActivity.this);
                if (added > 0) {
                    runOnUiThread(() -> {
                        if (mWebView != null) {
                            mWebView.evaluateJavascript("if (window.onNewSmsQueued) window.onNewSmsQueued();", null);
                        }
                    });
                }
            }).start();
        }
    }

    public boolean isAppLockEnabled() {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        return prefs.getBoolean(KEY_APP_LOCK_ENABLED, false);
    }

    public void setAppLockEnabled(boolean enabled) {
        SharedPreferences prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_APP_LOCK_ENABLED, enabled).apply();

        runOnUiThread(() -> {
            Window window = getWindow();
            if (enabled) {
                window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
                mIsUnlocked = true;
                if (mLockOverlay != null) {
                    mLockOverlay.setVisibility(View.GONE);
                }
            } else {
                window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                mIsUnlocked = true;
                if (mLockOverlay != null) {
                    mLockOverlay.setVisibility(View.GONE);
                }
            }
        });
    }

    public boolean isBiometricAvailable() {
        BiometricManager biometricManager = BiometricManager.from(this);
        int authenticators;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        } else {
            authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        }
        int canAuthenticate = biometricManager.canAuthenticate(authenticators);
        return canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS;
    }

    public void showBiometricPrompt(boolean forSettingsToggle) {
        if (!isBiometricAvailable()) {
            if (!forSettingsToggle) {
                mIsUnlocked = true;
                if (mLockOverlay != null) {
                    mLockOverlay.setVisibility(View.GONE);
                }
            }
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(this);
        BiometricPrompt biometricPrompt = new BiometricPrompt(this, executor,
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        // User cancelled or back was pressed; overlay remains visible
                    }

                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        mIsUnlocked = true;
                        if (mLockOverlay != null) {
                            mLockOverlay.setVisibility(View.GONE);
                        }
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                    }
                });

        BiometricPrompt.PromptInfo.Builder promptBuilder = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("SaveWise Security")
                .setSubtitle("Confirm identity to open SaveWise");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            promptBuilder.setAllowedAuthenticators(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL);
        } else {
            promptBuilder.setDeviceCredentialAllowed(true);
        }

        try {
            biometricPrompt.authenticate(promptBuilder.build());
        } catch (Exception e) {
            android.util.Log.e("SaveWiseLock", "Error authenticating biometric", e);
        }
    }

    public boolean hasSmsPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return checkSelfPermission(Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
                    && checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    public void requestSmsPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(new String[]{
                    Manifest.permission.RECEIVE_SMS,
                    Manifest.permission.READ_SMS
            }, SMS_PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION_REQUEST_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                new Thread(() -> {
                    int added = SmsScanner.scanInbox(MainActivity.this);
                    runOnUiThread(() -> {
                        if (mWebView != null) {
                            mWebView.evaluateJavascript("if (window.onSmsPermissionResult) window.onSmsPermissionResult(true, " + added + ");", null);
                        }
                    });
                }).start();
            } else {
                if (mWebView != null) {
                    mWebView.evaluateJavascript("if (window.onSmsPermissionResult) window.onSmsPermissionResult(false, 0);", null);
                }
            }
        }
    }

    public void openBatteryOptimizationSettings() {
        try {
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getPackageName()));
            }
            startActivity(intent);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + getPackageName()));
                startActivity(fallback);
            } catch (Exception ignored) {}
        }
    }

    public void notifyNewSmsQueued() {
        runOnUiThread(() -> {
            if (mWebView != null) {
                mWebView.evaluateJavascript("if (window.onNewSmsQueued) window.onNewSmsQueued();", null);
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (sInstance == this) {
            sInstance = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        // If app is currently locked, minimize to home instead of allowing back navigation
        if (mLockOverlay != null && mLockOverlay.getVisibility() == View.VISIBLE) {
            moveTaskToBack(true);
            return;
        }
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
