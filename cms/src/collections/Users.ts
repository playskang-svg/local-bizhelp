import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: '관리자', plural: '관리자' },
  admin: { useAsTitle: 'email', group: '설정' },
  auth: true,
  fields: [],
}
