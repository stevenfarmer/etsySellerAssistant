import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { HiddenInputError, readHiddenInput } from '../dist/src/local/hidden-input.js';

class FakeInput extends EventEmitter {
  isTTY = true;
  isRaw = false;
  rawModeChanges = [];
  resumed = false;
  paused = false;

  setRawMode(enabled) {
    this.rawModeChanges.push(enabled);
    this.isRaw = enabled;
  }

  resume() {
    this.resumed = true;
    return this;
  }

  pause() {
    this.paused = true;
    return this;
  }
}

class FakeOutput {
  isTTY = true;
  writes = [];

  write(value) {
    this.writes.push(value);
    return true;
  }
}

function assertClean(input) {
  assert.equal(input.isRaw, false);
  assert.equal(input.paused, true);
  assert.deepEqual(input.rawModeChanges, [true, false]);
  assert.equal(input.listenerCount('data'), 0);
  assert.equal(input.listenerCount('error'), 0);
  assert.equal(input.listenerCount('end'), 0);
  assert.equal(input.listenerCount('close'), 0);
}

test('reads a fabricated secret without echoing its characters', async () => {
  const input = new FakeInput();
  const output = new FakeOutput();
  const result = readHiddenInput({ input, output, prompt: 'Secret: ' });
  input.emit('data', Buffer.from('fabricated-secret\r'));

  assert.equal(await result, 'fabricated-secret');
  assert.deepEqual(output.writes, ['Secret: ', '\n']);
  assert.equal(output.writes.join('').includes('fabricated-secret'), false);
  assertClean(input);
});

test('handles backspace and UTF-8 chunks without echo', async () => {
  const input = new FakeInput();
  const output = new FakeOutput();
  const result = readHiddenInput({ input, output, prompt: 'Secret: ', maxLength: 10 });
  input.emit('data', Buffer.from('badX\u007fé'));
  input.emit('data', Buffer.from('\n'));

  assert.equal(await result, 'badé');
  assert.equal(output.writes.join(''), 'Secret: \n');
  assertClean(input);
});

test('accepts bracketed paste split across chunks without echoing its contents', async () => {
  const input = new FakeInput();
  const output = new FakeOutput();
  const result = readHiddenInput({ input, output, prompt: 'Secret: ' });
  for (const chunk of ['\u001b[2', '00~fabricated-', 'value\u001b[', '201~', '\r']) {
    input.emit('data', Buffer.from(chunk));
  }
  assert.equal(await result, 'fabricated-value');
  assert.equal(output.writes.join(''), 'Secret: \n');
  assertClean(input);
});

test('rejects multiline bracketed paste and unrecognized escape sequences', async () => {
  for (const value of ['\u001b[200~line1\nline2\u001b[201~', '\u001b[A']) {
    const input = new FakeInput();
    const output = new FakeOutput();
    const result = readHiddenInput({ input, output, prompt: 'Secret: ' });
    input.emit('data', Buffer.from(value));
    await assert.rejects(result, { name: 'HiddenInputError', code: 'invalid_input' });
    assert.equal(output.writes.join(''), 'Secret: \n');
    assertClean(input);
  }
});

test('Ctrl-C cancels and restores terminal state', async () => {
  const input = new FakeInput();
  const output = new FakeOutput();
  const result = readHiddenInput({ input, output, prompt: 'Secret: ' });
  input.emit('data', Buffer.from('fabricated\u0003'));

  await assert.rejects(result, (error) => {
    assert.ok(error instanceof HiddenInputError);
    assert.equal(error.code, 'cancelled');
    assert.equal(error.message.includes('fabricated'), false);
    return true;
  });
  assertClean(input);
});

test('rejects empty input, control characters, and overlong input', async () => {
  for (const [value, options, expected] of [
    ['\r', {}, 'empty_input'],
    ['secret\tvalue\r', {}, 'invalid_input'],
    ['four\r', { maxLength: 3 }, 'too_long'],
  ]) {
    const input = new FakeInput();
    const output = new FakeOutput();
    const result = readHiddenInput({ input, output, prompt: 'Secret: ', ...options });
    input.emit('data', Buffer.from(value));
    await assert.rejects(result, { name: 'HiddenInputError', code: expected });
    assert.equal(output.writes.join('').includes('secret'), false);
    assertClean(input);
  }
});

test('rejects non-TTY streams and invalid bounds before enabling raw mode', async () => {
  const input = new FakeInput();
  input.isTTY = false;
  const output = new FakeOutput();
  await assert.rejects(readHiddenInput({ input, output, prompt: 'Secret: ' }), {
    name: 'HiddenInputError',
    code: 'not_tty',
  });
  assert.deepEqual(input.rawModeChanges, []);

  const ttyInput = new FakeInput();
  await assert.rejects(
    readHiddenInput({ input: ttyInput, output, prompt: 'Secret: ', minLength: 4, maxLength: 3 }),
    { name: 'HiddenInputError', code: 'invalid_input' },
  );
  assert.deepEqual(ttyInput.rawModeChanges, []);
});

test('stream failure restores raw mode and exposes only a sanitized error', async () => {
  const input = new FakeInput();
  const output = new FakeOutput();
  const result = readHiddenInput({ input, output, prompt: 'Secret: ' });
  input.emit('data', Buffer.from('fabricated-secret'));
  input.emit('error', new Error('fabricated-secret terminal failure'));

  await assert.rejects(result, (error) => {
    assert.ok(error instanceof HiddenInputError);
    assert.equal(error.code, 'input_failed');
    assert.equal(error.message.includes('fabricated-secret'), false);
    return true;
  });
  assertClean(input);
});
