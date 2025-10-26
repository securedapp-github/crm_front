function normalizeBool(val) {
  if (typeof val === 'boolean') return val;
  if (val == null) return false;
  const s = String(val).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'completed' || s === 'done';
}

function hasTracking({ externalCampaignId, utmSource, utmMedium, utmCampaign }) {
  const anyUtm = [utmSource, utmMedium, utmCampaign].some(v => v && String(v).trim() !== '');
  return (externalCampaignId && String(externalCampaignId).trim() !== '') || anyUtm;
}

function validDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  const s = domain.trim().toLowerCase();
  // Basic domain pattern only
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s);
}

function scoreChannel(channel) {
  const c = String(channel || '').toLowerCase();
  if (c.includes('multi')) return 15;
  if (c.includes('paid') || c.includes('ads') || c.includes('ad')) return 15;
  if (c.includes('email')) return 10;
  if (c.includes('social') || c.includes('organic') || c.includes('content')) return 5;
  return 0;
}

function scoreObjective(objective) {
  const o = String(objective || '').toLowerCase();
  if (o.includes('launch') || o.includes('product') || o.includes('acquisition')) return 10;
  if (o.includes('awareness') || o.includes('retention') || o.includes('growth')) return 10;
  if (o.includes('newsletter') || o.includes('update')) return 5;
  return 0;
}

function scoreAudience(audienceSegment) {
  const a = String(audienceSegment || '').toLowerCase();
  if (a.includes('enterprise')) return 15;
  if (a.includes('mid') || a.includes('mid-market') || a.includes('midmarket')) return 10;
  if (a.includes('smb') || a.includes('small')) return 5;
  return 0;
}

function scoreBudgetEfficiency({ budget, expectedSpend }) {
  const b = Number(budget);
  const e = Number(expectedSpend);
  if (isFinite(b) && isFinite(e) && b > 0 && e > 0) {
    return e <= b ? 10 : 0;
  }
  return 0;
}

function scorePriority(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'high') return 10;
  if (p === 'medium') return 5;
  return 0;
}

function scoreStage(stageOrStatus) {
  const s = String(stageOrStatus || '').toLowerCase();
  if (s === 'active') return 10;
  if (s === 'planned' || s === 'planning') return 5;
  return 0;
}

function computeCampaignStrength(inputs = {}) {
  const channelScore = scoreChannel(inputs.channel);
  const objectiveScore = scoreObjective(inputs.objective);
  const audienceScore = scoreAudience(inputs.audienceSegment);
  const budgetEfficiency = scoreBudgetEfficiency({ budget: inputs.budget, expectedSpend: inputs.expectedSpend });
  const priorityScore = scorePriority(inputs.priority);
  const stageScore = scoreStage(inputs.campaignStage || inputs.status);
  const trackingScore = hasTracking({
    externalCampaignId: inputs.externalCampaignId,
    utmSource: inputs.utmSource,
    utmMedium: inputs.utmMedium,
    utmCampaign: inputs.utmCampaign,
  }) ? 10 : 0;
  const complianceScore = normalizeBool(inputs.complianceChecklist || inputs.complianceComplete) ? 10 : 0;
  const domainScore = validDomain(inputs.linkedCompanyDomain) ? 10 : 0;

  const total = channelScore + objectiveScore + audienceScore + budgetEfficiency + priorityScore + stageScore + trackingScore + complianceScore + domainScore;

  let grade = 'D';
  let strength = 'Weak';
  if (total >= 90) { grade = 'A'; strength = 'Very Strong'; }
  else if (total >= 70) { grade = 'B'; strength = 'Strong / Hot'; }
  else if (total >= 50) { grade = 'C'; strength = 'Average'; }
  // else stays D / Weak

  const isHot = total > 70;

  let recommendation = 'Moderate potential, monitor performance';
  if (grade === 'A') recommendation = 'Very strong, allocate more budget';
  else if (grade === 'B') recommendation = 'Strong potential, maintain or scale spend';
  else if (grade === 'C') recommendation = 'Average, optimize messaging/targeting';
  else if (grade === 'D') recommendation = 'Weak, consider reducing spend';

  return {
    total,
    grade,
    strength,
    isHot,
    recommendation,
  };
}

module.exports = {
  computeCampaignStrength,
};
