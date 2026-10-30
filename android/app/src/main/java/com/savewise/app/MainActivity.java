package com.savewise.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;

public class MainActivity extends Activity {

    public static final int SMS_PERMISSION_REQUEST_CODE = 1001;
    private WebView mWebView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure full screen with dark navigation bar and status bar
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#0d1117"));
            window.setNavigationBarColor(Color.parseColor("#161b22"));
        }

        mWebView = new WebView(this);
        setContentView(mWebView);

        WebSettings webSettings = mWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Expose AndroidSms JavaScript Bridge
        mWebView.addJavascriptInterface(new SmsJsBridge(this), "AndroidSms");

        // Keep all navigation inside the WebView
        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Scan missed SMS in background if permission is already granted
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
                android.util.Log.d("SaveWiseJS", consoleMessage.message() + " -- From line "
                        + consoleMessage.lineNumber() + " of "
                        + consoleMessage.sourceId());
                return true;
            }
        });

        // Expose helper to evaluate JS on UI thread safely from native code
        // and automatically trigger queue sync after page is loaded
        mWebView.postDelayed(() -> {
            mWebView.evaluateJavascript("if (window.SmsSyncController) window.SmsSyncController.syncPending();", null);
        }, 1500);

        // Enable remote debugging of WebView via Chrome devtools
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // Load offline web bundle packaged inside the APK assets
        mWebView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        // If permission is active, scan inbox when returning to app
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

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
