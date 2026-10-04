"""Record completed training artifacts and observed evaluation results."""
import datetime
import hashlib
import json
import math
import pathlib
import re
import struct

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/training'


def adapter_info(mode):
    path = BASE / f'adapters/{mode}/adapters.safetensors'
    with path.open('rb') as stream:
        length = struct.unpack('<Q', stream.read(8))[0]
        header = json.loads(stream.read(length))
    return {'path': str(path.relative_to(ROOT)), 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'parameters': sum(math.prod(t['shape']) for name, t in header.items() if name != '__metadata__')}


summary = json.loads((BASE / 'adapters/summary/checkpoint-selection.json').read_text())
detail_logs = sorted((BASE / 'logs').glob('detail-*.log'))
detail_log = next(path for path in reversed(detail_logs) if 'Peak MLX memory:' in path.read_text())
detail_text = re.sub(r'\x1b\[[0-9;]*m', '', detail_log.read_text())
losses = [{'step': int(s), 'loss': float(loss)} for s, loss in re.findall(
    r'^\s*(\d+)\s+([0-9.]+)\s+[▼▲]', detail_text, flags=re.MULTILINE)]
if not losses or losses[-1]['step'] != 40:
    raise SystemExit('상세 40스텝 완료 로그가 없습니다.')
evaluation = json.loads((BASE / 'evaluation/both-report.json').read_text())
evaluation += json.loads((BASE / 'evaluation/summary-final-report.json').read_text())
report = {
    'status': 'pilot_training_complete',
    'recorded_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'model': 'mlx-community/Qwen3-8B-4bit',
    'revision': (BASE / 'hf-cache/models--mlx-community--Qwen3-8B-4bit/refs/main').read_text().strip(),
    'summary': {**adapter_info('summary'), 'completed_steps': 40,
                'selection': summary, 'independent_validation_charts': 1},
    'detail': {**adapter_info('detail'), 'completed_steps': 40,
               'selected_step': 40, 'train_loss_history': losses,
               'peak_mlx_memory_gb': float(re.search(r'Peak MLX memory: ([0-9.]+)', detail_text).group(1)),
               'log': str(detail_log.relative_to(ROOT)), 'independent_validation_charts': 0,
               'architecture': 'last layer MLP gate/up/down LoRA, rank 8',
               'memory_adjustment': 'Full-context masked suffix loss; output projection last 1024 tokens.'},
    'evaluation': evaluation,
    'excluded_data': ['data3: screenshot/engine hour pillar mismatch'],
    'deployed': False,
    'release_readiness': 'not_ready',
    'observed_quality_issues': [
        {'case': 'summary_trained', 'issue': 'Only one paragraph, repeated phrases; required ten paragraphs.'},
        {'case': 'summary_final40', 'issue': 'Paragraph count requirement not met.'},
        {'case': 'detail_trained', 'issue': 'JSON format passed, but content claims metal count is two; supplied count is one.'},
        {'case': 'detail_trained', 'issue': 'Calls the day stem 庚寅 rather than 庚 and treats visible counts as strength judgments.'}],
    'limits': ['Answers were rewritten from supplied references, not expert-reviewed.',
               'Summary validation uses one chart; detail generation reuses a training chart.',
               'MLX greedy JSON checks do not use Ollama structured-output grammar.',
               'Training completion and lower loss do not establish interpretation accuracy.']}
(BASE / 'training-result.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'status': report['status'], 'summary': report['summary']['path'],
                  'detail': report['detail']['path'], 'deployed': False}, ensure_ascii=False, indent=2))
