import { extractLinkedInJob } from './content.js';

const preview = document.getElementById('preview');
const download = document.getElementById('download');
const status = document.getElementById('status');
const result = document.getElementById('result');
let reviewedJson;

preview.addEventListener('click', async () => {
  download.disabled = true;
  reviewedJson = undefined;
  result.hidden = true;
  preview.disabled = true;
  status.textContent = 'Reading the selected job…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw new Error('Open a LinkedIn job posting first.');
    const url = new URL(tab.url);
    if (url.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(url.hostname)) {
      throw new Error('Open a LinkedIn job posting first.');
    }
    const [execution] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractLinkedInJob });
    if (!execution?.result?.title) throw new Error('Could not read the selected job.');
    reviewedJson = JSON.stringify(execution.result, null, 2);
    result.textContent = reviewedJson;
    result.hidden = false;
    download.disabled = false;
    status.textContent = 'Review the text below before downloading. No data has been sent.';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Could not preview this job.';
  } finally {
    preview.disabled = false;
  }
});

download.addEventListener('click', () => {
  if (!reviewedJson) return;
  const objectUrl = URL.createObjectURL(new Blob([reviewedJson], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = 'jobos-reviewed-job.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  status.textContent = 'Downloaded locally. Direct upload is disabled.';
});
