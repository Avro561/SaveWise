/**
 * SaveWise Application Controller
 * Handles UI interactions, local persistence, audio synthesis,
 * charting, and advisory integration.
 */

// Category Definitions with Icons and Theme Colors
const CATEGORIES = {
  cost: [
    { name: 'Dining Out', icon: '🍔', color: '#f97316' },
    { name: 'Groceries', icon: '🛒', color: '#10b981' },
    { name: 'Transport & Fuel', icon: '🚌', color: '#06b6d4' },
    { name: 'Housing & Rent', icon: '🏠', color: '#3b82f6' },
    { name: 'Utilities & Bills', icon: '💡', color: '#eab308' },
    { name: 'Entertainment', icon: '🎬', color: '#a855f7' },
    { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
    { name: 'Health & Medical', icon: '💊', color: '#ef4444' },
    { name: 'Education', icon: '📚', color: '#6366f1' },
    { name: 'Subscriptions', icon: '📱', color: '#8b5cf6' },
    { name: 'Personal Care', icon: '✨', color: '#14b8a6' },
    { name: 'Gifts & Donations', icon: '🎁', color: '#f43f5e' },
    { name: 'Other Expense', icon: '📝', color: '#64748b' }
  ],
  earn: [
    { name: 'Salary', icon: '💼', color: '#10b981' },
    { name: 'Freelance / Contract', icon: '💻', color: '#06b6d4' },
    { name: 'Business / Sales', icon: '📈', color: '#3b82f6' },
    { name: 'Investments / Dividends', icon: '📊', color: '#8b5cf6' },
    { name: 'Rental Income', icon: '🏢', color: '#eab308' },
    { name: 'Gifts / Allowance', icon: '🎉', color: '#ec4899' },
    { name: 'Other Income', icon: '💵', color: '#64748b' }
  ]
};

// Initial State
const state = {
  transactions: [],
  goals: [],
  currency: '$',
  customDailyLimit: 25,
  soundEnabled: true,
  theme: 'dark',
  activeTab: 'tab-dashboard',
  currentTxType: 'cost'
};

// --- Web Audio Synthesizer (No external mp3/wav files required!) ---
const SoundFX = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  play(type = 'tap') {
    if (!state.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      const now = this.ctx.currentTime;

      if (type === 'tap') {
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'delete') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (e) {
      console.warn('Audio not allowed yet:', e);
    }
  }
};

// --- Storage Controller ---
const Storage = {
  KEY_TX: 'savewise_transactions',
  KEY_GOALS: 'savewise_goals',
  KEY_SETTINGS: 'savewise_settings',

  load() {
    try {
      const tx = localStorage.getItem(this.KEY_TX);
      if (tx) state.transactions = JSON.parse(tx);

      const goals = localStorage.getItem(this.KEY_GOALS);
      if (goals) state.goals = JSON.parse(goals);

      const settings = localStorage.getItem(this.KEY_SETTINGS);
      if (settings) {
        const s = JSON.parse(settings);
        state.currency = s.currency || '$';
        state.customDailyLimit = s.customDailyLimit || 25;
        state.soundEnabled = s.soundEnabled !== undefined ? s.soundEnabled : true;
        state.theme = s.theme || 'dark';
      }
    } catch (e) {
      console.error('Storage load error:', e);
    }
  },

  save() {
    try {
      localStorage.setItem(this.KEY_TX, JSON.stringify(state.transactions));
      localStorage.setItem(this.KEY_GOALS, JSON.stringify(state.goals));
      localStorage.setItem(this.KEY_SETTINGS, JSON.stringify({
        currency: state.currency,
        customDailyLimit: state.customDailyLimit,
        soundEnabled: state.soundEnabled,
        theme: state.theme
      }));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }
};

// --- Formatting Helpers ---
function formatMoney(amount, currency = state.currency) {
  const num = parseFloat(amount) || 0;
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCategoryMeta(catName, type = 'cost') {
  const list = CATEGORIES[type] || CATEGORIES.cost;
  const match = list.find(c => c.name === catName);
  if (match) return match;
  return { name: catName, icon: type === 'earn' ? '💰' : '💳', color: '#64748b' };
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// --- DOM Cache ---
const DOM = {};

function initDOM() {
  DOM.currentDateDisplay = document.getElementById('currentDateDisplay');
  DOM.currencySelector = document.getElementById('currencySelector');
  DOM.themeToggleBtn = document.getElementById('themeToggleBtn');
  DOM.settingsBtn = document.getElementById('settingsBtn');

  // Dashboard elements
  DOM.netSavingsDisplay = document.getElementById('netSavingsDisplay');
  DOM.savingsRateBadge = document.getElementById('savingsRateBadge');
  DOM.savingsRateDisplay = document.getElementById('savingsRateDisplay');
  DOM.daysLeftDisplay = document.getElementById('daysLeftDisplay');
  DOM.totalEarnDisplay = document.getElementById('totalEarnDisplay');
  DOM.totalCostDisplay = document.getElementById('totalCostDisplay');
  DOM.budgetHealthBadge = document.getElementById('budgetHealthBadge');
  DOM.needsBar = document.getElementById('needsBar');
  DOM.wantsBar = document.getElementById('wantsBar');
  DOM.savingsBar = document.getElementById('savingsBar');
  DOM.needsPctDisplay = document.getElementById('needsPctDisplay');
  DOM.wantsPctDisplay = document.getElementById('wantsPctDisplay');
  DOM.savingsPctDisplay = document.getElementById('savingsPctDisplay');
  DOM.dashboardTipBadge = document.getElementById('dashboardTipBadge');
  DOM.dashboardTipTitle = document.getElementById('dashboardTipTitle');
  DOM.dashboardTipMsg = document.getElementById('dashboardTipMsg');
  DOM.seeAllTipsBtn = document.getElementById('seeAllTipsBtn');
  DOM.categoryDonutChart = document.getElementById('categoryDonutChart');
  DOM.chartTotalAmount = document.getElementById('chartTotalAmount');
  DOM.categoryLegendList = document.getElementById('categoryLegendList');
  DOM.recentTxList = document.getElementById('recentTxList');
  DOM.viewAllTxBtn = document.getElementById('viewAllTxBtn');

  // Daily elements
  DOM.todayDateHeading = document.getElementById('todayDateHeading');
  DOM.editDailyLimitBtn = document.getElementById('editDailyLimitBtn');
  DOM.dailyLimitVal = document.getElementById('dailyLimitVal');
  DOM.dailySpentBar = document.getElementById('dailySpentBar');
  DOM.todaySpentVal = document.getElementById('todaySpentVal');
  DOM.todayRemainingVal = document.getElementById('todayRemainingVal');
  DOM.todayCountBadge = document.getElementById('todayCountBadge');
  DOM.todayTxList = document.getElementById('todayTxList');

  // Transactions tab elements
  DOM.txSearchInput = document.getElementById('txSearchInput');
  DOM.txTypeFilter = document.getElementById('txTypeFilter');
  DOM.txCategoryFilter = document.getElementById('txCategoryFilter');
  DOM.txTimeFilter = document.getElementById('txTimeFilter');
  DOM.exportCsvBtn = document.getElementById('exportCsvBtn');
  DOM.txListHeading = document.getElementById('txListHeading');
  DOM.txTotalCount = document.getElementById('txTotalCount');
  DOM.allTxList = document.getElementById('allTxList');

  // Advisor elements
  DOM.advDailyBurn = document.getElementById('advDailyBurn');
  DOM.advProjectedSavings = document.getElementById('advProjectedSavings');
  DOM.advisorSuggestionsList = document.getElementById('advisorSuggestionsList');
  DOM.diningCutSlider = document.getElementById('diningCutSlider');
  DOM.diningCutVal = document.getElementById('diningCutVal');
  DOM.shoppingCutSlider = document.getElementById('shoppingCutSlider');
  DOM.shoppingCutVal = document.getElementById('shoppingCutVal');
  DOM.simMonthlySaved = document.getElementById('simMonthlySaved');
  DOM.simAnnualSaved = document.getElementById('simAnnualSaved');

  // Goals
  DOM.addGoalBtn = document.getElementById('addGoalBtn');
  DOM.goalsList = document.getElementById('goalsList');

  // Modals & Forms
  DOM.mainFab = document.getElementById('mainFab');
  DOM.txModal = document.getElementById('txModal');
  DOM.closeTxModalBtn = document.getElementById('closeTxModalBtn');
  DOM.cancelTxBtn = document.getElementById('cancelTxBtn');
  DOM.txForm = document.getElementById('txForm');
  DOM.editTxId = document.getElementById('editTxId');
  DOM.modalTitle = document.getElementById('modalTitle');
  DOM.typeCostBtn = document.getElementById('typeCostBtn');
  DOM.typeEarnBtn = document.getElementById('typeEarnBtn');
  DOM.txAmount = document.getElementById('txAmount');
  DOM.txTitle = document.getElementById('txTitle');
  DOM.txCategory = document.getElementById('txCategory');
  DOM.txDate = document.getElementById('txDate');
  DOM.txPaymentMethod = document.getElementById('txPaymentMethod');

  DOM.goalModal = document.getElementById('goalModal');
  DOM.closeGoalModalBtn = document.getElementById('closeGoalModalBtn');
  DOM.cancelGoalBtn = document.getElementById('cancelGoalBtn');
  DOM.goalForm = document.getElementById('goalForm');
  DOM.editGoalId = document.getElementById('editGoalId');
  DOM.goalName = document.getElementById('goalName');
  DOM.goalTarget = document.getElementById('goalTarget');
  DOM.goalSaved = document.getElementById('goalSaved');
  DOM.goalDeadline = document.getElementById('goalDeadline');

  DOM.dailyLimitModal = document.getElementById('dailyLimitModal');
  DOM.closeDailyLimitModalBtn = document.getElementById('closeDailyLimitModalBtn');
  DOM.cancelDailyLimitBtn = document.getElementById('cancelDailyLimitBtn');
  DOM.saveDailyLimitBtn = document.getElementById('saveDailyLimitBtn');
  DOM.customDailyInput = document.getElementById('customDailyInput');

  DOM.settingsModal = document.getElementById('settingsModal');
  DOM.closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  DOM.soundToggle = document.getElementById('soundToggle');
  DOM.openApkGuideBtn = document.getElementById('openApkGuideBtn');
  DOM.backupDataBtn = document.getElementById('backupDataBtn');
  DOM.restoreFileInput = document.getElementById('restoreFileInput');
  DOM.loadSampleDataBtn = document.getElementById('loadSampleDataBtn');
  DOM.clearAllDataBtn = document.getElementById('clearAllDataBtn');

  DOM.apkGuideModal = document.getElementById('apkGuideModal');
  DOM.closeApkGuideBtn = document.getElementById('closeApkGuideBtn');
}

// --- Render Controller ---
function renderAll() {
  updateDateDisplay();
  updateCurrencyLabels();
  populateCategorySelects();

  const analysis = AdvisoryEngine.analyze(
    state.transactions,
    state.currency,
    state.customDailyLimit
  );

  renderDashboard(analysis);
  renderDaily(analysis);
  renderTransactionsList();
  renderAdvisor(analysis);
  renderGoals();
}

function updateDateDisplay() {
  const now = new Date();
  const options = { month: 'long', year: 'numeric' };
  DOM.currentDateDisplay.textContent = now.toLocaleDateString('en-US', options);

  const dayOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  DOM.todayDateHeading.textContent = `Today, ${now.toLocaleDateString('en-US', dayOptions)}`;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate());
  DOM.daysLeftDisplay.textContent = `${daysLeft} days remaining`;
}

function updateCurrencyLabels() {
  document.querySelectorAll('.currency-symbol, .currency-label').forEach(el => {
    el.textContent = state.currency;
  });
  DOM.currencySelector.value = state.currency;
}

function populateCategorySelects() {
  // Modal category selector
  DOM.txCategory.innerHTML = '';
  const list = CATEGORIES[state.currentTxType] || CATEGORIES.cost;
  list.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = `${c.icon} ${c.name}`;
    DOM.txCategory.appendChild(opt);
  });

  // Filter category selector
  const currentFilterVal = DOM.txCategoryFilter.value;
  DOM.txCategoryFilter.innerHTML = '<option value="all">All Categories</option>';
  [...CATEGORIES.cost, ...CATEGORIES.earn].forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = `${c.icon} ${c.name}`;
    DOM.txCategoryFilter.appendChild(opt);
  });
  DOM.txCategoryFilter.value = currentFilterVal || 'all';
}

