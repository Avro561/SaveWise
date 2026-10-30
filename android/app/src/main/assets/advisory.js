/**
 * SaveWise Advisory Engine
 * Intelligent financial analysis, 50/30/20 budget tracking,
 * leakage detection, and personalized savings recommendations.
 */

const AdvisoryEngine = {
  // Category categorization for 50/30/20 rule
  categoryClassification: {
    // Needs (50% rule)
    'Housing & Rent': 'need',
    'Utilities & Bills': 'need',
    'Groceries': 'need',
    'Transport & Fuel': 'need',
    'Health & Medical': 'need',
    'Education': 'need',

    // Wants (30% rule)
    'Dining Out': 'want',
    'Entertainment': 'want',
    'Shopping': 'want',
    'Personal Care': 'want',
    'Subscriptions': 'want',
    'Gifts & Donations': 'want',
    'Other Expense': 'want'
  },

  /**
   * Run full financial analysis on a set of transactions and monthly income
   */
  analyze(transactions, currencySymbol = '$', customDailyLimit = 0) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - currentDay);

    // Filter transactions for current month
    const thisMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Filter today's transactions
    const todayStr = now.toISOString().split('T')[0];
    const todayTx = transactions.filter(t => t.date.startsWith(todayStr));

    // Totals
    let totalEarn = 0;
    let totalExpense = 0;
    let needsTotal = 0;
    let wantsTotal = 0;
    const categoryTotals = {};
    const smallExpenses = [];

    thisMonthTx.forEach(t => {
      const amount = parseFloat(t.amount) || 0;
      if (t.type === 'earn') {
        totalEarn += amount;
      } else if (t.type === 'cost') {
        totalExpense += amount;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;

        const classification = this.categoryClassification[t.category] || 'want';
        if (classification === 'need') {
          needsTotal += amount;
        } else {
          wantsTotal += amount;
        }

        // Detect small leakage: under 5 units or equivalent
        if (amount <= 5) {
          smallExpenses.push(t);
        }
      }
    });

    const netSavings = Math.max(0, totalEarn - totalExpense);
    const savingsRate = totalEarn > 0 ? ((netSavings / totalEarn) * 100).toFixed(1) : 0;

    // Today's stats
    const todaySpent = todayTx
      .filter(t => t.type === 'cost')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const todayEarned = todayTx
      .filter(t => t.type === 'earn')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // Daily budget calculations
    const dailyLimit = customDailyLimit > 0 
      ? customDailyLimit 
      : (totalEarn > 0 ? (totalEarn * 0.7) / daysInMonth : 25);
    const todayRemaining = dailyLimit - todaySpent;
    const dailyBurnRate = currentDay > 0 ? (totalExpense / currentDay) : totalExpense;
    const projectedMonthExpense = totalExpense + (dailyBurnRate * daysRemaining);
    const projectedMonthSavings = totalEarn - projectedMonthExpense;

    // 50/30/20 breakdown
    const needsPct = totalEarn > 0 ? (needsTotal / totalEarn) * 100 : 0;
    const wantsPct = totalEarn > 0 ? (wantsTotal / totalEarn) * 100 : 0;
    const actualSavingsPct = totalEarn > 0 ? ((totalEarn - (needsTotal + wantsTotal)) / totalEarn) * 100 : 0;

    // Generate smart actionable suggestions
    const suggestions = this.generateSuggestions({
      currencySymbol,
      totalEarn,
      totalExpense,
      netSavings,
      savingsRate,
      needsTotal,
      wantsTotal,
      needsPct,
      wantsPct,
      actualSavingsPct,
      categoryTotals,
      smallExpenses,
      dailyBurnRate,
      dailyLimit,
      todaySpent,
      todayRemaining,
      projectedMonthExpense,
      projectedMonthSavings,
      daysRemaining,
      currentDay
    });

    return {
      monthOverview: {
        totalEarn,
        totalExpense,
        netSavings,
        savingsRate: parseFloat(savingsRate),
        needsTotal,
        wantsTotal,
        needsPct: parseFloat(needsPct.toFixed(1)),
        wantsPct: parseFloat(wantsPct.toFixed(1)),
        actualSavingsPct: parseFloat(actualSavingsPct.toFixed(1))
      },
      dailyOverview: {
        todaySpent,
        todayEarned,
        dailyLimit: parseFloat(dailyLimit.toFixed(2)),
        todayRemaining: parseFloat(todayRemaining.toFixed(2)),
        isExceeded: todaySpent > dailyLimit,
        dailyBurnRate: parseFloat(dailyBurnRate.toFixed(2)),
        projectedMonthExpense: parseFloat(projectedMonthExpense.toFixed(2)),
        projectedMonthSavings: parseFloat(projectedMonthSavings.toFixed(2))
      },
      categoryBreakdown: categoryTotals,
      smallExpensesCount: smallExpenses.length,
      suggestions
    };
  },

  /**
   * Generates prioritized, highly personalized financial advice
   */
  generateSuggestions(data) {
    const {
      currencySymbol,
      totalEarn,
      totalExpense,
      netSavings,
      savingsRate,
      wantsTotal,
      wantsPct,
      categoryTotals,
      smallExpenses,
      dailyBurnRate,
      dailyLimit,
      todaySpent,
      projectedMonthSavings,
      daysRemaining
    } = data;

    const tips = [];

    // Check 1: Deficit Warning
    if (totalExpense > totalEarn && totalEarn > 0) {
      tips.push({
        id: 'deficit_alert',
        severity: 'critical',
        badge: 'Critical Alert',
        icon: 'alert-triangle',
        title: 'You are spending more than you earn!',
        message: `Your expenses (${currencySymbol}${totalExpense.toFixed(2)}) exceed your income (${currencySymbol}${totalEarn.toFixed(2)}) by ${currencySymbol}${(totalExpense - totalEarn).toFixed(2)}.`,
        action: 'Freeze non-essential "Wants" immediately until the next income cycle.'
      });
    }

    // Check 2: 50/30/20 Wants Rule Check
    if (wantsPct > 30 && totalEarn > 0) {
      const excessWants = wantsTotal - (totalEarn * 0.30);
      tips.push({
        id: 'wants_rule',
        severity: 'warning',
        badge: '50/30/20 Rule Violation',
        icon: 'trending-down',
        title: `Discretionary spending is at ${wantsPct.toFixed(0)}% (Target: ≤ 30%)`,
        message: `You have spent ${currencySymbol}${excessWants.toFixed(2)} beyond the ideal 30% lifestyle budget.`,
        action: `Trim Dining Out, Shopping, or Subscriptions to re-route ${currencySymbol}${excessWants.toFixed(2)} directly into your savings.`
      });
    } else if (data.actualSavingsPct >= 20 && totalEarn > 0) {
      tips.push({
        id: 'healthy_savings',
        severity: 'success',
        badge: 'Top Performer',
        icon: 'award',
        title: `Outstanding! Savings rate is ${savingsRate}%`,
        message: `You are beating the standard 20% savings rule. Keep this momentum to build wealth rapidly.`,
        action: `Consider moving ${currencySymbol}${(netSavings * 0.6).toFixed(2)} into high-yield savings or an investment fund.`
      });
    }

    // Check 3: Top spending category optimization
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (sortedCategories.length > 0) {
      const [topCategory, topAmount] = sortedCategories[0];
      const categoryShare = totalExpense > 0 ? ((topAmount / totalExpense) * 100).toFixed(0) : 0;

      if (categoryShare >= 30) {
        let recommendation = '';
        if (topCategory === 'Dining Out') {
          recommendation = `Meal prepping or cooking dinner 2 more nights weekly can save an estimated ${currencySymbol}${(topAmount * 0.35).toFixed(2)} monthly.`;
        } else if (topCategory === 'Shopping') {
          recommendation = `Apply the "48-Hour Rule": wait 2 days before completing non-essential purchases. This curbs impulse buying by ~40%.`;
        } else if (topCategory === 'Transport & Fuel') {
          recommendation = `Carpool, combine errands into single trips, or utilize transit passes to lower fuel and ride-hail costs.`;
        } else if (topCategory === 'Subscriptions') {
          recommendation = `Audit your active streaming & app subscriptions. Canceling 2 unused ones saves ${currencySymbol}${(topAmount * 0.4).toFixed(2)} monthly.`;
        } else {
          recommendation = `Setting a hard ceiling of ${currencySymbol}${(topAmount * 0.8).toFixed(2)} on ${topCategory} will boost your savings.`;
        }

        tips.push({
          id: 'top_category_cut',
          severity: 'info',
          badge: 'Category Insight',
          icon: 'pie-chart',
          title: `${topCategory} takes ${categoryShare}% of your entire budget`,
          message: `You've spent ${currencySymbol}${topAmount.toFixed(2)} on this single category this month.`,
          action: recommendation
        });
      }
    }

    // Check 4: Small Leakage / Micro-expenses ("The Latte Factor")
    if (smallExpenses.length >= 4) {
      const smallSum = smallExpenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
      const projectedAnnualLeak = smallSum * 12;
      tips.push({
        id: 'latte_factor',
        severity: 'warning',
        badge: 'Latte Factor Alert',
        icon: 'coffee',
        title: `${smallExpenses.length} micro-expenses detected (${currencySymbol}${smallSum.toFixed(2)})`,
        message: `Small daily snacks, coffees, and miscellaneous purchases quietly add up to ~${currencySymbol}${projectedAnnualLeak.toFixed(2)} per year!`,
        action: `Carry a water bottle and prepare your own snacks. Allocate a fixed cash pocket allowance to stop unmonitored leaks.`
      });
    }

    // Check 5: Daily Pace & Burn Rate
    if (dailyBurnRate > dailyLimit && dailyLimit > 0) {
      const recommendedDaily = daysRemaining > 0 
        ? Math.max(0, (totalEarn - totalExpense) / daysRemaining)
        : 0;

      tips.push({
        id: 'burn_rate_warning',
        severity: 'warning',
        badge: 'Daily Pace',
        icon: 'zap',
        title: `Daily burn rate is high (${currencySymbol}${dailyBurnRate.toFixed(2)}/day)`,
        message: `Your current pace exceeds your safe daily target of ${currencySymbol}${dailyLimit.toFixed(2)}/day.`,
        action: recommendedDaily > 0 
          ? `Slow spending to ${currencySymbol}${recommendedDaily.toFixed(2)}/day for the next ${daysRemaining} days to protect your savings.`
          : 'Hold spending strictly to essential groceries and transport only.'
      });
    }

    // Check 6: Today's status
    if (todaySpent > dailyLimit && dailyLimit > 0) {
      tips.push({
        id: 'today_exceeded',
        severity: 'info',
        badge: 'Today Alert',
        icon: 'calendar',
        title: `Today's budget exceeded by ${currencySymbol}${(todaySpent - dailyLimit).toFixed(2)}`,
        message: `You spent ${currencySymbol}${todaySpent.toFixed(2)} today against a ${currencySymbol}${dailyLimit.toFixed(2)} limit.`,
        action: `Plan a "No-Spend Day" tomorrow to naturally balance out today's excess.`
      });
    }

    // Fallback baseline tip if few transactions
    if (tips.length === 0) {
      tips.push({
        id: 'baseline_rule',
        severity: 'info',
        badge: 'Smart Tip',
        icon: 'shield',
        title: 'The Golden 50/30/20 Rule',
        message: 'Aim to allocate 50% of your earnings to Needs, 30% to Wants, and commit at least 20% to emergency savings.',
        action: 'Log all expenses daily so the AI can find exact cost-cutting opportunities for you!'
      });
    }

    return tips;
  },

  /**
   * What-If Simulator: Calculate savings when cutting categories by a percentage
   */
  simulateSavings(monthlyExpenses, cutPercentages) {
    let totalSavedMonthly = 0;
    const categorySavings = {};

    for (const [category, percent] of Object.entries(cutPercentages)) {
      const amount = monthlyExpenses[category] || 0;
      const saved = amount * (percent / 100);
      categorySavings[category] = saved;
      totalSavedMonthly += saved;
    }

    return {
      monthlySavings: totalSavedMonthly,
      sixMonthSavings: totalSavedMonthly * 6,
      annualSavings: totalSavedMonthly * 12,
      categorySavings
    };
  }
};

if (typeof module !== 'undefined') {
  module.exports = AdvisoryEngine;
}
