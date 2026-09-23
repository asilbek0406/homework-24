/**
 * BMW X6 M Competition — Configurator
 * ------------------------------------------------------------
 * The UI is rendered from one state object. Every user action
 * changes state first, then the relevant part of the interface
 * is updated from state + data/config.json.
 */

const state = {
  activeTab: "exterior",
  colorId: "blue",
  interiorId: 1,
  frame: 1,
  theme: localStorage.getItem("bmw-theme") || "light"
};

let config = null;
let wheelBuffer = 0;
const WHEEL_STEP = 120;
const PRICE_ANIMATION_DURATION = 650;
const IMAGE_FADE_DURATION = 180;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

/* ------------------------------------------------------------
   Data
   ------------------------------------------------------------ */

async function loadConfig() {
  try {
    const response = await fetch("data/config.json");

    if (!response.ok) {
      throw new Error(`config.json returned ${response.status}`);
    }

    config = await response.json();
    applyTheme();
    preloadImages();
    renderAll();
  } catch (error) {
    console.error(error);
    showDataError();
  }
}

function showDataError() {
  const message = document.createElement("div");
  message.className = "data-error";
  message.textContent = "Could not load config.json. Open the project with VS Code Live Server.";
  Object.assign(message.style, {
    position: "fixed",
    inset: "0",
    zIndex: "999",
    display: "grid",
    placeItems: "center",
    padding: "30px",
    background: "#111",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
    textAlign: "center"
  });
  document.body.appendChild(message);
}

function getSelectedColor() {
  return config.exteriorColors.find((color) => color.id === state.colorId);
}

function getSelectedInterior() {
  return config.interiorOptions.find((option) => option.id === state.interiorId);
}

function calculateTotal() {
  const color = getSelectedColor();
  const interior = getSelectedInterior();
  return config.basePrice + color.price + interior.price;
}

function formatMoney(value) {
  return `$${value.toLocaleString("en-US")}`;
}

/* ------------------------------------------------------------
   Rendering
   ------------------------------------------------------------ */

function renderAll() {
  renderTabs();
  renderExteriorOptions();
  renderInteriorOptions();
  updateExteriorImage();
  updateInteriorImage();
  updateLabels();
  updatePrices();
}

function renderTabs() {
  $$(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === state.activeTab);
  });

  $$(".config-panel").forEach((panel) => {
    const shouldShow = panel.id === `${state.activeTab}-panel`;
    panel.classList.toggle("is-active", shouldShow);

    if (shouldShow) {
      panel.classList.remove("is-entering");
      void panel.offsetWidth;
      panel.classList.add("is-entering");
    }
  });
}

function renderExteriorOptions() {
  const container = $(".exterior-options");

  container.innerHTML = config.exteriorColors.map((color) => `
    <button
      class="option ${color.id === state.colorId ? "is-selected" : ""}" style="--option-index: ${config.exteriorColors.indexOf(color)}"
      type="button"
      data-color-id="${color.id}"
      aria-pressed="${color.id === state.colorId}"
    >
      <span class="swatch" style="background: ${color.hex}"></span>
      <span>
        <span class="option-name">${color.name}</span>
        <span class="option-description">${color.description}</span>
      </span>
      <span class="option-price">${formatOptionPrice(color.price)}</span>
    </button>
  `).join("");
}

function renderInteriorOptions() {
  const container = $(".interior-options");

  container.innerHTML = config.interiorOptions.map((option) => `
    <button
      class="option ${option.id === state.interiorId ? "is-selected" : ""}" style="--option-index: ${config.interiorOptions.indexOf(option)}"
      type="button"
      data-interior-id="${option.id}"
      aria-pressed="${option.id === state.interiorId}"
    >
      <span class="swatch" style="background: ${option.hex}"></span>
      <span>
        <span class="option-name">${option.name}</span>
        <span class="option-description">${option.description}</span>
      </span>
      <span class="option-price">${formatOptionPrice(option.price)}</span>
    </button>
  `).join("");
}

