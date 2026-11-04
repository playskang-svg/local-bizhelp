import type { CollectionConfig } from 'payload'

import { signedIn } from './access'

export const Landings: CollectionConfig = {
  slug: 'landings',
  labels: { singular: '랜딩', plural: '랜딩' },
  admin: { useAsTitle: 'slug', group: '업체', defaultColumns: ['slug', 'business', 'status', 'billing'] },
  access: { read: signedIn, create: signedIn, update: signedIn, delete: signedIn },
  fields: [
    { name: 'business', label: '업체', type: 'relationship', relationTo: 'businesses', required: true },
    { name: 'slug', label: '슬러그', type: 'text', required: true, unique: true },
    { name: 'status', label: '상태', type: 'select', options: ['draft', 'published', 'held'] , defaultValue: 'draft' },
    { name: 'bizNo', label: '사업자번호', type: 'text' },
    { name: 'bizVerifiedAt', label: '사업자 확인 시각', type: 'date' },
    { name: 'ownerPhone', label: '대표 전화', type: 'text' },
    { name: 'phoneVerifiedAt', label: '전화 인증 시각', type: 'date' },
    { name: 'content', label: '내용', type: 'json' },
    { name: 'areas', label: '출장 지역(동 슬러그 배열)', type: 'json' },
    { name: 'gameConsent', label: '게임 동의', type: 'checkbox', defaultValue: false },
    { name: 'reviewedAt', label: '검수 시각', type: 'date' },
    { name: 'editTokenHash', label: '수정 토큰 해시', type: 'text' },
    { name: 'billing', label: '결제', type: 'select', options: ['none', 'intent', 'paid', 'test'] , defaultValue: 'none' },
  ],
}
