import { h } from './dom';

export type ToastKind = 'info' | 'milestone' | 'achievement' | 'warn';

export class Toasts {
  private root: HTMLElement;
  private max = 4;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  show(text: string, kind: ToastKind = 'info', title?: string, duration = 3200): void {
    const el = h('div', { class: `toast ${kind}` }, title ? h('b', { text: title }) : null, document.createTextNode(text));
    this.root.append(el);
    while (this.root.children.length > this.max) this.root.firstElementChild?.remove();
    window.setTimeout(() => {
      el.classList.add('out');
      window.setTimeout(() => el.remove(), 420);
    }, duration);
  }
}
