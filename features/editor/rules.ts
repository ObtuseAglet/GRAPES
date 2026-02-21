export type EditorRuleType = 'text-highlight' | 'selector-style' | 'selector-attribute';

export interface EditorRule {
  id: string;
  enabled: boolean;
  type: EditorRuleType;
  label: string;
  payload: Record<string, string>;
}

export function applyEditorRules(rules: EditorRule[]): void {
  const activeRules = rules.filter((rule) => rule.enabled);
  if (activeRules.length === 0) return;

  const styleId = 'grapes-editor-rules-style';
  const existing = document.getElementById(styleId);
  existing?.remove();
  const style = document.createElement('style');
  style.id = styleId;
  style.setAttribute('data-grapes-injected', 'true');

  let css = '';
  for (const rule of activeRules) {
    if (rule.type === 'selector-style') {
      const selector = rule.payload.selector;
      const declaration = rule.payload.declaration;
      if (selector && declaration) {
        css += `${selector} { ${declaration} }\n`;
      }
    }
  }
  style.textContent = css;
  if (css) {
    document.head.appendChild(style);
  }

  for (const rule of activeRules) {
    if (rule.type === 'text-highlight') {
      const text = rule.payload.text?.trim();
      const color = rule.payload.color || '#fff2a8';
      if (!text) continue;
      highlightMatches(text, color);
    }

    if (rule.type === 'selector-attribute') {
      const selector = rule.payload.selector;
      const attribute = rule.payload.attribute;
      const value = rule.payload.value;
      if (!selector || !attribute) continue;
      document.querySelectorAll(selector).forEach((node) => {
        if (node instanceof Element) {
          node.setAttribute(attribute, value || 'true');
        }
      });
    }
  }
}

function highlightMatches(needle: string, color: string): void {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    if (walker.currentNode instanceof Text) nodes.push(walker.currentNode);
  }

  for (const node of nodes) {
    const value = node.nodeValue;
    if (!value || !value.toLowerCase().includes(needle.toLowerCase())) continue;
    const index = value.toLowerCase().indexOf(needle.toLowerCase());
    if (index < 0) continue;

    const before = value.slice(0, index);
    const match = value.slice(index, index + needle.length);
    const after = value.slice(index + needle.length);
    const span = document.createElement('span');
    span.setAttribute('data-grapes-injected', 'true');
    span.style.backgroundColor = color;
    span.style.color = '#1f1f1f';
    span.textContent = match;

    const fragment = document.createDocumentFragment();
    if (before) fragment.appendChild(document.createTextNode(before));
    fragment.appendChild(span);
    if (after) fragment.appendChild(document.createTextNode(after));
    node.parentNode?.replaceChild(fragment, node);
  }
}
