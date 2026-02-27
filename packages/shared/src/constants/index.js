/**
 * @idurar/shared - Shared Constants
 */

const INVOICE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  SENT: 'sent',
  PAID: 'paid',
  UNPAID: 'unpaid',
  PARTIALLY: 'partially',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

const QUOTE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  SENT: 'sent',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED: 'expired',
};

const CLIENT_HEALTH_STATUS = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  NORMAL: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

// Admin roles for RBAC
const ADMIN_ROLES = {
  OWNER: 'owner',   // Full access: manage AI settings, view all data
  STAFF: 'staff',   // Limited access: use AI chat, view own data
};

// AI Chat roles
const AI_CHAT_PERMISSION = {
  MANAGE: 'owner',  // Can configure AI settings
  USE: 'staff',     // Can only use the chat
};

module.exports = {
  INVOICE_STATUS,
  QUOTE_STATUS,
  CLIENT_HEALTH_STATUS,
  ADMIN_ROLES,
  AI_CHAT_PERMISSION,
};
