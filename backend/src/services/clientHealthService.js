/**
 * Smart CRM - AI Customer Health Monitor
 * 智能客户健康监控服务
 * 
 * 功能：
 * - 自动分析客户健康状态
 * - 检测客户活跃度下降
 * - 提供客户跟进建议
 */

const mongoose = require('mongoose');

const ClientModel = mongoose.model('Client');
const InvoiceModel = mongoose.model('Invoice');
const QuoteModel = mongoose.model('Quote');

/**
 * 客户健康状态
 */
const HEALTH_STATUS = {
  EXCELLENT: 'excellent',  // 优秀
  GOOD: 'good',           // 良好
  NORMAL: 'normal',      // 一般
  WARNING: 'warning',    // 警告
  CRITICAL: 'critical',  // 危险
};

/**
 * 计算客户健康分数
 * @param {Object} client - 客户对象
 * @param {Object} stats - 统计数据
 * @returns {Object} 健康状态
 */
function calculateHealthScore(client, stats) {
  let score = 100;
  const recommendations = [];

  // 1. 付款及时性 (30分)
  if (stats.paymentRate >= 0.9) {
    score -= 0;
  } else if (stats.paymentRate >= 0.7) {
    score -= 10;
    recommendations.push('建议跟进付款进度');
  } else {
    score -= 25;
    recommendations.push('严重: 需要立即跟进付款');
  }

  // 2. 近期活跃度 (30分)
  const daysSinceLastInvoice = stats.daysSinceLastInvoice || 999;
  if (daysSinceLastInvoice < 30) {
    // 正常
  } else if (daysSinceLastInvoice < 60) {
    score -= 15;
    recommendations.push('客户30天无订单，建议跟进');
  } else if (daysSinceLastInvoice < 90) {
    score -= 25;
    recommendations.push('客户60天无订单，需要重点关注');
  } else {
    score -= 30;
    recommendations.push('客户90天无订单，可能流失');
  }

  // 3. 订单频率 (20分)
  if (stats.avgOrdersPerMonth >= 2) {
    // 优秀
  } else if (stats.avgOrdersPerMonth >= 1) {
    score -= 5;
  } else if (stats.avgOrdersPerMonth > 0) {
    score -= 15;
    recommendations.push('订单频率下降，建议激活');
  } else {
    score -= 20;
  }

  // 4. 报价转化率 (20分)
  if (stats.conversionRate >= 0.5) {
    // 优秀
  } else if (stats.conversionRate >= 0.3) {
    score -= 5;
  } else if (stats.conversionRate > 0) {
    score -= 10;
    recommendations.push('报价转化率低，建议优化报价策略');
  } else {
    // 没有报价记录，不扣分
  }

  // 确定健康状态
  let healthStatus;
  if (score >= 90) healthStatus = HEALTH_STATUS.EXCELLENT;
  else if (score >= 70) healthStatus = HEALTH_STATUS.GOOD;
  else if (score >= 50) healthStatus = HEALTH_STATUS.NORMAL;
  else if (score >= 30) healthStatus = HEALTH_STATUS.WARNING;
  else healthStatus = HEALTH_STATUS.CRITICAL;

  return {
    score: Math.max(0, score),
    status: healthStatus,
    recommendations,
    factors: {
      paymentRate: stats.paymentRate,
      daysSinceLastInvoice,
      avgOrdersPerMonth: stats.avgOrdersPerMonth,
      conversionRate: stats.conversionRate,
    },
  };
}

/**
 * 获取客户统计信息
 */
async function getClientStats(clientId) {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // 获取发票数据
  const invoices = await InvoiceModel.find({
    client: clientId,
    removed: false,
  });

  // 获取报价数据
  const quotes = await QuoteModel.find({
    client: clientId,
    removed: false,
  });

  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((inv) => inv.paymentStatus === 'paid').length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // 计算最后订单日期
  let lastInvoiceDate = null;
  if (invoices.length > 0) {
    const sortedInvoices = invoices.sort((a, b) => new Date(b.created) - new Date(a.created));
    lastInvoiceDate = new Date(sortedInvoices[0].created);
  }

  // 计算报价转化
  const acceptedQuotes = quotes.filter((q) => q.status === 'Accepted').length;
  const conversionRate = quotes.length > 0 ? acceptedQuotes / quotes.length : 0;

  // 计算月均订单数
  const daysSinceFirstInvoice = invoices.length > 0 
    ? (now - new Date(invoices.sort((a, b) => new Date(a.created) - new Date(b.created))[0].created)) / (1000 * 60 * 60 * 24)
    : 0;
  const avgOrdersPerMonth = daysSinceFirstInvoice > 0 
    ? (totalInvoices / daysSinceFirstInvoice) * 30 
    : 0;

  return {
    totalInvoices,
    paidInvoices,
    totalRevenue,
    paymentRate: totalInvoices > 0 ? paidInvoices / totalInvoices : 0,
    daysSinceLastInvoice: lastInvoiceDate 
      ? Math.floor((now - lastInvoiceDate) / (1000 * 60 * 60 * 24))
      : 999,
    avgOrdersPerMonth,
    conversionRate,
    totalQuotes: quotes.length,
    acceptedQuotes,
  };
}

/**
 * 分析单个客户健康状态
 */
async function analyzeClientHealth(clientId) {
  const client = await ClientModel.findById(clientId);
  if (!client) return null;

  const stats = await getClientStats(clientId);
  const health = calculateHealthScore(client, stats);

  return {
    clientId: client._id,
    clientName: client.name,
    email: client.email,
    health,
    analyzedAt: new Date(),
  };
}

/**
 * 获取需要关注的客户列表
 */
async function getAtRiskClients() {
  const clients = await ClientModel.find({ removed: false, enabled: true });
  const atRiskClients = [];

  for (const client of clients) {
    const stats = await getClientStats(client._id);
    const health = calculateHealthScore(client, stats);

    if (health.status === HEALTH_STATUS.WARNING || 
        health.status === HEALTH_STATUS.CRITICAL) {
      atRiskClients.push({
        clientId: client._id,
        name: client.name,
        email: client.email,
        health,
      });
    }
  }

  // 按健康分数排序
  atRiskClients.sort((a, b) => a.health.score - b.health.score);

  return atRiskClients;
}

/**
 * 获取所有客户健康报告
 */
async function getAllClientsHealth() {
  const clients = await ClientModel.find({ removed: false, enabled: true });
  const results = [];

  for (const client of clients) {
    const stats = await getClientStats(client._id);
    const health = calculateHealthScore(client, stats);

    results.push({
      clientId: client._id,
      name: client.name,
      email: client.email,
      health,
    });
  }

  // 按健康分数排序
  results.sort((a, b) => b.health.score - a.health.score);

  return results;
}

module.exports = {
  HEALTH_STATUS,
  calculateHealthScore,
  getClientStats,
  analyzeClientHealth,
  getAtRiskClients,
  getAllClientsHealth,
};
