// One-off: copies the needed CREATE TABLE/INDEX statements out of the Payload migration into schema.sql.
import fs from 'node:fs';
const dir = new URL('../../../cms/src/migrations/', import.meta.url);
const f = fs.readdirSync(dir).find((n) => n.endsWith('_collections.ts'));
const s = fs.readFileSync(new URL(f, dir), 'utf8');
const up = s.slice(0, s.indexOf('export async function down'));
const re = /sql`(CREATE (?:UNIQUE )?(?:TABLE|INDEX) [\s\S]*?)(?<!\\)`\)/g;
const out = [];
for (const m of up.matchAll(re)) {
  const q = m[1].replace(/\\`/g, '`').trim();
  if (/(TABLE|INDEX) `(dongs|businesses|landings|otps|call_clicks|inquiries)(_|`)/.test(q)) out.push(q);
}
fs.writeFileSync(new URL('./schema.sql', import.meta.url), `-- copied from cms/src/migrations/${f}\n${out.join('\n')}\n`);
console.log(out.length);
