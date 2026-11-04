import * as migration_20261104_135941_initial from './20261104_135941_initial';
import * as migration_20261104_140957_collections from './20261104_140957_collections';

export const migrations = [
  {
    up: migration_20261104_135941_initial.up,
    down: migration_20261104_135941_initial.down,
    name: '20261104_135941_initial',
  },
  {
    up: migration_20261104_140957_collections.up,
    down: migration_20261104_140957_collections.down,
    name: '20261104_140957_collections'
  },
];
