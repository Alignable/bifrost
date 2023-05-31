export type RenderCallback = () => Promise<void>;

export interface RenderDelegate {
  viewWillRender(): void;
  viewRendered(): void;
  viewInvalidated(): void;
}

export abstract class Renderer {
  abstract delegate?: RenderDelegate;

  abstract render(
    delegate: RenderDelegate,
    callback: RenderCallback
  ): Promise<void>;

  async renderView(callback: RenderCallback) {
    if (!this.delegate) throw new Error("delegate not set before rendering");
    this.delegate.viewWillRender();
    await callback();
    this.delegate.viewRendered();
  }

  invalidateView() {
    this.delegate?.viewInvalidated();
  }
}
