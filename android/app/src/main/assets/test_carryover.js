/**
 * Test Suite for Phase 1: Carry-Over & Historical Calculation
 * Tests:
 * 1. Month boundary (transactions right on boundary, before, and after)
 * 2. Edited/deleted old transaction reflects in opening balance dynamically
 * 3. Empty history (opening balance = 0, month savings = 0)
 * 4. Negative opening balance (expenses exceeded income in prior months)
 * 5. Multi-month carry-over across past months
 */

// Simple lightweight assertion runner
function runTests() {
  const results = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error('FAILED: ' + message);
    }
  }

  // --- Test 1: Empty history ---
  {
    const res = AdvisoryEngine.analyze([], '$', 25, 2026, 9); // Oct 2026
    assert(res.monthOverview.openingBalance === 0, 'Empty history opening balance should be 0');
    assert(res.monthOverview.totalEarn === 0, 'Empty history totalEarn should be 0');
    assert(res.monthOverview.totalExpense === 0, 'Empty history totalExpense should be 0');
    assert(res.monthOverview.availableBalance === 0, 'Empty history availableBalance should be 0');
    results.push('✓ Test 1 Passed: Empty history correctly yields $0.00 across all balances');
  }

  // --- Test 2: Month boundary calculation ---
  {
    const txs = [
      // Prior month: September 2026
      { id: '1', type: 'earn', amount: 1000, date: '2026-09-15T12:00:00Z', category: 'Salary' },
      { id: '2', type: 'cost', amount: 400, date: '2026-09-30T23:59:59Z', category: 'Groceries' }, // Right before boundary
      // Selected month: October 2026
      { id: '3', type: 'earn', amount: 1200, date: '2026-10-01T00:00:01Z', category: 'Salary' }, // Right after boundary
      { id: '4', type: 'cost', amount: 500, date: '2026-10-15T12:00:00Z', category: 'Housing & Rent' },
      // Future month: November 2026
      { id: '5', type: 'earn', amount: 2000, date: '2026-11-05T12:00:00Z', category: 'Salary' }
    ];

    const oct = AdvisoryEngine.analyze(txs, '$', 25, 2026, 9); // Month index 9 = October
    // Prior month net = 1000 - 400 = 600
    assert(oct.monthOverview.openingBalance === 600, `Expected openingBalance 600, got ${oct.monthOverview.openingBalance}`);
    assert(oct.monthOverview.totalEarn === 1200, `Expected totalEarn 1200, got ${oct.monthOverview.totalEarn}`);
    assert(oct.monthOverview.totalExpense === 500, `Expected totalExpense 500, got ${oct.monthOverview.totalExpense}`);
    assert(oct.monthOverview.monthSavings === 700, `Expected monthSavings 700, got ${oct.monthOverview.monthSavings}`);
    // Available = opening (600) + monthEarn (1200) - monthExpense (500) = 1300
    assert(oct.monthOverview.availableBalance === 1300, `Expected availableBalance 1300, got ${oct.monthOverview.availableBalance}`);
    results.push('✓ Test 2 Passed: Month boundary calculation isolates prior, current, and future months accurately');
  }

  // --- Test 3: Edited or deleted old transaction updates opening balance dynamically without stored state ---
  {
    const initialTxs = [
      { id: '1', type: 'earn', amount: 1000, date: '2026-08-10T10:00:00Z', category: 'Salary' },
      { id: '2', type: 'cost', amount: 200, date: '2026-08-20T10:00:00Z', category: 'Dining Out' },
      { id: '3', type: 'earn', amount: 500, date: '2026-09-01T10:00:00Z', category: 'Salary' }
    ];

    let sep = AdvisoryEngine.analyze(initialTxs, '$', 25, 2026, 8); // September 2026
    assert(sep.monthOverview.openingBalance === 800, `Expected opening 800 before edit, got ${sep.monthOverview.openingBalance}`);

    // User edits Aug expense from 200 -> 350
    const editedTxs = initialTxs.map(t => t.id === '2' ? { ...t, amount: 350 } : t);
    sep = AdvisoryEngine.analyze(editedTxs, '$', 25, 2026, 8);
    assert(sep.monthOverview.openingBalance === 650, `Expected opening 650 after edit, got ${sep.monthOverview.openingBalance}`);

    // User deletes the old transaction completely
    const deletedTxs = initialTxs.filter(t => t.id !== '2');
    sep = AdvisoryEngine.analyze(deletedTxs, '$', 25, 2026, 8);
    assert(sep.monthOverview.openingBalance === 1000, `Expected opening 1000 after deletion, got ${sep.monthOverview.openingBalance}`);
    results.push('✓ Test 3 Passed: Dynamic computation correctly re-evaluates opening balance when old transactions are edited or deleted');
  }

  // --- Test 4: Negative opening balance (prior deficit) ---
  {
    const deficitTxs = [
      { id: '1', type: 'earn', amount: 500, date: '2026-08-10T10:00:00Z', category: 'Salary' },
      { id: '2', type: 'cost', amount: 900, date: '2026-08-20T10:00:00Z', category: 'Housing & Rent' },
      // September: Earn 1000, Spend 300
      { id: '3', type: 'earn', amount: 1000, date: '2026-09-05T10:00:00Z', category: 'Salary' },
      { id: '4', type: 'cost', amount: 300, date: '2026-09-12T10:00:00Z', category: 'Groceries' }
    ];

    const sep = AdvisoryEngine.analyze(deficitTxs, '$', 25, 2026, 8); // Sep 2026
    // Opening balance = 500 - 900 = -400
    assert(sep.monthOverview.openingBalance === -400, `Expected negative opening -400, got ${sep.monthOverview.openingBalance}`);
    assert(sep.monthOverview.monthSavings === 700, `Expected monthSavings 700, got ${sep.monthOverview.monthSavings}`);
    // Available = -400 + 1000 - 300 = 300
    assert(sep.monthOverview.availableBalance === 300, `Expected availableBalance 300, got ${sep.monthOverview.availableBalance}`);
    results.push('✓ Test 4 Passed: Negative opening balance handles past deficit cleanly');
  }

  // --- Test 5: Historical past month view ---
  {
    const txs = [
      { id: '1', type: 'earn', amount: 1000, date: '2026-01-10T10:00:00Z', category: 'Salary' },
      { id: '2', type: 'cost', amount: 300, date: '2026-01-20T10:00:00Z', category: 'Groceries' },
      { id: '3', type: 'earn', amount: 1200, date: '2026-02-10T10:00:00Z', category: 'Salary' },
      { id: '4', type: 'cost', amount: 400, date: '2026-02-20T10:00:00Z', category: 'Groceries' }
    ];

    // Check January 2026: opening = 0, available = 700
    const jan = AdvisoryEngine.analyze(txs, '$', 25, 2026, 0);
    assert(jan.monthOverview.openingBalance === 0, 'Jan opening should be 0');
    assert(jan.monthOverview.availableBalance === 700, 'Jan available should be 700');

    // Check February 2026: opening = 700, available = 700 + 1200 - 400 = 1500
    const feb = AdvisoryEngine.analyze(txs, '$', 25, 2026, 1);
    assert(feb.monthOverview.openingBalance === 700, 'Feb opening should be 700');
    assert(feb.monthOverview.availableBalance === 1500, 'Feb available should be 1500');
    results.push('✓ Test 5 Passed: Multi-month historical inspection accurately advances opening balances across past months');
  }

  return results;
}

// In Node or Browser environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests };
} else if (typeof window !== 'undefined') {
  window.runCarryOverTests = runTests;
}
