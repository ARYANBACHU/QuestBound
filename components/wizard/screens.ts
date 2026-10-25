// Owner: AB. Per-screen copy for Sage: suggestion chips and one-line coach marks.
export type WizardScreen = 'friends' | 'missions' | 'coloring' | 'storybook' | 'settings';

export const SCREEN_SUGGESTIONS: Record<WizardScreen, string[]> = {
  missions: ['What should we do next?', 'Which missions need friends?', 'Explain mission types'],
  coloring: ['Explain this page', 'How do I color a region?', 'What should we do next?'],
  friends: ['How do I invite friends?', 'Plan our next meetup', 'Who should team up?'],
  storybook: ["What's a sequel?", 'Play the montage', 'How do pages turn?'],
  settings: ['How do I invite friends?', 'Explain mission types', 'What should we do next?'],
};

export const COACH_MARKS: Record<WizardScreen, string> = {
  coloring: 'This is your coloring page. Tap a region to see its mission — finish it and it fills with your crayon.',
  missions: 'Every region is a mission. Big ones need the whole fellowship, medium ones need a pair.',
  friends: 'Your fellowship and its chat. My proclamations announce every region you color.',
  storybook: 'Finished chapters are bound here. Finish the book and I will write you a sequel.',
  settings: 'Change your crest, crayon, interests and sounds here. Psst — you can drag me anywhere.',
};

/** U5 spotlight tours: one short line per step; `target` = a <CoachTarget id> (missing → no spotlight, just Sage). */
export interface CoachStep { target?: string; text: string }
export const COACH_TOURS: Record<WizardScreen, CoachStep[]> = {
  coloring: [
    { text: COACH_MARKS.coloring },
    { target: 'sage.fab', text: 'And I’m Sage. Tap me for help any time — drag me wherever I’m not in the way.' },
  ],
  missions: [
    { target: 'missions.chapters', text: 'Each numeral is a chapter. Color every region to unlock the next.' },
    { target: 'missions.firstCard', text: 'Every region is a mission. Big ones need the whole fellowship, medium ones a pair.' },
    { target: 'missions.leaders', text: 'Points for every region you color. Group missions pay the most.' },
  ],
  friends: [
    { target: 'tab.friends', text: COACH_MARKS.friends },
  ],
  storybook: [
    { target: 'tab.storybook', text: COACH_MARKS.storybook },
  ],
  settings: [
    { target: 'settings.hero', text: 'Your crest, crayon and interests live here. I use them to write your missions.' },
    { target: 'music.header', text: 'The bards’ music, up top on every screen.' },
  ],
};

export function screenFromPath(pathname: string): WizardScreen {
  const seg = pathname.split('/').filter(Boolean).pop() ?? 'coloring';
  return (['friends', 'missions', 'coloring', 'storybook', 'settings'] as const).includes(seg as WizardScreen)
    ? (seg as WizardScreen)
    : 'coloring';
}
