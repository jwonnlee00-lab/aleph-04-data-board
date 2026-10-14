# 카드 2 — 비밀 없는 호출

선택한 데이터의 API 경로: `https://api.frankfurter.dev/v2/providers/ecb/rate/JPY/KRW`

이 데이터 경로는 비밀키를 요구하지 않습니다. `fetch(API, { signal, cache: 'no-store' })`로 직접 조회하며 Authorization 헤더, API 키 쿼리, 비밀 환경변수를 추가하지 않습니다. 일별 수집도 같은 공개 경로를 사용합니다.

## 클라이언트·네트워크·저장소 검색 결과

| 범위 | 확인 방법 | 결과 |
| --- | --- | --- |
| 브라우저 클라이언트 | 실제 화면 DOM의 로드 스크립트와 링크 확인, 배포된 `app.mjs`·`core.mjs` 원문 검색 | 앱 스크립트 `app.mjs`, API 경로 JPY/KRW. 비밀값 입력 필드 0개, 화면 비밀키 패턴 0건 |
| 소스 및 Git 전체 객체 | 추적 파일 전체와 `git cat-file --batch-all-objects`의 모든 blob·commit·tag 검색. `.git/config`와 HEAD reflog도 확인 | 비밀키 패턴 0건. 세부 파일·객체 수는 JSON 결과 참고 |
| 실제 배포 파일 | 엔화 버전 배포에 사용한 `today-board-jpy.tar.gz` 내부 6개 파일 검색 | 비밀키 패턴 0건 |
| 네트워크 응답 | 공개 사이트·배포 파일·원천·공유 기록·GitHub의 익명 HTTP 요청 8건. 응답 본문과 헤더 검색 | 전부 HTTP 200, 비밀키 패턴 0건. 감사 요청에 Authorization/Cookie/키를 보내지 않음 |

검색어는 API key, secret, token, password, Authorization 등의 키워드와 주요 비밀키 형식, 개인키, JWT, URL 내 인증값입니다. `README.md`의 `GITHUB_TOKEN`은 GitHub Actions가 발급하는 런타임 토큰의 이름을 설명한 것이며 원문 토큰이 아닙니다. 실제 토큰은 파일·브라우저·데이터 응답에 저장하지 않습니다. Sites 배포용 단기 인증은 도구의 메모리와 숨김 stdin으로만 전달했습니다.

기계 점검 결과: [card-2-search-results.json](card-2-search-results.json)

재현:

```sh
node scripts/audit-secrets.mjs ../today-board-jpy.tar.gz --network
```

배포 압축본은 로컬 작업 폴더에 보관합니다. 압축본이 없는 다른 환경에서는 `node scripts/audit-secrets.mjs --network`가 파일·Git·HTTP 응답 검사를 수행합니다.

## 확인 범위의 한계와 마지막 직접 확인

패턴 검색은 알려진 형태의 비밀키 탐지 결과이며 모든 임의 문자열의 비밀 여부를 증명하지는 않습니다. 도구에서 브라우저 개발자 도구의 Network HAR 캡처는 수행하지 않았습니다. 위 네트워크 결과를 브라우저 HAR 검증 완료로 취급하지 않습니다.

카드의 첫 행동을 직접 마무리하려면 브라우저에서 F12 → Network를 연 상태로 ‘실제 데이터 다시 확인’을 누른 뒤 `/rate/JPY/KRW` 요청의 URL·Request Headers·Response를 확인합니다. 요청 URL에 키가 없고, Request Headers에 `Authorization`·`X-API-Key`가 없으며, Response는 `date`·`base`·`quote`·`rate` 공개 필드만 있어야 합니다. 이 직접 확인 결과는 아직 대기 상태입니다.

T04-C11: 검사한 클라이언트·배포 파일·HTTP 응답·Git 기록에서 비밀키 원문 탐지 0건. 브라우저 DevTools 직접 확인은 별도 대기입니다. 이후 커밋이나 데이터 변경 시 다시 점검합니다.
