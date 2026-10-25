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
  settings: 'Change your crest, crayon, interests and sounds here. Psst — you can drag me to any corner.',
};

export function screenFromPath(pathname: string): WizardScreen {
  const seg = pathname.split('/').filter(Boolean).pop() ?? 'coloring';
  return (['friends', 'missions', 'coloring', 'storybook', 'settings'] as const).includes(seg as WizardScreen)
    ? (seg as WizardScreen)
    : 'coloring';
}
