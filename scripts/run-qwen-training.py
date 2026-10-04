"""Check prepared data first; then explicitly start a separate QLoRA pilot."""
import argparse
import os
import pathlib
import subprocess
import sys
import datetime

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=('summary', 'detail'))
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    python = ROOT / 'data/training/.venv/bin/python'
    if pathlib.Path(sys.prefix).resolve() != python.parent.parent.resolve():
        raise SystemExit('프로젝트 전용 Python으로 실행하세요: data/training/.venv/bin/python scripts/run-qwen-training.py summary')
    env = dict(os.environ)
    env['HF_HUB_CACHE'] = str(ROOT / 'data/training/hf-cache')
    env['HF_HUB_DISABLE_TELEMETRY'] = '1'
    env['HF_HUB_DISABLE_XET'] = '1'
    env['HF_XET_CACHE'] = str(ROOT / 'data/training/xet-cache')
    subprocess.run([str(python), 'scripts/validate-qwen-datasets.py', '--offline'],
                   cwd=ROOT, env=env, check=True)
    if args.check_only:
        return
    print('시험 학습을 시작합니다. 기존 Ollama 모델/서비스 설정을 변경하지 않습니다.', flush=True)
    log_dir = ROOT / 'data/training/logs'
    log_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    log_path = log_dir / f'{args.mode}-{stamp}.log'
    with log_path.open('w') as log:
        command = ([str(python), 'scripts/train-qwen-memory-efficient.py']
                   if args.mode == 'detail' else [str(python), '-m', 'mlx_lm', 'lora'])
        process = subprocess.Popen(
            [*command, '--config', f'training/qwen-{args.mode}.yaml'],
            cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1)
        for line in process.stdout:
            log.write(line)
            log.flush()
            print(line, end='', flush=True)
        returncode = process.wait()
    if returncode:
        raise SystemExit(f'학습 실패 (exit {returncode}). 로그: {log_path}')
    print(f'학습 로그: {log_path}', flush=True)


if __name__ == '__main__':
    main()
