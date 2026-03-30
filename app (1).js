// ============================================================
//  TradeX — app.js
// ============================================================

// ============================================================
// DATABASE  (localStorage based)
// ============================================================
const DB = {
  getUsers:       ()      => JSON.parse(localStorage.getItem('tx_users') || '{}'),
  saveUsers:      (u)     => localStorage.setItem('tx_users', JSON.stringify(u)),
  getCurrentUser: ()      => localStorage.getItem('tx_current_user'),
  setCurrentUser: (email) => localStorage.setItem('tx_current_user', email),
  clearCurrentUser: ()    => localStorage.removeItem('tx_current_user'),
  getUserData: (email) => {
    const users = DB.getUsers();
    return users[email] || null;
  },
  saveUserData: (email, data) => {
    const users = DB.getUsers();
    users[email] = data;
    DB.saveUsers(users);
  }
};

// ============================================================
// STOCK DATA  (mock market with live-like fluctuations)
// ============================================================
const STOCKS = [
  { symbol: 'RELIANCE',  name: 'Reliance Industries', sector: 'Energy',       price: 2847.50 },
  { symbol: 'TCS',       name: 'Tata Consultancy',    sector: 'IT',           price: 3921.20 },
  { symbol: 'HDFCBANK',  name: 'HDFC Bank',           sector: 'Banking',      price: 1652.30 },
  { symbol: 'INFY',      name: 'Infosys Ltd',         sector: 'IT',           price: 1478.90 },
  { symbol: 'WIPRO',     name: 'Wipro Ltd',           sector: 'IT',           price:  452.60 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank',          sector: 'Banking',      price: 1089.40 },
  { symbol: 'BAJFINANCE',name: 'Bajaj Finance',       sector: 'NBFC',         price: 6892.10 },
  { symbol: 'SBIN',      name: 'State Bank of India', sector: 'Banking',      price:  812.75 },
  { symbol: 'ADANIENT',  name: 'Adani Enterprises',   sector: 'Conglomerate', price: 2341.00 },
  { symbol: 'TATAMOTORS',name: 'Tata Motors',         sector: 'Auto',         price:  967.30 },
];

let stockPrices     = {};
let selectedStock   = null;
let currentTradeType = 'buy';
let currentUser     = null;
let priceInterval;

// ============================================================
// PRICE ENGINE
// ============================================================
function initPrices() {
  STOCKS.forEach(s => { stockPrices[s.symbol] = s.price; });
}

function fluctuatePrices() {
  STOCKS.forEach(s => {
    const change = (Math.random() - 0.49) * 0.8;
    stockPrices[s.symbol] = Math.max(1, stockPrices[s.symbol] * (1 + change / 100));
  });
  renderWatchlist();
  if (selectedStock) updateSelectedStock();
  updateStats();
}

// ============================================================
// AUTH
// ============================================================
function switchAuthTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0) === (tab === 'login'))
  );
  document.getElementById('login-form').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('auth-error').style.display  = 'none';
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) return showError('Please fill all fields');

  const users = DB.getUsers();
  if (!users[email])               return showError('Account not found. Please sign up.');
  if (users[email].password !== pass) return showError('Incorrect password');

  DB.setCurrentUser(email);
  loadApp(email);
}

function doSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;

  if (!name || !email || !pass) return showError('Please fill all fields');
  if (pass.length < 6)          return showError('Password must be at least 6 characters');

  const users = DB.getUsers();
  if (users[email]) return showError('Account already exists. Please login.');

  users[email] = { name, email, password: pass, balance: 100000, portfolio: {}, orders: [] };
  DB.saveUsers(users);
  DB.setCurrentUser(email);
  loadApp(email);
}

function doLogout() {
  DB.clearCurrentUser();
  currentUser = null;
  document.getElementById('app').style.display         = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  clearInterval(priceInterval);
}

// ============================================================
// APP INIT
// ============================================================
function loadApp(email) {
  currentUser = email;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display         = 'block';

  initPrices();
  renderWatchlist();
  updateStats();
  renderPortfolio();
  renderOrders();
  selectStock(STOCKS[0].symbol);

  priceInterval = setInterval(fluctuatePrices, 2000);
}

// ============================================================
// WATCHLIST
// ============================================================
function renderWatchlist() {
  const container = document.getElementById('watchlist');
  container.innerHTML = STOCKS.map(s => {
    const price  = stockPrices[s.symbol];
    const diff   = ((price - s.price) / s.price * 100);
    const cls    = diff >= 0 ? 'up' : 'down';
    const sign   = diff >= 0 ? '+' : '';
    const active = selectedStock === s.symbol ? 'active' : '';
    return `
      <div class="stock-item ${active}" onclick="selectStock('${s.symbol}')">
        <div>
          <div class="stock-name">${s.symbol}</div>
          <div class="stock-sector">${s.name}</div>
        </div>
        <div class="stock-price-col">
          <div class="stock-price">₹${price.toFixed(2)}</div>
          <div class="stock-change ${cls}">${sign}${diff.toFixed(2)}%</div>
        </div>
      </div>`;
  }).join('');
}

