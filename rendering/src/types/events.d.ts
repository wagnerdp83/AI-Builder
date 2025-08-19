interface ComponentLoadedEvent extends CustomEvent {
  detail: {
    componentName: string;
  };
}

declare global {
  interface WindowEventMap {
    componentLoaded: ComponentLoadedEvent;
  }
}
