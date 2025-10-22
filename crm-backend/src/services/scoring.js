const https = require('https');
const dns = require('dns').promises;

const DISPOSABLE = new Set([
  'gmail.com','yahoo.com','outlook.com','hotmail.com','proton.me','icloud.com'
]);
const TLD_REGION = { in: 'India West', uk: 'UK', us: 'US', de: 'EU', fr: 'EU', eu: 'EU' };
const ICP = { regions: ['India West','US','EU'], tech: ['Salesforce','HubSpot'] };

const clamp = (n, lo=0, hi=100) => Math.max(lo, Math.min(hi, n));
const thresholds = { A: 70, B: 40, hot: 70 };

function gradeFrom(score) {
  if (score >= thresholds.A) return 'A';
  if (score >= thresholds.B) return 'B';
  return 'C';
}

function regionFromDomain(domain) {
  const parts = String(domain || '').toLowerCase().split('.');
  const tld = parts[parts.length - 1];
  return TLD_REGION[tld] || null;
}

function isDisposableDomain(domain) {
  return DISPOSABLE.has(String(domain || '').toLowerCase());
}

async function websiteReachable(domain) {
  if (!domain) return { ok: false, httpsOk: false };
  try {
    await dns.lookup(domain);
    return await new Promise((resolve) => {
      const req = https.request({ hostname: domain, method: 'GET', path: '/', timeout: 5000 }, (res) => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, httpsOk: true });
      });
      req.on('error', () => resolve({ ok: false, httpsOk: false }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, httpsOk: false }); });
      req.end();
    });
  } catch {
    return { ok: false, httpsOk: false };
  }
}

async function computeCompanyScoreFromHeuristics(acc) {
  let s = 0;
  if (acc.domain && !isDisposableDomain(acc.domain)) s += 10; else s -= 10;
  const inferred = regionFromDomain(acc.domain);
  if (inferred && ICP.regions.includes(inferred)) s += 5;
  const reach = await websiteReachable(acc.domain);
  if (reach.ok) s += 5;
  if (reach.httpsOk) s += 5;
  if (acc.isCustomer) s += 25;
  return clamp(Math.round(s));
}

function applyDealScoreFromCompany(companyScore) {
  const score = clamp(companyScore);
  const grade = gradeFrom(score);
  const isHot = score > thresholds.hot;
  return { score, grade, isHot };
}

module.exports = {
  thresholds,
  gradeFrom,
  computeCompanyScoreFromHeuristics,
  applyDealScoreFromCompany,
};
