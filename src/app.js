// Tailwind Plus Elements is loaded via theme.liquid CDN script

// Mark page as JS-enhanced so we can adjust CSS fallbacks
try { document.body && document.body.setAttribute('data-js-enhanced', ''); } catch {}

import { createApp, reactive, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';

// --- cartStore: minimal AJAX cart wrapper ---
const state = reactive({
  cart: null,
  count: 0,
  loading: false,
  error: null,
  lineErrors: {},
});

const ROOT = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ? window.Shopify.routes.root : '/';

async function fetchCart() {
  state.loading = true;
  try {
    const res = await fetch(ROOT + 'cart.js', { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
    const data = await res.json();
    state.cart = data;
    state.count = data?.item_count || 0;
    state.error = null;
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));
  } catch (e) {
    state.error = 'Failed to load cart';
    console.error('[cart] fetchCart error', e);
  } finally {
    state.loading = false;
  }
}

async function changeLine({ id, quantity, line, _idx } = {}) {
  const payload = line != null ? { line, quantity } : { id, quantity };
  if (_idx != null) delete state.lineErrors[_idx];
  const res = await fetch(ROOT + 'cart/change.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    state.cart = data;
    state.count = data?.item_count || 0;
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));
    return { ok: true, data };
  } else {
    const message = data?.message || data?.description || (Array.isArray(data?.errors) ? data.errors.join(', ') : (typeof data?.errors === 'string' ? data.errors : 'Cart update failed'));
    state.error = message;
    if (_idx != null) state.lineErrors[_idx] = message;
    return { ok: false, error: message, data };
  }
}

async function addLine({ id, quantity = 1, properties } = {}) {
  const res = await fetch(ROOT + 'cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ id, quantity, properties }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    await fetchCart();
    // Signal anyone listening (e.g., the header flyout) to open
    document.dispatchEvent(new CustomEvent('cart:open'));
    return { ok: true, data };
  } else {
    const message = data?.message || data?.description || 'Add to cart failed';
    state.error = message;
    document.dispatchEvent(new CustomEvent('cart:add:error', { detail: { message, data } }));
    return { ok: false, error: message, data };
  }
}

export const cartStore = { state, fetchCart, changeLine, addLine };

// Enhance product forms: intercept submit, call addLine, update count, open flyout
function enhanceProductForms() {
  document.querySelectorAll('form[data-ajax-product-form]')?.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      try {
        e.preventDefault();
        const fd = new FormData(form);
        const id = fd.get('id');
        const quantityRaw = fd.get('quantity');
        const quantity = Number(quantityRaw || 1) || 1;
        const { ok, error } = await addLine({ id, quantity });
        const errEl = form.querySelector('[data-ajax-add-error]');
        if (!ok && errEl) {
          errEl.textContent = error || 'Unable to add to cart';
        } else if (errEl) {
          errEl.textContent = '';
        }
      } catch (err) {
        const errEl = form.querySelector('[data-ajax-add-error]');
        if (errEl) errEl.textContent = 'Unexpected error while adding to cart';
        console.error('[product-form] add error', err);
      }
    }, { passive: false });
  });
}

// --- Header cart badge (count only) ---
function mountHeaderBadges() {
  document.querySelectorAll('[data-vue-cart-badge]').forEach((el) => {
    const App = {
      name: 'HeaderCartCount',
      setup() { return { state }; },
      template: '<span v-if="state.count > 0">{{ state.count }}</span>',
    };
    createApp(App).mount(el);
  });
}

// --- Cart page UI (single definition) ---
function mountCartPage() {
  document.querySelectorAll('[data-vue-cart-page]').forEach((el) => {
    const App = {
      name: 'CartPage',
      setup() {
        const updateQty = (idx, q) => changeLine({ line: idx + 1, quantity: Number(q), _idx: idx });
        const removeLine = (idx) => changeLine({ line: idx + 1, quantity: 0, _idx: idx });
        const checkout = () => { window.location.href = ROOT + 'checkout'; };
        const formatMoney = (cents) => {
          try {
            const currency = state.cart?.currency || 'USD';
            const nf = new Intl.NumberFormat(undefined, { style: 'currency', currency });
            return nf.format((cents || 0) / 100);
          } catch { return `$${((cents || 0)/100).toFixed(2)}`; }
        };
        return { state, updateQty, removeLine, checkout, ROOT, formatMoney };
      },
      template: `
        <div v-if="state.cart">
          <ul v-if="state.cart.items && state.cart.items.length">
            <li v-for="(item, idx) in state.cart.items" :key="item.key || idx" class="flex items-center gap-3 py-3">
              <img :src="item.image" :alt="item.product_title" class="w-16 h-16 object-cover rounded" />
              <div class="flex-1">
                <div class="text-sm font-medium">{{ item.product_title || item.title }}</div>
                <div class="text-xs text-gray-500" v-if="item.variant_title">{{ item.variant_title }}</div>
                <div class="text-xs text-gray-500">Unit: {{ formatMoney(item.final_price || item.price) }}</div>
              </div>
              <div class="flex items-center gap-2">
                <select class="border rounded px-2 py-1 text-sm" :value="item.quantity" :disabled="state.loading" @change="updateQty(idx, $event.target.value)">
                  <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
                </select>
                <button class="text-gray-500 hover:text-gray-700 text-sm" @click="removeLine(idx)" type="button">Remove</button>
              </div>
              <div class="text-xs text-red-600 mt-1" v-if="state.lineErrors[idx]">{{ state.lineErrors[idx] }}</div>
              <div class="text-sm font-medium w-24 text-right">
                {{ formatMoney(item.final_line_price || item.line_price) }}
              </div>
            </li>
          </ul>
          <div v-else class="text-sm text-gray-600">Your cart is empty.</div>
          <div class="mt-6 border-t pt-4">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Subtotal</span>
              <span class="font-medium">{{ formatMoney(state.cart.items_subtotal_price) }}</span>
            </div>
            <div class="mt-4">
              <a :href="ROOT + 'checkout'" class="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white text-sm hover:bg-indigo-700">Checkout</a>
            </div>
          </div>
          <p v-if="state.error" class="mt-3 text-sm text-red-600" aria-live="polite">{{ state.error }}</p>
        </div>
        <div v-else class="text-sm text-gray-600">Loading cart…</div>
      `,
    };
    createApp(App).mount(el);
  });
}

