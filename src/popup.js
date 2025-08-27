'use strict';
var input = document.getElementById('url-input');
chrome.storage.local.get().then((result) => {
  if (!result.url) {
    chrome.storage.local.set({ url: 'ws://localhost:3000' });
    input.value = 'ws://localhost:3000';
  } else {
    input.value = result.url;
  }
});
input.addEventListener('change', () => {
  chrome.storage.local.set({ url: input.value });
});
