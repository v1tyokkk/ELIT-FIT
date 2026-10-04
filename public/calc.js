/**
 * ELITE FIT — калькулятор стоимости абонемента
 * Расчёт в реальном времени при изменении любого поля.
 */

const TARIFFS = {
  group: {
    label: 'GROUP',
    monthly: 220,
    personalIncluded: 0,
  },
  mix: {
    label: 'MIX',
    monthly: 340,
    personalIncluded: 0,
  },
  unlimit: {
    label: 'UNLIMIT',
    monthly: 670,
    personalIncluded: 8,
  },
};

const PERIOD_OPTIONS = {
  1: { label: '1 месяц', discount: 0 },
  3: { label: '3 месяца', discount: 0.05 },
  6: { label: '6 месяцев', discount: 0.1 },
  12: { label: '12 месяцев', discount: 0.15 },
};

const PERSONAL_SESSION_PRICE = 35;

const form = document.getElementById('calc-form');
const totalNode = document.getElementById('calc-total');
const monthlyNode = document.getElementById('calc-monthly');
const savingsNode = document.getElementById('calc-savings');
const personalNode = document.getElementById('calc-personal-cost');
const summaryNode = document.getElementById('calc-summary');

function formatMoney(value) {
  return `${Math.round(value).toLocaleString('ru-RU')} руб.`;
}

function getSelectedTariff() {
  const selected = form.querySelector('input[name="tariff"]:checked');
  return selected ? TARIFFS[selected.value] : TARIFFS.group;
}

function getSelectedPeriod() {
  const months = Number(form.elements.period.value);
  return PERIOD_OPTIONS[months] || PERIOD_OPTIONS[1];
}

function getExtraPersonalCount() {
  const field = form.elements.extraPersonal;
  const rawValue = field.value.trim();

  if (rawValue === '') {
    return 0;
  }

  const value = Number(rawValue);
  if (Number.isNaN(value) || value < 0) {
    return 0;
  }

  return Math.min(30, Math.floor(value));
}

function calculate() {
  const tariff = getSelectedTariff();
  const periodMonths = Number(form.elements.period.value);
  const period = getSelectedPeriod();
  const extraPersonal = getExtraPersonalCount();

  const baseTotal = tariff.monthly * periodMonths;
  const discountAmount = baseTotal * period.discount;
  const subscriptionTotal = baseTotal - discountAmount;
  const personalCost = extraPersonal * PERSONAL_SESSION_PRICE;
  const total = subscriptionTotal + personalCost;
  const monthlyAverage = periodMonths > 0 ? total / periodMonths : 0;

  return {
    tariff,
    periodMonths,
    period,
    extraPersonal,
    baseTotal,
    discountAmount,
    subscriptionTotal,
    personalCost,
    total,
    monthlyAverage,
  };
}

function renderResult() {
  const result = calculate();

  totalNode.textContent = formatMoney(result.total);
  monthlyNode.textContent = formatMoney(result.monthlyAverage);
  savingsNode.textContent = formatMoney(result.discountAmount);
  personalNode.textContent = formatMoney(result.personalCost);

  const discountPercent = Math.round(result.period.discount * 100);
  summaryNode.textContent =
    `Тариф ${result.tariff.label}, ${result.period.label}` +
    `${discountPercent > 0 ? `, скидка ${discountPercent}%` : ''}` +
    `${result.extraPersonal > 0 ? `, доп. тренировки: ${result.extraPersonal}` : ''}.`;
}

function bindCalculator() {
  if (!form) {
    return;
  }

  const extraPersonalField = form.elements.extraPersonal;
  const rateNode = document.querySelector('.calc-field__rate strong');

  if (rateNode) {
    rateNode.textContent = `${PERSONAL_SESSION_PRICE} руб.`;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    renderResult();
  });

  form.addEventListener('input', renderResult);
  form.addEventListener('change', renderResult);

  if (extraPersonalField) {
    extraPersonalField.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      renderResult();
    });
  }

  renderResult();
}

document.addEventListener('DOMContentLoaded', bindCalculator);
