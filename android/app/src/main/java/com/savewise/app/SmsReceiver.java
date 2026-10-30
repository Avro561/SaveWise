package com.savewise.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;
import org.json.JSONObject;

public class SmsReceiver extends BroadcastReceiver {

    private static final String TAG = "SaveWiseSms";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null || pdus.length == 0) return;

        String format = bundle.getString("format");
        StringBuilder fullBody = new StringBuilder();
        String sender = null;
        long timestamp = System.currentTimeMillis();

        for (Object pdu : pdus) {
            SmsMessage message;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                message = SmsMessage.createFromPdu((byte[]) pdu, format);
            } else {
                message = SmsMessage.createFromPdu((byte[]) pdu);
            }

            if (message != null) {
                if (sender == null) {
                    sender = message.getDisplayOriginatingAddress();
                    timestamp = message.getTimestampMillis();
                }
                fullBody.append(message.getMessageBody());
            }
        }

        Log.d(TAG, "Incoming SMS from: " + sender);

        // Step 4 & 5: Check whether sender is in trusted list
        if (!SmsParser.isTrustedSender(sender)) {
            Log.d(TAG, "Sender not in trusted list, skipping.");
            return;
        }

        // Step 6: Parse the SMS body
        JSONObject tx = SmsParser.parseMessage(sender, fullBody.toString(), timestamp);
        if (tx != null) {
            Log.d(TAG, "Parsed Transaction: " + tx.toString());
            // Step 7: Save to local queue
            boolean added = SmsQueue.addTransaction(context, tx);
            Log.d(TAG, "Added to pending queue: " + added);
        }
    }
}
