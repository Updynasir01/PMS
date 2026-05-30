'use strict';

/** Subscription plan definitions for property owners */
export const PLANS = {
  starter: { label: 'Starter', max_units: 10, monthly_fee: 19, color: 'blue' },
  basic: { label: 'Basic', max_units: 25, monthly_fee: 49, color: 'purple' },
  professional: { label: 'Professional', max_units: 60, monthly_fee: 99, color: 'green' },
  premium: { label: 'Premium', max_units: 120, monthly_fee: 199, color: 'amber' },
  enterprise: { label: 'Enterprise', max_units: 999999, monthly_fee: 399, color: 'red' },
};

export const PLAN_KEYS = Object.keys(PLANS);

export const TRIAL_OPTIONS = [
  { days: 30, label: '30 days' },
  { days: 60, label: '60 days' },
  { days: 90, label: '90 days' },
  { days: 0, label: 'No trial' },
];

export function getPlan(planKey) {
  return PLANS[planKey] || PLANS.starter;
}

export function formatMaxUnits(n) {
  const num = Number(n);
  if (num >= 999999) return '∞';
  return String(num);
}

export function formatUnitsUsed(used, max) {
  return `${used}/${formatMaxUnits(max)}`;
}

export function addDays(dateStr, days) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeTrialEnd(trialDays) {
  if (!trialDays) return null;
  return addDays(new Date().toISOString().slice(0, 10), trialDays);
}

export function nextPlanKey(current) {
  const idx = PLAN_KEYS.indexOf(current);
  if (idx < 0 || idx >= PLAN_KEYS.length - 1) return null;
  return PLAN_KEYS[idx + 1];
}

export const PLAN_STATUS_LABELS = {
  trial: 'Trial',
  active: 'Active',
  expired: 'Expired',
  suspended: 'Suspended',
};
