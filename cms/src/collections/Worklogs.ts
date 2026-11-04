import type { CollectionConfig } from 'payload'

import { signedIn } from './access'

export const Worklogs: CollectionConfig = {
  slug: 'worklogs',
  labels: { singular: '작업 기록', plural: '작업 기록' },
  admin: { group: '기록', defaultColumns: ['landing', 'date', 'minutes'] },
  access: { read: signedIn, create: signedIn, update: signedIn, delete: signedIn },
  fields: [
    { name: 'landing', label: '랜딩', type: 'relationship', relationTo: 'landings', required: true, index: true },
    { name: 'minutes', label: '분', type: 'number' },
    { name: 'date', label: '날짜', type: 'text' },
    { name: 'note', label: '메모', type: 'text' },
  ],
}
