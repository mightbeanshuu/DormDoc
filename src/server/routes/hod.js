/**
 * HOD Routes  —  /api/hod/*
 *
 * Security chain applied to EVERY endpoint in this file:
 *   authenticateToken  →  requireRole(['hod'])  →  scopeToDepartment
 *
 * authenticateToken   verifies Supabase JWT (or dev tokens).
 * requireRole         rejects any caller whose role !== 'hod'.
 * scopeToDepartment   injects req.scope.department from req.user.hodDepartment;
 *                     route handlers MUST use req.scope.department only —
 *                     never req.query.department or req.body.department.
 */
const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const scopeToDepartment = require('../middleware/scopeToDepartment');
const svc = require('../services/hodService');

router.use(authenticateToken, requireRole(['hod']), scopeToDepartment);

const handleError = (res, err) => {
  console.error('[HOD]', err.message);
  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    res.json(await svc.getDashboardStats(req.sb, req.scope.department));
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Leave Requests ───────────────────────────────────────────────────────────

router.get('/leave-requests', async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    res.json(await svc.getLeaveRequests(req.sb, req.scope.department, { page, limit, status }));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/leave-requests/:id', async (req, res) => {
  try {
    if (!svc.isUuid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid leave request ID' });
    }
    const detail = await svc.getLeaveRequestDetail(req.sb, req.params.id, req.scope.department);
    if (!detail) {
      return res.status(404).json({ error: 'Leave request not found or not in your department' });
    }
    res.json(detail);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/leave-requests/:id/decision', async (req, res) => {
  try {
    if (!svc.isUuid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid leave request ID' });
    }
    const { action, comments } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'action is required (approved | rejected)' });
    }
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approved" or "rejected"' });
    }

    const result = await svc.processLeaveDecision(req.sb, req.params.id, req.scope.department, {
      deciderId: req.user.id,
      deciderName: req.user.name,
      action,
      comments,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({
      message: `Leave request ${action} successfully`,
      appointment: result.appointment,
      auditId: result.auditRecord._id,
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Students ─────────────────────────────────────────────────────────────────

router.get('/students', async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    res.json(await svc.getDepartmentStudents(req.sb, req.scope.department, { page, limit, search }));
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/students/:id/medical-summary', async (req, res) => {
  try {
    if (!svc.isUuid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }
    const summary = await svc.getStudentMedicalSummary(req.sb, req.params.id, req.scope.department);
    if (!summary) {
      return res.status(404).json({ error: 'Student not found or not in your department' });
    }
    res.json(summary);
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Active Cases ─────────────────────────────────────────────────────────────

router.get('/active-cases', async (req, res) => {
  try {
    const cases = await svc.getActiveCases(req.sb, req.scope.department);
    res.json({ cases, total: cases.length });
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Analytics ────────────────────────────────────────────────────────────────

router.get('/analytics', async (req, res) => {
  try {
    res.json(await svc.getDepartmentAnalytics(req.sb, req.scope.department));
  } catch (err) {
    handleError(res, err);
  }
});

// ─── Reports ──────────────────────────────────────────────────────────────────

router.get('/reports/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month query params are required' });
    }
    const report = await svc.getMonthlyReportCsv(req.sb, req.scope.department, year, month);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.csv);
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
