const STORAGE_KEY = "localBudgetWebSettings";
const DB_FILENAME = "budget.sqlite3";

const state = {
  SQL: null,
  db: null,
  dbSha: null,
  settings: null,
  month: currentMonth(),
  editingTransactionId: null,
  dirty: false,
  saving: false,
};

const DEFAULT_CATEGORIES = [
  ["Paycheque", "income", 0, "#16a34a"],
  ["Housing", "expense", 0, "#2563eb"],
  ["Groceries", "expense", 0, "#ea580c"],
  ["Gas", "expense", 0, "#ca8a04"],
  ["Vehicle", "expense", 0, "#0891b2"],
  ["Debt", "expense", 0, "#dc2626"],
  ["Savings", "expense", 0, "#059669"],
  ["Giving", "expense", 0, "#7c3aed"],
  ["Entertainment", "expense", 0, "#db2777"],
  ["Medical", "expense", 0, "#0f766e"],
];

const els = {
  status: document.getElementById("status"),
  setupView: document.getElementById("setupView"),
  settingsForm: document.getElementById("settingsForm"),
  repoInput: document.getElementById("repoInput"),
  branchInput: document.getElementById("branchInput"),
  folderInput: document.getElementById("folderInput"),
  tokenInput: document.getElementById("tokenInput"),
  tabs: document.getElementById("tabs"),
  syncButton: document.getElementById("syncButton"),
  monthInput: document.getElementById("monthInput"),
  incomeValue: document.getElementById("incomeValue"),
  spendingValue: document.getElementById("spendingValue"),
  savingsValue: document.getElementById("savingsValue"),
  budgetValue: document.getElementById("budgetValue"),
  netWorthValue: document.getElementById("netWorthValue"),
  accountBalanceList: document.getElementById("accountBalanceList"),
  categorySpendList: document.getElementById("categorySpendList"),
  transactionForm: document.getElementById("transactionForm"),
  transactionSubmit: document.querySelector("#transactionForm button[type='submit']"),
  txAmount: document.getElementById("txAmount"),
  txType: document.getElementById("txType"),
  txDate: document.getElementById("txDate"),
  txAccount: document.getElementById("txAccount"),
  txCategory: document.getElementById("txCategory"),
  txVendor: document.getElementById("txVendor"),
  txNotes: document.getElementById("txNotes"),
  vendorList: document.getElementById("vendorList"),
  transactionSearch: document.getElementById("transactionSearch"),
  transactionList: document.getElementById("transactionList"),
  exportCsvButton: document.getElementById("exportCsvButton"),
  importCsvInput: document.getElementById("importCsvInput"),
  accountForm: document.getElementById("accountForm"),
  accountName: document.getElementById("accountName"),
  accountType: document.getElementById("accountType"),
  accountOpening: document.getElementById("accountOpening"),
  accountNetWorth: document.getElementById("accountNetWorth"),
  accountsList: document.getElementById("accountsList"),
  categoryForm: document.getElementById("categoryForm"),
  categoryName: document.getElementById("categoryName"),
  categoryKind: document.getElementById("categoryKind"),
  categoryLimit: document.getElementById("categoryLimit"),
  categoriesList: document.getElementById("categoriesList"),
  budgetForm: document.getElementById("budgetForm"),
  budgetMonth: document.getElementById("budgetMonth"),
  budgetCategory: document.getElementById("budgetCategory"),
  budgetPlanned: document.getElementById("budgetPlanned"),
  budgetCarry: document.getElementById("budgetCarry"),
  budgetsList: document.getElementById("budgetsList"),
  debtForm: document.getElementById("debtForm"),
  debtName: document.getElementById("debtName"),
  debtAccount: document.getElementById("debtAccount"),
  debtBalance: document.getElementById("debtBalance"),
  debtRate: document.getElementById("debtRate"),
  debtMin: document.getElementById("debtMin"),
  debtExtra: document.getElementById("debtExtra"),
  debtsList: document.getElementById("debtsList"),
  reportsList: document.getElementById("reportsList"),
  saveDbButton: document.getElementById("saveDbButton"),
  reloadDbButton: document.getElementById("reloadDbButton"),
  resetButton: document.getElementById("resetButton"),
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(value || 0));
}

