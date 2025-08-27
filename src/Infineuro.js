"use strict";

var infinitecraft;

init()

async function init() {
  infinitecraft = document.querySelector(".container").__vue__;
  if (!infinitecraft) {
    setTimeout(() => init(), 200);
    return;
  }

  if (!infinitecraft.isDarkMode) infinitecraft.toggleDarkMode();
  var currentCraft = Promise.resolve();

  setInterval(() => craft(infinitecraft.items[infinitecraft.items.length - 1].text.toLowerCase(), infinitecraft.items[infinitecraft.items.length - 11].text.toLowerCase()), 2000)
}



async function craft(first, second) {
  return infinitecraft.craft({ text: first }, { text: second }).then(r => showToast('Craftet: ' + r.instance.emoji + ' ' + r.instance.text), e => console.error(e));
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.classList.add('toast')
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