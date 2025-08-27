
document.addEventListener('INFINEURO_GET_STORAGE', function (e) {
  chrome.storage.local.get().then(storage => document.dispatchEvent(new CustomEvent('INFINEURO_STORAGE', { detail: storage })));
});