import type { CollectionConfig } from 'payload'

import { signedIn } from './access'

export const Otps: CollectionConfig = {
  slug: 'otps',
  labels: { singular: '인증번호', plural: '인증번호' },
  admin: { group: '기록', defaultColumns: ['purpose', 'expiresAt', 'attempts'] },
  access: { read: signedIn, create: signedIn, update: signedIn, delete: signedIn },
  fields: [
    { name: 'phoneHash', label: '전화 해시', type: 'text', required: true, index: true },
    { name: 'codeHash', label: '코드 해시', type: 'text', required: true },
    { name: 'purpose', label: '용도', type: 'select', options: ['claim', 'relink'], required: true },
    { name: 'payload', label: '페이로드', type: 'json' },
    { name: 'expiresAt', label: '만료(ms epoch)', type: 'number', required: true },
    { name: 'attempts', label: '시도 횟수', type: 'number', defaultValue: 0 },
  ],
}