function formatOptionPrice(price) {
  return price === 0 ? "Included" : `+${formatMoney(price)}`;
}

/* ------------------------------------------------------------
   Images
   ------------------------------------------------------------ */

function preloadImages() {
  config.exteriorColors.forEach((color) => {
    for (let frame = 1; frame <= config.assets.exteriorFrameCount; frame += 1) {
      const image = new Image();
      image.src = `images/exterior/${color.id}/${frame}.jpg`;
    }
  });

  config.interiorOptions.forEach((option) => {
    const image = new Image();
    image.src = `images/interior/${option.id}.jpg`;
  });
}

function updateExteriorImage() {
  const stage = $(".car-stage");
  const image = $(".car-image");
  const source = `images/exterior/${state.colorId}/${state.frame}.jpg`;

  stage.classList.add("is-loading");
  image.classList.add("is-changing");

  const nextImage = new Image();

  nextImage.onload = () => {
    window.setTimeout(() => {
      image.src = source;
      image.alt = `BMW X6 M Competition in ${getSelectedColor().name}`;

      requestAnimationFrame(() => {
        image.classList.remove("is-changing");
        stage.classList.remove("is-loading");
      });
    }, IMAGE_FADE_DURATION);
  };

  nextImage.onerror = () => {
    console.warn(`Missing exterior image: ${source}`);
    image.src = source;
    image.classList.remove("is-changing");
    stage.classList.remove("is-loading");
  };

  nextImage.src = source;
  $(".frame-counter").textContent = `${String(state.frame).padStart(2, "0")} / ${config.assets.exteriorFrameCount}`;
}

function updateInteriorImage() {
  const option = getSelectedInterior();
  const image = $(".interior-image");

  image.classList.add("is-changing");

  window.setTimeout(() => {
    image.src = `images/interior/${option.id}.jpg`;
    image.alt = `BMW X6 M Competition — ${option.name}`;

    requestAnimationFrame(() => {
      image.classList.remove("is-changing");
    });
  }, IMAGE_FADE_DURATION);
}

/* ------------------------------------------------------------
   Text and price
   ------------------------------------------------------------ */

function updateLabels() {
  const color = getSelectedColor();
  const interior = getSelectedInterior();

  animateText($(".color-name"), color.name);
  animateText($(".color-description"), color.description);
  animateText($(".interior-name"), interior.name);
  animateText($(".interior-description"), interior.description);
}

function animateText(element, value) {
  if (!element || element.textContent === value) return;

  element.classList.add("is-changing");

  window.setTimeout(() => {
    element.textContent = value;
    requestAnimationFrame(() => element.classList.remove("is-changing"));
  }, 140);
}

function animatePrice(element, newValue) {
  const oldValue = Number(element.dataset.value ?? newValue);

  if (oldValue === newValue) {
    element.textContent = formatMoney(newValue);
    element.dataset.value = String(newValue);
    return;
  }

  const startTime = performance.now();
  element.classList.add("is-changing");

  function tick(currentTime) {
    const progress = Math.min(
      (currentTime - startTime) / PRICE_ANIMATION_DURATION,
      1
    );

    // Ease-out: fast at the beginning, smooth stop at the final price.
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(
      oldValue + (newValue - oldValue) * eased
    );

    element.textContent = formatMoney(currentValue);

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    element.dataset.value = String(newValue);
    element.textContent = formatMoney(newValue);

    window.setTimeout(() => {
      element.classList.remove("is-changing");
    }, 90);
  }

  requestAnimationFrame(tick);
}

function updatePrices() {
  const newPrice = calculateTotal();

  $$(".price").forEach((element) => {
    animatePrice(element, newPrice);
  });
}

/* ------------------------------------------------------------
   Exterior frame controls
   ------------------------------------------------------------ */

function showNextFrame() {
  if (state.frame >= config.assets.exteriorFrameCount) return;
  state.frame += 1;
  updateExteriorImage();
}

