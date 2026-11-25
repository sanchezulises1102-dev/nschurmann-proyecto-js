const STORAGE_KEY = "mis-finanzas-transacciones";
let transactions = loadTransactions();
let selectedType = "expense";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(value);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${dateString}T12:00:00`));
}

function getStartOfWeek(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekLabel() {
  const start = getStartOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`;
}

function isInCurrentWeek(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const start = getStartOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}

function isInCurrentMonth(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function totals(type) {
  return transactions
    .filter((item) => item.type === type)
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function transactionMarkup(item) {
  const isExpense = item.type === "expense";
  return `
    <article class="transaction ${item.type}" data-id="${item.id}">
      <div class="transaction__icon">${isExpense ? "−" : "＋"}</div>
      <div class="transaction__info">
        <strong>${escapeHtml(item.description)}</strong>
        <span>${formatDate(item.date)}</span>
      </div>
      <strong class="transaction__amount">${isExpense ? "−" : "+"}${formatMoney(Number(item.amount))}</strong>
    </article>
  `;
}

function render() {
  const expenses = totals("expense");
  const savings = totals("saving");
  const balance = savings - expenses;

  const weeklyExpenses = transactions
    .filter((item) => item.type === "expense" && isInCurrentWeek(item.date))
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const weeklySavings = transactions
    .filter((item) => item.type === "saving" && isInCurrentWeek(item.date))
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const monthlyExpenses = transactions
    .filter((item) => item.type === "expense" && isInCurrentMonth(item.date))
    .reduce((sum, item) => sum + Number(item.amount), 0);

  $("#balance").textContent = formatMoney(balance);
  $("#total-savings").textContent = formatMoney(savings);
  $("#total-expenses").textContent = formatMoney(expenses);
  $("#weekly-savings").textContent = formatMoney(weeklySavings);
  $("#weekly-savings-list").textContent = formatMoney(weeklySavings);
  $("#weekly-expenses").textContent = formatMoney(weeklyExpenses);
  $("#week-label").textContent = getWeekLabel();
  $("#expense-page-total").textContent = formatMoney(expenses);
  $("#expense-month-total").textContent = formatMoney(monthlyExpenses);
  $("#savings-page-total").textContent = formatMoney(savings);

  const savingCount = transactions.filter((item) => item.type === "saving").length;
  $("#savings-count").textContent = `${savingCount} ${savingCount === 1 ? "depósito registrado" : "depósitos registrados"}`;

  const ringDenominator = weeklySavings + weeklyExpenses;
  const progress = ringDenominator ? Math.round((weeklySavings / ringDenominator) * 100) : 0;
  $("#savings-ring").style.setProperty("--progress", `${progress}%`);

  const sorted = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );
  $("#recent-list").innerHTML = sorted.length
    ? sorted.slice(0, 6).map(transactionMarkup).join("")
    : '<div class="empty-state">Aún no hay movimientos registrados.</div>';

  const expensesList = sorted.filter((item) => item.type === "expense");
  $("#expense-list").innerHTML = expensesList.length
    ? expensesList.map(transactionMarkup).join("")
    : '<div class="empty-state">Aún no tienes gastos registrados.</div>';

  const savingsList = sorted.filter((item) => item.type === "saving");
  $("#savings-list").innerHTML = savingsList.length
    ? savingsList.map(transactionMarkup).join("")
    : '<div class="empty-state">Aún no tienes ahorros registrados.</div>';
}

function showView(viewName) {
  if (viewName === "more") {
    $("#menu-dialog").showModal();
    return;
  }

  $$(".view").forEach((view) => view.classList.remove("active"));
  $(`#${viewName}-view`).classList.add("active");
  $$(".nav-button").forEach((button) => button.classList.remove("active"));
  $(`.nav-button[data-view="${viewName}"]`)?.classList.add("active");

  const titles = { dashboard: "Resumen", expenses: "Gastos", savings: "Ahorros" };
  $("#page-title").textContent = titles[viewName];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openTransaction(type = "expense") {
  selectedType = type;
  $$("#transaction-dialog .type-switch button").forEach((button) => {
    button.classList.toggle("active", button.dataset.type === type);
  });
  updateDialogText();
  $("#amount").value = "";
  $("#description").value = "";
  $("#date").value = new Date().toISOString().slice(0, 10);
  $("#transaction-dialog").showModal();
  setTimeout(() => $("#amount").focus(), 50);
}

function updateDialogText() {
  const isExpense = selectedType === "expense";
  $("#dialog-title").textContent = isExpense ? "Registrar gasto" : "Registrar ahorro";
  $("#description-label").textContent = isExpense ? "Concepto" : "Meta o concepto";
  $("#description").placeholder = isExpense ? "Ej. Supermercado" : "Ej. Fondo de emergencia";
  $("#save-button").textContent = isExpense ? "Guardar gasto" : "Guardar ahorro";
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2200);
}

$$(".nav-button[data-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

$$(".type-switch button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedType = button.dataset.type;
    $$(".type-switch button").forEach((item) => item.classList.toggle("active", item === button));
    updateDialogText();
  });
});

$("#quick-add").addEventListener("click", () => openTransaction(selectedType));
$("#add-expense-header").addEventListener("click", () => openTransaction("expense"));
$("#add-saving-header").addEventListener("click", () => openTransaction("saving"));
$(".close-dialog").addEventListener("click", () => $("#transaction-dialog").close());
$(".close-menu").addEventListener("click", () => $("#menu-dialog").close());
$("#open-menu").addEventListener("click", () => $("#menu-dialog").showModal());

$("#transaction-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number($("#amount").value);
  const description = $("#description").value.trim();

  if (!amount || amount <= 0 || !description) {
    showToast("Completa el monto y el concepto");
    return;
  }

  transactions.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: selectedType,
    amount,
    description,
    date: $("#date").value,
    createdAt: Date.now()
  });
  saveTransactions();
  render();
  $("#transaction-dialog").close();
  showToast(selectedType === "expense" ? "Gasto registrado" : "Ahorro registrado");
});

$("#clear-data").addEventListener("click", () => {
  if (!window.confirm("¿Seguro que deseas borrar todos los movimientos?")) return;
  transactions = [];
  saveTransactions();
  render();
  $("#menu-dialog").close();
  showToast("Datos borrados");
});

$("#export-data").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mis-finanzas.json";
  link.click();
  URL.revokeObjectURL(url);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