function renderDashboard(analysis) {
  const { monthOverview } = analysis;

  DOM.netSavingsDisplay.textContent = formatMoney(monthOverview.netSavings);
  DOM.savingsRateDisplay.textContent = `${monthOverview.savingsRate}%`;
  DOM.totalEarnDisplay.textContent = formatMoney(monthOverview.totalEarn);
  DOM.totalCostDisplay.textContent = formatMoney(monthOverview.totalExpense);

  // 50/30/20 bars
  const total = (monthOverview.needsTotal + monthOverview.wantsTotal + Math.max(0, monthOverview.netSavings)) || 1;
  const needsWidth = Math.min(100, (monthOverview.needsTotal / total) * 100);
  const wantsWidth = Math.min(100, (monthOverview.wantsTotal / total) * 100);
  const savingsWidth = Math.max(0, 100 - (needsWidth + wantsWidth));

  DOM.needsBar.style.width = `${needsWidth}%`;
  DOM.wantsBar.style.width = `${wantsWidth}%`;
  DOM.savingsBar.style.width = `${savingsWidth}%`;

  DOM.needsPctDisplay.textContent = `${monthOverview.needsPct}%`;
  DOM.wantsPctDisplay.textContent = `${monthOverview.wantsPct}%`;
  DOM.savingsPctDisplay.textContent = `${monthOverview.actualSavingsPct}%`;

  if (monthOverview.wantsPct > 30) {
    DOM.budgetHealthBadge.textContent = 'Wants High';
    DOM.budgetHealthBadge.className = 'badge warning';
  } else if (monthOverview.totalExpense > monthOverview.totalEarn && monthOverview.totalEarn > 0) {
    DOM.budgetHealthBadge.textContent = 'Deficit';
    DOM.budgetHealthBadge.className = 'badge danger';
  } else {
    DOM.budgetHealthBadge.textContent = 'Healthy';
    DOM.budgetHealthBadge.className = 'badge success';
  }

  // Dashboard top advice card
  if (analysis.suggestions.length > 0) {
    const topTip = analysis.suggestions[0];
    DOM.dashboardTipBadge.textContent = topTip.badge;
    DOM.dashboardTipTitle.textContent = topTip.title;
    DOM.dashboardTipMsg.textContent = `${topTip.message} → ${topTip.action}`;
  }

  // Donut chart & legend
  renderDonutChart(analysis.categoryBreakdown, monthOverview.totalExpense);

  // Recent 4 transactions
  const recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  renderTxItems(recent, DOM.recentTxList);
}

