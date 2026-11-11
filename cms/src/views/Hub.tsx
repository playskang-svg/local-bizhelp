import React from 'react'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { getCloudflareContext } from '@opennextjs/cloudflare'

import groups from '../../../shared/keyword-groups.json'
import regionsFile from '../../../shared/cheonan-regions.json'
import ba from '../../../shared/ba-photos.json'
import siteImages from '../../../shared/site-images.json'

// 관리 허브 — admin.suriwiki.com 한 화면 구성(상단 통계 → 키워드 그룹 카드 → 최근 기록)을 Payload 첫 화면으로 옮겼다.
// 키워드·지역·사진의 원본은 저장소 shared/ 파일이다(scripts/import-suriwiki.mjs, build-regions.mjs).
const ORIGIN = 'https://local.bizhelp.kr'
const DAY = 24 * 3600e3
type Lead = { created_at: string; group_slug: string; region_slug: string; work: string; symptom: string; area: string; src: string }

const regions = (regionsFile as any).regions as { slug: string; name: string; level: string; gu: string | null }[]
const regionName = Object.fromEntries(regions.map((r) => [r.slug, r.name]))
const LEVELS: [string, string][] = [['si', '시'], ['gu', '구'], ['eup', '읍'], ['myeon', '면'], ['dong', '행정동'], ['bdong', '법정동'], ['place', '생활권']]
const parse = (s: string) => { try { return JSON.parse(s) as string[] } catch { return [] } }

async function loadLeads(): Promise<Lead[] | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const d1 = (env as any).D1
    const since = new Date(Date.now() - 56 * DAY).toISOString()
    return (await d1.prepare('SELECT created_at, group_slug, region_slug, work, symptom, area, src FROM kw_leads WHERE created_at >= ? ORDER BY created_at DESC LIMIT 2000').bind(since).all()).results as Lead[]
  } catch {
    return null // 테이블이 아직 없거나(마이그레이션 전) 로컬 개발 환경
  }
}

const CSS = `.lb-hub{padding:var(--base);max-width:1200px}
.lb-hub h1{margin:0 0 4px}.lb-hub .sub{color:var(--theme-elevation-500);margin:0 0 20px}
.lb-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:28px}
.lb-stat{border:1px solid var(--theme-elevation-100);border-radius:12px;padding:14px 16px;background:var(--theme-elevation-0)}
.lb-stat b{display:block;font-size:26px;line-height:1.2}.lb-stat span{font-size:13px;color:var(--theme-elevation-500)}
.lb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.lb-card{border:1px solid var(--theme-elevation-100);border-radius:14px;overflow:hidden;background:var(--theme-elevation-0)}
.lb-card .ph{aspect-ratio:16/9;background:var(--theme-elevation-50)}.lb-card .ph img{width:100%;height:100%;object-fit:cover;display:block}
.lb-card .tx{padding:14px 16px}.lb-card h3{margin:0 0 4px;font-size:17px}.lb-card p{margin:0;font-size:13px;color:var(--theme-elevation-500)}
.lb-card .nums{display:flex;gap:12px;margin:10px 0;font-size:13px}.lb-card .nums b{font-size:15px}
.lb-card .acts{display:flex;flex-wrap:wrap;gap:6px}.lb-card .acts a{font-size:13px;padding:5px 10px;border:1px solid var(--theme-elevation-150);border-radius:99px;text-decoration:none}
.lb-card details{margin-top:10px}.lb-card textarea{width:100%;height:120px;font-size:12px}
.lb-tbl{border-collapse:collapse;width:100%;font-size:13px}.lb-tbl th,.lb-tbl td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--theme-elevation-100);vertical-align:top}
.lb-h2{margin:34px 0 12px}`

