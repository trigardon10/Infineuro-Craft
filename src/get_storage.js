'use strict';

/**
 * The Main Script has no access to the Extension Storage because it is in the "Main World",
 * so this script accesses the storage and sends it via CustomEvents.
 */
document.addEventListener('INFINEURO_GET_STORAGE', function (e) {
  chrome.storage.local
    .get()
    .then((storage) =>
      document.dispatchEvent(
        new CustomEvent('INFINEURO_STORAGE', { detail: storage })
      )
    );
});