function selectStock(symbol) {
  selectedStock = symbol;
  renderWatchlist();
  updateSelectedStock();
  document.getElementById('qty-input').value = 1;
  updateTotal();
}

function updateSelectedStock() {
  if (!selectedStock) return;
  const stock = STOCKS.find(s => s.symbol === selectedStock);
  const price = stockPrices[selectedStock];
  document.getElementById('sel-stock-name').textContent   = `${stock.symbol} — ${stock.name}`;
  document.getElementById('sel-stock-sector').textContent = stock.sector;
  document.getElementById('sel-stock-price').textContent  = `₹${price.toFixed(2)}`;
  document.getElementById('price-display').textContent    = `₹${price.toFixed(2)}`;
  updateTotal();
}

function updateTotal() {
  if (!selectedStock) return;
  const price = stockPrices[selectedStock];
  const qty   = parseInt(document.getElementById('qty-input').value) || 0;
  document.getElementById('total-display').textContent =
    `₹${(price * qty).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// ============================================================
// TRADE
// ============================================================
function switchTradeTab(type) {
  currentTradeType = type;
  document.getElementById('tab-buy').classList.toggle('active',  type === 'buy');
  document.getElementById('tab-sell').classList.toggle('active', type === 'sell');

  const btn = document.getElementById('trade-btn');
  if (type === 'buy') {
    btn.className   = 'btn-buy';
    btn.textContent = 'BUY NOW';
  } else {
    btn.className   = 'btn-sell';
    btn.textContent = 'SELL NOW';
  }
  document.getElementById('trade-msg').style.display = 'none';
}

function executeTrade() {
  if (!selectedStock) return showTradeMsg('Please select a stock first', 'error');

  const qty   = parseInt(document.getElementById('qty-input').value);
  if (!qty || qty <= 0) return showTradeMsg('Enter valid quantity', 'error');

  const price = stockPrices[selectedStock];
  const total = price * qty;
  const user  = DB.getUserData(currentUser);

  if (currentTradeType === 'buy') {
    // --- BUY LOGIC ---
    if (user.balance < total)
      return showTradeMsg(`Insufficient balance! Need ₹${total.toFixed(2)}, have ₹${user.balance.toFixed(2)}`, 'error');

    user.balance -= total;

    if (!user.portfolio[selectedStock])
      user.portfolio[selectedStock] = { qty: 0, avgPrice: 0, invested: 0 };

    const h    = user.portfolio[selectedStock];
    h.invested += total;
    h.qty      += qty;
    h.avgPrice  = h.invested / h.qty;

    user.orders.unshift({
      type: 'buy', symbol: selectedStock, qty,
      price: price.toFixed(2), total: total.toFixed(2),
      time: new Date().toLocaleString()
    });
    showTradeMsg(`✓ Bought ${qty} shares of ${selectedStock} @ ₹${price.toFixed(2)}`, 'success');

  } else {
    // --- SELL LOGIC ---
    const holding = user.portfolio[selectedStock];
    if (!holding || holding.qty < qty)
      return showTradeMsg(`Not enough shares! You have ${holding?.qty || 0} shares`, 'error');

    user.balance += total;

    const sellRatio  = qty / holding.qty;
    holding.invested -= holding.invested * sellRatio;
    holding.qty      -= qty;
    if (holding.qty === 0) delete user.portfolio[selectedStock];

    user.orders.unshift({
      type: 'sell', symbol: selectedStock, qty,
      price: price.toFixed(2), total: total.toFixed(2),
      time: new Date().toLocaleString()
    });
    showTradeMsg(`✓ Sold ${qty} shares of ${selectedStock} @ ₹${price.toFixed(2)}`, 'success');
  }

  DB.saveUserData(currentUser, user);
  updateStats();
  renderPortfolio();
  renderOrders();
  showToast(`${currentTradeType === 'buy' ? '🟢 Bought' : '🔴 Sold'} ${qty}x ${selectedStock}`);
}

function showTradeMsg(msg, type) {
  const el = document.getElementById('trade-msg');
  el.textContent = msg;
  el.className   = `trade-msg ${type}`;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

// ============================================================
// STATS
// ============================================================
function updateStats() {
  const user = DB.getUserData(currentUser);
  if (!user) return;

  let portfolioValue = 0, totalInvested = 0, holdings = 0;

  Object.entries(user.portfolio).forEach(([sym, h]) => {
    if (h.qty > 0) {
      portfolioValue += (stockPrices[sym] || 0) * h.qty;
      totalInvested  += h.invested;
      holdings++;
    }
  });

  const pnl    = portfolioValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested * 100) : 0;
  const pnlCls = pnl >= 0 ? 'up' : 'down';
  const pnlSign = pnl >= 0 ? '+' : '';
  const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  document.getElementById('balance-display').textContent  = `₹${fmt(user.balance)}`;
  document.getElementById('stat-balance').textContent     = `₹${fmt(user.balance)}`;
  document.getElementById('stat-portfolio').textContent   = `₹${fmt(portfolioValue)}`;
  document.getElementById('stat-pnl').textContent         = `${pnlSign}₹${fmt(Math.abs(pnl))} (${pnlSign}${pnlPct.toFixed(2)}%)`;
  document.getElementById('stat-pnl').className           = `stat-sub ${pnlCls}`;
  document.getElementById('stat-invested').textContent    = `₹${fmt(totalInvested)}`;
  document.getElementById('stat-holdings').textContent    = holdings;
}

// ============================================================
// PORTFOLIO
// ============================================================
function renderPortfolio() {
  const user      = DB.getUserData(currentUser);
  const container = document.getElementById('portfolio-content');
  const holdings  = Object.entries(user.portfolio).filter(([, h]) => h.qty > 0);

  if (holdings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div>No holdings yet</div>
        <div style="font-size:13px;margin-top:8px">Buy stocks from the Dashboard to see them here</div>
      </div>`;
    return;
  }

  let totalPnl = 0, totalInv = 0;

  const rows = holdings.map(([sym, h]) => {
    const currPrice = stockPrices[sym] || 0;
    const currVal   = currPrice * h.qty;
    const pnl       = currVal - h.invested;
    const pnlPct    = (pnl / h.invested * 100);
    const cls       = pnl >= 0 ? 'up' : 'down';
    const sign      = pnl >= 0 ? '+' : '';
    totalPnl += pnl;
    totalInv += h.invested;
    return `<tr>
      <td><strong>${sym}</strong></td>
      <td class="td-mono">${h.qty}</td>
      <td class="td-mono">₹${h.avgPrice.toFixed(2)}</td>
      <td class="td-mono">₹${currPrice.toFixed(2)}</td>
      <td class="td-mono">₹${h.invested.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
      <td class="td-mono">₹${currVal.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
      <td class="td-mono ${cls}">${sign}₹${Math.abs(pnl).toFixed(0)} (${sign}${pnlPct.toFixed(2)}%)</td>
    </tr>`;
  }).join('');

  const totalSign = totalPnl >= 0 ? '+' : '';
  const totalCls  = totalPnl >= 0 ? 'up' : 'down';

  container.innerHTML = `
    <table class="portfolio-table">
      <thead><tr>
        <th>Stock</th><th>Qty</th><th>Avg Price</th><th>LTP</th>
        <th>Invested</th><th>Current Value</th><th>P&L</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);display:flex;gap:40px">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:4px">Total Invested</div>
        <div style="font-family:var(--mono);font-size:18px">₹${totalInv.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:4px">Total P&L</div>
        <div style="font-family:var(--mono);font-size:18px" class="${totalCls}">${totalSign}₹${Math.abs(totalPnl).toFixed(0)}</div>
      </div>
    </div>`;
}

