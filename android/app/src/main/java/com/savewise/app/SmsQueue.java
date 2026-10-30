package com.savewise.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class SmsQueue {

    private static final String PREFS_NAME = "savewise_sms_queue";
    private static final String KEY_PENDING = "pending_transactions";
    private static final String KEY_SEEN_TRX = "seen_trx_ids";
    private static final String KEY_LAST_SYNC_TIME = "last_sync_timestamp";

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static synchronized boolean addTransaction(Context context, JSONObject tx) {
        if (tx == null) return false;
        String trxId = tx.optString("trxId", "");
        if (isTrxSeen(context, trxId)) {
            return false; // Skip duplicate
        }

        SharedPreferences prefs = getPrefs(context);
        String currentQueue = prefs.getString(KEY_PENDING, "[]");
        try {
            JSONArray arr = new JSONArray(currentQueue);
            arr.put(tx);
            markTrxSeen(context, trxId);
            prefs.edit().putString(KEY_PENDING, arr.toString()).apply();
            return true;
        } catch (JSONException e) {
            e.printStackTrace();
            return false;
        }
    }

    public static synchronized String getPendingJson(Context context) {
        return getPrefs(context).getString(KEY_PENDING, "[]");
    }

    public static synchronized void clearPending(Context context) {
        getPrefs(context).edit().putString(KEY_PENDING, "[]").apply();
    }

    public static synchronized void removeTransaction(Context context, String trxId) {
        if (trxId == null || trxId.isEmpty()) return;
        SharedPreferences prefs = getPrefs(context);
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
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public static synchronized boolean isTrxSeen(Context context, String trxId) {
        if (trxId == null || trxId.isEmpty()) return false;
        SharedPreferences prefs = getPrefs(context);
        String seen = prefs.getString(KEY_SEEN_TRX, "");
        return seen.contains("[" + trxId + "]");
    }

    public static synchronized void markTrxSeen(Context context, String trxId) {
        if (trxId == null || trxId.isEmpty()) return;
        SharedPreferences prefs = getPrefs(context);
        String seen = prefs.getString(KEY_SEEN_TRX, "");
        if (!seen.contains("[" + trxId + "]")) {
            prefs.edit().putString(KEY_SEEN_TRX, seen + "[" + trxId + "]").apply();
        }
    }

    public static long getLastSyncTime(Context context) {
        return getPrefs(context).getLong(KEY_LAST_SYNC_TIME, 0L);
    }

    public static void setLastSyncTime(Context context, long time) {
        getPrefs(context).edit().putLong(KEY_LAST_SYNC_TIME, time).apply();
    }
}
