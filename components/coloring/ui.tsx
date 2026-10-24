// Owner: AD. Text + button primitives for the coloring/storybook screens. Since merge round 1 these are
// AB's components/shell/T + Button (Txt keeps AD's short `v` prop name so callers stay unchanged).
import { Button } from '@/components/shell/Button';
import { T, type TProps, type TVariant } from '@/components/shell/T';

export function Txt({ v = 'body', ...rest }: Omit<TProps, 'variant'> & { v?: TVariant }) {
  return <T variant={v} {...rest} />;
}

export { Button as InkButton };
