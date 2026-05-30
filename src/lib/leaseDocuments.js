'use strict';

import { queryOne, execute } from './db';

export function computeStatus(doc) {
  const landlord = !!doc.landlord_signed_at;
  const tenant = !!doc.tenant_signed_at;
  if (landlord && tenant) return 'fully_signed';
  if (landlord) return 'pending_tenant';
  if (tenant) return 'pending_landlord';
  return 'pending_signatures';
}

export async function getDocumentByTenant(tenantId, ownerId) {
  return queryOne(
    `SELECT * FROM lease_documents
     WHERE tenant_id = $1 AND owner_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [tenantId, ownerId]
  );
}

export async function getDocumentById(id, ownerId) {
  return queryOne(
    'SELECT * FROM lease_documents WHERE id = $1 AND owner_id = $2',
    [id, ownerId]
  );
}

export async function getDocumentForTenantUser(tenantId) {
  return queryOne(
    `SELECT * FROM lease_documents WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [tenantId]
  );
}

export function formatDocumentResponse(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    tenant_id: doc.tenant_id,
    lease_id: doc.lease_id,
    contract_ref: doc.contract_ref,
    status: doc.status,
    landlord_signed_at: doc.landlord_signed_at,
    tenant_signed_at: doc.tenant_signed_at,
    has_pdf: !!doc.document_pdf,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}