function renderDonutChart(categoryTotals, totalExpense) {
  DOM.chartTotalAmount.textContent = formatMoney(totalExpense);
  DOM.categoryDonutChart.innerHTML = '';
  DOM.categoryLegendList.innerHTML = '';

  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0 || totalExpense <= 0) {
    // Empty state placeholder ring
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '38');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#30363d');
    circle.setAttribute('stroke-width', '16');
    DOM.categoryDonutChart.appendChild(circle);

    DOM.categoryLegendList.innerHTML = '<div class="empty-state">No costs recorded for this month yet.</div>';
    return;
  }

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  entries.forEach(([catName, amount]) => {
    const meta = getCategoryMeta(catName, 'cost');
    const share = amount / totalExpense;
    const strokeDash = share * circumference;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', radius.toString());
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', meta.color);
    circle.setAttribute('stroke-width', '16');
    circle.setAttribute('stroke-dasharray', `${strokeDash} ${circumference - strokeDash}`);
    circle.setAttribute('stroke-dashoffset', (-offset).toString());
    circle.style.transition = 'stroke-dasharray 0.4s ease';

    DOM.categoryDonutChart.appendChild(circle);
    offset += strokeDash;

    // Legend item
    const row = document.createElement('div');
    row.className = 'legend-row';
    const pct = (share * 100).toFixed(0);
    row.innerHTML = `
      <div class="legend-left">
        <span class="legend-color-box" style="background-color: ${meta.color}"></span>
        <span>${meta.icon} ${catName}</span>
      </div>
      <div>
        <strong>${formatMoney(amount)}</strong>
        <span class="subtext">(${pct}%)</span>
      </div>
    `;
    DOM.categoryLegendList.appendChild(row);
  });
}

function renderDaily(analysis) {
  const { dailyOverview } = analysis;
  DOM.dailyLimitVal.textContent = formatMoney(dailyOverview.dailyLimit);
  DOM.todaySpentVal.textContent = formatMoney(dailyOverview.todaySpent);

  const remaining = Math.max(0, dailyOverview.todayRemaining);
  DOM.todayRemainingVal.textContent = formatMoney(remaining);

  const pct = dailyOverview.dailyLimit > 0
    ? Math.min(100, (dailyOverview.todaySpent / dailyOverview.dailyLimit) * 100)
    : 0;

  DOM.dailySpentBar.style.width = `${pct}%`;
  if (pct >= 100) {
    DOM.dailySpentBar.style.backgroundColor = 'var(--cost)';
  } else if (pct >= 75) {
    DOM.dailySpentBar.style.backgroundColor = 'var(--warning)';
  } else {
    DOM.dailySpentBar.style.backgroundColor = 'var(--primary)';
  }

  // Today's list
  const todayStr = new Date().toISOString().split('T')[0];
  const todayItems = state.transactions
    .filter(t => t.date.startsWith(todayStr))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  DOM.todayCountBadge.textContent = `${todayItems.length} items`;
  renderTxItems(todayItems, DOM.todayTxList);
}

