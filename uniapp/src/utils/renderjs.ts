export interface SignaturePoint {
  x: number;
  y: number;
}

export interface SignatureStroke {
  points: SignaturePoint[];
}

export interface SignatureRenderConfig {
  surface: string;
  border: string;
  ink: string;
  muted: string;
  roleTitle: string;
  signer: string;
  department: string;
  signedAt: string;
  isCustomer: boolean;
}

export interface SignatureRenderOwner {
  callMethod?: (name: string, value: unknown) => void;
}

export interface SignatureRenderContext {
  $el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  config: SignatureRenderConfig;
  strokes: SignatureStroke[];
  current: SignatureStroke | null;
  scale: number;
  width: number;
  height: number;
  observer: ResizeObserver | null;
  ownerInstance: SignatureRenderOwner | null;
  lastExportId: number;
  lastClearRequest: number;
  ensureCanvas: () => boolean;
  redraw: () => void;
  replayStrokes: (ctx: CanvasRenderingContext2D) => void;
  drawFooter: (ctx: CanvasRenderingContext2D, signedAt?: string) => void;
  pointFromEvent: (event: TouchEvent) => SignaturePoint | null;
  exportSignature: (
    request: { id: number; signedAt?: string },
    oldRequest: unknown,
    ownerInstance?: SignatureRenderOwner,
  ) => void;
}

export function renderContext(value: unknown): SignatureRenderContext {
  return value as SignatureRenderContext;
}