// --- Header flyout (preview) ---
function mountHeaderFlyout() {
  document.querySelectorAll('[data-vue-cart-flyout]').forEach((el) => {
    const App = {
      name: 'CartFlyout',
      setup() {
        const open = ref(false);
        const onDocClick = (e) => {
          if (!el.contains(e.target)) open.value = false;
        };
        const onKeydown = (e) => { if (e.key === 'Escape') open.value = false; };
        const buttonRef = ref(null);
        const panelRef = ref(null);
        const openPanel = async () => { open.value = true; await nextTick(); panelRef.value?.focus(); };
        onMounted(() => {
          document.addEventListener('click', onDocClick);
          document.addEventListener('keydown', onKeydown);
          document.addEventListener('cart:open', openPanel);
        });
        onBeforeUnmount(() => {
          document.removeEventListener('click', onDocClick);
          document.removeEventListener('keydown', onKeydown);
          document.removeEventListener('cart:open', openPanel);
        });
        const toggle = async () => {
          open.value = !open.value;
          if (open.value) {
            await nextTick();
            panelRef.value?.focus();
          } else {
            buttonRef.value?.focus();
          }
        };
        const formatMoney = (cents) => {
          try {
            const currency = state.cart?.currency || 'USD';
            const nf = new Intl.NumberFormat(undefined, { style: 'currency', currency });
            return nf.format((cents || 0) / 100);
          } catch { return `$${((cents || 0)/100).toFixed(2)}`; }
        };
        return { state, open, toggle, ROOT, formatMoney, buttonRef, panelRef };
      },
      template: `
        <div class="relative inline-block">
          <button ref="buttonRef" type="button" class="sr-only" aria-haspopup="dialog" :aria-expanded="open ? 'true' : 'false'" aria-controls="cart-flyout-panel" @click="toggle">Toggle cart preview</button>
          <div v-show="open" ref="panelRef" id="cart-flyout-panel" tabindex="-1" role="dialog" aria-label="Cart preview" class="absolute right-0 mt-2 w-80 rounded-md border bg-white shadow-lg z-50 p-3 text-sm">
            <div v-if="state.cart && state.cart.items && state.cart.items.length">
              <ul class="divide-y">
                <li v-for="(item, idx) in state.cart.items.slice(0, 5)" :key="item.key || idx" class="py-2 flex items-center gap-2">
                  <img :src="item.image" :alt="item.product_title" class="w-10 h-10 object-cover rounded" />
                  <div class="flex-1 min-w-0">
                    <div class="truncate">{{ item.product_title || item.title }}</div>
                    <div class="text-gray-500">×{{ item.quantity }} · {{ formatMoney(item.final_price || item.price) }}</div>
                  </div>
                  <div class="font-medium">{{ formatMoney(item.final_line_price || item.line_price) }}</div>
                </li>
              </ul>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-gray-600">Subtotal</span>
                <span class="font-medium">{{ formatMoney(state.cart.items_subtotal_price) }}</span>
              </div>
              <div class="mt-3 flex gap-2">
                <a href="${ROOT}cart" class="flex-1 inline-flex items-center justify-center rounded-md border px-3 py-2">View cart</a>
                <a :href="ROOT + 'checkout'" class="flex-1 inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-white">Checkout</a>
              </div>
            </div>
            <div v-else>
              <p class="text-gray-600">Your cart is empty.</p>
              <div class="mt-2">
                <a href="${ROOT}" class="underline">Continue shopping</a>
              </div>
            </div>
          </div>
        </div>
      `,
    };
    createApp(App).mount(el);

    // Wire the adjacent cart link to toggle the flyout
    const link = el.previousElementSibling?.matches('[data-cart-link]') ? el.previousElementSibling : null;
    if (link) link.addEventListener('click', (e) => { e.preventDefault(); const btn = el.querySelector('button'); btn && btn.click(); });
  });
}

function bindCartUpdatedListener() {
  document.addEventListener('cart:updated', (e) => {
    const data = e && e.detail;
    if (data) {
      state.cart = data;
      state.count = data.item_count || 0;
    }
  });
}

function init() {
  bindCartUpdatedListener();
  fetchCart();
  mountHeaderBadges();
  mountHeaderFlyout();
  mountCartPage();
  // Enhance product forms for AJAX add
  enhanceProductForms();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for debugging in console
window.cartStore = cartStore;