function renderTxItems(items, container) {
  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state">No transactions recorded yet.</div>';
    return;
  }

  items.forEach(t => {
    const meta = getCategoryMeta(t.category, t.type);
    const item = document.createElement('div');
    item.className = 'transaction-item';

    const isCost = t.type === 'cost';
    const sign = isCost ? '-' : '+';
    const colorClass = isCost ? 'text-cost' : 'text-earn';
    const d = new Date(t.date);
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    item.innerHTML = `
      <div class="tx-left">
        <div class="tx-icon-wrap" style="background-color: ${meta.color}20; color: ${meta.color}">
          ${meta.icon}
        </div>
        <div>
          <div class="tx-title">${escapeHTML(t.title || t.category)}</div>
          <div class="tx-meta">${meta.icon} ${t.category} • ${dateFormatted} • ${t.paymentMethod || 'Cash'}</div>
        </div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${colorClass}">${sign}${formatMoney(t.amount)}</div>
        <div class="tx-actions">
          <button class="tx-action-btn edit-tx-btn" data-id="${t.id}">✎ Edit</button>
          <button class="tx-action-btn delete-tx-btn" data-id="${t.id}">🗑️</button>
        </div>
      </div>
    `;

    // Hook listeners
    item.querySelector('.edit-tx-btn').addEventListener('click', () => openEditTxModal(t.id));
    item.querySelector('.delete-tx-btn').addEventListener('click', () => deleteTx(t.id));

    container.appendChild(item);
  });
}

function renderTransactionsList() {
  const searchTerm = (DOM.txSearchInput.value || '').toLowerCase().trim();
  const typeFilter = DOM.txTypeFilter.value;
  const categoryFilter = DOM.txCategoryFilter.value;
  const timeFilter = DOM.txTimeFilter.value;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let filtered = state.transactions.filter(t => {
    // Search
    if (searchTerm) {
      const matchTitle = (t.title || '').toLowerCase().includes(searchTerm);
      const matchCat = (t.category || '').toLowerCase().includes(searchTerm);
      const matchPay = (t.paymentMethod || '').toLowerCase().includes(searchTerm);
      if (!matchTitle && !matchCat && !matchPay) return false;
    }

    // Type
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;

    // Category
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

    // Time
    const d = new Date(t.date);
    if (timeFilter === 'this_month') {
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
    } else if (timeFilter === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      if (!t.date.startsWith(todayStr)) return false;
    } else if (timeFilter === 'last_7_days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      if (d < sevenDaysAgo) return false;
    } else if (timeFilter === 'last_month') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      if (d.getMonth() !== lastMonth || d.getFullYear() !== lastMonthYear) return false;
    }

    return true;
  });

  // Sort descending by date
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  DOM.txTotalCount.textContent = `${filtered.length} records`;
  renderTxItems(filtered, DOM.allTxList);
}

function renderAdvisor(analysis) {
  const { dailyOverview, suggestions } = analysis;
  DOM.advDailyBurn.textContent = `${formatMoney(dailyOverview.dailyBurnRate)}/day`;
  DOM.advProjectedSavings.textContent = formatMoney(dailyOverview.projectedMonthSavings);

  DOM.advisorSuggestionsList.innerHTML = '';
  suggestions.forEach(tip => {
    const card = document.createElement('div');
    card.className = `suggestion-card ${tip.severity}`;
    card.innerHTML = `
      <div class="sug-header">
        <span class="sug-badge ${tip.severity}">${tip.badge}</span>
      </div>
      <div class="sug-title">${tip.title}</div>
      <div class="sug-msg">${tip.message}</div>
      <div class="sug-action">💡 <strong>Advice:</strong> ${tip.action}</div>
    `;
    DOM.advisorSuggestionsList.appendChild(card);
  });

  // Simulator calculation
  updateSimulator(analysis.categoryBreakdown);
}

function updateSimulator(categoryTotals) {
  const diningPct = parseInt(DOM.diningCutSlider.value, 10);
  const shoppingPct = parseInt(DOM.shoppingCutSlider.value, 10);
  DOM.diningCutVal.textContent = `${diningPct}%`;
  DOM.shoppingCutVal.textContent = `${shoppingPct}%`;

  const simResult = AdvisoryEngine.simulateSavings(categoryTotals, {
    'Dining Out': diningPct,
    'Shopping': shoppingPct
  });

  DOM.simMonthlySaved.textContent = `+${formatMoney(simResult.monthlySavings)}`;
  DOM.simAnnualSaved.textContent = `+${formatMoney(simResult.annualSavings)}`;
}

