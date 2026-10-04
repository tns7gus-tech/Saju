"""Extract shared ChatGPT conversations as review material, never approved answers."""
import argparse
import json
import pathlib
import plistlib
import re
import subprocess


def extract(html):
    match = re.search(r'streamController.enqueue\(("(?:[^"\\]|\\.)*")\)', html)
    if not match:
        raise ValueError('공유 대화 데이터가 없습니다. 링크 접근 상태를 확인하세요.')
    table = json.loads(json.loads(match.group(1)))

    def resolve(index, trail=()):
        if index < 0:
            return None
        if index in trail:
            raise ValueError('순환 데이터 참조')
        value = table[index]
        trail = (*trail, index)
        if isinstance(value, dict):
            return {table[int(k[1:])]: resolve(v, trail) for k, v in value.items()}
        if isinstance(value, list):
            return [resolve(v, trail) for v in value]
        return value

    conversations = [x for x in table if isinstance(x, dict)
                     and any(table[int(k[1:])] == 'linear_conversation' for k in x)]
    if len(conversations) != 1:
        raise ValueError('공유 대화 구조를 확인할 수 없습니다.')
    conversation = conversations[0]
    key = next(k for k in conversation if table[int(k[1:])] == 'linear_conversation')
    nodes = resolve(conversation[key])
    # Shared pages may list nodes newest-first; reconstruct the parent chain.
    by_id = {node['id']: node for node in nodes}
    ordered, seen = [], set()

    def visit(node):
        if node['id'] in seen:
            return
        seen.add(node['id'])
        if node.get('parent') in by_id:
            visit(by_id[node['parent']])
        ordered.append(node)

    for node in nodes:
        visit(node)
    messages = []
    for node in ordered:
        message = node.get('message')
        if not message:
            continue
        role = message['author']['role']
        if role not in ('user', 'assistant'):
            continue
        content = message.get('content', {})
        parts = content.get('parts', [])
        if content.get('content_type') not in ('text', 'multimodal_text') or not parts:
            continue
        messages.append({'id': message['id'], 'role': role,
                         'text': '\n'.join(p for p in parts if isinstance(p, str)),
                         'non_text_parts': [p for p in parts if not isinstance(p, str)],
                         'content_type': content.get('content_type')})
    if not messages:
        raise ValueError('사용자/답변 본문이 없습니다.')
    return messages


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', default='data1')
    parser.add_argument('--output', default='data/training/review')
    args = parser.parse_args()
    out = pathlib.Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    summaries = []
    candidates = []
    for path in sorted(pathlib.Path(args.source).glob('*.textClipping')):
        url = plistlib.loads(path.read_bytes())['UTI-Data']['public.utf8-plain-text'].strip()
        if not re.fullmatch(r'https://chatgpt\.com/share/[a-zA-Z0-9-]+', url):
            raise ValueError(f'{path.name}: 지원하지 않는 링크')
        html_path = out / f'{path.stem}.html'
        if not html_path.exists():
            subprocess.run(['curl', '-sS', '--fail', '--location', '--max-time', '60',
                            url, '-o', str(html_path)], check=True)
        messages = extract(html_path.read_text())
        result = {'source': url, 'status': 'needs_review', 'messages': messages}
        history = []
        for message in messages:
            history.append(message)
            if message['role'] == 'assistant' and message['text']:
                candidates.append({'source': url, 'answer_id': message['id'],
                                   'status': 'needs_review',
                                   'blockers': ['source_images_not_downloaded',
                                                'expert_answer_not_verified',
                                                'production_input_and_output_format_not_aligned'],
                                   'messages': [{'role': m['role'], 'content': m['text']}
                                                for m in history],
                                   'image_references': [part for m in history
                                                        for part in m['non_text_parts']]})
        (out / f'{path.stem}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
        (out / f'{path.stem}.md').write_text('\n\n'.join(
            f"## {m['role']}\n\n{m['text']}\n\n[비텍스트 자료 {len(m['non_text_parts'])}개]"
            for m in messages))
        summaries.append({'file': path.name, 'messages': len(messages),
                          'assistant_answers': sum(m['role'] == 'assistant' and bool(m['text']) for m in messages),
                          'non_text_parts': sum(len(m['non_text_parts']) for m in messages),
                          'text_characters': sum(len(m['text']) for m in messages),
                          'status': 'needs_review'})
    if not summaries:
        raise ValueError('textClipping 파일이 없습니다.')
    (out / 'inventory.json').write_text(json.dumps(summaries, ensure_ascii=False, indent=2))
    (out / 'candidates.review.jsonl').write_text(''.join(
        json.dumps(candidate, ensure_ascii=False) + '\n' for candidate in candidates))
    print(json.dumps(summaries, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
