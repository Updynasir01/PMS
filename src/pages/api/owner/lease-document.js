/**
 * CREATE TABLE IF NOT EXISTS lease_documents (
 *   id SERIAL PRIMARY KEY,
 *   lease_id INTEGER REFERENCES leases(id),
 *   tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 *   owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
 *   contract_ref VARCHAR(50) NOT NULL,
 *   document_pdf TEXT,
 *   landlord_signature TEXT,
 *   landlord_signed_at TIMESTAMPTZ,
 *   tenant_signature TEXT,
 *   tenant_signed_at TIMESTAMPTZ,
 *   status VARCHAR(30) DEFAULT 'pending_signatures',
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 */
import { queryOne, execute } from '../../../lib/db';
import { requireRole, getOwnerProfileId } from '../../../lib/auth';
import { withErrorHandler } from '../../../lib/api';
import { getLeasePayloadForTenant } from '../../../lib/leasePayload';
import {
  getDocumentByTenant,
  getDocumentById,
  computeStatus,
  formatDocumentResponse,
} from '../../../lib/leaseDocuments';

function makeContractRef(payload) {
  const t = payload.tenant?.full_name || 'T';
  const u = payload.unit?.unit_number || '0';
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `PS-${d}-${u}-${t.slice(0, 3).toUpperCase()}`;
}

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'owner');
  const ownerId = await getOwnerProfileId(user.id);
  if (!ownerId) return res.status(403).json({ error: 'Owner profile not found' });

  if (req.method === 'GET') {
    const { tenant_id, include_pdf } = req.query;
    if (!tenant_id) return res.status(400).json({ error: 'tenant_id required' });

    const document = await getDocumentByTenant(tenant_id, ownerId);
    const payload = await getLeasePayloadForTenant(tenant_id, ownerId);
    if (!payload) return res.status(404).json({ error: 'Tenant not found' });

    const out = { document: document ? formatDocumentResponse(document) : null, payload };
    if (document && include_pdf === '1') {
      out.document = {
        ...out.document,
        document_pdf: document.document_pdf,
        landlord_signature: document.landlord_signature,
        tenant_signature: document.tenant_signature,
      };
    }
    return res.json(out);
  }

  if (req.method === 'POST') {
    const { tenant_id } = req.body || {};
    const payload = await getLeasePayloadForTenant(tenant_id, ownerId);
    if (!payload) return res.status(404).json({ error: 'Tenant not found' });
    if (!payload.lease_id) return res.status(400).json({ error: 'No active lease for this tenant' });

    const contract_ref = makeContractRef(payload);
    const { rows: [doc] } = await execute(
      `INSERT INTO lease_documents (lease_id, tenant_id, owner_id, contract_ref, status)
       VALUES ($1, $2, $3, $4, 'pending_signatures') RETURNING *`,
      [payload.lease_id, tenant_id, ownerId, contract_ref]
    );
    return res.status(201).json({ document: formatDocumentResponse(doc), payload });
  }

  if (req.method === 'PATCH') {
    const { id, document_pdf, party, signature_image } = req.body || {};
    const doc = await getDocumentById(id, ownerId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (document_pdf) {
      await execute(
        `UPDATE lease_documents SET document_pdf = $1, updated_at = NOW() WHERE id = $2`,
        [document_pdf, id]
      );
      return res.json({ success: true });
    }

    if (party && signature_image) {
      const now = new Date();
      if (party === 'landlord') {
        await execute(
          `UPDATE lease_documents SET landlord_signature = $1, landlord_signed_at = $2, updated_at = NOW() WHERE id = $3`,
          [signature_image, now, id]
        );
      } else if (party === 'tenant') {
        await execute(
          `UPDATE lease_documents SET tenant_signature = $1, tenant_signed_at = $2, updated_at = NOW() WHERE id = $3`,
          [signature_image, now, id]
        );
      } else {
        return res.status(400).json({ error: 'Invalid party' });
      }

      const updated = await getDocumentById(id, ownerId);
      const status = computeStatus(updated);
      await execute('UPDATE lease_documents SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

      const payload = await getLeasePayloadForTenant(updated.tenant_id, ownerId);
      return res.json({
        success: true,
        status,
        fully_signed: status === 'fully_signed',
        document: formatDocumentResponse({ ...updated, status }),
        payload,
        signatures: {
          landlord: updated.landlord_signature
            ? { image: updated.landlord_signature, signedAt: updated.landlord_signed_at }
            : null,
          tenant: updated.tenant_signature
            ? { image: updated.tenant_signature, signedAt: updated.tenant_signed_at }
            : null,
        },
      });
    }

    return res.status(400).json({ error: 'Invalid update' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
