'use client';

const BRAND = { r: 108, g: 99, b: 255 };
const INK = { r: 28, g: 28, b: 36 };
const MUTED = { r: 100, g: 100, b: 115 };
const LIGHT = { r: 245, g: 245, b: 250 };
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;
const CONTENT_W = PAGE_W - M * 2;

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return String(d);
  }
}

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function contractRef(data) {
  const t = data.tenant?.full_name || 'T';
  const u = data.unit?.unit_number || '0';
  const d = (data.contractDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  return `PS-${d}-${u}-${t.slice(0, 3).toUpperCase()}`;
}

function addFooter(doc, pageNum, totalPages, generatedAt) {
  const y = PAGE_H - 36;
  doc.setDrawColor(220, 220, 228);
  doc.setLineWidth(0.5);
  doc.line(M, y - 8, PAGE_W - M, y - 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text('PropSync — Mogadishu Property Management', M, y);
  doc.text(`Generated ${generatedAt}`, M, y + 10);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - M, y, { align: 'right' });
}

function drawHeader(doc, data) {
  const ref = contractRef(data);
  const contractDate = fmtDate(data.contractDate || new Date().toISOString().slice(0, 10));

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, PAGE_W, 88, 'F');

  doc.setFillColor(255, 255, 255);
  doc.circle(M + 14, 44, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text('PS', M + 9.5, 47);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('PropSync', M + 34, 40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Mogadishu Property Management', M + 34, 54);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RESIDENTIAL LEASE AGREEMENT', PAGE_W - M, 38, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Contract No. ${ref}`, PAGE_W - M, 54, { align: 'right' });
  doc.text(`Date: ${contractDate}`, PAGE_W - M, 66, { align: 'right' });

  return { ref, contractDate, startY: 108 };
}

function sectionTitle(doc, y, num, title) {
  doc.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
  doc.rect(M, y, CONTENT_W, 22, 'F');
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(2);
  doc.line(M, y, M, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(`${num}. ${title.toUpperCase()}`, M + 12, y + 15);
  return y + 32;
}

function fieldRow(doc, y, label, value, x = M, width = CONTENT_W) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(label, x + 4, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const lines = doc.splitTextToSize(String(value || '—'), width - 12);
  doc.text(lines, x + 4, y + 12);
  const h = 12 + lines.length * 12 + 8;
  doc.setDrawColor(230, 230, 235);
  doc.setLineWidth(0.4);
  doc.line(x, y + h - 4, x + width, y + h - 4);
  return y + h;
}

function partyBox(doc, y, title, fields) {
  const boxW = (CONTENT_W - 12) / 2;
  const x = title === 'Landlord' ? M : M + boxW + 12;
  let maxH = 0;

  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.8);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, boxW, 4, 2, 2, 'F');
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(x, y, boxW, 26, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), x + 10, y + 17);

  let innerY = y + 34;
  fields.forEach(([label, value]) => {
    innerY = fieldRow(doc, innerY, label, value, x, boxW);
  });
  maxH = innerY - y + 8;
  doc.setDrawColor(220, 220, 228);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, boxW, maxH, 4, 4, 'S');
  return maxH;
}

function termsTable(doc, y, rows) {
  const col1 = 160;
  const rowH = 22;
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(M, y, CONTENT_W, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TERM', M + 10, y + 14);
  doc.text('DETAILS', M + col1 + 10, y + 14);

  let cy = y + rowH;
  rows.forEach(([term, detail], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
      doc.rect(M, cy, CONTENT_W, rowH, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(term, M + 10, cy + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(String(detail), M + col1 + 10, cy + 14);
    cy += rowH;
  });
  doc.setDrawColor(220, 220, 228);
  doc.setLineWidth(0.6);
  doc.rect(M, y, CONTENT_W, cy - y, 'S');
  return cy + 12;
}

function highlightAmount(doc, y, rent, deposit) {
  doc.setFillColor(248, 247, 255);
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(1);
  doc.roundedRect(M, y, CONTENT_W, 52, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text('MONTHLY RENT (USD)', M + 16, y + 18);
  doc.text('SECURITY DEPOSIT (USD)', M + CONTENT_W / 2 + 16, y + 18);
  doc.setFontSize(16);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text(fmtMoney(rent), M + 16, y + 40);
  doc.text(fmtMoney(deposit), M + CONTENT_W / 2 + 16, y + 40);
  return y + 64;
}

function clauseList(doc, y, clauses) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(INK.r, INK.g, INK.b);
  clauses.forEach((text, i) => {
    const num = `${i + 1}.`;
    doc.setFont('helvetica', 'bold');
    doc.text(num, M + 4, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, CONTENT_W - 28);
    doc.text(lines, M + 22, y);
    y += lines.length * 13 + 6;
  });
  return y + 4;
}

/** Build signature map from lease_documents API row (include_pdf=1). */
export function leaseSignaturesFromDocument(doc) {
  if (!doc) return {};
  const sigs = {};
  if (doc.landlord_signature) {
    sigs.landlord = { image: doc.landlord_signature, signedAt: doc.landlord_signed_at };
  }
  if (doc.tenant_signature) {
    sigs.tenant = { image: doc.tenant_signature, signedAt: doc.tenant_signed_at };
  }
  return sigs;
}

function embedSignatureImage(doc, imageData, x, y, w, h) {
  if (!imageData) return false;
  const attempts = [];
  if (imageData.includes('base64,')) {
    attempts.push(imageData.split('base64,')[1]);
    attempts.push(imageData);
  } else {
    attempts.push(imageData);
    attempts.push(`data:image/png;base64,${imageData}`);
  }
  for (const src of attempts) {
    try {
      doc.addImage(src, 'PNG', x, y, w, h);
      return true;
    } catch {
      /* try next format */
    }
  }
  return false;
}

function signatureBlock(doc, y, role, name, sig) {
  const blockW = (CONTENT_W - 12) / 2;
  const x = M + (role === 'Tenant' ? blockW + 12 : 0);

  doc.setDrawColor(220, 220, 228);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, blockW, 82, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(role.toUpperCase(), x + 10, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const nameLines = doc.splitTextToSize(name || '', blockW - 20);
  doc.text(nameLines, x + 10, y + 72);

  if (sig?.image) {
    const drawn = embedSignatureImage(doc, sig.image, x + 8, y + 22, blockW - 16, 34);
    if (!drawn) {
      doc.setDrawColor(INK.r, INK.g, INK.b);
      doc.line(x + 10, y + 40, x + blockW - 10, y + 40);
    }
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(`Signed ${fmtDate(sig.signedAt || new Date())}`, x + 10, y + 62);
  } else {
    doc.setDrawColor(INK.r, INK.g, INK.b);
    doc.setLineWidth(0.5);
    doc.line(x + 10, y + 44, x + blockW - 10, y + 44);
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text('Sign in PropSync or print & sign', x + 10, y + 52);
    doc.text('Date: _______________', x + 10, y + 62);
  }
}

/** Build full lease PDF; signatures optional { landlord, tenant } with image + signedAt */
export async function buildLeasePdf(data, signatures = {}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const generatedAt = new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const { startY } = drawHeader(doc, data);
  let y = startY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const intro = doc.splitTextToSize(
    'This Residential Lease Agreement ("Agreement") is entered into between the Landlord and Tenant named below, '
    + 'for the rental of the property unit described herein, subject to the terms and conditions of this Agreement.',
    CONTENT_W
  );
  doc.text(intro, M, y);
  y += intro.length * 13 + 16;

  y = sectionTitle(doc, y, 1, 'Parties to this agreement');
  const landlordH = partyBox(doc, y, 'Landlord', [
    ['Full name', data.landlord?.full_name],
    ['Company', data.landlord?.company_name || '—'],
    ['Phone', data.landlord?.phone || '—'],
    ['Address', data.landlord?.address || '—'],
  ]);
  const tenantH = partyBox(doc, y, 'Tenant', [
    ['Full name', data.tenant?.full_name],
    ['National ID', data.tenant?.national_id || '—'],
    ['Phone', data.tenant?.phone || '—'],
  ]);
  y += Math.max(landlordH, tenantH) + 16;

  if (y > 620) {
    doc.addPage();
    y = 56;
  }

  y = sectionTitle(doc, y, 2, 'Property description');
  y = termsTable(doc, y, [
    ['Property name', data.property?.name || '—'],
    ['Address', data.property?.address || '—'],
    ['District', data.property?.district || '—'],
    ['Unit number', data.unit?.unit_number || '—'],
    ['Floor', data.unit?.floor != null ? String(data.unit.floor) : '—'],
    ['Bedrooms', data.unit?.bedrooms != null ? String(data.unit.bedrooms) : '—'],
    ['Bathrooms', data.unit?.toilets != null ? String(data.unit.toilets) : '—'],
    ['Kitchen', data.unit?.has_kitchen ? 'Yes' : 'No'],
    ['Furnished', data.unit?.is_furnished ? 'Yes' : 'No'],
  ]);

  if (y > 580) {
    doc.addPage();
    y = 56;
  }

  y = sectionTitle(doc, y, 3, 'Lease terms & payment');
  y = highlightAmount(doc, y, data.lease?.monthly_rent_usd, data.lease?.deposit_usd);
  y = termsTable(doc, y, [
    ['Lease start', fmtDate(data.lease?.start_date)],
    ['Lease end', data.lease?.end_date ? fmtDate(data.lease.end_date) : 'Month-to-month / Open'],
    ['Rent due date', '1st day of each calendar month'],
    ['Payment methods', 'EVC Plus · Zaad · Sahal · Cash · Bank Transfer'],
    ['Late payment', 'Rent unpaid after the 5th may incur reminder fees per local practice'],
  ]);

  if (y > 520) {
    doc.addPage();
    y = 56;
  }

  y = sectionTitle(doc, y, 4, 'Rules & obligations');
  y = clauseList(doc, y, [
    'The Tenant shall use the premises solely for residential purposes and keep the unit in good condition.',
    'The Tenant is responsible for minor day-to-day repairs; major structural or utility faults shall be reported to the Landlord via PropSync maintenance.',
    'Subletting, assignment, or transfer of this lease is prohibited without prior written consent from the Landlord.',
    'The Landlord shall provide at least twenty-four (24) hours notice before entering the unit, except in emergencies.',
    'The Tenant must report maintenance issues promptly through the PropSync portal or designated contact channel.',
    'Either party may terminate this Agreement according to local law and any notice period agreed in writing.',
    'Security deposit shall be returned within a reasonable period after move-out, less lawful deductions for damage or unpaid rent.',
  ]);

  if (y > 640) {
    doc.addPage();
    y = 56;
  }

  y = sectionTitle(doc, y, 5, 'Signatures');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    'By signing below, both parties agree to the terms of this Agreement.',
    M,
    y
  );
  y += 20;
  signatureBlock(doc, y, 'Landlord', data.landlord?.full_name, signatures.landlord);
  signatureBlock(doc, y, 'Tenant', data.tenant?.full_name, signatures.tenant);

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, p, totalPages, generatedAt);
  }

  return doc;
}

export async function leasePdfToDataUrl(data, signatures = {}) {
  const doc = await buildLeasePdf(data, signatures);
  return doc.output('datauristring');
}

export async function downloadLeasePdf(data, signatures = {}) {
  const doc = await buildLeasePdf(data, signatures);
  const slug = (data.tenant?.full_name || 'tenant').replace(/\s+/g, '-').toLowerCase();
  const unit = data.unit?.unit_number || 'unit';
  doc.save(`lease-${slug}-${unit}.pdf`);
}

export function downloadPdfDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
