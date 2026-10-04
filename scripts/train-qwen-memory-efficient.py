"""Preserve full Qwen context while projecting only the masked answer suffix.

The default MLX trainer materializes vocabulary logits for the entire prompt.
With batch size one, prompt masking, and short answers, that projection is
unnecessary. This loss preserves all attention context and every scored token.
"""
import json
import pathlib
import sys
import types

import mlx.core as mx
import mlx.nn as nn
from mlx_lm import lora
from mlx_lm.tuner.trainer import default_loss, train

ROOT = pathlib.Path(__file__).resolve().parents[1]
TAIL = 1024


def answer_suffix_loss(model, batch, lengths):
    if model.model_type != 'qwen3' or batch.shape[0] != 1:
        raise ValueError('Qwen3, batch_size=1 only')
    inputs = batch[:, :-1]
    targets = batch[:, 1:]
    # Full sequence goes through every transformer layer. Only the independent
    # output vocabulary projection is reduced; no prompt tokens are discarded.
    hidden = model.model(inputs)
    start = max(0, targets.shape[1] - TAIL)
    hidden = hidden[:, start:]
    logits = (model.model.embed_tokens.as_linear(hidden)
              if model.args.tie_word_embeddings else model.lm_head(hidden))
    targets = targets[:, start:]
    steps = mx.arange(start + 1, inputs.shape[1] + 1)
    mask = mx.logical_and(steps >= lengths[:, 0:1], steps <= lengths[:, 1:])
    ce = nn.losses.cross_entropy(logits, targets) * mask
    ntoks = mask.sum()
    return ce.astype(mx.float32).sum() / ntoks, ntoks


def self_test():
    class ToyQwen(nn.Module):
        def __init__(self):
            super().__init__()
            self.model_type = 'qwen3'
            self.args = types.SimpleNamespace(tie_word_embeddings=False)
            self.model = nn.Embedding(64, 8)
            self.lm_head = nn.Linear(8, 64, bias=False)

        def __call__(self, inputs):
            return self.lm_head(self.model(inputs))

    mx.random.seed(42)
    model = ToyQwen()
    batch = (mx.arange(1101) % 64)[None, :]
    lengths = mx.array([[1080, 1101]])
    (full, full_count), full_grad = nn.value_and_grad(model, default_loss)(model, batch, lengths)
    (suffix, suffix_count), suffix_grad = nn.value_and_grad(model, answer_suffix_loss)(model, batch, lengths)
    from mlx.utils import tree_flatten
    differences = [mx.max(mx.abs(a-b)) for (_, a), (_, b) in
                   zip(tree_flatten(full_grad), tree_flatten(suffix_grad))]
    mx.eval(full, suffix, full_count, suffix_count, differences)
    error = max(float(d.item()) for d in differences)
    if abs(full.item()-suffix.item()) > 1e-6 or full_count.item() != suffix_count.item() or error > 1e-6:
        raise RuntimeError('Masked loss/gradient equivalence check failed')
    print(f'Loss and gradient equivalence passed (max error={error:.3g})', flush=True)


if __name__ == '__main__':
    self_test()
    if '--self-test' in sys.argv:
        raise SystemExit(0)
    report = json.loads((ROOT / 'data/training/validation-report.json').read_text())
    if report['status'] != 'passed' or any(s['assistant_tokens'] + 32 > TAIL for s in report['samples']):
        raise SystemExit('Answer suffix does not cover all scored tokens; refusing training.')
    print('Full-context training; output projection limited to last 1024 tokens.', flush=True)
    def efficient_train(*args, **kwargs):
        result = train(*args, loss=answer_suffix_loss, **kwargs)
        print(f'Peak MLX memory: {mx.get_peak_memory()/1e9:.3f} GB', flush=True)
        return result

    lora.train = efficient_train
    lora.main()
