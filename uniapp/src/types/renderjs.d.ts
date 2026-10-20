import "vue";

declare module "vue" {
  interface ComponentCustomProperties {
    signatureRenderer: {
      configure: (...args: unknown[]) => void;
      exportSignature: (...args: unknown[]) => void;
      begin: (...args: unknown[]) => void;
      move: (...args: unknown[]) => void;
      end: (...args: unknown[]) => void;
    };
  }
}
