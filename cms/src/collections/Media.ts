import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: '미디어', plural: '미디어' },
  admin: { group: '콘텐츠' },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: '대체 텍스트',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'public, max-age=604800')
      return headers
    },
  },
}
