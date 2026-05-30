import { queryOne, execute } from '../../../lib/db';
import { requireRole, getTenantProfile } from '../../../lib/auth';
import { withErrorHandler } from '../../../lib/api';
import { getLeasePayloadForTenantUser } from '../../../lib/leasePayload';
import {
  getDocumentForTenantUser,
  computeStatus,
  formatDocumentResponse,
} from '../../../lib/leaseDocuments';

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'tenant');
  const tenant = await getTenantProfile(user.id);
  if (!tenant) return res.status(403).json({ error: 'Tenant profile not found' });

  if (req.method === 'GET') {
    const { include_pdf } = req.query;
    const document = await getDocumentForTenantUser(tenant.id);
    const payload = await getLeasePayloadForTenantUser(user.id);
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

  if (req.method === 'PATCH') {
    const { id, party, signature_image, document_pdf } = req.body || {};
    const doc = await queryOne(
      'SELECT * FROM lease_documents WHERE id = $1 AND tenant_id = $2',
      [id, tenant.id]
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (document_pdf) {
      const docRow = await queryOne(
        'SELECT * FROM lease_documents WHERE id = $1 AND tenant_id = $2',
        [id, tenant.id]
      );
      if (!docRow) return res.status(404).json({ error: 'Document not found' });
      await execute(
        'UPDATE lease_documents SET document_pdf = $1, updated_at = NOW() WHERE id = $2',
        [document_pdf, id]
      );
      return res.json({ success: true });
    }

    if (party !== 'tenant' || !signature_image) {
      return res.status(400).json({ error: 'Tenant signature required' });
    }

    const now = new Date();
    await execute(
      `UPDATE lease_documents SET tenant_signature = $1, tenant_signed_at = $2, updated_at = NOW() WHERE id = $3`,
      [signature_image, now, id]
    );

    const updated = await queryOne('SELECT * FROM lease_documents WHERE id = $1', [id]);
    const status = computeStatus(updated);
    await execute('UPDATE lease_documents SET status = $1 WHERE id = $2', [status, id]);

    const payload = await getLeasePayloadForTenantUser(user.id);
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

  return res.status(405).json({ error: 'Method not allowed' });
});
