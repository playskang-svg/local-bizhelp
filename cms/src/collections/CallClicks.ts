import type { CollectionConfig } from 'payload'

import { signedIn } from './access'

export const CallClicks: CollectionConfig = {
  slug: 'call-clicks',
  labels: { singular: '전화 클릭', plural: '전화 클릭' },
  admin: { group: '기록', defaultColumns: ['landing', 'src', 'createdAt'] },
  access: { read: signedIn, create: signedIn, update: signedIn, delete: signedIn },
  defaultSort: '-createdAt',
  fields: [
    { name: 'landing', label: '랜딩', type: 'relationship', relationTo: 'landings', required: true, index: true },
    { name: 'src', label: '유입', type: 'text' },
  ],
}
