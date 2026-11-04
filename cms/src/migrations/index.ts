import * as migration_20261104_135941_initial from './20261104_135941_initial';

export const migrations = [
  {
    up: migration_20261104_135941_initial.up,
    down: migration_20261104_135941_initial.down,
    name: '20261104_135941_initial'
  },
];
