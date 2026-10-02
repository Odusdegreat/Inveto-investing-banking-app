import { create } from "zustand";
export const usePushChanges = create<{ version: number }>(() => ({ version: 0 }));
export function notifyPushChange() {
  usePushChanges.setState((state) => ({ version: state.version + 1 }));
}
