# Qwen 요약·상세 학습 설정

사용자가 지정한 역할:

| 입력 폴더 | 학습 역할 | 화면 |
|---|---|---|
| data1~data4 | summary | 이미지/아이콘을 처음 클릭할 때 |
| data5 | detail | 상세보기 클릭 시 |

`python3 scripts/configure-qwen-training.py`로 소스 지정 파일을 생성합니다. 결과는 Git에 포함되지 않는 `data/training/` 아래 저장됩니다. 원본 폴더와 운영 모델은 수정하지 않습니다.

실제 출생 정보 전사본은 Git에서 제외되는 `data/training/source-inputs.json`에 보관합니다. 각 행은 `[폴더번호, 모드, 양력날짜, 시각, 성별, 년월일시 간지 배열, 목화토금수 개수 배열]` 형식입니다. 원본 이미지·공유 링크·학습 정답·모델 가중치·개인 전사본은 저장소에 포함하지 않습니다. 새로 체크아웃한 환경에서는 이 로컬 자료를 별도로 준비해야 데이터 재생성과 재학습이 가능합니다.

## 선택한 답변

- data1: 10줄 요약 답변.
- data2: 마지막 40줄 요약 답변.
- data3: 마지막 30줄 요약 답변.
- data4: 별도 요약 답변이 없으므로 마지막 보고서의 ‘현실 조언 및 총평’을 요약 재작성의 참고 자료로 지정.
- data5: 두 캡처를 반영한 최신 DEEP 보고서. 이전 STANDARD/DEEP 보고서와 후속 연애 질문을 독립 명식으로 중복 학습하지 않음.

각 폴더의 PNG 2개를 원본으로 연결하고 해시를 기록합니다. 핵심 출생 정보·원국·오행 개수는 이미지에서 확인해 소스 지정 파일에 전사했습니다. 이미지 속 이름은 학습 입력에서 제외했습니다. Qwen3 8B는 텍스트 모델이므로 PNG를 그대로 학습 데이터에 넣지 않습니다.

## 설정 파일

`qwen-summary.yaml`과 `qwen-detail.yaml`은 별도 어댑터 경로를 사용합니다. 4bit Qwen3 8B, 배치 1, rank 8, 40스텝을 사용합니다. 요약은 마지막 4개 레이어를 학습합니다. 상세는 24GB 맥에서 원래 4개 레이어 학습이 Metal 메모리 부족으로 실패해, 마지막 1개 레이어의 MLP gate/up/down 어댑터만 학습하도록 조정했습니다. 상세 조정 파라미터는 약 39만 개로 요약보다 작습니다.

요약 문맥 제한은 4096, 상세는 16384토큰입니다. 상세에서는 긴 입력 전체를 보존하며, 정답 뒤쪽 1024토큰만 어휘 출력층에 투영하는 손실 함수를 사용합니다. 실제 정답은 1024토큰보다 짧고 패딩 여유까지 검사합니다. 기존 마스킹 손실 및 기울기와의 동등성 테스트를 통과했습니다. 설치 패키지는 수정하지 않았습니다. 손실과 기울기가 같은 것은 동일한 학습 레이어를 비교한 조건이며, 4개 레이어에서 1개 MLP 레이어로 줄인 모델 조정 범위는 다릅니다.

## 만들어진 학습 데이터

`references.jsonl`은 원문 소스 목록입니다. 실제 MLX 학습 입력은 `normalized/train.jsonl`에 `{"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}` 형식으로 만들었습니다. 정답은 사용자의 원문을 참고해 계산된 입력과 JSON 출력에 맞춰 Codex가 재작성했습니다. 원문 그대로의 전문가 검수 정답은 아니며 학습 효용은 아직 검증하지 않았습니다.

| 모드 | 학습 | 검증 | 내용 |
|---|---:|---:|---|
| summary | 2건: data1·data4 | 1건: data2 | 원국·일·돈·관계·기간·행동을 다루는 10문장 요약 |
| detail | 12항목: data5 | 없음 | 현재 사이트의 12개 상세 항목별 3문단 JSON |

상세 입력은 `createLocalLLM`의 실제 요청 생성 코드를 모의 호출해 system/user 메시지를 그대로 추출했으며 `planReading`의 실제 정답 검증을 통과했습니다. 운영 Ollama를 호출하지 않았습니다. 요약은 사용자가 원하는 여러 문장 프로필로 별도 작성했으며, 현재 운영 화면의 24자 한 문장 프로필과 다릅니다. 학습된 요약을 화면에 연결할 때 프롬프트·스키마·출력 길이 변경이 필요합니다. 이번 작업에서는 화면이나 운영 모델을 변경하지 않았습니다.

원국을 현재 엔진 계산과 대조하고, 입력에 없는 신살·귀인·확정 용신 및 실제 사건 주장은 정답에서 제거했습니다. 건강을 진단하거나 특정 투자·결혼·이별을 예언하지 않도록 다시 작성했습니다. 4번 총평은 10문장으로 요약했습니다. 5번은 12개 항목으로 분리해도 1개 명식뿐이므로 상세 검증 자료를 복제하지 않았습니다. 독립 명식이 더 필요합니다. 요약은 명식 단위로 data2 전체를 검증용으로 남겨 학습/검증 누출을 막았습니다.

