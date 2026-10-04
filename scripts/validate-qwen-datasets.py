"""Validate actual MLX chat formatting, output constraints and token lengths."""
import argparse
import hashlib
import json
import pathlib
import types

import yaml
from huggingface_hub import snapshot_download
from transformers import AutoTokenizer
from mlx_lm.tuner.datasets import load_local_dataset

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    tokenizer_path = snapshot_download(
        'mlx-community/Qwen3-8B-4bit',
        cache_dir=str(ROOT / 'data/training/hf-cache'), token=False,
        allow_patterns=['config.json', 'tokenizer*', 'chat_template*',
                        'special_tokens_map.json', 'added_tokens.json', 'vocab.json', 'merges.txt'],
        local_files_only=args.offline)
    tokenizer = AutoTokenizer.from_pretrained(tokenizer_path, local_files_only=True)
    manifest = json.loads((ROOT / 'data/training/dataset-manifest.json').read_text())
    reports = []
    for mode in ('summary', 'detail'):
        config = yaml.safe_load((ROOT / f'training/qwen-{mode}.yaml').read_text())
        directory = ROOT / config['data']
        train, valid, _test = load_local_dataset(
            directory, tokenizer, types.SimpleNamespace(mask_prompt=True))
        for split, dataset in (('train', train), ('valid', valid)):
            metadata = [m for m in manifest['samples'] if m['mode'] == mode and m['split'] == split]
            assert len(metadata) == len(dataset), f'{mode}/{split}: manifest mismatch'
            for i in range(len(dataset)):
                sample = dataset[i]
                assert hashlib.sha256(json.dumps(sample, ensure_ascii=False,
                    separators=(',', ':')).encode()).hexdigest() == metadata[i]['sha256']
                assert [m['role'] for m in sample['messages']] == ['system', 'user', 'assistant']
                user = json.loads(sample['messages'][1]['content'])
                answer = json.loads(sample['messages'][-1]['content'])
                assert set(answer) == {'paragraphs'}
                paragraphs = answer['paragraphs']
                schema = user['outputSchema']['properties']['paragraphs']
                assert schema['minItems'] <= len(paragraphs) <= schema['maxItems']
                assert len(set(paragraphs)) == len(paragraphs)
                for paragraph in paragraphs:
                    assert schema['items']['minLength'] <= len(paragraph) <= schema['items']['maxLength']
                    assert not any(term in paragraph for term in ('캡처에서', '이미지에서', 'cite', 'outputSchema', 'paragraphs'))
                tokens, offset = dataset.process(sample)
                assert len(tokens) <= config['max_seq_length'], (
                    f"{metadata[i]['id']}: {len(tokens)} > {config['max_seq_length']}; truncation forbidden")
                assert 0 < offset < len(tokens), 'prompt masking must retain assistant tokens'
                reports.append({'id': metadata[i]['id'], 'mode': mode, 'split': split,
                                'tokens': len(tokens), 'assistant_tokens': len(tokens)-offset})
    train_groups = {m['group'] for m in manifest['samples'] if m['split'] == 'train'}
    valid_groups = {m['group'] for m in manifest['samples'] if m['split'] == 'valid'}
    assert not train_groups & valid_groups, 'chart leakage between training and validation'
    assert 'data3' not in train_groups | valid_groups
    assert len(reports) == len(manifest['samples'])
    report = {'status': 'passed', 'tokenizer': tokenizer_path, 'samples': reports,
              'max_tokens': max(r['tokens'] for r in reports),
              'independent_detail_validation': False,
              'note': '형식과 토큰 검증이며 전문가 해석 검수나 모델 품질 검증이 아님.'}
    (ROOT / 'data/training/validation-report.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k not in ('samples', 'tokenizer')}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