function renderGoals() {
  DOM.goalsList.innerHTML = '';
  if (state.goals.length === 0) {
    DOM.goalsList.innerHTML = `
      <div class="card empty-state">
        <p>No savings goals set yet!</p>
        <p class="subtext">Create a goal for an Emergency Fund, a Laptop, or Vacation to stay motivated.</p>
      </div>
    `;
    return;
  }

  state.goals.forEach(goal => {
    const target = parseFloat(goal.target) || 1;
    const saved = parseFloat(goal.saved) || 0;
    const pct = Math.min(100, (saved / target) * 100);

    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-header">
        <div>
          <div class="goal-name">🎯 ${escapeHTML(goal.name)}</div>
          <div class="goal-deadline">${goal.deadline ? `Target: ${goal.deadline}` : 'No deadline'}</div>
        </div>
        <button class="tx-action-btn delete-goal-btn" data-id="${goal.id}">🗑️</button>
      </div>
      <div class="goal-bar">
        <div class="goal-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="goal-stats">
        <span>${formatMoney(saved)} saved (${pct.toFixed(0)}%)</span>
        <span>Target: ${formatMoney(target)}</span>
      </div>
      <button class="goal-quick-add-btn add-to-goal-btn" data-id="${goal.id}">+ Allocate $10 to this Goal</button>
    `;

    card.querySelector('.delete-goal-btn').addEventListener('click', () => deleteGoal(goal.id));
    card.querySelector('.add-to-goal-btn').addEventListener('click', () => {
      goal.saved = (parseFloat(goal.saved) || 0) + 10;
      Storage.save();
      SoundFX.play('success');
      showToast(`Added $10 to ${goal.name}!`);
      renderGoals();
    });

    DOM.goalsList.appendChild(card);
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// --- CRUD Operations ---
function openAddTxModal(type = 'cost', preset = null) {
  DOM.editTxId.value = '';
  DOM.modalTitle.textContent = type === 'cost' ? 'Record Expense (Cost)' : 'Record Income (Earn)';
  setTxType(type);

  DOM.txAmount.value = preset?.amount || '';
  DOM.txTitle.value = preset?.name || '';
  if (preset?.cat) {
    DOM.txCategory.value = preset.cat;
  }
  DOM.txDate.value = new Date().toISOString().split('T')[0];
  DOM.txPaymentMethod.value = 'Cash';

  DOM.txModal.classList.add('active');
  SoundFX.play('tap');
}

function openEditTxModal(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;

  DOM.editTxId.value = tx.id;
  DOM.modalTitle.textContent = 'Edit Transaction';
  setTxType(tx.type);

  DOM.txAmount.value = tx.amount;
  DOM.txTitle.value = tx.title || '';
  DOM.txCategory.value = tx.category;
  DOM.txDate.value = tx.date.split('T')[0];
  DOM.txPaymentMethod.value = tx.paymentMethod || 'Cash';

  DOM.txModal.classList.add('active');
  SoundFX.play('tap');
}

function setTxType(type) {
  state.currentTxType = type;
  if (type === 'cost') {
    DOM.typeCostBtn.classList.add('active');
    DOM.typeEarnBtn.classList.remove('active');
  } else {
    DOM.typeEarnBtn.classList.add('active');
    DOM.typeCostBtn.classList.remove('active');
  }
  populateCategorySelects();
}

function saveTransaction(e) {
  e.preventDefault();
  const id = DOM.editTxId.value;
  const amount = parseFloat(DOM.txAmount.value);
  const title = DOM.txTitle.value.trim();
  const category = DOM.txCategory.value;
  const dateVal = DOM.txDate.value;
  const paymentMethod = DOM.txPaymentMethod.value;

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount');
    return;
  }

  const txData = {
    id: id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    type: state.currentTxType,
    amount,
    title,
    category,
    date: dateVal + 'T12:00:00',
    paymentMethod
  };

  if (id) {
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      state.transactions[idx] = txData;
      showToast('Transaction updated!');
    }
  } else {
    state.transactions.unshift(txData);
    showToast(state.currentTxType === 'cost' ? 'Expense logged!' : 'Income logged!');
  }

  Storage.save();
  SoundFX.play('success');
  DOM.txModal.classList.remove('active');
  renderAll();
}

function deleteTx(id) {
  if (confirm('Delete this transaction?')) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    Storage.save();
    SoundFX.play('delete');
    showToast('Transaction deleted');
    renderAll();
  }
}

function deleteGoal(id) {
  if (confirm('Delete this goal?')) {
    state.goals = state.goals.filter(g => g.id !== id);
    Storage.save();
    SoundFX.play('delete');
    showToast('Goal deleted');
    renderGoals();
  }
}

// --- CSV Export & JSON Backup ---
function exportToCSV() {
  if (state.transactions.length === 0) {
    showToast('No transactions to export.');
    return;
  }

  const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'PaymentMethod'];
  const rows = state.transactions.map(t => [
    t.date.split('T')[0],
    t.type,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.amount,
    `"${(t.paymentMethod || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `SaveWise_Export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Exported CSV successfully!');
}

function backupToJSON() {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    settings: {
      currency: state.currency,
      customDailyLimit: state.customDailyLimit,
      theme: state.theme,
      soundEnabled: state.soundEnabled
    },
    transactions: state.transactions,
    goals: state.goals
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `SaveWise_Backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Backup JSON downloaded!');
}

function restoreFromJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data.transactions)) {
        state.transactions = data.transactions;
      }
      if (Array.isArray(data.goals)) {
        state.goals = data.goals;
      }
      if (data.settings) {
        state.currency = data.settings.currency || state.currency;
        state.customDailyLimit = data.settings.customDailyLimit || state.customDailyLimit;
      }
      Storage.save();
      showToast('Data restored successfully!');
      renderAll();
      DOM.settingsModal.classList.remove('active');
    } catch (err) {
      alert('Invalid JSON file format.');
    }
  };
  reader.readAsText(file);
}

// --- Sample / Demo Data Loader ---
function loadSampleData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');

  state.transactions = [
    // Income
    { id: 'demo_inc_1', type: 'earn', amount: 3200, title: 'Monthly Salary', category: 'Salary', date: `${year}-${month}-01T10:00:00`, paymentMethod: 'Bank Transfer' },
    { id: 'demo_inc_2', type: 'earn', amount: 450, title: 'Mobile App Freelance', category: 'Freelance / Contract', date: `${year}-${month}-12T15:00:00`, paymentMethod: 'Bank Transfer' },

    // Essential Needs
    { id: 'demo_cost_1', type: 'cost', amount: 950, title: 'Apartment Rent', category: 'Housing & Rent', date: `${year}-${month}-02T09:00:00`, paymentMethod: 'Bank Transfer' },
    { id: 'demo_cost_2', type: 'cost', amount: 120, title: 'Electricity & Internet', category: 'Utilities & Bills', date: `${year}-${month}-05T14:00:00`, paymentMethod: 'Debit Card' },
    { id: 'demo_cost_3', type: 'cost', amount: 185, title: 'Weekly Grocery Haul', category: 'Groceries', date: `${year}-${month}-07T18:00:00`, paymentMethod: 'Credit Card' },
    { id: 'demo_cost_4', type: 'cost', amount: 65, title: 'Fuel & Metro card', category: 'Transport & Fuel', date: `${year}-${month}-10T08:30:00`, paymentMethod: 'Cash' },

    // Wants & Discretionary (Dining, Shopping)
    { id: 'demo_cost_5', type: 'cost', amount: 68, title: 'Weekend Dinner & Drinks', category: 'Dining Out', date: `${year}-${month}-14T20:00:00`, paymentMethod: 'Credit Card' },
    { id: 'demo_cost_6', type: 'cost', amount: 140, title: 'Sneakers & T-Shirt', category: 'Shopping', date: `${year}-${month}-18T16:00:00`, paymentMethod: 'Credit Card' },
    { id: 'demo_cost_7', type: 'cost', amount: 15, title: 'Netflix & Spotify', category: 'Subscriptions', date: `${year}-${month}-20T00:00:00`, paymentMethod: 'Credit Card' },

    // Small Latte Factor Leaks
    { id: 'demo_cost_8', type: 'cost', amount: 4.5, title: 'Morning Latte', category: 'Dining Out', date: `${year}-${month}-22T08:15:00`, paymentMethod: 'Cash' },
    { id: 'demo_cost_9', type: 'cost', amount: 3.5, title: 'Pastry & Tea', category: 'Dining Out', date: `${year}-${month}-23T16:30:00`, paymentMethod: 'Cash' },
    { id: 'demo_cost_10', type: 'cost', amount: 4.0, title: 'Ice Cream', category: 'Dining Out', date: `${year}-${month}-25T19:00:00`, paymentMethod: 'Cash' },
    { id: 'demo_cost_11', type: 'cost', amount: 5.0, title: 'Car wash tip & snack', category: 'Dining Out', date: `${year}-${month}-${d}T11:00:00`, paymentMethod: 'Cash' },

    // Today's Expense
    { id: 'demo_cost_12', type: 'cost', amount: 14.5, title: 'Office Lunch bowl', category: 'Dining Out', date: `${year}-${month}-${d}T13:00:00`, paymentMethod: 'Debit Card' }
  ];

  state.goals = [
    { id: 'g_1', name: 'Emergency Fund (3 Months)', target: 3000, saved: 1450, deadline: `${year}-12-31` },
    { id: 'g_2', name: 'New Smartphone / Laptop', target: 800, saved: 320, deadline: `${year}-11-30` }
  ];

  Storage.save();
  SoundFX.play('success');
  showToast('Demo data loaded! Check Dashboard and Advisor.');
  renderAll();
  DOM.settingsModal.classList.remove('active');
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
      state.activeTab = targetId;
      SoundFX.play('tap');

      if (targetId === 'tab-advisor') {
        const analysis = AdvisoryEngine.analyze(state.transactions, state.currency, state.customDailyLimit);
        renderAdvisor(analysis);
      }
    });
  });

  // FAB
  DOM.mainFab.addEventListener('click', () => {
    openAddTxModal('cost');
  });

  // Header Currency
  DOM.currencySelector.addEventListener('change', (e) => {
    state.currency = e.target.value;
    Storage.save();
    renderAll();
  });

  // Theme Toggle
  DOM.themeToggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('dark-theme')) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      state.theme = 'light';
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      state.theme = 'dark';
    }
    Storage.save();
    SoundFX.play('tap');
  });

  // Settings Modal
  DOM.settingsBtn.addEventListener('click', () => {
    DOM.soundToggle.checked = state.soundEnabled;
    DOM.settingsModal.classList.add('active');
    SoundFX.play('tap');
  });
  DOM.closeSettingsModalBtn.addEventListener('click', () => DOM.settingsModal.classList.remove('active'));

  DOM.soundToggle.addEventListener('change', (e) => {
    state.soundEnabled = e.target.checked;
    Storage.save();
  });

  DOM.openApkGuideBtn.addEventListener('click', () => {
    DOM.settingsModal.classList.remove('active');
    DOM.apkGuideModal.classList.add('active');
  });
  DOM.closeApkGuideBtn.addEventListener('click', () => DOM.apkGuideModal.classList.remove('active'));

  DOM.backupDataBtn.addEventListener('click', backupToJSON);
  DOM.restoreFileInput.addEventListener('change', restoreFromJSON);
  DOM.loadSampleDataBtn.addEventListener('click', loadSampleData);
  DOM.clearAllDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL transactions and goals?')) {
      state.transactions = [];
      state.goals = [];
      Storage.save();
      SoundFX.play('delete');
      showToast('All data cleared.');
      renderAll();
      DOM.settingsModal.classList.remove('active');
    }
  });

  // Transaction Modal Form
  DOM.closeTxModalBtn.addEventListener('click', () => DOM.txModal.classList.remove('active'));
  DOM.cancelTxBtn.addEventListener('click', () => DOM.txModal.classList.remove('active'));
  DOM.typeCostBtn.addEventListener('click', () => setTxType('cost'));
  DOM.typeEarnBtn.addEventListener('click', () => setTxType('earn'));
  DOM.txForm.addEventListener('submit', saveTransaction);

  // Quick 1-tap chips in Daily tab
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.getAttribute('data-cat');
      const name = chip.getAttribute('data-name');
      const amount = chip.getAttribute('data-amount');
      openAddTxModal('cost', { cat, name, amount });
    });
  });

  // Daily Limit Modal
  DOM.editDailyLimitBtn.addEventListener('click', () => {
    DOM.customDailyInput.value = state.customDailyLimit;
    DOM.dailyLimitModal.classList.add('active');
    SoundFX.play('tap');
  });
  DOM.closeDailyLimitModalBtn.addEventListener('click', () => DOM.dailyLimitModal.classList.remove('active'));
  DOM.cancelDailyLimitBtn.addEventListener('click', () => DOM.dailyLimitModal.classList.remove('active'));
  DOM.saveDailyLimitBtn.addEventListener('click', () => {
    const val = parseFloat(DOM.customDailyInput.value);
    if (!isNaN(val) && val > 0) {
      state.customDailyLimit = val;
      Storage.save();
      SoundFX.play('success');
      showToast('Daily budget limit updated!');
      DOM.dailyLimitModal.classList.remove('active');
      renderAll();
    }
  });

  // Transactions Filter
  DOM.txSearchInput.addEventListener('input', renderTransactionsList);
  DOM.txTypeFilter.addEventListener('change', renderTransactionsList);
  DOM.txCategoryFilter.addEventListener('change', renderTransactionsList);
  DOM.txTimeFilter.addEventListener('change', renderTransactionsList);
  DOM.exportCsvBtn.addEventListener('click', exportToCSV);

  // Dashboard shortcuts
  DOM.seeAllTipsBtn.addEventListener('click', () => {
    document.querySelector('.nav-item[data-tab="tab-advisor"]').click();
  });
  DOM.viewAllTxBtn.addEventListener('click', () => {
    document.querySelector('.nav-item[data-tab="tab-transactions"]').click();
  });

  // Simulator Sliders
  DOM.diningCutSlider.addEventListener('input', () => {
    const analysis = AdvisoryEngine.analyze(state.transactions, state.currency, state.customDailyLimit);
    updateSimulator(analysis.categoryBreakdown);
  });
  DOM.shoppingCutSlider.addEventListener('input', () => {
    const analysis = AdvisoryEngine.analyze(state.transactions, state.currency, state.customDailyLimit);
    updateSimulator(analysis.categoryBreakdown);
  });

  // Goals Modal
  DOM.addGoalBtn.addEventListener('click', () => {
    DOM.editGoalId.value = '';
    DOM.goalName.value = '';
    DOM.goalTarget.value = '';
    DOM.goalSaved.value = '0';
    DOM.goalDeadline.value = '';
    DOM.goalModal.classList.add('active');
    SoundFX.play('tap');
  });
  DOM.closeGoalModalBtn.addEventListener('click', () => DOM.goalModal.classList.remove('active'));
  DOM.cancelGoalBtn.addEventListener('click', () => DOM.goalModal.classList.remove('active'));
  DOM.goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = DOM.goalName.value.trim();
    const target = parseFloat(DOM.goalTarget.value);
    const saved = parseFloat(DOM.goalSaved.value) || 0;
    const deadline = DOM.goalDeadline.value;

    if (!name || isNaN(target) || target <= 0) {
      showToast('Please provide a goal name and target amount');
      return;
    }

    state.goals.push({
      id: 'goal_' + Date.now(),
      name,
      target,
      saved,
      deadline
    });

    Storage.save();
    SoundFX.play('success');
    showToast('New savings goal added!');
    DOM.goalModal.classList.remove('active');
    renderGoals();
  });

  // Close modals on background backdrop tap
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
}

// --- App Bootstrap ---
window.addEventListener('DOMContentLoaded', () => {
  Storage.load();
  initDOM();
  setupEventListeners();

  // Apply saved theme
  if (state.theme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('SW registration note:', err);
    });
  }

  // Render initial clean dashboard & state (no auto-seeding sample data)
  renderAll();

  // Initialize SMS Auto-Track Controller
  SmsSyncController.init();
});

// --- SMS Auto-Track Controller (Steps 3, 7, 8, 9, 10, 12) ---
const SmsSyncController = {
  init() {
    this.badge = document.getElementById('smsBadgeCount');
    this.smsBtn = document.getElementById('smsSyncBtn');
    this.permissionModal = document.getElementById('smsPermissionModal');
    this.pendingModal = document.getElementById('pendingReviewModal');
    this.batteryModal = document.getElementById('batteryGuideModal');
    this.pendingList = document.getElementById('pendingReviewList');
    this.pendingCountDisplay = document.getElementById('pendingCountDisplay');

    this.bindEvents();
    this.checkFirstLaunchPermission();
    this.syncPending();
  },

  bindEvents() {
    if (this.smsBtn) {
      this.smsBtn.addEventListener('click', () => {
        if (window.AndroidSms && !window.AndroidSms.checkSmsPermissions()) {
          this.permissionModal.classList.add('active');
        } else {
          this.openPendingReview();
        }
      });
    }

    const grantBtn = document.getElementById('grantSmsPermissionBtn');
    if (grantBtn) {
      grantBtn.addEventListener('click', () => {
        if (window.AndroidSms) {
          window.AndroidSms.requestSmsPermissions();
        } else {
          showToast('SMS sync is available in the Android APK build.');
        }
        this.permissionModal.classList.remove('active');
      });
    }

    const skipBtn = document.getElementById('skipSmsPermissionBtn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.permissionModal.classList.remove('active');
        localStorage.setItem('savewise_sms_prompt_dismissed', 'true');
      });
    }

    const closePermBtn = document.getElementById('closeSmsPermissionBtn');
    if (closePermBtn) closePermBtn.addEventListener('click', () => this.permissionModal.classList.remove('active'));

    const closePendingBtn = document.getElementById('closePendingReviewBtn');
    if (closePendingBtn) closePendingBtn.addEventListener('click', () => this.pendingModal.classList.remove('active'));

    const scanMissedBtn = document.getElementById('scanMissedSmsBtn');
    if (scanMissedBtn) {
      scanMissedBtn.addEventListener('click', () => {
        if (window.AndroidSms) {
          const count = window.AndroidSms.scanMissedSms();
          showToast(`Scanned SMS inbox: ${count} new found!`);
          this.syncPending();
        } else {
          showToast('Inbox scanner active in Android APK.');
        }
      });
    }

    const checkSmsSettingBtn = document.getElementById('checkSmsPermissionSettingBtn');
    if (checkSmsSettingBtn) {
      checkSmsSettingBtn.addEventListener('click', () => {
        this.permissionModal.classList.add('active');
      });
    }

    const openBatteryGuideBtn = document.getElementById('openBatteryGuideBtn');
    if (openBatteryGuideBtn) {
      openBatteryGuideBtn.addEventListener('click', () => {
        this.batteryModal.classList.add('active');
      });
    }

    const closeBatteryBtn = document.getElementById('closeBatteryGuideBtn');
    if (closeBatteryBtn) closeBatteryBtn.addEventListener('click', () => this.batteryModal.classList.remove('active'));

    const openBatterySettingsBtn = document.getElementById('openBatterySettingsBtn');
    if (openBatterySettingsBtn) {
      openBatterySettingsBtn.addEventListener('click', () => {
        if (window.AndroidSms) {
          window.AndroidSms.openBatterySettings();
        } else {
          showToast('Open device Settings > Apps > SaveWise > Battery');
        }
      });
    }

    // Callbacks from native Android
    window.onNewSmsQueued = () => {
      this.syncPending();
      showToast('📥 New SMS transaction queued for review!');
    };

    window.onSmsPermissionResult = (granted, count) => {
      if (granted) {
        showToast(`SMS Auto-Track enabled! Found ${count} transactions.`);
        this.syncPending();
      } else {
        showToast('SMS Permission was denied.');
      }
    };
  },

  checkFirstLaunchPermission() {
    const dismissed = localStorage.getItem('savewise_sms_prompt_dismissed');
    if (!dismissed && window.AndroidSms && !window.AndroidSms.checkSmsPermissions()) {
      setTimeout(() => {
        this.permissionModal.classList.add('active');
      }, 1200);
    }
  },

  getPendingList() {
    if (window.AndroidSms) {
      try {
        const raw = window.AndroidSms.getPendingTransactions();
        return JSON.parse(raw || '[]');
      } catch (e) {
        console.error('Error reading pending queue:', e);
        return [];
      }
    }
    // Web demo fallback queue
    return JSON.parse(localStorage.getItem('savewise_demo_sms_queue') || '[]');
  },

  syncPending() {
    const list = this.getPendingList();
    if (this.badge) {
      if (list.length > 0) {
        this.badge.style.display = 'block';
        this.badge.textContent = list.length;
      } else {
        this.badge.style.display = 'none';
      }
    }
    if (this.pendingCountDisplay) {
      this.pendingCountDisplay.textContent = list.length;
    }
  },

  openPendingReview() {
    this.renderPendingList();
    this.pendingModal.classList.add('active');
  },

  renderPendingList() {
    const list = this.getPendingList();
    if (!this.pendingList) return;

    if (list.length === 0) {
      this.pendingList.innerHTML = `
        <div style="text-align:center;padding:40px 10px;color:#8b949e;">
          <div style="font-size:36px;margin-bottom:8px;">✅</div>
          <strong>No pending transactions</strong>
          <p style="font-size:12px;margin-top:4px;">When a bank SMS arrives, it will appear here for one-tap review.</p>
        </div>
      `;
      return;
    }

    this.pendingList.innerHTML = list.map(item => `
      <div class="transaction-item" style="display:flex;justify-content:space-between;align-items:center;background:#161b22;border:1px solid #30363d;border-radius:12px;padding:12px 14px;margin-bottom:10px;">
        <div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:11px;font-weight:bold;padding:2px 6px;border-radius:6px;background:${item.type === 'income' ? '#064e3b' : '#7f1d1d'};color:${item.type === 'income' ? '#34d399' : '#f87171'};">
              ${item.type === 'income' ? 'CREDIT' : 'DEBIT'}
            </span>
            <strong style="font-size:14px;color:#fff;">${item.sender}</strong>
          </div>
          <div style="font-size:11px;color:#8b949e;margin-top:4px;">
            ${item.date} &bull; TrxID: <code>${item.trxId || 'N/A'}</code>
          </div>
          <div style="font-size:10px;color:#6e7681;margin-top:2px;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            "${item.rawBody || ''}"
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:15px;font-weight:bold;color:${item.type === 'income' ? '#34d399' : '#f87171'};">
            ${item.type === 'income' ? '+' : '-'}${formatMoney(item.amount)}
          </div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button class="pill-btn danger-btn" onclick="SmsSyncController.rejectTx('${item.trxId}')" style="padding:4px 8px;font-size:11px;">✕</button>
            <button class="pill-btn primary-btn" onclick="SmsSyncController.confirmTx('${item.trxId}')" style="padding:4px 10px;font-size:11px;">✓ Add</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  confirmTx(trxId) {
    const list = this.getPendingList();
    const item = list.find(x => x.trxId === trxId);
    if (!item) return;

    // Check if TrxID already exists in state transactions (Step 9)
    const exists = state.transactions.some(t => t.id === item.trxId || (t.notes && t.notes.includes(item.trxId)));
    if (!exists) {
      state.transactions.unshift({
        id: item.trxId || ('tx_' + Date.now()),
        title: item.title || `${item.type === 'income' ? 'Received from' : 'Paid via'} ${item.sender}`,
        amount: item.amount,
        type: item.type,
        category: item.category || (item.type === 'income' ? 'Deposit & Income' : 'Payment & Transfer'),
        date: item.date,
        recurring: false,
        notes: `Auto-detected from SMS. TrxID: ${item.trxId}`
      });
      Storage.save();
      renderAll();
      SoundFX.play('success');
      showToast(`Added ${item.type === 'income' ? '+' : '-'}${formatMoney(item.amount)} to your budget!`);
    } else {
      showToast('Transaction was already added earlier.');
    }

    this.removePending(trxId);
    this.renderPendingList();
    this.syncPending();
  },

  rejectTx(trxId) {
    this.removePending(trxId);
    this.renderPendingList();
    this.syncPending();
    showToast('Transaction removed.');
  },

  removePending(trxId) {
    if (window.AndroidSms) {
      window.AndroidSms.removePendingTransaction(trxId);
    } else {
      const list = this.getPendingList().filter(x => x.trxId !== trxId);
      localStorage.setItem('savewise_demo_sms_queue', JSON.stringify(list));
    }
  }
};

