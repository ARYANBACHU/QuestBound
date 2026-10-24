// Owner: AB. One-time coach marks per tab (AsyncStorage `qb.coach.<tab>`). "Replay the tour" clears them.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WizardScreen } from './screens';

const TABS: WizardScreen[] = ['friends', 'missions', 'coloring', 'storybook', 'settings'];
const key = (tab: WizardScreen) => `qb.coach.${tab}`;
const listeners = new Set<() => void>();

export async function hasSeenCoach(tab: WizardScreen): Promise<boolean> {
  try { return (await AsyncStorage.getItem(key(tab))) === '1'; } catch { return true; }
}
export async function markCoachSeen(tab: WizardScreen) {
  try { await AsyncStorage.setItem(key(tab), '1'); } catch {}
}
export async function resetCoachMarks() {
  try { await AsyncStorage.multiRemove(TABS.map(key)); } catch {}
  listeners.forEach((fn) => fn());
}
export function onCoachReset(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
