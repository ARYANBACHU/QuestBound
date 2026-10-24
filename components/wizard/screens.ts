// Owner: AB. Per-screen copy for Muse: suggestion chips, greetings and one-line coach marks.
export type WizardScreen = 'friends' | 'missions' | 'coloring' | 'storybook' | 'settings';

export const SCREEN_SUGGESTIONS: Record<WizardScreen, string[]> = {
  missions: ['What should we do next?', 'Which missions need friends?', 'Explain mission types'],
  coloring: ['Explain this page', 'How do I color a region?', 'What should we do next?'],
  friends: ['How do I invite friends?', 'Plan our next meetup', 'Who should team up?'],
  storybook: ["What's a sequel?", 'Play the montage', 'How do pages turn?'],
  settings: ['How do I invite friends?', 'Explain mission types', 'What should we do next?'],
};

export const SCREEN_GREETINGS: Record<WizardScreen, string> = {
  missions: 'Your quest board, traveler. Ask me what to tackle next — I know who is free.',
  coloring: 'This is your page. Every mission you finish paints a piece of it. Ask me anything.',
  friends: 'Your fellowship gathers here. Want help planning the next meetup?',
  storybook: 'Every finished page lives here. Ask me about sequels or the montage.',
  settings: 'Fiddling with the spellbook? Ask me anything about how the tale works.',
};

export const COACH_MARKS: Record<WizardScreen, string> = {
  coloring: 'This is your coloring page. Tap a region to see its mission — finish it and it fills with your crayon.',
  missions: 'Every region is a mission. Big ones need the whole fellowship, medium ones need a pair.',
  friends: 'Your fellowship and its chat. My proclamations announce every region you color.',
  storybook: 'Finished chapters are bound here. Finish the book and I will write you a sequel.',
  settings: 'Change your crest, crayon and interests here. Long-press me for demo tools.',
};

export function screenFromPath(pathname: string): WizardScreen {
  const seg = pathname.split('/').filter(Boolean).pop() ?? 'coloring';
  return (['friends', 'missions', 'coloring', 'storybook', 'settings'] as const).includes(seg as WizardScreen)
    ? (seg as WizardScreen)
    : 'coloring';
}
