// ==========================================
//  TABUNGAN APP - Main Application Logic
// ==========================================

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Default data from the example spreadsheet
const DEFAULT_DATA = {
    2026: [
        { luthfi: 100000, jeanny: 100000, pengeluaran: 140000 },
        { luthfi: 100000, jeanny: 100000, pengeluaran: 45000 },
        { luthfi: 100000, jeanny: 100000, pengeluaran: 200000 },
        { luthfi: 100000, jeanny: 100000, pengeluaran: 170000 },
        { luthfi: 10000, jeanny: 100000, pengeluaran: 60000 },
        { luthfi: 0, jeanny: 50000, pengeluaran: 47500 },
        { luthfi: 0, jeanny: 0, pengeluaran: 244500 },
        { luthfi: 0, jeanny: 0, pengeluaran: 118000 },
        { luthfi: 0, jeanny: 0, pengeluaran: 85000 },
        { luthfi: 0, jeanny: 0, pengeluaran: 0 },
        { luthfi: 0, jeanny: 0, pengeluaran: 0 },
        { luthfi: 0, jeanny: 0, pengeluaran: 0 },
    ]
};

// Note: July has totalTabungan = 200000 in the example, despite luthfi=0 and jeanny=0
// This means Total Tabungan can have manual overrides (other income sources)
const TOTAL_OVERRIDES_2026 = { 6: 200000 }; // July (index 6) override

let currentYear = 2026;
let data = {};
let previousSaldo = 0;


// ==========================================
//  INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    
    // Debt Tracker
    loadDebtData();
    renderDebtTable();
});

// ==========================================
//  DATA MANAGEMENT
// ==========================================
function getStorageKey() {
    return `tabungan_data_${currentYear}`;
}

function loadData() {
    fetch(`/api/tabungan/${currentYear}`)
        .then(res => res.json())
        .then(json => {
            data[currentYear] = json.data;
            previousSaldo = json.previousSaldo;
            renderTable();
            updateSummary();
            updateComputedCells();
        })
        .catch(err => console.error('Error fetching data:', err));
}

