import type { Impact, UpdateKind } from '../types'

export const KIND_LABEL: Record<UpdateKind, string> = {
  product: '产品发布',
  feature: '功能',
  model: '模型',
  channel: '端/渠道',
  ecosystem: '生态',
  pricing: '定价',
  enterprise: '企业',
  security: '安全'
}

export const IMPACT_LABEL: Record<Impact, string> = {
  high: '高',
  medium: '中',
  low: '低'
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function daysAgo(iso: string, now = new Date()): number {
  const date = new Date(iso)
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000)
}

export function inLastDays(iso: string, days: number, now = new Date()): boolean {
  return daysAgo(iso, now) <= days
}
