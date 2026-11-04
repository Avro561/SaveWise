package com.savewise.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import org.json.JSONObject;

public class SmsReceiver extends BroadcastReceiver {

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

        // Whitelist check
        if (!SmsParser.isTrustedSender(context, sender)) {
            return;
        }

        // Parse message securely without leaking details into logcat
        JSONObject tx = SmsParser.parseMessage(context, sender, fullBody.toString(), timestamp);
        if (tx != null) {
            boolean added = SmsQueue.addTransaction(context, tx);
            if (added) {
                MainActivity activity = MainActivity.getInstance();
                if (activity != null) {
                    activity.notifyNewSmsQueued();
                }
            }
        }
    }
}
