/**
 * CREATE TABLE IF NOT EXISTS expenses (...);
 */
import { query, queryOne, execute } from '../../../lib/db';
import { requireRole, getOwnerProfileId } from '../../../lib/auth';
import { withErrorHandler, sanitize } from '../../../lib/api';

const CATEGORIES = [
  'generator_fuel', 'security', 'cleaning', 'repair', 'water', 'electricity',
  'maintenance_parts', 'staff_salary', 'other',
];

export default withErrorHandler(async function handler(req, res) {
  const user = await requireRole(req, 'owner');
  const ownerId = await getOwnerProfileId(user.id);
  if (!ownerId) return res.status(403).json({ error: 'Owner profile not found' });

  if (req.method === 'GET') {
    const { month, property_id, category } = req.query;
    let q = `
      SELECT e.*, p.name AS property_name, u.unit_number
      FROM expenses e
      LEFT JOIN properties p ON e.property_id = p.id
      LEFT JOIN units u ON e.unit_id = u.id
      WHERE e.owner_id = $1
    `;
    const params = [ownerId];
    if (month) {
      params.push(month);
      q += ` AND to_char(e.expense_date, 'YYYY-MM') = $${params.length}`;
    }
    if (property_id) {
      params.push(property_id);
      q += ` AND e.property_id = $${params.length}`;
    }
    if (category) {
      params.push(category);
      q += ` AND e.category = $${params.length}`;
    }
    q += ' ORDER BY e.expense_date DESC, e.created_at DESC';

    const expenses = await query(q, params);
    const m = month || new Date().toISOString().slice(0, 7);

    const income = await queryOne(
      `SELECT COALESCE(SUM(amount_usd), 0) AS total
       FROM payments WHERE owner_id = $1 AND payment_month = $2 AND status = 'paid'`,
      [ownerId, m]
    );
    const expenseTotal = await queryOne(
      `SELECT COALESCE(SUM(amount_usd), 0) AS total
       FROM expenses WHERE owner_id = $1 AND to_char(expense_date, 'YYYY-MM') = $2`,
      [ownerId, m]
    );

    const collected = +income.total;
    const totalExpenses = +expenseTotal.total;

    return res.json({
      expenses,
      summary: {
        month: m,
        collected,
        totalExpenses,
        netProfit: collected - totalExpenses,
      },
    });
  }

  if (req.method === 'POST') {
    const {
      category, description, amount_usd, expense_date,
      property_id, unit_id, receipt_note,
    } = req.body || {};
    if (!category || !description || amount_usd == null) {
      return res.status(400).json({ error: 'Category, description and amount required' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const { rows: [row] } = await execute(
      `INSERT INTO expenses (owner_id, property_id, unit_id, category, description, amount_usd, expense_date, receipt_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        ownerId,
        property_id || null,
        unit_id || null,
        category,
        sanitize(description.trim()),
        amount_usd,
        expense_date || new Date().toISOString().slice(0, 10),
        receipt_note ? sanitize(receipt_note) : null,
      ]
    );
    return res.status(201).json(row);
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id || req.body?.id, 10);
    const row = await queryOne('SELECT id FROM expenses WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    if (!row) return res.status(404).json({ error: 'Expense not found' });
    await execute('DELETE FROM expenses WHERE id = $1', [id]);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
