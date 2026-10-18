# ARGONIA: Crown of the Spire

낮에는 왕국을 세우고, 밤에는 군주가 직접 싸우는 3D 타워 디펜스 로그라이트입니다. Three.js로 전장을 그리고, 소리는 WebAudio로 실시간 합성합니다. 빌드 결과물은 브라우저에서 바로 돌아갑니다.

플레이: https://jeiel85.github.io/argonia/

## 무엇을 하는 게임인가

낮에는 금광과 풍차, 아르곤 정제소를 세워 다음 날 아침 수입을 만들고, 성벽과 포탑, 병영을 길목에 배치합니다. 준비가 끝나면 종을 울려 밤을 부르고, 군주를 직접 조작해 차원문에서 쏟아지는 적을 막습니다. 밤을 넘기면 유물 하나를 받고, 그 유물이 쌓여 세트 효과로 이어집니다.

- 영토 5곳. 영토마다 부지 배치와 환경 효과가 다르고, 마지막 밤에는 보스가 나옵니다.
- 군주 4명. 각자 패시브 하나와 액티브 스킬 3개, 돌진을 씁니다.
- 건물 10종. 3단계까지 올린 뒤 두 갈래 특화 진화 가운데 하나를 고릅니다. 진화 형태는 모두 20종입니다.
- 유물 48종. 같은 성좌 표식을 2 · 4 · 6개 모으면 세트 효과가 열립니다. 저주 유물은 대가를 치르고 큰 이득을 줍니다.
- 성소 특성 24종. 원정에서 얻은 별빛 왕관으로 영구 강화를 삽니다.
- 시련의 서약 6종과 업적 30종. 서약을 많이 걸수록 왕관 보상이 커집니다.

## 조작

| 입력 | 동작 |
| --- | --- |
| `W` `A` `S` `D` / 방향키 | 군주 이동. 카메라 방향에 맞춰 보정됩니다. |
| 왼쪽 클릭 | 건설 부지 선택, 또는 그 지점으로 이동 |
| 오른쪽 드래그 | 카메라 회전 |
| 휠 | 확대·축소 |
| `Q` `E` `R` | 액티브 스킬 |
| `Space` | 돌진 |
| `T` | 병력을 군주에게 집결 |
| `B` | 자동 건설 |
| `F` | 선택한 부지 건설·강화 |
| `Enter` | 밤 시작 |
| `V` | 카메라 시점 전환 (전술 / 추적 / 조감) |
| `M` | 소리 끄기 |
| `P` | 연대기 포스터 저장 |
| `H` | HUD 숨기기 |
| `Esc` | 사령부 열기·닫기 |

## 실행

```bash
npm install
npm run dev        # http://localhost:5179
npm test           # 데이터와 엔진 테스트
npm run simulate   # 다섯 영토 밸런스 시뮬레이션
npm run build      # dist/ 로 빌드
```

## 구조

```text
index.html                  HUD, 사령부, 유물 선택, 원정 결과 화면
src/
  main.js                   입력 처리, HUD 갱신, 화면 전환
  style.css                 흑요석·황동 테마
  data/
    heroes.js               군주 4명의 수치와 스킬
    buildings.js            건물 10종, 3단계, 특화 진화 20종
    enemies.js              적 18종과 보스 5종
    realms.js               영토 5곳의 부지 좌표와 웨이브 구성
    relics.js               유물 48종과 시너지 계산
    sanctum.js              성소 특성, 시련의 서약, 업적
  graphics/
    assetLoader.js          GLB 모델 로딩과 캐시
    sceneManager.js         렌더러, 주야간 조명, 카메라
    proceduralMeshes.js     절차적 지형과 건물 메시
    vfxManager.js           파티클, 충격파, 피해 숫자
  audio/soundEngine.js      WebAudio 신디사이저와 효과음
  sim/
    gameEngine.js           주야간 상태, 전투, 경제, 유물 처리
    saveSystem.js           저장, 업적, 원정 기록
  share/viralExporter.js    포스터 렌더링, 공유 문구, 화면 녹화
public/models/              Blender로 만든 GLB 모델
scripts/                    밸런스 시뮬레이터, 에셋 생성, 렌더 검증
tests/                      엔진 테스트, 모델 테스트
```

## 라이선스

MIT. [LICENSE](./LICENSE)를 참고하세요.
