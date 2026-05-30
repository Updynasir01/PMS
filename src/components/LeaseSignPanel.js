import { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Spinner, toast, apiFetch } from './ui';
import SignaturePad from './SignaturePad';
import { buildLeasePdf, downloadPdfDataUrl, leaseSignaturesFromDocument } from '../lib/generateLease';

const STATUS_LABELS = {
  pending_signatures: { text: 'Awaiting signatures', status: 'pending' },
  pending_tenant: { text: 'Waiting for tenant', status: 'pending' },
  pending_landlord: { text: 'Waiting for landlord', status: 'amber' },
  fully_signed: { text: 'Fully signed', status: 'paid' },
};

/**
 * @param {object} props
 * @param {number} props.tenantId
 * @param {'owner'|'tenant'} props.role
 * @param {string} [props.apiBase] - '/api/owner/lease-document' or '/api/tenant/lease-document' or public
 * @param {string} [props.qrToken] - for public portal
 * @param {(path: string, options?: object) => Promise<any>} [props.fetcher] - e.g. QR portal (no cookies)
 */
export default function LeaseSignPanel({ tenantId, role, apiBase, qrToken, fetcher }) {
  const request = fetcher || apiFetch;
  const [doc, setDoc] = useState(null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sigImage, setSigImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const base = apiBase || (role === 'tenant' ? '/api/tenant/lease-document' : '/api/owner/lease-document');
  const query = qrToken
    ? `?token=${encodeURIComponent(qrToken)}`
    : tenantId
      ? `?tenant_id=${tenantId}`
      : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request(`${base}${query}`);
      setDoc(res.document);
      setPayload(res.payload);
    } catch (e) {
      if (!e.message?.includes('not found')) toast.error(e.message);
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [base, query]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    setSaving(true);
    try {
      const body = qrToken ? { token: qrToken } : { tenant_id: tenantId };
      const res = await request(base, { method: 'POST', body });
      const pdfData = await buildLeasePdf(res.payload);
      const pdfBase64 = pdfData.output('datauristring');
      await request(base, {
        method: 'PATCH',
        body: { id: res.document.id, document_pdf: pdfBase64, token: qrToken },
      });
      toast.success('Lease saved to cloud');
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadPdfWithSignatures(documentId, payload, signatureMap) {
    const sigs = {
      landlord: signatureMap?.landlord || undefined,
      tenant: signatureMap?.tenant || undefined,
    };
    const pdfDoc = await buildLeasePdf(payload, sigs);
    await request(base, {
      method: 'PATCH',
      body: {
        id: documentId,
        document_pdf: pdfDoc.output('datauristring'),
        token: qrToken,
      },
    });
  }

  async function handleSign() {
    if (!sigImage) return toast.error('Please draw your signature first');
    setSaving(true);
    try {
      const res = await request(base, {
        method: 'PATCH',
        body: {
          id: doc.id,
          party: role === 'owner' ? 'landlord' : 'tenant',
          signature_image: sigImage,
          token: qrToken,
        },
      });
      if (res.payload && res.signatures) {
        await uploadPdfWithSignatures(doc.id, res.payload, res.signatures);
      }
      toast.success(
        res.fully_signed ? 'Lease fully signed & saved to cloud' : 'Signature saved to cloud'
      );
      setSigImage(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    try {
      const res = await request(`${base}${query}&include_pdf=1`);
      const sigs = leaseSignaturesFromDocument(res.document);
      const hasSig = sigs.landlord || sigs.tenant;

      // Stored PDF is the unsigned draft from "Create lease" — rebuild when signatures exist
      if (hasSig && res.payload) {
        const pdf = await buildLeasePdf(res.payload, sigs);
        pdf.save(`lease-${res.document?.contract_ref || 'draft'}.pdf`);
        return;
      }
      if (res.document?.document_pdf) {
        downloadPdfDataUrl(
          res.document.document_pdf,
          `lease-${res.document.contract_ref}.pdf`
        );
        return;
      }
      const pdf = await buildLeasePdf(res.payload, sigs);
      pdf.save(`lease-${res.document?.contract_ref || 'draft'}.pdf`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) return <div className="py-8 flex justify-center"><Spinner /></div>;

  if (!doc) {
    if (role !== 'owner') {
      return (
        <p className="text-text-2 text-sm text-center py-6">
          Your landlord has not created a cloud lease yet. Ask them to open <strong>Lease & sign</strong> from the tenant list.
        </p>
      );
    }
    return (
      <div className="surface-card text-center py-8 space-y-4">
        <p className="text-text-2 text-sm">No lease in the cloud yet. Create one so both parties can sign online — no printing required.</p>
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating…' : 'Create lease & save to cloud'}
        </Button>
      </div>
    );
  }

  const st = STATUS_LABELS[doc.status] || STATUS_LABELS.pending_signatures;
  const canSign = role === 'owner'
    ? !doc.landlord_signed_at
    : !doc.tenant_signed_at;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <p className="font-semibold text-text-1">Cloud lease · {doc.contract_ref}</p>
          <Badge status={st.status} className="mt-1">{st.text}</Badge>
        </div>
        <Button size="sm" variant="secondary" onClick={handleDownload}>Download PDF</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className={`p-3 rounded-md border ${doc.landlord_signed_at ? 'border-status-green/40 bg-status-green-dim' : 'border-border'}`}>
          <span className="text-text-3 text-xs">Landlord</span>
          <p className="font-medium">{doc.landlord_signed_at ? '✓ Signed' : 'Not signed'}</p>
        </div>
        <div className={`p-3 rounded-md border ${doc.tenant_signed_at ? 'border-status-green/40 bg-status-green-dim' : 'border-border'}`}>
          <span className="text-text-3 text-xs">Tenant</span>
          <p className="font-medium">{doc.tenant_signed_at ? '✓ Signed' : 'Not signed'}</p>
        </div>
      </div>

      {doc.status === 'fully_signed' && (
        <p className="text-sm text-status-green bg-status-green-dim border border-status-green/20 rounded-md px-3 py-2">
          Both parties signed. The final PDF is stored in PropSync — download anytime.
        </p>
      )}

      {canSign && (
        <div className="border-t border-border pt-4">
          <SignaturePad
            label={role === 'owner' ? 'Landlord signature' : 'Tenant signature'}
            onChange={setSigImage}
          />
          <Button className="w-full justify-center mt-3" onClick={handleSign} disabled={saving}>
            {saving ? 'Saving…' : 'Sign & save to cloud'}
          </Button>
        </div>
      )}

      {!canSign && doc.status !== 'fully_signed' && (
        <p className="text-sm text-text-3 text-center">You have signed. Waiting for the other party.</p>
      )}
    </div>
  );
}
