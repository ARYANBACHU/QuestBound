// Owner: MP (Round 3 U2). The 8 pages MP drew, keyed by template id — AD's assets/pages/index.ts merges these into
// PAGE_ART (one import: `import { SET_MP } from './set-mp'` then spread into DRAWN).
import type { TemplateId } from '@/shared/templates';
import type { PageArt } from '../types';
import { troll_bridge } from './troll_bridge';
import { cloud_kingdom } from './cloud_kingdom';
import { crystal_cave } from './crystal_cave';
import { owl_library } from './owl_library';
import { rose_garden } from './rose_garden';
import { lantern_festival } from './lantern_festival';
import { swamp_hollow } from './swamp_hollow';
import { unicorn_meadow } from './unicorn_meadow';

export const SET_MP = {
  troll_bridge,
  cloud_kingdom,
  crystal_cave,
  owl_library,
  rose_garden,
  lantern_festival,
  swamp_hollow,
  unicorn_meadow,
} satisfies Partial<Record<TemplateId, PageArt>>;

export { troll_bridge, cloud_kingdom, crystal_cave, owl_library, rose_garden, lantern_festival, swamp_hollow, unicorn_meadow };
