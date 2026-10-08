// Serialized by chrome.scripting.executeScript: keep this function self-contained.
// It runs in the isolated world only after the user clicks Preview.
export function extractLinkedInJob() {
  const url = new URL(window.location.href);
  if (url.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(url.hostname)) {
    throw new Error('Open a LinkedIn job posting first.');
  }
  const jobId = /^\/jobs\/view\/(\d+)\/?$/.exec(url.pathname)?.[1] ||
    (/^\/jobs\/(search|collections)(\/|$)/.test(url.pathname) ? url.searchParams.get('currentJobId') : null);
  if (!jobId || !/^\d{1,20}$/.test(jobId)) throw new Error('Open a LinkedIn job posting first.');

  const text = (value, limit = 256) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
  const visible = (selectors, limit) => {
    for (const selector of selectors) {
      const result = text(document.querySelector(selector)?.innerText, limit);
      if (result) return result;
    }
    return '';
  };
  let posting;
  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0, 20)) {
    if (script.textContent.length > 200_000) continue;
    try {
      const parsed = JSON.parse(script.textContent);
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(Array.isArray(parsed['@graph']) ? parsed['@graph'] : [])];
      posting = candidates.find(value => value && value['@type'] === 'JobPosting');
      if (posting) break;
    } catch { /* Ignore malformed page metadata. */ }
  }
  const title = text(posting?.title) || visible(['.job-details-jobs-unified-top-card__job-title', '.top-card-layout__title', 'h1']);
  if (!title) throw new Error('Could not read a job title from this page.');
  return {
    title,
    company: text(posting?.hiringOrganization?.name) || visible(['.job-details-jobs-unified-top-card__company-name', '.topcard__org-name-link']),
    location: text(posting?.jobLocation?.address?.addressLocality) || visible(['.job-details-jobs-unified-top-card__bullet', '.topcard__flavor--bullet']),
    // Read visible plain text. Never copy page HTML or arbitrary body/profile text.
    description: visible(['.jobs-description__content', '.show-more-less-html__markup'], 20_000),
    url: `https://www.linkedin.com/jobs/view/${jobId}/`,
    source: 'linkedin-manual-preview'
  };
}
