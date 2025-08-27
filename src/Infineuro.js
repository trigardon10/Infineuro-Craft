"use strict";

const GAME_NAME = 'Infinite Craft'
let url;
let infinitecraft;

init()

console.log(chrome.storage);

async function init() {
  infinitecraft = document.querySelector(".container").__vue__;
  if (!infinitecraft) {
    setTimeout(() => init(), 200);
    return;
  }

  if (!infinitecraft.isDarkMode) infinitecraft.toggleDarkMode();
  const sidebar = document.getElementById('sidebar');
  sidebar.scrollTop = sidebar.scrollHeight;

  const storage = await getStorage();
  url = storage.url || 'ws://localhost:3000'

  startNeuroClient();
}

function startNeuroClient() {

  const { NeuroClient } = NeuroGameSdk;

  const neuroClient = new NeuroClient(url, GAME_NAME, () => {
    showToast('Websocket connected');

    neuroClient.onClose = (event) => {
      showToast('Websocket closed');
      console.log('[NeuroClient] WebSocket connection closed:', event);
    }

    neuroClient.registerActions([
      {
        name: 'craft',
        description: 'Craft two items together to create a new item.',
        schema: {
          type: 'object',
          properties: {
            first_item: { type: 'string' },
            second_item: { type: 'string' },
          },
          required: ['first_item', 'second_item'],
        },
      },
      {
        name: 'available_items',
        description: 'Get a list of all available items.',
        schema: {},
      },
    ])

    neuroClient.onAction(actionData => {
      switch (actionData.name) {
        case 'craft':
          craft(actionData.params.first_item?.toLowerCase(), actionData.params.second_item?.toLowerCase()).then(
            msg => neuroClient.sendActionResult(actionData.id, true, msg),
            err => neuroClient.sendActionResult(actionData.id, false, err?.message || 'Unknown Error.')
          )
          break;
        case 'available_items':
          neuroClient.sendActionResult(actionData.id, true, 'Available items: ' + getItemList());
          break;
        default:
          neuroClient.sendActionResult(actionData.id, false, 'Unknown action.');
          break;
      }
    })

    neuroClient.sendContext(
      'Game started. You can Craft any two items together to create new items. Your currently available items are: ' + getItemList(),
      false
    )
  })

  neuroClient.onError = (error) => {
    showToast('Websocket error');
    console.error('[NeuroClient] WebSocket error:', error);
  }

}

async function craft(first, second) {
  const firstElement = infinitecraft.items.find(el => el.text?.toLowerCase() === first);
  const secondElement = infinitecraft.items.find(el => el.text?.toLowerCase() === second);
  if (!firstElement || !secondElement) {
    throw new Error('Item ' + (!firstElement ? first : second) + ' is not available.')
  }
  let msg = '';
  const firstElementText = firstElement.emoji + ' ' + firstElement.text;
  const secondElementText = secondElement.emoji + ' ' + secondElement.text;
  return infinitecraft.craft({ text: first }, { text: second }).then(r => {
    if (r) {
      showToast('Craftet: ' + firstElementText + ' + ' + secondElementText + ' = ' + r.instance.emoji + ' ' + r.instance.text);
      msg = 'Successfully crafted item: ' + r.instance.text + '.';
      if (r.isNew) {
        msg += ' This item is new.'
      } else {
        msg += ' You already had this item.'
      }
    } else {
      showToast('Unable to craft: ' + firstElementText + ' + ' + secondElementText);
      msg = firstElement.text + ' and ' + secondElement.text + ' cannot be crafted together.'
    }

    const sidebar = document.getElementById('sidebar');
    sidebar.scrollTop = sidebar.scrollHeight;
    return msg;
  });
}

function getItemList() {
  return infinitecraft.items.map(item => item.text).join(', ');
}

async function getStorage() {
  return new Promise((resolve, reject) => {
    document.addEventListener('INFINEURO_STORAGE', function (e) {
      resolve(e.detail);
    }, { once: true });

    document.dispatchEvent(new CustomEvent('INFINEURO_GET_STORAGE', {}));
  })
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  const existingToasts = document.querySelectorAll(".toast");
  const offset = existingToasts.length * (toast.offsetHeight + 40);
  toast.style.bottom = `${30 + offset}px`;
  toast.classList.add("toast");
  document.body.appendChild(toast);
  (async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    toast.style.opacity = "1";
    await new Promise(resolve => setTimeout(resolve, 3000));
    toast.style.opacity = "0";
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.remove();
    const remainingToasts = document.querySelectorAll(".toast");
    remainingToasts.forEach((t, index) => {
      t.style.bottom = `${30 + index * (toast.offsetHeight + 40)}px`;
    });
  })();
  return new Promise(resolve => setTimeout(resolve, 50)); // 0.05 delay
}