// ============================================================
// ORDERS
// ============================================================
function renderOrders() {
  const user      = DB.getUserData(currentUser);
  const container = document.getElementById('orders-content');

  if (!user.orders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div>No orders yet</div>
      </div>`;
    return;
  }

  container.innerHTML = user.orders.map(o => `
    <div class="order-row">
      <div style="display:flex;align-items:center;gap:14px">
        <span class="order-badge ${o.type}">${o.type.toUpperCase()}</span>
        <div>
          <div style="font-weight:600">${o.symbol}</div>
          <div style="font-size:12px;color:var(--muted)">${o.time}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--mono);font-weight:700">₹${parseFloat(o.total).toLocaleString('en-IN')}</div>
        <div style="font-size:12px;color:var(--muted)">${o.qty} × ₹${o.price}</div>
      </div>
    </div>`).join('');
}

// ============================================================
// PAGE NAVIGATION
// ============================================================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((b, i) => {
    b.classList.toggle('active', ['dashboard', 'portfolio', 'orders'][i] === page);
  });
  if (page === 'portfolio') renderPortfolio();
  if (page === 'orders')    renderOrders();
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ============================================================
// INIT — auto-login if session exists
// ============================================================
window.onload = () => {
  const savedUser = DB.getCurrentUser();
  if (savedUser && DB.getUserData(savedUser)) {
    loadApp(savedUser);
  }
};
