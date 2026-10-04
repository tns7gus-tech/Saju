"""Select the lowest held-out validation loss among saved summary checkpoints."""
import json
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
logs = sorted((ROOT / 'data/training/logs').glob('summary-*.log'))
if not logs:
    raise SystemExit('요약 학습 로그가 없습니다.')
text = re.sub(r'\x1b\[[0-9;]*m', '', logs[-1].read_text())
scores = [(int(step), float(loss)) for step, loss in re.findall(
    r'^\s*(\d+)\s+val\s+([0-9.]+)', text, flags=re.MULTILINE)]
folder = ROOT / 'data/training/adapters/summary'
saved = [(step, loss) for step, loss in scores
         if (folder / f'{step:07d}_adapters.safetensors').exists()]
if not saved:
    raise SystemExit('검증 손실이 기록된 저장 체크포인트가 없습니다.')
step, loss = min(saved, key=lambda pair: pair[1])
source = folder / f'{step:07d}_adapters.safetensors'
shutil.copyfile(source, folder / 'adapters.safetensors')
result = {'mode': 'summary', 'selected_step': step, 'validation_loss': loss,
          'validation_scores': [{'step': s, 'loss': value} for s, value in scores],
          'source': str(source.relative_to(ROOT)), 'log': str(logs[-1].relative_to(ROOT)),
          'reason': 'Lowest held-out loss among saved checkpoints; single independent chart only.'}
(folder / 'checkpoint-selection.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
