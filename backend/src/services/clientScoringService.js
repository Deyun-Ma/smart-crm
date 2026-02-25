const mongoose = require('mongoose');

const InvoiceModel = mongoose.model('Invoice');
const ClientModel = mongoose.model('Client');

async function calculateClientScore(clientId) {
  const client = await ClientModel.findById(clientId);
  if (!client) return null;

  const invoices = await InvoiceModel.find({
    client: clientId,
    removed: false,
  });

  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((inv) => inv.paymentStatus === 'paid').length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  let score = 0;

  if (totalRevenue > 0) score += Math.min(40, Math.log10(totalRevenue + 1) * 10);

  if (totalInvoices > 0) score += Math.min(30, totalInvoices * 3);

  if (totalInvoices > 0) {
    const paymentRate = paidInvoices / totalInvoices;
    score += paymentRate * 30;
  }

  score = Math.min(100, Math.round(score));

  let level = 'D';
  if (score >= 80) level = 'A';
  else if (score >= 60) level = 'B';
  else if (score >= 40) level = 'C';

  client.score = {
    total: score,
    level,
    totalRevenue,
    totalInvoices,
    paidInvoices,
    lastCalculated: new Date(),
  };

  await client.save();
  return client.score;
}

async function calculateAllScores() {
  const clients = await ClientModel.find({ removed: false });
  const results = [];

  for (const client of clients) {
    const score = await calculateClientScore(client._id);
    results.push({ clientId: client._id, name: client.name, score });
  }

  return results;
}

module.exports = {
  calculateClientScore,
  calculateAllScores,
};
