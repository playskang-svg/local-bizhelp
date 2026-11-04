import type { CollectionConfig } from 'payload'

import { signedIn } from './access'

export const Businesses: CollectionConfig = {
  slug: 'businesses',
  labels: { singular: '업체', plural: '업체' },
  admin: { useAsTitle: 'name', group: '업체', defaultColumns: ['name', 'trade', 'dong', 'source'] },
  access: { read: signedIn, create: signedIn, update: signedIn, delete: signedIn },
  fields: [
    { name: 'name', label: '업체명', type: 'text', required: true },
    { name: 'trade', label: '업종', type: 'select', options: ['move', 'clean', 'install', 'repair'] , required: true },
    { name: 'dong', label: '동', type: 'relationship', relationTo: 'dongs' },
    { name: 'address', label: '주소', type: 'text' },
    { name: 'source', label: '출처', type: 'select', options: ['sdsc', 'self'] },
    { name: 'sdscId', label: 'SDSC ID', type: 'text', index: true },
    { name: 'claimed', label: '인수 완료', type: 'checkbox', defaultValue: false },
  ],
}
