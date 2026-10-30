package com.savewise.app;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.util.Log;
import org.json.JSONObject;

public class SmsScanner {

    private static final String TAG = "SaveWiseSmsScanner";

    /**
     * Scans the SMS inbox for messages from trusted senders received since the last sync time.
     * @return Number of new transactions queued.
     */
    public static int scanInbox(Context context) {
        long lastSync = SmsQueue.getLastSyncTime(context);
        if (lastSync == 0L) {
            // Default to scanning the last 30 days on first run
            lastSync = System.currentTimeMillis() - (30L * 24 * 60 * 60 * 1000);
        }

        Uri uri = Uri.parse("content://sms/inbox");
        ContentResolver resolver = context.getContentResolver();

        String selection = "date > ?";
        String[] selectionArgs = new String[]{ String.valueOf(lastSync) };
        String sortOrder = "date ASC";

        int count = 0;
        long latestTimestamp = lastSync;

        try (Cursor cursor = resolver.query(uri, new String[]{"address", "body", "date"}, selection, selectionArgs, sortOrder)) {
            if (cursor != null && cursor.moveToFirst()) {
                int addressIdx = cursor.getColumnIndex("address");
                int bodyIdx = cursor.getColumnIndex("body");
                int dateIdx = cursor.getColumnIndex("date");

                do {
                    String sender = cursor.getString(addressIdx);
                    String body = cursor.getString(bodyIdx);
                    long date = cursor.getLong(dateIdx);

                    if (date > latestTimestamp) {
                        latestTimestamp = date;
                    }

                    if (SmsParser.isTrustedSender(sender)) {
                        JSONObject tx = SmsParser.parseMessage(sender, body, date);
                        if (tx != null) {
                            if (SmsQueue.addTransaction(context, tx)) {
                                count++;
                            }
                        }
                    }
                } while (cursor.moveToNext());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error querying SMS inbox: " + e.getMessage());
        }

        // Update the last sync timestamp
        SmsQueue.setLastSyncTime(context, latestTimestamp);
        return count;
    }
}
