// Owner: AB. ONE place for teammates' components. Since merge round 1 these are re-exports of the real
// MP (components/friends) and AD (components/coloring) components — same props as the old local fallbacks.
export { default as Crest } from '@/components/friends/Crest';
export { default as CrestRow } from '@/components/friends/CrestRow';
export { default as InviteSheet, InviteCard } from '@/components/friends/InviteSheet';
export { default as QrScanner, parseInviteCode } from '@/components/friends/QrScanner';
export { MissionTypeIcon, MISSION_TYPE_LABEL } from '@/components/coloring/MissionTypeIcon';
