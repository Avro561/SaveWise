package com.savewise.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class SmsQueue {

    private static final String ENCRYPTED_PREFS_NAME = "savewise_secure_queue";
    private static final String KEY_PENDING = "pending_transactions";
    private static final String KEY_SEEN_TRX = "seen_trx_ids";
    private static final String KEY_LAST_SYNC_TIME = "last_sync_timestamp";
    private static final String KEY_UNPARSED = "unparsed_sms_log";
    private static final String KEY_TRUSTED_SENDERS = "trusted_senders_whitelist";

    private static volatile SharedPreferences sSecurePrefs;

    private static SharedPreferences getSecurePrefs(Context context) {
        if (sSecurePrefs == null) {
            synchronized (SmsQueue.class) {
                if (sSecurePrefs == null) {
                    try {
                        MasterKey masterKey = new MasterKey.Builder(context)
                                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                                .build();

                        sSecurePrefs = EncryptedSharedPreferences.create(
                                context,
                                ENCRYPTED_PREFS_NAME,
                                masterKey,
                                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                        );
                    } catch (Exception e) {
                        // Fallback to private SharedPreferences if device keystore fails
                        sSecurePrefs = context.getSharedPreferences(ENCRYPTED_PREFS_NAME, Context.MODE_PRIVATE);
                    }
                }
            }
        }
        return sSecurePrefs;
    }

    public static synchronized boolean addTransaction(Context context, JSONObject tx) {
        if (tx == null) return false;
        String trxId = tx.optString("trxId", "");
        double amount = tx.optDouble("amount", 0.0);
        long timestamp = tx.optLong("timestamp", System.currentTimeMillis());

        if (isTrxSeen(context, trxId, amount, timestamp)) {
            return false; // Skip duplicate
        }

        SharedPreferences prefs = getSecurePrefs(context);
        String currentQueue = prefs.getString(KEY_PENDING, "[]");
        try {
            JSONArray arr = new JSONArray(currentQueue);
            arr.put(tx);
            markTrxSeen(context, trxId, amount, timestamp);
            prefs.edit().putString(KEY_PENDING, arr.toString()).apply();
            return true;
        } catch (JSONException e) {
            return false;
        }
    }

    public static synchronized String getPendingJson(Context context) {
        return getSecurePrefs(context).getString(KEY_PENDING, "[]");
    }

    public static synchronized void clearPending(Context context) {
        getSecurePrefs(context).edit().putString(KEY_PENDING, "[]").apply();
    }

    public static synchronized void removeTransaction(Context context, String trxId) {
        if (trxId == null || trxId.isEmpty()) return;
        SharedPreferences prefs = getSecurePrefs(context);
        String currentQueue = prefs.getString(KEY_PENDING, "[]");
        try {
            JSONArray arr = new JSONArray(currentQueue);
            JSONArray newArr = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                if (!trxId.equals(obj.optString("trxId"))) {
                    newArr.put(obj);
                }
            }
            prefs.edit().putString(KEY_PENDING, newArr.toString()).apply();
        } catch (JSONException ignored) {}
    }

    public static synchronized boolean isTrxSeen(Context context, String trxId, double amount, long timestamp) {
        SharedPreferences prefs = getSecurePrefs(context);
        String seen = prefs.getString(KEY_SEEN_TRX, "");

        if (trxId != null && !trxId.isEmpty() && !trxId.startsWith("TX-")) {
            if (seen.contains("[" + trxId + "]")) return true;
        }

        // Window deduplication: 5-minute bucket for same amount
        long window = timestamp / (5 * 60 * 1000);
        String fuzzyKey = "[FZ-" + String.format(java.util.Locale.US, "%.2f", amount) + "-" + window + "]";
        return seen.contains(fuzzyKey);
    }

    public static synchronized void markTrxSeen(Context context, String trxId, double amount, long timestamp) {
        SharedPreferences prefs = getSecurePrefs(context);
        String seen = prefs.getString(KEY_SEEN_TRX, "");
        StringBuilder updated = new StringBuilder(seen);

        if (trxId != null && !trxId.isEmpty() && !trxId.startsWith("TX-")) {
            if (!seen.contains("[" + trxId + "]")) {
                updated.append("[").append(trxId).append("]");
            }
        }

        long window = timestamp / (5 * 60 * 1000);
        String fuzzyKey = "[FZ-" + String.format(java.util.Locale.US, "%.2f", amount) + "-" + window + "]";
        if (!seen.contains(fuzzyKey)) {
            updated.append(fuzzyKey);
        }

        // Cap seen index string length to prevent unbounded growth
        if (updated.length() > 50000) {
            updated.delete(0, 10000);
        }

        prefs.edit().putString(KEY_SEEN_TRX, updated.toString()).apply();
    }

    public static synchronized void addUnparsedSms(Context context, String sender, String body, long timestamp) {
        if (body == null || body.trim().isEmpty()) return;
        SharedPreferences prefs = getSecurePrefs(context);
        String current = prefs.getString(KEY_UNPARSED, "[]");
        try {
            JSONArray arr = new JSONArray(current);
            // Cap unparsed log to 50 items
            if (arr.length() >= 50) {
                arr.remove(0);
            }
            JSONObject item = new JSONObject();
            item.put("sender", sender != null ? sender : "Unknown");
            item.put("body", body);
            item.put("timestamp", timestamp);
            arr.put(item);
            prefs.edit().putString(KEY_UNPARSED, arr.toString()).apply();
        } catch (JSONException ignored) {}
    }

    public static synchronized String getUnparsedSms(Context context) {
        return getSecurePrefs(context).getString(KEY_UNPARSED, "[]");
    }

    public static synchronized void clearUnparsedSms(Context context) {
        getSecurePrefs(context).edit().putString(KEY_UNPARSED, "[]").apply();
    }

    public static String getTrustedSenders(Context context) {
        return getSecurePrefs(context).getString(KEY_TRUSTED_SENDERS,
                "bKash, NAGAD, Rocket, Upay, 16216, City Bank, BRAC Bank, EBL, DBBL, Islami Bank, SCB");
    }

    public static void setTrustedSenders(Context context, String senders) {
        if (senders == null) return;
        getSecurePrefs(context).edit().putString(KEY_TRUSTED_SENDERS, senders.trim()).apply();
    }

    public static long getLastSyncTime(Context context) {
        return getSecurePrefs(context).getLong(KEY_LAST_SYNC_TIME, 0L);
    }

    public static void setLastSyncTime(Context context, long time) {
        getSecurePrefs(context).edit().putLong(KEY_LAST_SYNC_TIME, time).apply();
    }
}
