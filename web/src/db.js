export const listDongs = async (env) =>
  (await env.D1.prepare('SELECT slug, name, gu FROM dongs ORDER BY gu, name').all()).results;

export const getDong = (env, slug) =>
  env.D1.prepare('SELECT slug, name, gu FROM dongs WHERE slug = ?').bind(slug).first();

// areas = JSON array of dong slugs the landing serves (not the business address dong)
export async function publishedLandingsIn(env, dongSlug, trade) {
  const sql = `SELECT l.id, l.slug, l.content, b.name, b.trade FROM landings l
    JOIN businesses b ON b.id = l.business_id
    WHERE l.status = 'published' AND EXISTS (SELECT 1 FROM json_each(l.areas) WHERE value = ?1)
    ${trade ? 'AND b.trade = ?2' : ''} ORDER BY l.id`;
  const st = env.D1.prepare(sql);
  return (await (trade ? st.bind(dongSlug, trade) : st.bind(dongSlug)).all()).results;
}