계산 대조 결과 data1·data2·data4·data5 원국은 일치했습니다. data3은 캡처의 21:00 시주가 戊戌이나 현재 엔진은 己亥를 계산합니다. 출생시각 경계/보정 기준을 확인하기 전에는 이 사례를 학습용 정답으로 내보내지 않습니다. 원본 시각과 원국을 임의로 바꾸지 않았으며 소스 지정 파일에 `blocked_calculation_mismatch`로 기록했습니다.

데이터 재생성과 검증:

```sh
python3 scripts/configure-qwen-training.py
node scripts/build-qwen-datasets.js
data/training/.venv/bin/python scripts/validate-qwen-datasets.py --offline
```

검증 결과는 `data/training/validation-report.json`, 읽기용 정답은 `data/training/dataset-preview.md`에 있습니다. 실제 Qwen 토크나이저와 설치된 MLX-LM ChatDataset으로 15건 모두 JSON·길이·프롬프트 마스킹·명식 분리를 검증했습니다. 가장 긴 샘플은 9138토큰으로 상세 제한보다 짧으며 잘린 샘플은 없습니다. 이 검증은 해석의 전문성이나 모델 성능을 보장하지 않습니다.

## 설치 및 실행

프로젝트 전용 가상환경 `data/training/.venv`에 `mlx-lm[train]` 0.32.0과 MLX 0.32.3을 설치했습니다. 의존성 검사와 Metal GPU 기본 연산 및 학습 CLI 실행을 확인했습니다. 기본 시스템 Python 환경은 변경하지 않았습니다. 설치 버전은 `training/requirements.lock.txt`에 기록했습니다.

같은 환경 재설치:

```sh
python3 -m venv data/training/.venv
data/training/.venv/bin/python -m pip install -r training/requirements.lock.txt
```

시험 학습을 시작할 때 프로젝트 루트에서 실행합니다. 먼저 데이터 검증을 다시 실행하고 통과해야 학습을 시작합니다:

```sh
data/training/.venv/bin/python scripts/run-qwen-training.py summary
data/training/.venv/bin/python scripts/run-qwen-training.py detail
```

순서대로 실행하세요. 최초 학습에는 MLX용 Qwen3 8B 가중치 다운로드가 추가로 필요합니다. Ollama의 기존 모델 파일을 직접 학습하지 않습니다. 공개 모델 파일만 내려받으며 이 스크립트는 사용자 학습 데이터를 외부 서비스로 업로드하지 않습니다. GPU와 네트워크 접근이 제한된 샌드박스에서는 실행 권한이 필요합니다.

## 첫 시험 학습 결과

요약·상세 각각 40스텝 학습을 완료하고 어댑터와 로그를 저장했습니다. 학습용 Qwen3 8B 가중치도 프로젝트 캐시에 다운로드했습니다. 기존 Ollama 모델과 서비스 설정은 유지합니다.

- 요약 검증 손실: 시작 2.609 → 20스텝 2.186 → 40스텝 2.309. 저장 체크포인트 중 손실이 낮은 20스텝을 선택했고 40스텝도 보존했습니다.
- 상세: 마지막 한 레이어의 MLP만 학습하고, 전체 입력을 유지하는 출력 투영 최적화를 사용해 40스텝을 완료했습니다. 최대 MLX 메모리는 11.568GB였습니다.
- 요약 기본 모델에는 문장 중복이 있었고, 학습한 20·40스텝 요약 모델은 요구한 10문장 형식을 지키지 못했습니다.
- 상세의 단일 생성 검사는 JSON 3문단 형식은 통과했지만 내용에서 금 개수를 2개로 잘못 설명했습니다. 입력의 금 개수는 1개입니다. 일간과 일주의 구분 및 오행 강약 설명에도 오류가 남았습니다.

따라서 현재 결과는 **학습 완료, 운영 적용 검증 미달**입니다. 낮아진 손실만으로 사주 해석이 강화됐다고 말할 수 없습니다. 출력 검사는 MLX의 greedy 생성으로 실행했고 Ollama JSON 문법 제약을 사용하지 않았습니다. 문법 제약으로 일부 형식 오류를 줄이더라도 사실 오류까지 해결된다는 의미는 아닙니다. 추가 검수 사례와 독립 명식 평가, 생성 결과에 대한 근거 일치 검증이 필요합니다.

결과 파일:

- `data/training/training-result.json`: 모델 리비전, 어댑터 해시, 손실, 메모리, 출력 검사 및 미해결 오류.
- `data/training/TRAINING_RESULT.md`: 읽기용 결과 보고서.
- `data/training/adapters/summary/adapters.safetensors`: 선택된 요약 20스텝 어댑터.
- `data/training/adapters/detail/adapters.safetensors`: 상세 40스텝 어댑터.
- `data/training/logs/`: 학습 성공 및 메모리 부족 실패 로그.
- `data/training/evaluation/`: 기본 모델과 학습 어댑터의 실제 생성 답변.

재검사 명령:

```sh
data/training/.venv/bin/python scripts/select-qwen-checkpoint.py
data/training/.venv/bin/python scripts/check-trained-qwen.py --mode both
data/training/.venv/bin/python scripts/check-trained-qwen.py --mode summary-final
data/training/.venv/bin/python scripts/write-training-report.py
```

공식 참고: [MLX-LM 학습 문서](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md), [설정 기본값](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/lora.py), [Qwen3 8B MLX 모델](https://huggingface.co/mlx-community/Qwen3-8B-4bit).
