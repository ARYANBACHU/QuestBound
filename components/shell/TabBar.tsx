// Owner: AB. Custom coloring-book tab bar: parchment, 2px ink top border, inked icons, crayon squiggle under the active tab.
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useFellowship } from '@/lib/fellowship';
import { useSession } from '@/lib/session';
import { CRAYONS, fonts, ink, panel, radius, space } from '@/shared/theme';
import { CoachTarget } from '@/components/wizard/coachTargets';
import { useSoftKeyboard } from '@/components/friends/useSoftKeyboard';
import { T } from './T';
import { CrayonSquiggle, TabIcon, type TabName } from './TabIcons';
import { useUnreadProclamations } from './useUnreadProclamations';
import { playSfx } from './sfx';

export const TAB_BAR_HEIGHT = 64;
/** Screens pad their scroll content with this so nothing hides behind Sage's FAB. */
export const TAB_CONTENT_BOTTOM_PAD = 96;

const LABELS: Record<TabName, string> = {
  friends: 'Friends', missions: 'Missions', coloring: 'Page', storybook: 'Storybook', settings: 'Settings',
};

export function TabBar({ state, navigateToTab, emitter, insets }: BottomTabBarProps) {
  const { profile } = useSession();
  const { fellowship } = useFellowship();
  const crayon = CRAYONS[profile?.color ?? 'violet'];
  const { unread, markSeen } = useUnreadProclamations(fellowship?.id ?? null);
  const activeName = state.routes[state.index]?.name;

  useEffect(() => {
    if (activeName === 'friends') markSeen();
  }, [activeName, markSeen, unread]);

  // MP's V1 request: on Android (window resizes) and phone browsers the bar rode above the keyboard and ate ~70 px of
  // the chat. Step aside while typing. iOS native is untouched (the keyboard already covers the bar).
  const keyboardUp = useSoftKeyboard();
  if (keyboardUp && Platform.OS !== 'ios') return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {state.routes.map((route, i) => {
        const name = route.name as TabName;
        if (!(name in LABELS)) return null;
        const active = i === state.index;
        const badge = name === 'friends' && !active && unread > 0 ? unread : 0;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={badge ? `${LABELS[name]}, ${badge} new proclamations` : LABELS[name]}
            style={styles.tab}
            onPress={() => {
              const ev = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !ev.defaultPrevented) {
                Haptics.selectionAsync().catch(() => {}); playSfx('tap');
                navigateToTab(route.key);
              }
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
          >
            <CoachTarget id={`tab.${name}`}>
              <TabIcon name={name} active={active} fill={crayon} />
              {badge ? (
                <View style={styles.badge}>
                  <T style={styles.badgeText} color={ink.page}>{badge > 9 ? '9+' : String(badge)}</T>
                </View>
              ) : null}
            </CoachTarget>
            <T variant={active ? 'smallBold' : 'small'} color={active ? ink.ink : ink.muted} style={styles.label}>
              {LABELS[name]}
            </T>
            <View style={styles.squiggle}>{active ? <CrayonSquiggle color={crayon} /> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: panel.parchment, borderTopWidth: 2, borderTopColor: ink.ink, // U8: no plain white
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: TAB_BAR_HEIGHT - space.sm },
  label: { fontSize: 11, lineHeight: 14, marginTop: 2 },
  squiggle: { height: 8, marginTop: 1 },
  badge: {
    position: 'absolute', top: -4, right: -10, minWidth: 18, height: 18, borderRadius: radius.pill,
    backgroundColor: ink.gold, borderWidth: 1.5, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12 },
});