function showPreviousFrame() {
  if (state.frame <= 1) return;
  state.frame -= 1;
  updateExteriorImage();
}

function handleViewerWheel(event) {
  if (state.activeTab !== "exterior") return;

  event.preventDefault();
  wheelBuffer += event.deltaX + event.deltaY;

  if (wheelBuffer >= WHEEL_STEP) {
    showNextFrame();
    wheelBuffer = 0;
  }

  if (wheelBuffer <= -WHEEL_STEP) {
    showPreviousFrame();
    wheelBuffer = 0;
  }
}

/* ------------------------------------------------------------
   Theme
   ------------------------------------------------------------ */

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;

  const toggle = $(".theme-toggle");
  const isDark = state.theme === "dark";

  toggle.setAttribute("aria-pressed", String(isDark));
  $(".theme-icon").textContent = isDark ? "☾" : "☼";
  $(".theme-label").textContent = isDark ? "Light" : "Dark";
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  localStorage.setItem("bmw-theme", state.theme);
  applyTheme();
}

/* ------------------------------------------------------------
   Quote modal
   ------------------------------------------------------------ */

function openQuoteModal() {
  const color = getSelectedColor();
  const interior = getSelectedInterior();
  const options = color.price + interior.price;
  const total = calculateTotal();

  const quote = {
    model: config.model,
    exterior: color.name,
    interior: interior.name,
    basePrice: config.basePrice,
    options,
    total,
    date: new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  };

  console.log("BMW quote:", JSON.stringify(quote, null, 2));

  $(".quote-exterior").textContent = quote.exterior;
  $(".quote-interior").textContent = quote.interior;
  $(".quote-base").textContent = formatMoney(quote.basePrice);
  $(".quote-options").textContent = options === 0 ? "Included" : `+${formatMoney(options)}`;
  $(".quote-total-value").textContent = formatMoney(total);

  $(".quote-modal").classList.add("is-open");
  $(".quote-modal").setAttribute("aria-hidden", "false");
}

function closeQuoteModal() {
  $(".quote-modal").classList.remove("is-open");
  $(".quote-modal").setAttribute("aria-hidden", "true");
}

/* ------------------------------------------------------------
   Events
   ------------------------------------------------------------ */

$(".main-tabs").addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;

  state.activeTab = tab.dataset.tab;
  renderTabs();
});

document.addEventListener("click", (event) => {
  const colorButton = event.target.closest("[data-color-id]");
  const interiorButton = event.target.closest("[data-interior-id]");
  const nextButton = event.target.closest("[data-next]");

  if (colorButton) {
    state.colorId = colorButton.dataset.colorId;
    renderExteriorOptions();
    updateExteriorImage();
    updateLabels();
    updatePrices();
    return;
  }

  if (interiorButton) {
    state.interiorId = Number(interiorButton.dataset.interiorId);
    renderInteriorOptions();
    updateInteriorImage();
    updateLabels();
    updatePrices();
    return;
  }

  if (nextButton) {
    state.activeTab = nextButton.dataset.next;
    renderTabs();
    return;
  }

  if (event.target.closest(".frame-arrow--next")) {
    showNextFrame();
    return;
  }

  if (event.target.closest(".frame-arrow--prev")) {
    showPreviousFrame();
    return;
  }

  if (event.target.closest(".theme-toggle")) {
    toggleTheme();
    return;
  }

  if (event.target.closest(".quote-button, .quote-link")) {
    openQuoteModal();
    return;
  }

  if (event.target.closest(".modal-close, .modal-done, .modal-backdrop")) {
    closeQuoteModal();
  }
});

$(".car-stage").addEventListener("wheel", handleViewerWheel, { passive: false });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeQuoteModal();

  if (state.activeTab === "exterior") {
    if (event.key === "ArrowRight") showNextFrame();
    if (event.key === "ArrowLeft") showPreviousFrame();
  }
});

loadConfig();
