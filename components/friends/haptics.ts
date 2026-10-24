// Owner: MP. Haptics that never throw (expo-haptics is missing some calls on web / simulators).
import * as Haptics from 'expo-haptics';

function safe(fn: () => Promise<void>) {
  try {
    fn().catch(() => {});
  } catch {
    // unavailable on this platform
  }
}

export const haptic = {
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