function saveData() {
    fetch(`/api/tabungan/${currentYear}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify(data[currentYear])
    })
    .then(res => res.json())
    .then(res => {
        if(res.success) showToast('Data tersimpan di Database! 💾');
    });
}



// ==========================================
//  TABLE RENDERING
// ==========================================
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const rows = data[currentYear];

    rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        const totalTabungan = row.totalOverride != null
            ? row.totalOverride
            : row.luthfi + row.jeanny;

        const saldo = calculateSaldo(index);

        tr.innerHTML = `
            <td class="col-bulan">${MONTHS[index]}</td>
            <td>
                <div class="input-group">
                    <input type="text" 
                           class="input-luthfi"
                           id="luthfi-${index}" 
                           value="${formatInputValue(row.luthfi)}" 
                           data-index="${index}" 
                           data-field="luthfi"
                           placeholder="0"
                           inputmode="numeric">
                    <button class="btn-add" onclick="addAmount(${index}, 'luthfi')" title="Tambah Pemasukan">➕</button>
                </div>
            </td>
            <td>
                <div class="input-group">
                    <input type="text" 
                           class="input-jeanny"
                           id="jeanny-${index}" 
                           value="${formatInputValue(row.jeanny)}" 
                           data-index="${index}" 
                           data-field="jeanny"
                           placeholder="0"
                           inputmode="numeric">
                    <button class="btn-add" onclick="addAmount(${index}, 'jeanny')" title="Tambah Pemasukan">➕</button>
                </div>
            </td>
            <td class="cell-total">${formatCurrency(totalTabungan)}</td>
            <td>
                <div class="input-group">
                    <input type="text" 
                           class="input-pengeluaran"
                           id="pengeluaran-${index}" 
                           value="${formatInputValue(row.pengeluaran)}" 
                           data-index="${index}" 
                           data-field="pengeluaran"
                           placeholder="0"
                           inputmode="numeric">
                    <button class="btn-add pengeluaran" onclick="addAmount(${index}, 'pengeluaran')" title="Tambah Pengeluaran">➕</button>
                </div>
            </td>
            <td class="cell-saldo ${saldo >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(saldo)}
            </td>
        `;

        tbody.appendChild(tr);
    });

    // Setup input listeners
    tbody.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', handleFocus);
        input.addEventListener('blur', handleBlur);
        input.addEventListener('input', handleInput);
        input.addEventListener('keydown', handleKeyDown);
    });
}

// ==========================================
//  CALCULATIONS
// ==========================================
function getTotalTabungan(index) {
    const row = data[currentYear][index];
    if (row.totalOverride != null) {
        return row.totalOverride;
    }
    return row.luthfi + row.jeanny;
}

function getPreviousYearsSaldo(targetYear) {
    return previousSaldo;
}

function calculateSaldo(monthIndex) {
    let saldo = getPreviousYearsSaldo(currentYear);
    for (let i = 0; i <= monthIndex; i++) {
        const total = getTotalTabungan(i);
        const pengeluaran = data[currentYear][i].pengeluaran;
        saldo += total - pengeluaran;
    }
    return saldo;
}

function updateSummary() {
    const rows = data[currentYear];
    
    let totalLuthfi = 0;
    let totalJeanny = 0;
    let totalTabungan = 0;
    let totalPengeluaran = 0;

    // Find the last month with any activity for current saldo
    let lastActiveMonth = 0;

    rows.forEach((row, i) => {
        totalLuthfi += row.luthfi;
        totalJeanny += row.jeanny;
        totalTabungan += getTotalTabungan(i);
        totalPengeluaran += row.pengeluaran;

        if (row.luthfi > 0 || row.jeanny > 0 || row.pengeluaran > 0 || row.totalOverride > 0) {
            lastActiveMonth = i;
        }
    });

    const currentSaldo = calculateSaldo(11); // December saldo includes previous years
    const totalSaved = currentSaldo; // Total Tersimpan is the overall balance

    // Update summary cards
    document.getElementById('currentSaldo').textContent = formatCurrency(currentSaldo);
    document.getElementById('totalIncome').textContent = formatCurrency(totalTabungan);
    document.getElementById('totalExpense').textContent = formatCurrency(totalPengeluaran);
    document.getElementById('totalSaved').textContent = formatCurrency(totalSaved);

    // Update table footer
    document.getElementById('totalLuthfi').textContent = formatCurrency(totalLuthfi);
    document.getElementById('totalJeanny').textContent = formatCurrency(totalJeanny);
    document.getElementById('totalTabungan').textContent = formatCurrency(totalTabungan);
    document.getElementById('totalPengeluaran').textContent = formatCurrency(totalPengeluaran);
    document.getElementById('saldoAkhir').textContent = formatCurrency(currentSaldo);
}

// ==========================================
//  INPUT HANDLING
// ==========================================
function handleFocus(e) {
    const input = e.target;
    // Show raw number on focus for editing
    const index = parseInt(input.dataset.index);
    const field = input.dataset.field;
    const value = data[currentYear][index][field];
    input.value = value > 0 ? value.toString() : '';
    input.select();
}

function handleBlur(e) {
    const input = e.target;
    const index = parseInt(input.dataset.index);
    const field = input.dataset.field;

    // Parse the value
    const rawValue = input.value.replace(/[^\d]/g, '');
    const numValue = parseInt(rawValue) || 0;

    // Update data
    data[currentYear][index][field] = numValue;
    if (field === 'luthfi' || field === 'jeanny') {
        data[currentYear][index].totalOverride = null;
    }

    // Re-format display
    input.value = formatInputValue(numValue);

    // Save & update everything
    saveData();
    updateComputedCells();
    updateSummary();
}

function handleInput(e) {
    // Allow only digits and common separators while typing
    const input = e.target;
    const cursorPos = input.selectionStart;
    const cleaned = input.value.replace(/[^\d]/g, '');
    if (cleaned !== input.value) {
        input.value = cleaned;
        // Try to restore cursor position
        const newPos = Math.max(0, cursorPos - (input.value.length - cleaned.length));
        input.setSelectionRange(newPos, newPos);
    }
}

function handleKeyDown(e) {
    if (e.key === 'Enter') {
        e.target.blur();
    }
    if (e.key === 'Tab') {
        // Let default tab behavior work
        return;
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateVertical(e.target, 1);
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateVertical(e.target, -1);
    }
}

function navigateVertical(currentInput, direction) {
    const index = parseInt(currentInput.dataset.index);
    const field = currentInput.dataset.field;
    const nextIndex = index + direction;
    if (nextIndex >= 0 && nextIndex < 12) {
        const nextInput = document.getElementById(`${field}-${nextIndex}`);
        if (nextInput) {
            currentInput.blur();
            nextInput.focus();
        }
    }
}

function updateComputedCells() {
    const tbody = document.getElementById('tableBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach((tr, index) => {
        const totalTabungan = getTotalTabungan(index);
        const saldo = calculateSaldo(index);

        const totalCell = tr.querySelector('.cell-total');
        const saldoCell = tr.querySelector('.cell-saldo');

        totalCell.textContent = formatCurrency(totalTabungan);
        
        saldoCell.textContent = formatCurrency(saldo);
        saldoCell.className = `cell-saldo ${saldo >= 0 ? 'positive' : 'negative'}`;
    });
}

// ==========================================
//  FORMATTING
// ==========================================
function formatCurrency(value) {
    if (value === 0) return 'Rp 0';
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString('id-ID');
    const prefix = value < 0 ? '-Rp ' : 'Rp ';
    return prefix + formatted;
}

function formatInputValue(value) {
    if (value === 0) return '0';
    return value.toLocaleString('id-ID');
}

// ==========================================
//  ADD AMOUNT WIDGET
// ==========================================
window.addAmount = function(index, field) {
    const rawAmount = prompt('Masukkan jumlah tambahan (Rp):');
    if (rawAmount === null) return; // User cancelled
    
    const amount = parseInt(rawAmount.replace(/[^\d]/g, ''));
    if (!isNaN(amount) && amount > 0) {
        data[currentYear][index][field] += amount;
        if (field === 'luthfi' || field === 'jeanny') {
            data[currentYear][index].totalOverride = null;
        }
        saveData();
        renderTable();
        updateSummary();
        showToast('Jumlah berhasil ditambahkan! ➕');
    }
};

// ==========================================
//  TOAST NOTIFICATION
// ==========================================
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    toastMsg.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==========================================
//  EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    // Year selector
    document.getElementById('yearSelect').addEventListener('change', (e) => {
        currentYear = parseInt(e.target.value);
        loadData();
    });
}

// ==========================================
//  DEBT TRACKER
// ==========================================
const TOTAL_DEBT = 4642000;
let debtPayments = [];

function loadDebtData() {
    fetch('/api/debt')
        .then(res => res.json())
        .then(json => {
            if (json && json.length > 0) {
                debtPayments = json;
            } else {
                debtPayments = [
                    { id: 1, desc: 'Pembayaran 1', amount: 500000 },
                    { id: 2, desc: 'Pembayaran 2', amount: 500000 }
                ];
                saveDebtData();
            }
            renderDebtTable();
        })
        .catch(err => console.error('Error fetching debt:', err));
}

function saveDebtData() {
    fetch('/api/debt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify(debtPayments)
    });
}

function renderDebtTable() {
    const tbody = document.getElementById('debtTableBody');
    tbody.innerHTML = '';

    let totalDibayar = 0;

    debtPayments.forEach(payment => {
        totalDibayar += payment.amount;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: left; padding-left: 16px;">
                <input type="text" 
                       class="input-debt-desc"
                       value="${payment.desc}" 
                       data-id="${payment.id}"
                       placeholder="Keterangan / Tanggal"
                       style="width: 100%; max-width: none; background: rgba(255,255,255,0.04); border: 1px solid transparent; color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); text-align: left; outline: none; font-family: var(--font-family);">
            </td>
            <td style="text-align: right;">
                <input type="text" 
                       class="input-debt-amount"
                       value="${formatInputValue(payment.amount)}" 
                       data-id="${payment.id}"
                       placeholder="0"
                       inputmode="numeric"
                       style="width: 100%; max-width: 140px; background: rgba(255,255,255,0.04); border: 1px solid transparent; color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); text-align: right; outline: none; font-family: var(--font-family);">
            </td>
            <td style="text-align: center;">
                <button class="btn" style="padding: 4px 8px; border-color: rgba(239, 68, 68, 0.3); color: var(--accent-red);" onclick="deleteDebtPayment(${payment.id})" title="Hapus">❌</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const sisaUtang = TOTAL_DEBT - totalDibayar;
    
    document.getElementById('debtTotalPaid').textContent = formatCurrency(totalDibayar);
    document.getElementById('debtRemaining').textContent = formatCurrency(sisaUtang);

    // Setup event listeners
    tbody.querySelectorAll('.input-debt-desc').forEach(input => {
        input.addEventListener('change', handleDebtDescChange);
    });
    tbody.querySelectorAll('.input-debt-amount').forEach(input => {
        input.addEventListener('focus', handleDebtFocus);
        input.addEventListener('blur', handleDebtBlur);
        input.addEventListener('input', handleInput);
    });
}

function handleDebtDescChange(e) {
    const id = parseInt(e.target.dataset.id);
    const payment = debtPayments.find(p => p.id === id);
    if (payment) {
        payment.desc = e.target.value;
        saveDebtData();
    }
}

function handleDebtFocus(e) {
    const input = e.target;
    const id = parseInt(input.dataset.id);
    const payment = debtPayments.find(p => p.id === id);
    if (payment) {
        input.value = payment.amount > 0 ? payment.amount.toString() : '';
        input.select();
    }
}

function handleDebtBlur(e) {
    const input = e.target;
    const id = parseInt(input.dataset.id);
    const payment = debtPayments.find(p => p.id === id);
    if (payment) {
        const rawValue = input.value.replace(/[^\d]/g, '');
        const numValue = parseInt(rawValue) || 0;
        payment.amount = numValue;
        saveDebtData();
        renderDebtTable();
    }
}

window.addDebtPayment = function() {
    debtPayments.push({
        id: Date.now(),
        desc: '',
        amount: 0
    });
    saveDebtData();
    renderDebtTable();
    showToast('Baris pembayaran ditambahkan! Silakan isi. ➕');
};

window.deleteDebtPayment = function(id) {
    if (confirm('Yakin ingin menghapus pembayaran ini?')) {
        debtPayments = debtPayments.filter(p => p.id !== id);
        saveDebtData();
        renderDebtTable();
        showToast('Pembayaran berhasil dihapus! 🗑️');
    }
};
