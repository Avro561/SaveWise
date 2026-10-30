package com.savewise.app;

import org.json.JSONException;
import org.json.JSONObject;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SmsParser {

    // Trusted senders (Wallets, Banks, Telcos)
    public static final Set<String> TRUSTED_SENDERS = new HashSet<>(Arrays.asList(
            "bkash", "nagad", "rocket", "upay", "cellfin",
            "citybank", "ebl", "bracbank", "dbbl", "scb", "hsbc",
            "islamibank", "ucb", "primebank", "mtb", "bank"
    ));

    public static boolean isTrustedSender(String sender) {
        if (sender == null) return false;
        String clean = sender.toLowerCase().replaceAll("[^a-z0-9]", "");
        for (String trusted : TRUSTED_SENDERS) {
            if (clean.contains(trusted)) {
                return true;
            }
        }
        return false;
    }

    public static JSONObject parseMessage(String sender, String body, long timestamp) {
        if (body == null || body.trim().isEmpty()) return null;

        // Skip OTPs / verification codes
        if (body.matches("(?i).*\\b(otp|verification code|security code|one time password)\\b.*")) {
            return null;
        }

        String type = null;
        double amount = 0.0;
        String trxId = "";
        double balance = -1.0;
        String category = "Finance";

        String lowerBody = body.toLowerCase();

        // 1. Determine Type: Credit (earn) vs Debit (cost)
        if (lowerBody.contains("received") || lowerBody.contains("recieve") || lowerBody.contains("credited") || lowerBody.contains("cash in") || lowerBody.contains("deposit")) {
            type = "earn";
            category = lowerBody.contains("salary") ? "Salary" : "Other Income";
        } else if (lowerBody.contains("payment") || lowerBody.contains("paid") || lowerBody.contains("debited") || lowerBody.contains("cash out") || lowerBody.contains("sent") || lowerBody.contains("purchase") || lowerBody.contains("spent") || lowerBody.contains("buy")) {
            type = "cost";
            if (lowerBody.contains("rent") || lowerBody.contains("house")) {
                category = "Housing & Rent";
            } else if (lowerBody.contains("grocery") || lowerBody.contains("groceries")) {
                category = "Groceries";
            } else {
                category = "Other Expense";
            }
        }

        if (type == null) {
            return null; // Not a recognized transaction
        }

        // 2. Extract Amount (handles: Tk 500, Tk. 500.00, BDT 500, USD 50, $500, 500.00 Tk)
        Pattern amountPattern = Pattern.compile("(?i)(?:tk\\.?|bdt|usd|\\$|rs\\.?)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)");
        Matcher amountMatcher = amountPattern.matcher(body);
        if (amountMatcher.find()) {
            try {
                amount = Double.parseDouble(amountMatcher.group(1).replace(",", ""));
            } catch (Exception ignored) {}
        } else {
            // Alternate pattern: amount before currency or after "of" (e.g. "amount of 500.00")
            Pattern altPattern = Pattern.compile("(?i)(?:amount(?: of)?|transferred)\\s*:?\\s*(?:tk\\.?|bdt|usd|\\$)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)");
            Matcher altMatcher = altPattern.matcher(body);
            if (altMatcher.find()) {
                try {
                    amount = Double.parseDouble(altMatcher.group(1).replace(",", ""));
                } catch (Exception ignored) {}
            }
        }

        if (amount <= 0.0) {
            return null; // Could not reliably find amount
        }

        // 3. Extract TrxID
        Pattern trxPattern = Pattern.compile("(?i)(?:trxid|txnid|txn id|ref|trans id)[:\\s]*([A-Z0-9]+)");
        Matcher trxMatcher = trxPattern.matcher(body);
        if (trxMatcher.find()) {
            trxId = trxMatcher.group(1);
        } else {
            trxId = "TX-" + (sender != null ? sender.toUpperCase() : "SMS") + "-" + timestamp;
        }

        // 4. Extract Remaining Balance if present
        Pattern balPattern = Pattern.compile("(?i)(?:balance|bal)[:\\s]*(?:tk\\.?|bdt|usd|\\$)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)");
        Matcher balMatcher = balPattern.matcher(body);
        if (balMatcher.find()) {
            try {
                balance = Double.parseDouble(balMatcher.group(1).replace(",", ""));
            } catch (Exception ignored) {}
        }

        try {
            JSONObject json = new JSONObject();
            json.put("id", trxId);
            json.put("trxId", trxId);
            json.put("sender", sender != null ? sender : "Unknown Bank");
            json.put("title", (type.equals("earn") ? "Received from " : "Paid via ") + sender);
            json.put("amount", amount);
            json.put("type", type);
            json.put("category", category);
            json.put("date", new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(new java.util.Date(timestamp)));
            json.put("timestamp", timestamp);
            json.put("balance", balance);
            json.put("rawBody", body);
            json.put("status", "pending"); // Pending review state
            return json;
        } catch (JSONException e) {
            return null;
        }
    }
}
