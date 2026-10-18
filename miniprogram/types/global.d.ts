type MiniProgramData = Record<string, any>;

interface MiniProgramInstance {
  data: MiniProgramData;
  [key: string]: any;
  setData(data: Record<string, any>): void;
  triggerEvent(name: string, detail?: Record<string, any>): void;
  createSelectorQuery(): any;
}

declare const wx: any;

declare function App<T extends Record<string, any>>(
  config: T & ThisType<T & { globalData: any }>,
): void;

declare function Page<T extends Record<string, any>>(
  config: T & ThisType<T & MiniProgramInstance>,
): void;

declare function Component<T extends Record<string, any>>(
  config: T &
    ThisType<
      T &
        (T extends { methods: infer M } ? M : Record<string, never>) &
        MiniProgramInstance
    >,
): void;

declare function getApp<T = { globalData: any }>(): T;
declare function getCurrentPages(): Array<{ route: string }>;

declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(id: number): void;
