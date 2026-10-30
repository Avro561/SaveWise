package com.savewise.app;

import android.content.Context;
import android.webkit.JavascriptInterface;

public class SmsJsBridge {

    private final MainActivity mActivity;

    public SmsJsBridge(MainActivity activity) {
        this.mActivity = activity;
    }

    @JavascriptInterface
    public String getPendingTransactions() {
        return SmsQueue.getPendingJson(mActivity);
    }

    @JavascriptInterface
    public void removePendingTransaction(String trxId) {
        SmsQueue.removeTransaction(mActivity, trxId);
    }

    @JavascriptInterface
    public void clearPendingTransactions() {
        SmsQueue.clearPending(mActivity);
    }

    @JavascriptInterface
    public boolean checkSmsPermissions() {
        return mActivity.hasSmsPermissions();
    }

    @JavascriptInterface
    public void requestSmsPermissions() {
        mActivity.requestSmsPermissions();
    }

    @JavascriptInterface
    public int scanMissedSms() {
        return SmsScanner.scanInbox(mActivity);
    }

    @JavascriptInterface
    public void openBatterySettings() {
        mActivity.openBatteryOptimizationSettings();
    }
}
