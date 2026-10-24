// Owner: AB. Perform a WizardAction (from wizard-chat or the local Muse).
import type { useRouter } from 'expo-router';
import type { WizardAction } from '@/shared/types';

export function actionLabel(a: WizardAction, missionTitle?: string): string {
  switch (a.type) {
    case 'navigate': return { friends: 'Open Friends', missions: 'Open Missions', coloring: 'Open the page', storybook: 'Open Storybook', settings: 'Open Settings' }[a.target];
    case 'open_mission': return missionTitle ? `Open “${missionTitle}”` : 'Open mission';
    case 'summon_storyline': return 'Summon our story';
  }
}

type Router = ReturnType<typeof useRouter>;

export function runAction(router: Router, a: WizardAction) {
  switch (a.type) {
    case 'navigate': router.navigate(`/(tabs)/${a.target}`); return;
    case 'open_mission': router.push({ pathname: '/mission/[id]', params: { id: a.target } }); return;
    case 'summon_storyline': router.push({ pathname: '/onboarding', params: { step: 'summon' } }); return;
  }
}
