"""Compare held-out summary output and smoke-test the detailed adapter locally."""
import argparse
import gc
import json
import pathlib
import time
import shutil

import mlx.core as mx
from huggingface_hub import snapshot_download
from mlx_lm import load, stream_generate
from mlx_lm.sample_utils import make_sampler

ROOT = pathlib.Path(__file__).resolve().parents[1]


def check_output(text, schema):
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {'valid': False, 'reason': 'JSON parsing failed'}
    if not isinstance(data, dict) or set(data) != {'paragraphs'}:
        return {'valid': False, 'reason': 'paragraphs object required'}
    p = data['paragraphs']
    rules = schema['properties']['paragraphs']
    if not isinstance(p, list) or not rules['minItems'] <= len(p) <= rules['maxItems']:
        return {'valid': False, 'reason': 'paragraph count mismatch'}
    if any(not isinstance(s, str) or not rules['items']['minLength'] <= len(s) <= rules['items']['maxLength'] for s in p):
        return {'valid': False, 'reason': 'paragraph length mismatch'}
    if len(set(p)) != len(p):
        return {'valid': False, 'reason': 'duplicate paragraphs'}
    return {'valid': True, 'paragraphs': len(p)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=('summary', 'summary-final', 'detail', 'both'), default='both')
    args = parser.parse_args()
    model_path = snapshot_download('mlx-community/Qwen3-8B-4bit',
                                  cache_dir=str(ROOT / 'data/training/hf-cache'),
                                  local_files_only=True, token=False,
                                  allow_patterns=['*.safetensors', 'config.json', 'tokenizer*',
                                                  'chat_template*', 'special_tokens_map.json',
                                                  'added_tokens.json', 'vocab.json', 'merges.txt'])
    summary = json.loads((ROOT / 'data/training/summary/normalized/valid.jsonl').read_text().splitlines()[0])
    detail = json.loads((ROOT / 'data/training/detail/normalized/train.jsonl').read_text().splitlines()[0])
    cases = []
    if args.mode in ('summary', 'both'):
        cases.extend([('summary_base', summary, None, True),
                      ('summary_trained', summary, 'summary', True)])
    if args.mode in ('detail', 'both'):
        cases.append(('detail_trained', detail, 'detail', False))
    if args.mode == 'summary-final':
        final_path = ROOT / 'data/training/adapters/summary-final40'
        final_path.mkdir(parents=True, exist_ok=True)
        source = ROOT / 'data/training/adapters/summary'
        shutil.copyfile(source / 'adapter_config.json', final_path / 'adapter_config.json')
        shutil.copyfile(source / '0000040_adapters.safetensors', final_path / 'adapters.safetensors')
        cases.append(('summary_final40', summary, 'summary-final40', True))
    out = ROOT / 'data/training/evaluation'
    out.mkdir(parents=True, exist_ok=True)
    report = []
    for name, sample, adapter, independent in cases:
        print(f'{name}: generation started', flush=True)
        adapter_path = str(ROOT / f'data/training/adapters/{adapter}') if adapter else None
        model, tokenizer = load(model_path, adapter_path=adapter_path)
        prompt = tokenizer.apply_chat_template(sample['messages'][:-1], tokenize=False,
                                              add_generation_prompt=True, enable_thinking=False)
        start = time.monotonic()
        text = ''
        last = None
        for response in stream_generate(model, tokenizer, prompt,
                                        max_tokens=1800, sampler=make_sampler(temp=0.0)):
            text += response.text
            last = response
        schema = json.loads(sample['messages'][1]['content'])['outputSchema']
        result = {'case': name, 'independent_chart': independent,
                  'duration_seconds': round(time.monotonic()-start, 2),
                  'format_check': check_output(text, schema),
                  'finish_reason': getattr(last, 'finish_reason', None),
                  'generation_tokens': getattr(last, 'generation_tokens', None),
                  'peak_memory_gb': getattr(last, 'peak_memory', None),
                  'generated_text': text,
                  'note': 'Greedy single-sample check, no Ollama JSON grammar. Not an expert quality assessment.'}
        (out / f'{name}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
        report.append({k: v for k, v in result.items() if k != 'generated_text'})
        print(json.dumps(report[-1], ensure_ascii=False), flush=True)
        del model, tokenizer
        gc.collect()
        mx.clear_cache()
    (out / f'{args.mode}-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')


if __name__ == '__main__':
    main()
