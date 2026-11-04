package com.savewise.app;

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
    public void markAsProcessed(String trxId) {
        SmsQueue.removeTransaction(mActivity, trxId);
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
    public String getTrustedSenders() {
        return SmsQueue.getTrustedSenders(mActivity);
    }

    @JavascriptInterface
    public void setTrustedSenders(String senders) {
        SmsQueue.setTrustedSenders(mActivity, senders);
    }

    @JavascriptInterface
    public String getUnparsedSms() {
        return SmsQueue.getUnparsedSms(mActivity);
    }

    @JavascriptInterface
    public void clearUnparsedSms() {
        SmsQueue.clearUnparsedSms(mActivity);
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

    @JavascriptInterface
    public boolean isAppLockEnabled() {
        return mActivity.isAppLockEnabled();
    }

    @JavascriptInterface
    public void setAppLockEnabled(boolean enabled) {
        mActivity.setAppLockEnabled(enabled);
    }

    @JavascriptInterface
    public boolean isBiometricAvailable() {
        return mActivity.isBiometricAvailable();
    }

    @JavascriptInterface
    public void triggerLockPrompt() {
        mActivity.runOnUiThread(() -> mActivity.showBiometricPrompt(false));
    }

    @JavascriptInterface
    public boolean shareFile(String filename, String content, String mimeType) {
        return mActivity.shareExportFile(filename, content, mimeType);
    }

    @JavascriptInterface
    public void recoverLegacyData() {
        mActivity.performLegacyDataMigration();
    }

    @JavascriptInterface
    public boolean isLegacyMode() {
        return mActivity.isUsingLegacyFileStorage();
    }

    @JavascriptInterface
    public void setLegacyMode(boolean enabled) {
        mActivity.setUseLegacyFileStorage(enabled);
    }
}
