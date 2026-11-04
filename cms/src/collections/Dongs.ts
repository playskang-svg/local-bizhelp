import type { CollectionConfig } from 'payload'

import { signedIn } from './access'

export const Dongs: CollectionConfig = {
  slug: 'dongs',
  labels: { singular: '동', plural: '동' },
  admin: { useAsTitle: 'name', group: '지역', defaultColumns: ['name', 'gu', 'slug'] },
  access: { read: signedIn, create: signedIn, update: signedIn, delete: signedIn },
  fields: [
    { name: 'slug', label: '슬러그', type: 'text', required: true, unique: true },
    { name: 'name', label: '이름', type: 'text', required: true },
    { name: 'gu', label: '구', type: 'select', options: ['dongnam', 'seobuk'] , required: true },
    { name: 'isatipsSlug', label: '이사팁스 슬러그', type: 'text' },
  ],
}
