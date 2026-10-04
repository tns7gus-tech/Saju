"""Configure user-selected summary/detail sources without changing the serving model."""
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/training'


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    # Actual birth data stays in an ignored local file, never in source code.
    sources = json.loads((OUTPUT / 'source-inputs.json').read_text())
    manifest = []
    for number, mode, date, time, gender, pillars, elements in sources:
        folder = ROOT / f'data{number}'
        link = folder / f'data_link{number}.textClipping'
        images = sorted(folder.glob('*.png'))
        if not link.exists() or len(images) != 2:
            raise ValueError(f'data{number}: 공유 링크 1개와 PNG 2개가 필요합니다.')
        conversation = json.loads((OUTPUT / f'review/data_link{number}.json').read_text())
        answers = [m for m in conversation['messages']
                   if m['role'] == 'assistant' and m['text'].strip()]
        # The latest full DEEP answer uses both supplied screenshots. Earlier
        # drafts and follow-up tables are not independent chart examples.
        if number == 5:
            selected = next(m for m in reversed(answers)
                            if 'DEEP' in m['text'][:500] and '# 1단계.' in m['text'])
        else:
            selected = answers[-1]
        reference = selected['text']
        if number == 4:
            reference = reference.split('# 12. 현실 조언 및 총평', 1)[1]
            reference = reference.split('If you want, I can:', 1)[0].strip()
        mode_dir = OUTPUT / mode
        mode_dir.mkdir(parents=True, exist_ok=True)
        (mode_dir / f'data{number}.reference.md').write_text(reference)
        record = {
            'id': f'data{number}', 'group': f'data{number}', 'mode': mode,
            'ui_trigger': 'first_click' if mode == 'summary' else 'detail_click',
            'source_folder': str(folder.relative_to(ROOT)),
            'source_url': conversation['source'], 'selected_answer_id': selected['id'],
            'selection': 'conclusion_section_requires_summary_rewrite' if number == 4
                         else 'latest_summary' if number in (2, 3)
                         else 'latest_full_deep' if number == 5 else 'ten_line_summary',
            'images': [{'path': str(p.relative_to(ROOT)),
                        'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in images],
            'image_transcription': {
                'birth': {'calendar': 'solar', 'date': date, 'time': time, 'gender': gender},
                'pillars_year_month_day_hour': pillars,
                'visible_elements_wood_fire_earth_metal_water': elements,
                'note': '원본 이미지에서 확인한 값. 이름은 학습 입력에서 제외. 오행 개수는 강약 확정값이 아님.'},
            'reference_file': str((mode_dir / f'data{number}.reference.md').relative_to(ROOT)),
            'status': 'source_assigned',
            'remaining': ['normalize_to_runtime_request_and_JSON_response',
                          'check_calculation_and_interpretation',
                          'token_length_check_before_training'],
        }
        write_json(mode_dir / f'data{number}.source.json', record)
        manifest.append(record)
    calculation = subprocess.run(
        ['node', '--input-type=module', '-e',
         'import {calculate} from "./backend/engine.js"; '
         'let s=""; for await(const c of process.stdin)s+=c; '
         'console.log(JSON.stringify(JSON.parse(s).map(r=>'
         '({id:r.id,pillars:calculate(r.image_transcription.birth).pillars.map(p=>p.hanja)}))));'],
        input=json.dumps(manifest), text=True, capture_output=True, check=True, cwd=ROOT)
    calculated = {r['id']: r['pillars'] for r in json.loads(calculation.stdout)}
    for record in manifest:
        actual = calculated[record['id']]
        expected = record['image_transcription']['pillars_year_month_day_hour']
        record['calculation_check'] = {'engine_pillars': actual,
                                       'matches_screenshot': actual == expected}
        if actual != expected:
            record['status'] = 'blocked_calculation_mismatch'
            record['remaining'].insert(0, 'resolve_birth_time_boundary_difference')
        write_json(OUTPUT / record['mode'] / f"{record['id']}.source.json", record)
    write_json(OUTPUT / 'source-manifest.json', manifest)
    for mode in ('summary', 'detail'):
        records = [r for r in manifest if r['mode'] == mode]
        # References contain raw style samples; keep them separate from train.jsonl
        # until they match the actual serving request and output contract.
        (OUTPUT / mode / 'references.jsonl').write_text(''.join(
            json.dumps(r, ensure_ascii=False) + '\n' for r in records))
    print('summary: data1~data4 (4개 명식), detail: data5 (1개 명식) 설정 완료')
    print('계산 불일치:', ', '.join(r['id'] for r in manifest
                                  if not r['calculation_check']['matches_screenshot']) or '없음')


if __name__ == '__main__':
    main()
