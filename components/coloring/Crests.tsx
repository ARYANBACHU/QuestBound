// Owner: AD. Crest bubble + row. Since merge round 1 these wrap MP's components/friends/Crest + CrestRow.
import Crest from '@/components/friends/Crest';
import type { FellowshipMember } from '@/shared/types';
import { profileOf } from '@/lib/fellowship';

export { default as CrestRow } from '@/components/friends/CrestRow';

/** One member's crest by user id (MP's <Crest> needs crest + color; this looks them up). */
export function CrestBubble({ userId, members, size = 28 }: { userId: string; members: FellowshipMember[]; size?: number }) {
  const p = profileOf(members, userId);
  return <Crest crest={p?.crest} color={p?.color} size={size} />;
}
