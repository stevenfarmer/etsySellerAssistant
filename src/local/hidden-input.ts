import { StringDecoder } from 'node:string_decoder';
import type { EventEmitter } from 'node:events';

export type HiddenInputErrorCode =
  'not_tty' | 'cancelled' | 'empty_input' | 'invalid_input' | 'too_long' | 'input_failed';

export class HiddenInputError extends Error {
  readonly code: HiddenInputErrorCode;

  constructor(code: HiddenInputErrorCode) {
    super(`Hidden input failed (${code}).`);
    this.name = 'HiddenInputError';
    this.code = code;
  }
}

export interface HiddenInputStream extends EventEmitter {
  readonly isTTY?: boolean;
  readonly isRaw?: boolean;
  setRawMode?(mode: boolean): void;
  resume(): this;
  pause(): this;
}

export interface HiddenOutputStream {
  readonly isTTY?: boolean;
  write(chunk: string): boolean;
}

export interface ReadHiddenInputOptions {
  readonly input: HiddenInputStream;
  readonly output: HiddenOutputStream;
  readonly prompt: string;
  readonly minLength?: number;
  readonly maxLength?: number;
}

const DEFAULT_MIN_LENGTH = 1;
const DEFAULT_MAX_LENGTH = 4096;
const MAX_ALLOWED_LENGTH = 65_536;

function isControlCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint < 32 || (codePoint >= 127 && codePoint <= 159);
}

/** Read a secret from an interactive terminal without echoing entered characters. */
export function readHiddenInput(options: ReadHiddenInputOptions): Promise<string> {
  const minLength = options.minLength ?? DEFAULT_MIN_LENGTH;
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  if (
    !Number.isSafeInteger(minLength) ||
    !Number.isSafeInteger(maxLength) ||
    minLength < 1 ||
    maxLength < minLength ||
    maxLength > MAX_ALLOWED_LENGTH
  ) {
    return Promise.reject(new HiddenInputError('invalid_input'));
  }
  if (
    options.input.isTTY !== true ||
    options.output.isTTY !== true ||
    typeof options.input.setRawMode !== 'function'
  ) {
    return Promise.reject(new HiddenInputError('not_tty'));
  }

  return new Promise((resolve, reject) => {
    const input = options.input;
    const output = options.output;
    const originalRawMode = input.isRaw === true;
    const decoder = new StringDecoder('utf8');
    const characters: string[] = [];
    let settled = false;
    let escapeSequence = '';
    let bracketedPaste = false;

    const removeListeners = (): void => {
      input.off('data', onData);
      input.off('error', onError);
      input.off('end', onEnd);
      input.off('close', onClose);
    };

    const restoreInput = (): void => {
      removeListeners();
      try {
        input.setRawMode?.(originalRawMode);
      } catch {
        // Best effort restoration; never surface native terminal error details.
      }
      try {
        input.pause();
      } catch {
        // A closed terminal stream is already stopped.
      }
    };

    const finish = (error?: HiddenInputError): void => {
      if (settled) return;
      settled = true;
      restoreInput();
      try {
        output.write('\n');
      } catch {
        reject(new HiddenInputError('input_failed'));
        return;
      }
      if (error !== undefined) {
        reject(error);
      } else if (characters.length < minLength) {
        reject(new HiddenInputError('empty_input'));
      } else {
        resolve(characters.join(''));
      }
    };

    const onData = (chunk: string | Uint8Array): void => {
      let decoded: string;
      try {
        decoded = decoder.write(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
      } catch {
        finish(new HiddenInputError('invalid_input'));
        return;
      }

      for (const character of decoded) {
        if (character === '\u0003') {
          finish(new HiddenInputError('cancelled'));
          return;
        }
        if (escapeSequence !== '' || character === '\u001b') {
          escapeSequence += character;
          const expected = bracketedPaste ? '\u001b[201~' : '\u001b[200~';
          if (escapeSequence === expected) {
            bracketedPaste = !bracketedPaste;
            escapeSequence = '';
          } else if (!expected.startsWith(escapeSequence)) {
            finish(new HiddenInputError('invalid_input'));
            return;
          }
          continue;
        }
        if (character === '\r' || character === '\n') {
          if (bracketedPaste) {
            finish(new HiddenInputError('invalid_input'));
            return;
          }
          finish();
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          characters.pop();
          continue;
        }
        if (isControlCharacter(character)) {
          finish(new HiddenInputError('invalid_input'));
          return;
        }
        characters.push(character);
        if (characters.length > maxLength) {
          finish(new HiddenInputError('too_long'));
          return;
        }
      }
    };

    const onError = (): void => finish(new HiddenInputError('input_failed'));
    const onEnd = (): void => finish(new HiddenInputError('input_failed'));
    const onClose = (): void => finish(new HiddenInputError('input_failed'));

    try {
      output.write(options.prompt);
      input.on('data', onData);
      input.once('error', onError);
      input.once('end', onEnd);
      input.once('close', onClose);
      input.setRawMode?.(true);
      input.resume();
    } catch {
      finish(new HiddenInputError('input_failed'));
    }
  });
}
