import { queryOne, execute } from '../../../lib/db';
import { withErrorHandler } from '../../../lib/api';
import { resolveQrToken } from '../../../lib/qrPortal';
import { getLeasePayloadByQrToken } from '../../../lib/leasePayload';
import { computeStatus, formatDocumentResponse } from '../../../lib/leaseDocuments';

export default withErrorHandler(async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const ctx = await resolveQrToken(token);
  if (!ctx || !ctx.tenant_id) return res.status(404).json({ error: 'No tenant on this unit' });

  if (req.method === 'GET') {
    const { include_pdf } = req.query;
    const document = await queryOne(
      'SELECT * FROM lease_documents WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1',
      [ctx.tenant_id]
    );
    const payload = await getLeasePayloadByQrToken(token);
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
      [id, ctx.tenant_id]
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (document_pdf) {
      const docRow = await queryOne(
        'SELECT * FROM lease_documents WHERE id = $1 AND tenant_id = $2',
        [id, ctx.tenant_id]
      );
      if (!docRow) return res.status(404).json({ error: 'Document not found' });
      await execute(
        'UPDATE lease_documents SET document_pdf = $1, updated_at = NOW() WHERE id = $2',
        [document_pdf, id]
      );
      return res.json({ success: true });
    }

    if (party !== 'tenant' || !signature_image) {
      return res.status(400).json({ error: 'Signature required' });
    }

    const now = new Date();
    await execute(
      `UPDATE lease_documents SET tenant_signature = $1, tenant_signed_at = $2, updated_at = NOW() WHERE id = $3`,
      [signature_image, now, id]
    );

    const status = computeStatus(
      await queryOne('SELECT * FROM lease_documents WHERE id = $1', [id])
    );
    await execute('UPDATE lease_documents SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

    const fresh = await queryOne('SELECT * FROM lease_documents WHERE id = $1', [id]);
    const payload = await getLeasePayloadByQrToken(token);
    return res.json({
      success: true,
      status,
      fully_signed: status === 'fully_signed',
      document: formatDocumentResponse({ ...fresh, status }),
      payload,
      signatures: {
        landlord: fresh.landlord_signature
          ? { image: fresh.landlord_signature, signedAt: fresh.landlord_signed_at }
          : null,
        tenant: fresh.tenant_signature
          ? { image: fresh.tenant_signature, signedAt: fresh.tenant_signed_at }
          : null,
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