function displayText(value) {
  const text = String(value || "").replace(/_/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function numberValue(input) {
  const value = Number(String(input.value || "0").replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function showStatus(message, isError) {
  els.status.textContent = message;
  els.status.className = "status show" + (isError ? " error" : "");
}

function clearStatusSoon() {
  window.setTimeout(function () {
    if (!state.saving) {
      els.status.className = "status";
      els.status.textContent = "";
    }
  }, 3500);
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function setReady(ready) {
  els.setupView.style.display = ready ? "none" : "block";
  els.tabs.classList.toggle("ready", ready);
  document.querySelectorAll(".tab-page").forEach(function (page) {
    page.style.display = ready ? "" : "none";
  });
}

function activateTab(name) {
  document.querySelectorAll(".tabs button").forEach(function (button) {
    button.classList.toggle("active", button.dataset.tab === name);
  });
  document.querySelectorAll(".tab-page").forEach(function (page) {
    page.classList.remove("active");
  });
  const target = document.getElementById(name + "Tab");
  if (target) {
    target.classList.add("active");
  }
  if (name === "add") {
    window.setTimeout(function () {
      els.txAmount.focus();
    }, 50);
  }
}

function loadSettings() {
  if (window.location.search.indexOf("reset=1") !== -1) {
    localStorage.removeItem(STORAGE_KEY);
  }
  try {
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (settings && settings.repo && settings.branch && settings.folder && settings.token) {
      return settings;
    }
  } catch (_error) {
    return null;
  }
  return null;
}

function saveSettings(settings) {
  state.settings = settings;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function fillSettingsForm() {
  const settings = state.settings || {};
  els.repoInput.value = settings.repo || "";
  els.branchInput.value = settings.branch || "main";
  els.folderInput.value = settings.folder || "local-budget-backups";
  els.tokenInput.value = settings.token || "";
}

function encodedPath(filename) {
  const folder = state.settings.folder.replace(/^\/+|\/+$/g, "");
  return (folder + "/" + filename)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function apiUrl(filename) {
  return "https://api.github.com/repos/" + state.settings.repo + "/contents/" + encodedPath(filename);
}

function headers() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + state.settings.token,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function githubGetFile(filename) {
  const response = await fetch(apiUrl(filename) + "?ref=" + encodeURIComponent(state.settings.branch), {
    headers: headers(),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const body = await response.json().catch(function () {
      return {};
    });
    throw new Error(body.message || "GitHub error " + response.status);
  }
  return response.json();
}

async function githubGetBytes(filename) {
  const file = await githubGetFile(filename);
  if (!file) {
    return { bytes: null, sha: null };
  }
  if (file.content && file.encoding === "base64") {
    return { bytes: base64ToBytes(file.content), sha: file.sha };
  }
  if (file.git_url) {
    const blobResponse = await fetch(file.git_url, { headers: headers() });
    if (!blobResponse.ok) {
      throw new Error("Could not download " + filename + " from GitHub's blob API.");
    }
    const blob = await blobResponse.json();
    if (blob.content && blob.encoding === "base64") {
      return { bytes: base64ToBytes(blob.content), sha: file.sha };
    }
  }
  if (!file.download_url) {
    throw new Error("GitHub did not return downloadable content for " + filename + ".");
  }
  const response = await fetch(file.download_url, { headers: headers() });
  if (!response.ok) {
    throw new Error("Could not download " + filename + " from GitHub.");
  }
  return { bytes: new Uint8Array(await response.arrayBuffer()), sha: file.sha };
}

async function githubPutBytes(filename, bytes, sha) {
  const body = {
    message: "Save Local Budget web database",
    content: bytesToBase64(bytes),
    branch: state.settings.branch,
  };
  if (sha) {
    body.sha = sha;
  }
  const response = await fetch(apiUrl(filename), {
    method: "PUT",
    headers: Object.assign({}, headers(), { "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(function () {
      return {};
    });
    const message = error.message || "GitHub error " + response.status;
    if (response.status === 409) {
      throw new Error("GitHub has a newer database version. Reload from GitHub before saving again.");
    }
    throw new Error(message);
  }
  return response.json();
}

async function loadSqlJsLibrary() {
  if (state.SQL) {
    return state.SQL;
  }
  if (typeof initSqlJs !== "function") {
    throw new Error("SQLite engine did not load. Check that sql-wasm.js is available from the CDN.");
  }
  state.SQL = await initSqlJs({
    locateFile: function (file) {
      return "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/" + file;
    },
  });
  return state.SQL;
}

function all(sql, params) {
  const stmt = state.db.prepare(sql);
  const rows = [];
  try {
    if (params) {
      stmt.bind(params);
    }
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
  } finally {
    stmt.free();
  }
  return rows;
}

function one(sql, params) {
  const rows = all(sql, params);
  return rows.length ? rows[0] : null;
}

function scalar(sql, params, key) {
  const row = one(sql, params);
  if (!row) {
    return 0;
  }
  if (key) {
    return row[key] || 0;
  }
  const keys = Object.keys(row);
  return keys.length ? row[keys[0]] || 0 : 0;
}

function run(sql, params) {
  state.db.run(sql, params || []);
  state.dirty = true;
}

function migrateDatabase() {
  state.db.run("PRAGMA foreign_keys = ON");
  state.db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0,
      include_in_net_worth INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
      monthly_limit REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#64748b',
      is_default INTEGER NOT NULL DEFAULT 0,
      UNIQUE(name, kind)
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      amount REAL NOT NULL CHECK (amount >= 0),
      vendor TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      recurring_transaction_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      planned REAL NOT NULL DEFAULT 0,
      carry_forward INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(month, category_id)
    );
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      amount REAL NOT NULL CHECK (amount >= 0),
      vendor TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      frequency TEXT NOT NULL DEFAULT 'monthly',
      next_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      minimum_payment REAL NOT NULL DEFAULT 0,
      extra_payment REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
    CREATE INDEX IF NOT EXISTS idx_debts_account ON debts(account_id);
  `);
  const columns = all("PRAGMA table_info(transactions)").map(function (row) {
    return row.name;
  });
  if (columns.indexOf("source") === -1) {
    state.db.run("ALTER TABLE transactions ADD COLUMN source TEXT NOT NULL DEFAULT 'desktop'");
  }
  if (columns.indexOf("external_id") === -1) {
    state.db.run("ALTER TABLE transactions ADD COLUMN external_id TEXT");
  }
  state.db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_source_external
    ON transactions(source, external_id)
    WHERE external_id IS NOT NULL AND external_id <> ''
  `);
  if (Number(scalar("SELECT COUNT(*) count FROM categories", [], "count")) === 0) {
    DEFAULT_CATEGORIES.forEach(function (category) {
      state.db.run(
        "INSERT INTO categories(name, kind, monthly_limit, color, is_default) VALUES (?, ?, ?, ?, 1)",
        category,
      );
    });
  }
}

async function openDatabase() {
  showStatus("Opening SQLite database from GitHub...");
  const SQL = await loadSqlJsLibrary();
  const result = await githubGetBytes(DB_FILENAME);
  state.dbSha = result.sha;
  state.db = result.bytes ? new SQL.Database(result.bytes) : new SQL.Database();
  migrateDatabase();
  state.dirty = !result.bytes;
  renderAll();
  setReady(true);
  activateTab("add");
  showStatus(result.bytes ? "Database loaded. Ready to enter transactions." : "No database found. A new one is ready to save.");
  clearStatusSoon();
}

async function saveDatabase() {
  if (!state.db) {
    showStatus("Open a database first.", true);
    return;
  }
  state.saving = true;
  showStatus("Saving budget.sqlite3 to GitHub...");
  try {
    const bytes = state.db.export();
    const result = await githubPutBytes(DB_FILENAME, bytes, state.dbSha);
    state.dbSha = result.content ? result.content.sha : state.dbSha;
    state.dirty = false;
    showStatus("Database saved to GitHub.");
    clearStatusSoon();
  } catch (error) {
    showStatus(error.message, true);
    throw error;
  } finally {
    state.saving = false;
  }
}

async function saveAfterChange(message) {
  renderAll();
  await saveDatabase();
  if (message) {
    showStatus(message);
    clearStatusSoon();
  }
}

function accountsWithBalances() {
  return all(`
    SELECT a.*,
      a.opening_balance + COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS current_balance
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY a.id
    ORDER BY a.name
  `);
}

function dashboardData() {
  const totals = one(
    "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) income, COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) spending FROM transactions WHERE substr(date, 1, 7) = ?",
    [state.month],
  ) || { income: 0, spending: 0 };
  const planned = Number(scalar("SELECT COALESCE(SUM(planned), 0) planned FROM budgets WHERE month = ?", [state.month], "planned"));
  const accounts = accountsWithBalances();
  const debtTotal = Number(scalar("SELECT COALESCE(SUM(balance), 0) total FROM debts", [], "total"));
  const netWorth = accounts.reduce(function (sum, account) {
    return account.include_in_net_worth ? sum + Number(account.current_balance || 0) : sum;
  }, 0) - debtTotal;
  return {
    income: Number(totals.income || 0),
    spending: Number(totals.spending || 0),
    planned,
    netWorth,
    accounts,
  };
}

function renderAll() {
  if (!state.db) {
    return;
  }
  els.monthInput.value = state.month;
  els.budgetMonth.value = state.month;
  renderSelectors();
  renderDashboard();
  renderTransactions();
  renderAccounts();
  renderCategories();
  renderBudgets();
  renderDebts();
  renderReports();
}

function renderSelectors() {
  const accounts = all("SELECT * FROM accounts ORDER BY name");
  const categories = all("SELECT * FROM categories ORDER BY kind, name");
  const oldAccount = els.txAccount.value;
  const oldDebtAccount = els.debtAccount.value;
  clearNode(els.txAccount);
  clearNode(els.debtAccount);
  const noDebtAccount = document.createElement("option");
  noDebtAccount.value = "";
  noDebtAccount.textContent = "No Linked Account";
  els.debtAccount.appendChild(noDebtAccount);
  accounts.forEach(function (account) {
    const label = account.name + " (" + displayText(account.type) + ")";
    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = label;
    els.txAccount.appendChild(option);
    const debtOption = document.createElement("option");
    debtOption.value = account.id;
    debtOption.textContent = label;
    els.debtAccount.appendChild(debtOption);
  });
  els.txAccount.value = oldAccount || (accounts[0] ? String(accounts[0].id) : "");
  els.debtAccount.value = oldDebtAccount || "";
  fillCategorySelect(els.txCategory, categories, els.txType.value, true);
  fillCategorySelect(els.budgetCategory, categories, "expense", false);
  const vendors = all("SELECT vendor, COUNT(*) count FROM transactions WHERE TRIM(vendor) <> '' GROUP BY vendor ORDER BY count DESC, vendor LIMIT 100");
  clearNode(els.vendorList);
  vendors.forEach(function (row) {
    const option = document.createElement("option");
    option.value = row.vendor;
    els.vendorList.appendChild(option);
  });
}

function fillCategorySelect(select, categories, kind, allowEmpty) {
  const current = select.value;
  clearNode(select);
  if (allowEmpty) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "No Category";
    select.appendChild(empty);
  }
  categories.filter(function (category) {
    return category.kind === kind;
  }).forEach(function (category) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });
  select.value = current;
  if (!select.value && !allowEmpty && select.options.length) {
    select.value = select.options[0].value;
  }
}

function addRow(container, title, amount, detail, amountClass, actions) {
  const item = document.createElement("div");
  item.className = "row";
  const top = document.createElement("div");
  top.className = "row-top";
  const left = document.createElement("span");
  left.textContent = title;
  const right = document.createElement("span");
  right.className = amountClass || "";
  right.textContent = amount || "";
  top.appendChild(left);
  top.appendChild(right);
  const sub = document.createElement("div");
  sub.className = "row-sub";
  sub.textContent = detail || "";
  item.appendChild(top);
  item.appendChild(sub);
  if (actions && actions.length) {
    const tools = document.createElement("div");
    tools.className = "row-actions";
    actions.forEach(function (action) {
      const button = document.createElement("button");
      button.className = action.danger ? "danger small" : "secondary small";
      button.type = "button";
      button.dataset.action = action.action;
      button.dataset.id = action.id;
      button.textContent = action.label;
      tools.appendChild(button);
    });
    item.appendChild(tools);
  }
  container.appendChild(item);
}

function renderDashboard() {
  const data = dashboardData();
  const net = data.income - data.spending;
  const remaining = data.planned - data.spending;
  els.incomeValue.textContent = money(data.income);
  els.spendingValue.textContent = money(data.spending);
  els.savingsValue.textContent = money(net);
  els.budgetValue.textContent = money(remaining);
  els.netWorthValue.textContent = money(data.netWorth);
  els.savingsValue.className = net < 0 ? "negative" : "positive";
  els.budgetValue.className = remaining < 0 ? "negative" : "positive";
  clearNode(els.accountBalanceList);
  if (!data.accounts.length) {
    els.accountBalanceList.textContent = "Add an account to start.";
  }
  data.accounts.forEach(function (account) {
    const balance = Number(account.current_balance || 0);
    addRow(els.accountBalanceList, account.name, money(balance), displayText(account.type), balance < 0 ? "negative" : "positive");
  });
  clearNode(els.categorySpendList);
  const spending = all(`
    SELECT COALESCE(c.name, 'Uncategorized') name, SUM(t.amount) amount
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE substr(t.date, 1, 7) = ? AND t.type = 'expense'
    GROUP BY name
    ORDER BY amount DESC
  `, [state.month]);
  if (!spending.length) {
    els.categorySpendList.textContent = "No spending this month.";
  }
  spending.forEach(function (row) {
    addRow(els.categorySpendList, row.name, money(row.amount), "", "negative");
  });
}

function renderTransactions() {
  clearNode(els.transactionList);
  const search = "%" + String(els.transactionSearch.value || "").toLowerCase() + "%";
  const rows = all(`
    SELECT t.*, a.name account, COALESCE(c.name, '') category
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE lower(t.vendor || ' ' || t.notes || ' ' || a.name || ' ' || COALESCE(c.name, '')) LIKE ?
    ORDER BY t.date DESC, t.id DESC
    LIMIT 250
  `, [search]);
  if (!rows.length) {
    els.transactionList.textContent = "No transactions found.";
  }
  rows.forEach(function (tx) {
    const title = tx.vendor || tx.notes || tx.category || "Transaction";
    const detail = [tx.date, tx.account, tx.category, displayText(tx.type), tx.notes].filter(Boolean).join(" - ");
    addRow(els.transactionList, title, money(tx.amount), detail, tx.type === "income" ? "positive" : "negative", [
      { label: "Edit", action: "edit-transaction", id: tx.id },
      { label: "Delete", action: "delete-transaction", id: tx.id, danger: true },
    ]);
  });
}

function renderAccounts() {
  clearNode(els.accountsList);
  const rows = accountsWithBalances();
  if (!rows.length) {
    els.accountsList.textContent = "No accounts yet.";
  }
  rows.forEach(function (account) {
    const balance = Number(account.current_balance || 0);
    addRow(
      els.accountsList,
      account.name,
      money(balance),
      displayText(account.type) + " - Opening " + money(account.opening_balance),
      balance < 0 ? "negative" : "positive",
      [{ label: "Delete", action: "delete-account", id: account.id, danger: true }],
    );
  });
}

function renderCategories() {
  clearNode(els.categoriesList);
  const rows = all("SELECT * FROM categories ORDER BY kind, name");
  rows.forEach(function (category) {
    addRow(
      els.categoriesList,
      category.name,
      money(category.monthly_limit),
      displayText(category.kind),
      "",
      [{ label: "Delete", action: "delete-category", id: category.id, danger: true }],
    );
  });
}

function renderBudgets() {
  clearNode(els.budgetsList);
  const rows = all(`
    SELECT b.*, c.name category_name,
      COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) actual
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    LEFT JOIN transactions t ON t.category_id = b.category_id AND substr(t.date, 1, 7) = b.month
    WHERE b.month = ?
    GROUP BY b.id
    ORDER BY c.name
  `, [state.month]);
  if (!rows.length) {
    els.budgetsList.textContent = "No budget lines for this month.";
  }
  rows.forEach(function (budget) {
    const remaining = Number(budget.planned || 0) - Number(budget.actual || 0);
    addRow(
      els.budgetsList,
      budget.category_name,
      money(remaining),
      "Planned " + money(budget.planned) + " - Actual " + money(budget.actual) + (budget.carry_forward ? " - Carry forward" : ""),
      remaining < 0 ? "negative" : "positive",
      [{ label: "Delete", action: "delete-budget", id: budget.id, danger: true }],
    );
  });
}

function monthsUntilPayoff(balance, annualRate, payment) {
  if (balance <= 0 || payment <= 0) {
    return null;
  }
  const monthlyRate = annualRate / 100 / 12;
  let months = 0;
  while (balance > 0.01 && months < 600) {
    const interest = balance * monthlyRate;
    if (payment <= interest && months > 0) {
      return null;
    }
    balance = balance + interest - payment;
    months += 1;
  }
  return months < 600 ? months : null;
}

function renderDebts() {
  clearNode(els.debtsList);
  const rows = all(`
    SELECT d.*, COALESCE(a.name, '') account
    FROM debts d
    LEFT JOIN accounts a ON a.id = d.account_id
    ORDER BY d.balance DESC
  `);
  if (!rows.length) {
    els.debtsList.textContent = "No debts yet.";
  }
  rows.forEach(function (debt) {
    const payment = Number(debt.minimum_payment || 0) + Number(debt.extra_payment || 0);
    const payoff = monthsUntilPayoff(Number(debt.balance || 0), Number(debt.interest_rate || 0), payment);
    const payoffText = payoff === null ? "No projection" : Math.floor(payoff / 12) + "y " + (payoff % 12) + "m";
    addRow(
      els.debtsList,
      debt.name,
      money(debt.balance),
      [debt.account, Number(debt.interest_rate || 0) + "%", "Payment " + money(payment), payoffText].filter(Boolean).join(" - "),
      "negative",
      [{ label: "Delete", action: "delete-debt", id: debt.id, danger: true }],
    );
  });
}

function renderReports() {
  clearNode(els.reportsList);
  const rows = all(`
    SELECT substr(date, 1, 7) month,
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) spending
    FROM transactions
    GROUP BY month
    ORDER BY month DESC
    LIMIT 24
  `);
  if (!rows.length) {
    els.reportsList.textContent = "No report data yet.";
  }
  rows.forEach(function (row) {
    const income = Number(row.income || 0);
    const spending = Number(row.spending || 0);
    const net = income - spending;
    const savingsRate = income ? (net / income) * 100 : 0;
    addRow(
      els.reportsList,
      row.month,
      money(net),
      "Income " + money(income) + " - Spending " + money(spending) + " - Savings rate " + savingsRate.toFixed(1) + "%",
      net < 0 ? "negative" : "positive",
    );
  });
}

async function saveTransaction(event) {
  event.preventDefault();
  if (!state.db) {
    showStatus("Open the database first.", true);
    return;
  }
  const accountId = Number(els.txAccount.value || 0);
  const categoryId = els.txCategory.value ? Number(els.txCategory.value) : null;
  const amount = Math.abs(numberValue(els.txAmount));
  if (!accountId || amount <= 0) {
    showStatus("Choose an account and enter an amount.", true);
    return;
  }
  if (state.editingTransactionId) {
    run(
      `UPDATE transactions
       SET account_id = ?, category_id = ?, date = ?, type = ?, amount = ?, vendor = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [accountId, categoryId, els.txDate.value || today(), els.txType.value, amount, els.txVendor.value.trim(), els.txNotes.value.trim(), state.editingTransactionId],
    );
    state.editingTransactionId = null;
    els.transactionSubmit.textContent = "Save Transaction";
  } else {
    run(
      `INSERT INTO transactions(account_id, category_id, date, type, amount, vendor, notes, source, external_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'web', ?)`,
      [
        accountId,
        categoryId,
        els.txDate.value || today(),
        els.txType.value,
        amount,
        els.txVendor.value.trim(),
        els.txNotes.value.trim(),
        "web-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      ],
    );
  }
  const keepDate = els.txDate.value;
  const keepAccount = els.txAccount.value;
  const keepCategory = els.txCategory.value;
  const keepType = els.txType.value;
  els.transactionForm.reset();
  els.txDate.value = keepDate || today();
  els.txType.value = keepType || "expense";
  renderSelectors();
  els.txAccount.value = keepAccount;
  els.txCategory.value = keepCategory;
  await saveAfterChange("Transaction saved.");
  els.txAmount.focus();
}

function editTransaction(id) {
  const tx = one("SELECT * FROM transactions WHERE id = ?", [Number(id)]);
  if (!tx) {
    return;
  }
  state.editingTransactionId = Number(id);
  els.txAmount.value = tx.amount;
  els.txType.value = tx.type;
  els.txDate.value = tx.date;
  renderSelectors();
  els.txAccount.value = tx.account_id;
  els.txCategory.value = tx.category_id || "";
  els.txVendor.value = tx.vendor || "";
  els.txNotes.value = tx.notes || "";
  els.transactionSubmit.textContent = "Update Transaction";
  activateTab("add");
}

async function deleteById(table, id, message) {
  run("DELETE FROM " + table + " WHERE id = ?", [Number(id)]);
  await saveAfterChange(message);
}

async function saveAccount(event) {
  event.preventDefault();
  const name = els.accountName.value.trim();
  if (!name) {
    showStatus("Account name is required.", true);
    return;
  }
  run(
    "INSERT INTO accounts(name, type, opening_balance, include_in_net_worth) VALUES (?, ?, ?, ?)",
    [name, els.accountType.value.trim() || "Chequing", numberValue(els.accountOpening), els.accountNetWorth.checked ? 1 : 0],
  );
  els.accountForm.reset();
  els.accountNetWorth.checked = true;
  await saveAfterChange("Account added.");
}

async function saveCategory(event) {
  event.preventDefault();
  const name = els.categoryName.value.trim();
  if (!name) {
    showStatus("Category name is required.", true);
    return;
  }
  try {
    run("INSERT INTO categories(name, kind, monthly_limit) VALUES (?, ?, ?)", [name, els.categoryKind.value, numberValue(els.categoryLimit)]);
    els.categoryForm.reset();
    els.categoryKind.value = "expense";
    await saveAfterChange("Category added.");
  } catch (error) {
    showStatus("Could not add category. It may already exist.", true);
  }
}

async function saveBudget(event) {
  event.preventDefault();
  if (!els.budgetCategory.value) {
    showStatus("Choose a category.", true);
    return;
  }
  run(
    `INSERT INTO budgets(month, category_id, planned, carry_forward)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(month, category_id)
     DO UPDATE SET planned = excluded.planned, carry_forward = excluded.carry_forward, updated_at = CURRENT_TIMESTAMP`,
    [els.budgetMonth.value || state.month, Number(els.budgetCategory.value), numberValue(els.budgetPlanned), els.budgetCarry.checked ? 1 : 0],
  );
  state.month = els.budgetMonth.value || state.month;
  els.budgetPlanned.value = "";
  els.budgetCarry.checked = false;
  await saveAfterChange("Budget saved.");
}

async function saveDebt(event) {
  event.preventDefault();
  const name = els.debtName.value.trim();
  if (!name) {
    showStatus("Debt name is required.", true);
    return;
  }
  run(
    "INSERT INTO debts(account_id, name, balance, interest_rate, minimum_payment, extra_payment) VALUES (?, ?, ?, ?, ?, ?)",
    [
      els.debtAccount.value ? Number(els.debtAccount.value) : null,
      name,
      numberValue(els.debtBalance),
      numberValue(els.debtRate),
      numberValue(els.debtMin),
      numberValue(els.debtExtra),
    ],
  );
  els.debtForm.reset();
  await saveAfterChange("Debt added.");
}

function exportCsv() {
  const rows = all(`
    SELECT t.date, a.name account, COALESCE(c.name, '') category, t.type, t.amount, t.vendor, t.notes
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    ORDER BY t.date DESC, t.id DESC
  `);
  const header = ["date", "account", "category", "type", "amount", "vendor", "notes"];
  const lines = [header.join(",")].concat(rows.map(function (row) {
    return header.map(function (key) {
      const value = String(row[key] == null ? "" : row[key]);
      return '"' + value.replace(/"/g, '""') + '"';
    }).join(",");
  }));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "local-budget-transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some(function (cell) { return cell.trim() !== ""; })) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value);
  if (row.some(function (cell) { return cell.trim() !== ""; })) {
    rows.push(row);
  }
  return rows;
}

async function importCsvFile(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    showStatus("CSV file is empty.", true);
    return;
  }
  const header = rows[0].map(function (name) { return name.trim().toLowerCase(); });
  let imported = 0;
  rows.slice(1).forEach(function (cells) {
    const raw = {};
    header.forEach(function (key, index) {
      raw[key] = cells[index] || "";
    });
    const accountName = String(raw.account || "").trim();
    if (!accountName) {
      return;
    }
    let account = one("SELECT * FROM accounts WHERE lower(name) = lower(?)", [accountName]);
    if (!account) {
      run("INSERT INTO accounts(name, type, opening_balance) VALUES (?, 'Chequing', 0)", [accountName]);
      account = one("SELECT * FROM accounts WHERE id = last_insert_rowid()");
    }
    const txType = ["income", "expense"].indexOf(String(raw.type || "").toLowerCase()) !== -1 ? String(raw.type).toLowerCase() : "expense";
    let category = null;
    if (raw.category) {
      category = one("SELECT * FROM categories WHERE lower(name) = lower(?) AND kind = ?", [raw.category.trim(), txType]);
    }
    const amount = Math.abs(Number(raw.amount || 0));
    if (!amount) {
      return;
    }
    run(
      "INSERT INTO transactions(account_id, category_id, date, type, amount, vendor, notes, source, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'web-csv', ?)",
      [
        account.id,
        category ? category.id : null,
        raw.date || today(),
        txType,
        amount,
        raw.vendor || "",
        raw.notes || "",
        "csv-" + Date.now() + "-" + imported,
      ],
    );
    imported += 1;
  });
  await saveAfterChange("Imported " + imported + " transaction(s).");
}

function bindEvents() {
  els.settingsForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    saveSettings({
      repo: els.repoInput.value.trim(),
      branch: els.branchInput.value.trim() || "main",
      folder: els.folderInput.value.trim() || "local-budget-backups",
      token: els.tokenInput.value.trim(),
    });
    try {
      await openDatabase();
    } catch (error) {
      setReady(false);
      showStatus(error.message, true);
    }
  });
  els.tabs.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-tab]");
    if (button) {
      activateTab(button.dataset.tab);
    }
  });
  els.syncButton.addEventListener("click", function () {
    if (state.dirty) {
      saveDatabase().catch(function () {});
    } else {
      openDatabase().catch(function (error) { showStatus(error.message, true); });
    }
  });
  els.saveDbButton.addEventListener("click", function () {
    saveDatabase().catch(function () {});
  });
  els.reloadDbButton.addEventListener("click", function () {
    openDatabase().catch(function (error) { showStatus(error.message, true); });
  });
  els.resetButton.addEventListener("click", function () {
    localStorage.removeItem(STORAGE_KEY);
    state.settings = null;
    state.db = null;
    state.dbSha = null;
    fillSettingsForm();
    setReady(false);
    showStatus("Web settings cleared.");
  });
  els.monthInput.addEventListener("change", function () {
    state.month = els.monthInput.value || currentMonth();
    renderAll();
  });
  els.txType.addEventListener("change", function () {
    renderSelectors();
  });
  els.transactionSearch.addEventListener("input", renderTransactions);
  els.transactionForm.addEventListener("submit", function (event) {
    saveTransaction(event).catch(function (error) { showStatus(error.message, true); });
  });
  els.accountForm.addEventListener("submit", function (event) {
    saveAccount(event).catch(function (error) { showStatus(error.message, true); });
  });
  els.categoryForm.addEventListener("submit", function (event) {
    saveCategory(event).catch(function (error) { showStatus(error.message, true); });
  });
  els.budgetForm.addEventListener("submit", function (event) {
    saveBudget(event).catch(function (error) { showStatus(error.message, true); });
  });
  els.debtForm.addEventListener("submit", function (event) {
    saveDebt(event).catch(function (error) { showStatus(error.message, true); });
  });
  els.exportCsvButton.addEventListener("click", exportCsv);
  els.importCsvInput.addEventListener("change", function () {
    const file = els.importCsvInput.files[0];
    if (file) {
      importCsvFile(file).catch(function (error) { showStatus(error.message, true); });
    }
  });
  document.body.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === "edit-transaction") {
      editTransaction(id);
    } else if (action === "delete-transaction" && confirm("Delete this transaction?")) {
      deleteById("transactions", id, "Transaction deleted.").catch(function (error) { showStatus(error.message, true); });
    } else if (action === "delete-account" && confirm("Delete this account and its transactions?")) {
      deleteById("accounts", id, "Account deleted.").catch(function (error) { showStatus(error.message, true); });
    } else if (action === "delete-category" && confirm("Delete this category? Existing transactions become uncategorized.")) {
      deleteById("categories", id, "Category deleted.").catch(function (error) { showStatus(error.message, true); });
    } else if (action === "delete-budget" && confirm("Delete this budget line?")) {
      deleteById("budgets", id, "Budget deleted.").catch(function (error) { showStatus(error.message, true); });
    } else if (action === "delete-debt" && confirm("Delete this debt?")) {
      deleteById("debts", id, "Debt deleted.").catch(function (error) { showStatus(error.message, true); });
    }
  });
}

async function init() {
  bindEvents();
  els.txDate.value = today();
  els.monthInput.value = state.month;
  els.budgetMonth.value = state.month;
  state.settings = loadSettings();
  fillSettingsForm();
  setReady(false);
  if (state.settings) {
    try {
      await openDatabase();
    } catch (error) {
      setReady(false);
      showStatus(error.message, true);
    }
  }
}

init().catch(function (error) {
  setReady(false);
  showStatus(error.message, true);
});
