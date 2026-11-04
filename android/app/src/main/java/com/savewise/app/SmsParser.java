package com.savewise.app;

import android.content.Context;
import org.json.JSONException;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SmsParser {

    private static final double MAX_REASONABLE_AMOUNT = 50_000_000.0;

    /**
     * Rule representation: adding a new bank/wallet format is done by adding a Rule.
     */
    public static class ParserRule {
        public final String name;
        public final Pattern pattern;
        public final String type; // "earn" or "cost"
        public final String category;
        public final int amountGroup;
        public final int trxIdGroup; // -1 if not in pattern
        public final int balanceGroup; // -1 if not in pattern

        public ParserRule(String name, String regex, String type, String category, int amountGroup, int trxIdGroup, int balanceGroup) {
            this.name = name;
            this.pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
            this.type = type;
            this.category = category;
            this.amountGroup = amountGroup;
            this.trxIdGroup = trxIdGroup;
            this.balanceGroup = balanceGroup;
        }
    }

    private static final List<ParserRule> RULES = new ArrayList<>();

    static {
        // Rule 1: bKash Money Received (Cash In / Send Money received)
        RULES.add(new ParserRule(
                "bKash_Received",
                "(?:You have )?received (?:Tk|BDT|৳)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s*from\\s*([0-9a-zA-Z\\s]+?)\\..*?Balance (?:Tk|BDT|৳)\\s*([0-9,.]+)\\..*?TrxID\\s*([A-Z0-9]+)",
                "earn", "Other Income", 1, 4, 3
        ));

        // Rule 2: bKash Payment / Cash Out
        RULES.add(new ParserRule(
                "bKash_Payment",
                "(?:Payment|Cash Out|Send Money)(?: of)? (?:Tk|BDT|৳)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s*to\\s*([0-9a-zA-Z\\s]+?)\\..*?TrxID\\s*([A-Z0-9]+)(?:.*?Balance (?:Tk|BDT|৳)\\s*([0-9,.]+))?",
                "cost", "Other Expense", 1, 3, 4
        ));

        // Rule 3: NAGAD Money Received
        RULES.add(new ParserRule(
                "NAGAD_Received",
                "Money Received:\\s*(?:Tk|BDT|৳)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s*from\\s*([0-9]+)\\..*?TrxID\\s*([A-Z0-9]+)(?:.*?Balance\\s*(?:Tk|BDT|৳)\\s*([0-9,.]+))?",
                "earn", "Other Income", 1, 3, 4
        ));

        // Rule 4: NAGAD Payment / Cash Out
        RULES.add(new ParserRule(
                "NAGAD_Payment",
                "(?:Payment|Cash Out|Send Money):\\s*(?:Tk|BDT|৳)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s*to\\s*([0-9]+)\\..*?TrxID\\s*([A-Z0-9]+)(?:.*?Balance\\s*(?:Tk|BDT|৳)\\s*([0-9,.]+))?",
                "cost", "Other Expense", 1, 3, 4
        ));

        // Rule 5: Rocket Money Received
        RULES.add(new ParserRule(
                "Rocket_Received",
                "Received (?:Tk|BDT|৳)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)\\s*from\\s*([0-9]+)\\..*?TxnId:?\\s*([A-Z0-9]+)(?:.*?Balance:?\\s*(?:Tk|BDT|৳)\\s*([0-9,.]+))?",
                "earn", "Other Income", 1, 3, 4
        ));

        // Rule 6: Bank Account / Card Debit
        RULES.add(new ParserRule(
                "Bank_Debit",
                "(?:debited with|paid|purchase of|txn of|withdrawn|spent)\\s*(?:Tk|BDT|৳|USD|\\$|Rs\\.?)\\s*([0-9,]+(?:\\.[0-9]{1,2})?).*?(?:at|on|for)\\s*([a-zA-Z0-9\\s.]+?)\\..*?(?:TrxID|Ref|TxnId)[:\\s]*([A-Z0-9]+)?(?:.*?(?:Bal|Balance|Avl Bal)[:\\s]*(?:Tk|BDT|৳|USD|\\$)?\\s*([0-9,.]+))?",
                "cost", "Other Expense", 1, 3, 4
        ));

        // Rule 7: Bank Account Credit / Salary / Deposit
        RULES.add(new ParserRule(
                "Bank_Credit",
                "(?:credited with|deposited with|salary credited|received)\\s*(?:Tk|BDT|৳|USD|\\$|Rs\\.?)\\s*([0-9,]+(?:\\.[0-9]{1,2})?).*?(?:from|by|for)\\s*([a-zA-Z0-9\\s.]+?)\\..*?(?:TrxID|Ref|TxnId)[:\\s]*([A-Z0-9]+)?(?:.*?(?:Bal|Balance|Avl Bal)[:\\s]*(?:Tk|BDT|৳|USD|\\$)?\\s*([0-9,.]+))?",
                "earn", "Salary", 1, 3, 4
        ));
    }

    /**
     * Checks whether sender is in the trusted whitelist.
     */
    public static boolean isTrustedSender(Context context, String sender) {
        if (sender == null || sender.trim().isEmpty()) return false;
        String allowed = SmsQueue.getTrustedSenders(context).toLowerCase();
        String cleanSender = sender.toLowerCase().replaceAll("[^a-z0-9]", "");

        for (String item : allowed.split(",")) {
            String cleanAllowed = item.trim().replaceAll("[^a-z0-9]", "");
            if (!cleanAllowed.isEmpty() && cleanSender.contains(cleanAllowed)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Parses the SMS message against modular rules.
     * Returns parsed JSONObject or null.
     */
    public static JSONObject parseMessage(Context context, String sender, String body, long timestamp) {
        if (body == null || body.trim().isEmpty()) return null;

        // Skip OTPs and verification messages
        if (body.matches("(?i).*\\b(otp|verification code|security code|one time password)\\b.*")) {
            return null;
        }

        for (ParserRule rule : RULES) {
            Matcher m = rule.pattern.matcher(body);
            if (m.find()) {
                double amount = parseAmount(m.group(rule.amountGroup));
                if (amount <= 0 || amount > MAX_REASONABLE_AMOUNT) {
                    continue; // Skip invalid amounts
                }

                String trxId = extractTrxId(m, rule.trxIdGroup, sender, timestamp, body);
                double balance = extractBalance(m, rule.balanceGroup, body);
                String category = refineCategory(rule.category, body, rule.type);

                try {
                    JSONObject json = new JSONObject();
                    json.put("id", trxId);
                    json.put("trxId", trxId);
                    json.put("sender", sender != null ? sender : "Bank");
                    json.put("title", (rule.type.equals("earn") ? "Received from " : "Paid via ") + sender);
                    json.put("amount", amount);
                    json.put("type", rule.type);
                    json.put("category", category);
                    json.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(timestamp)));
                    json.put("timestamp", timestamp);
                    json.put("balance", balance);
                    json.put("rawBody", body);
                    json.put("status", "pending");
                    return json;
                } catch (JSONException ignored) {}
            }
        }

        // Generic fallback parser for any bank/wallet not caught by specific rules
        JSONObject genericParsed = parseGeneric(sender, body, timestamp);
        if (genericParsed != null) {
            return genericParsed;
        }

        // Unknown format: archive to encrypted unparsed queue for later improvement
        SmsQueue.addUnparsedSms(context, sender, body, timestamp);
        return null;
    }

    private static JSONObject parseGeneric(String sender, String body, long timestamp) {
        String lower = body.toLowerCase();
        String type;
        if (lower.contains("received") || lower.contains("credited") || lower.contains("deposited") || lower.contains("cash in")) {
            type = "earn";
        } else if (lower.contains("paid") || lower.contains("debited") || lower.contains("sent") || lower.contains("purchase") || lower.contains("payment") || lower.contains("withdrawn") || lower.contains("cash out")) {
            type = "cost";
        } else {
            return null;
        }

        Pattern amtPat = Pattern.compile("(?i)(?:tk\\.?|bdt|usd|\\$|rs\\.?)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)");
        Matcher amtMat = amtPat.matcher(body);
        if (!amtMat.find()) return null;

        double amount = parseAmount(amtMat.group(1));
        if (amount <= 0 || amount > MAX_REASONABLE_AMOUNT) return null;

        String trxId = extractTrxId(null, -1, sender, timestamp, body);
        double balance = extractBalance(null, -1, body);
        String category = refineCategory(type.equals("earn") ? "Other Income" : "Other Expense", body, type);

        try {
            JSONObject json = new JSONObject();
            json.put("id", trxId);
            json.put("trxId", trxId);
            json.put("sender", sender != null ? sender : "Bank");
            json.put("title", (type.equals("earn") ? "Received from " : "Paid via ") + sender);
            json.put("amount", amount);
            json.put("type", type);
            json.put("category", category);
            json.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(timestamp)));
            json.put("timestamp", timestamp);
            json.put("balance", balance);
            json.put("rawBody", body);
            json.put("status", "pending");
            return json;
        } catch (JSONException e) {
            return null;
        }
    }

    private static double parseAmount(String raw) {
        if (raw == null) return 0.0;
        try {
            return Double.parseDouble(raw.replace(",", "").trim());
        } catch (Exception e) {
            return 0.0;
        }
    }

    private static String extractTrxId(Matcher m, int group, String sender, long timestamp, String body) {
        if (m != null && group > 0 && group <= m.groupCount()) {
            String val = m.group(group);
            if (val != null && !val.trim().isEmpty()) {
                return val.trim();
            }
        }
        Pattern trxPattern = Pattern.compile("(?i)(?:trxid|txnid|txn id|ref|trans id)[:\\s]*([A-Z0-9]+)");
        Matcher fallbackMatcher = trxPattern.matcher(body);
        if (fallbackMatcher.find()) {
            return fallbackMatcher.group(1).trim();
        }
        return "TX-" + (sender != null ? sender.toUpperCase().replaceAll("[^A-Z0-9]", "") : "SMS") + "-" + timestamp;
    }

    private static double extractBalance(Matcher m, int group, String body) {
        if (m != null && group > 0 && group <= m.groupCount()) {
            String val = m.group(group);
            if (val != null && !val.trim().isEmpty()) {
                return parseAmount(val);
            }
        }
        Pattern balPattern = Pattern.compile("(?i)(?:balance|bal|avl bal)[:\\s]*(?:tk\\.?|bdt|usd|\\$)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)");
        Matcher balMatcher = balPattern.matcher(body);
        if (balMatcher.find()) {
            return parseAmount(balMatcher.group(1));
        }
        return -1.0;
    }

    private static String refineCategory(String defaultCat, String body, String type) {
        String lower = body.toLowerCase();
        if (type.equals("earn")) {
            if (lower.contains("salary")) return "Salary";
            if (lower.contains("freelance") || lower.contains("upwork") || lower.contains("fiverr")) return "Freelance";
            return defaultCat;
        } else {
            if (lower.contains("rent") || lower.contains("apartment") || lower.contains("housing")) return "Housing & Rent";
            if (lower.contains("grocery") || lower.contains("groceries") || lower.contains("supermarket") || lower.contains("shwapno")) return "Groceries";
            if (lower.contains("dining") || lower.contains("foodpanda") || lower.contains("restaurant") || lower.contains("kfc") || lower.contains("pizza")) return "Dining Out";
            if (lower.contains("uber") || lower.contains("pathao") || lower.contains("fuel") || lower.contains("cng")) return "Transport & Fuel";
            return defaultCat;
        }
    }
}
