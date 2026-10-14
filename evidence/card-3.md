# 카드 3 — 다섯 가지 실패

공개 심사: https://honest-daily-board-krw-20261014.jwonnlee00.chatgpt.site/

공개 package ID: `aleph-t04-real-information-board-public-contract-v2`

계약 버전 `2.0.0`, fixture 버전 `1.1.0`. ZIP 파일명에 v1이 있어도 package ID는 실제 계약의 v2를 그대로 사용합니다.

## 파일 hash 대조

제공된 ZIP에서 18개 파일을 가져왔습니다. manifest 자체를 제외한 17개 파일의 SHA-256·바이트 수가 manifest와 모두 일치했습니다. 별도로 받은 README·public-contract·asset-manifest도 ZIP 내부 원본과 바이트 단위로 일치했습니다. 원본은 `assets/studio-task-assets/t04-real-information-board/`에 보존했으며 Git의 줄바꿈 변환을 끄도록 지정했습니다.

ZIP SHA-256: `ca123fc72b1b15e83d4fe3c9aab5189496eda489c2a06efe55049c0aa57ac899`

ZIP과 manifest 자체는 순환 참조 방지를 위해 manifest의 검증 목록에서 제외됩니다. ZIP 해시는 수령본의 식별값으로 기록했으며, 제공되지 않은 외부 정답 해시와 일치한다고 주장하지 않습니다.

세부 대조: [card-3-hashes.json](card-3-hashes.json).

## 정상과 다섯 실패

정상 `reset → D1-A → D1-B`: 100에서 105로 같은 record ID의 행을 갱신하고 행 수는 1개입니다. `NORMAL-D2`를 이어 재생하면 값 120, 행 2개, 변화 절대값 15 pt입니다.

각 실패는 독립적으로 `reset → D1-A → D1-B → 실패`를 실행합니다.

| Fixture | 상태 | 마지막 정상값 / 행 수 | 설명과 다음 행동 |
| --- | --- | --- | --- |
| T04-TIMEOUT | stale / timeout | 105 pt / 1 | 5000ms 지연이 1500ms 제한 초과. 잠시 뒤 재시도 |
| T04-AUTH-401 | stale / auth | 105 pt / 1 | 외부 원천 접근 거절. 원천 공개 접근 확인 후 재시도. 앱 로그인 요구 없음 |
| T04-RATE-429 | stale / rate_limit | 105 pt / 1 | 호출 제한. Retry-After 60초 확인, 호출 중단 후 재시도 |
| T04-OFFLINE | stale / offline | 105 pt / 1 | 연결 중단. 인터넷 연결 확인 후 재시도 |
| T04-SCHEMA-BREAK | stale / schema_error | 105 pt / 1 | 숫자 필드가 문자열로 변경. 응답 형식·adapter 확인 후 재시도 |

실패 후 ‘오래된 값 · 마지막 정상값’ 표시와 ‘다시 시도 · T04-RECOVER-D2’ 버튼이 보입니다. 시연에서는 패키지의 합성 가상 시계를 사용하며 외부 원천으로 실패 요청을 보내지 않습니다. 느린 응답은 합성 제한시간 1500ms를 기다린 뒤 timeout을 표시합니다.

## 복구

`D1-A → D1-B → TIMEOUT → RECOVER-D2` 실행 결과:

- 복구 전: 105 pt, stale / timeout, 일별 행 1개.
- 복구 후: 120 pt, fresh / none, 일별 행 2개, 변화 15 pt.
- `2026-08-25` 합성 신규 행은 정확히 1개.
- 재복구 시 같은 record ID를 갱신하여 행 수는 2개 유지.
- 추가로 나머지 네 실패 뒤의 복구, HTTP 403의 auth 처리, 합성 reset을 검증했습니다.

참조 adapter를 CommonJS sandbox에서 실행한 결과와 앱에서 쓰는 ESM 상태 함수가 모든 검증 단계에서 동일했습니다. 원본 adapter는 변경하지 않았고, `dist/state.mjs`는 export 방식만 ESM으로 변환했습니다. 실제 조회 화면과 합성 재생은 같은 정상 저장·실패 상태 함수를 사용하지만 서로 다른 상태 인스턴스를 사용합니다.

실행 결과 전체: [card-3-replay-results.json](card-3-replay-results.json).

## 실제 증거 경계

합성 signal은 `aleph-demo-index`, 실제 signal은 `jpy-krw-100`입니다. reset은 합성 상태만 비웁니다. 합성 날짜·105/120 pt를 실제 엔화 기록 JSON이나 브라우저 마지막 정상값에 쓰지 않습니다. 합성 재생 전후 실제 기록 파일의 바이트가 동일함을 검증했습니다. 실제 KST 날짜는 `2026-10-14` 1건이며, 합성 D1/D2는 실제 날짜 2건이나 플랫폼의 봉인 `t04_day` 영수증을 대신하지 않습니다.

## 재현

```sh
node scripts/verify-assets.mjs
node scripts/check-card-3.mjs
npm test
```

`verify-assets`는 작업 당시 Downloads에 받은 원본과도 대조합니다. 원본 파일 위치가 다른 환경에서는 manifest 파일 hash를 별도로 대조합니다. 웹에서는 ‘카드 3 / 공개 합성 시험’에서 실패를 선택·재생하고 다시 시도를 누릅니다. 합성 결과 JSON을 내려받아 상태·행 수·record ID를 볼 수 있습니다.
