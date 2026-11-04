import type { CollectionConfig } from 'payload'

import { signedIn } from './access'

export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  labels: { singular: '문의', plural: '문의' },
  admin: { group: '기록', defaultColumns: ['createdAt', 'landing', 'dong', 'valid', 'notifyResult', 'ackAt'] },
  access: { read: signedIn, create: signedIn, update: signedIn, delete: signedIn },
  defaultSort: '-createdAt',
  fields: [
    { name: 'landing', label: '랜딩', type: 'relationship', relationTo: 'landings', required: true, index: true },
    { name: 'dong', label: '동(슬러그)', type: 'text' },
    { name: 'work', label: '작업', type: 'text' },
    { name: 'wishDate', label: '희망일', type: 'text' },
    { name: 'customerPhone', label: '고객 전화', type: 'text' },
    { name: 'consent', label: '동의', type: 'checkbox', defaultValue: false },
    { name: 'src', label: '유입', type: 'text' },
    { name: 'valid', label: '유효', type: 'checkbox', defaultValue: true },
    { name: 'invalidReason', label: '무효 사유', type: 'text' },
    { name: 'notifiedAt', label: '알림 시각', type: 'date' },
    { name: 'notifyResult', label: '알림 결과', type: 'text' },
    { name: 'ackTokenHash', label: '확인 토큰 해시', type: 'text' },
    { name: 'ackAt', label: '확인 시각', type: 'date' },
    { name: 'remindedAt', label: '재알림 시각', type: 'date' },
    { name: 'outcome', label: '결과', type: 'select', options: ['none', 'contract', 'lost'] , defaultValue: 'none' },
    { name: 'outcomeNote', label: '결과 메모', type: 'text' },
  ],
}
