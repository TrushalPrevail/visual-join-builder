let api: ReturnType<typeof acquireVsCodeApi> | undefined;

export function getVSCodeApi(): ReturnType<typeof acquireVsCodeApi> {
  if (!api) {
    api = acquireVsCodeApi();
  }

  return api;
}

export function persistState<T>(state: T): void {
  getVSCodeApi().setState(state);
}

export function getPersistedState<T>(): T | undefined {
  return getVSCodeApi().getState() as T | undefined;
}
