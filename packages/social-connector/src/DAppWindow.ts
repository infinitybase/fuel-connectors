import { WINDOW } from './constants';

type PopupConfig = {
  appUrl: string;
  height: number;
  width: number;
  sessionId: string;
};

export class DAppWindow {
  isMobile: boolean = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  isSafariBrowser: boolean = /^((?!chrome|android).)*safari/i.test(
    navigator.userAgent,
  );
  isOpen = false;
  opned: Window | null = null;

  constructor(private config: PopupConfig) {}

  private get popupConfig() {
    const { height, width } = this.config;
    return {
      top: WINDOW.innerHeight / 2 - height / 2,
      left: WINDOW.innerWidth / 2 - width / 2,
      width,
      height:
        !this.isMobile && WINDOW.innerHeight >= height
          ? height
          : WINDOW.innerHeight,
    };
  }

  open(method: string, reject: (e: Error) => void) {
    if (this.isOpen) reject(new Error('Window is already open'));

    if (!this.isSafariBrowser) {
      this.makePopup(method);
    }
    if (this.isSafariBrowser) {
      this.makeFrame(method);
    }
  }

  close() {
    const frame = document.getElementById(`${this.config.sessionId}-iframe`);
    const backdrop = document.getElementById(
      `${this.config.sessionId}-backdrop`,
    );
    if (frame) document.body.removeChild(frame);
    if (backdrop) document.body.removeChild(backdrop);
    if (this.opned) this.opned.close();
    this.isOpen = false;
  }

  makeFrame(method: string) {
    const w = this.small;

    const frame = document.createElement('iframe');
    frame.id = `${this.config.sessionId}-iframe`;
    frame.src = `${this.config.appUrl}${method}${this.queryString}`;
    frame.style.position = 'fixed';
    frame.style.zIndex = '99999999';
    frame.style.top = `${w.top}`;
    frame.style.left = `${w.left}`;
    frame.style.width = w.width;
    frame.style.height = w.height;
    frame.style.borderRadius = '16px';

    const backdrop = document.createElement('div');
    backdrop.id = `${this.config.sessionId}-backdrop`;
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0,0,0,0.5)';
    backdrop.style.zIndex = '99999998';
    backdrop.addEventListener('click', () => this.close());

    document.body.appendChild(backdrop);
    document.body.appendChild(frame);
    this.isOpen = true;
  }

  makePopup(method: string) {
    const link = `${this.config.appUrl}${method}${this.queryString}`;
    const popup = WINDOW.open(
      link,
      'popup',
      `width=${this.popupConfig.width}, height=${this.popupConfig.height}, top=${this.popupConfig.top}, left=${this.popupConfig.left}`,
    );
    if (popup) this.opned = popup;
    this.isOpen = true;
    return popup;
  }

  private get queryString() {
    const { sessionId } = this.config;
    return `?sessionId=${sessionId}&origin=${WINDOW.location.origin}&name=${WINDOW.document.title}`;
  }

  private get small() {
    const breakponint = {
      md: {
        top: 0,
        left: 0,
        limit: 650,
        width: '100%',
        height: '100%',
      },
      lg: {
        top: `${(WINDOW.innerHeight - WINDOW.innerHeight * 0.7) / 2}px`,
        left: `${(WINDOW.innerWidth - WINDOW.innerWidth * 0.5) / 2}px`,
        limit: 1024,
        width: '50%',
        height: '70%',
      },
      xl: {
        top: `${(WINDOW.innerHeight - 650) / 2}px`,
        left: `${(WINDOW.innerWidth - 500) / 2}px`,
        limit: 1440,
        height: '650px',
        width: '500px',
      },
    };
    return WINDOW.innerWidth < breakponint.md.limit
      ? breakponint.md
      : WINDOW.innerWidth < breakponint.lg.limit
        ? breakponint.lg
        : breakponint.xl;
  }
}
