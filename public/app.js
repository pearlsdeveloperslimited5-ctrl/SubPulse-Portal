const API_BASE = '/api';

// State Variables
let subscriptions = [];
let leads = [];
let tickets = [];
let logs = [];
let accounts = [];
let invoices = [];
let expenses = [];
let journalEntries = [];
let bankStatements = [];
let activeCompany = 'All';
let activeAccountingTab = 'dashboard';
let activeReportTab = 'pl';
let systemStatus = {};

// HR State Variables
let employees = [];
let leaves = [];
let attendance = [];
let performanceReviews = [];
let activeHRCompany = 'Consolidated';
let activeHRTab = 'dashboard';
let activeHRReport = 'headcount';

// Investments State Variables
let investments = [];
let activeInvestmentCompany = 'Consolidated';
let activeInvestmentTab = 'dashboard';
let activeInvestmentReport = 'performance';

// IT State Variables
let itTasks = [];
let itIncidents = [];
let itChanges = [];
let itDeployments = [];
let activeITCompany = 'Consolidated';
let activeITTab = 'dashboard';
let activeITReport = 'workload';

// Legals State Variables
let contracts = [];
let cases = [];
let compliance = [];
let activeLegalsCompany = 'Consolidated';
let activeLegalsTab = 'dashboard';
let activeLegalsReport = 'matters';

// Vehicle Leasing State Variables
let vehicles = [];
let leases = [];
let activeLeasingCompany = 'Consolidated';
let activeLeasingTab = 'dashboard';
let activeLeasingReport = 'income';

// Payroll State Variables
let payrollRuns = [];
let activePayrollCompany = 'Consolidated';
let activePayrollTab = 'dashboard';
let activePayrollReport = 'summary';
let currentPayrollPreview = null;

// Hosting & Domains State Variables
let hostingWebsites = [];
let hostingDomains = [];
let hostingServers = [];
let activeHostingTab = 'dashboard';

// QuickBooks Integration State Variables
let quickbooksState = {
  connected: false,
  clientId: "",
  clientSecret: "",
  realmId: "",
  mappings: {},
  logs: []
};

let authToken = localStorage.getItem('subpulse_auth_token') || null;
let authIsRegisterMode = false;

// Toast system
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('active'), 50);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Fetch API Wrapper
async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    let finalMethod = method;
    let finalEndpoint = endpoint;

    // Use method tunneling via POST for PUT and DELETE to bypass shared hosting firewalls/restrictions
    if (method === 'PUT' || method === 'DELETE') {
      finalMethod = 'POST';
      const separator = endpoint.includes('?') ? '&' : '?';
      finalEndpoint = `${endpoint}${separator}_method=${method}`;
    }

    const options = {
      method: finalMethod,
      headers: {
        'Content-Type': 'application/json',
        'X-HTTP-Method-Override': method
      }
    };
    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`${API_BASE}${finalEndpoint}`, options);
    
    if (response.status === 401) {
      // Unauthorized, kick back to login
      authToken = null;
      localStorage.removeItem('subpulse_auth_token');
      localStorage.removeItem('subpulse_username');
      showAuthOverlay();
      showToast('Session expired. Please sign in.', 'error');
      return null;
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Server request failed');
    }
    return await response.json();
  } catch (error) {
    showToast(error.message, 'error');
    console.error(`API Error on ${endpoint}:`, error);
    return null;
  }
}

// Initial Setup & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
});

async function initApp() {
  const overlay = document.getElementById('auth-overlay');
  overlay.style.display = 'flex'; // show loading state initially

  try {
    if (!authToken) {
      setupAuthScreen();
      return;
    }

    // Check token validation
    const checkRes = await fetch(`${API_BASE}/auth/check`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    }).then(r => r.json());

    if (checkRes.authenticated) {
      hideAuthOverlay();
      
      const storedUser = localStorage.getItem('subpulse_username') || 'Admin';
      document.getElementById('display-username').textContent = storedUser;
      document.getElementById('user-header-area').style.display = 'flex';
      document.getElementById('app-main-wrapper').style.display = 'flex';
      
      await fetchStatus();
      await fetchSubscriptions();
      await fetchLogs();
      await fetchSettings();
      await fetchLeads();
      await fetchTickets();
      await fetchAccounts();
      await fetchInvoices();
      await fetchExpenses();
      await fetchJournals();
      await fetchReconciliation();
      await fetchEmployees();
      await fetchLeaves();
      await fetchAttendance();
      await fetchPerformanceReviews();
      await fetchInvestments();
      await fetchITTasks();
      await fetchITIncidents();
      await fetchITChanges();
      await fetchITDeployments();
      await fetchContracts();
      await fetchCases();
      await fetchCompliance();
      await fetchVehicles();
      await fetchLeases();
      await fetchPayrollRuns();
      await fetchHostingWebsites();
      await fetchHostingDomains();
      await fetchHostingServers();
      await fetchQuickBooksStatus();
    } else {
      authToken = null;
      localStorage.removeItem('subpulse_auth_token');
      setupAuthScreen();
    }
  } catch (err) {
    showToast('Failed to connect to backend server.', 'error');
    console.error(err);
  }
}

function setupAuthScreen() {
  const overlay = document.getElementById('auth-overlay');
  const title = document.querySelector('.auth-logo h2');
  const subtitle = document.getElementById('auth-subtitle');
  const submitBtn = document.getElementById('btn-auth-submit');
  const form = document.getElementById('auth-form');

  form.reset();
  overlay.style.display = 'flex';
  overlay.classList.add('active');

  title.textContent = 'SubPulse Portal';
  subtitle.textContent = 'Securing your subscription intelligence';
  submitBtn.textContent = 'Sign In';
}

function hideAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.remove('active');
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 400);
}

function showAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  overlay.style.display = 'flex';
  setTimeout(() => {
    overlay.classList.add('active');
  }, 50);
  document.getElementById('user-header-area').style.display = 'none';
}

// Event Bindings
function setupEventListeners() {
  // Auth Form Submit
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);

  // Logout
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  // Sidebar Menu switching
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuItems.forEach(mi => mi.classList.remove('active'));
      item.classList.add('active');

      const viewName = item.getAttribute('data-view');
      document.querySelectorAll('.app-view').forEach(av => av.classList.remove('active'));
      document.getElementById(`view-${viewName}`).classList.add('active');

      const viewTitle = document.getElementById('view-title');
      const viewSubtitle = document.getElementById('view-subtitle');
      if (viewName === 'sales') {
        viewTitle.textContent = 'Sales CRM';
        viewSubtitle.textContent = 'Pearls Developers Limited Sales Lifecycle';
        calculateAndRenderSalesMetrics();
        renderSalesKanban();
      } else if (viewName === 'subscriptions') {
        viewTitle.textContent = 'Subscriptions';
        viewSubtitle.textContent = 'Subscription & Billing Intelligence';
        calculateAndRenderMetrics();
        renderSubscriptions();
      } else if (viewName === 'tickets') {
        viewTitle.textContent = 'Tech Tickets';
        viewSubtitle.textContent = 'Full Helpdesk & SLA Management Portal';
        calculateAndRenderTicketsMetrics();
        renderTicketsKanban();
      } else if (viewName === 'accounts') {
        viewTitle.textContent = 'Accounting & Finance';
        viewSubtitle.textContent = 'Double-Entry Ledgers and Financial Statements';
        calculateAndRenderAccountingMetrics();
        renderAccountingSubTab();
      } else if (viewName === 'settings') {
        viewTitle.textContent = 'Settings & Logs';
        viewSubtitle.textContent = 'SMTP configuration and System logs';
        renderSettingsMailboxMirror();
      } else if (viewName === 'employees') {
        viewTitle.textContent = 'Employees & HR Portal';
        viewSubtitle.textContent = 'Corporate Registry, Leave Engine, & Star Review Boards';
        calculateAndRenderHRMetrics();
        renderHRSubTab();
      } else if (viewName === 'investments') {
        viewTitle.textContent = 'Investments Portfolio';
        viewSubtitle.textContent = 'Property, Stocks, and Bonds Asset Management';
        calculateAndRenderInvestmentMetrics();
        renderInvestmentSubTab();
      } else if (viewName === 'it-tasks') {
        viewTitle.textContent = 'IT Tasks & Operations';
        viewSubtitle.textContent = 'Pearls IT Operations, Infrastructure, Sprint Tasks, and Change Audit logs';
        calculateAndRenderITMetrics();
        renderITSubTab();
      } else if (viewName === 'legals') {
        viewTitle.textContent = 'Legal & Compliance Portal';
        viewSubtitle.textContent = 'Contracts repository, case tracking, and corporate compliance audit';
        calculateAndRenderLegalsMetrics();
        renderLegalsSubTab();
      } else if (viewName === 'leasing') {
        viewTitle.textContent = 'Vehicle Leasing Portal';
        viewSubtitle.textContent = 'Fleet management, lease contracts, and monthly payment tracking';
        calculateAndRenderLeasingMetrics();
        renderLeasingSubTab();
      } else if (viewName === 'payroll') {
        viewTitle.textContent = 'Payroll Processing Portal';
        viewSubtitle.textContent = 'Salary structures, monthly payroll runs, bank exports, and payslip archiving';
        calculateAndRenderPayrollMetrics();
        renderPayrollSubTab();
      } else if (viewName === 'hosting') {
        viewTitle.textContent = 'Websites, Domains & Hosting';
        viewSubtitle.textContent = 'Pearls IT Infrastructure central management panel';
        calculateAndRenderHostingMetrics();
        renderHostingSubTab();
      }
    });
  });

  // Add Subscription
  document.getElementById('btn-add-sub').addEventListener('click', () => openSubModal());
  document.getElementById('btn-close-modal').addEventListener('click', closeSubModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeSubModal);
  document.getElementById('subscription-form').addEventListener('submit', handleSubSubmit);

  // Add Lead Modal Events
  document.getElementById('btn-add-lead').addEventListener('click', () => openLeadModal());
  document.getElementById('btn-close-lead-modal').addEventListener('click', closeLeadModal);
  document.getElementById('btn-cancel-lead-modal').addEventListener('click', closeLeadModal);
  document.getElementById('lead-form').addEventListener('submit', handleLeadSubmit);

  // Add Ticket Modal Events
  document.getElementById('btn-add-ticket').addEventListener('click', () => openTicketModal());
  document.getElementById('btn-close-ticket-modal').addEventListener('click', closeTicketModal);
  document.getElementById('btn-cancel-ticket-modal').addEventListener('click', closeTicketModal);
  document.getElementById('ticket-form').addEventListener('submit', handleTicketSubmit);

  // Show satisfaction rating picker when resolved or closed in ticket-modal
  document.getElementById('ticket-status').addEventListener('change', (e) => {
    const val = e.target.value;
    const ratingGroup = document.getElementById('ticket-rating-group');
    if (val === 'Resolved' || val === 'Closed') {
      ratingGroup.style.display = 'block';
    } else {
      ratingGroup.style.display = 'none';
    }
  });

  // Star selector buttons
  const stars = document.querySelectorAll('.star-btn');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = star.getAttribute('data-star');
      document.getElementById('ticket-rating').value = rating;
      
      stars.forEach(s => {
        if (parseInt(s.getAttribute('data-star')) <= parseInt(rating)) {
          s.classList.add('active');
          s.querySelector('i').className = 'fa-solid fa-star';
        } else {
          s.classList.remove('active');
          s.querySelector('i').className = 'fa-regular fa-star';
        }
      });
    });
  });

  // Tickets Search & Filters
  document.getElementById('tickets-search').addEventListener('input', renderTicketsKanban);
  document.getElementById('tickets-filter-priority').addEventListener('change', renderTicketsKanban);
  document.getElementById('tickets-filter-engineer').addEventListener('change', renderTicketsKanban);

  // Live Commission Preview updates
  const valInput = document.getElementById('lead-value');
  const rateInput = document.getElementById('lead-commission-rate');
  const curSelect = document.getElementById('lead-currency');
  const updateCommPreview = () => {
    const val = parseFloat(valInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const cur = curSelect.value;
    const comm = (val * rate) / 100;
    document.getElementById('lead-commission-preview').textContent = `Estimated Commission: ${cur}${comm.toFixed(2)}`;
  };
  valInput.addEventListener('input', updateCommPreview);
  rateInput.addEventListener('input', updateCommPreview);
  curSelect.addEventListener('change', updateCommPreview);

  // Sales Search & Filters
  document.getElementById('sales-search').addEventListener('input', renderSalesKanban);
  document.getElementById('sales-filter-source').addEventListener('change', renderSalesKanban);
  document.getElementById('sales-filter-agent').addEventListener('change', renderSalesKanban);

  // Time Travel
  document.getElementById('btn-travel-set').addEventListener('click', handleTimeTravelSet);
  document.getElementById('btn-travel-reset').addEventListener('click', handleTimeTravelReset);

  // Scheduler Run
  document.getElementById('btn-run-scheduler').addEventListener('click', handleRunScheduler);

  // SMTP Settings Submit
  document.getElementById('smtp-settings-form').addEventListener('submit', handleSettingsSubmit);

  // Logs
  document.getElementById('btn-clear-logs').addEventListener('click', handleClearLogs);
  document.getElementById('btn-close-email-modal').addEventListener('click', closeEmailModal);

  // --- ACCOUNTING EVENT LISTENERS ---
  
  // Company entity selection toggles
  const compButtons = document.querySelectorAll('.company-toggle-buttons .toggle-btn');
  compButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      compButtons.forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.color = '#fff';
      
      activeCompany = btn.getAttribute('data-company');
      calculateAndRenderAccountingMetrics();
      renderAccountingSubTab();
    });
  });

  // Accounting View Sub-Tabs triggers
  const accTabButtons = document.querySelectorAll('.accounts-sub-tabs .acc-tab-btn');
  accTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      accTabButtons.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.color = '#fff';
      
      activeAccountingTab = btn.getAttribute('data-tab');
      
      // Hide all panels
      document.querySelectorAll('.acc-panel').forEach(panel => {
        panel.style.display = 'none';
      });
      // Show selected panel
      document.getElementById(`acc-panel-${activeAccountingTab}`).style.display = 'block';
      
      renderAccountingSubTab();
    });
  });

  // Dynamic Financial Reports view switcher triggers
  const repButtons = document.querySelectorAll('.report-toggle-btn');
  repButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      repButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      activeReportTab = btn.getAttribute('data-report');
      
      // Hide all report viewports
      document.querySelectorAll('.report-viewport').forEach(vp => {
        vp.style.display = 'none';
      });
      // Show matching report viewport
      document.getElementById(`report-view-${activeReportTab}`).style.display = 'block';
      
      renderFinancialReports();
    });
  });

  // Invoice & Expense items calculation previews
  const updateInvoicePreviewTotals = () => {
    const rows = document.querySelectorAll('.invoice-item-row');
    let subtotal = 0;
    let vat = 0;
    rows.forEach(row => {
      const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      const price = parseFloat(row.querySelector('.item-price').value) || 0;
      const vatRate = parseFloat(row.querySelector('.item-vat').value) || 0;
      const rowSub = qty * price;
      subtotal += rowSub;
      vat += (rowSub * vatRate) / 100;
    });
    document.getElementById('invoice-preview-subtotal').textContent = `£${subtotal.toFixed(2)}`;
    document.getElementById('invoice-preview-vat').textContent = `£${vat.toFixed(2)}`;
    document.getElementById('invoice-preview-total').textContent = `£${(subtotal + vat).toFixed(2)}`;
  };
  
  const updateExpensePreviewTotals = () => {
    const rows = document.querySelectorAll('.expense-item-row');
    let subtotal = 0;
    let vat = 0;
    rows.forEach(row => {
      const qty = parseFloat(row.querySelector('.exp-item-qty').value) || 0;
      const price = parseFloat(row.querySelector('.exp-item-price').value) || 0;
      const vatRate = parseFloat(row.querySelector('.exp-item-vat').value) || 0;
      const rowSub = qty * price;
      subtotal += rowSub;
      vat += (rowSub * vatRate) / 100;
    });
    document.getElementById('expense-preview-subtotal').textContent = `£${subtotal.toFixed(2)}`;
    document.getElementById('expense-preview-vat').textContent = `£${vat.toFixed(2)}`;
    document.getElementById('expense-preview-total').textContent = `£${(subtotal + vat).toFixed(2)}`;
  };

  // Add Item Row actions
  document.getElementById('btn-invoice-add-item-row').addEventListener('click', () => {
    const container = document.getElementById('invoice-items-container');
    const newRow = document.createElement('div');
    newRow.className = 'invoice-item-row';
    newRow.style.display = 'grid';
    newRow.style.gridTemplateColumns = '2fr 1fr 1.2fr 1fr';
    newRow.style.gap = '8px';
    newRow.innerHTML = `
      <input type="text" placeholder="Description" class="item-desc" required>
      <input type="number" placeholder="Qty" class="item-qty" min="1" step="1" required value="1" style="text-align: center;">
      <input type="number" placeholder="Unit Price" class="item-price" min="0" step="0.01" required value="0.00">
      <select class="item-vat">
        <option value="20" selected>20% VAT</option>
        <option value="5">5% VAT</option>
        <option value="0">0% VAT</option>
      </select>
    `;
    container.appendChild(newRow);
    
    newRow.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', updateInvoicePreviewTotals);
      el.addEventListener('change', updateInvoicePreviewTotals);
    });
    updateInvoicePreviewTotals();
  });

  document.getElementById('btn-expense-add-item-row').addEventListener('click', () => {
    const container = document.getElementById('expense-items-container');
    const newRow = document.createElement('div');
    newRow.className = 'expense-item-row';
    newRow.style.display = 'grid';
    newRow.style.gridTemplateColumns = '2fr 1fr 1.2fr 1fr';
    newRow.style.gap = '8px';
    newRow.innerHTML = `
      <input type="text" placeholder="Description" class="exp-item-desc" required>
      <input type="number" placeholder="Qty" class="exp-item-qty" min="1" step="1" required value="1" style="text-align: center;">
      <input type="number" placeholder="Unit Price" class="exp-item-price" min="0" step="0.01" required value="0.00">
      <select class="exp-item-vat">
        <option value="20" selected>20% VAT</option>
        <option value="5">5% VAT</option>
        <option value="0">0% VAT</option>
      </select>
    `;
    container.appendChild(newRow);
    
    newRow.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', updateExpensePreviewTotals);
      el.addEventListener('change', updateExpensePreviewTotals);
    });
    updateExpensePreviewTotals();
  });

  // Bind change listeners to initial items
  document.querySelectorAll('.invoice-item-row input, .invoice-item-row select').forEach(el => {
    el.addEventListener('input', updateInvoicePreviewTotals);
    el.addEventListener('change', updateInvoicePreviewTotals);
  });
  document.querySelectorAll('.expense-item-row input, .expense-item-row select').forEach(el => {
    el.addEventListener('input', updateExpensePreviewTotals);
    el.addEventListener('change', updateExpensePreviewTotals);
  });

  // Search & Status filters keyup listeners
  document.getElementById('invoices-search').addEventListener('input', renderInvoices);
  document.getElementById('invoices-filter-status').addEventListener('change', renderInvoices);
  document.getElementById('expenses-search').addEventListener('input', renderExpenses);
  document.getElementById('expenses-filter-category').addEventListener('change', renderExpenses);

  // Modal actions launchers
  document.getElementById('btn-add-invoice').addEventListener('click', () => openInvoiceModal());
  document.getElementById('btn-close-invoice-modal').addEventListener('click', closeInvoiceModal);
  document.getElementById('btn-cancel-invoice-modal').addEventListener('click', closeInvoiceModal);
  document.getElementById('invoice-form').addEventListener('submit', handleInvoiceSubmit);

  document.getElementById('btn-add-expense').addEventListener('click', () => openExpenseModal());
  document.getElementById('btn-close-expense-modal').addEventListener('click', closeExpenseModal);
  document.getElementById('btn-cancel-expense-modal').addEventListener('click', closeExpenseModal);
  document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);

  document.getElementById('btn-close-payment-modal').addEventListener('click', closePaymentModal);
  document.getElementById('btn-cancel-payment-modal').addEventListener('click', closePaymentModal);
  document.getElementById('payment-form').addEventListener('submit', handlePaymentSubmit);

  document.getElementById('btn-add-journal').addEventListener('click', () => openJournalModal());
  document.getElementById('btn-close-journal-modal').addEventListener('click', closeJournalModal);
  document.getElementById('btn-cancel-journal-modal').addEventListener('click', closeJournalModal);
  document.getElementById('journal-form').addEventListener('submit', handleJournalSubmit);

  // Journal manual entry live balancer check
  const checkJournalBalance = () => {
    const rows = document.querySelectorAll('.journal-line-row');
    let debitTotal = 0;
    let creditTotal = 0;
    rows.forEach(row => {
      debitTotal += parseFloat(row.querySelector('.line-debit').value) || 0;
      creditTotal += parseFloat(row.querySelector('.line-credit').value) || 0;
    });
    
    document.getElementById('journal-total-debits').textContent = `£${debitTotal.toFixed(2)}`;
    document.getElementById('journal-total-credits').textContent = `£${creditTotal.toFixed(2)}`;
    
    const warn = document.getElementById('journal-balance-warning');
    const submit = document.getElementById('btn-submit-journal');
    if (Math.abs(debitTotal - creditTotal) <= 0.01 && debitTotal > 0) {
      warn.style.display = 'none';
      submit.disabled = false;
    } else {
      warn.style.display = 'block';
      submit.disabled = true;
    }
  };

  document.getElementById('btn-journal-add-line').addEventListener('click', () => {
    const container = document.getElementById('journal-lines-container');
    const newRow = document.createElement('div');
    newRow.className = 'journal-line-row';
    newRow.style.display = 'grid';
    newRow.style.gridTemplateColumns = '2.2fr 1fr 1fr';
    newRow.style.gap = '8px';
    newRow.innerHTML = `
      <select class="line-account" required>
        <option value="1000">Main Bank Account (Developers) (1000)</option>
        <option value="1010">Main Bank Account (IT) (1010)</option>
        <option value="1200">Accounts Receivable (Debtors) (1200)</option>
        <option value="2000">Accounts Payable (Creditors) (2000)</option>
        <option value="2200">VAT/Tax Payable (2200)</option>
        <option value="3000">Retained Earnings (3000)</option>
        <option value="4000">Sales Services Revenue (4000)</option>
        <option value="5000">Hosting & Software Expense (5000)</option>
        <option value="5100">General & Admin Expense (5100)</option>
      </select>
      <input type="number" placeholder="Debit (£)" class="line-debit" min="0" step="0.01" value="0.00">
      <input type="number" placeholder="Credit (£)" class="line-credit" min="0" step="0.01" value="0.00">
    `;
    container.appendChild(newRow);
    
    newRow.querySelectorAll('input').forEach(el => {
      el.addEventListener('input', checkJournalBalance);
    });
    checkJournalBalance();
  });

  document.querySelectorAll('.journal-line-row input').forEach(el => {
    el.addEventListener('input', checkJournalBalance);
  });

  // --- EMPLOYEES & HR EVENT LISTENERS ---
  
  // Company Selection Switcher
  const hrCompButtons = document.querySelectorAll('.employee-company-toggle-btn');
  hrCompButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      hrCompButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeHRCompany = btn.getAttribute('data-company');
      calculateAndRenderHRMetrics();
      renderHRSubTab();
    });
  });

  // HR Sub-Tabs toggling
  const hrTabButtons = document.querySelectorAll('.workspace-tab[data-hr-tab]');
  hrTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      hrTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeHRTab = btn.getAttribute('data-hr-tab');
      
      // Hide all panels
      document.querySelectorAll('.hr-tab-panel').forEach(p => p.style.display = 'none');
      // Show matching panel
      document.getElementById(`hr-panel-${activeHRTab}`).style.display = 'block';
      
      renderHRSubTab();
    });
  });

  // HR Report switches
  const hrRepButtons = document.querySelectorAll('.hr-report-toggle-btn');
  hrRepButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      hrRepButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeHRReport = btn.getAttribute('data-hr-report');
      
      document.querySelectorAll('.hr-report-viewport').forEach(vp => vp.style.display = 'none');
      document.getElementById(`hr-report-${activeHRReport}`).style.display = 'block';
      
      renderHRReports();
    });
  });

  // Search & Filter
  document.getElementById('hr-employee-search').addEventListener('input', () => renderEmployeeDirectory());
  document.getElementById('hr-filter-department').addEventListener('change', () => renderEmployeeDirectory());

  // Attendance Date change
  document.getElementById('hr-attendance-date-input').addEventListener('change', (e) => {
    loadAttendanceList(e.target.value);
  });

  // Attendance Auto fill
  document.getElementById('btn-attendance-auto-fill').addEventListener('click', () => {
    const rows = document.querySelectorAll('.attendance-row');
    rows.forEach(row => {
      const statusSelect = row.querySelector('.row-status-select');
      const inInput = row.querySelector('.row-in-input');
      const outInput = row.querySelector('.row-out-input');
      
      statusSelect.value = 'Present';
      inInput.value = '09:00';
      outInput.value = '17:30';
      
      // Sync toggle buttons
      row.querySelectorAll('.attendance-toggle-btn').forEach(btn => btn.classList.remove('active-present', 'active-late', 'active-absent', 'active-leave'));
      row.querySelector('.attendance-toggle-btn[data-status="Present"]').classList.add('active-present');
    });
  });

  // Attendance Save
  document.getElementById('btn-save-attendance-bulk').addEventListener('click', handleAttendanceBulkSave);

  // Modals close & cancel triggers
  document.getElementById('btn-add-employee-trigger').addEventListener('click', () => openEmployeeModal());
  document.getElementById('btn-close-employee-modal').addEventListener('click', closeEmployeeModal);
  document.getElementById('btn-cancel-employee-modal').addEventListener('click', closeEmployeeModal);
  document.getElementById('employee-form').addEventListener('submit', handleEmployeeSubmit);

  document.getElementById('btn-request-leave-trigger').addEventListener('click', () => openLeaveRequestModal());
  document.getElementById('btn-close-leave-request-modal').addEventListener('click', closeLeaveRequestModal);
  document.getElementById('btn-cancel-leave-request-modal').addEventListener('click', closeLeaveRequestModal);
  document.getElementById('leave-request-form').addEventListener('submit', handleLeaveRequestSubmit);

  document.getElementById('btn-close-doc-modal').addEventListener('click', closeDocModal);
  document.getElementById('btn-cancel-doc-modal').addEventListener('click', closeDocModal);
  document.getElementById('doc-form').addEventListener('submit', handleDocSubmit);

  document.getElementById('btn-add-warning-trigger').addEventListener('click', () => openWarningModal());
  document.getElementById('btn-close-warning-modal').addEventListener('click', closeWarningModal);
  document.getElementById('btn-cancel-warning-modal').addEventListener('click', closeWarningModal);
  document.getElementById('warning-form').addEventListener('submit', handleWarningSubmit);

  document.getElementById('btn-add-review-trigger').addEventListener('click', () => openReviewModal());
  document.getElementById('btn-close-review-modal').addEventListener('click', closeReviewModal);
  document.getElementById('btn-cancel-review-modal').addEventListener('click', closeReviewModal);
  document.getElementById('review-form').addEventListener('submit', handleReviewSubmit);

  // --- INVESTMENTS EVENT LISTENERS ---
  
  // Company Selection Switcher
  const invCompButtons = document.querySelectorAll('.investment-company-toggle-btn');
  invCompButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      invCompButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeInvestmentCompany = btn.getAttribute('data-company');
      calculateAndRenderInvestmentMetrics();
      renderInvestmentSubTab();
    });
  });

  // Investments View Sub-Tabs triggers
  const invTabButtons = document.querySelectorAll('.investments-sub-tabs .inv-tab-btn');
  invTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      invTabButtons.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.color = '#fff';
      
      activeInvestmentTab = btn.getAttribute('data-tab');
      
      document.querySelectorAll('.inv-panel').forEach(panel => {
        panel.style.display = 'none';
      });
      document.getElementById(`inv-panel-${activeInvestmentTab}`).style.display = 'block';
      
      renderInvestmentSubTab();
    });
  });

  // Reports tab sub-navigation
  const invRepButtons = document.querySelectorAll('.inv-report-toggle-btn');
  invRepButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      invRepButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeInvestmentReport = btn.getAttribute('data-report');
      
      document.querySelectorAll('.inv-report-viewport').forEach(vp => vp.style.display = 'none');
      document.getElementById(`inv-report-${activeInvestmentReport}`).style.display = 'block';
      
      renderInvestmentReports();
    });
  });

  // Filters and Search
  document.getElementById('inv-search').addEventListener('input', () => renderInvestmentHoldings());
  document.getElementById('inv-filter-type').addEventListener('change', () => renderInvestmentHoldings());

  // Modal actions launchers
  document.getElementById('btn-add-investment-trigger').addEventListener('click', () => openInvestmentModal());
  document.getElementById('btn-close-investment-modal').addEventListener('click', closeInvestmentModal);
  document.getElementById('btn-cancel-investment-modal').addEventListener('click', closeInvestmentModal);
  document.getElementById('investment-form').addEventListener('submit', handleInvestmentSubmit);

  document.getElementById('btn-close-yield-modal').addEventListener('click', closeYieldModal);
  document.getElementById('btn-cancel-yield-modal').addEventListener('click', closeYieldModal);
  document.getElementById('yield-form').addEventListener('submit', handleYieldSubmit);

  document.getElementById('btn-close-exit-modal').addEventListener('click', closeExitModal);
  document.getElementById('btn-cancel-exit-modal').addEventListener('click', closeExitModal);
  document.getElementById('exit-form').addEventListener('submit', handleExitSubmit);

  // --- IT TASKS & OPERATIONS LISTENERS ---

  // Entity Switching
  const itCompanyToggleBtns = document.querySelectorAll('.it-company-toggle-btn');
  itCompanyToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      itCompanyToggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeITCompany = btn.getAttribute('data-company');
      calculateAndRenderITMetrics();
      renderITSubTab();
    });
  });

  // Sub-tabs navigation
  const itTabBtns = document.querySelectorAll('.it-tab-btn');
  itTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      itTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeITTab = btn.getAttribute('data-tab');
      
      document.querySelectorAll('.it-panel').forEach(panel => {
        panel.style.display = 'none';
      });
      document.getElementById(`it-panel-${activeITTab}`).style.display = 'block';
      
      renderITSubTab();
    });
  });

  // Report sub-tabs navigation
  const itReportTabBtns = document.querySelectorAll('.it-report-tab-btn');
  itReportTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      itReportTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeITReport = btn.getAttribute('data-report');
      
      document.querySelectorAll('.it-report-viewport').forEach(vp => {
        vp.style.display = 'none';
      });
      document.getElementById(`it-report-${activeITReport}`).style.display = 'block';
      
      renderITReports();
    });
  });

  // Modals Launchers & Handlers
  
  // IT Task Form
  document.querySelectorAll('.btn-it-add-task').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-task-type') || 'WebDev';
      openITTaskModal(null, type);
    });
  });
  document.getElementById('btn-close-it-task-modal').addEventListener('click', closeITTaskModal);
  document.getElementById('btn-cancel-it-task-modal').addEventListener('click', closeITTaskModal);
  document.getElementById('it-task-form').addEventListener('submit', handleITTaskSubmit);

  // Toggle website and commit input visibility in task form based on type selection
  document.getElementById('it-task-type').addEventListener('change', (e) => {
    const type = e.target.value;
    const webGroup = document.getElementById('it-task-website-group');
    const commitGroup = document.getElementById('it-task-commit-group');
    if (type === 'WebDev') {
      webGroup.style.display = 'block';
      commitGroup.style.display = 'block';
    } else {
      webGroup.style.display = 'none';
      commitGroup.style.display = 'none';
    }
  });

  // Incident Form
  document.querySelectorAll('.btn-it-add-incident').forEach(btn => {
    btn.addEventListener('click', () => openIncidentModal());
  });
  document.getElementById('btn-close-it-incident-modal').addEventListener('click', closeITIncidentModal);
  document.getElementById('btn-cancel-it-incident-modal').addEventListener('click', closeITIncidentModal);
  document.getElementById('it-incident-form').addEventListener('submit', handleIncidentSubmit);

  // Change Management Form
  document.querySelectorAll('.btn-it-add-change').forEach(btn => {
    btn.addEventListener('click', () => openChangeModal());
  });
  document.getElementById('btn-close-it-change-modal').addEventListener('click', closeITChangeModal);
  document.getElementById('btn-cancel-it-change-modal').addEventListener('click', closeITChangeModal);
  document.getElementById('it-change-form').addEventListener('submit', handleChangeSubmit);

  // Deployment Form
  document.querySelectorAll('.btn-it-add-deployment').forEach(btn => {
    btn.addEventListener('click', () => openDeploymentModal());
  });
  document.getElementById('btn-close-it-deployment-modal').addEventListener('click', closeITDeploymentModal);
  document.getElementById('btn-cancel-it-deployment-modal').addEventListener('click', closeITDeploymentModal);
  document.getElementById('it-deployment-form').addEventListener('submit', handleDeploymentSubmit);

  // --- LEGALS VIEW EVENT LISTENERS ---

  // Entity toggling
  const legalsCompButtons = document.querySelectorAll('.legals-company-toggle-buttons .toggle-btn');
  legalsCompButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      legalsCompButtons.forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.color = '#fff';
      
      activeLegalsCompany = btn.getAttribute('data-legals-company');
      calculateAndRenderLegalsMetrics();
      renderLegalsSubTab();
    });
  });

  // Sub tab switching
  const legalsTabButtons = document.querySelectorAll('.legals-sub-tabs .legals-tab-btn');
  legalsTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      legalsTabButtons.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.color = '#fff';
      
      activeLegalsTab = btn.getAttribute('data-legals-tab');
      
      // Hide all panels
      document.querySelectorAll('.legals-panel').forEach(panel => {
        panel.style.display = 'none';
      });
      // Show selected panel
      document.getElementById(`legals-panel-${activeLegalsTab}`).style.display = 'block';
      
      renderLegalsSubTab();
    });
  });

  // Report sub-navigation
  const legalsReportBtns = document.querySelectorAll('.legals-report-toggle-btn');
  legalsReportBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      legalsReportBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLegalsReport = btn.getAttribute('data-legals-report');
      
      document.querySelectorAll('.legals-report-viewport').forEach(vp => {
        vp.style.display = 'none';
      });
      document.getElementById(`legals-report-view-${activeLegalsReport}`).style.display = 'block';
      
      renderLegalsReports();
    });
  });

  // Filters and Search
  document.getElementById('contracts-search').addEventListener('input', () => renderContracts());
  document.getElementById('contracts-filter-type').addEventListener('change', () => renderContracts());

  document.getElementById('cases-search').addEventListener('input', () => renderCases());
  document.getElementById('cases-filter-status').addEventListener('change', () => renderCases());

  document.getElementById('compliance-search').addEventListener('input', () => renderCompliance());
  document.getElementById('compliance-filter-status').addEventListener('change', () => renderCompliance());

  // Modals Launchers & Handlers
  document.getElementById('btn-add-contract').addEventListener('click', () => openContractModal());
  document.getElementById('btn-close-contract-modal').addEventListener('click', closeContractModal);
  document.getElementById('btn-cancel-contract-modal').addEventListener('click', closeContractModal);
  document.getElementById('contract-form').addEventListener('submit', handleContractSubmit);

  document.getElementById('btn-add-case').addEventListener('click', () => openCaseModal());
  document.getElementById('btn-close-case-modal').addEventListener('click', closeCaseModal);
  document.getElementById('btn-cancel-case-modal').addEventListener('click', closeCaseModal);
  document.getElementById('case-form').addEventListener('submit', handleCaseSubmit);

  document.getElementById('btn-add-compliance').addEventListener('click', () => openComplianceModal());
  document.getElementById('btn-close-compliance-modal').addEventListener('click', closeComplianceModal);
  document.getElementById('btn-cancel-compliance-modal').addEventListener('click', closeComplianceModal);
  document.getElementById('compliance-form').addEventListener('submit', handleComplianceSubmit);

  setupLeasingEventListeners();
  setupPayrollEventListeners();
  setupHostingEventListeners();
  setupQuickBooksEventListeners();
}

// Handle login/register submit
async function handleAuthSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed.');
    }

    // Success
    authToken = data.token;
    localStorage.setItem('subpulse_auth_token', data.token);
    localStorage.setItem('subpulse_username', data.username);
    
    showToast('Welcome back!', 'success');
    hideAuthOverlay();
    
    // Load dashboard
    await initApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Logout
function handleLogout() {
  authToken = null;
  localStorage.removeItem('subpulse_auth_token');
  localStorage.removeItem('subpulse_username');
  showToast('Logged out successfully.', 'info');
  setupAuthScreen(false);
}

// Fetch Functions
async function fetchStatus() {
  const status = await apiCall('/status');
  if (status) {
    systemStatus = status;
    updateStatusUI();
  }
}

async function fetchSubscriptions() {
  const data = await apiCall('/subscriptions');
  if (data) {
    subscriptions = data;
    renderSubscriptions();
    calculateAndRenderMetrics();
  }
}

async function fetchLogs() {
  const data = await apiCall('/logs');
  if (data) {
    logs = data;
    renderLogs();
  }
}

async function fetchSettings() {
  const settings = await apiCall('/settings');
  if (settings) {
    document.getElementById('smtp-host').value = settings.smtpHost || '';
    document.getElementById('smtp-port').value = settings.smtpPort || '';
    document.getElementById('smtp-from').value = settings.smtpFrom || '';
    document.getElementById('smtp-user').value = settings.smtpUser || '';
    document.getElementById('smtp-pass').value = settings.smtpPass || '';
    document.getElementById('notification-email').value = settings.notificationEmail || '';
  }
}

// UI Updating Functions
function updateStatusUI() {
  const simDateInput = document.getElementById('simulation-date');
  const simStatusBadge = document.getElementById('simulation-status');
  const statDate = document.getElementById('stat-current-date');
  const statDateType = document.getElementById('stat-date-type');

  simDateInput.value = systemStatus.simulatedDate;
  
  // Format Date nicely
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  const dateObj = new Date(systemStatus.simulatedDate);
  statDate.textContent = dateObj.toLocaleDateString('en-US', options);

  if (systemStatus.timeTravelActive) {
    simStatusBadge.textContent = 'Simulated';
    simStatusBadge.className = 'status-indicator simulated';
    statDateType.textContent = 'Simulated Time';
    statDateType.className = 'metric-sub text-cyan';
  } else {
    simStatusBadge.textContent = 'Live';
    simStatusBadge.className = 'status-indicator active';
    statDateType.textContent = 'System Real Time';
    statDateType.className = 'metric-sub';
  }
}

function calculateAndRenderMetrics() {
  const spendByCurrency = {};
  const upcomingByCurrency = {};
  let upcomingCount = 0;
  let paidCount = 0;

  subscriptions.forEach(sub => {
    const cur = sub.currency || '$';
    
    // Normalise Cost to Monthly
    let monthlyCost = sub.cost;
    if (sub.billingCycle === 'weekly') {
      monthlyCost = sub.cost * 4.33;
    } else if (sub.billingCycle === 'quarterly') {
      monthlyCost = sub.cost / 3;
    } else if (sub.billingCycle === 'yearly') {
      monthlyCost = sub.cost / 12;
    }
    
    spendByCurrency[cur] = (spendByCurrency[cur] || 0) + monthlyCost;

    // Check if due in 5 days
    if (sub.daysRemaining <= 5) {
      upcomingCount++;
      upcomingByCurrency[cur] = (upcomingByCurrency[cur] || 0) + sub.cost;
    }

    // Count as paid/good if daysRemaining is > 5
    if (sub.daysRemaining > 5) {
      paidCount++;
    }
  });

  // Render monthly spend - one line per currency
  const spendEl = document.getElementById('stat-monthly-spend');
  if (Object.keys(spendByCurrency).length === 0) {
    spendEl.innerHTML = '<div class="currency-line">$0.00</div>';
  } else {
    spendEl.innerHTML = Object.entries(spendByCurrency)
      .map(([cur, val]) => `<div class="currency-line">${cur}${val.toFixed(2)}</div>`)
      .join('');
  }
  document.getElementById('stat-monthly-sub').textContent = `${subscriptions.length} Active subscription${subscriptions.length === 1 ? '' : 's'}`;

  document.getElementById('stat-upcoming-count').textContent = upcomingCount;

  // Render upcoming cost - one line per currency
  const upcomingEl = document.getElementById('stat-upcoming-cost');
  if (Object.keys(upcomingByCurrency).length === 0) {
    upcomingEl.innerHTML = '<div class="currency-line">Total: $0.00</div>';
  } else {
    upcomingEl.innerHTML = Object.entries(upcomingByCurrency)
      .map(([cur, val]) => `<div class="currency-line">Total: ${cur}${val.toFixed(2)}</div>`)
      .join('');
  }

  const total = subscriptions.length;
  document.getElementById('stat-paid-ratio').textContent = `${paidCount}/${total}`;
  const percentage = total > 0 ? Math.round((paidCount / total) * 100) : 100;
  document.getElementById('stat-paid-percentage').textContent = `${percentage}% in Safe Status`;
}

function renderSubscriptions() {
  const container = document.getElementById('subscriptions-list');
  container.innerHTML = '';

  if (subscriptions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-wallet"></i></div>
        <h3>No subscriptions tracked yet</h3>
        <p>Click "New Subscription" to start tracking costs and automating payment reminders.</p>
      </div>
    `;
    return;
  }

  subscriptions.forEach(sub => {
    const card = document.createElement('div');
    
    // Status color mapping
    let statusClass = 'badge-active';
    let progressColorClass = 'status-active-color';
    
    if (sub.status === 'due_soon') {
      statusClass = 'badge-warning';
      progressColorClass = 'status-warning-color';
    } else if (sub.status === 'unpaid') {
      statusClass = 'badge-danger';
      progressColorClass = 'status-danger-color';
    }

    // Category avatar map
    const categoryLower = (sub.category || 'other').toLowerCase();
    let avatarClass = 'other';
    let categoryIcon = 'fa-box';

    if (categoryLower.includes('entertain')) {
      avatarClass = 'entertainment';
      categoryIcon = 'fa-tv';
    } else if (categoryLower.includes('util')) {
      avatarClass = 'utilities';
      categoryIcon = 'fa-bolt';
    } else if (categoryLower.includes('saas') || categoryLower.includes('work')) {
      avatarClass = 'saas';
      categoryIcon = 'fa-laptop-code';
    } else if (categoryLower.includes('finan')) {
      avatarClass = 'finance';
      categoryIcon = 'fa-coins';
    } else if (categoryLower.includes('life')) {
      avatarClass = 'lifestyle';
      categoryIcon = 'fa-heart';
    }

    // Days Remaining calculations
    let daysText = '';
    let daysClass = '';
    if (sub.daysRemaining < 0) {
      daysText = `Overdue by ${Math.abs(sub.daysRemaining)} day${Math.abs(sub.daysRemaining) === 1 ? '' : 's'}`;
      daysClass = 'text-coral';
    } else if (sub.daysRemaining === 0) {
      daysText = 'DUE TODAY';
      daysClass = 'text-coral font-bold';
    } else if (sub.daysRemaining === 1) {
      daysText = '1 day remaining';
      daysClass = 'text-amber';
    } else if (sub.daysRemaining <= 5) {
      daysText = `${sub.daysRemaining} days remaining`;
      daysClass = 'text-amber';
    } else {
      daysText = `${sub.daysRemaining} days left`;
      daysClass = 'text-muted';
    }

    // Progress Bar percentage calculation
    let cycleDays = 30;
    if (sub.billingCycle === 'weekly') cycleDays = 7;
    else if (sub.billingCycle === 'quarterly') cycleDays = 90;
    else if (sub.billingCycle === 'yearly') cycleDays = 365;

    const progressPercent = sub.daysRemaining <= 0 ? 100 : Math.max(0, Math.min(100, ((cycleDays - sub.daysRemaining) / cycleDays) * 100));

    card.className = 'sub-card glass-panel';
    card.innerHTML = `
      <div class="sub-card-header">
        <div class="sub-main-info">
          <div class="sub-avatar ${avatarClass}"><i class="fa-solid ${categoryIcon}"></i></div>
          <div class="sub-title">
            <h3>${sub.name}</h3>
            <div class="category-badge"><i class="fa-solid fa-tags"></i> ${sub.category}</div>
            ${sub.paymentAccount ? `<div class="account-badge"><i class="fa-solid fa-credit-card"></i> ${sub.paymentAccount}</div>` : ''}
          </div>
        </div>
        <div class="sub-finance-info">
          <div class="sub-price">${sub.currency}${sub.cost.toFixed(2)}</div>
          <div class="sub-cycle">${sub.billingCycle.toUpperCase()}</div>
        </div>
      </div>

      <div class="sub-timeline">
        <div class="timeline-info">
          <span>Last Paid: ${sub.lastPaymentDate}</span>
          <span>Next Pay: ${sub.nextPaymentDate}</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar ${progressColorClass}" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <div class="sub-card-footer">
        <div>
          <span class="sub-badge ${statusClass}">${sub.status.replace('_', ' ')}</span>
          <span class="days-tag ${daysClass}" style="margin-left: 10px;">${daysText}</span>
        </div>
        <div class="card-actions">
          <button class="btn-icon btn-icon-pay" title="Mark as Paid" onclick="handleMarkAsPaid('${sub.id}')">
            <i class="fa-solid fa-circle-check"></i> Paid
          </button>
          <button class="btn-icon" title="Edit subscription" onclick="openSubModal('${sub.id}')">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon btn-icon-delete" title="Delete subscription" onclick="handleDeleteSub('${sub.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
    
    // Inline styling for borders
    card.style.borderLeft = sub.status === 'unpaid' ? '4px solid var(--state-danger)' : 
                            sub.status === 'due_soon' ? '4px solid var(--state-warning)' : 
                            '4px solid var(--state-success)';
                            
    container.appendChild(card);
  });
}

function renderLogs() {
  const container = document.getElementById('mailbox-logs-container');
  const settingsContainer = document.getElementById('settings-mailbox-logs-container');
  container.innerHTML = '';
  if (settingsContainer) {
    settingsContainer.innerHTML = '';
  }

  if (logs.length === 0) {
    const emptyHtml = '<div class="empty-log-state">No log entries found. Reminders will show here.</div>';
    container.innerHTML = emptyHtml;
    if (settingsContainer) {
      settingsContainer.innerHTML = emptyHtml;
    }
    return;
  }

  logs.forEach(log => {
    let badgeClass = 'badge-log-mock';
    if (log.type === 'real') badgeClass = 'badge-log-real';
    if (log.type === 'payment') badgeClass = 'badge-log-payment';

    // Parse date nicely
    const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const innerHtml = `
      <div class="log-title-row">
        <span>${log.subscriptionName || 'System'}</span>
        <span class="log-timestamp">${timeStr} (${log.simulatedDate})</span>
      </div>
      <div class="log-body-preview">${log.subject}</div>
      <div class="log-meta-row">
        <span class="badge ${badgeClass}">${log.type.toUpperCase()}</span>
        <span class="text-muted">${log.status === 'success' ? '<i class="fa-solid fa-check text-emerald"></i>' : '<i class="fa-solid fa-xmark text-coral"></i>'} ${log.status.toUpperCase()}</span>
      </div>
    `;

    const item = document.createElement('div');
    item.className = 'log-item';
    item.addEventListener('click', () => openEmailModal(log));
    item.innerHTML = innerHtml;
    container.appendChild(item);

    if (settingsContainer) {
      const itemSettings = document.createElement('div');
      itemSettings.className = 'log-item';
      itemSettings.addEventListener('click', () => openEmailModal(log));
      itemSettings.innerHTML = innerHtml;
      settingsContainer.appendChild(itemSettings);
    }
  });
}

// Modal Handler Actions
function openSubModal(subId = null) {
  const modal = document.getElementById('sub-modal');
  const form = document.getElementById('subscription-form');
  const title = document.getElementById('modal-title');
  
  form.reset();
  document.getElementById('sub-id').value = '';
  title.textContent = 'Track New Subscription';

  // Set default last paid date to today
  document.getElementById('sub-last-payment').value = systemStatus.simulatedDate;

  if (subId) {
    title.textContent = 'Edit Subscription';
    const sub = subscriptions.find(s => s.id === subId);
    if (sub) {
      document.getElementById('sub-id').value = sub.id;
      document.getElementById('sub-name').value = sub.name;
      document.getElementById('sub-cost').value = sub.cost;
      document.getElementById('sub-currency').value = sub.currency;
      document.getElementById('sub-billing-cycle').value = sub.billingCycle;
      document.getElementById('sub-category').value = sub.category;
      document.getElementById('sub-last-payment').value = sub.lastPaymentDate;
      document.getElementById('sub-email').value = sub.email || '';
      document.getElementById('sub-account').value = sub.paymentAccount || 'Hammad Account';
    }
  }

  modal.classList.add('active');
}

function closeSubModal() {
  document.getElementById('sub-modal').classList.remove('active');
}

async function handleSubSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('sub-id').value;
  const body = {
    name: document.getElementById('sub-name').value,
    cost: parseFloat(document.getElementById('sub-cost').value),
    currency: document.getElementById('sub-currency').value,
    billingCycle: document.getElementById('sub-billing-cycle').value,
    category: document.getElementById('sub-category').value,
    lastPaymentDate: document.getElementById('sub-last-payment').value,
    email: document.getElementById('sub-email').value,
    paymentAccount: document.getElementById('sub-account').value
  };

  let result;
  if (id) {
    // Edit
    result = await apiCall(`/subscriptions/${id}`, 'PUT', body);
    if (result) showToast(`Subscription "${body.name}" updated!`, 'success');
  } else {
    // Create
    result = await apiCall('/subscriptions', 'POST', body);
    if (result) showToast(`Subscription "${body.name}" added successfully!`, 'success');
  }

  if (result) {
    closeSubModal();
    // Re-fetch data
    await fetchSubscriptions();
    await fetchStatus();
  }
}

// Delete Handler
async function handleDeleteSub(id) {
  if (confirm('Are you sure you want to delete this subscription?')) {
    const res = await apiCall(`/subscriptions/${id}`, 'DELETE');
    if (res) {
      showToast('Subscription deleted.', 'info');
      await fetchSubscriptions();
      await fetchStatus();
    }
  }
}

// Mark as Paid Handler
async function handleMarkAsPaid(id) {
  const res = await apiCall(`/subscriptions/${id}/pay`, 'POST');
  if (res) {
    showToast(`Payment recorded for ${res.name}! Cycle rolled forward.`, 'success');
    await fetchSubscriptions();
    await fetchStatus();
    await fetchLogs();
  }
}

// Time Travel Simulation
async function handleTimeTravelSet() {
  const dateVal = document.getElementById('simulation-date').value;
  if (!dateVal) {
    showToast('Please select a date', 'error');
    return;
  }
  const res = await apiCall('/status/time-travel', 'POST', { date: dateVal });
  if (res) {
    showToast(`Simulated system date shifted to ${res.simulatedDate}`, 'info');
    await fetchStatus();
    await fetchSubscriptions();
    await fetchEmployees();
    await fetchLeaves();
    await fetchAttendance();
    await fetchPerformanceReviews();
    calculateAndRenderHRMetrics();
    renderHRSubTab();
    await fetchContracts();
    await fetchCases();
    await fetchCompliance();
    calculateAndRenderLegalsMetrics();
    renderLegalsSubTab();
    await fetchVehicles();
    await fetchLeases();
    calculateAndRenderLeasingMetrics();
    renderLeasingSubTab();
  }
}

async function handleTimeTravelReset() {
  const res = await apiCall('/status/time-travel', 'POST', { date: null });
  if (res) {
    showToast('Reset back to current live server time.', 'info');
    await fetchStatus();
    await fetchSubscriptions();
    await fetchEmployees();
    await fetchLeaves();
    await fetchAttendance();
    await fetchPerformanceReviews();
    calculateAndRenderHRMetrics();
    renderHRSubTab();
    await fetchContracts();
    await fetchCases();
    await fetchCompliance();
    calculateAndRenderLegalsMetrics();
    renderLegalsSubTab();
    await fetchVehicles();
    await fetchLeases();
    calculateAndRenderLeasingMetrics();
    renderLeasingSubTab();
  }
}

// Trigger Cron Check
async function handleRunScheduler() {
  showToast('Executing reminder checks...', 'info');
  const res = await apiCall('/scheduler/run', 'POST');
  if (res) {
    if (res.triggeredCount > 0) {
      showToast(`Scheduler completed. Sent ${res.triggeredCount} reminder(s).`, 'success');
    } else {
      showToast('Scheduler completed. No reminders needed for this simulated date.', 'info');
    }
    await fetchSubscriptions();
    await fetchLogs();
    await fetchStatus();
  }
}

// Accordion Controller
function toggleSettingsAccordion() {
  const body = document.getElementById('settings-form-container');
  const arrow = document.querySelector('#settings-accordion-toggle .accordion-arrow');
  
  if (!body || !arrow) return;

  if (body.classList.contains('collapsed')) {
    body.classList.remove('collapsed');
    body.classList.add('expanded');
    arrow.style.transform = 'rotate(180deg)';
  } else {
    body.classList.remove('expanded');
    body.classList.add('collapsed');
    arrow.style.transform = 'rotate(0deg)';
  }
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const body = {
    smtpHost: document.getElementById('smtp-host').value,
    smtpPort: document.getElementById('smtp-port').value,
    smtpFrom: document.getElementById('smtp-from').value,
    smtpUser: document.getElementById('smtp-user').value,
    smtpPass: document.getElementById('smtp-pass').value,
    notificationEmail: document.getElementById('notification-email').value
  };

  const res = await apiCall('/settings', 'POST', body);
  if (res) {
    showToast('Settings saved successfully.', 'success');
    toggleSettingsAccordion();
    await fetchSettings();
  }
}

// Clear Logs
async function handleClearLogs() {
  if (confirm('Clear all logs and email records?')) {
    const res = await apiCall('/logs/clear', 'POST');
    if (res) {
      showToast('Logs cleared.', 'info');
      await fetchLogs();
    }
  }
}

// Email modal actions
function openEmailModal(log) {
  const modal = document.getElementById('email-modal');
  
  document.getElementById('email-meta-from').textContent = 'noreply@subscriptiontracker.local';
  document.getElementById('email-meta-to').textContent = log.recipient || 'N/A';
  document.getElementById('email-meta-subject').textContent = log.subject;
  document.getElementById('email-meta-time').textContent = new Date(log.timestamp).toLocaleString();
  
  const statusBadge = document.getElementById('email-meta-status');
  statusBadge.textContent = log.type.toUpperCase();
  statusBadge.className = `badge ${log.type === 'real' ? 'badge-log-real' : log.type === 'payment' ? 'badge-log-payment' : 'badge-log-mock'}`;

  const renderContainer = document.getElementById('email-body-render');
  
  if (log.type === 'payment') {
    // Plain text payment logs
    renderContainer.style.background = 'rgba(0,0,0,0.2)';
    renderContainer.style.color = '#fff';
    renderContainer.style.padding = '20px';
    renderContainer.innerHTML = `<pre style="font-family: inherit; white-space: pre-wrap;">${log.body}</pre>`;
  } else {
    // Rendered html content
    renderContainer.style.background = 'white';
    renderContainer.style.color = '#333';
    renderContainer.style.padding = '0';
    
    let htmlBody = log.body.replace(/\n/g, '<br>');
    if (log.body.includes('Subscription Due Reminder')) {
      // It is already HTML
      htmlBody = log.body;
    }
    renderContainer.innerHTML = htmlBody;
  }

  modal.classList.add('active');
}

function closeEmailModal() {
  document.getElementById('email-modal').classList.remove('active');
}

// Global click event handlers mapping
window.handleMarkAsPaid = handleMarkAsPaid;
window.handleDeleteSub = handleDeleteSub;
window.openSubModal = openSubModal;

// ==================== MODULE 1: SALES CRM LOGIC ====================

// Fetch Leads from API
async function fetchLeads() {
  const data = await apiCall('/leads', 'GET');
  if (data) {
    leads = data;
    calculateAndRenderSalesMetrics();
    renderSalesKanban();
  }
}

// Format Currency
function formatValue(value, currency = '$') {
  return `${currency}${parseFloat(value).toFixed(2)}`;
}

// Calculate and Render Sales KPIs & Report Tables
function calculateAndRenderSalesMetrics() {
  let totalLeadsCount = leads.length;
  
  // Leads created in current month (based on simulated date)
  const currentSimMonth = systemStatus.simulatedDate ? systemStatus.simulatedDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
  let monthlyLeadsCount = leads.filter(l => l.createdDate && l.createdDate.startsWith(currentSimMonth)).length;

  let wonLeads = leads.filter(l => l.stage === 'won');
  let lostLeads = leads.filter(l => l.stage === 'lost');
  let activeLeads = leads.filter(l => ['new', 'contacted', 'proposal', 'negotiation'].includes(l.stage));

  // Closed deals conversion rate
  let conversionRate = 0;
  if (wonLeads.length + lostLeads.length > 0) {
    conversionRate = Math.round((wonLeads.length / (wonLeads.length + lostLeads.length)) * 100);
  }

  // Calculate Pipeline and Won values grouped by currency
  const pipelineByCurrency = {};
  const wonByCurrency = {};
  let totalWonInUSD = 0; // for average calculation
  let totalWonDealsCount = wonLeads.length;

  activeLeads.forEach(l => {
    const cur = l.currency || '$';
    pipelineByCurrency[cur] = (pipelineByCurrency[cur] || 0) + parseFloat(l.value || 0);
  });

  wonLeads.forEach(l => {
    const cur = l.currency || '$';
    wonByCurrency[cur] = (wonByCurrency[cur] || 0) + parseFloat(l.value || 0);
    // Simple mock exchange for avg representation
    let usdVal = parseFloat(l.value || 0);
    if (cur === '€') usdVal *= 1.1;
    if (cur === '£') usdVal *= 1.25;
    totalWonInUSD += usdVal;
  });

  // Render KPI values
  document.getElementById('sales-stat-total-leads').textContent = totalLeadsCount;
  document.getElementById('sales-stat-monthly-leads').textContent = `${monthlyLeadsCount} captured this month`;
  document.getElementById('sales-stat-conversion').textContent = `${conversionRate}%`;
  document.getElementById('sales-stat-won-lost').textContent = `${wonLeads.length} Won / ${lostLeads.length} Lost`;

  // Render Pipeline Revenue
  const pipelineEl = document.getElementById('sales-stat-pipeline');
  if (Object.keys(pipelineByCurrency).length === 0) {
    pipelineEl.innerHTML = '<div class="currency-line">$0.00</div>';
  } else {
    pipelineEl.innerHTML = Object.entries(pipelineByCurrency)
      .map(([cur, val]) => `<div class="currency-line">${formatValue(val, cur)}</div>`)
      .join('');
  }

  // Render Won Revenue
  const wonEl = document.getElementById('sales-stat-won-revenue');
  if (Object.keys(wonByCurrency).length === 0) {
    wonEl.innerHTML = '<div class="currency-line">$0.00</div>';
  } else {
    wonEl.innerHTML = Object.entries(wonByCurrency)
      .map(([cur, val]) => `<div class="currency-line">${formatValue(val, cur)}</div>`)
      .join('');
  }

  // Avg won deal value (represented in USD $)
  const avgVal = totalWonDealsCount > 0 ? (totalWonInUSD / totalWonDealsCount) : 0;
  document.getElementById('sales-stat-avg-value').textContent = `Avg: $${avgVal.toFixed(2)}`;

  // Generate and render all reports
  renderSalesReports(wonLeads, activeLeads);
}

// Render Kanban Pipeline
function renderSalesKanban() {
  const board = document.getElementById('sales-kanban-board');
  if (!board) return;

  const searchQuery = document.getElementById('sales-search').value.toLowerCase().trim();
  const filterSource = document.getElementById('sales-filter-source').value;
  const filterAgent = document.getElementById('sales-filter-agent').value;

  // Filter leads first
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery) || 
                          (l.contactName && l.contactName.toLowerCase().includes(searchQuery));
    const matchesSource = filterSource ? l.source === filterSource : true;
    const matchesAgent = filterAgent ? l.assignedAgent === filterAgent : true;
    return matchesSearch && matchesSource && matchesAgent;
  });

  const stages = [
    { key: 'new', name: 'New Lead', colClass: 'col-new', icon: 'fa-star' },
    { key: 'contacted', name: 'Contacted', colClass: 'col-contacted', icon: 'fa-comments' },
    { key: 'proposal', name: 'Proposal Sent', colClass: 'col-proposal', icon: 'fa-file-invoice-dollar' },
    { key: 'negotiation', name: 'Negotiation', colClass: 'col-negotiation', icon: 'fa-handshake' },
    { key: 'won', name: 'Closed Won', colClass: 'col-won', icon: 'fa-circle-check' },
    { key: 'lost', name: 'Closed Lost', colClass: 'col-lost', icon: 'fa-circle-xmark' }
  ];

  board.innerHTML = '';

  stages.forEach(stage => {
    const stageLeads = filteredLeads.filter(l => l.stage === stage.key);
    
    const col = document.createElement('div');
    col.className = `kanban-column ${stage.colClass}`;
    col.setAttribute('data-stage', stage.key);

    col.innerHTML = `
      <div class="kanban-column-header">
        <h3><i class="fa-solid ${stage.icon}"></i> ${stage.name}</h3>
        <span class="column-count">${stageLeads.length}</span>
      </div>
      <div class="kanban-column-body" style="flex-grow: 1; display: flex; flex-direction: column; gap: 10px;">
      </div>
    `;

    const body = col.querySelector('.kanban-column-body');

    stageLeads.forEach(lead => {
      const card = document.createElement('div');
      card.className = 'lead-card';
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', lead.id);

      card.innerHTML = `
        <div class="lead-card-header">
          <h4>${lead.name}</h4>
          <span class="lead-source-tag">${lead.source}</span>
        </div>
        <div class="lead-card-body">
          ${lead.contactName ? `<p class="lead-contact"><i class="fa-solid fa-user"></i> ${lead.contactName}</p>` : ''}
          <div class="lead-value">${formatValue(lead.value, lead.currency || '$')}</div>
        </div>
        <div class="lead-card-footer">
          <div class="lead-agent"><i class="fa-solid fa-user-tie"></i> ${lead.assignedAgent ? lead.assignedAgent.replace(' Account', '') : 'Unassigned'}</div>
          <div style="display:flex; gap: 4px;">
            <button class="btn-icon" style="padding: 4px;" onclick="openLeadModal('${lead.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn-icon btn-icon-delete" style="padding: 4px;" onclick="handleDeleteLead('${lead.id}')"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      `;

      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', lead.id);
        e.dataTransfer.effectAllowed = 'move';
      });

      body.appendChild(card);
    });

    board.appendChild(col);
  });

  // Setup column drag over & drop listeners
  const cols = document.querySelectorAll('.kanban-column');
  cols.forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', () => {
      col.classList.remove('drag-over');
    });

    col.addEventListener('drop', async e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const leadId = e.dataTransfer.getData('text/plain');
      const targetStage = col.getAttribute('data-stage');
      
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.stage !== targetStage) {
        // Optimistic UI update
        lead.stage = targetStage;
        renderSalesKanban();
        calculateAndRenderSalesMetrics();
        
        const updateRes = await apiCall(`/leads/${leadId}`, 'PUT', { stage: targetStage });
        if (updateRes) {
          showToast(`Lead "${lead.name}" moved to ${targetStage.toUpperCase()}`, 'info');
        }
        await fetchLeads();
      }
    });
  });
}

// Modal Handlers
function openLeadModal(leadId = null) {
  const modal = document.getElementById('lead-modal');
  const form = document.getElementById('lead-form');
  const title = document.getElementById('lead-modal-title');
  const commPreview = document.getElementById('lead-commission-preview');

  form.reset();
  document.getElementById('lead-id').value = '';
  document.getElementById('lead-commission-rate').value = '10.0';
  commPreview.textContent = 'Estimated Commission: $0.00';

  if (leadId) {
    title.textContent = 'Edit Sales Lead';
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      document.getElementById('lead-id').value = lead.id;
      document.getElementById('lead-name').value = lead.name;
      document.getElementById('lead-contact').value = lead.contactName || '';
      document.getElementById('lead-phone').value = lead.phone || '';
      document.getElementById('lead-email').value = lead.email || '';
      document.getElementById('lead-source').value = lead.source || 'Website';
      document.getElementById('lead-value').value = lead.value || 0;
      document.getElementById('lead-currency').value = lead.currency || '$';
      document.getElementById('lead-commission-rate').value = lead.commissionRate || 10;
      document.getElementById('lead-agent').value = lead.assignedAgent || 'Hammad Account';
      document.getElementById('lead-stage').value = lead.stage || 'new';
      document.getElementById('lead-follow-up').value = lead.followUpDate || '';
      document.getElementById('lead-notes').value = lead.notes || '';
      
      const val = parseFloat(lead.value || 0);
      const rate = parseFloat(lead.commissionRate || 10);
      const comm = (val * rate) / 100;
      commPreview.textContent = `Estimated Commission: ${lead.currency || '$'}${comm.toFixed(2)}`;
    }
  } else {
    title.textContent = 'Capture New Sales Lead';
  }

  modal.classList.add('active');
}

function closeLeadModal() {
  document.getElementById('lead-modal').classList.remove('active');
}

// Submit Form Handler
async function handleLeadSubmit(e) {
  e.preventDefault();
  
  const leadId = document.getElementById('lead-id').value;
  const body = {
    name: document.getElementById('lead-name').value,
    contactName: document.getElementById('lead-contact').value,
    phone: document.getElementById('lead-phone').value,
    email: document.getElementById('lead-email').value,
    source: document.getElementById('lead-source').value,
    value: parseFloat(document.getElementById('lead-value').value) || 0,
    currency: document.getElementById('lead-currency').value,
    commissionRate: parseFloat(document.getElementById('lead-commission-rate').value) || 10,
    assignedAgent: document.getElementById('lead-agent').value,
    stage: document.getElementById('lead-stage').value,
    followUpDate: document.getElementById('lead-follow-up').value,
    notes: document.getElementById('lead-notes').value
  };

  let result;
  if (leadId) {
    result = await apiCall(`/leads/${leadId}`, 'PUT', body);
    if (result) showToast(`Lead "${body.name}" updated successfully!`, 'success');
  } else {
    result = await apiCall('/leads', 'POST', body);
    if (result) showToast(`New sales lead "${body.name}" captured!`, 'success');
  }

  if (result) {
    closeLeadModal();
    await fetchLeads();
  }
}

// Delete Lead Handler
async function handleDeleteLead(leadId) {
  if (confirm('Are you sure you want to delete this sales lead?')) {
    const res = await apiCall(`/leads/${leadId}`, 'DELETE');
    if (res) {
      showToast('Sales lead deleted.', 'info');
      await fetchLeads();
    }
  }
}

// Render Reports & Analytics
function renderSalesReports(wonLeads, activeLeads) {
  // 1. Agent Sales & Commissions
  const agentPerformanceBody = document.getElementById('report-agent-performance');
  const agentStats = {};

  // Initialize stats for our known agents
  const agents = ['Hammad Account', 'Ehsan Khan Account'];
  agents.forEach(agent => {
    agentStats[agent] = { wonDeals: 0, totalWonVal: {}, commissions: {}, totalDealsCount: 0 };
  });

  // Calculate stats based on all leads
  leads.forEach(l => {
    const agent = l.assignedAgent || 'Hammad Account';
    if (!agentStats[agent]) {
      agentStats[agent] = { wonDeals: 0, totalWonVal: {}, commissions: {}, totalDealsCount: 0 };
    }
    agentStats[agent].totalDealsCount++;
    
    if (l.stage === 'won') {
      agentStats[agent].wonDeals++;
      const cur = l.currency || '$';
      const val = parseFloat(l.value || 0);
      const rate = parseFloat(l.commissionRate || 10);
      const comm = (val * rate) / 100;
      
      agentStats[agent].totalWonVal[cur] = (agentStats[agent].totalWonVal[cur] || 0) + val;
      agentStats[agent].commissions[cur] = (agentStats[agent].commissions[cur] || 0) + comm;
    }
  });

  agentPerformanceBody.innerHTML = Object.entries(agentStats).map(([agent, stats]) => {
    const revenueStrs = Object.entries(stats.totalWonVal).map(([cur, val]) => formatValue(val, cur));
    const revenueText = revenueStrs.length > 0 ? revenueStrs.join('<br>') : '$0.00';

    const commStrs = Object.entries(stats.commissions).map(([cur, val]) => formatValue(val, cur));
    const commText = commStrs.length > 0 ? commStrs.join('<br>') : '$0.00';

    const closedDeals = leads.filter(l => l.assignedAgent === agent && ['won', 'lost'].includes(l.stage)).length;
    const convRate = closedDeals > 0 ? Math.round((stats.wonDeals / closedDeals) * 100) : 0;

    return `
      <tr>
        <td><strong>${agent.replace(' Account', '')}</strong></td>
        <td class="text-center">${stats.wonDeals}</td>
        <td class="text-right" style="line-height: 1.3;">${revenueText}</td>
        <td class="text-right" style="line-height: 1.3; color: var(--accent-purple); font-weight:600;">${commText}</td>
        <td class="text-center"><span class="badge ${convRate >= 50 ? 'badge-log-real' : 'badge-log-mock'}">${convRate}%</span></td>
      </tr>
    `;
  }).join('');

  // 2. Lead Source Analysis
  const sourceBody = document.getElementById('report-source-analysis');
  const sources = ['Website', 'Referral', 'Social Media', 'Cold Call', 'Other'];
  const sourceStats = {};
  sources.forEach(src => sourceStats[src] = { count: 0, pipeline: {}, wonVal: {} });

  leads.forEach(l => {
    const src = l.source || 'Other';
    if (!sourceStats[src]) sourceStats[src] = { count: 0, pipeline: {}, wonVal: {} };
    sourceStats[src].count++;
    
    const cur = l.currency || '$';
    const val = parseFloat(l.value || 0);

    if (['new', 'contacted', 'proposal', 'negotiation'].includes(l.stage)) {
      sourceStats[src].pipeline[cur] = (sourceStats[src].pipeline[cur] || 0) + val;
    } else if (l.stage === 'won') {
      sourceStats[src].wonVal[cur] = (sourceStats[src].wonVal[cur] || 0) + val;
    }
  });

  sourceBody.innerHTML = Object.entries(sourceStats).map(([src, stats]) => {
    const pipeStrs = Object.entries(stats.pipeline).map(([cur, val]) => formatValue(val, cur));
    const pipeText = pipeStrs.length > 0 ? pipeStrs.join('<br>') : '$0.00';

    const wonStrs = Object.entries(stats.wonVal).map(([cur, val]) => formatValue(val, cur));
    const wonText = wonStrs.length > 0 ? wonStrs.join('<br>') : '$0.00';

    return `
      <tr>
        <td><strong>${src}</strong></td>
        <td class="text-center">${stats.count}</td>
        <td class="text-right" style="line-height: 1.3;">${pipeText}</td>
        <td class="text-right" style="line-height: 1.3; color: var(--state-success);">${wonText}</td>
      </tr>
    `;
  }).join('');

  // 3. Monthly Sales Summary
  const monthlySummaryBody = document.getElementById('report-monthly-summary');
  const monthlyStats = {};

  wonLeads.forEach(l => {
    const month = l.createdDate ? l.createdDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
    if (!monthlyStats[month]) monthlyStats[month] = { count: 0, valByCur: {} };
    monthlyStats[month].count++;
    const cur = l.currency || '$';
    monthlyStats[month].valByCur[cur] = (monthlyStats[month].valByCur[cur] || 0) + parseFloat(l.value || 0);
  });

  const sortedMonths = Object.entries(monthlyStats).sort((a,b) => b[0].localeCompare(a[0]));
  if (sortedMonths.length === 0) {
    monthlySummaryBody.innerHTML = '<tr><td colspan="4" class="text-center">No sales recorded yet.</td></tr>';
  } else {
    monthlySummaryBody.innerHTML = sortedMonths.map(([month, stats]) => {
      const [year, mNum] = month.split('-');
      const date = new Date(year, parseInt(mNum)-1, 1);
      const monthName = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      const valStrs = Object.entries(stats.valByCur).map(([cur, val]) => formatValue(val, cur));
      const valText = valStrs.length > 0 ? valStrs.join('<br>') : '$0.00';

      const avgStrs = Object.entries(stats.valByCur).map(([cur, val]) => formatValue(val / stats.count, cur));
      const avgText = avgStrs.length > 0 ? avgStrs.join('<br>') : '$0.00';

      return `
        <tr>
          <td><strong>${monthName}</strong></td>
          <td class="text-center">${stats.count}</td>
          <td class="text-right" style="line-height: 1.3; color: var(--state-success); font-weight:600;">${valText}</td>
          <td class="text-right" style="line-height: 1.3;">${avgText}</td>
        </tr>
      `;
    }).join('');
  }

  // 4. Weighted Revenue Forecast
  const forecastBody = document.getElementById('report-revenue-forecast');
  
  const stageWeights = {
    'new': { weight: 10, label: 'New Lead' },
    'contacted': { weight: 30, label: 'Contacted' },
    'proposal': { weight: 50, label: 'Proposal Sent' },
    'negotiation': { weight: 80, label: 'Negotiation' },
    'won': { weight: 100, label: 'Closed Won' }
  };

  const rawValues = {};
  const weightedValues = {};

  Object.keys(stageWeights).forEach(st => {
    rawValues[st] = {};
    weightedValues[st] = {};
  });

  leads.forEach(l => {
    const st = l.stage;
    if (stageWeights[st]) {
      const cur = l.currency || '$';
      const val = parseFloat(l.value || 0);
      rawValues[st][cur] = (rawValues[st][cur] || 0) + val;
      weightedValues[st][cur] = (weightedValues[st][cur] || 0) + (val * stageWeights[st].weight / 100);
    }
  });

  forecastBody.innerHTML = Object.entries(stageWeights).map(([st, meta]) => {
    const rawStrs = Object.entries(rawValues[st]).map(([cur, val]) => formatValue(val, cur));
    const rawText = rawStrs.length > 0 ? rawStrs.join('<br>') : '$0.00';

    const weightedStrs = Object.entries(weightedValues[st]).map(([cur, val]) => formatValue(val, cur));
    const weightedText = weightedStrs.length > 0 ? weightedStrs.join('<br>') : '$0.00';

    return `
      <tr>
        <td><strong>${meta.label}</strong></td>
        <td class="text-center"><span class="badge badge-log-mock" style="padding: 2px 8px;">${meta.weight}%</span></td>
        <td class="text-right" style="line-height: 1.3;">${rawText}</td>
        <td class="text-right" style="line-height: 1.3; font-weight:600; color: var(--accent-indigo);">${weightedText}</td>
      </tr>
    `;
  }).join('');

  // Forecast Grand Totals Grouped
  const grandRaw = {};
  const grandWeighted = {};
  
  leads.forEach(l => {
    const st = l.stage;
    if (stageWeights[st]) {
      const cur = l.currency || '$';
      const val = parseFloat(l.value || 0);
      grandRaw[cur] = (grandRaw[cur] || 0) + val;
      grandWeighted[cur] = (grandWeighted[cur] || 0) + (val * stageWeights[st].weight / 100);
    }
  });

  const rawTotalStrs = Object.entries(grandRaw).map(([cur, val]) => formatValue(val, cur));
  document.getElementById('forecast-raw-total').innerHTML = rawTotalStrs.length > 0 ? rawTotalStrs.join('<br>') : '$0.00';

  const weightedTotalStrs = Object.entries(grandWeighted).map(([cur, val]) => formatValue(val, cur));
  document.getElementById('forecast-weighted-total').innerHTML = weightedTotalStrs.length > 0 ? weightedTotalStrs.join('<br>') : '$0.00';
}

function renderSettingsMailboxMirror() {
  const settingsContainer = document.getElementById('settings-mailbox-logs-container');
  const mainContainer = document.getElementById('mailbox-logs-container');
  if (settingsContainer && mainContainer) {
    settingsContainer.innerHTML = mainContainer.innerHTML;
  }
}

// Global exposure
window.openLeadModal = openLeadModal;
window.handleDeleteLead = handleDeleteLead;

// ==================== MODULE 2: TECH TICKETS HELPDESK LOGIC ====================

// Fetch Tickets from API
async function fetchTickets() {
  const data = await apiCall('/tickets', 'GET');
  if (data) {
    tickets = data;
    calculateAndRenderTicketsMetrics();
    renderTicketsKanban();
  }
}

// Calculate and Render Tickets Dashboard metrics and Reports
function calculateAndRenderTicketsMetrics() {
  const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In In Progress' || t.status === 'In Progress');
  const inProgress = tickets.filter(t => t.status === 'In Progress');
  const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
  const criticalOpen = openTickets.filter(t => t.priority === 'Critical');

  // SLA calculations based on current system time
  let breachCount = 0;
  let totalResolveTimeHours = 0;
  let resolvedCountWithSLA = 0;
  
  // CSAT calculations
  let ratingsSum = 0;
  let ratingsCount = 0;

  const currentSysDate = new Date(systemStatus.simulatedDate || new Date().toISOString().substring(0, 10));
  const realTime = new Date();
  currentSysDate.setHours(realTime.getHours(), realTime.getMinutes(), realTime.getSeconds());

  tickets.forEach(t => {
    const created = new Date(t.createdDate);
    
    // Check if breached
    if (t.status === 'Resolved' || t.status === 'Closed') {
      const finish = new Date(t.resolvedDate || t.closedDate || t.createdDate);
      const elapsedHours = (finish - created) / (1000 * 60 * 60);
      
      totalResolveTimeHours += elapsedHours;
      resolvedCountWithSLA++;

      if (elapsedHours > t.slaHours) {
        breachCount++;
      }

      if (t.satisfactionRating) {
        ratingsSum += t.satisfactionRating;
        ratingsCount++;
      }
    } else {
      // Active ticket SLA check
      const elapsedHours = (currentSysDate - created) / (1000 * 60 * 60);
      if (elapsedHours > t.slaHours) {
        breachCount++;
      }
    }
  });

  // Calculate Avg Resolve Time
  const avgResolveTime = resolvedCountWithSLA > 0 ? (totalResolveTimeHours / resolvedCountWithSLA) : 0;
  const complianceRate = resolvedCountWithSLA > 0 ? Math.round(((resolvedCountWithSLA - breachCount) / resolvedCountWithSLA) * 100) : 100;
  const csatAvg = ratingsCount > 0 ? (ratingsSum / ratingsCount) : 0;

  // Render metrics ribbon
  document.getElementById('tickets-stat-open').textContent = openTickets.length;
  document.getElementById('tickets-stat-in-progress').textContent = `${inProgress.length} In Progress`;
  document.getElementById('tickets-stat-breached').textContent = breachCount;
  document.getElementById('tickets-stat-compliance').textContent = `${complianceRate}% Compliant`;
  document.getElementById('tickets-stat-avg-time').textContent = `${avgResolveTime.toFixed(1)}h`;
  document.getElementById('tickets-stat-resolved-count').textContent = `${resolved.length} Resolved / Closed`;
  document.getElementById('tickets-stat-csat').textContent = `${csatAvg.toFixed(1)} / 5`;
  document.getElementById('tickets-stat-feedback-count').textContent = `${ratingsCount} Reviews Received`;

  // Render Reports
  renderTicketsReports(csatAvg, resolvedCountWithSLA, breachCount);
}

// Helper: SLA Countdown display
function getSlaBadgeHtml(ticket) {
  const created = new Date(ticket.createdDate);
  const currentSysDate = new Date(systemStatus.simulatedDate || new Date().toISOString().substring(0, 10));
  const realTime = new Date();
  currentSysDate.setHours(realTime.getHours(), realTime.getMinutes(), realTime.getSeconds());

  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    const finish = new Date(ticket.resolvedDate || ticket.closedDate || ticket.createdDate);
    const elapsed = (finish - created) / (1000 * 60 * 60);
    
    if (elapsed <= ticket.slaHours) {
      return `<span class="sla-badge safe"><i class="fa-solid fa-check"></i> Compliant (${elapsed.toFixed(1)}h)</span>`;
    } else {
      return `<span class="sla-badge breached"><i class="fa-solid fa-triangle-exclamation"></i> Breached (+${(elapsed - ticket.slaHours).toFixed(1)}h)</span>`;
    }
  } else {
    // Active ticket countdown
    const elapsed = (currentSysDate - created) / (1000 * 60 * 60);
    const remaining = ticket.slaHours - elapsed;

    if (remaining < 0) {
      return `<span class="sla-badge breached"><i class="fa-solid fa-triangle-exclamation"></i> OVERDUE (${Math.abs(remaining).toFixed(1)}h)</span>`;
    } else if (remaining <= 4) {
      return `<span class="sla-badge danger"><i class="fa-solid fa-hourglass-half"></i> ${remaining.toFixed(1)}h left</span>`;
    } else if (remaining <= 12) {
      return `<span class="sla-badge warning"><i class="fa-solid fa-hourglass-half"></i> ${remaining.toFixed(1)}h left</span>`;
    } else {
      return `<span class="sla-badge safe"><i class="fa-solid fa-hourglass-half"></i> ${remaining.toFixed(1)}h left</span>`;
    }
  }
}

// Helper: CSAT Stars markup
function getCsatStarsHtml(rating) {
  if (!rating) return '<span class="text-muted" style="font-size:11px;">Unrated</span>';
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<i class="fa-${i <= rating ? 'solid' : 'regular'} fa-star" style="color: #f59e0b; margin-right: 1px;"></i>`;
  }
  return `<span class="csat-rating-stars">${stars}</span>`;
}

// Render Tickets Kanban pipeline
function renderTicketsKanban() {
  const board = document.getElementById('tickets-kanban-board');
  if (!board) return;

  const searchQuery = document.getElementById('tickets-search').value.toLowerCase().trim();
  const filterPriority = document.getElementById('tickets-filter-priority').value;
  const filterEngineer = document.getElementById('tickets-filter-engineer').value;

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery) || 
                          (t.customerName && t.customerName.toLowerCase().includes(searchQuery)) ||
                          (t.description && t.description.toLowerCase().includes(searchQuery));
    const matchesPriority = filterPriority ? t.priority === filterPriority : true;
    const matchesEngineer = filterEngineer ? t.assignedEngineer === filterEngineer : true;
    return matchesSearch && matchesPriority && matchesEngineer;
  });

  const statuses = [
    { key: 'Open', name: 'Open Tickets', colClass: 'col-open', icon: 'fa-envelope-open' },
    { key: 'In Progress', name: 'In Progress', colClass: 'col-inprogress', icon: 'fa-spinner' },
    { key: 'Resolved', name: 'Resolved', colClass: 'col-resolved', icon: 'fa-circle-check' },
    { key: 'Closed', name: 'Closed Archive', colClass: 'col-closed', icon: 'fa-box-archive' }
  ];

  board.innerHTML = '';

  statuses.forEach(status => {
    const statusTickets = filteredTickets.filter(t => t.status === status.key);
    
    const col = document.createElement('div');
    col.className = `kanban-column ${status.colClass}`;
    col.setAttribute('data-status', status.key);

    col.innerHTML = `
      <div class="kanban-column-header">
        <h3><i class="fa-solid ${status.icon}"></i> ${status.name}</h3>
        <span class="column-count">${statusTickets.length}</span>
      </div>
      <div class="kanban-column-body" style="flex-grow: 1; display: flex; flex-direction: column; gap: 10px;">
      </div>
    `;

    const body = col.querySelector('.kanban-column-body');

    statusTickets.forEach(ticket => {
      const card = document.createElement('div');
      card.className = `lead-card priority-${ticket.priority.toLowerCase()}`;
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-id', ticket.id);

      const slaHtml = getSlaBadgeHtml(ticket);
      const ratingHtml = ticket.status === 'Resolved' || ticket.status === 'Closed' ? getCsatStarsHtml(ticket.satisfactionRating) : '';

      card.innerHTML = `
        <div class="lead-card-header">
          <h4 style="font-size: 13.5px; font-weight:700;">${ticket.title}</h4>
          <span class="lead-source-tag" style="background: rgba(255,255,255,0.06); font-size: 9px;">${ticket.priority.toUpperCase()}</span>
        </div>
        <div class="lead-card-body">
          <p class="lead-contact" style="font-size:11px; margin-bottom: 5px;"><i class="fa-solid fa-user"></i> ${ticket.customerName || 'No Name'}</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:11px; color:var(--color-text-muted);">${slaHtml}</div>
            <div>${ratingHtml}</div>
          </div>
        </div>
        <div class="lead-card-footer">
          <div class="lead-agent"><i class="fa-solid fa-user-gear"></i> ${ticket.assignedEngineer ? ticket.assignedEngineer.replace(' Account', '') : 'Unassigned'}</div>
          <div style="display:flex; gap: 4px;">
            <button class="btn-icon" style="padding: 4px;" onclick="openTicketModal('${ticket.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn-icon btn-icon-delete" style="padding: 4px;" onclick="handleDeleteTicket('${ticket.id}')"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      `;

      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', ticket.id);
        e.dataTransfer.effectAllowed = 'move';
      });

      body.appendChild(card);
    });

    board.appendChild(col);
  });

  // Setup drag drop events
  const cols = document.querySelectorAll('#tickets-kanban-board .kanban-column');
  cols.forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', () => {
      col.classList.remove('drag-over');
    });

    col.addEventListener('drop', async e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const ticketId = e.dataTransfer.getData('text/plain');
      const targetStatus = col.getAttribute('data-status');
      
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket && ticket.status !== targetStatus) {
        if (targetStatus === 'Resolved' || targetStatus === 'Closed') {
          // Open modal to get satisfaction rating rating
          openTicketModal(ticketId);
          // Auto select target status in dropdown
          setTimeout(() => {
            document.getElementById('ticket-status').value = targetStatus;
            document.getElementById('ticket-status').dispatchEvent(new Event('change'));
          }, 100);
          return;
        }

        // Optimistic UI updates
        ticket.status = targetStatus;
        renderTicketsKanban();
        calculateAndRenderTicketsMetrics();
        
        const updateRes = await apiCall(`/tickets/${ticketId}`, 'PUT', { status: targetStatus });
        if (updateRes) {
          showToast(`Ticket "${ticket.title}" status set to ${targetStatus}`, 'info');
        }
        await fetchTickets();
      }
    });
  });
}

// Modal Handlers
function openTicketModal(ticketId = null) {
  const modal = document.getElementById('ticket-modal');
  const form = document.getElementById('ticket-form');
  const title = document.getElementById('ticket-modal-title');
  const ratingGroup = document.getElementById('ticket-rating-group');
  const ratingInput = document.getElementById('ticket-rating');
  const stars = document.querySelectorAll('.star-btn');

  form.reset();
  document.getElementById('ticket-id').value = '';
  ratingGroup.style.display = 'none';
  ratingInput.value = '';
  
  // Clear stars highlight
  stars.forEach(s => {
    s.classList.remove('active');
    s.querySelector('i').className = 'fa-regular fa-star';
  });

  if (ticketId) {
    title.textContent = 'Edit Support Ticket';
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      document.getElementById('ticket-id').value = ticket.id;
      document.getElementById('ticket-title').value = ticket.title;
      document.getElementById('ticket-desc').value = ticket.description || '';
      document.getElementById('ticket-cust-name').value = ticket.customerName || '';
      document.getElementById('ticket-cust-email').value = ticket.customerEmail || '';
      document.getElementById('ticket-priority').value = ticket.priority || 'Medium';
      document.getElementById('ticket-engineer').value = ticket.assignedEngineer || 'Hammad Account';
      document.getElementById('ticket-status').value = ticket.status || 'Open';
      document.getElementById('ticket-notes').value = ticket.notes || '';
      
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        ratingGroup.style.display = 'block';
        if (ticket.satisfactionRating) {
          ratingInput.value = ticket.satisfactionRating;
          stars.forEach(s => {
            if (parseInt(s.getAttribute('data-star')) <= parseInt(ticket.satisfactionRating)) {
              s.classList.add('active');
              s.querySelector('i').className = 'fa-solid fa-star';
            }
          });
        }
      }
    }
  } else {
    title.textContent = 'Create Support Ticket';
  }

  modal.classList.add('active');
}

function closeTicketModal() {
  document.getElementById('ticket-modal').classList.remove('active');
}

// Submit Handlers
async function handleTicketSubmit(e) {
  e.preventDefault();

  const ticketId = document.getElementById('ticket-id').value;
  const ratingValue = document.getElementById('ticket-rating').value;

  const body = {
    title: document.getElementById('ticket-title').value,
    description: document.getElementById('ticket-desc').value,
    customerName: document.getElementById('ticket-cust-name').value,
    customerEmail: document.getElementById('ticket-cust-email').value,
    priority: document.getElementById('ticket-priority').value,
    assignedEngineer: document.getElementById('ticket-engineer').value,
    status: document.getElementById('ticket-status').value,
    notes: document.getElementById('ticket-notes').value
  };

  if (body.status === 'Resolved' || body.status === 'Closed') {
    if (ratingValue) {
      body.satisfactionRating = parseInt(ratingValue);
    }
  }

  let result;
  if (ticketId) {
    result = await apiCall(`/tickets/${ticketId}`, 'PUT', body);
    if (result) showToast(`Ticket "${body.title}" updated successfully!`, 'success');
  } else {
    result = await apiCall('/tickets', 'POST', body);
    if (result) showToast(`New ticket "${body.title}" logged in.`, 'success');
  }

  if (result) {
    closeTicketModal();
    await fetchTickets();
  }
}

async function handleDeleteTicket(ticketId) {
  if (confirm('Are you sure you want to delete this support ticket?')) {
    const res = await apiCall(`/tickets/${ticketId}`, 'DELETE');
    if (res) {
      showToast('Support ticket deleted.', 'info');
      await fetchTickets();
    }
  }
}

// Generate helpdesk reports tables
function renderTicketsReports(csatAvg, resolvedCount, totalBreaches) {
  // 1. Engineer Workload & Metrics
  const engBody = document.getElementById('report-engineer-tickets');
  const engStats = {};
  const engineers = ['Hammad Account', 'Ehsan Khan Account'];
  
  engineers.forEach(eng => {
    engStats[eng] = { active: 0, resolved: 0, resolveTimeSum: 0, csatSum: 0, csatCount: 0 };
  });

  tickets.forEach(t => {
    const eng = t.assignedEngineer || 'Hammad Account';
    if (!engStats[eng]) {
      engStats[eng] = { active: 0, resolved: 0, resolveTimeSum: 0, csatSum: 0, csatCount: 0 };
    }

    if (t.status === 'Open' || t.status === 'In Progress') {
      engStats[eng].active++;
    } else if (t.status === 'Resolved' || t.status === 'Closed') {
      engStats[eng].resolved++;
      
      const created = new Date(t.createdDate);
      const finish = new Date(t.resolvedDate || t.closedDate || t.createdDate);
      const elapsed = (finish - created) / (1000 * 60 * 60);
      
      engStats[eng].resolveTimeSum += elapsed;
      
      if (t.satisfactionRating) {
        engStats[eng].csatSum += t.satisfactionRating;
        engStats[eng].csatCount++;
      }
    }
  });

  engBody.innerHTML = Object.entries(engStats).map(([eng, stats]) => {
    const avgTime = stats.resolved > 0 ? (stats.resolveTimeSum / stats.resolved).toFixed(1) : '0.0';
    const ratingAvg = stats.csatCount > 0 ? (stats.csatSum / stats.csatCount).toFixed(1) : '0.0';
    const ratingStars = stats.csatCount > 0 ? getCsatStarsHtml(Math.round(ratingAvg)) : 'No feedback';

    return `
      <tr>
        <td><strong>${eng.replace(' Account', '')}</strong></td>
        <td class="text-center"><span class="badge ${stats.active > 0 ? 'badge-log-payment' : 'badge-log-mock'}">${stats.active}</span></td>
        <td class="text-center">${stats.resolved}</td>
        <td class="text-right">${avgTime}h</td>
        <td class="text-center" style="line-height:1.2;">
          <div><strong>${ratingAvg}</strong></div>
          <div>${ratingStars}</div>
        </td>
      </tr>
    `;
  }).join('');

  // 2. SLA Compliance Summary
  const slaBody = document.getElementById('report-sla-compliance');
  const slaWindows = {
    'Critical': { hours: 4, resolves: 0, breaches: 0 },
    'High': { hours: 12, resolves: 0, breaches: 0 },
    'Medium': { hours: 24, resolves: 0, breaches: 0 },
    'Low': { hours: 72, resolves: 0, breaches: 0 }
  };

  tickets.forEach(t => {
    const pr = t.priority;
    if (slaWindows[pr]) {
      const created = new Date(t.createdDate);
      
      if (t.status === 'Resolved' || t.status === 'Closed') {
        slaWindows[pr].resolves++;
        const finish = new Date(t.resolvedDate || t.closedDate || t.createdDate);
        const elapsed = (finish - created) / (1000 * 60 * 60);
        if (elapsed > t.slaHours) {
          slaWindows[pr].breaches++;
        }
      }
    }
  });

  slaBody.innerHTML = Object.entries(slaWindows).map(([pr, stats]) => {
    const compliance = stats.resolves > 0 ? Math.round(((stats.resolves - stats.breaches) / stats.resolves) * 100) : 100;
    let badgeClass = 'badge-log-real';
    if (compliance < 80) badgeClass = 'badge-log-mock';
    
    return `
      <tr>
        <td><strong>${pr}</strong></td>
        <td class="text-center">${stats.hours}h</td>
        <td class="text-center">${stats.resolves}</td>
        <td class="text-center"><span style="color:${stats.breaches > 0 ? 'var(--state-danger)' : 'var(--state-success)'};">${stats.breaches}</span></td>
        <td class="text-center"><span class="badge ${badgeClass}">${compliance}%</span></td>
      </tr>
    `;
  }).join('');

  // 3. Customer Satisfaction Breakdown (Review scores share)
  const csatBody = document.getElementById('report-csat-breakdown');
  const ratings = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingCountTotal = 0;

  tickets.forEach(t => {
    if ((t.status === 'Resolved' || t.status === 'Closed') && t.satisfactionRating) {
      ratings[t.satisfactionRating]++;
      ratingCountTotal++;
    }
  });

  csatBody.innerHTML = [5, 4, 3, 2, 1].map(score => {
    const count = ratings[score];
    const share = ratingCountTotal > 0 ? Math.round((count / ratingCountTotal) * 100) : 0;
    const stars = getCsatStarsHtml(score);

    return `
      <tr>
        <td>${stars}</td>
        <td class="text-center"><strong>${count}</strong></td>
        <td class="text-center">${share}%</td>
        <td>
          <div class="csat-bar-bg">
            <div class="csat-bar-fill" style="width: ${share}%;"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // 4. Ticket Volume Trend
  const trendBody = document.getElementById('report-tickets-trend');
  const dateTrend = {};

  tickets.forEach(t => {
    const createdDate = t.createdDate ? t.createdDate.substring(0, 10) : '';
    if (!createdDate) return;
    
    if (!dateTrend[createdDate]) {
      dateTrend[createdDate] = { created: 0, resolved: 0, closed: 0 };
    }
    dateTrend[createdDate].created++;

    if (t.resolvedDate) {
      const resDate = t.resolvedDate.substring(0,10);
      if (!dateTrend[resDate]) dateTrend[resDate] = { created: 0, resolved: 0, closed: 0 };
      dateTrend[resDate].resolved++;
    }
    if (t.closedDate) {
      const clsDate = t.closedDate.substring(0,10);
      if (!dateTrend[clsDate]) dateTrend[clsDate] = { created: 0, resolved: 0, closed: 0 };
      dateTrend[clsDate].closed++;
    }
  });

  const sortedDates = Object.entries(dateTrend).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 7);
  if (sortedDates.length === 0) {
    trendBody.innerHTML = '<tr><td colspan="4" class="text-center">No trend logs.</td></tr>';
  } else {
    trendBody.innerHTML = sortedDates.map(([dateVal, stats]) => {
      const opt = { month: 'short', day: 'numeric' };
      const formatted = new Date(dateVal).toLocaleDateString('en-US', opt);
      return `
        <tr>
          <td><strong>${formatted}</strong></td>
          <td class="text-center" style="color: var(--accent-cyan); font-weight:600;">${stats.created}</td>
          <td class="text-center" style="color: var(--state-success);">${stats.resolved}</td>
          <td class="text-center" style="color: var(--color-text-muted);">${stats.closed}</td>
        </tr>
      `;
    }).join('');
  }
}

// Global exposure
window.openTicketModal = openTicketModal;
window.handleDeleteTicket = handleDeleteTicket;

// ==================== MODULES 3 & 4: ACCOUNTING & FINANCE LOGIC ====================

// Fetches
async function fetchAccounts() {
  const data = await apiCall('/accounts', 'GET');
  if (data) accounts = data;
}

async function fetchInvoices() {
  const data = await apiCall('/invoices', 'GET');
  if (data) invoices = data;
}

async function fetchExpenses() {
  const data = await apiCall('/expenses', 'GET');
  if (data) expenses = data;
}

async function fetchJournals() {
  const data = await apiCall('/journals', 'GET');
  if (data) journalEntries = data;
}

async function fetchReconciliation() {
  const data = await apiCall('/reconciliation', 'GET');
  if (data) bankStatements = data;
}

// Router for sub-tabs rendering
function renderAccountingSubTab() {
  if (activeAccountingTab === 'dashboard') {
    renderReconciliation();
    renderAccountingActivity();
  } else if (activeAccountingTab === 'invoices') {
    renderInvoices();
  } else if (activeAccountingTab === 'expenses') {
    renderExpenses();
  } else if (activeAccountingTab === 'journals') {
    renderJournals();
  } else if (activeAccountingTab === 'reports') {
    renderFinancialReports();
  } else if (activeAccountingTab === 'coa') {
    renderChartOfAccounts();
  } else if (activeAccountingTab === 'quickbooks') {
    renderQuickBooksSubTab();
  }
}

// Metrics Engine
function calculateAndRenderAccountingMetrics() {
  const simDateStr = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const simDate = new Date(simDateStr);
  const currentMonthPrefix = simDateStr.substring(0, 7); // e.g. "2026-06"
  
  // Helpers to filter by company
  const matchesCompany = (itemCompany) => {
    if (activeCompany === 'All') return true;
    return itemCompany === activeCompany;
  };

  // 1. Receivables & Overdue Counts
  let totalReceivables = 0;
  let overdueCount = 0;
  invoices.forEach(inv => {
    if (matchesCompany(inv.company)) {
      // Calculate active overdue status relative to simulated date
      let status = inv.status;
      if (status === 'Unpaid' && inv.dueDate < simDateStr) {
        status = 'Overdue';
        overdueCount++;
      }
      if (status === 'Unpaid' || status === 'Overdue') {
        totalReceivables += inv.total;
      }
    }
  });

  // 2. Payables
  let totalPayables = 0;
  expenses.forEach(exp => {
    if (matchesCompany(exp.company)) {
      if (exp.status === 'Unpaid') {
        totalPayables += exp.total;
      }
    }
  });

  // 3. True Double-Entry Bank Cash Balances
  // Opening Balance: Developers = £10,000, IT = £5,000
  let devBank = 10000.00;
  let itBank = 5000.00;
  
  journalEntries.forEach(je => {
    // We trace account codes 1000 (Developers Main Bank) and 1010 (IT Main Bank)
    je.lines.forEach(line => {
      if (line.accountCode === '1000') {
        devBank += (line.debit - line.credit);
      } else if (line.accountCode === '1010') {
        itBank += (line.debit - line.credit);
      }
    });
  });

  let cashPosition = 0;
  if (activeCompany === 'Pearls Developers Limited') {
    cashPosition = devBank;
  } else if (activeCompany === 'Pearls IT') {
    cashPosition = itBank;
  } else {
    cashPosition = devBank + itBank; // Consolidated
  }

  // 4. Monthly Net Profit
  // Derived from Revenues (code 4000) minus Expenses (code 5000 & 5100) inside current month prefix
  let monthlyRevenue = 0;
  let monthlyExpenses = 0;
  
  journalEntries.forEach(je => {
    if (matchesCompany(je.company) && je.date.startsWith(currentMonthPrefix)) {
      je.lines.forEach(line => {
        if (line.accountCode === '4000') {
          // Revenue is credited (+) and debited (-)
          monthlyRevenue += (line.credit - line.debit);
        } else if (line.accountCode === '5000' || line.accountCode === '5100') {
          // Expenses are debited (+) and credited (-)
          monthlyExpenses += (line.debit - line.credit);
        }
      });
    }
  });

  const netProfit = monthlyRevenue - monthlyExpenses;

  // Render metrics elements
  document.getElementById('acc-stat-receivables').textContent = `£${totalReceivables.toFixed(2)}`;
  document.getElementById('acc-stat-overdue-invoices').textContent = `${overdueCount} Overdue Invoice${overdueCount === 1 ? '' : 's'}`;
  document.getElementById('acc-stat-payables').textContent = `£${totalPayables.toFixed(2)}`;
  document.getElementById('acc-stat-unpaid-bills').textContent = `${expenses.filter(e => e.status === 'Unpaid' && matchesCompany(e.company)).length} Pending Bills`;
  document.getElementById('acc-stat-profit').textContent = `£${netProfit.toFixed(2)}`;
  
  const options = { month: 'long', year: 'numeric' };
  const formattedMonthLabel = new Date(simDate.getFullYear(), simDate.getMonth(), 1).toLocaleDateString('en-US', options);
  document.getElementById('acc-stat-monthly-label').textContent = `${formattedMonthLabel} Net Profit`;
  document.getElementById('acc-stat-cash').textContent = `£${cashPosition.toFixed(2)}`;
  
  if (activeCompany === 'All') {
    document.getElementById('acc-stat-bank-label').textContent = 'Consolidated Group Vault';
  } else {
    document.getElementById('acc-stat-bank-label').textContent = `${activeCompany.replace(' Limited', '')} Bank`;
  }
}

// Sub-Tab Renderer: Reconciliations
function renderReconciliation() {
  const container = document.getElementById('bank-reconciliation-list');
  container.innerHTML = '';
  
  const matchesCompany = (itemCompany) => {
    if (activeCompany === 'All') return true;
    return itemCompany === activeCompany;
  };
  
  const filteredStatements = bankStatements.filter(bs => matchesCompany(bs.company));
  
  if (filteredStatements.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="text-center">All bank statement lines are reconciled for this entity!</td></tr>`;
    return;
  }
  
  filteredStatements.forEach(line => {
    const tr = document.createElement('tr');
    
    let statusBadge = '<span class="badge badge-log-mock">UNRECONCILED</span>';
    let actionBtn = `<button class="btn btn-primary" style="padding: 4px 10px; font-size:11px;" onclick="handleMatchStatement('${line.id}')"><i class="fa-solid fa-check-double"></i> Match Auto</button>`;
    
    if (line.status === 'Reconciled') {
      statusBadge = '<span class="badge badge-log-payment">RECONCILED</span>';
      actionBtn = `<span class="text-muted" style="font-size:11px;"><i class="fa-solid fa-lock text-emerald"></i> Matched</span>`;
    }
    
    const amountClass = line.amount < 0 ? 'text-coral' : 'text-emerald';
    const amountPrefix = line.amount < 0 ? '-£' : '£';
    
    tr.innerHTML = `
      <td>${line.date}</td>
      <td><strong>${line.description}</strong><br><span style="font-size:10px; color:var(--color-text-muted);">${line.company}</span></td>
      <td class="text-right ${amountClass}" style="font-weight:600;">${amountPrefix}${Math.abs(line.amount).toFixed(2)}</td>
      <td class="text-center">${statusBadge}</td>
      <td class="text-center">${actionBtn}</td>
    `;
    container.appendChild(tr);
  });
}

// Sub-Tab Renderer: Recent Journal Activity log
function renderAccountingActivity() {
  const container = document.getElementById('acc-activity-logs');
  container.innerHTML = '';
  
  const matchesCompany = (itemCompany) => {
    if (activeCompany === 'All') return true;
    return itemCompany === activeCompany;
  };
  
  const filteredJEs = journalEntries.filter(je => matchesCompany(je.company)).slice(0, 10);
  
  if (filteredJEs.length === 0) {
    container.innerHTML = '<div class="empty-log-state">No transaction logs recorded yet.</div>';
    return;
  }
  
  filteredJEs.forEach(je => {
    const item = document.createElement('div');
    item.className = 'log-item';
    
    let totalDebit = 0;
    je.lines.forEach(l => totalDebit += l.debit);
    
    item.innerHTML = `
      <div class="log-title-row">
        <span>${je.description}</span>
        <span class="log-timestamp">${je.date}</span>
      </div>
      <div class="log-body-preview">Journal Reference: ${je.id} | Sum Debit/Credit: £${totalDebit.toFixed(2)}</div>
      <div class="log-meta-row">
        <span class="badge badge-log-real">${je.company.replace(' Limited', '')}</span>
        <span class="text-muted"><i class="fa-solid fa-circle-check text-emerald"></i> POSTED</span>
      </div>
    `;
    container.appendChild(item);
  });
}

// Sub-Tab Renderer: Invoices
function renderInvoices() {
  const container = document.getElementById('invoices-list-body');
  container.innerHTML = '';
  
  const searchVal = document.getElementById('invoices-search').value.toLowerCase().trim();
  const filterStatus = document.getElementById('invoices-filter-status').value;
  const simDateStr = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  
  const matchesCompany = (itemCompany) => {
    if (activeCompany === 'All') return true;
    return itemCompany === activeCompany;
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.customerName.toLowerCase().includes(searchVal) || inv.invoiceNumber.toLowerCase().includes(searchVal);
    
    let currentStatus = inv.status;
    if (currentStatus === 'Unpaid' && inv.dueDate < simDateStr) {
      currentStatus = 'Overdue';
    }
    
    const matchesStatus = filterStatus ? currentStatus === filterStatus : true;
    const matchesComp = matchesCompany(inv.company);
    
    return matchesSearch && matchesStatus && matchesComp;
  });

  if (filteredInvoices.length === 0) {
    container.innerHTML = `<tr><td colspan="8" class="text-center">No matching invoices found.</td></tr>`;
    return;
  }

  filteredInvoices.forEach(inv => {
    const tr = document.createElement('tr');
    
    let currentStatus = inv.status;
    let badgeClass = 'badge-active'; // Paid
    if (currentStatus === 'Unpaid') {
      if (inv.dueDate < simDateStr) {
        currentStatus = 'Overdue';
        badgeClass = 'badge-danger';
      } else {
        badgeClass = 'badge-warning';
      }
    }
    
    let actionsHtml = '';
    if (currentStatus === 'Paid') {
      actionsHtml = `<button class="btn btn-secondary btn-icon-delete" onclick="handleDeleteInvoice('${inv.id}')" title="Delete record"><i class="fa-solid fa-trash-can"></i></button>`;
    } else {
      actionsHtml = `
        <div style="display:flex; gap:6px; justify-content:center;">
          <button class="btn btn-primary" style="padding: 4px 8px; font-size:11px;" onclick="handlePayInvoice('${inv.id}', ${inv.total})"><i class="fa-solid fa-circle-check"></i> Pay</button>
          <button class="btn btn-secondary btn-icon-delete" onclick="handleDeleteInvoice('${inv.id}')" title="Delete record" style="padding:4px;"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
    }

    tr.innerHTML = `
      <td><strong>${inv.invoiceNumber}</strong></td>
      <td>${inv.customerName}</td>
      <td>${inv.date}</td>
      <td>${inv.dueDate}</td>
      <td><span style="font-size:11px; color:var(--color-text-muted);">${inv.company.replace(' Limited', '')}</span></td>
      <td class="text-right" style="font-weight:600;">£${inv.total.toFixed(2)}</td>
      <td class="text-center"><span class="sub-badge ${badgeClass}">${currentStatus}</span></td>
      <td class="text-center">${actionsHtml}</td>
    `;
    container.appendChild(tr);
  });
}

// Sub-Tab Renderer: Expenses
function renderExpenses() {
  const container = document.getElementById('expenses-list-body');
  container.innerHTML = '';
  
  const searchVal = document.getElementById('expenses-search').value.toLowerCase().trim();
  const filterCat = document.getElementById('expenses-filter-category').value;
  
  const matchesCompany = (itemCompany) => {
    if (activeCompany === 'All') return true;
    return itemCompany === activeCompany;
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.vendorName.toLowerCase().includes(searchVal) || exp.expenseNumber.toLowerCase().includes(searchVal);
    const matchesCategory = filterCat ? exp.category === filterCat : true;
    const matchesComp = matchesCompany(exp.company);
    return matchesSearch && matchesCategory && matchesComp;
  });

  if (filteredExpenses.length === 0) {
    container.innerHTML = `<tr><td colspan="8" class="text-center">No matching expenses found.</td></tr>`;
    return;
  }

  filteredExpenses.forEach(exp => {
    const tr = document.createElement('tr');
    
    let badgeClass = exp.status === 'Paid' ? 'badge-active' : 'badge-warning';
    
    let actionsHtml = '';
    if (exp.status === 'Paid') {
      actionsHtml = `<button class="btn btn-secondary btn-icon-delete" onclick="handleDeleteExpense('${exp.id}')" title="Delete record"><i class="fa-solid fa-trash-can"></i></button>`;
    } else {
      actionsHtml = `
        <div style="display:flex; gap:6px; justify-content:center;">
          <button class="btn btn-primary" style="padding: 4px 8px; font-size:11px;" onclick="handlePayExpense('${exp.id}', ${exp.total})"><i class="fa-solid fa-credit-card"></i> Pay</button>
          <button class="btn btn-secondary btn-icon-delete" onclick="handleDeleteExpense('${exp.id}')" title="Delete record" style="padding:4px;"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      `;
    }

    tr.innerHTML = `
      <td><strong>${exp.expenseNumber}</strong></td>
      <td>${exp.vendorName}</td>
      <td><span class="category-badge">${exp.category}</span></td>
      <td>${exp.date}</td>
      <td>${exp.dueDate}</td>
      <td><span style="font-size:11px; color:var(--color-text-muted);">${exp.company.replace(' Limited', '')}</span></td>
      <td class="text-right" style="font-weight:600;">£${exp.total.toFixed(2)}</td>
      <td class="text-center"><span class="sub-badge ${badgeClass}">${exp.status}</span></td>
      <td class="text-center">${actionsHtml}</td>
    `;
    container.appendChild(tr);
  });
}

// Sub-Tab Renderer: Journals
function renderJournals() {
  const container = document.getElementById('journals-list-body');
  container.innerHTML = '';
  
  const matchesCompany = (itemCompany) => {
    if (activeCompany === 'All') return true;
    return itemCompany === activeCompany;
  };

  const filteredJEs = journalEntries.filter(je => matchesCompany(je.company));

  if (filteredJEs.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="text-center">No journal logs logged.</td></tr>`;
    return;
  }

  filteredJEs.forEach(je => {
    // Each Journal Entry can have multiple lines
    je.lines.forEach((line, lineIdx) => {
      const tr = document.createElement('tr');
      
      const acc = accounts.find(a => a.code === line.accountCode);
      const accName = acc ? `${acc.name} (${line.accountCode})` : `Account ${line.accountCode}`;
      
      const debitText = line.debit > 0 ? `£${line.debit.toFixed(2)}` : '--';
      const creditText = line.credit > 0 ? `£${line.credit.toFixed(2)}` : '--';
      
      // We only display date, description, company on the first line row, grouping them nicely
      if (lineIdx === 0) {
        tr.innerHTML = `
          <td rowspan="${je.lines.length}" style="vertical-align: top; font-weight:600;">${je.date}</td>
          <td rowspan="${je.lines.length}" style="vertical-align: top;">
            <strong>${je.description}</strong><br>
            <span style="font-size:10px; color:var(--color-text-muted);">Ref ID: ${je.id}</span>
          </td>
          <td rowspan="${je.lines.length}" style="vertical-align: top; font-size:11px; color:var(--color-text-muted);">${je.company.replace(' Limited', '')}</td>
          <td>${accName}</td>
          <td class="text-right font-bold text-cyan">${debitText}</td>
          <td class="text-right font-bold text-purple">${creditText}</td>
        `;
      } else {
        tr.innerHTML = `
          <td>${accName}</td>
          <td class="text-right font-bold text-cyan">${debitText}</td>
          <td class="text-right font-bold text-purple">${creditText}</td>
        `;
      }
      container.appendChild(tr);
    });
  });
}

// Sub-Tab Renderer: Chart of Accounts
function renderChartOfAccounts() {
  const container = document.getElementById('coa-list-body');
  container.innerHTML = '';
  
  accounts.forEach(acc => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${acc.code}</strong></td>
      <td><strong>${acc.name}</strong></td>
      <td><span class="badge badge-log-real">${acc.type}</span></td>
      <td><span class="badge badge-log-mock">${acc.company}</span></td>
    `;
    container.appendChild(tr);
  });
}

// Sub-Tab Renderer: Financial Reports
function renderFinancialReports() {
  const simDateStr = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const simDate = new Date(simDateStr);
  
  const options = { month: 'long', year: 'numeric' };
  const formattedMonthLabel = new Date(simDate.getFullYear(), simDate.getMonth(), 1).toLocaleDateString('en-US', options);
  
  const compLabel = activeCompany === 'All' ? 'All Group Consolidated' : activeCompany;
  
  document.getElementById('report-pl-company').textContent = compLabel;
  document.getElementById('report-pl-date').textContent = `For Month Ended ${formattedMonthLabel} (Simulated Date: ${simDateStr})`;
  
  document.getElementById('report-bs-company').textContent = compLabel;
  document.getElementById('report-bs-date').textContent = `As of ${simDateStr}`;

  document.getElementById('report-cf-company').textContent = compLabel;
  document.getElementById('report-cf-date').textContent = `Statement Period: Month Ended ${formattedMonthLabel}`;

  document.getElementById('report-aged-company').textContent = compLabel;
  document.getElementById('report-aged-date').textContent = `Outstanding Invoices aged relative to ${simDateStr}`;

  document.getElementById('report-tb-company').textContent = compLabel;
  document.getElementById('report-tb-date').textContent = `Balance audit as of ${simDateStr}`;

  // Filter helper
  const matchesCompany = (itemCompany) => {
    if (activeCompany === 'All') return true;
    return itemCompany === activeCompany;
  };

  const currentMonthPrefix = simDateStr.substring(0, 7);

  // 1. PROFIT AND LOSS STATEMENT
  let salesRevenue = 0;
  let hostingExpense = 0;
  let generalExpense = 0;

  journalEntries.forEach(je => {
    if (matchesCompany(je.company) && je.date.startsWith(currentMonthPrefix)) {
      je.lines.forEach(l => {
        if (l.accountCode === '4000') salesRevenue += (l.credit - l.debit);
        if (l.accountCode === '5000') hostingExpense += (l.debit - l.credit);
        if (l.accountCode === '5100') generalExpense += (l.debit - l.credit);
      });
    }
  });

  const totalExpense = hostingExpense + generalExpense;
  const netIncome = salesRevenue - totalExpense;

  const plBody = document.getElementById('report-pl-body');
  plBody.innerHTML = `
    <tr style="font-weight: 700; border-bottom: 2px solid rgba(255,255,255,0.06); font-size:14px; color:#fff;">
      <td>Revenue</td>
      <td></td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Sales Services Revenue (4000)</td>
      <td class="text-right">£${salesRevenue.toFixed(2)}</td>
    </tr>
    <tr style="font-weight: 600; background: rgba(255,255,255,0.02);">
      <td>Total Operating Revenue</td>
      <td class="text-right" style="border-top:1px solid #fff; border-bottom:1px solid #fff;">£${salesRevenue.toFixed(2)}</td>
    </tr>
    <tr><td colspan="2">&nbsp;</td></tr>
    <tr style="font-weight: 700; border-bottom: 2px solid rgba(255,255,255,0.06); font-size:14px; color:#fff;">
      <td>Operating Expenses</td>
      <td></td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Hosting & Software Licensing (5000)</td>
      <td class="text-right">£${hostingExpense.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">General & Administrative (5100)</td>
      <td class="text-right">£${generalExpense.toFixed(2)}</td>
    </tr>
    <tr style="font-weight: 600; background: rgba(255,255,255,0.02);">
      <td>Total Expenses</td>
      <td class="text-right" style="border-top:1px solid #fff; border-bottom:1px solid #fff;">£${totalExpense.toFixed(2)}</td>
    </tr>
    <tr><td colspan="2">&nbsp;</td></tr>
    <tr style="font-weight: 800; font-size: 16px; color: var(--accent-cyan); background: rgba(99,102,241,0.08);">
      <td>NET OPERATING INCOME</td>
      <td class="text-right" style="border-top: 1px solid #fff; border-bottom: 3px double #fff; font-family: var(--font-display);">£${netIncome.toFixed(2)}</td>
    </tr>
  `;

  // 2. BALANCE SHEET (Assets = Liabilities + Equity)
  // Assets: Main Bank (1000/1010) + Receivables (1200)
  // Liabilities: Payables (2000) + VAT Payable (2200)
  // Equity: Retained Earnings (3000) + Net Profit (current month netIncome)
  let bankDevBal = 10000.00;
  let bankItBal = 5000.00;
  let arBal = 0;
  let apBal = 0;
  let vatBal = 0;
  let reBal = 0;

  journalEntries.forEach(je => {
    je.lines.forEach(l => {
      if (l.accountCode === '1000') bankDevBal += (l.debit - l.credit);
      if (l.accountCode === '1010') bankItBal += (l.debit - l.credit);
      
      // Balance sheet balances are cumulative across all time up to simulated date, but since we mock, let's filter before simulated date
      if (je.date <= simDateStr) {
        if (l.accountCode === '1200') arBal += (l.debit - l.credit);
        if (l.accountCode === '2000') apBal += (l.credit - l.debit);
        if (l.accountCode === '2200') vatBal += (l.credit - l.debit);
        if (l.accountCode === '3000') reBal += (l.credit - l.debit);
      }
    });
  });

  let selectedBankBal = 0;
  if (activeCompany === 'Pearls Developers Limited') {
    selectedBankBal = bankDevBal;
  } else if (activeCompany === 'Pearls IT') {
    selectedBankBal = bankItBal;
  } else {
    selectedBankBal = bankDevBal + bankItBal;
  }

  // To build independent balance sheets, map values matching company:
  if (activeCompany !== 'All') {
    // Group JEs specifically by company for AR, AP, VAT
    arBal = 0; apBal = 0; vatBal = 0; reBal = 0;
    journalEntries.forEach(je => {
      if (je.company === activeCompany && je.date <= simDateStr) {
        je.lines.forEach(l => {
          if (l.accountCode === '1200') arBal += (l.debit - l.credit);
          if (l.accountCode === '2000') apBal += (l.credit - l.debit);
          if (l.accountCode === '2200') vatBal += (l.credit - l.debit);
          if (l.accountCode === '3000') reBal += (l.credit - l.debit);
        });
      }
    });
  }

  const totalAssets = selectedBankBal + arBal;
  const totalLiabilities = apBal + vatBal;
  
  // Equity retained earnings carries P&L
  const currentRetainedEarnings = reBal + netIncome;
  const totalEquity = currentRetainedEarnings;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const bsBody = document.getElementById('report-bs-body');
  bsBody.innerHTML = `
    <tr style="font-weight: 700; border-bottom: 2px solid rgba(255,255,255,0.06); font-size:14px; color:#fff;">
      <td>ASSETS</td>
      <td></td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Cash & Cash Equivalents (Bank)</td>
      <td class="text-right">£${selectedBankBal.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Accounts Receivable (1200)</td>
      <td class="text-right">£${arBal.toFixed(2)}</td>
    </tr>
    <tr style="font-weight: 700; background: rgba(255,255,255,0.02);">
      <td>TOTAL ASSETS</td>
      <td class="text-right" style="border-top:1px solid #fff; border-bottom:3px double #fff; color:var(--accent-cyan);">£${totalAssets.toFixed(2)}</td>
    </tr>
    <tr><td colspan="2">&nbsp;</td></tr>
    <tr style="font-weight: 700; border-bottom: 2px solid rgba(255,255,255,0.06); font-size:14px; color:#fff;">
      <td>LIABILITIES</td>
      <td></td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Accounts Payable (2000)</td>
      <td class="text-right">£${apBal.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">VAT & Tax Liability (2200)</td>
      <td class="text-right">£${vatBal.toFixed(2)}</td>
    </tr>
    <tr style="font-weight: 600; background: rgba(255,255,255,0.02);">
      <td>TOTAL LIABILITIES</td>
      <td class="text-right" style="border-top:1px solid #fff; border-bottom:1px solid #fff;">£${totalLiabilities.toFixed(2)}</td>
    </tr>
    <tr><td colspan="2">&nbsp;</td></tr>
    <tr style="font-weight: 700; border-bottom: 2px solid rgba(255,255,255,0.06); font-size:14px; color:#fff;">
      <td>EQUITY</td>
      <td></td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Retained Earnings</td>
      <td class="text-right">£${currentRetainedEarnings.toFixed(2)}</td>
    </tr>
    <tr style="font-weight: 600; background: rgba(255,255,255,0.02);">
      <td>TOTAL EQUITY</td>
      <td class="text-right" style="border-top:1px solid #fff; border-bottom:1px solid #fff;">£${totalEquity.toFixed(2)}</td>
    </tr>
    <tr><td colspan="2">&nbsp;</td></tr>
    <tr style="font-weight: 800; font-size: 15px; color: var(--state-success); background: rgba(16,185,129,0.08);">
      <td>TOTAL LIABILITIES & EQUITY</td>
      <td class="text-right" style="border-top: 1px solid #fff; border-bottom: 3px double #fff; font-family: var(--font-display);">£${totalLiabilitiesAndEquity.toFixed(2)}</td>
    </tr>
  `;

  // 3. TRIAL BALANCE
  const tbBody = document.getElementById('report-tb-body');
  tbBody.innerHTML = '';
  
  let tbTotalDebit = 0;
  let tbTotalCredit = 0;
  
  // Calculate balances line grouped by account code
  const accountsBalances = {};
  accounts.forEach(acc => {
    accountsBalances[acc.code] = { debit: 0, credit: 0, name: acc.name, type: acc.type };
  });
  
  journalEntries.forEach(je => {
    if (matchesCompany(je.company) && je.date <= simDateStr) {
      je.lines.forEach(l => {
        if (accountsBalances[l.accountCode]) {
          accountsBalances[l.accountCode].debit += l.debit;
          accountsBalances[l.accountCode].credit += l.credit;
        }
      });
    }
  });

  // Render Trial Balance rows
  Object.entries(accountsBalances).forEach(([code, data]) => {
    // Add opening balances mock for banks if not tracked in journals
    let codeDebit = data.debit;
    let codeCredit = data.credit;
    if (code === '1000' && (activeCompany === 'All' || activeCompany === 'Pearls Developers Limited')) {
      codeDebit += 10000.00;
    }
    if (code === '1010' && (activeCompany === 'All' || activeCompany === 'Pearls IT')) {
      codeDebit += 5000.00;
    }
    
    // Debit credit net
    let finalDebit = 0;
    let finalCredit = 0;
    if (data.type === 'Asset' || data.type === 'Expense') {
      const net = codeDebit - codeCredit;
      if (net > 0) finalDebit = net;
      else if (net < 0) finalCredit = Math.abs(net);
    } else {
      const net = codeCredit - codeDebit;
      if (net > 0) finalCredit = net;
      else if (net < 0) finalDebit = Math.abs(net);
    }

    if (finalDebit === 0 && finalCredit === 0) return; // Skip zero balance accounts

    tbTotalDebit += finalDebit;
    tbTotalCredit += finalCredit;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${code}</strong></td>
      <td>${data.name}</td>
      <td><span class="badge badge-log-mock">${data.type}</span></td>
      <td class="text-right text-cyan font-bold">£${finalDebit.toFixed(2)}</td>
      <td class="text-right text-purple font-bold">£${finalCredit.toFixed(2)}</td>
    `;
    tbBody.appendChild(tr);
  });

  document.getElementById('report-tb-total-debit').textContent = `£${tbTotalDebit.toFixed(2)}`;
  document.getElementById('report-tb-total-credit').textContent = `£${tbTotalCredit.toFixed(2)}`;

  // 4. CASH FLOW STATEMENT
  let customerReceipts = 0;
  let vendorPayments = 0;

  journalEntries.forEach(je => {
    if (matchesCompany(je.company) && je.date.startsWith(currentMonthPrefix)) {
      if (je.referenceType === 'InvoicePayment') {
        je.lines.forEach(l => {
          if (l.accountCode === '1000' || l.accountCode === '1010') {
            customerReceipts += l.debit;
          }
        });
      }
      if (je.referenceType === 'ExpensePayment') {
        je.lines.forEach(l => {
          if (l.accountCode === '1000' || l.accountCode === '1010') {
            vendorPayments += l.credit;
          }
        });
      }
    }
  });

  const netCashFlow = customerReceipts - vendorPayments;
  
  // Calculate starting cash balance for the month
  let monthlyStartingCash = 0;
  const currentMonthStart = currentMonthPrefix + '-01';
  
  let totalStartingCash = 0;
  if (activeCompany === 'Pearls Developers Limited') totalStartingCash += 10000;
  if (activeCompany === 'Pearls IT') totalStartingCash += 5000;
  if (activeCompany === 'All') totalStartingCash += 15000;

  journalEntries.forEach(je => {
    if (matchesCompany(je.company) && je.date < currentMonthStart) {
      je.lines.forEach(l => {
        if (l.accountCode === '1000' || l.accountCode === '1010') {
          totalStartingCash += (l.debit - l.credit);
        }
      });
    }
  });
  monthlyStartingCash = totalStartingCash;
  const endingCash = monthlyStartingCash + netCashFlow;

  const cfBody = document.getElementById('report-cf-body');
  cfBody.innerHTML = `
    <tr style="font-weight: 700; border-bottom: 2px solid rgba(255,255,255,0.06); font-size:14px; color:#fff;">
      <td>Cash Flows from Operating Activities</td>
      <td></td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Cash receipts from Customers (Invoices)</td>
      <td class="text-right text-emerald">£${customerReceipts.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Cash payments to Vendors (Expenses)</td>
      <td class="text-right text-coral">-£${vendorPayments.toFixed(2)}</td>
    </tr>
    <tr style="font-weight: 600; background: rgba(255,255,255,0.02);">
      <td>Net Cash from Operating Activities</td>
      <td class="text-right" style="border-top:1px solid #fff; border-bottom:1px solid #fff;">£${netCashFlow.toFixed(2)}</td>
    </tr>
    <tr><td colspan="2">&nbsp;</td></tr>
    <tr style="font-weight: 700; border-bottom: 2px solid rgba(255,255,255,0.06); font-size:14px; color:#fff;">
      <td>Cash Balance Summary</td>
      <td></td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Beginning Cash Balance (Start of Month)</td>
      <td class="text-right">£${monthlyStartingCash.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="padding-left: 20px;">Net Change in Cash (This Month)</td>
      <td class="text-right" style="color:${netCashFlow >= 0 ? 'var(--state-success)' : 'var(--state-danger)'};">${netCashFlow >= 0 ? '+' : ''}£${netCashFlow.toFixed(2)}</td>
    </tr>
    <tr style="font-weight: 800; font-size: 15px; color: var(--accent-purple); background: rgba(139,92,246,0.08);">
      <td>Ending Cash Balance (End of Month)</td>
      <td class="text-right" style="border-top: 1px solid #fff; border-bottom: 3px double #fff; font-family: var(--font-display);">£${endingCash.toFixed(2)}</td>
    </tr>
  `;

  // 5. AGED DEBTORS
  const agedBody = document.getElementById('report-aged-body');
  agedBody.innerHTML = '';
  
  const debtors = {};

  invoices.forEach(inv => {
    if (matchesCompany(inv.company) && (inv.status === 'Unpaid' || (inv.status === 'Paid' && inv.paymentDate > simDateStr))) {
      const customer = inv.customerName;
      if (!debtors[customer]) {
        debtors[customer] = { current: 0, class30: 0, class60: 0, class90: 0, classOver90: 0, total: 0 };
      }
      
      // Calculate age relative to simulated date
      const due = new Date(inv.dueDate);
      const elapsedDays = Math.round((simDate - due) / (1000 * 60 * 60 * 24));
      
      const invTotal = inv.total;
      debtors[customer].total += invTotal;

      if (elapsedDays <= 0) {
        debtors[customer].current += invTotal;
      } else if (elapsedDays <= 30) {
        debtors[customer].class30 += invTotal;
      } else if (elapsedDays <= 60) {
        debtors[customer].class60 += invTotal;
      } else if (elapsedDays <= 90) {
        debtors[customer].class90 += invTotal;
      } else {
        debtors[customer].classOver90 += invTotal;
      }
    }
  });

  const sortedDebtors = Object.entries(debtors);
  if (sortedDebtors.length === 0) {
    agedBody.innerHTML = '<tr><td colspan="7" class="text-center">No outstanding debts recorded. All invoices paid!</td></tr>';
  } else {
    sortedDebtors.forEach(([customer, data]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${customer}</strong></td>
        <td class="text-right">£${data.current.toFixed(2)}</td>
        <td class="text-right text-cyan">£${data.class30.toFixed(2)}</td>
        <td class="text-right text-purple">£${data.class60.toFixed(2)}</td>
        <td class="text-right text-amber">£${data.class90.toFixed(2)}</td>
        <td class="text-right text-coral">£${data.classOver90.toFixed(2)}</td>
        <td class="text-right font-bold text-white">£${data.total.toFixed(2)}</td>
      `;
      agedBody.appendChild(tr);
    });
  }
}

// Modals Handler Operations
function openInvoiceModal() {
  const modal = document.getElementById('invoice-modal');
  document.getElementById('invoice-form').reset();
  document.getElementById('invoice-id').value = '';
  document.getElementById('invoice-items-container').innerHTML = `
    <div class="invoice-item-row" style="display: grid; grid-template-columns: 2fr 1fr 1.2fr 1fr; gap: 8px;">
      <input type="text" placeholder="Description" class="item-desc" required value="Software Development Services">
      <input type="number" placeholder="Qty" class="item-qty" min="1" step="1" required value="1" style="text-align: center;">
      <input type="number" placeholder="Unit Price" class="item-price" min="0" step="0.01" required value="1000.00">
      <select class="item-vat">
        <option value="20" selected>20% VAT</option>
        <option value="5">5% VAT</option>
        <option value="0">0% VAT</option>
      </select>
    </div>
  `;
  
  // Re-bind change listeners
  document.querySelectorAll('.invoice-item-row input, .invoice-item-row select').forEach(el => {
    el.addEventListener('input', () => {
      const rows = document.querySelectorAll('.invoice-item-row');
      let subtotal = 0; let vat = 0;
      rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const vatRate = parseFloat(row.querySelector('.item-vat').value) || 0;
        const rowSub = qty * price;
        subtotal += rowSub;
        vat += (rowSub * vatRate) / 100;
      });
      document.getElementById('invoice-preview-subtotal').textContent = `£${subtotal.toFixed(2)}`;
      document.getElementById('invoice-preview-vat').textContent = `£${vat.toFixed(2)}`;
      document.getElementById('invoice-preview-total').textContent = `£${(subtotal + vat).toFixed(2)}`;
    });
  });

  const today = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  document.getElementById('invoice-date').value = today;
  
  const due = new Date(today);
  due.setDate(due.getDate() + 14); // 14 days payment term by default
  document.getElementById('invoice-due-date').value = due.toISOString().substring(0,10);
  
  // Update totals initial
  document.getElementById('invoice-preview-subtotal').textContent = '£1000.00';
  document.getElementById('invoice-preview-vat').textContent = '£200.00';
  document.getElementById('invoice-preview-total').textContent = '£1200.00';

  modal.classList.add('active');
}

function closeInvoiceModal() {
  document.getElementById('invoice-modal').classList.remove('active');
}

async function handleInvoiceSubmit(e) {
  e.preventDefault();
  
  const items = [];
  document.querySelectorAll('.invoice-item-row').forEach(row => {
    items.push({
      description: row.querySelector('.item-desc').value,
      qty: parseFloat(row.querySelector('.item-qty').value) || 1,
      unitPrice: parseFloat(row.querySelector('.item-price').value) || 0,
      vatRate: parseFloat(row.querySelector('.item-vat').value) || 0
    });
  });

  const body = {
    company: document.getElementById('invoice-company').value,
    customerName: document.getElementById('invoice-cust-name').value,
    customerEmail: document.getElementById('invoice-cust-email').value,
    date: document.getElementById('invoice-date').value,
    dueDate: document.getElementById('invoice-due-date').value,
    items: items
  };

  const res = await apiCall('/invoices', 'POST', body);
  if (res) {
    showToast(`Invoice ${res.invoiceNumber} created and posted to general ledger.`, 'success');
    closeInvoiceModal();
    
    await fetchInvoices();
    await fetchJournals();
    
    calculateAndRenderAccountingMetrics();
    renderAccountingSubTab();
  }
}

async function handleDeleteInvoice(id) {
  if (confirm('Are you sure you want to delete this invoice and its ledger logs?')) {
    const res = await apiCall(`/invoices/${id}`, 'DELETE');
    if (res) {
      showToast('Invoice deleted.', 'info');
      await fetchInvoices();
      await fetchJournals();
      calculateAndRenderAccountingMetrics();
      renderAccountingSubTab();
    }
  }
}

function openExpenseModal() {
  const modal = document.getElementById('expense-modal');
  document.getElementById('expense-form').reset();
  document.getElementById('expense-id').value = '';
  document.getElementById('expense-items-container').innerHTML = `
    <div class="expense-item-row" style="display: grid; grid-template-columns: 2fr 1fr 1.2fr 1fr; gap: 8px;">
      <input type="text" placeholder="Description" class="exp-item-desc" required value="Server Hosting Licence">
      <input type="number" placeholder="Qty" class="exp-item-qty" min="1" step="1" required value="1" style="text-align: center;">
      <input type="number" placeholder="Unit Price" class="exp-item-price" min="0" step="0.01" required value="150.00">
      <select class="exp-item-vat">
        <option value="20" selected>20% VAT</option>
        <option value="5">5% VAT</option>
        <option value="0">0% VAT</option>
      </select>
    </div>
  `;

  // Re-bind change listeners
  document.querySelectorAll('.expense-item-row input, .expense-item-row select').forEach(el => {
    el.addEventListener('input', () => {
      const rows = document.querySelectorAll('.expense-item-row');
      let subtotal = 0; let vat = 0;
      rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.exp-item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.exp-item-price').value) || 0;
        const vatRate = parseFloat(row.querySelector('.exp-item-vat').value) || 0;
        const rowSub = qty * price;
        subtotal += rowSub;
        vat += (rowSub * vatRate) / 100;
      });
      document.getElementById('expense-preview-subtotal').textContent = `£${subtotal.toFixed(2)}`;
      document.getElementById('expense-preview-vat').textContent = `£${vat.toFixed(2)}`;
      document.getElementById('expense-preview-total').textContent = `£${(subtotal + vat).toFixed(2)}`;
    });
  });

  const today = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  document.getElementById('expense-date').value = today;
  
  const due = new Date(today);
  due.setDate(due.getDate() + 30); // 30 days due
  document.getElementById('expense-due-date').value = due.toISOString().substring(0,10);
  
  document.getElementById('expense-preview-subtotal').textContent = '£150.00';
  document.getElementById('expense-preview-vat').textContent = '£30.00';
  document.getElementById('expense-preview-total').textContent = '£180.00';

  modal.classList.add('active');
}

function closeExpenseModal() {
  document.getElementById('expense-modal').classList.remove('active');
}

async function handleExpenseSubmit(e) {
  e.preventDefault();
  
  const items = [];
  document.querySelectorAll('.expense-item-row').forEach(row => {
    items.push({
      description: row.querySelector('.exp-item-desc').value,
      qty: parseFloat(row.querySelector('.exp-item-qty').value) || 1,
      unitPrice: parseFloat(row.querySelector('.exp-item-price').value) || 0,
      vatRate: parseFloat(row.querySelector('.exp-item-vat').value) || 0
    });
  });

  const body = {
    company: document.getElementById('expense-company').value,
    category: document.getElementById('expense-category').value,
    vendorName: document.getElementById('expense-vendor-name').value,
    date: document.getElementById('expense-date').value,
    dueDate: document.getElementById('expense-due-date').value,
    items: items
  };

  const res = await apiCall('/expenses', 'POST', body);
  if (res) {
    showToast(`Expense bill ${res.expenseNumber} logged successfully.`, 'success');
    closeExpenseModal();
    
    await fetchExpenses();
    await fetchJournals();
    
    calculateAndRenderAccountingMetrics();
    renderAccountingSubTab();
  }
}

async function handleDeleteExpense(id) {
  if (confirm('Are you sure you want to delete this expense and its general ledger records?')) {
    const res = await apiCall(`/expenses/${id}`, 'DELETE');
    if (res) {
      showToast('Expense bill deleted.', 'info');
      await fetchExpenses();
      await fetchJournals();
      calculateAndRenderAccountingMetrics();
      renderAccountingSubTab();
    }
  }
}

// Payment Launcher
function handlePayInvoice(id, total) {
  const modal = document.getElementById('payment-modal');
  
  document.getElementById('payment-ref-id').value = id;
  document.getElementById('payment-ref-type').value = 'Invoice';
  document.getElementById('payment-ref-label').textContent = 'Receive Invoice payment amount:';
  document.getElementById('payment-amount-label').textContent = `£${total.toFixed(2)}`;
  
  document.getElementById('payment-date').value = systemStatus.simulatedDate || new Date().toISOString().substring(0,10);
  
  modal.classList.add('active');
}

function handlePayExpense(id, total) {
  const modal = document.getElementById('payment-modal');
  
  document.getElementById('payment-ref-id').value = id;
  document.getElementById('payment-ref-type').value = 'Expense';
  document.getElementById('payment-ref-label').textContent = 'Confirm Pay Vendor Bill Amount:';
  document.getElementById('payment-amount-label').textContent = `£${total.toFixed(2)}`;
  
  document.getElementById('payment-date').value = systemStatus.simulatedDate || new Date().toISOString().substring(0,10);
  
  modal.classList.add('active');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.remove('active');
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('payment-ref-id').value;
  const type = document.getElementById('payment-ref-type').value;
  const payDate = document.getElementById('payment-date').value;

  const endpoint = type === 'Invoice' ? `/invoices/${id}/pay` : `/expenses/${id}/pay`;
  
  const res = await apiCall(endpoint, 'POST', { paymentDate: payDate });
  if (res) {
    showToast('Payment recorded successfully.', 'success');
    closePaymentModal();
    
    if (type === 'Invoice') {
      await fetchInvoices();
    } else {
      await fetchExpenses();
    }
    await fetchJournals();
    await fetchReconciliation();
    
    calculateAndRenderAccountingMetrics();
    renderAccountingSubTab();
  }
}

// Journal Entry Modal
function openJournalModal() {
  const modal = document.getElementById('journal-modal');
  document.getElementById('journal-form').reset();
  
  document.getElementById('journal-lines-container').innerHTML = `
    <!-- Line 1 -->
    <div class="journal-line-row" style="display: grid; grid-template-columns: 2.2fr 1fr 1fr; gap: 8px;">
      <select class="line-account" required>
        <option value="1000">Main Bank Account (Developers) (1000)</option>
        <option value="1010">Main Bank Account (IT) (1010)</option>
        <option value="1200" selected>Accounts Receivable (Debtors) (1200)</option>
        <option value="2000">Accounts Payable (Creditors) (2000)</option>
        <option value="2200">VAT/Tax Payable (2200)</option>
        <option value="3000">Retained Earnings (3000)</option>
        <option value="4000">Sales Services Revenue (4000)</option>
        <option value="5000">Hosting & Software Expense (5000)</option>
        <option value="5100">General & Admin Expense (5100)</option>
      </select>
      <input type="number" placeholder="Debit (£)" class="line-debit" min="0" step="0.01" value="0.00">
      <input type="number" placeholder="Credit (£)" class="line-credit" min="0" step="0.01" value="0.00">
    </div>
    <!-- Line 2 -->
    <div class="journal-line-row" style="display: grid; grid-template-columns: 2.2fr 1fr 1fr; gap: 8px;">
      <select class="line-account" required>
        <option value="1000">Main Bank Account (Developers) (1000)</option>
        <option value="1010">Main Bank Account (IT) (1010)</option>
        <option value="1200">Accounts Receivable (Debtors) (1200)</option>
        <option value="2000">Accounts Payable (Creditors) (2000)</option>
        <option value="2200">VAT/Tax Payable (2200)</option>
        <option value="3000">Retained Earnings (3000)</option>
        <option value="4000" selected>Sales Services Revenue (4000)</option>
        <option value="5000">Hosting & Software Expense (5000)</option>
        <option value="5100">General & Admin Expense (5100)</option>
      </select>
      <input type="number" placeholder="Debit (£)" class="line-debit" min="0" step="0.01" value="0.00">
      <input type="number" placeholder="Credit (£)" class="line-credit" min="0" step="0.01" value="0.00">
    </div>
  `;

  // Bind keyup listeners
  const checkJournalBalance = () => {
    const rows = document.querySelectorAll('.journal-line-row');
    let debitTotal = 0; let creditTotal = 0;
    rows.forEach(row => {
      debitTotal += parseFloat(row.querySelector('.line-debit').value) || 0;
      creditTotal += parseFloat(row.querySelector('.line-credit').value) || 0;
    });
    
    document.getElementById('journal-total-debits').textContent = `£${debitTotal.toFixed(2)}`;
    document.getElementById('journal-total-credits').textContent = `£${creditTotal.toFixed(2)}`;
    
    const warn = document.getElementById('journal-balance-warning');
    const submit = document.getElementById('btn-submit-journal');
    if (Math.abs(debitTotal - creditTotal) <= 0.01 && debitTotal > 0) {
      warn.style.display = 'none';
      submit.disabled = false;
    } else {
      warn.style.display = 'block';
      submit.disabled = true;
    }
  };

  document.querySelectorAll('.journal-line-row input').forEach(el => {
    el.addEventListener('input', checkJournalBalance);
  });

  const today = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  document.getElementById('journal-date').value = today;

  document.getElementById('journal-total-debits').textContent = '£0.00';
  document.getElementById('journal-total-credits').textContent = '£0.00';
  document.getElementById('journal-balance-warning').style.display = 'block';
  document.getElementById('btn-submit-journal').disabled = true;

  modal.classList.add('active');
}

function closeJournalModal() {
  document.getElementById('journal-modal').classList.remove('active');
}

async function handleJournalSubmit(e) {
  e.preventDefault();
  
  const lines = [];
  document.querySelectorAll('.journal-line-row').forEach(row => {
    lines.push({
      accountCode: row.querySelector('.line-account').value,
      debit: parseFloat(row.querySelector('.line-debit').value) || 0,
      credit: parseFloat(row.querySelector('.line-credit').value) || 0
    });
  });

  const body = {
    date: document.getElementById('journal-date').value,
    company: document.getElementById('journal-company').value,
    description: document.getElementById('journal-desc').value,
    lines: lines
  };

  const res = await apiCall('/journals', 'POST', body);
  if (res) {
    showToast('Manual journal entry posted successfully.', 'success');
    closeJournalModal();
    
    await fetchJournals();
    calculateAndRenderAccountingMetrics();
    renderAccountingSubTab();
  }
}

// Matching statement row
async function handleMatchStatement(statementId) {
  // Call match endpoint with matched statement
  const res = await apiCall('/reconciliation/match', 'POST', { statementId: statementId });
  if (res) {
    showToast('Statement item reconciled and matching lock applied.', 'success');
    await fetchReconciliation();
    renderReconciliation();
  }
}

// Global Exports
window.handlePayInvoice = handlePayInvoice;
window.handlePayExpense = handlePayExpense;
window.handleDeleteInvoice = handleDeleteInvoice;
window.handleDeleteExpense = handleDeleteExpense;
window.handleMatchStatement = handleMatchStatement;
window.openInvoiceModal = openInvoiceModal;
window.openExpenseModal = openExpenseModal;
window.openJournalModal = openJournalModal;

// ==================== MODULES 5 & 6: EMPLOYEES & HR MANAGEMENT LOGIC ====================

// Fetches
async function fetchEmployees() {
  const data = await apiCall('/employees', 'GET');
  if (data) employees = data;
}

async function fetchLeaves() {
  const data = await apiCall('/leaves', 'GET');
  if (data) leaves = data;
}

async function fetchAttendance() {
  const data = await apiCall('/attendance', 'GET');
  if (data) attendance = data;
}

async function fetchPerformanceReviews() {
  const data = await apiCall('/performance', 'GET');
  if (data) performanceReviews = data;
}

// Helper: check if a date string falls on a day between start and end inclusive
function isDateWithinRange(checkDateStr, startStr, endStr) {
  const check = new Date(checkDateStr);
  const start = new Date(startStr);
  const end = new Date(endStr);
  check.setHours(0,0,0,0);
  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);
  return check >= start && check <= end;
}

// Helper: calculate days diff
function getDaysDiff(d1Str, d2Str) {
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  d1.setHours(0,0,0,0);
  d2.setHours(0,0,0,0);
  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
}

// HR KPIs calculations
function calculateAndRenderHRMetrics() {
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  
  // Filter employees by entity selection
  const filteredEmployees = employees.filter(emp => {
    if (activeHRCompany === 'Consolidated') return true;
    return emp.company === activeHRCompany;
  });

  const activeEmployees = filteredEmployees.filter(e => e.status === 'Active');
  
  // KPI 1: Headcount
  document.getElementById('hr-stat-headcount').textContent = filteredEmployees.length;
  document.getElementById('hr-stat-active-count').textContent = `${activeEmployees.length} Active Profiles`;

  // KPI 2: On Leave Today (Approved leaves covering simDate)
  let onLeaveCount = 0;
  leaves.forEach(lv => {
    if (lv.status === 'Approved' && isDateWithinRange(simDate, lv.startDate, lv.endDate)) {
      const emp = employees.find(e => e.id === lv.employeeId);
      if (emp && (activeHRCompany === 'Consolidated' || emp.company === activeHRCompany)) {
        onLeaveCount++;
      }
    }
  });
  document.getElementById('hr-stat-on-leave').textContent = onLeaveCount;

  // KPI 3: Pending Leaves
  let pendingCount = 0;
  leaves.forEach(lv => {
    if (lv.status === 'Pending') {
      const emp = employees.find(e => e.id === lv.employeeId);
      if (emp && (activeHRCompany === 'Consolidated' || emp.company === activeHRCompany)) {
        pendingCount++;
      }
    }
  });
  document.getElementById('hr-stat-pending-leaves').textContent = pendingCount;
  document.getElementById('hr-stat-pending-leaves-sub').textContent = `${pendingCount} requires action`;

  // KPI 4: Contract Renewals (Expiring within 30 days of simDate)
  let renewalCount = 0;
  filteredEmployees.forEach(emp => {
    if (emp.contractEndDate) {
      const diff = getDaysDiff(emp.contractEndDate, simDate);
      if (diff >= 0 && diff <= 30) {
        renewalCount++;
      }
    }
  });
  document.getElementById('hr-stat-renewals').textContent = renewalCount;
}

// Render Sub Tab Panel
function renderHRSubTab() {
  if (activeHRTab === 'dashboard') {
    renderHRPendingLeaves();
  } else if (activeHRTab === 'directory') {
    renderEmployeeDirectory();
  } else if (activeHRTab === 'leaves') {
    renderLeavesHistory();
  } else if (activeHRTab === 'attendance') {
    const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
    document.getElementById('hr-attendance-date-input').value = simDate;
    loadAttendanceList(simDate);
  } else if (activeHRTab === 'performance') {
    renderPerformanceAndWarnings();
  } else if (activeHRTab === 'reports') {
    renderHRReports();
  }
}

// Render Dashboard Pending Leaves List
function renderHRPendingLeaves() {
  const tbody = document.getElementById('hr-pending-leaves-body');
  tbody.innerHTML = '';

  const pendingList = leaves.filter(lv => {
    if (lv.status !== 'Pending') return false;
    if (activeHRCompany === 'Consolidated') return true;
    return lv.company === activeHRCompany;
  });

  if (pendingList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No pending leave requests requiring approval.</td></tr>`;
    return;
  }

  pendingList.forEach(lv => {
    const sDate = new Date(lv.startDate);
    const eDate = new Date(lv.endDate);
    const days = Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${lv.employeeName}</strong></td>
      <td>${lv.company}</td>
      <td><span class="dept-tag engineering">${lv.leaveType}</span></td>
      <td>${lv.startDate} to ${lv.endDate}</td>
      <td>${days} day${days > 1 ? 's' : ''}</td>
      <td>${lv.notes || ''}</td>
      <td class="text-center" style="white-space: nowrap;">
        <button class="btn btn-primary btn-sm" onclick="handleUpdateLeaveStatus('${lv.id}', 'Approved')" style="padding: 4px 8px; margin-right: 5px; background:var(--state-success); border-color:var(--state-success);"><i class="fa-solid fa-check"></i> Approve</button>
        <button class="btn btn-secondary btn-sm" onclick="handleUpdateLeaveStatus('${lv.id}', 'Rejected')" style="padding: 4px 8px; background:var(--state-danger); border-color:var(--state-danger);"><i class="fa-solid fa-xmark"></i> Reject</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Handle Approve/Reject Leave Request
async function handleUpdateLeaveStatus(leaveId, status) {
  const res = await apiCall(`/leaves/${leaveId}/status`, 'PUT', { status });
  if (res) {
    showToast(`Leave request ${status === 'Approved' ? 'approved' : 'rejected'}.`, 'success');
    await fetchLeaves();
    await fetchEmployees(); // Fetch employees to update leave balance
    calculateAndRenderHRMetrics();
    renderHRSubTab();
  }
}

// Render Employee Directory Cards
function renderEmployeeDirectory() {
  const grid = document.getElementById('hr-employee-cards-grid');
  grid.innerHTML = '';

  const searchVal = document.getElementById('hr-employee-search').value.toLowerCase();
  const deptFilter = document.getElementById('hr-filter-department').value;
  
  const filtered = employees.filter(emp => {
    if (activeHRCompany !== 'Consolidated' && emp.company !== activeHRCompany) return false;
    if (deptFilter && emp.department !== deptFilter) return false;
    if (searchVal && !emp.name.toLowerCase().includes(searchVal)) return false;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-muted); padding: 30px 0;">No employees found matching the filters.</div>`;
    return;
  }

  filtered.forEach(emp => {
    const card = document.createElement('div');
    const isIt = emp.company === 'Pearls IT';
    card.className = `employee-card ${isIt ? 'pearls-it' : ''}`;
    card.id = `emp-card-${emp.id}`;

    // Compute badges & fields
    const deptClass = emp.department.toLowerCase();
    const statusClass = emp.status === 'Active' ? 'active' : (emp.status === 'On Leave' ? 'on-leave' : 'terminated');

    // Docs UI list
    let docsHtml = '<li class="text-center" style="font-size:11px; color:var(--color-text-muted);">No documents attached.</li>';
    if (emp.documents && emp.documents.length > 0) {
      docsHtml = emp.documents.map(doc => `
        <li class="card-doc-item">
          <a href="#" onclick="event.preventDefault(); showToast('Downloading ${doc.name}...', 'info');"><i class="fa-solid fa-file-pdf"></i> ${doc.name}</a>
          <span style="font-size: 9px; color:var(--color-text-muted);">${doc.uploadDate}</span>
        </li>
      `).join('');
    }

    // Warnings list
    let warningsHtml = '<li class="text-center" style="font-size:11px; color:var(--color-text-muted);">No disciplinary warnings.</li>';
    if (emp.disciplinaryRecords && emp.disciplinaryRecords.length > 0) {
      warningsHtml = emp.disciplinaryRecords.map(w => `
        <li class="card-warning-item">
          <div style="display:flex; justify-content:space-between; width:100%; font-weight:700;">
            <span>${w.severity}</span>
            <span style="font-size:9px; color:var(--color-text-muted);">${w.date}</span>
          </div>
          <div style="font-size:10.5px; color:#cbd5e1;">${w.notes}</div>
        </li>
      `).join('');
    }

    // Star reviews rating count
    const reviews = performanceReviews.filter(pr => pr.employeeId === emp.id);
    let ratingStarsHtml = '';
    if (reviews.length > 0) {
      const avg = Math.round(reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length);
      ratingStarsHtml = `<span class="csat-rating-stars" style="margin-left: 8px;">` + Array.from({ length: 5 }, (_, i) => `<i class="${i < avg ? 'fa-solid' : 'fa-regular'} fa-star"></i>`).join('') + `</span>`;
    }

    card.innerHTML = `
      <div class="employee-card-header">
        <div>
          <h3>${emp.name} ${ratingStarsHtml}</h3>
          <div class="job-title">${emp.jobTitle}</div>
        </div>
        <span class="employee-status-badge ${statusClass}">${emp.status}</span>
      </div>

      <div class="employee-card-details">
        <div class="employee-detail-item">
          <i class="fa-solid fa-building"></i>
          <span>${emp.company}</span>
        </div>
        <div class="employee-detail-item">
          <i class="fa-solid fa-sitemap"></i>
          <span class="dept-tag ${deptClass}">${emp.department}</span>
        </div>
        ${emp.email ? `
        <div class="employee-detail-item">
          <i class="fa-solid fa-envelope"></i>
          <span>${emp.email}</span>
        </div>` : ''}
        ${emp.phone ? `
        <div class="employee-detail-item">
          <i class="fa-solid fa-phone"></i>
          <span>${emp.phone}</span>
        </div>` : ''}
      </div>

      <div class="employee-card-expander-btn" onclick="toggleEmployeeCardExpander('${emp.id}')">
        Show More Details <i class="fa-solid fa-chevron-down"></i>
      </div>

      <div class="employee-card-expanded-content">
        <div>
          <div class="expanded-section-title">Leave Balances</div>
          <div class="leave-balances-grid">
            <div class="leave-balance-badge">
              <span class="num">${emp.leaveBalance?.annual ?? 28}</span>
              <span class="lbl">Annual</span>
            </div>
            <div class="leave-balance-badge">
              <span class="num">${emp.leaveBalance?.sick ?? 10}</span>
              <span class="lbl">Sick</span>
            </div>
            <div class="leave-balance-badge">
              <span class="num">${emp.leaveBalance?.parental ?? 5}</span>
              <span class="lbl">Parental</span>
            </div>
          </div>
        </div>

        <div>
          <div class="expanded-section-title">Corporate Documents</div>
          <ul class="card-doc-list">${docsHtml}</ul>
        </div>

        <div>
          <div class="expanded-section-title">Disciplinary Logs</div>
          <ul class="card-warning-list">${warningsHtml}</ul>
        </div>

        <div style="font-size:11px; color:var(--color-text-muted); display:flex; flex-direction:column; gap:4px; background:rgba(0,0,0,0.1); padding:8px; border-radius:6px;">
          <div>Join Date: <strong>${emp.joinDate}</strong></div>
          <div>Contract End: <strong>${emp.contractEndDate || 'Permanent'}</strong></div>
        </div>
      </div>

      <div class="employee-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEmployeeModal('${emp.id}')"><i class="fa-solid fa-user-pen"></i> Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="openDocModal('${emp.id}', '${emp.name}')"><i class="fa-solid fa-file-arrow-up"></i> Document</button>
        <button class="btn btn-secondary btn-sm" onclick="openWarningModal('${emp.id}')"><i class="fa-solid fa-bullhorn"></i> Warn</button>
        <button class="btn btn-secondary btn-sm" onclick="openReviewModal('${emp.id}')"><i class="fa-solid fa-award"></i> Review</button>
        <button class="btn btn-secondary btn-sm" onclick="handleDeleteEmployee('${emp.id}')" style="color:var(--state-danger); border-color: rgba(239,68,68,0.2);"><i class="fa-solid fa-trash-can"></i> Delete</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function toggleEmployeeCardExpander(empId) {
  const card = document.getElementById(`emp-card-${empId}`);
  const btn = card.querySelector('.employee-card-expander-btn');
  card.classList.toggle('expanded');
  
  if (card.classList.contains('expanded')) {
    btn.innerHTML = `Show Less Details <i class="fa-solid fa-chevron-up"></i>`;
  } else {
    btn.innerHTML = `Show More Details <i class="fa-solid fa-chevron-down"></i>`;
  }
}

// Render Leaves Table List
function renderLeavesHistory() {
  const tbody = document.getElementById('hr-leaves-history-body');
  tbody.innerHTML = '';

  const filtered = leaves.filter(lv => {
    if (activeHRCompany === 'Consolidated') return true;
    return lv.company === activeHRCompany;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">No leave records logged.</td></tr>`;
    return;
  }

  filtered.forEach(lv => {
    const sDate = new Date(lv.startDate);
    const eDate = new Date(lv.endDate);
    const days = Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1;

    let badgeClass = 'badge-active';
    if (lv.status === 'Pending') badgeClass = 'badge-log-payment';
    if (lv.status === 'Rejected') badgeClass = 'badge-log-mock';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${lv.id}</strong></td>
      <td><strong>${lv.employeeName}</strong></td>
      <td>${lv.company}</td>
      <td><span class="dept-tag engineering">${lv.leaveType}</span></td>
      <td>${lv.startDate}</td>
      <td>${lv.endDate}</td>
      <td>${days}</td>
      <td><span class="badge ${badgeClass}">${lv.status}</span></td>
      <td>${lv.notes || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Load Daily Attendance Table
async function loadAttendanceList(date) {
  const tbody = document.getElementById('hr-attendance-list-body');
  tbody.innerHTML = '';

  // Get active employees for company
  const activeEmps = employees.filter(emp => {
    if (emp.status !== 'Active') return false;
    if (activeHRCompany === 'Consolidated') return true;
    return emp.company === activeHRCompany;
  });

  if (activeEmps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No active employees found to track attendance.</td></tr>`;
    return;
  }

  // Filter logs for this date
  const dateLogs = attendance.filter(att => att.date === date);

  activeEmps.forEach(emp => {
    // Check if employee has a log for this date
    let log = dateLogs.find(att => att.employeeId === emp.id);
    
    // Check if employee is on leave today
    const employeeLeave = leaves.find(lv => lv.employeeId === emp.id && lv.status === 'Approved' && isDateWithinRange(date, lv.startDate, lv.endDate));

    let status = 'Present';
    let checkIn = '09:00';
    let checkOut = '17:30';

    if (employeeLeave) {
      status = 'On Leave';
      checkIn = '';
      checkOut = '';
    } else if (log) {
      status = log.status;
      checkIn = log.checkIn;
      checkOut = log.checkOut;
    }

    const tr = document.createElement('tr');
    tr.className = 'attendance-row';
    tr.setAttribute('data-employee-id', emp.id);
    tr.setAttribute('data-employee-name', emp.name);
    tr.setAttribute('data-company', emp.company);
    
    // Quick toggle buttons HTML
    const toggleButtonsHtml = ['Present', 'Late', 'Absent', 'On Leave'].map(st => {
      const activeClass = (status === st) ? `active-${st.toLowerCase().replace(' ', '')}` : '';
      return `<button type="button" class="attendance-toggle-btn ${activeClass}" data-status="${st}" onclick="toggleAttendanceRowStatus(this, '${st}')">${st}</button>`;
    }).join(' ');

    tr.innerHTML = `
      <td><strong>${emp.name}</strong></td>
      <td>${emp.company}</td>
      <td><span class="dept-tag ${emp.department.toLowerCase()}">${emp.department}</span></td>
      <td>
        <select class="row-status-select select-clean" style="padding:4px 8px; font-size:12px; border-radius:4px; background:var(--bg-input); border:var(--border-glass); color:#fff;" onchange="syncAttendanceToggleFromSelect(this)">
          <option value="Present" ${status === 'Present' ? 'selected' : ''}>Present</option>
          <option value="Late" ${status === 'Late' ? 'selected' : ''}>Late</option>
          <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>Absent</option>
          <option value="On Leave" ${status === 'On Leave' ? 'selected' : ''}>On Leave</option>
        </select>
      </td>
      <td>
        <input type="text" class="row-in-input" value="${checkIn}" placeholder="09:00" style="width:70px; padding:4px 8px; font-size:12px; text-align:center; border-radius:4px; background:var(--bg-input); border:var(--border-glass); color:#fff;">
      </td>
      <td>
        <input type="text" class="row-out-input" value="${checkOut}" placeholder="17:30" style="width:70px; padding:4px 8px; font-size:12px; text-align:center; border-radius:4px; background:var(--bg-input); border:var(--border-glass); color:#fff;">
      </td>
      <td class="text-center" style="white-space: nowrap;">
        <div style="display:flex; justify-content:center; gap:4px;">
          ${toggleButtonsHtml}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleAttendanceRowStatus(btn, status) {
  const row = btn.closest('tr');
  const select = row.querySelector('.row-status-select');
  const inInput = row.querySelector('.row-in-input');
  const outInput = row.querySelector('.row-out-input');
  
  select.value = status;
  
  if (status === 'Absent' || status === 'On Leave') {
    inInput.value = '';
    outInput.value = '';
  } else {
    if (!inInput.value) inInput.value = '09:00';
    if (!outInput.value) outInput.value = '17:30';
  }
  
  // Update toggle classes
  row.querySelectorAll('.attendance-toggle-btn').forEach(b => {
    b.classList.remove('active-present', 'active-late', 'active-absent', 'active-leave');
  });
  
  btn.classList.add(`active-${status.toLowerCase().replace(' ', '')}`);
}

function syncAttendanceToggleFromSelect(select) {
  const row = select.closest('tr');
  const status = select.value;
  const inInput = row.querySelector('.row-in-input');
  const outInput = row.querySelector('.row-out-input');
  
  if (status === 'Absent' || status === 'On Leave') {
    inInput.value = '';
    outInput.value = '';
  } else {
    if (!inInput.value) inInput.value = '09:00';
    if (!outInput.value) outInput.value = '17:30';
  }
  
  // Find correct button
  row.querySelectorAll('.attendance-toggle-btn').forEach(btn => {
    btn.classList.remove('active-present', 'active-late', 'active-absent', 'active-leave');
    if (btn.getAttribute('data-status') === status) {
      btn.classList.add(`active-${status.toLowerCase().replace(' ', '')}`);
    }
  });
}

// Attendance Bulk Save Submit
async function handleAttendanceBulkSave() {
  const date = document.getElementById('hr-attendance-date-input').value;
  const logs = [];
  
  const rows = document.querySelectorAll('.attendance-row');
  rows.forEach(row => {
    logs.push({
      employeeId: row.getAttribute('data-employee-id'),
      employeeName: row.getAttribute('data-employee-name'),
      company: row.getAttribute('data-company'),
      status: row.querySelector('.row-status-select').value,
      checkIn: row.querySelector('.row-in-input').value,
      checkOut: row.querySelector('.row-out-input').value
    });
  });

  if (logs.length === 0) return;

  const res = await apiCall('/attendance/bulk', 'POST', { date, logs });
  if (res) {
    showToast(`Attendance logs saved successfully.`, 'success');
    await fetchAttendance();
    renderHRSubTab();
  }
}

// Render Reviews & Warnings list
function renderPerformanceAndWarnings() {
  const reviewsContainer = document.getElementById('hr-performance-list');
  const warningsContainer = document.getElementById('hr-warnings-list');
  
  reviewsContainer.innerHTML = '';
  warningsContainer.innerHTML = '';

  const companyFilteredEmployees = employees.filter(emp => {
    if (activeHRCompany === 'Consolidated') return true;
    return emp.company === activeHRCompany;
  });

  const empIds = companyFilteredEmployees.map(e => e.id);

  // Render reviews
  const filteredReviews = performanceReviews.filter(r => empIds.includes(r.employeeId));
  if (filteredReviews.length === 0) {
    reviewsContainer.innerHTML = `<div class="text-center" style="font-size:12px; color:var(--color-text-muted); padding:20px;">No performance reviews logged.</div>`;
  } else {
    filteredReviews.forEach(r => {
      const card = document.createElement('div');
      card.className = 'review-card';
      const stars = Array.from({ length: 5 }, (_, i) => `<i class="${i < r.score ? 'fa-solid' : 'fa-regular'} fa-star"></i>`).join('');
      
      card.innerHTML = `
        <div class="review-card-header">
          <h4><strong>${r.employeeName}</strong></h4>
          <span class="review-card-date">${r.reviewDate}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:var(--color-text-muted);">Reviewed by: ${r.reviewer}</span>
          <span class="csat-rating-stars">${stars}</span>
        </div>
        <p class="review-card-feedback">"${r.feedback}"</p>
      `;
      reviewsContainer.appendChild(card);
    });
  }

  // Render warnings
  const warningsList = [];
  companyFilteredEmployees.forEach(emp => {
    if (emp.disciplinaryRecords && emp.disciplinaryRecords.length > 0) {
      emp.disciplinaryRecords.forEach(w => {
        warningsList.push({
          employeeName: emp.name,
          date: w.date,
          severity: w.severity,
          notes: w.notes
        });
      });
    }
  });

  if (warningsList.length === 0) {
    warningsContainer.innerHTML = `<div class="text-center" style="font-size:12px; color:var(--color-text-muted); padding:20px;">No warnings recorded. Registry is clean.</div>`;
  } else {
    // Sort warnings by date descending
    warningsList.sort((a, b) => b.date.localeCompare(a.date));
    warningsList.forEach(w => {
      const card = document.createElement('div');
      card.className = 'warning-card';
      card.innerHTML = `
        <div class="warning-card-header">
          <h4><strong>${w.employeeName}</strong></h4>
          <span class="warning-card-date">${w.date}</span>
        </div>
        <div>
          <span class="warning-card-severity">${w.severity}</span>
        </div>
        <p class="warning-card-notes">${w.notes}</p>
      `;
      warningsContainer.appendChild(card);
    });
  }
}

// Open Employee Profile Modal
function openEmployeeModal(empId = null) {
  const modal = document.getElementById('employee-modal');
  const title = document.getElementById('employee-modal-title');
  const form = document.getElementById('employee-form');
  form.reset();
  
  if (empId) {
    title.textContent = 'Edit Employee Profile';
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      document.getElementById('employee-id').value = emp.id;
      document.getElementById('employee-name').value = emp.name;
      document.getElementById('employee-email').value = emp.email || '';
      document.getElementById('employee-phone').value = emp.phone || '';
      document.getElementById('employee-company').value = emp.company;
      document.getElementById('employee-department').value = emp.department;
      document.getElementById('employee-job-title').value = emp.jobTitle;
      document.getElementById('employee-join-date').value = emp.joinDate;
      document.getElementById('employee-contract-end-date').value = emp.contractEndDate || '';
    }
  } else {
    title.textContent = 'Add New Employee Profile';
    document.getElementById('employee-id').value = '';
    const today = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
    document.getElementById('employee-join-date').value = today;
  }
  
  modal.classList.add('active');
}

function closeEmployeeModal() {
  document.getElementById('employee-modal').classList.remove('active');
}

async function handleEmployeeSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('employee-id').value;
  const body = {
    name: document.getElementById('employee-name').value,
    email: document.getElementById('employee-email').value,
    phone: document.getElementById('employee-phone').value,
    company: document.getElementById('employee-company').value,
    department: document.getElementById('employee-department').value,
    jobTitle: document.getElementById('employee-job-title').value,
    joinDate: document.getElementById('employee-join-date').value,
    contractEndDate: document.getElementById('employee-contract-end-date').value || null
  };

  let res;
  if (id) {
    res = await apiCall(`/employees/${id}`, 'PUT', body);
  } else {
    res = await apiCall('/employees', 'POST', body);
  }

  if (res) {
    showToast(`Employee profile saved successfully.`, 'success');
    closeEmployeeModal();
    await fetchEmployees();
    calculateAndRenderHRMetrics();
    renderHRSubTab();
  }
}

async function handleDeleteEmployee(id) {
  if (confirm('Are you sure you want to delete this employee profile? This cannot be undone.')) {
    const res = await apiCall(`/employees/${id}`, 'DELETE');
    if (res) {
      showToast('Employee profile deleted.', 'info');
      await fetchEmployees();
      calculateAndRenderHRMetrics();
      renderHRSubTab();
    }
  }
}

// Open Leave Request Modal
function openLeaveRequestModal() {
  const modal = document.getElementById('leave-request-modal');
  const form = document.getElementById('leave-request-form');
  form.reset();
  
  const select = document.getElementById('leave-employee-id');
  select.innerHTML = '<option value="">-- Select Employee --</option>';
  
  const activeEmps = employees.filter(e => e.status === 'Active');
  activeEmps.forEach(emp => {
    select.innerHTML += `<option value="${emp.id}">${emp.name} (${emp.company})</option>`;
  });

  const today = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  document.getElementById('leave-start-date').value = today;
  document.getElementById('leave-end-date').value = today;

  modal.classList.add('active');
}

function closeLeaveRequestModal() {
  document.getElementById('leave-request-modal').classList.remove('active');
}

async function handleLeaveRequestSubmit(e) {
  e.preventDefault();
  
  const body = {
    employeeId: document.getElementById('leave-employee-id').value,
    leaveType: document.getElementById('leave-type').value,
    startDate: document.getElementById('leave-start-date').value,
    endDate: document.getElementById('leave-end-date').value,
    notes: document.getElementById('leave-notes').value
  };

  const res = await apiCall('/leaves', 'POST', body);
  if (res) {
    showToast(`Leave request submitted. Status: Pending.`, 'success');
    closeLeaveRequestModal();
    await fetchLeaves();
    calculateAndRenderHRMetrics();
    renderHRSubTab();
  }
}

// Open Document Upload Modal
function openDocModal(employeeId, employeeName) {
  const modal = document.getElementById('doc-modal');
  document.getElementById('doc-form').reset();
  
  document.getElementById('doc-employee-id').value = employeeId;
  document.getElementById('doc-employee-name-display').textContent = employeeName;
  
  modal.classList.add('active');
}

function closeDocModal() {
  document.getElementById('doc-modal').classList.remove('active');
}

async function handleDocSubmit(e) {
  e.preventDefault();
  
  const employeeId = document.getElementById('doc-employee-id').value;
  const body = {
    action: 'add_document',
    docName: document.getElementById('doc-name').value,
    docType: document.getElementById('doc-type').value
  };

  const res = await apiCall(`/employees/${employeeId}`, 'PUT', body);
  if (res) {
    showToast(`Document metadata attached.`, 'success');
    closeDocModal();
    await fetchEmployees();
    renderHRSubTab();
  }
}

// Open Disciplinary Warning Modal
function openWarningModal(employeeId = null) {
  const modal = document.getElementById('warning-modal');
  const form = document.getElementById('warning-form');
  form.reset();
  
  const select = document.getElementById('warning-employee-id');
  select.innerHTML = '<option value="">-- Select Employee --</option>';
  
  employees.forEach(emp => {
    const selectedAttr = (employeeId === emp.id) ? 'selected' : '';
    select.innerHTML += `<option value="${emp.id}" ${selectedAttr}>${emp.name} (${emp.company})</option>`;
  });

  modal.classList.add('active');
}

function closeWarningModal() {
  document.getElementById('warning-modal').classList.remove('active');
}

async function handleWarningSubmit(e) {
  e.preventDefault();
  
  const employeeId = document.getElementById('warning-employee-id').value;
  const body = {
    action: 'add_warning',
    severity: document.getElementById('warning-severity').value,
    notes: document.getElementById('warning-notes').value
  };

  const res = await apiCall(`/employees/${employeeId}`, 'PUT', body);
  if (res) {
    showToast(`Disciplinary warning recorded successfully.`, 'success');
    closeWarningModal();
    await fetchEmployees();
    renderHRSubTab();
  }
}

// Open Performance Review Modal
function openReviewModal(employeeId = null) {
  const modal = document.getElementById('review-modal');
  const form = document.getElementById('review-form');
  form.reset();
  
  const select = document.getElementById('review-employee-id');
  select.innerHTML = '<option value="">-- Select Employee --</option>';
  
  employees.forEach(emp => {
    const selectedAttr = (employeeId === emp.id) ? 'selected' : '';
    select.innerHTML += `<option value="${emp.id}" ${selectedAttr}>${emp.name} (${emp.company})</option>`;
  });

  document.getElementById('review-reviewer').value = 'Hammad Arshad';

  modal.classList.add('active');
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.remove('active');
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  
  const body = {
    employeeId: document.getElementById('review-employee-id').value,
    reviewer: document.getElementById('review-reviewer').value,
    score: parseInt(document.getElementById('review-score').value),
    feedback: document.getElementById('review-feedback').value,
    reviewDate: systemStatus.simulatedDate || new Date().toISOString().substring(0, 10)
  };

  const res = await apiCall('/performance', 'POST', body);
  if (res) {
    showToast(`Performance review posted successfully.`, 'success');
    closeReviewModal();
    await fetchPerformanceReviews();
    await fetchEmployees(); // Refresh lists
    renderHRSubTab();
  }
}

// Render HR reports
function renderHRReports() {
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  
  if (activeHRReport === 'headcount') {
    const tbody = document.getElementById('hr-report-headcount-body');
    tbody.innerHTML = '';
    
    // Group departments
    const departments = ['Management', 'Engineering', 'Support', 'Sales', 'Consulting'];
    
    departments.forEach(dept => {
      const pdCount = employees.filter(e => e.company === 'Pearls Developers Limited' && e.department === dept).length;
      const itCount = employees.filter(e => e.company === 'Pearls IT' && e.department === dept).length;
      const total = pdCount + itCount;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${dept}</strong></td>
        <td>${pdCount}</td>
        <td>${itCount}</td>
        <td class="text-right font-bold text-white">${total}</td>
      `;
      tbody.appendChild(tr);
    });
  } else if (activeHRReport === 'leaves') {
    const tbody = document.getElementById('hr-report-leaves-body');
    tbody.innerHTML = '';
    
    employees.forEach(emp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${emp.name}</strong></td>
        <td>${emp.company}</td>
        <td class="text-center font-bold text-cyan">${emp.leaveBalance?.annual ?? 28}</td>
        <td class="text-center font-bold text-amber">${emp.leaveBalance?.sick ?? 10}</td>
        <td class="text-center font-bold text-purple">${emp.leaveBalance?.parental ?? 5}</td>
      `;
      tbody.appendChild(tr);
    });
  } else if (activeHRReport === 'attendance') {
    const tbody = document.getElementById('hr-report-attendance-body');
    tbody.innerHTML = '';
    
    // Group logs by employee
    employees.forEach(emp => {
      const empLogs = attendance.filter(att => att.employeeId === emp.id);
      
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      
      empLogs.forEach(log => {
        if (log.status === 'Present') presentCount++;
        else if (log.status === 'Late') lateCount++;
        else if (log.status === 'Absent') absentCount++;
        else if (log.status === 'On Leave') leaveCount++;
      });
      
      const totalDays = presentCount + lateCount + absentCount;
      const onTimeRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;
      
      let rateBadge = 'badge-active';
      if (onTimeRate < 85) rateBadge = 'badge-log-mock';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${emp.name}</strong></td>
        <td>${emp.company}</td>
        <td class="text-center">${presentCount}</td>
        <td class="text-center text-amber">${lateCount}</td>
        <td class="text-center text-rose">${absentCount}</td>
        <td class="text-center text-purple">${leaveCount}</td>
        <td class="text-right"><span class="badge ${rateBadge}">${onTimeRate}%</span></td>
      `;
      tbody.appendChild(tr);
    });
  } else if (activeHRReport === 'turnover') {
    const tbody = document.getElementById('hr-report-turnover-body');
    tbody.innerHTML = '';
    
    employees.forEach(emp => {
      // Calculate tenure in months
      const join = new Date(emp.joinDate);
      const end = emp.contractEndDate ? new Date(emp.contractEndDate) : new Date(simDate);
      const tenureMonths = Math.max(0, (end.getFullYear() - join.getFullYear()) * 12 + (end.getMonth() - join.getMonth()));
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${emp.name}</strong></td>
        <td>${emp.company}</td>
        <td>${emp.joinDate}</td>
        <td>${emp.contractEndDate || 'Permanent'}</td>
        <td class="text-center">${tenureMonths} mo</td>
        <td><span class="employee-status-badge ${emp.status.toLowerCase() === 'active' ? 'active' : 'terminated'}">${emp.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Exports
window.handleUpdateLeaveStatus = handleUpdateLeaveStatus;
window.toggleEmployeeCardExpander = toggleEmployeeCardExpander;
window.handleDeleteEmployee = handleDeleteEmployee;
window.toggleAttendanceRowStatus = toggleAttendanceRowStatus;
window.syncAttendanceToggleFromSelect = syncAttendanceToggleFromSelect;
window.openDocModal = openDocModal;
window.openWarningModal = openWarningModal;
window.openReviewModal = openReviewModal;
window.openEmployeeModal = openEmployeeModal;


// ==================== MODULES 7 & 8: INVESTMENTS PORTFOLIO LOGIC ====================

// Fetch investments
async function fetchInvestments() {
  const data = await apiCall('/investments', 'GET');
  if (data) {
    investments = data;
    calculateAndRenderInvestmentMetrics();
    renderInvestmentSubTab();
  }
}

// Calculate and render KPIs ribbon
function calculateAndRenderInvestmentMetrics() {
  const filtered = getFilteredInvestments();
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  
  let totalValue = 0;
  let totalReturns = 0;
  let pendingReturns = 0;
  let bestRoi = 0;
  let bestHoldingName = 'N/A';
  let activeHoldingsCount = 0;
  let receivedCount = 0;
  let pendingCount = 0;

  filtered.forEach(inv => {
    let invReceived = 0;
    
    (inv.returns || []).forEach(ret => {
      if (ret.status === 'Received') {
        totalReturns += parseFloat(ret.amount || 0);
        invReceived += parseFloat(ret.amount || 0);
        receivedCount++;
      } else if (ret.status === 'Pending') {
        pendingReturns += parseFloat(ret.amount || 0);
        pendingCount++;
      }
    });

    if (inv.status === 'Active') {
      activeHoldingsCount++;
      totalValue += parseFloat(inv.currentValue || 0);
    }
    
    const initial = parseFloat(inv.initialValue || 0);
    if (initial > 0) {
      const currentVal = inv.status === 'Exited' ? parseFloat(inv.exitValue || 0) : parseFloat(inv.currentValue || 0);
      const roi = ((currentVal - initial + invReceived) / initial) * 100;
      if (roi > bestRoi) {
        bestRoi = roi;
        bestHoldingName = inv.name;
      }
    }
  });

  document.getElementById('inv-stat-portfolio-value').textContent = formatValue(totalValue, '£');
  document.getElementById('inv-stat-active-holdings').textContent = `${activeHoldingsCount} Active Holdings`;
  
  document.getElementById('inv-stat-total-returns').textContent = formatValue(totalReturns, '£');
  document.getElementById('inv-stat-received-returns-count').textContent = `${receivedCount} Yields Received`;
  
  document.getElementById('inv-stat-best-roi').textContent = `${bestRoi.toFixed(2)}%`;
  document.getElementById('inv-stat-best-holding-name').textContent = bestHoldingName;
  
  document.getElementById('inv-stat-pending-returns').textContent = formatValue(pendingReturns, '£');
  document.getElementById('inv-stat-pending-count').textContent = `${pendingCount} Expected Yields`;
}

// Get investments filtered by company
function getFilteredInvestments() {
  if (activeInvestmentCompany === 'Consolidated') {
    return investments;
  }
  return investments.filter(inv => inv.company === activeInvestmentCompany);
}

// Render selected sub tab
function renderInvestmentSubTab() {
  if (activeInvestmentTab === 'dashboard') {
    renderInvestmentDashboard();
  } else if (activeInvestmentTab === 'holdings') {
    renderInvestmentHoldings();
  } else if (activeInvestmentTab === 'yields') {
    renderInvestmentYields();
  } else if (activeInvestmentTab === 'reports') {
    renderInvestmentReports();
  }
}

// Render Dashboard
function renderInvestmentDashboard() {
  const filtered = getFilteredInvestments();
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  
  // 1. Pending Yield Collection List
  const collectionList = document.getElementById('inv-pending-collection-list');
  collectionList.innerHTML = '';
  
  let pendingDueRows = [];
  
  filtered.forEach(inv => {
    (inv.returns || []).forEach(ret => {
      if (ret.status === 'Pending') {
        const daysDiff = getDaysDifferenceForInv(ret.date, simDate);
        if (daysDiff >= 0) { // matured
          pendingDueRows.push({
            expectedDate: ret.date,
            holdingName: inv.name,
            investmentId: inv.id,
            returnId: ret.id,
            type: ret.type,
            amount: parseFloat(ret.amount || 0)
          });
        }
      }
    });
  });
  
  if (pendingDueRows.length === 0) {
    collectionList.innerHTML = `<tr><td colspan="5" class="text-center">No pending yields due for collection.</td></tr>`;
  } else {
    pendingDueRows.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));
    collectionList.innerHTML = pendingDueRows.map(row => `
      <tr>
        <td><strong>${row.expectedDate}</strong></td>
        <td>${row.holdingName}</td>
        <td><span class="badge badge-active">${row.type}</span></td>
        <td class="text-right font-bold text-white">${formatValue(row.amount, '£')}</td>
        <td class="text-center">
          <button class="btn btn-accent btn-sm" onclick="handleCollectPendingYield('${row.investmentId}', '${row.returnId}')">
            <i class="fa-solid fa-cash-register"></i> Collect
          </button>
        </td>
      </tr>
    `).join('');
  }

  // 2. Asset Allocation & ROI Class Breakdown
  renderAllocationBreakdowns(filtered);
}

function getDaysDifferenceForInv(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  d1.setHours(0,0,0,0);
  d2.setHours(0,0,0,0);
  const diffTime = d2 - d1;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Render Allocation & ROI Breakdowns
function renderAllocationBreakdowns(filtered) {
  const allocContainer = document.getElementById('inv-allocation-breakdown');
  const roiContainer = document.getElementById('inv-roi-breakdown');
  
  allocContainer.innerHTML = '';
  roiContainer.innerHTML = '';

  const types = ['Property', 'Stocks', 'Bonds', 'Mutual Funds', 'Savings Account'];
  const typeValues = {};
  const typeReceived = {};
  const typeInitial = {};
  
  types.forEach(t => {
    typeValues[t] = 0;
    typeReceived[t] = 0;
    typeInitial[t] = 0;
  });

  let grandTotalValue = 0;

  filtered.forEach(inv => {
    const t = inv.type || 'Stocks';
    if (!types.includes(t)) return;
    
    if (inv.status === 'Active') {
      typeValues[t] += parseFloat(inv.currentValue || 0);
      grandTotalValue += parseFloat(inv.currentValue || 0);
    }
    
    typeInitial[t] += parseFloat(inv.initialValue || 0);
    
    (inv.returns || []).forEach(ret => {
      if (ret.status === 'Received') {
        typeReceived[t] += parseFloat(ret.amount || 0);
      }
    });
  });

  // Render Allocation
  types.forEach(t => {
    const val = typeValues[t];
    const pct = grandTotalValue > 0 ? (val / grandTotalValue) * 100 : 0;
    
    if (val > 0 || pct > 0) {
      const bar = document.createElement('div');
      bar.className = 'allocation-bar-container';
      bar.innerHTML = `
        <div class="allocation-bar-label">
          <span><strong>${t}</strong></span>
          <span>${formatValue(val, '£')} (${pct.toFixed(1)}%)</span>
        </div>
        <div class="allocation-bar-bg">
          <div class="allocation-bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      allocContainer.innerHTML += bar.outerHTML;
    }
  });

  if (allocContainer.innerHTML === '') {
    allocContainer.innerHTML = `<div class="text-center text-muted" style="font-size:12px; padding: 10px 0;">No active investments logged.</div>`;
  }

  // Render ROI class breakdown
  types.forEach(t => {
    const initial = typeInitial[t];
    const received = typeReceived[t];
    const currentVal = typeValues[t];
    
    if (initial > 0) {
      const roi = ((currentVal - initial + received) / initial) * 100;
      const barWidth = Math.max(0, Math.min(100, roi));
      
      const bar = document.createElement('div');
      bar.className = 'allocation-bar-container';
      bar.innerHTML = `
        <div class="allocation-bar-label">
          <span><strong>${t}</strong></span>
          <span class="font-bold ${roi >= 0 ? 'text-emerald' : 'text-rose'}">${roi.toFixed(2)}% ROI</span>
        </div>
        <div class="allocation-bar-bg">
          <div class="allocation-bar-fill" style="width: ${barWidth}%; background: ${roi >= 0 ? 'var(--state-success)' : 'var(--state-danger)'};"></div>
        </div>
      `;
      roiContainer.innerHTML += bar.outerHTML;
    }
  });

  if (roiContainer.innerHTML === '') {
    roiContainer.innerHTML = `<div class="text-center text-muted" style="font-size:12px; padding: 10px 0;">No ROI data available yet.</div>`;
  }
}

// Render Holdings sub-tab
function renderInvestmentHoldings() {
  const holdingsGrid = document.getElementById('inv-holdings-grid');
  holdingsGrid.innerHTML = '';
  
  const searchVal = document.getElementById('inv-search').value.toLowerCase();
  const typeFilter = document.getElementById('inv-filter-type').value;
  
  const filtered = getFilteredInvestments().filter(inv => {
    const matchesSearch = inv.name.toLowerCase().includes(searchVal) || (inv.investorDetails || '').toLowerCase().includes(searchVal);
    const matchesType = !typeFilter || inv.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (filtered.length === 0) {
    holdingsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon"><i class="fa-solid fa-briefcase"></i></div>
        <h3>No investments found</h3>
        <p>Log a new holding or adjust search filters to get started.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(inv => {
    const card = document.createElement('div');
    card.className = 'investment-card';
    
    let totalReceived = 0;
    (inv.returns || []).forEach(ret => {
      if (ret.status === 'Received') totalReceived += parseFloat(ret.amount || 0);
    });

    const initial = parseFloat(inv.initialValue || 0);
    const current = parseFloat(inv.currentValue || 0);
    const profit = current - initial;
    const totalReturn = profit + totalReceived;
    const roi = initial > 0 ? (totalReturn / initial) * 100 : 0;
    
    const typeClass = 'type-' + (inv.type || 'stocks').toLowerCase().replace(/\s+/g, '');
    const isExited = inv.status === 'Exited';

    card.innerHTML = `
      <div class="investment-card-header">
        <div>
          <h3 class="investment-card-title">${inv.name}</h3>
          <span style="font-size: 10px; color: var(--color-text-muted);">${inv.company}</span>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
          <span class="investment-card-type ${typeClass}">${inv.type}</span>
          ${isExited ? `<span class="yield-status-badge exited">Exited</span>` : `<span class="yield-status-badge received">Active</span>`}
        </div>
      </div>

      <div class="investment-card-details">
        <div class="detail-item">
          <span class="detail-label">Initial Cost</span>
          <span class="detail-value">${formatValue(initial, '£')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">${isExited ? 'Sale Value' : 'Current Value'}</span>
          <span class="detail-value">${formatValue(isExited ? parseFloat(inv.exitValue || 0) : current, '£')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Yields Collected</span>
          <span class="detail-value text-indigo">${formatValue(totalReceived, '£')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Total ROI %</span>
          <span class="detail-value ${roi >= 0 ? 'gain-positive' : 'gain-negative'}">${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%</span>
        </div>
        <div class="detail-item" style="grid-column: span 2;">
          <span class="detail-label">Investor Details</span>
          <span class="detail-value" style="font-weight: 500;">${inv.investorDetails || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Purchase Date</span>
          <span class="detail-value">${inv.purchaseDate}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Maturity Date</span>
          <span class="detail-value">${inv.maturityDate || 'N/A'}</span>
        </div>
      </div>

      <div class="investment-card-footer">
        ${!isExited ? `
          <button class="btn btn-secondary btn-sm" onclick="openRecordYieldModal('${inv.id}', '${inv.name.replace(/'/g, "\\'")}')" title="Log payout yield"><i class="fa-solid fa-plus-circle"></i> Yield</button>
          <button class="btn btn-secondary btn-sm" onclick="openExitModal('${inv.id}', '${inv.name.replace(/'/g, "\\'")}', ${initial})" title="Sell holding / Exit asset" style="color: var(--state-danger); border-color: rgba(239, 68, 68, 0.2);"><i class="fa-solid fa-right-from-bracket"></i> Exit</button>
          <button class="btn btn-secondary btn-sm" onclick="openInvestmentModal('${inv.id}')" title="Revalue or edit details"><i class="fa-solid fa-pen-to-square"></i></button>
        ` : ''}
        <button class="btn btn-secondary btn-sm text-rose" onclick="handleDeleteInvestment('${inv.id}')" title="Delete record"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    holdingsGrid.appendChild(card);
  });
}

// Render Yield Schedule Registry
function renderInvestmentYields() {
  const tbody = document.getElementById('inv-yields-history-body');
  tbody.innerHTML = '';

  const filtered = getFilteredInvestments();
  let allReturns = [];

  filtered.forEach(inv => {
    (inv.returns || []).forEach(ret => {
      allReturns.push({
        date: ret.date,
        holdingName: inv.name,
        type: inv.type,
        yieldType: ret.type,
        company: inv.company,
        amount: parseFloat(ret.amount || 0),
        status: ret.status,
        notes: ret.notes || 'N/A'
      });
    });
  });

  if (allReturns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No yield logs recorded.</td></tr>`;
    return;
  }

  allReturns.sort((a, b) => b.date.localeCompare(a.date));

  tbody.innerHTML = allReturns.map(ret => `
    <tr>
      <td><strong>${ret.date}</strong></td>
      <td>${ret.holdingName}</td>
      <td>${ret.type}</td>
      <td><span class="badge badge-active">${ret.yieldType}</span></td>
      <td>${ret.company}</td>
      <td class="text-right font-bold text-white">${formatValue(ret.amount, '£')}</td>
      <td class="text-center">
        <span class="yield-status-badge ${ret.status.toLowerCase()}">${ret.status}</span>
      </td>
      <td><span style="font-size:11px; color: var(--color-text-muted);">${ret.notes}</span></td>
    </tr>
  `).join('');
}

// Render Investment reports
function renderInvestmentReports() {
  const filtered = getFilteredInvestments();
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  
  if (activeInvestmentReport === 'performance') {
    const tbody = document.getElementById('inv-report-performance-body');
    tbody.innerHTML = '';
    
    filtered.forEach(inv => {
      let totalReceived = 0;
      (inv.returns || []).forEach(ret => {
        if (ret.status === 'Received') totalReceived += parseFloat(ret.amount || 0);
      });
      
      const initial = parseFloat(inv.initialValue || 0);
      const current = inv.status === 'Exited' ? parseFloat(inv.exitValue || 0) : parseFloat(inv.currentValue || 0);
      const profit = current - initial;
      const totalReturn = profit + totalReceived;
      const roi = initial > 0 ? (totalReturn / initial) * 100 : 0;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${inv.name}</strong></td>
        <td>${inv.type}</td>
        <td>${inv.purchaseDate}</td>
        <td class="text-right">${formatValue(initial, '£')}</td>
        <td class="text-right">${formatValue(current, '£')}</td>
        <td class="text-right text-indigo">${formatValue(totalReceived, '£')}</td>
        <td class="text-right ${profit >= 0 ? 'text-emerald' : 'text-rose'}">${profit >= 0 ? '+' : ''}${formatValue(profit, '£')}</td>
        <td class="text-right font-bold text-white">${formatValue(totalReturn, '£')}</td>
        <td class="text-center font-bold ${roi >= 0 ? 'text-emerald' : 'text-rose'}">${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%</td>
      `;
      tbody.appendChild(tr);
    });

    if (tbody.innerHTML === '') {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center">No investments logged.</td></tr>`;
    }
  } else if (activeInvestmentReport === 'roi') {
    const tbody = document.getElementById('inv-report-roi-body');
    tbody.innerHTML = '';
    
    const types = ['Property', 'Stocks', 'Bonds', 'Mutual Funds', 'Savings Account'];
    const typeValues = {};
    const typeReceived = {};
    const typeInitial = {};
    
    types.forEach(t => {
      typeValues[t] = 0;
      typeReceived[t] = 0;
      typeInitial[t] = 0;
    });

    filtered.forEach(inv => {
      const t = inv.type || 'Stocks';
      if (!types.includes(t)) return;
      
      typeInitial[t] += parseFloat(inv.initialValue || 0);
      typeValues[t] += inv.status === 'Exited' ? parseFloat(inv.exitValue || 0) : parseFloat(inv.currentValue || 0);
      
      (inv.returns || []).forEach(ret => {
        if (ret.status === 'Received') {
          typeReceived[t] += parseFloat(ret.amount || 0);
        }
      });
    });

    types.forEach(t => {
      const initial = typeInitial[t];
      const received = typeReceived[t];
      const current = typeValues[t];
      
      if (initial > 0) {
        const profit = current - initial;
        const totalReturn = profit + received;
        const roi = (totalReturn / initial) * 100;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${t}</strong></td>
          <td class="text-right">${formatValue(initial, '£')}</td>
          <td class="text-right text-indigo">${formatValue(received, '£')}</td>
          <td class="text-center font-bold ${roi >= 0 ? 'text-emerald' : 'text-rose'}">${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%</td>
        `;
        tbody.appendChild(tr);
      }
    });

    if (tbody.innerHTML === '') {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center">No ROI data available.</td></tr>`;
    }
  } else if (activeInvestmentReport === 'comparison') {
    const tbody = document.getElementById('inv-report-comparison-body');
    tbody.innerHTML = '';
    
    const entities = ['Pearls Developers Limited', 'Pearls IT'];
    entities.forEach(comp => {
      const compInvs = investments.filter(inv => inv.company === comp);
      
      let count = 0;
      let initial = 0;
      let valuation = 0;
      let yields = 0;
      
      compInvs.forEach(inv => {
        if (inv.status === 'Active') count++;
        initial += parseFloat(inv.initialValue || 0);
        valuation += inv.status === 'Exited' ? parseFloat(inv.exitValue || 0) : parseFloat(inv.currentValue || 0);
        
        (inv.returns || []).forEach(ret => {
          if (ret.status === 'Received') yields += parseFloat(ret.amount || 0);
        });
      });
      
      if (initial > 0) {
        const profit = valuation - initial;
        const totalReturn = profit + yields;
        const roi = (totalReturn / initial) * 100;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${comp}</strong></td>
          <td class="text-center">${count}</td>
          <td class="text-right">${formatValue(initial, '£')}</td>
          <td class="text-right">${formatValue(valuation, '£')}</td>
          <td class="text-right text-indigo">${formatValue(yields, '£')}</td>
          <td class="text-center font-bold ${roi >= 0 ? 'text-emerald' : 'text-rose'}">${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%</td>
        `;
        tbody.appendChild(tr);
      }
    });

    if (tbody.innerHTML === '') {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center">No comparison data available.</td></tr>`;
    }
  } else if (activeInvestmentReport === 'maturity') {
    const tbody = document.getElementById('inv-report-maturity-body');
    tbody.innerHTML = '';
    
    let timelineList = [];
    filtered.forEach(inv => {
      if (inv.status === 'Active' && inv.maturityDate) {
        timelineList.push(inv);
      }
    });

    if (timelineList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">No upcoming bond or investment maturities tracked.</td></tr>`;
      return;
    }

    timelineList.sort((a,b) => a.maturityDate.localeCompare(b.maturityDate));

    tbody.innerHTML = timelineList.map(inv => {
      const daysDiff = getDaysDifferenceForInv(simDate, inv.maturityDate);
      let statusBadge = 'badge-active';
      let text = `${daysDiff} days left`;
      
      if (daysDiff < 0) {
        statusBadge = 'badge-log-mock';
        text = `Matured (${Math.abs(daysDiff)} days ago)`;
      } else if (daysDiff <= 30) {
        statusBadge = 'badge-log-mock';
        text = `Expiring soon! (${daysDiff} days)`;
      }
      
      return `
        <tr>
          <td><strong>${inv.name}</strong></td>
          <td>${inv.type}</td>
          <td>${inv.maturityDate}</td>
          <td class="text-right font-bold text-white">${formatValue(inv.currentValue, '£')}</td>
          <td><span class="badge ${statusBadge}">${text}</span></td>
        </tr>
      `;
    }).join('');
  }
}

// Open / Close Modals
function openInvestmentModal(investmentId = null) {
  const modal = document.getElementById('investment-modal');
  const form = document.getElementById('investment-form');
  const title = document.getElementById('investment-modal-title');
  
  form.reset();
  document.getElementById('investment-id').value = '';

  if (investmentId) {
    title.textContent = 'Edit Investment Holding Details';
    const inv = investments.find(i => i.id === investmentId);
    if (inv) {
      document.getElementById('investment-id').value = inv.id;
      document.getElementById('investment-name').value = inv.name;
      document.getElementById('investment-company').value = inv.company;
      document.getElementById('investment-type').value = inv.type;
      document.getElementById('investment-investor').value = inv.investorDetails;
      document.getElementById('investment-initial-value').value = inv.initialValue;
      document.getElementById('investment-current-value').value = inv.currentValue;
      document.getElementById('investment-purchase-date').value = inv.purchaseDate;
      document.getElementById('investment-maturity-date').value = inv.maturityDate || '';
    }
  } else {
    title.textContent = 'Log New Investment Holding';
    document.getElementById('investment-purchase-date').value = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  }

  modal.classList.add('active');
}

function closeInvestmentModal() {
  document.getElementById('investment-modal').classList.remove('active');
}

async function handleInvestmentSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('investment-id').value;
  const body = {
    name: document.getElementById('investment-name').value,
    company: document.getElementById('investment-company').value,
    type: document.getElementById('investment-type').value,
    investorDetails: document.getElementById('investment-investor').value,
    initialValue: parseFloat(document.getElementById('investment-initial-value').value) || 0,
    currentValue: parseFloat(document.getElementById('investment-current-value').value) || 0,
    purchaseDate: document.getElementById('investment-purchase-date').value,
    maturityDate: document.getElementById('investment-maturity-date').value || null
  };

  let result;
  if (id) {
    result = await apiCall(`/investments/${id}`, 'PUT', body);
    if (result) showToast(`Investment "${body.name}" revalued successfully!`, 'success');
  } else {
    result = await apiCall('/investments', 'POST', body);
    if (result) showToast(`Investment "${body.name}" purchased and journal entries posted!`, 'success');
  }

  if (result) {
    closeInvestmentModal();
    await fetchInvestments();
    await fetchJournals();
    await fetchReconciliation();
    await fetchAccounts();
  }
}

async function handleDeleteInvestment(id) {
  if (confirm('Are you sure you want to delete this investment? This will reverse purchase/exit journal entries.')) {
    const res = await apiCall(`/investments/${id}`, 'DELETE');
    if (res) {
      showToast('Investment deleted successfully.', 'info');
      await fetchInvestments();
      await fetchJournals();
      await fetchReconciliation();
      await fetchAccounts();
    }
  }
}

// Yield Modal Handlers
function openRecordYieldModal(investmentId, investmentName) {
  const modal = document.getElementById('yield-modal');
  const form = document.getElementById('yield-form');
  
  form.reset();
  document.getElementById('yield-investment-id').value = investmentId;
  document.getElementById('yield-investment-name-display').textContent = investmentName;
  document.getElementById('yield-date').value = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  
  modal.classList.add('active');
}

function closeYieldModal() {
  document.getElementById('yield-modal').classList.remove('active');
}

async function handleYieldSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('yield-investment-id').value;
  const body = {
    amount: parseFloat(document.getElementById('yield-amount').value) || 0,
    type: document.getElementById('yield-type').value,
    date: document.getElementById('yield-date').value,
    status: document.getElementById('yield-status').value,
    notes: document.getElementById('yield-notes').value
  };

  const result = await apiCall(`/investments/${id}/returns`, 'POST', body);
  if (result) {
    showToast(`Yield logged as "${body.status}".`, 'success');
    closeYieldModal();
    await fetchInvestments();
    await fetchJournals();
    await fetchReconciliation();
    await fetchAccounts();
  }
}

// Quick collection trigger
async function handleCollectPendingYield(investmentId, returnId) {
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const result = await apiCall(`/investments/${investmentId}/returns/${returnId}/status`, 'PUT', {
    status: 'Received',
    date: simDate
  });
  if (result) {
    showToast('Pending yield payout collected and cash debited!', 'success');
    await fetchInvestments();
    await fetchJournals();
    await fetchReconciliation();
    await fetchAccounts();
  }
}

// Exit Modal Handlers
function openExitModal(investmentId, investmentName, initialCost) {
  const modal = document.getElementById('exit-modal');
  const form = document.getElementById('exit-form');
  
  form.reset();
  document.getElementById('exit-investment-id').value = investmentId;
  document.getElementById('exit-investment-name-display').textContent = investmentName;
  document.getElementById('exit-initial-cost-display').textContent = formatValue(initialCost, '£');
  document.getElementById('exit-date').value = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  
  modal.classList.add('active');
}

function closeExitModal() {
  document.getElementById('exit-modal').classList.remove('active');
}

async function handleExitSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('exit-investment-id').value;
  const body = {
    action: 'exit',
    exitValue: parseFloat(document.getElementById('exit-value').value) || 0,
    exitDate: document.getElementById('exit-date').value
  };

  const result = await apiCall(`/investments/${id}`, 'PUT', body);
  if (result) {
    showToast('Holding exited and gain/loss ledger journals posted!', 'success');
    closeExitModal();
    await fetchInvestments();
    await fetchJournals();
    await fetchReconciliation();
    await fetchAccounts();
  }
}

// Expose handlers to window
window.openRecordYieldModal = openRecordYieldModal;
window.handleCollectPendingYield = handleCollectPendingYield;
window.openExitModal = openExitModal;
window.openInvestmentModal = openInvestmentModal;
window.handleDeleteInvestment = handleDeleteInvestment;
window.closeInvestmentModal = closeInvestmentModal;
window.closeYieldModal = closeYieldModal;
window.closeExitModal = closeExitModal;
window.investments = investments;

// --- IT TASKS & OPERATIONS LOGIC ---

// Fetch functions
async function fetchITTasks() {
  const data = await apiCall('/it-tasks');
  if (Array.isArray(data)) itTasks = data;
}

async function fetchITIncidents() {
  const data = await apiCall('/it-incidents');
  if (Array.isArray(data)) itIncidents = data;
}

async function fetchITChanges() {
  const data = await apiCall('/it-changes');
  if (Array.isArray(data)) itChanges = data;
}

async function fetchITDeployments() {
  const data = await apiCall('/it-deployments');
  if (Array.isArray(data)) itDeployments = data;
}

// Helpers
function getITTaskCompany(task) {
  const staffName = task.assignedTo;
  const emp = employees.find(e => e.name === staffName);
  if (emp) {
    return emp.company;
  }
  if (task.website) {
    if (task.website.includes('pearls-developers')) return 'Pearls Developers Limited';
    if (task.website.includes('pearls-it')) return 'Pearls IT';
  }
  if (task.type === 'SysAdmin') return 'Pearls IT';
  return 'Pearls Developers Limited';
}

function getDeploymentCompany(dep) {
  if (dep.website && dep.website.includes('pearls-developers')) {
    return 'Pearls Developers Limited';
  }
  return 'Pearls IT';
}

function getFilteredITTasks() {
  if (activeITCompany === 'Consolidated') return itTasks;
  return itTasks.filter(t => getITTaskCompany(t) === activeITCompany);
}

function getFilteredITIncidents() {
  if (activeITCompany === 'Consolidated') return itIncidents;
  if (activeITCompany === 'Pearls IT') return itIncidents;
  return [];
}

function getFilteredITChanges() {
  if (activeITCompany === 'Consolidated') return itChanges;
  if (activeITCompany === 'Pearls IT') return itChanges;
  return [];
}

function getFilteredITDeployments() {
  if (activeITCompany === 'Consolidated') return itDeployments;
  return itDeployments.filter(d => getDeploymentCompany(d) === activeITCompany);
}

// KPIs computation
function calculateAndRenderITMetrics() {
  const filteredTasks = getFilteredITTasks();
  const activeDateStr = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const activeDate = new Date(activeDateStr);

  let sysadminOpen = 0;
  let webdevOpen = 0;
  let overdueTasks = 0;
  let blockedTasks = 0;

  filteredTasks.forEach(t => {
    const isClosedOrResolved = t.status === 'Closed' || t.status === 'Resolved';
    if (!isClosedOrResolved) {
      if (t.type === 'SysAdmin') sysadminOpen++;
      if (t.type === 'WebDev') webdevOpen++;
      if (t.status === 'Blocked') blockedTasks++;
      
      if (t.dueDate) {
        const dueDate = new Date(t.dueDate);
        if (dueDate < activeDate) {
          overdueTasks++;
        }
      }
    }
  });

  const completedTasks = filteredTasks.filter(t => t.status === 'Closed' || t.status === 'Resolved');
  let totalEst = 0;
  let totalAct = 0;
  completedTasks.forEach(t => {
    totalEst += parseFloat(t.estimatedHours) || 0;
    totalAct += parseFloat(t.actualHours) || 0;
  });
  const velocity = totalEst > 0 ? Math.round((totalEst / (totalAct || 1)) * 100) : 100;

  document.getElementById('it-stat-sysadmin-open').textContent = sysadminOpen;
  document.getElementById('it-stat-webdev-open').textContent = webdevOpen;
  document.getElementById('it-stat-overdue-tasks').textContent = overdueTasks;
  document.getElementById('it-stat-sprint-velocity').textContent = `${velocity}%`;
  document.getElementById('it-stat-blocked-tasks').textContent = blockedTasks;
  
  const overdueSub = document.getElementById('it-stat-overdue-sub');
  if (overdueTasks > 0) {
    overdueSub.textContent = 'Requires Attention';
    overdueSub.style.color = 'var(--state-danger)';
  } else {
    overdueSub.textContent = 'All Schedule Clear';
    overdueSub.style.color = 'var(--color-text-muted)';
  }
}

// Sub-Tab router
function renderITSubTab() {
  calculateAndRenderITMetrics();
  
  if (activeITTab === 'dashboard') {
    renderITDashboard();
  } else if (activeITTab === 'sysadmin') {
    renderSysAdminConsole();
  } else if (activeITTab === 'webdev') {
    renderWebDevConsole();
  } else if (activeITTab === 'reports') {
    renderITReports();
  }
}

// Dashboard Panel renderer
function renderITDashboard() {
  const filteredIncidents = getFilteredITIncidents();
  const activeIncidents = filteredIncidents.filter(inc => inc.status !== 'Resolved');
  const incidentsList = document.getElementById('it-dashboard-incidents-list');
  
  incidentsList.innerHTML = '';
  if (activeIncidents.length === 0) {
    incidentsList.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="padding:15px;">No active incident alerts. System normal.</td></tr>`;
  } else {
    activeIncidents.forEach(inc => {
      let severityBadge = `<span class="badge-medium">Medium</span>`;
      if (inc.severity === 'Critical') severityBadge = `<span class="badge-critical">Critical</span>`;
      if (inc.severity === 'High') severityBadge = `<span class="badge-high">High</span>`;
      if (inc.severity === 'Low') severityBadge = `<span class="badge-low">Low</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:#fff;">${inc.title}</td>
        <td>${severityBadge}</td>
        <td><span class="status-badge status-warning" style="padding: 2px 6px; border-radius:4px; font-size:11px; font-weight:700;">${inc.status}</span></td>
      `;
      incidentsList.appendChild(tr);
    });
  }

  const filteredChanges = getFilteredITChanges();
  const upcomingChanges = filteredChanges.filter(chg => chg.status !== 'Implemented' && chg.status !== 'Rolled Back');
  const changesList = document.getElementById('it-dashboard-changes-list');
  
  changesList.innerHTML = '';
  if (upcomingChanges.length === 0) {
    changesList.innerHTML = `<tr><td colspan="3" class="text-center text-muted" style="padding:15px;">No scheduled changes in queue.</td></tr>`;
  } else {
    upcomingChanges.forEach(chg => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:#fff;">${chg.title}</td>
        <td>${chg.dateScheduled}</td>
        <td><span class="status-badge status-info" style="padding: 2px 6px; border-radius:4px; font-size:11px; font-weight:700;">${chg.status}</span></td>
      `;
      changesList.appendChild(tr);
    });
  }
}

// SysAdmin Console Panel renderer
function renderSysAdminConsole() {
  const filteredTasks = getFilteredITTasks();
  const sysadminTasks = filteredTasks.filter(t => t.type === 'SysAdmin');
  const tbody = document.getElementById('it-sysadmin-tasks-body');
  
  tbody.innerHTML = '';
  if (sysadminTasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:15px;">No System Admin tasks registered.</td></tr>`;
  } else {
    sysadminTasks.forEach(t => {
      let priorityBadge = `<span class="badge-medium">Medium</span>`;
      if (t.priority === 'Critical') priorityBadge = `<span class="badge-critical">Critical</span>`;
      if (t.priority === 'High') priorityBadge = `<span class="badge-high">High</span>`;
      if (t.priority === 'Low') priorityBadge = `<span class="badge-low">Low</span>`;

      let statusClass = 'status-info';
      if (t.status === 'Closed' || t.status === 'Resolved') statusClass = 'status-success';
      if (t.status === 'Blocked') statusClass = 'status-danger';
      if (t.status === 'In Progress') statusClass = 'status-warning';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace; font-size:11px;">${t.id}</td>
        <td style="font-weight:600; color:#fff;">${t.title}</td>
        <td>${t.category}</td>
        <td>${priorityBadge}</td>
        <td>👤 ${t.assignedTo || 'Unassigned'}</td>
        <td><span class="status-badge ${statusClass}">${t.status}</span></td>
        <td>${t.dueDate || 'N/A'}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openITTaskModal('${t.id}')" style="padding: 2px 6px; font-size:11px; margin-right:4px;"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="deleteITTask('${t.id}')" style="padding: 2px 6px; font-size:11px; background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.2); color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const incidents = getFilteredITIncidents();
  const incBody = document.getElementById('it-sysadmin-incidents-body');
  incBody.innerHTML = '';
  if (incidents.length === 0) {
    incBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:15px;">No logged incidents.</td></tr>`;
  } else {
    incidents.forEach(inc => {
      let severityBadge = `<span class="badge-medium">Medium</span>`;
      if (inc.severity === 'Critical') severityBadge = `<span class="badge-critical">Critical</span>`;
      if (inc.severity === 'High') severityBadge = `<span class="badge-high">High</span>`;
      if (inc.severity === 'Low') severityBadge = `<span class="badge-low">Low</span>`;

      let statusClass = 'status-warning';
      if (inc.status === 'Resolved') statusClass = 'status-success';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace; font-size:11px;">${inc.id}</td>
        <td style="font-weight:600; color:#fff;">${inc.title}</td>
        <td>${severityBadge}</td>
        <td><span class="status-badge ${statusClass}">${inc.status}</span></td>
        <td>${inc.resolution || '<span style="color:var(--color-text-muted);">Pending fix...</span>'}</td>
      `;
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => openIncidentModal(inc));
      incBody.appendChild(tr);
    });
  }

  const changes = getFilteredITChanges();
  const chgBody = document.getElementById('it-sysadmin-changes-body');
  chgBody.innerHTML = '';
  if (changes.length === 0) {
    chgBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:15px;">No change logs registered.</td></tr>`;
  } else {
    changes.forEach(chg => {
      let statusClass = 'status-info';
      if (chg.status === 'Implemented') statusClass = 'status-success';
      if (chg.status === 'Rolled Back') statusClass = 'status-danger';

      let impactBadge = `<span class="badge-medium">Medium</span>`;
      if (chg.impact === 'High') impactBadge = `<span class="badge-high">High</span>`;
      if (chg.impact === 'Low') impactBadge = `<span class="badge-low">Low</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace; font-size:11px;">${chg.id}</td>
        <td style="font-weight:600; color:#fff;">${chg.title}</td>
        <td>${chg.dateScheduled}</td>
        <td>${impactBadge}</td>
        <td><span class="status-badge ${statusClass}">${chg.status}</span></td>
      `;
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => openChangeModal(chg));
      chgBody.appendChild(tr);
    });
  }
}

// WebDev Console Panel renderer
function renderWebDevConsole() {
  const filteredTasks = getFilteredITTasks();
  const webdevTasks = filteredTasks.filter(t => t.type === 'WebDev');
  const tbody = document.getElementById('it-webdev-tasks-body');
  
  tbody.innerHTML = '';
  if (webdevTasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:15px;">No WebDev tasks registered.</td></tr>`;
  } else {
    webdevTasks.forEach(t => {
      let priorityBadge = `<span class="badge-medium">Medium</span>`;
      if (t.priority === 'Critical') priorityBadge = `<span class="badge-critical">Critical</span>`;
      if (t.priority === 'High') priorityBadge = `<span class="badge-high">High</span>`;
      if (t.priority === 'Low') priorityBadge = `<span class="badge-low">Low</span>`;

      let statusClass = 'status-info';
      if (t.status === 'Closed' || t.status === 'Resolved') statusClass = 'status-success';
      if (t.status === 'Blocked') statusClass = 'status-danger';
      if (t.status === 'In Progress') statusClass = 'status-warning';

      const websiteTag = t.website ? `<br><span class="website-badge">${t.website}</span>` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace; font-size:11px;">${t.id}</td>
        <td style="font-weight:600; color:#fff;">${t.title}${websiteTag}</td>
        <td>${t.category}</td>
        <td>${priorityBadge}</td>
        <td>👤 ${t.assignedTo || 'Unassigned'}</td>
        <td style="font-size:12px;">Est: <strong>${t.estimatedHours}h</strong><br>Act: <strong>${t.actualHours || 0}h</strong></td>
        <td style="font-family:monospace; font-size:11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.githubCommit || '<span style="color:var(--color-text-muted);">-</span>'}</td>
        <td><span class="status-badge ${statusClass}">${t.status}</span></td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openITTaskModal('${t.id}')" style="padding: 2px 6px; font-size:11px; margin-right:4px;"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="deleteITTask('${t.id}')" style="padding: 2px 6px; font-size:11px; background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.2); color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const deploys = getFilteredITDeployments();
  const depBody = document.getElementById('it-webdev-deployments-body');
  depBody.innerHTML = '';
  if (deploys.length === 0) {
    depBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:15px;">No deployment logs registered.</td></tr>`;
  } else {
    deploys.forEach(dep => {
      const statusClass = dep.status === 'Success' ? 'status-success' : 'status-danger';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family:monospace; font-size:11px;">${dep.id}</td>
        <td style="font-weight:600; color:#fff;">${dep.website}</td>
        <td><strong style="color:var(--accent-purple);">${dep.version}</strong></td>
        <td>${dep.deployDate}</td>
        <td>👤 ${dep.deployedBy}</td>
        <td style="font-family:monospace; font-size:11px;">${dep.commitRef}</td>
        <td><span class="status-badge ${statusClass}">${dep.status}</span></td>
      `;
      depBody.appendChild(tr);
    });
  }
}

// Reports Tab renderer
function renderITReports() {
  const filteredTasks = getFilteredITTasks();
  const filteredIncidents = getFilteredITIncidents();
  const filteredDeployments = getFilteredITDeployments();

  // 1. Workload Allocation
  const workloadBody = document.getElementById('it-report-workload-body');
  workloadBody.innerHTML = '';
  
  const assigneesMap = {};
  filteredTasks.forEach(t => {
    const name = t.assignedTo || 'Unassigned';
    if (!assigneesMap[name]) {
      assigneesMap[name] = { total: 0, open: 0, resolved: 0, blocked: 0 };
    }
    assigneesMap[name].total++;
    const isClosedOrResolved = t.status === 'Closed' || t.status === 'Resolved';
    if (isClosedOrResolved) {
      assigneesMap[name].resolved++;
    } else {
      assigneesMap[name].open++;
      if (t.status === 'Blocked') {
        assigneesMap[name].blocked++;
      }
    }
  });

  const assigneeNames = Object.keys(assigneesMap);
  if (assigneeNames.length === 0) {
    workloadBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:15px;">No tasks workload tracked.</td></tr>`;
  } else {
    assigneeNames.forEach(name => {
      const stat = assigneesMap[name];
      const rate = Math.round((stat.resolved / (stat.total || 1)) * 100);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:#fff;">👤 ${name}</td>
        <td style="text-align:right;">${stat.total}</td>
        <td style="text-align:right;">${stat.open}</td>
        <td style="text-align:right;">${stat.resolved}</td>
        <td style="text-align:right;">${stat.blocked}</td>
        <td style="text-align:center;">
          <div style="display:flex; align-items:center; gap:8px; justify-content:center;">
            <div style="flex:1; background:rgba(255,255,255,0.05); height:6px; border-radius:3px; max-width:80px; overflow:hidden;">
              <div style="width:${rate}%; background:var(--state-success); height:100%;"></div>
            </div>
            <strong>${rate}%</strong>
          </div>
        </td>
      `;
      workloadBody.appendChild(tr);
    });
  }

  // 2. Hours Variance
  const varianceBody = document.getElementById('it-report-hours-variance');
  const completedWebDev = filteredTasks.filter(t => t.type === 'WebDev' && (t.status === 'Closed' || t.status === 'Resolved'));
  const varTbody = document.getElementById('it-report-variance-body');
  varTbody.innerHTML = '';
  
  if (completedWebDev.length === 0) {
    varTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:15px;">No completed WebDev tasks found for hours variance analysis.</td></tr>`;
  } else {
    completedWebDev.forEach(t => {
      const est = parseFloat(t.estimatedHours) || 0;
      const act = parseFloat(t.actualHours) || 0;
      const diff = act - est;
      const diffPct = est > 0 ? Math.round((diff / est) * 100) : 0;
      
      const diffText = diff > 0 ? `+${diff.toFixed(1)}h` : `${diff.toFixed(1)}h`;
      const diffPctText = diff > 0 ? `+${diffPct}%` : `${diffPct}%`;
      const colorClass = diff > 0 ? 'text-danger' : (diff < 0 ? 'text-success' : '');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:#fff;">${t.title}</td>
        <td>👤 ${t.assignedTo}</td>
        <td style="text-align:right;">${est.toFixed(1)}h</td>
        <td style="text-align:right;">${act.toFixed(1)}h</td>
        <td style="text-align:right;" class="${colorClass}"><strong>${diffText}</strong></td>
        <td style="text-align:center;" class="${colorClass}"><strong>${diffPctText}</strong></td>
      `;
      varTbody.appendChild(tr);
    });
  }

  // 3. Incident MTTR
  const resolvedInc = filteredIncidents.filter(inc => inc.status === 'Resolved');
  const mttrValEl = document.getElementById('it-report-mttr-val');
  const mttrTbody = document.getElementById('it-report-mttr-body');
  mttrTbody.innerHTML = '';

  let totalMTTRHours = 0;
  if (resolvedInc.length === 0) {
    mttrValEl.textContent = '0.0 Hours';
    mttrTbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding:15px;">No resolved incidents to compute MTTR.</td></tr>`;
  } else {
    resolvedInc.forEach((inc) => {
      let mttr = 4.0;
      if (inc.title.includes('Database Outage')) mttr = 2.5;
      if (inc.title.includes('Memory')) mttr = 6.0;
      
      totalMTTRHours += mttr;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:#fff;">${inc.title}</td>
        <td>${inc.date}</td>
        <td><span class="badge-critical">${inc.severity}</span></td>
        <td><strong class="text-success">${mttr.toFixed(1)} hours to fix</strong></td>
      `;
      mttrTbody.appendChild(tr);
    });

    const averageMTTR = totalMTTRHours / resolvedInc.length;
    mttrValEl.textContent = `${averageMTTR.toFixed(1)} Hours`;
  }

  // 4. Deployment metrics
  const successDeploys = filteredDeployments.filter(d => d.status === 'Success');
  const totalDeploys = filteredDeployments.length;
  const deployRate = totalDeploys > 0 ? Math.round((successDeploys.length / totalDeploys) * 100) : 100;
  
  document.getElementById('it-report-deploys-rate').textContent = `${deployRate}%`;
  document.getElementById('it-report-deploys-count').textContent = `${successDeploys.length} / ${totalDeploys} Successful Deploys`;

  const targetsMap = {};
  filteredDeployments.forEach(d => {
    targetsMap[d.website] = (targetsMap[d.website] || 0) + 1;
  });
  let primaryTarget = 'N/A';
  let maxCount = 0;
  Object.keys(targetsMap).forEach(key => {
    if (targetsMap[key] > maxCount) {
      maxCount = targetsMap[key];
      primaryTarget = key;
    }
  });
  document.getElementById('it-report-deploys-primary').textContent = primaryTarget;

  const deployReportTbody = document.getElementById('it-report-deploys-body');
  deployReportTbody.innerHTML = '';
  if (filteredDeployments.length === 0) {
    deployReportTbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding:15px;">No deployments tracked.</td></tr>`;
  } else {
    filteredDeployments.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600; color:#fff;">${d.id} (${d.version})</td>
        <td>${d.deployDate}</td>
        <td>${d.website}</td>
        <td><span class="status-badge ${d.status === 'Success' ? 'status-success' : 'status-danger'}">${d.status}</span></td>
      `;
      deployReportTbody.appendChild(tr);
    });
  }
}

// Modals actions launchers & controllers

// Task modal
function openITTaskModal(taskId = null, defaultType = 'WebDev') {
  const modal = document.getElementById('it-task-modal');
  const form = document.getElementById('it-task-form');
  form.reset();

  const staffDropdown = document.getElementById('it-task-assigned-to');
  staffDropdown.innerHTML = '<option value="">-- Select Assignee --</option>';
  employees.forEach(emp => {
    staffDropdown.innerHTML += `<option value="${emp.name}">${emp.name} (${emp.company})</option>`;
  });

  if (taskId) {
    document.getElementById('it-task-modal-title').textContent = 'Edit IT Task Record';
    const task = itTasks.find(t => t.id === taskId);
    if (task) {
      document.getElementById('it-task-id').value = task.id;
      document.getElementById('it-task-title').value = task.title;
      document.getElementById('it-task-type').value = task.type;
      document.getElementById('it-task-category').value = task.category;
      document.getElementById('it-task-priority').value = task.priority;
      document.getElementById('it-task-status').value = task.status;
      document.getElementById('it-task-assigned-to').value = task.assignedTo || '';
      document.getElementById('it-task-due-date').value = task.dueDate || '';
      document.getElementById('it-task-est-hours').value = task.estimatedHours || 0;
      document.getElementById('it-task-act-hours').value = task.actualHours || 0;
      document.getElementById('it-task-website').value = task.website || '';
      document.getElementById('it-task-commit').value = task.githubCommit || '';
      document.getElementById('it-task-notes').value = task.notes || '';

      if (task.type === 'WebDev') {
        document.getElementById('it-task-website-group').style.display = 'block';
        document.getElementById('it-task-commit-group').style.display = 'block';
      } else {
        document.getElementById('it-task-website-group').style.display = 'none';
        document.getElementById('it-task-commit-group').style.display = 'none';
      }
    }
  } else {
    document.getElementById('it-task-modal-title').textContent = 'Log New IT Operations Task';
    document.getElementById('it-task-id').value = '';
    document.getElementById('it-task-type').value = defaultType;
    document.getElementById('it-task-due-date').value = systemStatus.simulatedDate || new Date().toISOString().substring(0,10);
    
    if (defaultType === 'WebDev') {
      document.getElementById('it-task-category').value = 'Development';
      document.getElementById('it-task-website-group').style.display = 'block';
      document.getElementById('it-task-commit-group').style.display = 'block';
    } else {
      document.getElementById('it-task-category').value = 'Server Maintenance';
      document.getElementById('it-task-website-group').style.display = 'none';
      document.getElementById('it-task-commit-group').style.display = 'none';
    }
  }
  
  modal.classList.add('active');
}

function closeITTaskModal() {
  document.getElementById('it-task-modal').classList.remove('active');
}

async function handleITTaskSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('it-task-id').value;
  
  const body = {
    title: document.getElementById('it-task-title').value,
    type: document.getElementById('it-task-type').value,
    category: document.getElementById('it-task-category').value,
    priority: document.getElementById('it-task-priority').value,
    status: document.getElementById('it-task-status').value,
    assignedTo: document.getElementById('it-task-assigned-to').value,
    dueDate: document.getElementById('it-task-due-date').value,
    estimatedHours: parseFloat(document.getElementById('it-task-est-hours').value) || 0,
    actualHours: parseFloat(document.getElementById('it-task-act-hours').value) || 0,
    website: document.getElementById('it-task-website').value,
    githubCommit: document.getElementById('it-task-commit').value,
    notes: document.getElementById('it-task-notes').value
  };

  let result;
  if (id) {
    result = await apiCall(`/it-tasks/${id}`, 'PUT', body);
    if (result) showToast(`IT Task ${id} updated successfully!`, 'success');
  } else {
    result = await apiCall('/it-tasks', 'POST', body);
    if (result) showToast('New IT task created and assigned!', 'success');
  }

  if (result) {
    closeITTaskModal();
    await fetchITTasks();
    renderITSubTab();
  }
}

async function deleteITTask(taskId) {
  if (confirm(`Are you sure you want to delete IT Task ${taskId}?`)) {
    const result = await apiCall(`/it-tasks/${taskId}`, 'DELETE');
    if (result) {
      showToast(`Task ${taskId} removed.`, 'success');
      await fetchITTasks();
      renderITSubTab();
    }
  }
}

// Incident modals
function openIncidentModal(incident = null) {
  const modal = document.getElementById('it-incident-modal');
  const form = document.getElementById('it-incident-form');
  form.reset();

  if (incident) {
    document.getElementById('it-incident-modal-title').textContent = 'Update Incident Record';
    document.getElementById('it-incident-id').value = incident.id;
    document.getElementById('it-incident-title').value = incident.title;
    document.getElementById('it-incident-severity').value = incident.severity;
    document.getElementById('it-incident-status').value = incident.status;
    document.getElementById('it-incident-root-cause').value = incident.rootCause || '';
    document.getElementById('it-incident-resolution').value = incident.resolution || '';
  } else {
    document.getElementById('it-incident-modal-title').textContent = 'Log Production Server Outage / Bug';
    document.getElementById('it-incident-id').value = '';
  }

  modal.classList.add('active');
}

function closeITIncidentModal() {
  document.getElementById('it-incident-modal').classList.remove('active');
}

async function handleIncidentSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('it-incident-id').value;
  
  const body = {
    title: document.getElementById('it-incident-title').value,
    severity: document.getElementById('it-incident-severity').value,
    status: document.getElementById('it-incident-status').value,
    rootCause: document.getElementById('it-incident-root-cause').value,
    resolution: document.getElementById('it-incident-resolution').value,
    date: systemStatus.simulatedDate || new Date().toISOString().substring(0, 10)
  };

  let result;
  if (id) {
    result = await apiCall(`/it-incidents/${id}`, 'PUT', body);
    if (result) showToast(`Incident ${id} updated successfully!`, 'success');
  } else {
    result = await apiCall('/it-incidents', 'POST', body);
    if (result) showToast('Production incident logged. Admin alerted.', 'success');
  }

  if (result) {
    closeITIncidentModal();
    await fetchITIncidents();
    renderITSubTab();
  }
}

// Change management modals
function openChangeModal(change = null) {
  const modal = document.getElementById('it-change-modal');
  const form = document.getElementById('it-change-form');
  form.reset();

  if (change) {
    document.getElementById('it-change-modal-title').textContent = 'Update Change Record';
    document.getElementById('it-change-id').value = change.id;
    document.getElementById('it-change-title').value = change.title;
    document.getElementById('it-change-requested-by').value = change.requestedBy;
    document.getElementById('it-change-date').value = change.dateScheduled;
    document.getElementById('it-change-impact').value = change.impact;
    document.getElementById('it-change-status').value = change.status;
    document.getElementById('it-change-testing-notes').value = change.testingNotes || '';
  } else {
    document.getElementById('it-change-modal-title').textContent = 'Schedule Infrastructure Change';
    document.getElementById('it-change-id').value = '';
    document.getElementById('it-change-date').value = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  }

  modal.classList.add('active');
}

function closeITChangeModal() {
  document.getElementById('it-change-modal').classList.remove('active');
}

async function handleChangeSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('it-change-id').value;
  
  const body = {
    title: document.getElementById('it-change-title').value,
    requestedBy: document.getElementById('it-change-requested-by').value,
    dateScheduled: document.getElementById('it-change-date').value,
    impact: document.getElementById('it-change-impact').value,
    status: document.getElementById('it-change-status').value,
    testingNotes: document.getElementById('it-change-testing-notes').value
  };

  let result;
  if (id) {
    result = await apiCall(`/it-changes/${id}`, 'PUT', body);
    if (result) showToast(`Change Record ${id} updated successfully!`, 'success');
  } else {
    result = await apiCall('/it-changes', 'POST', body);
    if (result) showToast('Change management ticket scheduled.', 'success');
  }

  if (result) {
    closeITChangeModal();
    await fetchITChanges();
    renderITSubTab();
  }
}

// Deployments modal
function openDeploymentModal() {
  const modal = document.getElementById('it-deployment-modal');
  const form = document.getElementById('it-deployment-form');
  form.reset();
  
  document.getElementById('it-deploy-website').value = 'tracker.pearls-developers-limited.co.uk';
  document.getElementById('it-deploy-by').value = localStorage.getItem('subpulse_username') || 'Jane Doe';
  
  modal.classList.add('active');
}

function closeITDeploymentModal() {
  document.getElementById('it-deployment-modal').classList.remove('active');
}

async function handleDeploymentSubmit(e) {
  e.preventDefault();
  
  const body = {
    website: document.getElementById('it-deploy-website').value,
    version: document.getElementById('it-deploy-version').value,
    deployedBy: document.getElementById('it-deploy-by').value,
    commitRef: document.getElementById('it-deploy-commit').value,
    status: document.getElementById('it-deploy-status').value,
    deployDate: systemStatus.simulatedDate || new Date().toISOString().substring(0, 10)
  };

  const result = await apiCall('/it-deployments', 'POST', body);
  if (result) {
    showToast(`Version ${body.version} deployment registered!`, 'success');
    closeITDeploymentModal();
    await fetchITDeployments();
    renderITSubTab();
  }
}

// Expose handlers to window
window.openITTaskModal = openITTaskModal;
window.deleteITTask = deleteITTask;
window.openIncidentModal = openIncidentModal;
window.openChangeModal = openChangeModal;
window.openDeploymentModal = openDeploymentModal;

window.closeITTaskModal = closeITTaskModal;
window.closeITIncidentModal = closeITIncidentModal;
window.closeITChangeModal = closeITChangeModal;
window.closeITDeploymentModal = closeITDeploymentModal;

window.itTasks = itTasks;
window.itIncidents = itIncidents;
window.itChanges = itChanges;
window.itDeployments = itDeployments;
window.calculateAndRenderITMetrics = calculateAndRenderITMetrics;
window.renderITSubTab = renderITSubTab;

// --- LEGALS CONTROLLERS & RENDERING ---

async function fetchContracts() {
  const data = await apiCall('/contracts');
  if (data) contracts = data;
}

async function fetchCases() {
  const data = await apiCall('/cases');
  if (data) cases = data;
}

async function fetchCompliance() {
  const data = await apiCall('/compliance');
  if (data) compliance = data;
}

function calculateAndRenderLegalsMetrics() {
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  
  const filterByCompany = (item) => {
    if (activeLegalsCompany === 'Consolidated') return true;
    return item.company === activeLegalsCompany;
  };

  const filteredContracts = contracts.filter(filterByCompany);
  const filteredCases = cases.filter(filterByCompany);
  const filteredCompliance = compliance.filter(filterByCompany);

  // 1. Active Cases
  const activeCasesCount = filteredCases.filter(c => c.status === 'Active' || c.status === 'Appealing').length;
  document.getElementById('legals-stat-active-cases').textContent = activeCasesCount;

  // 2. Upcoming Court Dates
  const upcomingCourtCount = filteredCases.filter(c => {
    if (!c.courtDate || (c.status !== 'Active' && c.status !== 'Appealing')) return false;
    return c.courtDate >= simDate;
  }).length;
  document.getElementById('legals-stat-upcoming-court').textContent = upcomingCourtCount;

  // 3. Expiring Contracts
  const expiringContractsCount = filteredContracts.filter(c => {
    if (!c.expiryDate || c.status === 'Expired' || c.status === 'Terminated') return false;
    const diffDays = getDaysDifferenceForInv(simDate, c.expiryDate);
    return diffDays >= 0 && diffDays <= 30;
  }).length;
  document.getElementById('legals-stat-expiring-contracts').textContent = expiringContractsCount;

  // 4. Compliance Items Due
  const complianceDueCount = filteredCompliance.filter(c => c.status === 'Pending').length;
  document.getElementById('legals-stat-compliance-due').textContent = complianceDueCount;
}

function renderLegalsSubTab() {
  if (activeLegalsTab === 'dashboard') {
    renderLegalsDashboard();
  } else if (activeLegalsTab === 'contracts') {
    renderContracts();
  } else if (activeLegalsTab === 'cases') {
    renderCases();
  } else if (activeLegalsTab === 'compliance') {
    renderCompliance();
  } else if (activeLegalsTab === 'reports') {
    renderLegalsReports();
  }
}

function renderLegalsDashboard() {
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const filterByCompany = (item) => {
    if (activeLegalsCompany === 'Consolidated') return true;
    return item.company === activeLegalsCompany;
  };

  const filteredContracts = contracts.filter(filterByCompany);
  const filteredCases = cases.filter(filterByCompany);
  const filteredCompliance = compliance.filter(filterByCompany);

  // 1. Court Hearings Timeline
  const timelineContainer = document.getElementById('legals-court-timeline');
  timelineContainer.innerHTML = '';
  
  const courtCases = filteredCases.filter(c => c.courtDate && (c.status === 'Active' || c.status === 'Appealing'))
    .sort((a, b) => a.courtDate.localeCompare(b.courtDate));

  if (courtCases.length === 0) {
    timelineContainer.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No upcoming court hearings scheduled.</p></div>';
  } else {
    courtCases.forEach(c => {
      const isPast = c.courtDate < simDate;
      const card = document.createElement('div');
      card.className = 'log-item glass-panel';
      card.style.borderLeft = isPast ? '4px solid var(--state-danger)' : '4px solid var(--accent-cyan)';
      card.style.marginBottom = '10px';
      
      card.innerHTML = `
        <div class="log-title-row">
          <span style="font-size: 14px; font-weight: 700; color: #fff;">${c.title}</span>
          <span class="badge ${isPast ? 'badge-danger' : 'badge-log-mock'}">${isPast ? 'Passed' : 'Upcoming'}</span>
        </div>
        <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 6px;">
          <span><i class="fa-solid fa-building-columns"></i> ${c.jurisdiction || 'N/A'}</span> &nbsp;|&nbsp;
          <span><i class="fa-solid fa-user-shield"></i> ${c.assignedCounsel || 'Unassigned'}</span>
        </div>
        <div style="font-size: 11px; font-weight: 600; color: var(--accent-indigo); margin-top: 6px;">
          <i class="fa-solid fa-calendar-check"></i> Court Date: ${c.courtDate} ${isPast ? '(Overdue)' : ''}
        </div>
      `;
      timelineContainer.appendChild(card);
    });
  }

  // 2. Soon Expiring Contracts
  const expiringList = document.getElementById('legals-expiring-contracts-list');
  expiringList.innerHTML = '';

  const expiringContracts = filteredContracts.filter(c => {
    if (!c.expiryDate || c.status === 'Expired' || c.status === 'Terminated') return false;
    const diff = getDaysDifferenceForInv(simDate, c.expiryDate);
    return diff >= 0 && diff <= 30;
  }).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  if (expiringContracts.length === 0) {
    expiringList.innerHTML = '<div class="empty-log-state">No contracts expiring within 30 days.</div>';
  } else {
    expiringContracts.forEach(c => {
      const diff = getDaysDifferenceForInv(simDate, c.expiryDate);
      const item = document.createElement('div');
      item.className = 'log-item';
      item.innerHTML = `
        <div class="log-title-row">
          <span>${c.title}</span>
          <span class="badge badge-warning" style="font-size: 9px;">${diff} days left</span>
        </div>
        <div class="log-body-preview" style="font-size: 10px; margin-top: 4px;">
          Expires: ${c.expiryDate} | ${c.company}
        </div>
      `;
      expiringList.appendChild(item);
    });
  }

  // 3. Urgent Compliance Tasks
  const complianceList = document.getElementById('legals-urgent-compliance-list');
  complianceList.innerHTML = '';

  const pendingCompliance = filteredCompliance.filter(c => c.status === 'Pending')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (pendingCompliance.length === 0) {
    complianceList.innerHTML = '<div class="empty-log-state">No pending compliance items.</div>';
  } else {
    pendingCompliance.forEach(c => {
      const isOverdue = c.dueDate < simDate;
      const item = document.createElement('div');
      item.className = 'log-item';
      item.innerHTML = `
        <div class="log-title-row">
          <span>${c.title}</span>
          <span class="badge ${isOverdue ? 'badge-danger' : 'badge-log-real'}" style="font-size: 9px;">${isOverdue ? 'Overdue' : 'Pending'}</span>
        </div>
        <div class="log-body-preview" style="font-size: 10px; margin-top: 4px; color: ${isOverdue ? 'var(--state-danger)' : 'var(--color-text-muted)'}">
          Due Date: ${c.dueDate} | Assigned to: ${c.assignedTo || 'Unassigned'}
        </div>
      `;
      complianceList.appendChild(item);
    });
  }
}

function renderContracts() {
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const searchVal = document.getElementById('contracts-search').value.toLowerCase();
  const filterType = document.getElementById('contracts-filter-type').value;

  const tbody = document.getElementById('contracts-list-body');
  tbody.innerHTML = '';

  const filtered = contracts.filter(c => {
    if (activeLegalsCompany !== 'Consolidated' && c.company !== activeLegalsCompany) return false;
    if (filterType && c.type !== filterType) return false;
    if (searchVal) {
      const titleMatch = c.title.toLowerCase().includes(searchVal);
      const notesMatch = c.notes && c.notes.toLowerCase().includes(searchVal);
      const counselMatch = c.assignedCounsel && c.assignedCounsel.toLowerCase().includes(searchVal);
      if (!titleMatch && !notesMatch && !counselMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">No contracts found matching the filters.</td></tr>';
    return;
  }

  filtered.forEach(c => {
    let statusClass = 'badge-active';
    let displayStatus = c.status;
    if (c.expiryDate && c.expiryDate < simDate && c.status === 'Active') {
      statusClass = 'badge-danger';
      displayStatus = 'Expired';
    } else if (c.status === 'Expired' || c.status === 'Terminated') {
      statusClass = 'badge-danger';
    } else if (c.status === 'Under Review') {
      statusClass = 'badge-warning';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 600; color: #fff;">${c.title}</td>
      <td><span style="font-size: 11px; color: var(--accent-indigo);">${c.type}</span></td>
      <td><span style="font-size: 11px;">${c.company === 'Pearls IT' ? 'Pearls IT' : 'Pearls Developers'}</span></td>
      <td>${c.signDate}</td>
      <td>${c.expiryDate || '<span class="text-indigo" style="font-size: 11px;">Indefinite</span>'}</td>
      <td>${c.assignedCounsel || 'Unassigned'}</td>
      <td>${c.documentName ? `<a href="#" onclick="showToast('Simulating download of ${c.documentName}...', 'success'); return false;" class="text-cyan"><i class="fa-solid fa-file-pdf"></i> ${c.documentName}</a>` : '<span class="text-muted">None</span>'}</td>
      <td style="text-align: center;"><span class="badge ${statusClass}">${displayStatus}</span></td>
      <td style="text-align: center;">
        <div class="card-actions" style="justify-content: center;">
          <button class="btn-icon" onclick="openContractModal('${c.id}')"><i class="fa-solid fa-edit"></i></button>
          <button class="btn-icon btn-icon-delete" onclick="deleteContract('${c.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCases() {
  const searchVal = document.getElementById('cases-search').value.toLowerCase();
  const filterStatus = document.getElementById('cases-filter-status').value;
  const container = document.getElementById('cases-grid-body');
  container.innerHTML = '';

  const filtered = cases.filter(c => {
    if (activeLegalsCompany !== 'Consolidated' && c.company !== activeLegalsCompany) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (searchVal) {
      const titleMatch = c.title.toLowerCase().includes(searchVal);
      const counselMatch = c.assignedCounsel && c.assignedCounsel.toLowerCase().includes(searchVal);
      const jurisMatch = c.jurisdiction && c.jurisdiction.toLowerCase().includes(searchVal);
      if (!titleMatch && !counselMatch && !jurisMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><div class="empty-icon"><i class="fa-solid fa-gavel"></i></div><h3>No Legal Cases</h3><p>No legal matters recorded for the current filters.</p></div>';
    return;
  }

  filtered.forEach(c => {
    let cardAccent = 'card-purple';
    if (c.status === 'Settled') cardAccent = 'card-emerald';
    else if (c.status === 'Dismissed') cardAccent = 'card-cyan';
    else if (c.status === 'Appealing') cardAccent = 'card-amber';

    const card = document.createElement('div');
    card.className = `metric-card glass-panel ${cardAccent}`;
    card.style.flexDirection = 'column';
    card.style.alignItems = 'stretch';
    card.style.padding = '20px';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <h3 style="font-size: 16px; font-weight: 700; color: #fff; line-height: 1.3;">${c.title}</h3>
        <span class="badge ${c.status === 'Settled' ? 'badge-active' : (c.status === 'Active' ? 'badge-warning' : 'badge-danger')}">${c.status}</span>
      </div>
      <div style="font-size: 13px; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px;">
        <div><strong>Jurisdiction:</strong> ${c.jurisdiction || 'N/A'}</div>
        <div><strong>Counsel:</strong> ${c.assignedCounsel || 'Unassigned'}</div>
        <div><strong>Court Date:</strong> ${c.courtDate || 'None Scheduled'}</div>
        <div><strong>Entity:</strong> ${c.company}</div>
        <div style="font-size: 11px; margin-top: 6px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; max-height: 80px; overflow-y: auto;">
          ${c.notes || 'No case details recorded.'}
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
        <button class="btn btn-secondary btn-icon" onclick="openCaseModal('${c.id}')" style="height: 32px; width: 32px;"><i class="fa-solid fa-edit"></i></button>
        <button class="btn btn-secondary btn-icon btn-icon-delete" onclick="deleteCase('${c.id}')" style="height: 32px; width: 32px;"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderCompliance() {
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const searchVal = document.getElementById('compliance-search').value.toLowerCase();
  const filterStatus = document.getElementById('compliance-filter-status').value;
  const tbody = document.getElementById('compliance-list-body');
  tbody.innerHTML = '';

  const filtered = compliance.filter(c => {
    if (activeLegalsCompany !== 'Consolidated' && c.company !== activeLegalsCompany) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (searchVal) {
      const titleMatch = c.title.toLowerCase().includes(searchVal);
      const notesMatch = c.notes && c.notes.toLowerCase().includes(searchVal);
      const assignedMatch = c.assignedTo && c.assignedTo.toLowerCase().includes(searchVal);
      if (!titleMatch && !notesMatch && !assignedMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No compliance items logged.</td></tr>';
    return;
  }

  filtered.forEach(c => {
    const isCompleted = c.status === 'Completed';
    const isOverdue = !isCompleted && c.dueDate < simDate;
    
    const tr = document.createElement('tr');
    tr.style.opacity = isCompleted ? '0.7' : '1';
    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" style="width: 18px; height: 18px; cursor: pointer;" ${isCompleted ? 'checked' : ''} onchange="toggleComplianceStatus('${c.id}', this.checked)">
      </td>
      <td style="font-weight: 600; color: #fff; ${isCompleted ? 'text-decoration: line-through; color: var(--color-text-muted);' : ''}">
        ${c.title}
        ${isOverdue ? ' <span class="badge badge-danger" style="font-size: 9px; padding: 1px 6px;">Overdue</span>' : ''}
      </td>
      <td><span style="font-size: 11px;">${c.company}</span></td>
      <td style="color: ${isOverdue ? 'var(--state-danger)' : ''}; font-weight: ${isOverdue ? '700' : 'normal'}">${c.dueDate}</td>
      <td>${c.assignedTo || 'Unassigned'}</td>
      <td style="font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.notes || ''}">${c.notes || '<span class="text-muted">None</span>'}</td>
      <td style="text-align: center;">
        <div class="card-actions" style="justify-content: center;">
          <button class="btn-icon" onclick="openComplianceModal('${c.id}')"><i class="fa-solid fa-edit"></i></button>
          <button class="btn-icon btn-icon-delete" onclick="deleteCompliance('${c.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function toggleComplianceStatus(id, checked) {
  const target = compliance.find(c => c.id === id);
  if (!target) return;
  const newStatus = checked ? 'Completed' : 'Pending';
  
  const res = await apiCall(`/compliance/${id}`, 'PUT', { status: newStatus });
  if (res) {
    showToast(`Compliance item marked as ${newStatus}`, 'success');
    await fetchCompliance();
    calculateAndRenderLegalsMetrics();
    renderLegalsSubTab();
  }
}

function renderLegalsReports() {
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const filterByCompany = (item) => {
    if (activeLegalsCompany === 'Consolidated') return true;
    return item.company === activeLegalsCompany;
  };

  const filteredContracts = contracts.filter(filterByCompany);
  const filteredCases = cases.filter(filterByCompany);
  const filteredCompliance = compliance.filter(filterByCompany);

  const formatCompany = (comp) => comp === 'Pearls IT' ? 'Pearls IT' : 'Pearls Developers';

  const companyLabel = activeLegalsCompany === 'Consolidated' ? 'All Group Consolidated' : activeLegalsCompany;
  document.getElementById('legals-report-matters-company').textContent = companyLabel;
  document.getElementById('legals-report-expiry-company').textContent = companyLabel;
  document.getElementById('legals-report-checklist-company').textContent = companyLabel;

  const todayText = `As of Simulated Date: ${simDate}`;
  document.getElementById('legals-report-matters-date').textContent = todayText;
  document.getElementById('legals-report-expiry-date').textContent = todayText;
  document.getElementById('legals-report-checklist-date').textContent = todayText;

  if (activeLegalsReport === 'matters') {
    const tbody = document.getElementById('legals-report-matters-body');
    tbody.innerHTML = '';
    const activeMatters = filteredCases.filter(c => c.status === 'Active' || c.status === 'Appealing');
    if (activeMatters.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No active legal matters.</td></tr>';
    } else {
      activeMatters.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight:700;">${c.id}</td>
          <td style="font-weight:600; color:#fff;">${c.title}</td>
          <td>${formatCompany(c.company)}</td>
          <td>${c.jurisdiction || 'N/A'}</td>
          <td>${c.assignedCounsel || 'Unassigned'}</td>
          <td>${c.courtDate || 'None'}</td>
          <td><span class="badge badge-warning">${c.status}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
  } else if (activeLegalsReport === 'expiry') {
    const tbody = document.getElementById('legals-report-expiry-body');
    tbody.innerHTML = '';
    const activeContracts = filteredContracts.filter(c => c.status === 'Active' || c.status === 'Under Review');
    if (activeContracts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No active contracts to track.</td></tr>';
    } else {
      activeContracts.sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate.localeCompare(b.expiryDate);
      });

      activeContracts.forEach(c => {
        let diffText = 'Indefinite';
        let isOverdue = false;
        let badgeClass = 'badge-active';

        if (c.expiryDate) {
          const diff = getDaysDifferenceForInv(simDate, c.expiryDate);
          diffText = `${diff} days`;
          if (diff < 0) {
            diffText = 'Expired';
            isOverdue = true;
            badgeClass = 'badge-danger';
          } else if (diff <= 30) {
            badgeClass = 'badge-warning';
          }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight:600; color:#fff;">${c.title}</td>
          <td>${c.type}</td>
          <td>${formatCompany(c.company)}</td>
          <td>${c.signDate}</td>
          <td>${c.expiryDate || 'Indefinite'}</td>
          <td style="font-weight:700; color: ${isOverdue ? 'var(--state-danger)' : ''}">${diffText}</td>
          <td><span class="badge ${badgeClass}">${isOverdue ? 'Expired' : c.status}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
  } else if (activeLegalsReport === 'checklist') {
    const tbody = document.getElementById('legals-report-checklist-body');
    tbody.innerHTML = '';
    if (filteredCompliance.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No compliance items cataloged.</td></tr>';
    } else {
      filteredCompliance.forEach(c => {
        const isCompleted = c.status === 'Completed';
        const isOverdue = !isCompleted && c.dueDate < simDate;
        let badgeClass = 'badge-active';
        if (isOverdue) badgeClass = 'badge-danger';
        else if (!isCompleted) badgeClass = 'badge-warning';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight:600; color:#fff;">${c.title}</td>
          <td>${formatCompany(c.company)}</td>
          <td style="color: ${isOverdue ? 'var(--state-danger)' : ''}; font-weight: ${isOverdue ? '700' : ''}">${c.dueDate}</td>
          <td>${c.assignedTo || 'Unassigned'}</td>
          <td><span class="badge ${badgeClass}">${isOverdue ? 'Overdue' : c.status}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }
  }
}

function openContractModal(id = null) {
  const form = document.getElementById('contract-form');
  form.reset();
  
  const modal = document.getElementById('contract-modal');
  const title = document.getElementById('contract-modal-title');
  
  if (id) {
    const c = contracts.find(item => item.id === id);
    if (c) {
      title.textContent = 'Edit Contract Record';
      document.getElementById('contract-id').value = c.id;
      document.getElementById('contract-title').value = c.title;
      document.getElementById('contract-type').value = c.type;
      document.getElementById('contract-company').value = c.company;
      document.getElementById('contract-sign-date').value = c.signDate;
      document.getElementById('contract-expiry-date').value = c.expiryDate || '';
      document.getElementById('contract-status').value = c.status;
      document.getElementById('contract-assigned-counsel').value = c.assignedCounsel || '';
      document.getElementById('contract-document-name').value = c.documentName || '';
      document.getElementById('contract-notes').value = c.notes || '';
    }
  } else {
    title.textContent = 'Log New Contract';
    document.getElementById('contract-id').value = '';
    const today = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
    document.getElementById('contract-sign-date').value = today;
  }
  
  modal.classList.add('active');
}

function closeContractModal() {
  document.getElementById('contract-modal').classList.remove('active');
}

async function handleContractSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('contract-id').value;
  const body = {
    title: document.getElementById('contract-title').value,
    type: document.getElementById('contract-type').value,
    company: document.getElementById('contract-company').value,
    signDate: document.getElementById('contract-sign-date').value,
    expiryDate: document.getElementById('contract-expiry-date').value || null,
    status: document.getElementById('contract-status').value,
    assignedCounsel: document.getElementById('contract-assigned-counsel').value,
    documentName: document.getElementById('contract-document-name').value,
    notes: document.getElementById('contract-notes').value
  };

  let res;
  if (id) {
    res = await apiCall(`/contracts/${id}`, 'PUT', body);
  } else {
    res = await apiCall('/contracts', 'POST', body);
  }

  if (res) {
    showToast(id ? 'Contract updated successfully.' : 'New contract logged.', 'success');
    closeContractModal();
    await fetchContracts();
    calculateAndRenderLegalsMetrics();
    renderLegalsSubTab();
  }
}

async function deleteContract(id) {
  if (confirm('Are you sure you want to delete this contract?')) {
    const res = await apiCall(`/contracts/${id}`, 'DELETE');
    if (res) {
      showToast('Contract record deleted.', 'success');
      await fetchContracts();
      calculateAndRenderLegalsMetrics();
      renderLegalsSubTab();
    }
  }
}

function openCaseModal(id = null) {
  const form = document.getElementById('case-form');
  form.reset();
  
  const modal = document.getElementById('case-modal');
  const title = document.getElementById('case-modal-title');
  
  if (id) {
    const c = cases.find(item => item.id === id);
    if (c) {
      title.textContent = 'Edit Legal Case';
      document.getElementById('case-id').value = c.id;
      document.getElementById('case-title').value = c.title;
      document.getElementById('case-company').value = c.company;
      document.getElementById('case-status').value = c.status;
      document.getElementById('case-court-date').value = c.courtDate || '';
      document.getElementById('case-assigned-counsel').value = c.assignedCounsel || '';
      document.getElementById('case-jurisdiction').value = c.jurisdiction || '';
      document.getElementById('case-notes').value = c.notes || '';
    }
  } else {
    title.textContent = 'Log Legal Case';
    document.getElementById('case-id').value = '';
    document.getElementById('case-court-date').value = '';
  }
  
  modal.classList.add('active');
}

function closeCaseModal() {
  document.getElementById('case-modal').classList.remove('active');
}

async function handleCaseSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('case-id').value;
  const body = {
    title: document.getElementById('case-title').value,
    company: document.getElementById('case-company').value,
    status: document.getElementById('case-status').value,
    courtDate: document.getElementById('case-court-date').value || null,
    assignedCounsel: document.getElementById('case-assigned-counsel').value,
    jurisdiction: document.getElementById('case-jurisdiction').value,
    notes: document.getElementById('case-notes').value
  };

  let res;
  if (id) {
    res = await apiCall(`/cases/${id}`, 'PUT', body);
  } else {
    res = await apiCall('/cases', 'POST', body);
  }

  if (res) {
    showToast(id ? 'Legal case updated.' : 'New legal case recorded.', 'success');
    closeCaseModal();
    await fetchCases();
    calculateAndRenderLegalsMetrics();
    renderLegalsSubTab();
  }
}

async function deleteCase(id) {
  if (confirm('Are you sure you want to delete this case?')) {
    const res = await apiCall(`/cases/${id}`, 'DELETE');
    if (res) {
      showToast('Legal case deleted.', 'success');
      await fetchCases();
      calculateAndRenderLegalsMetrics();
      renderLegalsSubTab();
    }
  }
}

function openComplianceModal(id = null) {
  const form = document.getElementById('compliance-form');
  form.reset();
  
  const modal = document.getElementById('compliance-modal');
  const title = document.getElementById('compliance-modal-title');
  
  if (id) {
    const c = compliance.find(item => item.id === id);
    if (c) {
      title.textContent = 'Edit Compliance Item';
      document.getElementById('compliance-id').value = c.id;
      document.getElementById('compliance-title').value = c.title;
      document.getElementById('compliance-company').value = c.company;
      document.getElementById('compliance-due-date').value = c.dueDate;
      document.getElementById('compliance-assigned-to').value = c.assignedTo || '';
      document.getElementById('compliance-status').value = c.status;
      document.getElementById('compliance-notes').value = c.notes || '';
    }
  } else {
    title.textContent = 'Log Compliance Item';
    document.getElementById('compliance-id').value = '';
    const today = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
    document.getElementById('compliance-due-date').value = today;
  }
  
  modal.classList.add('active');
}

function closeComplianceModal() {
  document.getElementById('compliance-modal').classList.remove('active');
}

async function handleComplianceSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('compliance-id').value;
  const body = {
    title: document.getElementById('compliance-title').value,
    company: document.getElementById('compliance-company').value,
    dueDate: document.getElementById('compliance-due-date').value,
    assignedTo: document.getElementById('compliance-assigned-to').value,
    status: document.getElementById('compliance-status').value,
    notes: document.getElementById('compliance-notes').value
  };

  let res;
  if (id) {
    res = await apiCall(`/compliance/${id}`, 'PUT', body);
  } else {
    res = await apiCall('/compliance', 'POST', body);
  }

  if (res) {
    showToast(id ? 'Compliance task updated.' : 'New compliance task logged.', 'success');
    closeComplianceModal();
    await fetchCompliance();
    calculateAndRenderLegalsMetrics();
    renderLegalsSubTab();
  }
}

async function deleteCompliance(id) {
  if (confirm('Are you sure you want to delete this compliance item?')) {
    const res = await apiCall(`/compliance/${id}`, 'DELETE');
    if (res) {
      showToast('Compliance item deleted.', 'success');
      await fetchCompliance();
      calculateAndRenderLegalsMetrics();
      renderLegalsSubTab();
    }
  }
}

// --- VEHICLE LEASING CONTROLLERS & RENDERING ---

async function fetchVehicles() {
  const data = await apiCall('/fleet');
  if (data) {
    vehicles = data;
  }
}

async function fetchLeases() {
  const data = await apiCall('/leases');
  if (data) {
    leases = data;
  }
}

function setupLeasingEventListeners() {
  // Company / Entity toggle buttons
  const leasingCompButtons = document.querySelectorAll('.leasing-company-toggle-buttons .toggle-btn');
  leasingCompButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      leasingCompButtons.forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.color = '#fff';
      activeLeasingCompany = btn.getAttribute('data-leasing-company');
      calculateAndRenderLeasingMetrics();
      renderLeasingSubTab();
    });
  });

  // Sub-tabs navigation switching
  const leasingTabButtons = document.querySelectorAll('.leasing-sub-tabs .leasing-tab-btn');
  leasingTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      leasingTabButtons.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.color = '#fff';
      activeLeasingTab = btn.getAttribute('data-leasing-tab');
      
      document.querySelectorAll('.leasing-panel').forEach(panel => {
        panel.style.display = 'none';
      });
      document.getElementById(`leasing-panel-${activeLeasingTab}`).style.display = 'block';
      renderLeasingSubTab();
    });
  });

  // Report toggle buttons
  const leasingReportBtns = document.querySelectorAll('.leasing-report-toggle-btn');
  leasingReportBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      leasingReportBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.color = '#fff';
      activeLeasingReport = btn.getAttribute('data-leasing-report');
      
      document.querySelectorAll('.leasing-report-viewport').forEach(vp => {
        vp.style.display = 'none';
      });
      document.getElementById(`leasing-report-view-${activeLeasingReport}`).style.display = 'block';
      renderLeasingReports();
    });
  });

  // Search and filters input
  document.getElementById('fleet-search').addEventListener('input', () => renderVehicles());
  document.getElementById('fleet-filter-type').addEventListener('change', () => renderVehicles());
  document.getElementById('leases-search').addEventListener('input', () => renderLeases());
  document.getElementById('leases-filter-status').addEventListener('change', () => renderLeases());

  // Modal open triggers
  document.getElementById('btn-add-vehicle').addEventListener('click', () => openVehicleModal());
  document.getElementById('btn-close-vehicle-modal').addEventListener('click', closeVehicleModal);
  document.getElementById('btn-cancel-vehicle-modal').addEventListener('click', closeVehicleModal);
  document.getElementById('vehicle-form').addEventListener('submit', handleVehicleSubmit);

  document.getElementById('btn-create-lease').addEventListener('click', () => openLeaseModal());
  document.getElementById('btn-close-lease-modal').addEventListener('click', closeLeaseModal);
  document.getElementById('btn-cancel-lease-modal').addEventListener('click', closeLeaseModal);
  document.getElementById('lease-form').addEventListener('submit', handleLeaseSubmit);

  document.getElementById('btn-close-condition-modal').addEventListener('click', closeConditionModal);
  document.getElementById('btn-cancel-condition-modal').addEventListener('click', closeConditionModal);
  document.getElementById('condition-form').addEventListener('submit', handleConditionSubmit);

  document.getElementById('btn-close-lease-payment-modal').addEventListener('click', closeLeasePaymentModal);
}

function calculateAndRenderLeasingMetrics() {
  const simDateStr = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const simDate = new Date(simDateStr);
  const simYear = simDate.getFullYear();
  const simMonth = simDate.getMonth();

  const companyFilter = (item) => {
    if (activeLeasingCompany === 'Consolidated') return true;
    return item.company === activeLeasingCompany;
  };

  const filteredVehicles = vehicles.filter(companyFilter);
  const filteredVehIds = new Set(filteredVehicles.map(v => v.id));

  // 1. Active Leases
  const activeLeases = leases.filter(l => l.status === 'Active' && filteredVehIds.has(l.vehicleId));
  document.getElementById('leasing-stat-active-leases').textContent = activeLeases.length;

  // 2. Payments Due This Month & Overdue Payments
  let dueMonthCount = 0;
  let overdueCount = 0;

  leases.forEach(l => {
    if (!filteredVehIds.has(l.vehicleId)) return;
    if (l.status !== 'Active' && l.status !== 'Terminated') return;

    l.paymentSchedule.forEach(p => {
      if (p.status === 'Paid') return;

      const pDate = new Date(p.dueDate);
      const pYear = pDate.getFullYear();
      const pMonth = pDate.getMonth();

      if (pYear === simYear && pMonth === simMonth) {
        dueMonthCount++;
      }

      if (pDate < simDate) {
        overdueCount++;
      }
    });
  });

  document.getElementById('leasing-stat-due-month').textContent = dueMonthCount;
  document.getElementById('leasing-stat-overdue').textContent = overdueCount;

  // 3. Available Fleet
  const availableVehicles = filteredVehicles.filter(v => v.status === 'Available');
  document.getElementById('leasing-stat-available-fleet').textContent = availableVehicles.length;
}

function renderLeasingSubTab() {
  if (activeLeasingTab === 'dashboard') {
    renderLeasingDashboard();
  } else if (activeLeasingTab === 'fleet') {
    renderVehicles();
  } else if (activeLeasingTab === 'leases') {
    renderLeases();
  } else if (activeLeasingTab === 'reports') {
    renderLeasingReports();
  }
}

function renderLeasingDashboard() {
  const simDateStr = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const simDate = new Date(simDateStr);
  const companyFilter = (item) => {
    if (activeLeasingCompany === 'Consolidated') return true;
    return item.company === activeLeasingCompany;
  };

  const filteredVehicles = vehicles.filter(companyFilter);
  const filteredVehIds = new Set(filteredVehicles.map(v => v.id));

  // Expiry & Compliance Alerts
  const alertsContainer = document.getElementById('leasing-alerts-container');
  alertsContainer.innerHTML = '';
  let alertsList = [];

  filteredVehicles.forEach(v => {
    const vehName = `${v.make} ${v.model} (${v.plateNumber})`;

    if (v.roadTaxExpiry) {
      const rtDate = new Date(v.roadTaxExpiry);
      const diffTime = rtDate - simDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        alertsList.push({ text: `Road Tax EXPIRED for ${vehName} (Expired on ${v.roadTaxExpiry})`, severity: 'error' });
      } else if (diffDays <= 30) {
        alertsList.push({ text: `Road Tax expiring in ${diffDays} days for ${vehName} (Due: ${v.roadTaxExpiry})`, severity: 'warning' });
      }
    }

    if (v.insuranceExpiry) {
      const insDate = new Date(v.insuranceExpiry);
      const diffTime = insDate - simDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        alertsList.push({ text: `Insurance EXPIRED for ${vehName} (Expired on ${v.insuranceExpiry})`, severity: 'error' });
      } else if (diffDays <= 30) {
        alertsList.push({ text: `Insurance expiring in ${diffDays} days for ${vehName} (Due: ${v.insuranceExpiry})`, severity: 'warning' });
      }
    }
  });

  if (alertsList.length === 0) {
    alertsContainer.innerHTML = `<div class="text-center text-muted" style="padding: 20px;">No active alerts. Fleet tax and insurance compliance verified.</div>`;
  } else {
    alertsList.forEach(a => {
      const icon = a.severity === 'error' ? 'fa-circle-xmark text-red' : 'fa-triangle-exclamation text-amber';
      const border = a.severity === 'error' ? 'border-left: 4px solid var(--accent-red);' : 'border-left: 4px solid var(--accent-amber);';
      alertsContainer.innerHTML += `
        <div class="glass-panel" style="padding: 12px 15px; display: flex; align-items: center; gap: 12px; font-size: 13px; ${border} background: rgba(255,255,255,0.01);">
          <i class="fa-solid ${icon}" style="font-size: 16px;"></i>
          <span>${a.text}</span>
        </div>
      `;
    });
  }

  // Urgent Overdue Payments Summary
  const overdueTbody = document.getElementById('leasing-overdue-summary-body');
  overdueTbody.innerHTML = '';
  let overdueList = [];

  leases.forEach(l => {
    if (!filteredVehIds.has(l.vehicleId)) return;
    const veh = vehicles.find(v => v.id === l.vehicleId);
    const vehLabel = veh ? `${veh.make} ${veh.model}` : 'Unknown';

    l.paymentSchedule.forEach(p => {
      if (p.status !== 'Paid') {
        const pDate = new Date(p.dueDate);
        if (pDate < simDate) {
          const diffTime = simDate - pDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          overdueList.push({
            lessee: l.lesseeName,
            vehicle: vehLabel,
            amount: p.amount,
            dueDate: p.dueDate,
            days: diffDays
          });
        }
      }
    });
  });

  if (overdueList.length === 0) {
    overdueTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 20px;">No overdue payments. All accounts current.</td></tr>`;
  } else {
    overdueList.sort((a, b) => b.days - a.days);
    overdueList.forEach(item => {
      overdueTbody.innerHTML += `
        <tr>
          <td><strong style="color:#fff;">${item.lessee}</strong></td>
          <td>${item.vehicle}</td>
          <td style="color:var(--accent-red); font-weight:600;">£${item.amount.toFixed(2)}</td>
          <td>${item.dueDate}</td>
          <td><span class="badge badge-danger" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25);">${item.days} days</span></td>
        </tr>
      `;
    });
  }

  // Fleet Utilization Statistics
  const bikes = filteredVehicles.filter(v => v.type === 'Motorcycle');
  const cars = filteredVehicles.filter(v => v.type === 'Car');

  const bikeLeased = bikes.filter(v => v.status === 'Leased').length;
  const carLeased = cars.filter(v => v.status === 'Leased').length;

  const bikePct = bikes.length > 0 ? Math.round((bikeLeased / bikes.length) * 100) : 0;
  const carPct = cars.length > 0 ? Math.round((carLeased / cars.length) * 100) : 0;

  document.getElementById('util-motorcycles-pct').textContent = `${bikePct}%`;
  document.getElementById('util-motorcycles-bar').style.width = `${bikePct}%`;
  document.getElementById('util-motorcycles-details').textContent = `${bikeLeased} of ${bikes.length} leased out`;

  document.getElementById('util-cars-pct').textContent = `${carPct}%`;
  document.getElementById('util-cars-bar').style.width = `${carPct}%`;
  document.getElementById('util-cars-details').textContent = `${carLeased} of ${cars.length} cars leased out`;

  document.getElementById('util-total-fleet').textContent = filteredVehicles.length;
  document.getElementById('util-total-leased').textContent = bikeLeased + carLeased;
}

function renderVehicles() {
  const searchQuery = document.getElementById('fleet-search').value.toLowerCase();
  const filterType = document.getElementById('fleet-filter-type').value;

  const companyFilter = (item) => {
    if (activeLeasingCompany === 'Consolidated') return true;
    return item.company === activeLeasingCompany;
  };

  const tbody = document.getElementById('fleet-table-body');
  tbody.innerHTML = '';

  const filtered = vehicles.filter(v => {
    if (!companyFilter(v)) return false;
    if (filterType !== 'All' && v.type !== filterType) return false;
    
    const query = `${v.make} ${v.model} ${v.plateNumber}`.toLowerCase();
    return query.includes(searchQuery);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding: 20px;">No vehicles found in fleet registry.</td></tr>`;
    return;
  }

  filtered.forEach(v => {
    let statusClass = 'badge-success';
    if (v.status === 'Leased') statusClass = 'badge-info';
    else if (v.status === 'Maintenance') statusClass = 'badge-warning';

    const latestCond = v.conditionRecords && v.conditionRecords.length > 0 ? v.conditionRecords[0] : null;
    const condHtml = latestCond 
      ? `<span class="badge" style="background:rgba(255,255,255,0.04); font-size:11px; padding: 4px 8px; border-radius: 4px; border:1px solid rgba(255,255,255,0.06); cursor:pointer;" onclick="viewVehicleCondition('${v.id}')" title="${latestCond.notes}">Inspected: ${latestCond.severity}</span>`
      : `<span style="font-size:11px; color:var(--color-text-muted);">No logs</span>`;

    tbody.innerHTML += `
      <tr>
        <td><code style="color:var(--accent-cyan);">${v.id}</code></td>
        <td><i class="fa-solid ${v.type === 'Motorcycle' ? 'fa-motorcycle' : 'fa-car'}" style="margin-right: 5px;"></i> ${v.type}</td>
        <td><strong style="color:#fff;">${v.make} ${v.model}</strong></td>
        <td><code>${v.plateNumber}</code></td>
        <td>${v.year}</td>
        <td style="font-size:11px;">${v.company === 'Pearls IT' ? 'Pearls IT' : 'Pearls Dev'}</td>
        <td>${v.roadTaxExpiry || '<span class="text-muted">N/A</span>'}</td>
        <td>${v.insuranceExpiry || '<span class="text-muted">N/A</span>'}</td>
        <td><span class="badge ${statusClass}">${v.status}</span></td>
        <td>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${condHtml}
            <button class="btn btn-sm btn-text" onclick="openConditionModal('${v.id}')" title="Log Inspection"><i class="fa-solid fa-clipboard-check"></i> Inspect</button>
            <button class="btn btn-sm btn-text" onclick="openVehicleModal('${v.id}')" title="Edit details"><i class="fa-solid fa-pencil"></i></button>
            <button class="btn btn-sm btn-text text-red" onclick="deleteVehicle('${v.id}')" title="Remove"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  });
}

function renderLeases() {
  const searchQuery = document.getElementById('leases-search').value.toLowerCase();
  const filterStatus = document.getElementById('leases-filter-status').value;

  const companyFilter = (item) => {
    if (activeLeasingCompany === 'Consolidated') return true;
    return item.company === activeLeasingCompany;
  };

  const tbody = document.getElementById('leases-table-body');
  tbody.innerHTML = '';

  const filtered = leases.filter(l => {
    const veh = vehicles.find(v => v.id === l.vehicleId);
    if (!veh || !companyFilter(veh)) return false;

    if (filterStatus !== 'All' && l.status !== filterStatus) return false;

    const query = `${l.lesseeName} ${l.lesseeEmail} ${l.id}`.toLowerCase();
    return query.includes(searchQuery);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding: 20px;">No lease contracts registered.</td></tr>`;
    return;
  }

  filtered.forEach(l => {
    const veh = vehicles.find(v => v.id === l.vehicleId);
    const vehName = veh ? `${veh.make} ${veh.model} (${veh.plateNumber})` : 'Unknown';

    let statusClass = 'badge-success';
    if (l.status === 'Completed') statusClass = 'badge-warning';
    else if (l.status === 'Terminated') statusClass = 'badge-danger';

    const paidPayments = l.paymentSchedule.filter(p => p.status === 'Paid').length;
    const totalPayments = l.paymentSchedule.length;

    tbody.innerHTML += `
      <tr>
        <td><code style="color:var(--accent-cyan);">${l.id}</code></td>
        <td>
          <div style="display:flex; flex-direction:column;">
            <strong style="color:#fff;">${vehName}</strong>
            <span style="font-size:10px; color:var(--color-text-muted);">ID: ${l.vehicleId}</span>
          </div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column;">
            <strong style="color:#fff;">${l.lesseeName}</strong>
            <span style="font-size:11px; color:var(--color-text-muted);">${l.lesseeEmail || 'No Email'}</span>
            <span style="font-size:11px; color:var(--color-text-muted);">${l.lesseePhone || 'No Phone'}</span>
          </div>
        </td>
        <td>
          <div style="font-size:12px;">
            <div>Start: ${l.startDate}</div>
            <div>End: ${l.endDate}</div>
          </div>
        </td>
        <td style="font-weight:600; color:#fff;">£${l.monthlyRate.toFixed(2)}</td>
        <td>£${(l.securityDeposit || 0).toFixed(2)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span>${paidPayments} / ${totalPayments}</span>
            <button class="btn btn-sm btn-text" onclick="openLeasePaymentModal('${l.id}')" style="padding: 2px 6px; font-size:11px;"><i class="fa-solid fa-coins"></i> Track</button>
          </div>
        </td>
        <td><span class="badge ${statusClass}">${l.status}</span></td>
        <td>
          <div style="display: flex; gap: 8px;">
            ${l.status === 'Active' ? `
              <button class="btn btn-sm btn-text" onclick="renewLeasePrompt('${l.id}')" title="Renew lease"><i class="fa-solid fa-arrows-spin text-green"></i> Renew</button>
              <button class="btn btn-sm btn-text text-red" onclick="terminateLeasePrompt('${l.id}')" title="Terminate Early"><i class="fa-solid fa-ban"></i> Stop</button>
            ` : ''}
            <button class="btn btn-sm btn-text" onclick="openLeaseModal('${l.id}')" title="Edit"><i class="fa-solid fa-pencil"></i></button>
            <button class="btn btn-sm btn-text text-red" onclick="deleteLease('${l.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  });
}

function renderLeasingReports() {
  const simDateStr = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  const simDate = new Date(simDateStr);
  const todayText = `Report Generated: ${simDateStr}`;

  const companyLabel = activeLeasingCompany === 'Consolidated' ? 'All Group Consolidated' : activeLeasingCompany;
  
  document.getElementById('leasing-report-income-company').textContent = companyLabel;
  document.getElementById('leasing-report-overdue-company').textContent = companyLabel;
  document.getElementById('leasing-report-utilization-company').textContent = companyLabel;
  document.getElementById('leasing-report-renewals-company').textContent = companyLabel;

  document.getElementById('leasing-report-income-date').textContent = todayText;
  document.getElementById('leasing-report-overdue-date').textContent = todayText;
  document.getElementById('leasing-report-utilization-date').textContent = todayText;
  document.getElementById('leasing-report-renewals-date').textContent = todayText;

  const companyFilter = (item) => {
    if (activeLeasingCompany === 'Consolidated') return true;
    return item.company === activeLeasingCompany;
  };

  const filteredVehicles = vehicles.filter(companyFilter);
  const filteredVehIds = new Set(filteredVehicles.map(v => v.id));

  if (activeLeasingReport === 'income') {
    const tbody = document.getElementById('leasing-report-income-body');
    tbody.innerHTML = '';
    
    const monthlyAgg = {};

    leases.forEach(l => {
      if (!filteredVehIds.has(l.vehicleId)) return;
      
      l.paymentSchedule.forEach(p => {
        const month = p.dueDate.substring(0, 7);
        if (!monthlyAgg[month]) {
          monthlyAgg[month] = { expected: 0, collected: 0, pending: 0, leasesCount: new Set() };
        }
        monthlyAgg[month].expected += p.amount;
        monthlyAgg[month].leasesCount.add(l.id);
        
        if (p.status === 'Paid') {
          monthlyAgg[month].collected += p.amount;
        } else {
          monthlyAgg[month].pending += p.amount;
        }
      });
    });

    const months = Object.keys(monthlyAgg).sort();
    if (months.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 20px;">No income records registered.</td></tr>`;
      return;
    }

    months.forEach(m => {
      const row = monthlyAgg[m];
      const rate = row.expected > 0 ? Math.round((row.collected / row.expected) * 100) : 0;
      
      tbody.innerHTML += `
        <tr>
          <td><strong style="color:#fff;">${m}</strong></td>
          <td>${row.leasesCount.size} active leases</td>
          <td style="font-weight:600; color:#fff;">£${row.expected.toFixed(2)}</td>
          <td style="color:var(--accent-green); font-weight:600;">£${row.collected.toFixed(2)}</td>
          <td style="color:${row.pending > 0 ? 'var(--accent-red)' : 'var(--color-text-muted)'}; font-weight:600;">£${row.pending.toFixed(2)}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span>${rate}%</span>
              <div style="background:rgba(255,255,255,0.06); width:60px; height:6px; border-radius:3px; overflow:hidden;">
                <div style="background:var(--accent-green); width:${rate}%; height:100%;"></div>
              </div>
            </div>
          </td>
        </tr>
      `;
    });
  } else if (activeLeasingReport === 'overdue') {
    const tbody = document.getElementById('leasing-report-overdue-body');
    tbody.innerHTML = '';
    
    let overdueRecords = [];

    leases.forEach(l => {
      if (!filteredVehIds.has(l.vehicleId)) return;
      const veh = vehicles.find(v => v.id === l.vehicleId);
      const vehLabel = veh ? `${veh.make} ${veh.model} (${veh.plateNumber})` : 'Unknown';

      l.paymentSchedule.forEach(p => {
        if (p.status !== 'Paid') {
          const pDate = new Date(p.dueDate);
          if (pDate < simDate) {
            const diffTime = simDate - pDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            overdueRecords.push({
              leaseId: l.id,
              lessee: l.lesseeName,
              email: l.lesseeEmail,
              phone: l.lesseePhone,
              vehicle: vehLabel,
              rate: l.monthlyRate,
              dueDate: p.dueDate,
              amount: p.amount,
              days: diffDays
            });
          }
        }
      });
    });

    if (overdueRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 20px;">No overdue payments. All accounts current.</td></tr>`;
      return;
    }

    overdueRecords.sort((a, b) => b.days - a.days);
    overdueRecords.forEach(r => {
      tbody.innerHTML += `
        <tr>
          <td><code>${r.leaseId}</code></td>
          <td><strong style="color:#fff;">${r.lessee}</strong></td>
          <td style="font-size:11px;">
            <div>${r.email || 'N/A'}</div>
            <div>${r.phone || 'N/A'}</div>
          </td>
          <td>${r.vehicle}</td>
          <td>£${r.rate.toFixed(2)}</td>
          <td>${r.dueDate}</td>
          <td style="color:var(--accent-red); font-weight:600;">£${r.amount.toFixed(2)}</td>
          <td><span class="badge badge-danger" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25);">${r.days} days</span></td>
        </tr>
      `;
    });
  } else if (activeLeasingReport === 'utilization') {
    const tbody = document.getElementById('leasing-report-utilization-body');
    tbody.innerHTML = '';

    const categories = ['Car', 'Motorcycle'];

    categories.forEach(cat => {
      const reg = filteredVehicles.filter(v => v.type === cat);
      const leased = reg.filter(v => v.status === 'Leased').length;
      const maint = reg.filter(v => v.status === 'Maintenance').length;
      const avail = reg.filter(v => v.status === 'Available').length;
      const rate = reg.length > 0 ? Math.round((leased / reg.length) * 100) : 0;

      tbody.innerHTML += `
        <tr>
          <td><strong style="color:#fff;"><i class="fa-solid ${cat === 'Car' ? 'fa-car' : 'fa-motorcycle'}" style="margin-right:8px;"></i> ${cat}s</strong></td>
          <td>${reg.length} registered</td>
          <td style="color:var(--accent-green); font-weight:600;">${avail} available</td>
          <td style="color:var(--accent-cyan); font-weight:600;">${leased} leased</td>
          <td style="color:var(--accent-amber); font-weight:600;">${maint} in workshop</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span>${rate}%</span>
              <div style="background:rgba(255,255,255,0.06); width:80px; height:6px; border-radius:3px; overflow:hidden;">
                <div style="background:var(--accent-cyan); width:${rate}%; height:100%;"></div>
              </div>
            </div>
          </td>
        </tr>
      `;
    });
  } else if (activeLeasingReport === 'renewals') {
    const tbody = document.getElementById('leasing-report-renewals-body');
    tbody.innerHTML = '';
    
    let pipeline = [];

    leases.forEach(l => {
      if (!filteredVehIds.has(l.vehicleId)) return;
      if (l.status !== 'Active') return;

      const endDate = new Date(l.endDate);
      const diffTime = endDate - simDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 90) {
        const veh = vehicles.find(v => v.id === l.vehicleId);
        const vehLabel = veh ? `${veh.make} ${veh.model} (${veh.plateNumber})` : 'Unknown';

        pipeline.push({
          leaseId: l.id,
          lessee: l.lesseeName,
          vehicle: vehLabel,
          start: l.startDate,
          end: l.endDate,
          days: diffDays
        });
      }
    });

    if (pipeline.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 20px;">No lease contracts expiring within the next 90 days.</td></tr>`;
      return;
    }

    pipeline.sort((a, b) => a.days - b.days);
    pipeline.forEach(r => {
      tbody.innerHTML += `
        <tr>
          <td><code>${r.leaseId}</code></td>
          <td><strong style="color:#fff;">${r.lessee}</strong></td>
          <td>${r.vehicle}</td>
          <td>${r.start}</td>
          <td>${r.end}</td>
          <td>
            <span class="badge ${r.days <= 30 ? 'badge-danger' : 'badge-warning'}" style="font-size:12px;">
              ${r.days <= 0 ? 'Expired' : `${r.days} days left`}
            </span>
          </td>
          <td>
            <button class="btn btn-sm btn-text text-green" onclick="renewLeasePrompt('${r.leaseId}')"><i class="fa-solid fa-arrows-spin"></i> Renew Now</button>
          </td>
        </tr>
      `;
    });
  }
}

// Modal Handlers
function openVehicleModal(id = '') {
  document.getElementById('vehicle-form').reset();
  document.getElementById('vehicle-id').value = id;

  if (id) {
    document.getElementById('vehicle-modal-title').textContent = 'Edit Vehicle Details';
    const v = vehicles.find(item => item.id === id);
    if (v) {
      document.getElementById('vehicle-make').value = v.make;
      document.getElementById('vehicle-model').value = v.model;
      document.getElementById('vehicle-type').value = v.type;
      document.getElementById('vehicle-plate').value = v.plateNumber;
      document.getElementById('vehicle-year').value = v.year;
      document.getElementById('vehicle-company').value = v.company;
      document.getElementById('vehicle-roadtax').value = v.roadTaxExpiry || '';
      document.getElementById('vehicle-insurance').value = v.insuranceExpiry || '';
      document.getElementById('vehicle-status').value = v.status;
    }
  } else {
    document.getElementById('vehicle-modal-title').textContent = 'Register Fleet Vehicle';
    document.getElementById('vehicle-status').value = 'Available';
  }

  document.getElementById('vehicle-modal').style.display = 'flex';
}

function closeVehicleModal() {
  document.getElementById('vehicle-modal').style.display = 'none';
}

async function handleVehicleSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('vehicle-id').value;
  const make = document.getElementById('vehicle-make').value;
  const model = document.getElementById('vehicle-model').value;
  const type = document.getElementById('vehicle-type').value;
  const plateNumber = document.getElementById('vehicle-plate').value;
  const year = parseInt(document.getElementById('vehicle-year').value);
  const company = document.getElementById('vehicle-company').value;
  const roadTaxExpiry = document.getElementById('vehicle-roadtax').value || null;
  const insuranceExpiry = document.getElementById('vehicle-insurance').value || null;
  const status = document.getElementById('vehicle-status').value;

  const body = { make, model, type, plateNumber, year, company, roadTaxExpiry, insuranceExpiry, status };
  
  let res;
  if (id) {
    res = await apiCall(`/fleet/${id}`, 'PUT', body);
  } else {
    res = await apiCall('/fleet', 'POST', body);
  }

  if (res) {
    showToast(id ? 'Vehicle details updated.' : 'Vehicle registered in fleet.', 'success');
    closeVehicleModal();
    await fetchVehicles();
    calculateAndRenderLeasingMetrics();
    renderLeasingSubTab();
  }
}

async function deleteVehicle(id) {
  if (confirm('Are you sure you want to remove this vehicle from fleet registry?')) {
    const res = await apiCall(`/fleet/${id}`, 'DELETE');
    if (res) {
      showToast('Vehicle removed from fleet.', 'success');
      await fetchVehicles();
      calculateAndRenderLeasingMetrics();
      renderLeasingSubTab();
    }
  }
}

function openLeaseModal(id = '') {
  document.getElementById('lease-form').reset();
  document.getElementById('lease-id').value = id;

  const dropdown = document.getElementById('lease-vehicle');
  dropdown.innerHTML = '';

  vehicles.forEach(v => {
    const isCurrentLeaseVeh = id && leases.find(l => l.id === id && l.vehicleId === v.id);
    
    if (v.status === 'Available' || isCurrentLeaseVeh) {
      dropdown.innerHTML += `<option value="${v.id}">${v.make} ${v.model} (${v.plateNumber}) - Owned by ${v.company === 'Pearls IT' ? 'Pearls IT' : 'Pearls Dev'}</option>`;
    }
  });

  if (dropdown.innerHTML === '') {
    dropdown.innerHTML = `<option value="">No available vehicles in fleet!</option>`;
  }

  if (id) {
    document.getElementById('lease-modal-title').textContent = 'Edit Lease Contract';
    const l = leases.find(item => item.id === id);
    if (l) {
      document.getElementById('lease-vehicle').value = l.vehicleId;
      document.getElementById('lease-lessee-name').value = l.lesseeName;
      document.getElementById('lease-lessee-email').value = l.lesseeEmail || '';
      document.getElementById('lease-lessee-phone').value = l.lesseePhone || '';
      document.getElementById('lease-start').value = l.startDate;
      document.getElementById('lease-end').value = l.endDate;
      document.getElementById('lease-rate').value = l.monthlyRate;
      document.getElementById('lease-deposit').value = l.securityDeposit || 0;
      document.getElementById('lease-status').value = l.status;
    }
  } else {
    document.getElementById('lease-modal-title').textContent = 'Create Lease Contract';
    document.getElementById('lease-status').value = 'Active';
    
    const simDateStr = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
    document.getElementById('lease-start').value = simDateStr;
  }

  document.getElementById('lease-modal').style.display = 'flex';
}

function closeLeaseModal() {
  document.getElementById('lease-modal').style.display = 'none';
}

async function handleLeaseSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('lease-id').value;
  const vehicleId = document.getElementById('lease-vehicle').value;
  const lesseeName = document.getElementById('lease-lessee-name').value;
  const lesseeEmail = document.getElementById('lease-lessee-email').value;
  const lesseePhone = document.getElementById('lease-lessee-phone').value;
  const startDate = document.getElementById('lease-start').value;
  const endDate = document.getElementById('lease-end').value;
  const monthlyRate = parseFloat(document.getElementById('lease-rate').value);
  const securityDeposit = parseFloat(document.getElementById('lease-deposit').value || 0);
  const status = document.getElementById('lease-status').value;

  if (!vehicleId) {
    showToast('Cannot save. A valid vehicle must be selected.', 'error');
    return;
  }

  const body = { vehicleId, lesseeName, lesseeEmail, lesseePhone, startDate, endDate, monthlyRate, securityDeposit, status };

  let res;
  if (id) {
    res = await apiCall(`/leases/${id}`, 'PUT', body);
  } else {
    res = await apiCall('/leases', 'POST', body);
  }

  if (res) {
    showToast(id ? 'Lease contract updated.' : 'Lease contract created successfully.', 'success');
    closeLeaseModal();
    await fetchLeases();
    await fetchVehicles();
    calculateAndRenderLeasingMetrics();
    renderLeasingSubTab();
  }
}

async function deleteLease(id) {
  if (confirm('Are you sure you want to delete this lease contract? This will release the vehicle.')) {
    const res = await apiCall(`/leases/${id}`, 'DELETE');
    if (res) {
      showToast('Lease contract deleted.', 'success');
      await fetchLeases();
      await fetchVehicles();
      calculateAndRenderLeasingMetrics();
      renderLeasingSubTab();
    }
  }
}

function openConditionModal(vehId) {
  document.getElementById('condition-form').reset();
  document.getElementById('condition-vehicle-id').value = vehId;
  
  const simDateStr = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);
  document.getElementById('condition-date').value = simDateStr;
  document.getElementById('condition-loggedby').value = localStorage.getItem('subpulse_username') || 'Hammad Arshad';
  document.getElementById('condition-modal').style.display = 'flex';
}

function closeConditionModal() {
  document.getElementById('condition-modal').style.display = 'none';
}

async function handleConditionSubmit(e) {
  e.preventDefault();

  const vehId = document.getElementById('condition-vehicle-id').value;
  const date = document.getElementById('condition-date').value;
  const severity = document.getElementById('condition-severity').value;
  const notes = document.getElementById('condition-notes').value;
  const loggedBy = document.getElementById('condition-loggedby').value;

  const res = await apiCall(`/fleet/${vehId}/condition`, 'POST', { date, severity, notes, loggedBy });
  if (res) {
    showToast('Condition inspection logged successfully.', 'success');
    
    if (severity === 'Damaged') {
      await apiCall(`/fleet/${vehId}`, 'PUT', { status: 'Maintenance' });
    }

    closeConditionModal();
    await fetchVehicles();
    calculateAndRenderLeasingMetrics();
    renderLeasingSubTab();
  }
}

function viewVehicleCondition(vehId) {
  const v = vehicles.find(item => item.id === vehId);
  if (!v || !v.conditionRecords || v.conditionRecords.length === 0) return;

  let recordsText = v.conditionRecords.map(r => 
    `[${r.date}] Status: ${r.severity} (Logged by ${r.loggedBy})\nNotes: ${r.notes}`
  ).join('\n\n');

  alert(`Inspection History for ${v.make} ${v.model} (${v.plateNumber}):\n\n${recordsText}`);
}

let activePaymentLeaseId = '';

function openLeasePaymentModal(leaseId) {
  activePaymentLeaseId = leaseId;
  const l = leases.find(item => item.id === leaseId);
  if (!l) return;

  const veh = vehicles.find(v => v.id === l.vehicleId);
  const vehLabel = veh ? `${veh.make} ${veh.model} (${veh.plateNumber})` : 'Unknown';

  document.getElementById('payment-lease-lessee').innerHTML = `Lessee: <strong style="color:#fff;">${l.lesseeName}</strong>`;
  document.getElementById('payment-lease-vehicle').textContent = `Vehicle: ${vehLabel} (Monthly Rate: £${l.monthlyRate.toFixed(2)})`;

  const tbody = document.getElementById('payment-schedule-body');
  tbody.innerHTML = '';

  l.paymentSchedule.forEach(p => {
    const isPaid = p.status === 'Paid';
    const statusClass = isPaid ? 'badge-success' : 'badge-danger';

    tbody.innerHTML += `
      <tr>
        <td>${p.dueDate}</td>
        <td style="font-weight:600; color:#fff;">£${p.amount.toFixed(2)}</td>
        <td>${p.paymentDate || '<span class="text-muted">-</span>'}</td>
        <td><span class="badge ${statusClass}">${p.status}</span></td>
        <td>
          <input type="checkbox" ${isPaid ? 'checked' : ''} onchange="toggleLeasePaymentStatus('${l.id}', '${p.id}', this.checked)" style="width: 16px; height: 16px; cursor: pointer;">
        </td>
      </tr>
    `;
  });

  document.getElementById('lease-payment-modal').style.display = 'flex';
}

function closeLeasePaymentModal() {
  document.getElementById('lease-payment-modal').style.display = 'none';
}

async function toggleLeasePaymentStatus(leaseId, payId, isChecked) {
  const status = isChecked ? 'Paid' : 'Pending';
  const res = await apiCall(`/leases/${leaseId}/payments/${payId}`, 'PUT', { status });
  if (res) {
    showToast(`Payment marked as ${status}.`, 'success');
    await fetchLeases();
    calculateAndRenderLeasingMetrics();
    if (activeLeasingTab === 'dashboard') {
      renderLeasingDashboard();
    } else if (activeLeasingTab === 'reports') {
      renderLeasingReports();
    } else {
      renderLeases();
    }
    openLeasePaymentModal(leaseId);
  }
}

async function renewLeasePrompt(leaseId) {
  const l = leases.find(item => item.id === leaseId);
  if (!l) return;

  const currentEnd = new Date(l.endDate);
  const newEnd = new Date(currentEnd.setMonth(currentEnd.getMonth() + 6)).toISOString().substring(0, 10);
  const newEndDateInput = prompt(`Renew Lease ${leaseId} - Enter new lease end date:`, newEnd);

  if (newEndDateInput) {
    const res = await apiCall(`/leases/${leaseId}`, 'PUT', { endDate: newEndDateInput, status: 'Active' });
    if (res) {
      showToast('Lease renewed and extended.', 'success');
      await fetchLeases();
      calculateAndRenderLeasingMetrics();
      renderLeasingSubTab();
    }
  }
}

async function terminateLeasePrompt(leaseId) {
  if (confirm(`Are you sure you want to stop/terminate lease ${leaseId} early? This will release the vehicle back to Available status.`)) {
    const res = await apiCall(`/leases/${leaseId}`, 'PUT', { status: 'Terminated' });
    if (res) {
      showToast('Lease contract terminated early.', 'warning');
      await fetchLeases();
      await fetchVehicles();
      calculateAndRenderLeasingMetrics();
      renderLeasingSubTab();
    }
  }
}

// Expose handlers to window
window.openVehicleModal = openVehicleModal;
window.closeVehicleModal = closeVehicleModal;
window.deleteVehicle = deleteVehicle;
window.openLeaseModal = openLeaseModal;
window.closeLeaseModal = closeLeaseModal;
window.deleteLease = deleteLease;
window.openConditionModal = openConditionModal;
window.closeConditionModal = closeConditionModal;
window.viewVehicleCondition = viewVehicleCondition;
window.openLeasePaymentModal = openLeasePaymentModal;
window.closeLeasePaymentModal = closeLeasePaymentModal;
window.toggleLeasePaymentStatus = toggleLeasePaymentStatus;
window.renewLeasePrompt = renewLeasePrompt;
window.terminateLeasePrompt = terminateLeasePrompt;
window.calculateAndRenderLeasingMetrics = calculateAndRenderLeasingMetrics;
window.renderLeasingSubTab = renderLeasingSubTab;

window.openContractModal = openContractModal;
window.deleteContract = deleteContract;
window.openCaseModal = openCaseModal;
window.deleteCase = deleteCase;
window.openComplianceModal = openComplianceModal;
window.deleteCompliance = deleteCompliance;
window.toggleComplianceStatus = toggleComplianceStatus;
window.calculateAndRenderLegalsMetrics = calculateAndRenderLegalsMetrics;
window.renderLegalsSubTab = renderLegalsSubTab;
window.closeContractModal = closeContractModal;
window.closeCaseModal = closeCaseModal;
window.closeComplianceModal = closeComplianceModal;

window.contracts = contracts;
window.cases = cases;
window.compliance = compliance;
window.vehicles = vehicles;
window.leases = leases;

// --- PAYROLL CONTROLLER LOGIC ---

async function fetchPayrollRuns() {
  const data = await apiCall('/payroll/runs');
  if (data) {
    payrollRuns = data;
  }
}

function calculateAndRenderPayrollMetrics() {
  const currentMonthStr = systemStatus.simulatedDate ? systemStatus.simulatedDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
  const currentYear = systemStatus.simulatedDate ? systemStatus.simulatedDate.substring(0, 4) : new Date().getFullYear().toString();
  
  // Filter runs by selected company
  let filteredRuns = payrollRuns;
  if (activePayrollCompany !== 'Consolidated') {
    filteredRuns = payrollRuns.filter(r => r.company === activePayrollCompany);
  }

  // 1. This Month Payroll Total
  let monthTotal = 0;
  let processedEmployees = new Set();
  let pendingApprovals = 0;
  
  filteredRuns.forEach(r => {
    if (r.month === currentMonthStr) {
      if (r.status === 'Approved') {
        monthTotal += r.totalNet;
        r.records.forEach(rec => processedEmployees.add(rec.employeeId));
      } else if (r.status === 'Draft') {
        pendingApprovals++;
      }
    } else {
      if (r.status === 'Draft') {
        pendingApprovals++;
      }
    }
  });

  // 2. YTD Payroll Cost
  let ytdTotal = 0;
  filteredRuns.forEach(r => {
    if (r.status === 'Approved' && r.month.startsWith(currentYear)) {
      ytdTotal += r.totalNet;
    }
  });

  // Render metrics
  document.getElementById('payroll-stat-month-total').textContent = `£${monthTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById('payroll-stat-processed-count').textContent = processedEmployees.size;
  document.getElementById('payroll-stat-pending-approvals').textContent = pendingApprovals;
  document.getElementById('payroll-stat-ytd-total').textContent = `£${ytdTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  // Organization Cost Analysis section on dashboard
  let totalDevsNet = 0;
  let totalITNet = 0;
  
  payrollRuns.forEach(r => {
    if (r.status === 'Approved' && r.month === currentMonthStr) {
      if (r.company === 'Pearls Developers Limited') {
        totalDevsNet += r.totalNet;
      } else if (r.company === 'Pearls IT') {
        totalITNet += r.totalNet;
      }
    }
  });

  const combinedTotal = totalDevsNet + totalITNet;
  const devsPct = combinedTotal > 0 ? Math.round((totalDevsNet / combinedTotal) * 100) : 0;
  const itPct = combinedTotal > 0 ? Math.round((totalITNet / combinedTotal) * 100) : 0;

  document.getElementById('payroll-pct-devs').textContent = `${devsPct}%`;
  document.getElementById('payroll-bar-devs').style.width = `${devsPct}%`;
  document.getElementById('payroll-details-devs').textContent = `£${totalDevsNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} paid this month`;

  document.getElementById('payroll-pct-it').textContent = `${itPct}%`;
  document.getElementById('payroll-bar-it').style.width = `${itPct}%`;
  document.getElementById('payroll-details-it').textContent = `£${totalITNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} paid this month`;
}

function setupPayrollEventListeners() {
  // Company Toggle
  const companyBtns = document.querySelectorAll('.payroll-company-toggle-buttons .toggle-btn');
  companyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      companyBtns.forEach(b => {
        b.classList.remove('active');
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.color = '#fff';
      activePayrollCompany = btn.getAttribute('data-payroll-company');
      renderPayrollSubTab();
    });
  });

  // Sub tabs
  const tabBtns = document.querySelectorAll('.payroll-sub-tabs .payroll-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.color = '#fff';
      activePayrollTab = btn.getAttribute('data-payroll-tab');
      
      document.querySelectorAll('.payroll-panel').forEach(p => p.style.display = 'none');
      document.getElementById(`payroll-panel-${activePayrollTab}`).style.display = 'block';
      renderPayrollSubTab();
    });
  });

  // Edit Salary modal handlers
  document.getElementById('btn-close-salary-modal').addEventListener('click', closeSalaryModal);
  document.getElementById('btn-cancel-salary-modal').addEventListener('click', closeSalaryModal);
  document.getElementById('salary-structure-form').addEventListener('submit', handleSalarySubmit);

  // Processor form handler
  document.getElementById('payroll-run-processor-form').addEventListener('submit', handlePayrollCalculate);
  
  // Save run
  document.getElementById('btn-save-payroll-run').addEventListener('click', savePayrollRun);

  // Details modal handlers
  document.getElementById('btn-close-payroll-details-modal').addEventListener('click', closePayrollDetailsModal);
  document.getElementById('btn-payroll-export-bank').addEventListener('click', () => {
    const runId = document.getElementById('btn-payroll-export-bank').getAttribute('data-run-id');
    exportBankCSV(runId);
  });
  document.getElementById('btn-payroll-distribute-emails').addEventListener('click', () => {
    const runId = document.getElementById('btn-payroll-distribute-emails').getAttribute('data-run-id');
    distributePayslipEmails(runId);
  });

  // Payslip modal handlers
  document.getElementById('btn-close-payslip-modal').addEventListener('click', closePayslipModal);
  document.getElementById('btn-print-payslip').addEventListener('click', printPayslip);

  // Reports handlers
  const reportBtns = document.querySelectorAll('.payroll-report-toggle-btn');
  reportBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      reportBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePayrollReport = btn.getAttribute('data-payroll-report');
      
      document.querySelectorAll('.payroll-report-viewport').forEach(v => v.style.display = 'none');
      document.getElementById(`payroll-report-view-${activePayrollReport}`).style.display = 'block';
      renderPayrollReports();
    });
  });

  document.getElementById('payroll-report-summary-run').addEventListener('change', renderPayrollReportSummary);
  document.getElementById('payroll-report-payslip-emp').addEventListener('change', renderPayrollReportPayslips);
  document.getElementById('payroll-report-tax-year').addEventListener('change', renderPayrollReportTax);
}

function renderPayrollSubTab() {
  calculateAndRenderPayrollMetrics();
  
  if (activePayrollTab === 'dashboard') {
    renderPayrollDashboard();
  } else if (activePayrollTab === 'salary') {
    renderPayrollSalary();
  } else if (activePayrollTab === 'run') {
    renderPayrollRun();
  } else if (activePayrollTab === 'history') {
    renderPayrollHistory();
  } else if (activePayrollTab === 'reports') {
    renderPayrollReports();
  }
}

function renderPayrollDashboard() {
  const currentMonthStr = systemStatus.simulatedDate ? systemStatus.simulatedDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
  
  // 1. Render Alerts / Pending Actions
  const alertsContainer = document.getElementById('payroll-alerts-container');
  alertsContainer.innerHTML = '';
  
  let alerts = [];
  
  // Check for draft runs
  const draftRuns = payrollRuns.filter(r => r.status === 'Draft');
  draftRuns.forEach(r => {
    alerts.push({
      type: 'warning',
      text: `Draft payroll run exists for <strong>${r.company}</strong> (${r.month}). Admin approval is required.`,
      icon: 'fa-hourglass-half'
    });
  });

  // Check if current month is processed for both companies
  const companies = ['Pearls Developers Limited', 'Pearls IT'];
  companies.forEach(comp => {
    if (activePayrollCompany !== 'Consolidated' && activePayrollCompany !== comp) return;
    
    const hasRun = payrollRuns.some(r => r.month === currentMonthStr && r.company === comp);
    if (!hasRun) {
      alerts.push({
        type: 'info',
        text: `Payroll processing for <strong>${comp}</strong> (${currentMonthStr}) is pending calculation.`,
        icon: 'fa-calculator'
      });
    }
  });

  if (alerts.length === 0) {
    alertsContainer.innerHTML = '<div class="text-center text-muted" style="padding: 20px;">No alerts. Payroll runs are up to date.</div>';
  } else {
    alerts.forEach(al => {
      const card = document.createElement('div');
      card.className = `glass-panel alert-card alert-${al.type}`;
      card.style.padding = '12px 15px';
      card.style.borderRadius = '6px';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '12px';
      card.style.background = al.type === 'warning' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(14, 165, 233, 0.1)';
      card.style.border = al.type === 'warning' ? '1px solid rgba(217, 119, 6, 0.2)' : '1px solid rgba(14, 165, 233, 0.2)';
      
      const iconColor = al.type === 'warning' ? 'text-amber' : 'text-cyan';
      card.innerHTML = `<i class="fa-solid ${al.icon} ${iconColor}" style="font-size:16px;"></i> <span style="font-size:12px; color:#e2e8f0;">${al.text}</span>`;
      alertsContainer.appendChild(card);
    });
  }

  // 2. Render Recent Approved Runs
  const approvedBody = document.getElementById('payroll-approved-summary-body');
  approvedBody.innerHTML = '';
  
  let approvedRuns = payrollRuns.filter(r => r.status === 'Approved');
  if (activePayrollCompany !== 'Consolidated') {
    approvedRuns = approvedRuns.filter(r => r.company === activePayrollCompany);
  }
  
  approvedRuns.sort((a,b) => b.month.localeCompare(a.month));
  const topRuns = approvedRuns.slice(0, 5);
  
  if (topRuns.length === 0) {
    approvedBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding: 20px;">No approved runs registered.</td></tr>';
  } else {
    topRuns.forEach(r => {
      approvedBody.innerHTML += `
        <tr>
          <td><strong>${r.month}</strong></td>
          <td><span style="font-size:11px; padding:3px 8px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);">${r.company}</span></td>
          <td style="color:var(--accent-emerald); font-weight:600;">£${r.totalNet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td style="font-size:11px; color:var(--color-text-muted);">${r.processedDate}</td>
        </tr>
      `;
    });
  }
}

function renderPayrollSalary() {
  const tbody = document.getElementById('payroll-salary-registry-body');
  tbody.innerHTML = '';
  
  let filteredEmps = employees;
  if (activePayrollCompany !== 'Consolidated') {
    filteredEmps = employees.filter(e => e.company === activePayrollCompany);
  }
  
  if (filteredEmps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding: 20px;">No employee records found.</td></tr>';
    return;
  }
  
  filteredEmps.forEach(emp => {
    const struct = emp.salaryStructure || {
      baseSalary: 0,
      allowances: { travel: 0, housing: 0, mobile: 0 },
      deductions: { taxPercent: 0, pensionPercent: 0, loanRepayment: 0 },
      bankDetails: { bankName: '', iban: '', sortCode: '' }
    };
    
    const base = struct.baseSalary;
    const allowances = (struct.allowances.travel || 0) + (struct.allowances.housing || 0) + (struct.allowances.mobile || 0);
    const gross = base + allowances;
    const deductions = (base * ((struct.deductions.taxPercent || 0) + (struct.deductions.pensionPercent || 0)) / 100) + (struct.deductions.loanRepayment || 0);
    const net = gross - deductions;
    const bank = struct.bankDetails.bankName ? `${struct.bankDetails.bankName} (${struct.bankDetails.sortCode || ''})` : '<span class="text-muted">Not Set</span>';

    tbody.innerHTML += `
      <tr>
        <td><strong>${emp.name}</strong></td>
        <td><span style="font-size:11px; padding:3px 8px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);">${emp.company}</span></td>
        <td style="font-size:12px; color:var(--color-text-muted);">${emp.jobTitle}</td>
        <td>£${base.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-cyan);">+£${allowances.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-red);">-£${deductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="font-weight:600; color:var(--accent-emerald);">£${net.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="font-size:11px; color:var(--color-text-muted);">${bank}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openSalaryModal('${emp.id}')" style="padding: 4px 8px; font-size:11px;"><i class="fa-solid fa-pen-to-square"></i> Configure</button>
        </td>
      </tr>
    `;
  });
}

function renderPayrollRun() {
  const currentMonthStr = systemStatus.simulatedDate ? systemStatus.simulatedDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
  
  const runMonthInput = document.getElementById('payroll-run-month');
  if (!runMonthInput.value) {
    runMonthInput.value = currentMonthStr;
  }
  
  if (currentPayrollPreview) {
    showPayrollPreview();
  } else {
    document.getElementById('payroll-preview-container').style.display = 'none';
  }
}

function handlePayrollCalculate(e) {
  e.preventDefault();
  
  const month = document.getElementById('payroll-run-month').value;
  const company = document.getElementById('payroll-run-company').value;
  
  if (!month || !company) return;
  
  const duplicate = payrollRuns.some(r => r.month === month && r.company === company && r.status === 'Approved');
  if (duplicate) {
    showToast(`Approved payroll run already exists for ${company} for month ${month}.`, 'error');
    return;
  }
  
  const compEmps = employees.filter(emp => emp.company === company && emp.status === 'Active');
  if (compEmps.length === 0) {
    showToast(`No active employees found for ${company}.`, 'error');
    return;
  }
  
  let records = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  
  compEmps.forEach(emp => {
    const struct = emp.salaryStructure || {
      baseSalary: 3000.00,
      allowances: { travel: 0, housing: 0, mobile: 0 },
      deductions: { taxPercent: 15.0, pensionPercent: 5.0, loanRepayment: 0.0 },
      bankDetails: { bankName: 'Standard Bank', iban: '', sortCode: '' }
    };
    
    const base = struct.baseSalary;
    const al = struct.allowances;
    const de = struct.deductions;
    const bank = struct.bankDetails;
    
    const travel = al.travel || 0;
    const housing = al.housing || 0;
    const mobile = al.mobile || 0;
    
    const gross = base + travel + housing + mobile;
    
    const tax = base * ((de.taxPercent || 0) / 100);
    const pension = base * ((de.pensionPercent || 0) / 100);
    const loan = de.loanRepayment || 0;
    
    const deduct = tax + pension + loan;
    const net = gross - deduct;
    
    totalGross += gross;
    totalDeductions += deduct;
    totalNet += net;
    
    records.push({
      employeeId: emp.id,
      employeeName: emp.name,
      jobTitle: emp.jobTitle,
      baseSalary: base,
      allowances: { travel, housing, mobile },
      deductions: { tax, pension, loan },
      grossPay: gross,
      totalDeductions: deduct,
      netPay: net,
      bankName: bank.bankName || 'Standard Bank',
      iban: bank.iban || '',
      sortCode: bank.sortCode || '',
      email: emp.email || '',
      emailSent: false,
      emailSentDate: null
    });
  });
  
  currentPayrollPreview = {
    month,
    company,
    records,
    totalGross,
    totalDeductions,
    totalNet
  };
  
  showPayrollPreview();
  showToast('Payroll previews calculated successfully.', 'success');
}

function showPayrollPreview() {
  if (!currentPayrollPreview) return;
  
  const title = document.getElementById('payroll-preview-title');
  title.innerHTML = `<i class="fa-solid fa-file-invoice-dollar text-purple"></i> Payroll Calculation Preview - <strong>${currentPayrollPreview.company}</strong> (${currentPayrollPreview.month})`;
  
  const tbody = document.getElementById('payroll-preview-body');
  tbody.innerHTML = '';
  
  currentPayrollPreview.records.forEach(r => {
    const alTotal = r.allowances.travel + r.allowances.housing + r.allowances.mobile;
    tbody.innerHTML += `
      <tr>
        <td><strong>${r.employeeName}</strong><br><span style="font-size:10px; color:var(--color-text-muted);">${r.jobTitle}</span></td>
        <td>£${r.baseSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-cyan);">+£${alTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="font-weight:600;">£${r.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>£${r.deductions.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>£${r.deductions.pension.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>£${r.deductions.loan.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-red); font-weight:600;">£${r.totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-emerald); font-weight:600; font-size:13px;">£${r.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    `;
  });
  
  document.getElementById('preview-total-gross').textContent = `£${currentPayrollPreview.totalGross.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
  document.getElementById('preview-total-deductions').textContent = `£${currentPayrollPreview.totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
  document.getElementById('preview-total-net').textContent = `£${currentPayrollPreview.totalNet.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
  
  document.getElementById('payroll-preview-container').style.display = 'block';
}

async function savePayrollRun() {
  if (!currentPayrollPreview) return;
  
  const saveBtn = document.getElementById('btn-save-payroll-run');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  const res = await apiCall('/payroll/runs', 'POST', currentPayrollPreview);
  
  saveBtn.disabled = false;
  saveBtn.innerHTML = '<i class="fa-solid fa-file-invoice-dollar"></i> Commit Draft Run';
  
  if (res) {
    showToast(`Draft payroll run saved for ${currentPayrollPreview.company} (${currentPayrollPreview.month}).`, 'success');
    currentPayrollPreview = null;
    document.getElementById('payroll-preview-container').style.display = 'none';
    
    await fetchPayrollRuns();
    const historyTab = document.querySelector('.payroll-tab-btn[data-payroll-tab="history"]');
    if (historyTab) historyTab.click();
  }
}

function renderPayrollHistory() {
  const tbody = document.getElementById('payroll-history-registry-body');
  tbody.innerHTML = '';
  
  let filteredRuns = payrollRuns;
  if (activePayrollCompany !== 'Consolidated') {
    filteredRuns = payrollRuns.filter(r => r.company === activePayrollCompany);
  }
  
  filteredRuns.sort((a,b) => b.month.localeCompare(a.month));
  
  if (filteredRuns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding: 20px;">No payroll runs archived.</td></tr>';
    return;
  }
  
  filteredRuns.forEach(r => {
    const isApproved = r.status === 'Approved';
    const statusBadge = isApproved 
      ? '<span class="status-indicator active" style="padding:3px 8px; border-radius:12px; font-size:10px;">Approved</span>'
      : '<span class="status-indicator simulated" style="padding:3px 8px; border-radius:12px; font-size:10px; background:rgba(245, 158, 11, 0.15); border:1px solid rgba(245, 158, 11, 0.3); color:#f59e0b;">Draft</span>';
      
    let actionsHtml = '';
    if (isApproved) {
      actionsHtml = `<button class="btn btn-secondary btn-sm" onclick="openPayrollDetailsModal('${r.id}')" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-eye"></i> View Details</button>`;
    } else {
      actionsHtml = `
        <button class="btn btn-accent btn-sm" onclick="approvePayrollRun('${r.id}')" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-circle-check"></i> Approve</button>
        <button class="btn btn-secondary btn-sm" onclick="deletePayrollRun('${r.id}')" style="padding:4px 8px; font-size:11px; background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.2); color:#ef4444;"><i class="fa-solid fa-trash"></i> Delete</button>
      `;
    }

    tbody.innerHTML += `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.month}</td>
        <td><span style="font-size:11px; padding:3px 8px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);">${r.company}</span></td>
        <td>${statusBadge}</td>
        <td style="font-size:11px; color:var(--color-text-muted);">${r.processedDate}</td>
        <td>£${r.totalGross.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-red);">-£${r.totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="font-weight:600; color:var(--accent-emerald);">£${r.totalNet.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>
          <div style="display:flex; gap:5px;">
            ${actionsHtml}
          </div>
        </td>
      </tr>
    `;
  });
}

async function approvePayrollRun(runId) {
  if (confirm(`Are you sure you want to approve payroll run ${runId}? This will finalize payouts and log double-entry general ledger records in Accounting.`)) {
    const res = await apiCall(`/payroll/runs/${runId}/approve`, 'POST');
    if (res) {
      showToast('Payroll run approved and journaled successfully.', 'success');
      await fetchPayrollRuns();
      await fetchJournals();
      renderPayrollSubTab();
    }
  }
}

async function deletePayrollRun(runId) {
  if (confirm(`Are you sure you want to delete draft payroll run ${runId}? This action cannot be undone.`)) {
    const res = await apiCall(`/payroll/runs/${runId}`, 'DELETE');
    if (res) {
      showToast('Draft payroll run deleted.', 'warning');
      await fetchPayrollRuns();
      renderPayrollSubTab();
    }
  }
}

function openSalaryModal(empId) {
  const emp = employees.find(e => e.id === empId);
  if (!emp) return;
  
  document.getElementById('salary-emp-id').value = empId;
  document.getElementById('salary-modal-title').innerHTML = `<i class="fa-solid fa-sack-dollar text-cyan"></i> Salary Profile: <strong>${emp.name}</strong>`;
  
  const struct = emp.salaryStructure || {
    baseSalary: 3000.00,
    allowances: { travel: 0, housing: 0, mobile: 0 },
    deductions: { taxPercent: 15.0, pensionPercent: 5.0, loanRepayment: 0.0 },
    bankDetails: { bankName: '', iban: '', sortCode: '' }
  };
  
  document.getElementById('salary-base').value = struct.baseSalary;
  document.getElementById('salary-travel').value = struct.allowances.travel || 0;
  document.getElementById('salary-housing').value = struct.allowances.housing || 0;
  document.getElementById('salary-mobile').value = struct.allowances.mobile || 0;
  
  document.getElementById('salary-tax').value = struct.deductions.taxPercent;
  document.getElementById('salary-pension').value = struct.deductions.pensionPercent;
  document.getElementById('salary-loan').value = struct.deductions.loanRepayment || 0;
  
  document.getElementById('salary-bank').value = struct.bankDetails.bankName || '';
  document.getElementById('salary-iban').value = struct.bankDetails.iban || '';
  document.getElementById('salary-sort').value = struct.bankDetails.sortCode || '';
  
  document.getElementById('salary-structure-modal').style.display = 'flex';
}

function closeSalaryModal() {
  document.getElementById('salary-structure-modal').style.display = 'none';
}

async function handleSalarySubmit(e) {
  e.preventDefault();
  
  const empId = document.getElementById('salary-emp-id').value;
  
  const body = {
    baseSalary: parseFloat(document.getElementById('salary-base').value || 0),
    allowances: {
      travel: parseFloat(document.getElementById('salary-travel').value || 0),
      housing: parseFloat(document.getElementById('salary-housing').value || 0),
      mobile: parseFloat(document.getElementById('salary-mobile').value || 0)
    },
    deductions: {
      taxPercent: parseFloat(document.getElementById('salary-tax').value || 0),
      pensionPercent: parseFloat(document.getElementById('salary-pension').value || 0),
      loanRepayment: parseFloat(document.getElementById('salary-loan').value || 0)
    },
    bankDetails: {
      bankName: document.getElementById('salary-bank').value,
      iban: document.getElementById('salary-iban').value,
      sortCode: document.getElementById('salary-sort').value
    }
  };
  
  const res = await apiCall(`/employees/${empId}/salary-structure`, 'PUT', body);
  if (res) {
    showToast('Employee salary structure updated successfully.', 'success');
    closeSalaryModal();
    
    await fetchEmployees();
    renderPayrollSalary();
  }
}

function openPayrollDetailsModal(runId) {
  const run = payrollRuns.find(r => r.id === runId);
  if (!run) return;
  
  document.getElementById('payroll-details-company').textContent = run.company;
  document.getElementById('payroll-details-month').textContent = run.month;
  document.getElementById('payroll-details-date').textContent = run.processedDate;
  
  const statusBadge = document.getElementById('payroll-details-status-badge');
  const isApproved = run.status === 'Approved';
  statusBadge.innerHTML = isApproved 
    ? '<span class="status-indicator active" style="padding:3px 8px; border-radius:12px; font-size:10px;">Approved</span>'
    : '<span class="status-indicator simulated" style="padding:3px 8px; border-radius:12px; font-size:10px; background:rgba(245, 158, 11, 0.15); border:1px solid rgba(245, 158, 11, 0.3); color:#f59e0b;">Draft</span>';

  const tbody = document.getElementById('payroll-details-records-body');
  tbody.innerHTML = '';
  
  run.records.forEach(rec => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${rec.employeeName}</strong><br><span style="font-size:10px; color:var(--color-text-muted);">${rec.jobTitle}</span></td>
        <td>£${rec.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>£${rec.deductions.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>£${rec.deductions.pension.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>£${rec.deductions.loan.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-red);">£${rec.totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-emerald); font-weight:600;">£${rec.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openPayslipModal('${run.id}', '${rec.employeeId}')" style="padding:3px 6px; font-size:10px;"><i class="fa-solid fa-receipt"></i> View Payslip</button>
        </td>
      </tr>
    `;
  });
  
  document.getElementById('payroll-details-sum-gross').textContent = `£${run.totalGross.toLocaleString(undefined, {minimumFractionDigits:2})}`;
  document.getElementById('payroll-details-sum-deductions').textContent = `£${run.totalDeductions.toLocaleString(undefined, {minimumFractionDigits:2})}`;
  document.getElementById('payroll-details-sum-net').textContent = `£${run.totalNet.toLocaleString(undefined, {minimumFractionDigits:2})}`;
  
  document.getElementById('btn-payroll-export-bank').setAttribute('data-run-id', runId);
  document.getElementById('btn-payroll-distribute-emails').setAttribute('data-run-id', runId);
  
  document.getElementById('payroll-details-modal').style.display = 'flex';
}

function closePayrollDetailsModal() {
  document.getElementById('payroll-details-modal').style.display = 'none';
}

function exportBankCSV(runId) {
  const run = payrollRuns.find(r => r.id === runId);
  if (!run) return;
  
  let csv = 'Employee ID,Employee Name,Bank Name,IBAN,Sort Code,Net Salary,Currency\n';
  run.records.forEach(rec => {
    csv += `"${rec.employeeId}","${rec.employeeName}","${rec.bankName}","${rec.iban}","${rec.sortCode}",${rec.netPay},"GBP"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bank_transfer_${run.company.replace(/\s+/g, '_')}_${run.month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('Bank transfer CSV instructions exported.', 'success');
}

function distributePayslipEmails(runId) {
  const run = payrollRuns.find(r => r.id === runId);
  if (!run) return;
  
  showToast('Distributing payslips to employee mailbox accounts...', 'info');
  
  setTimeout(() => {
    showToast(`Successfully emailed ${run.records.length} payslips to respective employee mail accounts.`, 'success');
    
    run.records.forEach(rec => {
      const logMsg = `Simulated SMTP: Sent monthly payslip for ${run.month} to ${rec.employeeName} (${rec.email})`;
      console.log(logMsg);
    });
  }, 1000);
}

function openPayslipModal(runId, employeeId) {
  const run = payrollRuns.find(r => r.id === runId);
  if (!run) return;
  
  const rec = run.records.find(r => r.employeeId === employeeId);
  if (!rec) return;
  
  document.getElementById('payslip-header-company').textContent = run.company;
  document.getElementById('payslip-info-month').textContent = run.month;
  
  document.getElementById('payslip-emp-name').textContent = rec.employeeName;
  document.getElementById('payslip-emp-title').textContent = rec.jobTitle;
  document.getElementById('payslip-emp-id').textContent = `ID: ${rec.employeeId}`;
  
  document.getElementById('payslip-bank-name').textContent = rec.bankName;
  document.getElementById('payslip-bank-iban').textContent = rec.iban || 'N/A';
  document.getElementById('payslip-bank-sort').textContent = rec.sortCode || 'N/A';
  
  const tbody = document.getElementById('payslip-table-body');
  tbody.innerHTML = `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
      <td style="padding: 10px 0;">Basic Salary</td>
      <td style="padding: 10px 0; text-align: right;">£${rec.baseSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      <td style="padding: 10px 0; text-align: right;">-</td>
    </tr>
  `;
  
  if (rec.allowances.travel > 0) {
    tbody.innerHTML += `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding: 10px 0;">Travel Allowance</td>
        <td style="padding: 10px 0; text-align: right;">£${rec.allowances.travel.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="padding: 10px 0; text-align: right;">-</td>
      </tr>
    `;
  }
  
  if (rec.allowances.housing > 0) {
    tbody.innerHTML += `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding: 10px 0;">Housing Allowance</td>
        <td style="padding: 10px 0; text-align: right;">£${rec.allowances.housing.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="padding: 10px 0; text-align: right;">-</td>
      </tr>
    `;
  }
  
  if (rec.allowances.mobile > 0) {
    tbody.innerHTML += `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding: 10px 0;">Mobile Allowance</td>
        <td style="padding: 10px 0; text-align: right;">£${rec.allowances.mobile.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="padding: 10px 0; text-align: right;">-</td>
      </tr>
    `;
  }
  
  if (rec.deductions.tax > 0) {
    tbody.innerHTML += `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding: 10px 0;">Income Tax Witheld</td>
        <td style="padding: 10px 0; text-align: right;">-</td>
        <td style="padding: 10px 0; text-align: right; color:var(--accent-red);">-£${rec.deductions.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    `;
  }
  
  if (rec.deductions.pension > 0) {
    tbody.innerHTML += `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding: 10px 0;">Pension Contributions</td>
        <td style="padding: 10px 0; text-align: right;">-</td>
        <td style="padding: 10px 0; text-align: right; color:var(--accent-red);">-£${rec.deductions.pension.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    `;
  }
  
  if (rec.deductions.loan > 0) {
    tbody.innerHTML += `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding: 10px 0;">Loan Repayment Deduction</td>
        <td style="padding: 10px 0; text-align: right;">-</td>
        <td style="padding: 10px 0; text-align: right; color:var(--accent-red);">-£${rec.deductions.loan.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    `;
  }
  
  document.getElementById('payslip-summary-gross').textContent = `£${rec.grossPay.toLocaleString(undefined, {minimumFractionDigits:2})}`;
  document.getElementById('payslip-summary-deduct').textContent = `£${rec.totalDeductions.toLocaleString(undefined, {minimumFractionDigits:2})}`;
  document.getElementById('payslip-summary-net').textContent = `£${rec.netPay.toLocaleString(undefined, {minimumFractionDigits:2})}`;
  
  document.getElementById('payslip-modal').style.display = 'flex';
}

function closePayslipModal() {
  document.getElementById('payslip-modal').style.display = 'none';
}

function printPayslip() {
  const content = document.getElementById('payslip-printable-content').innerHTML;
  const printWindow = window.open('', '', 'height=650,width=800');
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Employee Payslip</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Outfit', sans-serif;
            background: #ffffff;
            color: #000000;
            padding: 40px;
            box-sizing: border-box;
          }
          h3, h4, p, th, td, div, span { color: #000000 !important; }
          #payslip-printable-content { width: 100%; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { border-bottom: 2px solid #000; padding: 10px 0; text-align: left; }
          td { border-bottom: 1px solid #ddd; padding: 10px 0; }
          .text-right { text-align: right; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function renderPayrollReports() {
  if (activePayrollReport === 'summary') {
    renderPayrollReportSummary();
  } else if (activePayrollReport === 'payslip') {
    renderPayrollReportPayslips();
  } else if (activePayrollReport === 'tax') {
    renderPayrollReportTax();
  } else if (activePayrollReport === 'dept') {
    renderPayrollReportDept();
  }
}

function renderPayrollReportSummary() {
  const runSelect = document.getElementById('payroll-report-summary-run');
  const previousVal = runSelect.value;
  runSelect.innerHTML = '';
  
  const approvedRuns = payrollRuns.filter(r => r.status === 'Approved');
  
  if (approvedRuns.length === 0) {
    runSelect.innerHTML = '<option value="">No approved runs available</option>';
    document.getElementById('payroll-report-summary-body').innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:20px;">No approved payroll data.</td></tr>';
    return;
  }
  
  approvedRuns.forEach(r => {
    runSelect.innerHTML += `<option value="${r.id}">${r.month} - ${r.company}</option>`;
  });
  
  if (previousVal && approvedRuns.some(r => r.id === previousVal)) {
    runSelect.value = previousVal;
  }
  
  const selectedRunId = runSelect.value;
  const run = approvedRuns.find(r => r.id === selectedRunId);
  const tbody = document.getElementById('payroll-report-summary-body');
  tbody.innerHTML = '';
  
  if (!run) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted" style="padding:20px;">Select a run from the dropdown above.</td></tr>';
    return;
  }
  
  run.records.forEach(rec => {
    const alTotal = rec.allowances.travel + rec.allowances.housing + rec.allowances.mobile;
    tbody.innerHTML += `
      <tr>
        <td><strong>${rec.employeeName}</strong><br><span style="font-size:10px; color:var(--color-text-muted);">${rec.jobTitle}</span></td>
        <td>£${rec.baseSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-cyan);">+£${alTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="font-weight:600;">£${rec.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>£${rec.deductions.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>£${rec.deductions.pension.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td>£${rec.deductions.loan.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-red); font-weight:600;">-£${rec.totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-emerald); font-weight:600;">£${rec.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    `;
  });
}

function renderPayrollReportPayslips() {
  const empSelect = document.getElementById('payroll-report-payslip-emp');
  const previousVal = empSelect.value;
  empSelect.innerHTML = '';
  
  if (employees.length === 0) {
    empSelect.innerHTML = '<option value="">No employees registered</option>';
    document.getElementById('payroll-report-payslip-body').innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:20px;">No employees.</td></tr>';
    return;
  }
  
  employees.forEach(e => {
    empSelect.innerHTML += `<option value="${e.id}">${e.name} (${e.company})</option>`;
  });
  
  if (previousVal && employees.some(e => e.id === previousVal)) {
    empSelect.value = previousVal;
  }
  
  const empId = empSelect.value;
  const tbody = document.getElementById('payroll-report-payslip-body');
  tbody.innerHTML = '';
  
  if (!empId) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:20px;">Select an employee from the dropdown above.</td></tr>';
    return;
  }
  
  const approvedRuns = payrollRuns.filter(r => r.status === 'Approved');
  let recordsFound = [];
  
  approvedRuns.forEach(run => {
    const rec = run.records.find(r => r.employeeId === empId);
    if (rec) {
      recordsFound.push({
        runId: run.id,
        month: run.month,
        company: run.company,
        rec
      });
    }
  });
  
  recordsFound.sort((a,b) => b.month.localeCompare(a.month));
  
  if (recordsFound.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:20px;">No payslips archived for this employee.</td></tr>';
    return;
  }
  
  recordsFound.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${item.month}</strong></td>
        <td><span style="font-size:11px; padding:3px 8px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);">${item.company}</span></td>
        <td style="font-size:12px; color:var(--color-text-muted);">${item.rec.jobTitle}</td>
        <td>£${item.rec.grossPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-red);">-£${item.rec.totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="font-weight:600; color:var(--accent-emerald);">£${item.rec.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td><span class="status-indicator active" style="padding:3px 8px; border-radius:12px; font-size:10px;">Processed</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openPayslipModal('${item.runId}', '${empId}')" style="padding: 4px 8px; font-size: 11px;"><i class="fa-solid fa-receipt"></i> Print View</button>
        </td>
      </tr>
    `;
  });
}

function renderPayrollReportTax() {
  const year = document.getElementById('payroll-report-tax-year').value || '2026';
  const tbody = document.getElementById('payroll-report-tax-body');
  tbody.innerHTML = '';
  
  const approvedRuns = payrollRuns.filter(r => r.status === 'Approved' && r.month.startsWith(year));
  
  if (approvedRuns.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:20px;">No approved runs recorded in year ' + year + '.</td></tr>';
    return;
  }
  
  let aggregates = {};
  approvedRuns.forEach(run => {
    run.records.forEach(rec => {
      if (!aggregates[rec.employeeId]) {
        aggregates[rec.employeeId] = {
          name: rec.employeeName,
          company: run.company,
          gross: 0,
          tax: 0,
          pension: 0,
          net: 0
        };
      }
      aggregates[rec.employeeId].gross += rec.grossPay;
      aggregates[rec.employeeId].tax += rec.deductions.tax;
      aggregates[rec.employeeId].pension += rec.deductions.pension;
      aggregates[rec.employeeId].net += rec.netPay;
    });
  });
  
  Object.values(aggregates).forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td><span style="font-size:11px; padding:3px 8px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);">${item.company}</span></td>
        <td>£${item.gross.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-red);">£${item.tax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="color:var(--accent-cyan);">£${item.pension.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="font-weight:600; color:var(--accent-emerald);">£${item.net.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    `;
  });
}

function renderPayrollReportDept() {
  const currentMonthStr = systemStatus.simulatedDate ? systemStatus.simulatedDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
  
  const approvedRuns = payrollRuns.filter(r => r.status === 'Approved' && r.month === currentMonthStr);
  
  let devsDepts = {};
  let itDepts = {};
  
  approvedRuns.forEach(run => {
    run.records.forEach(rec => {
      const emp = employees.find(e => e.id === rec.employeeId);
      const dept = emp ? emp.department : 'General';
      
      if (run.company === 'Pearls Developers Limited') {
        devsDepts[dept] = (devsDepts[dept] || 0) + rec.netPay;
      } else {
        itDepts[dept] = (itDepts[dept] || 0) + rec.netPay;
      }
    });
  });
  
  const renderList = (listEl, deptsObj) => {
    listEl.innerHTML = '';
    const entries = Object.entries(deptsObj);
    
    if (entries.length === 0) {
      listEl.innerHTML = '<div class="text-center text-muted" style="padding:20px;">No payout data this month.</div>';
      return;
    }
    
    const maxVal = Math.max(...entries.map(e => e[1]));
    const totalVal = entries.reduce((acc, curr) => acc + curr[1], 0);
    
    entries.forEach(([dept, net]) => {
      const pctWidth = maxVal > 0 ? Math.round((net / maxVal) * 100) : 0;
      const pctTotal = totalVal > 0 ? Math.round((net / totalVal) * 100) : 0;
      
      listEl.innerHTML += `
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 5px;">
            <span>${dept} (${pctTotal}%)</span>
            <span style="color:var(--accent-cyan);">£${net.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          <div style="background: rgba(255,255,255,0.04); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.03);">
            <div style="background: linear-gradient(90deg, var(--accent-cyan), var(--accent-purple)); width: ${pctWidth}%; height: 100%; border-radius: 4px; transition: width 0.5s ease;"></div>
          </div>
        </div>
      `;
    });
  };
  
  renderList(document.getElementById('payroll-dept-list-devs'), devsDepts);
  renderList(document.getElementById('payroll-dept-list-it'), itDepts);
}

// Expose handlers to window
window.openSalaryModal = openSalaryModal;
window.closeSalaryModal = closeSalaryModal;
window.openPayrollDetailsModal = openPayrollDetailsModal;
window.closePayrollDetailsModal = closePayrollDetailsModal;
window.approvePayrollRun = approvePayrollRun;
window.deletePayrollRun = deletePayrollRun;
window.openPayslipModal = openPayslipModal;
window.closePayslipModal = closePayslipModal;
window.calculateAndRenderPayrollMetrics = calculateAndRenderPayrollMetrics;
window.renderPayrollSubTab = renderPayrollSubTab;
window.setupPayrollEventListeners = setupPayrollEventListeners;
window.fetchPayrollRuns = fetchPayrollRuns;

// --- MODULE 17 WEBSITES, DOMAINS & HOSTING MODULE ---

async function fetchHostingWebsites() {
  const data = await apiCall('/it/websites');
  if (data) hostingWebsites = data;
}

async function fetchHostingDomains() {
  const data = await apiCall('/it/domains');
  if (data) hostingDomains = data;
}

async function fetchHostingServers() {
  const data = await apiCall('/it/servers');
  if (data) hostingServers = data;
}

function setupHostingEventListeners() {
  // Tab buttons
  const tabs = document.querySelectorAll('.hosting-tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.color = '#fff';
      activeHostingTab = btn.getAttribute('data-hosting-tab');
      renderHostingSubTab();
    });
  });

  // Website Modal bindings
  document.getElementById('btn-add-website').addEventListener('click', () => openWebsiteModal());
  document.getElementById('btn-close-website-modal').addEventListener('click', closeWebsiteModal);
  document.getElementById('btn-cancel-website-modal').addEventListener('click', closeWebsiteModal);
  document.getElementById('website-form').addEventListener('submit', handleWebsiteSubmit);

  // Domain Modal bindings
  document.getElementById('btn-add-domain').addEventListener('click', () => openDomainModal());
  document.getElementById('btn-close-domain-modal').addEventListener('click', closeDomainModal);
  document.getElementById('btn-cancel-domain-modal').addEventListener('click', closeDomainModal);
  document.getElementById('domain-form').addEventListener('submit', handleDomainSubmit);

  // Server Modal bindings
  document.getElementById('btn-add-server').addEventListener('click', () => openServerModal());
  document.getElementById('btn-close-server-modal').addEventListener('click', closeServerModal);
  document.getElementById('btn-cancel-server-modal').addEventListener('click', closeServerModal);
  document.getElementById('server-form').addEventListener('submit', handleServerSubmit);

  // DNS modal close bindings
  document.querySelectorAll('#btn-close-dns-modal, #btn-close-dns-modal-bottom').forEach(b => {
    b.addEventListener('click', closeDnsModal);
  });
  document.getElementById('dns-record-add-form').addEventListener('submit', handleDnsRecordAddSubmit);

  // SSH modal close bindings
  document.querySelectorAll('#btn-close-ssh-modal, #btn-close-ssh-modal-bottom').forEach(b => {
    b.addEventListener('click', closeSshModal);
  });
  document.getElementById('btn-copy-ssh-key').addEventListener('click', copySshKeyToClipboard);

  // Live Ping simulation button
  document.getElementById('btn-trigger-ping').addEventListener('click', () => {
    runUptimePingSimulation(true);
  });
}

function calculateAndRenderHostingMetrics() {
  const simDate = systemStatus.simulatedDate || new Date().toISOString().substring(0, 10);

  // Websites Online (UP vs Total)
  const totalSites = hostingWebsites.length;
  const upSites = hostingWebsites.filter(w => w.status === 'UP').length;
  document.getElementById('hosting-stat-uptime').textContent = `${upSites} / ${totalSites}`;

  // Domains expiring within 30 days
  let expiringDomainsCount = 0;
  let domainsAlerts = [];
  hostingDomains.forEach(dom => {
    if (dom.expiryDate) {
      const daysLeft = getDaysDifferenceForInv(simDate, dom.expiryDate);
      if (daysLeft >= 0 && daysLeft <= 30) {
        expiringDomainsCount++;
      }
      // Alerts: 60/30/7 days
      if (daysLeft >= 0 && daysLeft <= 60) {
        let type = 'info';
        if (daysLeft <= 7) type = 'danger';
        else if (daysLeft <= 30) type = 'warning';
        domainsAlerts.push({
          subject: dom.domainName,
          type: type,
          message: `Domain <strong>${dom.domainName}</strong> expires in ${daysLeft} days (${dom.expiryDate}).`,
          daysLeft: daysLeft
        });
      }
    }
  });
  document.getElementById('hosting-stat-domain-expiry').textContent = expiringDomainsCount;

  // Server renewals due within 30 days
  let expiringServersCount = 0;
  let serversAlerts = [];
  hostingServers.forEach(srv => {
    if (srv.renewalDate) {
      const daysLeft = getDaysDifferenceForInv(simDate, srv.renewalDate);
      if (daysLeft >= 0 && daysLeft <= 30) {
        expiringServersCount++;
      }
      // Alerts: 60/30/7 days
      if (daysLeft >= 0 && daysLeft <= 60) {
        let type = 'info';
        if (daysLeft <= 7) type = 'danger';
        else if (daysLeft <= 30) type = 'warning';
        serversAlerts.push({
          subject: srv.name,
          type: type,
          message: `Hosting server <strong>${srv.name}</strong> renewal due in ${daysLeft} days (${srv.renewalDate}).`,
          daysLeft: daysLeft
        });
      }
    }
  });
  document.getElementById('hosting-stat-server-expiry').textContent = expiringServersCount;

  // Total Monthly hosting cost = sum of servers + (domains / 12)
  let totalServerCost = hostingServers.reduce((sum, s) => sum + parseFloat(s.monthlyCost || 0), 0);
  let totalDomainCost = hostingDomains.reduce((sum, d) => sum + parseFloat(d.cost || 0), 0);
  let monthlyCost = totalServerCost + (totalDomainCost / 12);
  document.getElementById('hosting-stat-total-cost').textContent = `£${monthlyCost.toFixed(2)}`;

  // Update alerts container
  const alertsContainer = document.getElementById('hosting-alerts-container');
  const allAlerts = [...domainsAlerts, ...serversAlerts].sort((a, b) => a.daysLeft - b.daysLeft);
  
  if (allAlerts.length === 0) {
    alertsContainer.innerHTML = `<p class="text-muted" style="font-size: 13px; margin: 5px 0;">No active alerts. All systems operational and renewals up-to-date.</p>`;
  } else {
    alertsContainer.innerHTML = allAlerts.map(alert => {
      let icon = 'fa-circle-info text-cyan';
      let border = 'rgba(255,255,255,0.06)';
      let bg = 'rgba(255,255,255,0.02)';
      if (alert.type === 'danger') {
        icon = 'fa-circle-exclamation text-red';
        border = 'rgba(255, 75, 75, 0.2)';
        bg = 'rgba(255, 75, 75, 0.05)';
      } else if (alert.type === 'warning') {
        icon = 'fa-triangle-exclamation text-amber';
        border = 'rgba(255, 175, 0, 0.2)';
        bg = 'rgba(255, 175, 0, 0.05)';
      }
      return `
        <div style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 15px; border-radius: 6px; border: 1px solid ${border}; background: ${bg}; font-size: 13px;">
          <i class="fa-solid ${icon}" style="margin-top: 2px;"></i>
          <div style="flex: 1;">${alert.message}</div>
        </div>
      `;
    }).join('');
  }
}

function renderHostingSubTab() {
  // Hide all panels
  document.querySelectorAll('.hosting-panel').forEach(p => p.style.display = 'none');
  
  // Show active panel
  document.getElementById(`hosting-panel-${activeHostingTab}`).style.display = 'block';

  if (activeHostingTab === 'dashboard') {
    renderHostingDashboard();
  } else if (activeHostingTab === 'websites') {
    renderHostingWebsites();
  } else if (activeHostingTab === 'domains') {
    renderHostingDomains();
  } else if (activeHostingTab === 'servers') {
    renderHostingServers();
  }
}

function renderHostingDashboard() {
  // Disk progress bars
  const diskContainer = document.getElementById('hosting-disk-bars-container');
  if (hostingServers.length === 0) {
    diskContainer.innerHTML = '<p class="text-muted" style="font-size: 13px;">No servers configured.</p>';
  } else {
    diskContainer.innerHTML = hostingServers.map(srv => {
      const disk = srv.diskUsage || 0;
      let barColor = 'var(--accent-cyan)';
      if (disk > 80) barColor = 'var(--accent-red)';
      else if (disk > 60) barColor = 'var(--accent-amber)';
      
      return `
        <div>
          <div style="display:flex; justify-content:space-between; font-size: 12px; font-weight:600; margin-bottom:5px;">
            <span>${srv.name} (${srv.provider})</span>
            <span>${disk}%</span>
          </div>
          <div style="background:rgba(255,255,255,0.05); height:8px; border-radius:4px; overflow:hidden; border: 1px solid rgba(255,255,255,0.03);">
            <div style="background: ${barColor}; width: ${disk}%; height:100%; border-radius:4px;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Provider Distribution
  const providerContainer = document.getElementById('hosting-providers-distribution');
  let providersCount = {};
  hostingServers.forEach(s => {
    providersCount[s.provider] = (providersCount[s.provider] || 0) + 1;
  });
  const entries = Object.entries(providersCount);
  if (entries.length === 0) {
    providerContainer.innerHTML = '<p class="text-muted" style="font-size: 13px;">No provider data available.</p>';
  } else {
    const maxVal = Math.max(...entries.map(e => e[1]));
    providerContainer.innerHTML = entries.map(([prov, cnt]) => {
      const pct = Math.round((cnt / hostingServers.length) * 100);
      return `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; margin-bottom:5px;">
            <span>${prov}</span>
            <span>${cnt} Server(s) (${pct}%)</span>
          </div>
          <div style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px; overflow:hidden; border: 1px solid rgba(255,255,255,0.03);">
            <div style="background: var(--accent-purple); width: ${(cnt/maxVal)*100}%; height:100%; border-radius:3px;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Run/Draw Latency Chart
  runUptimePingSimulation(false);
}

let lastPingTimeData = [];

function runUptimePingSimulation(isManual = false) {
  const baseLatencies = {
    "https://pearls-it.co.uk": 45,
    "https://pearl-developers-limited.co.uk": 110,
    "https://tracker.pearls-developers-limited.co.uk": 75,
    "https://status.pearls-it.co.uk": 32,
    "https://analytics.pearls-it.co.uk": 185,
    "https://staging.pearls-it.co.uk": 220,
    "https://docs.pearls-it.co.uk": 58
  };

  lastPingTimeData = hostingWebsites.map(site => {
    const base = baseLatencies[site.url] || 100;
    const isDown = site.status === 'DOWN';
    const variation = isDown ? 0 : Math.round(base * (0.85 + Math.random() * 0.3));
    return {
      url: site.url.replace('https://', ''),
      latency: variation,
      status: isDown ? 'DOWN' : (variation > 200 ? 'SLOW' : 'UP')
    };
  });

  const upPings = lastPingTimeData.filter(p => p.latency > 0);
  const avgLatency = upPings.length > 0 ? Math.round(upPings.reduce((sum, p) => sum + p.latency, 0) / upPings.length) : 0;
  
  const avgEl = document.getElementById('avg-latency-txt');
  const lastEl = document.getElementById('last-ping-txt');
  if (avgEl) avgEl.textContent = `${avgLatency}ms`;
  if (lastEl) lastEl.textContent = new Date().toLocaleTimeString();

  if (isManual) {
    showToast('Infrastructure ping completed successfully!', 'success');
  }

  drawManualCanvasChart(lastPingTimeData);
}

function drawManualCanvasChart(data) {
  const canvas = document.getElementById('uptime-latency-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = 20 + ((height - 50) / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(45, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.textAlign = 'right';
    const maxVal = 250;
    const val = Math.round(maxVal - (maxVal / gridLines) * i);
    ctx.fillText(`${val}ms`, 37, y + 4);
  }

  if (data.length === 0) return;

  const chartWidth = width - 75;
  const startX = 55;
  const points = data.map((d, index) => {
    const x = startX + (chartWidth / (data.length - 1)) * index;
    const maxVal = 250;
    const val = Math.min(d.latency, maxVal);
    const y = height - 30 - ((height - 50) * (val / maxVal));
    return { x, y, label: d.url, latency: d.latency, status: d.status };
  });

  const grad = ctx.createLinearGradient(0, 20, 0, height - 30);
  grad.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
  grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, height - 30);
  points.forEach(p => {
    ctx.lineTo(p.x, p.y);
  });
  ctx.lineTo(points[points.length - 1].x, height - 30);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, index) => {
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  points.forEach(p => {
    ctx.beginPath();
    let pointColor = '#00f0ff';
    if (p.status === 'DOWN') pointColor = '#ff4b4b';
    else if (p.status === 'SLOW') pointColor = '#ffaf00';

    ctx.fillStyle = pointColor;
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0e1017';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '9px Outfit, sans-serif';
    ctx.textAlign = 'center';
    
    let displayLabel = p.label;
    if (displayLabel.length > 12) displayLabel = displayLabel.substring(0, 10) + '..';
    ctx.fillText(displayLabel, p.x, height - 12);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.fillText(p.latency > 0 ? `${p.latency}ms` : 'OFFLINE', p.x, p.y - 8);
  });
}

function renderHostingWebsites() {
  const tbody = document.getElementById('hosting-websites-tbody');
  tbody.innerHTML = '';

  if (hostingWebsites.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">No websites registered.</td></tr>`;
    return;
  }

  hostingWebsites.forEach(web => {
    const srv = hostingServers.find(s => s.id === web.serverId);
    const dom = hostingDomains.find(d => d.id === web.domainId);

    const srvName = srv ? `${srv.name} (${srv.ipAddress})` : '<span class="text-muted">None</span>';
    const domName = dom ? dom.domainName : '<span class="text-muted">None</span>';

    const statusBadge = web.status === 'UP' 
      ? `<span class="badge badge-success" style="cursor:pointer;" onclick="toggleWebsiteStatus('${web.id}')"><i class="fa-solid fa-circle-arrow-up"></i> UP</span>`
      : `<span class="badge badge-danger" style="cursor:pointer;" onclick="toggleWebsiteStatus('${web.id}')"><i class="fa-solid fa-circle-arrow-down"></i> DOWN</span>`;

    tbody.innerHTML += `
      <tr>
        <td style="font-weight: 600;">
          <a href="${web.url}" target="_blank" class="text-cyan" style="text-decoration:none;"><i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px; margin-right:5px;"></i> ${web.url}</a>
        </td>
        <td>${web.description || '-'}</td>
        <td>
          <span class="label" style="background: rgba(255,255,255,0.05); color:#fff; border: 1px solid rgba(255,255,255,0.1); border-radius:4px; padding:2px 6px; font-size:11px;">${web.cms}</span>
          <span style="font-size: 11px; color: var(--color-text-muted); margin-left: 5px;">${web.techStack}</span>
        </td>
        <td>${srvName}</td>
        <td>${domName}</td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="openWebsiteModal('${web.id}')" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-pencil"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteWebsitePrompt('${web.id}')" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

async function toggleWebsiteStatus(id) {
  const web = hostingWebsites.find(w => w.id === id);
  if (!web) return;

  const newStatus = web.status === 'UP' ? 'DOWN' : 'UP';
  const res = await apiCall(`/it/websites/${id}`, 'PUT', { status: newStatus });
  if (res) {
    showToast(`Website status changed to ${newStatus}!`, 'success');
    await fetchHostingWebsites();
    calculateAndRenderHostingMetrics();
    renderHostingSubTab();
  }
}

function openWebsiteModal(id = null) {
  const modal = document.getElementById('website-modal');
  const form = document.getElementById('website-form');
  const title = document.getElementById('website-modal-title');
  form.reset();

  const srvSelect = document.getElementById('website-server-id');
  const domSelect = document.getElementById('website-domain-id');

  srvSelect.innerHTML = '<option value="">-- Select Server --</option>' + 
    hostingServers.map(s => `<option value="${s.id}">${s.name} (${s.ipAddress})</option>`).join('');

  domSelect.innerHTML = '<option value="">-- Select Domain --</option>' + 
    hostingDomains.map(d => `<option value="${d.id}">${d.domainName}</option>`).join('');

  if (id) {
    const web = hostingWebsites.find(w => w.id === id);
    if (web) {
      title.textContent = 'Edit Registered Website';
      document.getElementById('website-id').value = web.id;
      document.getElementById('website-url').value = web.url;
      document.getElementById('website-description').value = web.description || '';
      document.getElementById('website-cms').value = web.cms || 'Custom HTML';
      document.getElementById('website-techstack').value = web.techStack || '';
      document.getElementById('website-server-id').value = web.serverId || '';
      document.getElementById('website-domain-id').value = web.domainId || '';
      document.getElementById('website-status').value = web.status || 'UP';
    }
  } else {
    title.textContent = 'Register Website';
    document.getElementById('website-id').value = '';
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 50);
}

function closeWebsiteModal() {
  const modal = document.getElementById('website-modal');
  modal.classList.remove('active');
  setTimeout(() => modal.style.display = 'none', 300);
}

async function handleWebsiteSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('website-id').value;
  const payload = {
    url: document.getElementById('website-url').value,
    description: document.getElementById('website-description').value,
    cms: document.getElementById('website-cms').value,
    techStack: document.getElementById('website-techstack').value,
    serverId: document.getElementById('website-server-id').value,
    domainId: document.getElementById('website-domain-id').value,
    status: document.getElementById('website-status').value
  };

  let res;
  if (id) {
    res = await apiCall(`/it/websites/${id}`, 'PUT', payload);
  } else {
    res = await apiCall('/it/websites', 'POST', payload);
  }

  if (res) {
    showToast(id ? 'Website updated successfully!' : 'Website registered successfully!', 'success');
    closeWebsiteModal();
    await fetchHostingWebsites();
    calculateAndRenderHostingMetrics();
    renderHostingSubTab();
  }
}

async function deleteWebsitePrompt(id) {
  if (confirm('Are you sure you want to delete this website registration?')) {
    const res = await apiCall(`/it/websites/${id}`, 'DELETE');
    if (res) {
      showToast('Website registration deleted.', 'success');
      await fetchHostingWebsites();
      calculateAndRenderHostingMetrics();
      renderHostingSubTab();
    }
  }
}

function renderHostingDomains() {
  const tbody = document.getElementById('hosting-domains-tbody');
  tbody.innerHTML = '';

  if (hostingDomains.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">No domains registered.</td></tr>`;
    return;
  }

  hostingDomains.forEach(dom => {
    const renewBadge = dom.autoRenewal 
      ? '<span class="badge badge-success"><i class="fa-solid fa-arrows-spin"></i> Active</span>' 
      : '<span class="badge badge-secondary"><i class="fa-solid fa-ban"></i> Disabled</span>';

    const dnsCount = (dom.dnsRecords || []).length;

    tbody.innerHTML += `
      <tr>
        <td style="font-weight: 600; color: #fff;">${dom.domainName}</td>
        <td>${dom.registrar || '-'}</td>
        <td><i class="fa-regular fa-calendar" style="margin-right:5px; font-size:11px;"></i> ${dom.expiryDate || '-'}</td>
        <td style="text-align: center;">${renewBadge}</td>
        <td>£${parseFloat(dom.cost || 0).toFixed(2)}</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="openDnsModal('${dom.id}')" style="padding: 4px 10px; font-size: 11px;">
            <i class="fa-solid fa-network-wired text-amber"></i> ${dnsCount} Record(s)
          </button>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="openDomainModal('${dom.id}')" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-pencil"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteDomainPrompt('${dom.id}')" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

function openDomainModal(id = null) {
  const modal = document.getElementById('domain-modal');
  const form = document.getElementById('domain-form');
  const title = document.getElementById('domain-modal-title');
  form.reset();

  if (id) {
    const dom = hostingDomains.find(d => d.id === id);
    if (dom) {
      title.textContent = 'Edit Registered Domain';
      document.getElementById('domain-id').value = dom.id;
      document.getElementById('domain-name').value = dom.domainName;
      document.getElementById('domain-registrar').value = dom.registrar || '';
      document.getElementById('domain-expiry').value = dom.expiryDate || '';
      document.getElementById('domain-cost').value = dom.cost || 0.0;
      document.getElementById('domain-autorenew').checked = !!dom.autoRenewal;
    }
  } else {
    title.textContent = 'Register Domain';
    document.getElementById('domain-id').value = '';
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 50);
}

function closeDomainModal() {
  const modal = document.getElementById('domain-modal');
  modal.classList.remove('active');
  setTimeout(() => modal.style.display = 'none', 300);
}

async function handleDomainSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('domain-id').value;
  const payload = {
    domainName: document.getElementById('domain-name').value,
    registrar: document.getElementById('domain-registrar').value,
    expiryDate: document.getElementById('domain-expiry').value,
    cost: parseFloat(document.getElementById('domain-cost').value) || 0.0,
    autoRenewal: document.getElementById('domain-autorenew').checked
  };

  let res;
  if (id) {
    res = await apiCall(`/it/domains/${id}`, 'PUT', payload);
  } else {
    res = await apiCall('/it/domains', 'POST', payload);
  }

  if (res) {
    showToast(id ? 'Domain updated successfully!' : 'Domain registered successfully!', 'success');
    closeDomainModal();
    await fetchHostingDomains();
    calculateAndRenderHostingMetrics();
    renderHostingSubTab();
  }
}

async function deleteDomainPrompt(id) {
  if (confirm('Are you sure you want to delete this domain? This will also remove its associated DNS records.')) {
    const res = await apiCall(`/it/domains/${id}`, 'DELETE');
    if (res) {
      showToast('Domain record deleted.', 'success');
      await fetchHostingDomains();
      calculateAndRenderHostingMetrics();
      renderHostingSubTab();
    }
  }
}

function renderHostingServers() {
  const tbody = document.getElementById('hosting-servers-tbody');
  tbody.innerHTML = '';

  if (hostingServers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:20px;">No servers registered.</td></tr>`;
    return;
  }

  hostingServers.forEach(srv => {
    const disk = srv.diskUsage || 0;
    let barColor = 'var(--accent-cyan)';
    if (disk > 80) barColor = 'var(--accent-red)';
    else if (disk > 60) barColor = 'var(--accent-amber)';

    tbody.innerHTML += `
      <tr>
        <td style="font-weight: 600;">
          ${srv.controlPanelUrl 
            ? `<a href="${srv.controlPanelUrl}" target="_blank" class="text-purple" style="text-decoration:none;"><i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px; margin-right:5px;"></i> ${srv.name}</a>` 
            : srv.name}
        </td>
        <td>
          <span style="font-weight:600; color:#fff;">${srv.provider}</span>
          <span style="font-size:11px; color:var(--color-text-muted); display:block;">${srv.specs}</span>
        </td>
        <td style="font-family: monospace;">${srv.ipAddress}</td>
        <td>
          <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--color-text-muted); margin-bottom:3px;">
            <span>Usage</span>
            <span>${disk}%</span>
          </div>
          <div style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px; overflow:hidden; border:1px solid rgba(255,255,255,0.03);">
            <div style="background:${barColor}; width:${disk}%; height:100%;"></div>
          </div>
        </td>
        <td><i class="fa-regular fa-calendar" style="margin-right:5px; font-size:11px;"></i> ${srv.renewalDate || '-'}</td>
        <td>£${parseFloat(srv.monthlyCost || 0).toFixed(2)}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="revealSshKey('${srv.id}')" style="padding: 4px 8px; font-size:11px; background: rgba(155, 89, 182, 0.15); border: 1px solid rgba(155, 89, 182, 0.3); color: var(--accent-purple);">
            <i class="fa-solid fa-key"></i> Reveal SSH
          </button>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="openServerModal('${srv.id}')" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-pencil"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteServerPrompt('${srv.id}')" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });
}

function openServerModal(id = null) {
  const modal = document.getElementById('server-modal');
  const form = document.getElementById('server-form');
  const title = document.getElementById('server-modal-title');
  form.reset();

  if (id) {
    const srv = hostingServers.find(s => s.id === id);
    if (srv) {
      title.textContent = 'Edit Hosting Server';
      document.getElementById('server-id').value = srv.id;
      document.getElementById('server-name').value = srv.name;
      document.getElementById('server-provider').value = srv.provider || '';
      document.getElementById('server-ip').value = srv.ipAddress;
      document.getElementById('server-specs').value = srv.specs || '';
      document.getElementById('server-disk').value = srv.diskUsage || 0;
      document.getElementById('server-cost').value = srv.monthlyCost || 0.0;
      document.getElementById('server-renewal').value = srv.renewalDate || '';
      document.getElementById('server-controlpanel').value = srv.controlPanelUrl || '';
      document.getElementById('server-ssh-username').value = srv.sshDetails?.username || 'root';
      document.getElementById('server-ssh-port').value = srv.sshDetails?.port || 22;
      document.getElementById('server-ssh-key').value = '';
      document.getElementById('server-ssh-key').placeholder = 'Leave blank to keep existing SSH key...';
    }
  } else {
    title.textContent = 'Register Hosting Server';
    document.getElementById('server-id').value = '';
    document.getElementById('server-ssh-key').placeholder = 'Paste SSH private key here...';
  }

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 50);
}

function closeServerModal() {
  const modal = document.getElementById('server-modal');
  modal.classList.remove('active');
  setTimeout(() => modal.style.display = 'none', 300);
}

async function handleServerSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('server-id').value;
  const username = document.getElementById('server-ssh-username').value || 'root';
  const port = parseInt(document.getElementById('server-ssh-port').value) || 22;
  const plainKey = document.getElementById('server-ssh-key').value;

  const payload = {
    name: document.getElementById('server-name').value,
    provider: document.getElementById('server-provider').value,
    ipAddress: document.getElementById('server-ip').value,
    specs: document.getElementById('server-specs').value,
    diskUsage: parseInt(document.getElementById('server-disk').value) || 0,
    monthlyCost: parseFloat(document.getElementById('server-cost').value) || 0.0,
    renewalDate: document.getElementById('server-renewal').value,
    controlPanelUrl: document.getElementById('server-controlpanel').value,
    sshDetails: {
      username,
      port
    }
  };

  if (plainKey.trim()) {
    payload.sshDetails.encryptedKey = btoa(plainKey);
  }

  let res;
  if (id) {
    res = await apiCall(`/it/servers/${id}`, 'PUT', payload);
  } else {
    res = await apiCall('/it/servers', 'POST', payload);
  }

  if (res) {
    showToast(id ? 'Server updated successfully!' : 'Server registered successfully!', 'success');
    closeServerModal();
    await fetchHostingServers();
    calculateAndRenderHostingMetrics();
    renderHostingSubTab();
  }
}

async function deleteServerPrompt(id) {
  if (confirm('Are you sure you want to delete this server from registry?')) {
    const res = await apiCall(`/it/servers/${id}`, 'DELETE');
    if (res) {
      showToast('Server record deleted.', 'success');
      await fetchHostingServers();
      calculateAndRenderHostingMetrics();
      renderHostingSubTab();
    }
  }
}

let activeDnsDomainId = null;

function openDnsModal(domainId) {
  activeDnsDomainId = domainId;
  const dom = hostingDomains.find(d => d.id === domainId);
  if (!dom) return;

  document.getElementById('dns-modal-domain-title').textContent = `Manage DNS Records for ${dom.domainName}`;
  renderDnsRecordsList(dom);

  const modal = document.getElementById('dns-records-modal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 50);
}

function closeDnsModal() {
  const modal = document.getElementById('dns-records-modal');
  modal.classList.remove('active');
  setTimeout(() => modal.style.display = 'none', 300);
}

function renderDnsRecordsList(dom) {
  const tbody = document.getElementById('dns-records-list-tbody');
  tbody.innerHTML = '';

  const records = dom.dnsRecords || [];
  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:15px;">No DNS records configured.</td></tr>`;
    return;
  }

  records.forEach((rec, idx) => {
    tbody.innerHTML += `
      <tr>
        <td style="font-weight:600;"><span class="label" style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:3px;">${rec.type}</span></td>
        <td style="font-family:monospace; color:#fff;">${rec.host}</td>
        <td style="font-family:monospace; font-size:11px; max-width: 200px; word-break: break-all;">${rec.value}</td>
        <td>${rec.ttl}</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteDnsRecord(${idx})" style="padding:2px 6px; font-size:10px;"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      </tr>
    `;
  });
}

async function handleDnsRecordAddSubmit(e) {
  e.preventDefault();
  if (!activeDnsDomainId) return;

  const dom = hostingDomains.find(d => d.id === activeDnsDomainId);
  if (!dom) return;

  const type = document.getElementById('dns-type').value;
  const host = document.getElementById('dns-host').value;
  const value = document.getElementById('dns-value').value;
  const ttl = parseInt(document.getElementById('dns-ttl').value) || 3600;

  const newRec = { type, host, value, ttl };
  const records = dom.dnsRecords || [];
  records.push(newRec);

  const res = await apiCall(`/it/domains/${activeDnsDomainId}`, 'PUT', { dnsRecords: records });
  if (res) {
    showToast('DNS record added successfully!', 'success');
    document.getElementById('dns-record-add-form').reset();
    document.getElementById('dns-ttl').value = "3600";
    await fetchHostingDomains();
    renderDnsRecordsList(res);
  }
}

async function deleteDnsRecord(index) {
  if (!activeDnsDomainId) return;

  const dom = hostingDomains.find(d => d.id === activeDnsDomainId);
  if (!dom) return;

  if (confirm('Are you sure you want to delete this DNS record?')) {
    const records = dom.dnsRecords || [];
    records.splice(index, 1);

    const res = await apiCall(`/it/domains/${activeDnsDomainId}`, 'PUT', { dnsRecords: records });
    if (res) {
      showToast('DNS record removed.', 'success');
      await fetchHostingDomains();
      renderDnsRecordsList(res);
    }
  }
}

function revealSshKey(id) {
  const srv = hostingServers.find(s => s.id === id);
  if (!srv) return;

  const username = srv.sshDetails?.username || 'root';
  const port = srv.sshDetails?.port || 22;
  const encryptedKey = srv.sshDetails?.encryptedKey || '';

  let decryptedKey = 'No private key stored.';
  if (encryptedKey) {
    try {
      decryptedKey = atob(encryptedKey);
    } catch (e) {
      decryptedKey = 'Failed to decrypt key: ' + e.message;
    }
  }

  document.getElementById('ssh-modal-server-name').textContent = srv.name;
  document.getElementById('ssh-modal-cmd').textContent = `ssh ${username}@${srv.ipAddress} -p ${port}`;
  document.getElementById('ssh-decrypted-key-display').value = decryptedKey;

  const modal = document.getElementById('ssh-key-modal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 50);
}

function closeSshModal() {
  const modal = document.getElementById('ssh-key-modal');
  modal.classList.remove('active');
  setTimeout(() => modal.style.display = 'none', 300);
}

function copySshKeyToClipboard() {
  const text = document.getElementById('ssh-decrypted-key-display').value;
  navigator.clipboard.writeText(text).then(() => {
    showToast('SSH Credentials copied to clipboard!', 'success');
  }).catch(err => {
    showToast('Failed to copy: ' + err.message, 'error');
  });
}

// Expose hosting handlers to window
window.fetchHostingWebsites = fetchHostingWebsites;
window.fetchHostingDomains = fetchHostingDomains;
window.fetchHostingServers = fetchHostingServers;
window.setupHostingEventListeners = setupHostingEventListeners;
window.calculateAndRenderHostingMetrics = calculateAndRenderHostingMetrics;
window.renderHostingSubTab = renderHostingSubTab;
window.toggleWebsiteStatus = toggleWebsiteStatus;
window.openWebsiteModal = openWebsiteModal;
window.closeWebsiteModal = closeWebsiteModal;
window.deleteWebsitePrompt = deleteWebsitePrompt;
window.openDomainModal = openDomainModal;
window.closeDomainModal = closeDomainModal;
window.deleteDomainPrompt = deleteDomainPrompt;
window.openServerModal = openServerModal;
window.closeServerModal = closeServerModal;
window.deleteServerPrompt = deleteServerPrompt;
window.revealSshKey = revealSshKey;
window.closeSshModal = closeSshModal;
window.copySshKeyToClipboard = copySshKeyToClipboard;
window.openDnsModal = openDnsModal;
window.closeDnsModal = closeDnsModal;
window.deleteDnsRecord = deleteDnsRecord;

// --- MODULE 18 QUICKBOOKS SYNC MODULE ---

async function fetchQuickBooksStatus() {
  const data = await apiCall('/quickbooks/status');
  if (data) {
    quickbooksState = data;
  }
}

function setupQuickBooksEventListeners() {
  const modalBtn = document.getElementById('btn-qb-connect-modal');
  if (modalBtn) {
    modalBtn.addEventListener('click', openQuickBooksConfigModal);
  }
  
  const closeBtn = document.getElementById('btn-close-qb-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeQuickBooksConfigModal);
  
  const cancelBtn = document.getElementById('btn-cancel-qb-modal');
  if (cancelBtn) cancelBtn.addEventListener('click', closeQuickBooksConfigModal);
  
  const modeSelect = document.getElementById('qb-mode-select');
  if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
      const fields = document.getElementById('qb-live-credentials-fields');
      const submitBtn = document.getElementById('btn-submit-qb-config');
      if (e.target.value === 'live') {
        fields.style.display = 'flex';
        submitBtn.textContent = 'Authorize & Sync Live';
      } else {
        fields.style.display = 'none';
        submitBtn.textContent = 'Authorize & Connect';
      }
    });
  }

  const configForm = document.getElementById('qb-config-form');
  if (configForm) configForm.addEventListener('submit', handleQuickBooksConfigSubmit);
  
  const mappingForm = document.getElementById('qb-mapping-form');
  if (mappingForm) mappingForm.addEventListener('submit', handleQuickBooksMappingSubmit);

  document.querySelectorAll('.qb-sync-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = btn.getAttribute('data-sync-type');
      handleQuickBooksSyncTrigger(type, btn);
    });
  });
}

function renderQuickBooksSubTab() {
  const isConnected = !!quickbooksState.connected;
  
  const statusCard = document.getElementById('qb-connection-status-card');
  const statusIcon = document.getElementById('qb-status-icon');
  const statusText = document.getElementById('qb-status-text');
  const statusSub = document.getElementById('qb-status-sub');
  const actionBtn = document.getElementById('btn-qb-connect-modal');
  const infoDetails = document.getElementById('qb-info-details');

  if (isConnected) {
    if (statusCard) {
      statusCard.style.borderColor = 'rgba(46, 204, 113, 0.2)';
      statusCard.style.backgroundColor = 'rgba(46, 204, 113, 0.05)';
    }
    if (statusIcon) statusIcon.className = 'fa-solid fa-circle-check text-success';
    if (statusText) statusText.textContent = 'Connected (Active)';
    if (statusSub) statusSub.textContent = 'Successfully authenticated and ready to sync.';
    if (actionBtn) {
      actionBtn.innerHTML = '<i class="fa-solid fa-link-slash"></i> Disconnect';
      actionBtn.className = 'btn btn-secondary btn-sm';
      actionBtn.onclick = handleQuickBooksDisconnect;
    }
    
    if (infoDetails) infoDetails.style.display = 'block';
    const realmEl = document.getElementById('qb-realm-id');
    const expiryEl = document.getElementById('qb-token-expiry');
    if (realmEl) realmEl.textContent = quickbooksState.realmId || '123456789012345';
    
    const expiryDate = quickbooksState.tokenExpires 
      ? new Date(quickbooksState.tokenExpires * 1000).toLocaleTimeString() 
      : '1 Hour';
    if (expiryEl) expiryEl.textContent = expiryDate;

    document.querySelectorAll('.qb-sync-btn').forEach(btn => {
      btn.removeAttribute('disabled');
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    });
  } else {
    if (statusCard) {
      statusCard.style.borderColor = 'rgba(255, 75, 75, 0.2)';
      statusCard.style.backgroundColor = 'rgba(255, 75, 75, 0.05)';
    }
    if (statusIcon) statusIcon.className = 'fa-solid fa-circle-exclamation text-red';
    if (statusText) statusText.textContent = 'Disconnected';
    if (statusSub) statusSub.textContent = 'Please connect to synchronize ledger entries.';
    if (actionBtn) {
      actionBtn.innerHTML = '<i class="fa-solid fa-link"></i> Connect';
      actionBtn.className = 'btn btn-primary btn-sm';
      actionBtn.onclick = () => openQuickBooksConfigModal();
    }
    
    if (infoDetails) infoDetails.style.display = 'none';

    document.querySelectorAll('.qb-sync-btn').forEach(btn => {
      btn.setAttribute('disabled', 'true');
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    });
  }

  if (quickbooksState.mappings) {
    const maps = quickbooksState.mappings;
    const salesEl = document.getElementById('qb-map-sales');
    const wagesEl = document.getElementById('qb-map-wages');
    const wagesPayEl = document.getElementById('qb-map-wages-payable');
    const bankEl = document.getElementById('qb-map-bank');
    const expEl = document.getElementById('qb-map-expenses');
    if (maps.sales && salesEl) salesEl.value = maps.sales;
    if (maps.wages && wagesEl) wagesEl.value = maps.wages;
    if (maps.wages_payable && wagesPayEl) wagesPayEl.value = maps.wages_payable;
    if (maps.bank && bankEl) bankEl.value = maps.bank;
    if (maps.expenses && expEl) expEl.value = maps.expenses;
  }

  const tbody = document.getElementById('qb-logs-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    const logs = quickbooksState.logs || [];
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:15px;">No sync logs available.</td></tr>';
    } else {
      logs.forEach(log => {
        const statusBadge = log.status === 'Success' 
          ? '<span class="badge badge-success" style="font-size:10px;"><i class="fa-solid fa-circle-check"></i> Success</span>'
          : (log.status === 'Info' 
            ? '<span class="badge badge-secondary" style="font-size:10px;"><i class="fa-solid fa-circle-info"></i> Info</span>'
            : '<span class="badge badge-danger" style="font-size:10px;"><i class="fa-solid fa-triangle-exclamation"></i> Fail</span>');

        tbody.innerHTML += `
          <tr>
            <td>${log.timestamp}</td>
            <td style="font-weight:600; color:#fff;">${log.entity}</td>
            <td>${statusBadge}</td>
            <td style="font-family:monospace; font-size:11px;">${log.qbRef}</td>
            <td style="color:var(--color-text-muted); font-size:11px;">${log.message}</td>
          </tr>
        `;
      });
    }
  }
}

function openQuickBooksConfigModal() {
  const modal = document.getElementById('quickbooks-config-modal');
  const form = document.getElementById('qb-config-form');
  if (form) form.reset();
  
  const modeSel = document.getElementById('qb-mode-select');
  const fields = document.getElementById('qb-live-credentials-fields');
  const submitBtn = document.getElementById('btn-submit-qb-config');
  if (modeSel) modeSel.value = 'simulated';
  if (fields) fields.style.display = 'none';
  if (submitBtn) submitBtn.textContent = 'Authorize & Connect';

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 50);
  }
}

function closeQuickBooksConfigModal() {
  const modal = document.getElementById('quickbooks-config-modal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
  }
}

async function handleQuickBooksConfigSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById('qb-mode-select').value;
  const isLive = mode === 'live';
  
  const clientId = document.getElementById('qb-client-id').value;
  const clientSecret = document.getElementById('qb-client-secret').value;
  const realmId = document.getElementById('qb-realm-input').value;

  if (isLive && (!clientId || !clientSecret)) {
    showToast('Client ID and Client Secret are required for live QuickBooks integration.', 'error');
    return;
  }

  const payload = {
    isLive,
    clientId,
    clientSecret,
    realmId
  };

  showToast('Connecting to QuickBooks...', 'info');
  const res = await apiCall('/quickbooks/connect', 'POST', payload);
  if (res) {
    quickbooksState = res;
    showToast(isLive ? 'Live QuickBooks connected successfully!' : 'QuickBooks Sandbox connection simulation active!', 'success');
    closeQuickBooksConfigModal();
    renderQuickBooksSubTab();
  }
}

async function handleQuickBooksDisconnect() {
  if (confirm('Are you sure you want to disconnect from QuickBooks? Mappings will be preserved but active tokens will be cleared.')) {
    const res = await apiCall('/quickbooks/disconnect', 'POST');
    if (res) {
      quickbooksState = res;
      showToast('Successfully disconnected from QuickBooks.', 'success');
      renderQuickBooksSubTab();
    }
  }
}

async function handleQuickBooksMappingSubmit(e) {
  e.preventDefault();
  const payload = {
    mappings: {
      sales: document.getElementById('qb-map-sales').value,
      wages: document.getElementById('qb-map-wages').value,
      wages_payable: document.getElementById('qb-map-wages-payable').value,
      bank: document.getElementById('qb-map-bank').value,
      expenses: document.getElementById('qb-map-expenses').value
    }
  };

  const res = await apiCall('/quickbooks/map', 'POST', payload);
  if (res) {
    quickbooksState = res;
    showToast('QuickBooks ledger mapping config saved.', 'success');
    renderQuickBooksSubTab();
  }
}

async function handleQuickBooksSyncTrigger(type, button) {
  const originalHtml = button.innerHTML;
  button.setAttribute('disabled', 'true');
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:16px;"></i><span>Syncing...</span>';
  
  showToast(`Synchronizing ${type} to QuickBooks...`, 'info');

  const res = await apiCall('/quickbooks/sync', 'POST', { type });
  
  button.removeAttribute('disabled');
  button.innerHTML = originalHtml;

  if (res && res.success) {
    quickbooksState = res.quickbooks;
    showToast(res.log.message, 'success');
    renderQuickBooksSubTab();
  }
}

// Expose QuickBooks handlers to window
window.fetchQuickBooksStatus = fetchQuickBooksStatus;
window.setupQuickBooksEventListeners = setupQuickBooksEventListeners;
window.renderQuickBooksSubTab = renderQuickBooksSubTab;
window.handleQuickBooksDisconnect = handleQuickBooksDisconnect;
window.openQuickBooksConfigModal = openQuickBooksConfigModal;
window.closeQuickBooksConfigModal = closeQuickBooksConfigModal;
