'use strict';

/**
 * Main Content Script of the Infineuro Craft Extension.
 * It connects Infinitecraft to the Neuro SDK.
 */
const GAME_NAME = 'Infinite Craft';
let url;
let infinitecraft;
let neuroClient;
let craftSound;
let newCraftSound;

init();

/**
 * Starts the Logic
 */
function init() {
  infinitecraft = document.querySelector('.container').__vue__;
  if (!infinitecraft) {
    setTimeout(() => init(), 200);
    return;
  }

  // if (!infinitecraft.isDarkMode) infinitecraft.toggleDarkMode();
  const sidebar = document.getElementById('sidebar');
  sidebar.scrollTop = sidebar.scrollHeight;

  document.getElementById('infinite-craft-center-ad')?.remove();

  craftSound = new Howl({
    src: ["/infinite-craft/instance.mp3"],
    volume: .5
  })

  newCraftSound = new Howl({
    src: ["/infinite-craft/reward.mp3"],
    volume: .5
  })

  Howler.autoSuspend = false;

  startNeuroClient();
}

/**
 * Tries to connect to the Neuro Server via the Neuro Game SDK implementation by "AriesAlex".
 * This function gets calles once at the start and everytime the Websocket connection closes to try to reconnect.
 */
async function startNeuroClient() {
  const { NeuroClient } = NeuroGameSdk;

  if (neuroClient) {
    neuroClient.disconnect();
  }

  const storage = await getStorage();
  url = storage.url || 'ws://localhost:3000';

  try {
    neuroClient = new NeuroClient(url, GAME_NAME, () => neuroConnected());

    neuroClient.onError = (error) => {
      showToast('Websocket error');
      console.error('[NeuroClient] WebSocket error:', error);
    };

    neuroClient.onClose = (event) => {
      setTimeout(() => startNeuroClient(), 1500);
    };
  } catch (e) {
    showToast('Websocket error');
    console.error('[NeuroClient] WebSocket error:', e);
    setTimeout(() => startNeuroClient(), 2000);
  }
}

/**
 * This function gets called, when the Websocket connects.
 * Here the Actions are registered and handled.
 */
function neuroConnected() {
  showToast('Websocket connected');

  neuroClient.onClose = (event) => {
    showToast('Websocket closed');
    console.log('[NeuroClient] WebSocket connection closed:', event);
    setTimeout(() => startNeuroClient(), 1500);
  };

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
  ]);

  neuroClient.onAction((actionData) => {
    switch (actionData.name) {
      case 'craft':
        craft(
          actionData.params.first_item?.toLowerCase(),
          actionData.params.second_item?.toLowerCase()
        ).then(
          (msg) => neuroClient.sendActionResult(actionData.id, true, msg),
          (err) =>
            neuroClient.sendActionResult(
              actionData.id,
              false,
              err?.message || 'Unknown Error.'
            )
        );
        break;
      case 'available_items':
        neuroClient.sendActionResult(
          actionData.id,
          true,
          'Available items: ' + getItemList()
        );
        break;
      default:
        neuroClient.sendActionResult(actionData.id, false, 'Unknown action.');
        break;
    }
  });

  neuroClient.sendContext(
    'Infinite Craft is a crafting game where you can make anything you want. You can craft any two available items together to create a new item. That new item then also becomes available for crafting. Your currently available items are: ' +
    getItemList(),
    false
  );
}

/**
 * Crafts two items together if available and returns the message, that Neuro should receive.
 * This function gets called when Neuro sends the action to craft.
 * The message does not contain the emojis of the items, because they are probably confusing for Neuro.
 */
async function craft(first, second) {
  const firstElement = infinitecraft.items.find(
    (el) => el.text?.toLowerCase() === first
  );
  const secondElement = infinitecraft.items.find(
    (el) => el.text?.toLowerCase() === second
  );
  if (!firstElement || !secondElement) {
    // One of the elements is not available -> Send error to Neuro
    throw new Error(
      'Item ' + (!firstElement ? first : second) + ' is not available.'
    );
  }
  let msg = '';
  const firstElementText = firstElement.emoji + ' ' + firstElement.text;
  const secondElementText = secondElement.emoji + ' ' + secondElement.text;
  return infinitecraft.craft({ text: first }, { text: second }).then((r) => {
    if (r) {
      // Crafting successful
      showToast(
        'Craftet: ' +
        firstElementText +
        ' + ' +
        secondElementText +
        ' = ' +
        r.instance.emoji +
        ' ' +
        r.instance.text
      );

      // Show craftet Element in a random position
      const instance = IC?.createInstance({ ...r.instance, ...getRandomPosition(), animate: true });

      // Play sound
      if (Howler.state == 'running') {
        const pitches = [.9, 1];
        const sound = r.isNew ? newCraftSound : craftSound;
        sound.rate(pitches[Math.floor(Math.random() * pitches.length)]);
        sound.play();
      }

      // Show animation for new item
      if (instance && r.isNew) {
        instance.element.classList.add("instance-pinwheel"),
          instance.pinwheelStart = performance.now(),
          setTimeout((function () {
            instance.element.classList.remove("instance-pinwheel"),
              delete instance.pinwheelStart
          }
          ), 3050)
      }

      // Build message for neuro
      msg = 'Successfully crafted item: ' + r.instance.text + '.';
      if (r.isNew) {
        msg += ' This item is new.';
      } else {
        msg += ' You already had this item.';
      }
    } else {
      // Items cannot be crafted
      showToast(
        'Unable to craft: ' + firstElementText + ' + ' + secondElementText
      );
      msg =
        firstElement.text +
        ' and ' +
        secondElement.text +
        ' cannot be crafted together.';
    }

    const sidebar = document.getElementById('sidebar');
    sidebar.scrollTop = sidebar.scrollHeight;
    return msg;
  });
}

/**
 * Returns a comma separated list of all available items.
 * This function gets calles on first connection for context and when Neuro asks for it.
 */
function getItemList() {
  return infinitecraft.items.map((item) => item.text).join(', ');
}

/**
 * Returns the extension storage content
 */
async function getStorage() {
  return new Promise((resolve, reject) => {
    document.addEventListener(
      'INFINEURO_STORAGE',
      function (e) {
        resolve(e.detail);
      },
      { once: true }
    );

    document.dispatchEvent(new CustomEvent('INFINEURO_GET_STORAGE', {}));
  });
}
/**
 * Get random x and y coordinates for newly crafted items
 */
function getRandomPosition() {
  const paddingX = 100;
  const paddingY = 50;
  const maxX = window.innerWidth - infinitecraft.sidebarWidth - 2 * paddingX;
  const maxY = window.innerHeight - 2 * paddingY;
  return {
    x: Math.round(maxX * Math.random()) + paddingX,
    y: Math.round(maxY * Math.random()) + paddingY,
  };
}

/**
 * Shows a message in the Bottom of the screen.
 * This gets called to show what Neuro crafts.
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  const existingToasts = document.querySelectorAll('.toast');
  const offset = existingToasts.length * (toast.offsetHeight + 40);
  toast.style.bottom = `${30 + offset}px`;
  toast.classList.add('toast');
  document.body.appendChild(toast);
  (async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    toast.style.opacity = '1';
    await new Promise((resolve) => setTimeout(resolve, 3000));
    toast.style.opacity = '0';
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.remove();
    const remainingToasts = document.querySelectorAll('.toast');
    remainingToasts.forEach((t, index) => {
      t.style.bottom = `${30 + index * (toast.offsetHeight + 40)}px`;
    });
  })();
  return new Promise((resolve) => setTimeout(resolve, 50)); // 0.05 delay
}
