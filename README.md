# local-bizhelp (로컬브릿지AI_천안)

- `cms/`: Payload 관리자 (Cloudflare Workers, D1 + R2). `/admin`, `/cms-api`
- `web/`: 공개 사이트 Worker (이후 작업)

로컬: `cd cms && pnpm install && pnpm payload migrate && pnpm dev`
배포: GitHub Actions `build.yml`이 만든 산출물을 `pnpm deploy:ci`로 올린다. 이 Windows PC에서는 OpenNext 빌드를 돌리지 않는다.
