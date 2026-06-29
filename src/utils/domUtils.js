export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function byId(id) {
  return document.getElementById(id);
}

export function clear(node) {
  if (node) node.replaceChildren();
}

export function setText(id, value) {
  const node = typeof id === 'string' ? byId(id) : id;
  if (node) node.textContent = value ?? '—';
}

export function setStyle(node, styles = {}) {
  if (!node) return;
  Object.entries(styles).forEach(([key, value]) => {
    node.style[key] = value;
  });
}

export function createEl(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.id) node.id = options.id;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.title) node.title = options.title;
  if (options.type) node.type = options.type;
  if (options.value !== undefined) node.value = options.value;
  if (options.role) node.setAttribute('role', options.role);
  if (options.ariaLabel) node.setAttribute('aria-label', options.ariaLabel);
  if (options.tabIndex !== undefined) node.tabIndex = options.tabIndex;
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      node.dataset[key] = value;
    });
  }
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value);
    });
  }
  if (options.style) setStyle(node, options.style);
  if (options.on) {
    Object.entries(options.on).forEach(([event, handler]) => node.addEventListener(event, handler));
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function button(options = {}, children = []) {
  return createEl('button', { type: 'button', ...options }, children);
}

export function show(nodeOrId, display = 'block') {
  const node = typeof nodeOrId === 'string' ? byId(nodeOrId) : nodeOrId;
  if (node) node.style.display = display;
}

export function hide(nodeOrId) {
  const node = typeof nodeOrId === 'string' ? byId(nodeOrId) : nodeOrId;
  if (node) node.style.display = 'none';
}

export function setWidthPercent(nodeOrId, value) {
  const node = typeof nodeOrId === 'string' ? byId(nodeOrId) : nodeOrId;
  if (node) node.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
}

export function setModalOpen(overlayId, isOpen) {
  const overlay = byId(overlayId);
  if (!overlay) return;
  overlay.classList.toggle('open', Boolean(isOpen));
  overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

export function focusFirst(root) {
  const node = root?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  node?.focus?.();
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
