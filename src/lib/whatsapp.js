'use strict';

/** Format Somali phone numbers to international +252 */
export function formatSomaliPhone(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/\s+/g, '').replace(/-/g, '');
  if (p.startsWith('+')) return p.replace(/[^\d+]/g, '');
  if (p.startsWith('252')) return `+${p}`;
  if (p.startsWith('0')) p = p.slice(1);
  if (p.length >= 9) return `+252${p}`;
  return p;
}

export function generateWhatsAppLink(phone, message) {
  const formatted = formatSomaliPhone(phone).replace('+', '');
  if (!formatted) return null;
  const text = encodeURIComponent(message || '');
  return `https://wa.me/${formatted}${text ? `?text=${text}` : ''}`;
}

export function rentReminderMessage({ tenantName, month, amount, propertyName }) {
  return (
    `Salaan ${tenantName}, kiradaada bishii ${month} ee $${amount} weli lama bixin. ` +
    `Fadlan bix ama la xiriir haddaad caqabad qabtid. Mahadsanid — ${propertyName}`
  );
}

export function maintenanceContactMessage({ tenantName, title, customMessage }) {
  const extra = customMessage ? ` ${customMessage}` : '';
  return (
    `Salaan ${tenantName}, codsigaaga dayactirka '${title}' waxaan ku wargelinayaa:${extra}`
  );
}

export function leaseExpiryMessage({ tenantName, endDate }) {
  return (
    `Salaan ${tenantName}, heshiiskaaga kireynta wuxuu dhammaan doonaa ${endDate}. ` +
    `Fadlan la xiriir si aan u cusboonaysiin. Mahadsanid`
  );
}
