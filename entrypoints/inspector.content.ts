let isInspectorActive = false;
let highlightedElement: HTMLElement | null = null;
let tooltipElement: HTMLDivElement | null = null;
let previousOutline = '';
let previousCursor = '';

function buildSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const classList = Array.from(element.classList)
    .slice(0, 2)
    .map((className) => `.${CSS.escape(className)}`)
    .join('');
  if (classList) {
    return `${element.tagName.toLowerCase()}${classList}`;
  }

  const parent = element.parentElement;
  if (!parent) return element.tagName.toLowerCase();
  const siblings = Array.from(parent.children).filter((child) => child.tagName === element.tagName);
  const index = siblings.indexOf(element) + 1;
  return `${element.tagName.toLowerCase()}:nth-of-type(${index})`;
}

async function copySelector(selector: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(selector);
  } catch {
    const input = document.createElement('textarea');
    input.value = selector;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
}

function clearHighlight() {
  if (highlightedElement) {
    highlightedElement.style.outline = previousOutline;
    highlightedElement.style.cursor = previousCursor;
    highlightedElement = null;
  }
}

function stopInspector() {
  if (!isInspectorActive) return;
  isInspectorActive = false;
  clearHighlight();
  tooltipElement?.remove();
  tooltipElement = null;
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

function updateTooltipPosition(x: number, y: number) {
  if (!tooltipElement) return;
  tooltipElement.style.left = `${x + 12}px`;
  tooltipElement.style.top = `${y + 12}px`;
}

function handleMouseMove(event: MouseEvent) {
  if (!isInspectorActive) return;
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target || target === tooltipElement || tooltipElement?.contains(target)) return;

  clearHighlight();
  highlightedElement = target;
  previousOutline = target.style.outline;
  previousCursor = target.style.cursor;
  target.style.outline = '2px solid #9b59b6';
  target.style.cursor = 'crosshair';

  const selector = buildSelector(target);
  const id = target.id ? `#${target.id}` : '(none)';
  const classes = target.className ? String(target.className) : '(none)';
  if (tooltipElement) {
    tooltipElement.textContent = `${selector} | id: ${id} | class: ${classes}`;
  }
  updateTooltipPosition(event.clientX, event.clientY);
}

function handleClick(event: MouseEvent) {
  if (!isInspectorActive) return;
  event.preventDefault();
  event.stopPropagation();
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target || target === tooltipElement || tooltipElement?.contains(target)) return;
  void copySelector(buildSelector(target));
  stopInspector();
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    stopInspector();
  }
}

export function activateSelectorInspector() {
  if (isInspectorActive) {
    stopInspector();
  }

  isInspectorActive = true;
  tooltipElement = document.createElement('div');
  tooltipElement.style.position = 'fixed';
  tooltipElement.style.zIndex = '2147483647';
  tooltipElement.style.pointerEvents = 'none';
  tooltipElement.style.background = 'rgba(27, 31, 35, 0.95)';
  tooltipElement.style.color = '#fff';
  tooltipElement.style.border = '1px solid #9b59b6';
  tooltipElement.style.borderRadius = '6px';
  tooltipElement.style.padding = '6px 8px';
  tooltipElement.style.fontSize = '12px';
  tooltipElement.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  tooltipElement.style.maxWidth = '70vw';
  tooltipElement.style.whiteSpace = 'nowrap';
  tooltipElement.style.overflow = 'hidden';
  tooltipElement.style.textOverflow = 'ellipsis';
  tooltipElement.textContent = 'Hover an element to inspect';
  const container = document.body || document.documentElement;
  if (container) {
    container.appendChild(tooltipElement);
  }

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
}