export default async function Hub({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  if (!req.user) redirect('/admin/login')
  const { payload } = req

  const leads = await loadLeads()
  const week = leads ? leads.filter((l) => Date.parse(l.created_at) >= Date.now() - 7 * DAY) : []
  const [landings, inquiries] = await Promise.all([
    payload.count({ collection: 'landings', where: { status: { equals: 'published' } }, overrideAccess: false, user: req.user }),
    payload.count({ collection: 'inquiries', overrideAccess: false, user: req.user }),
  ])
  const photoPairs = Object.values(ba as Record<string, string[]>).reduce((a, x) => a + x.length, 0)
  const pageCount = groups.length * (regions.length + 1) + regions.length

  const stats: [string, string][] = [
    ['키워드 그룹', `${groups.length}`],
    ['천안 지역', `${regions.length}`],
    ['검색 페이지', `${pageCount}`],
    ['전후 사진', `${photoPairs}쌍`],
    ['문자 상담(7일)', leads ? `${week.length}` : '—'],
    ['문자 상담(8주)', leads ? `${leads.length}` : '—'],
    ['공개 랜딩', `${landings.totalDocs}`],
    ['랜딩 문의', `${inquiries.totalDocs}`],
  ]
  const byGroup = (slug: string) => (leads || []).filter((l) => l.group_slug === slug).length
  const img = (slug: string) => {
    const files = (siteImages as Record<string, string[]>)[slug] || []
    const ids = (ba as Record<string, string[]>)[slug] || []
    return files.includes('card-1.webp') ? `${ORIGIN}/img/${slug}/card-1.webp` : ids[0] ? `${ORIGIN}/ba/${slug}/${ids[0]}-after.webp` : ''
  }
  const topRegions = Object.entries((leads || []).reduce((a: Record<string, number>, l) => ((a[l.region_slug] = (a[l.region_slug] || 0) + 1), a), {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 10)

  return (
    <div className="lb-hub">
      <style>{CSS}</style>
      <h1>로컬브릿지AI_천안 관리 허브</h1>
      <p className="sub">키워드 {groups.length}개 × 천안 지역 {regions.length}곳으로 검색 페이지가 만들어져요. <a href="/admin/metrics">8주 지표 보기 →</a></p>

      <div className="lb-stats">{stats.map(([k, v]) => <div className="lb-stat" key={k}><b>{v}</b><span>{k}</span></div>)}</div>
      {!leads && <p style={{ color: 'var(--theme-error-500)' }}>문자 상담 기록(kw_leads)을 읽지 못했어요. web 마이그레이션(`wrangler d1 migrations apply localbridge --remote`) 적용 여부를 확인해 주세요.</p>}

      <h2 className="lb-h2">키워드 그룹</h2>
      <div className="lb-grid">
        {groups.map((g: any) => {
          const urls = [`${ORIGIN}/${g.slug}`, ...regions.map((r) => `${ORIGIN}/${g.slug}/${r.slug}`)]
          return (
            <div className="lb-card" key={g.slug}>
              <div className="ph">{img(g.slug) && <img src={img(g.slug)} alt="" loading="lazy" />}</div>
              <div className="tx">
                <h3>천안 {g.keyword}</h3>
                <p>{g.subs.join(' · ')}</p>
                <div className="nums"><span><b>{regions.length + 1}</b> 페이지</span><span><b>{((ba as any)[g.slug] || []).length}</b> 사진쌍</span><span><b>{leads ? byGroup(g.slug) : '—'}</b> 문자(8주)</span></div>
                <div className="acts">
                  <a href={`${ORIGIN}/${g.slug}`} target="_blank" rel="noopener">허브 보기</a>
                  <a href={`${ORIGIN}/${g.slug}/buldang-1-dong`} target="_blank" rel="noopener">예시 지역</a>
                </div>
                <details><summary>페이지 주소 {urls.length}개 (복사용)</summary><textarea readOnly defaultValue={urls.join('\n')} /></details>
              </div>
            </div>
          )
        })}
      </div>

      <h2 className="lb-h2">지역 구성</h2>
      <p>{LEVELS.map(([lv, label]) => `${label} ${regions.filter((r) => r.level === lv).length}`).join(' · ')}</p>
      {topRegions.length > 0 && <p>문자 상담이 많은 지역(8주): {topRegions.map(([s, n]) => `${regionName[s] || s} ${n}`).join(', ')}</p>}

      <h2 className="lb-h2">최근 문자 상담</h2>
      {leads && leads.length ? (
        <table className="lb-tbl">
          <thead><tr>{['시각', '키워드', '지역', '작업', '증상', '고른 지역', '유입'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {leads.slice(0, 50).map((l, i) => (
              <tr key={i}>
                <td>{new Date(l.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                <td>{(groups as any[]).find((g) => g.slug === l.group_slug)?.keyword || l.group_slug}</td>
                <td>{regionName[l.region_slug] || l.region_slug}</td>
                <td>{parse(l.work).join(', ')}</td>
                <td>{parse(l.symptom).join(', ')}</td>
                <td>{parse(l.area).join(', ')}</td>
                <td>{l.src}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p>아직 기록이 없어요.</p>}
    </div>
  )
}
