import createPlist from 'bplist-creator';
import template from './intent-template.json';

function hydrate(value) {
  if (Array.isArray(value)) return value.map(hydrate);
  if (value && typeof value === 'object') {
    if ('__uid' in value) return { UID: value.__uid };
    if ('__data' in value) return Buffer.from(value.__data, 'base64');
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, hydrate(item)]));
  }
  return value;
}

// The trusted donor's NSData contains protobuf fields. Rebuild their lengths,
// then let the plist serializer rebuild the outer object/offset tables.
function readVarint(bytes, state) {
  let value = 0n;
  for (let shift = 0n; shift < 70n && state.offset < bytes.length; shift += 7n) {
    const byte = bytes[state.offset++];
    value |= BigInt(byte & 127) << shift;
    if (byte < 128) return value;
  }
  throw new Error('Invalid intent varint.');
}
function varint(value) {
  let number = BigInt(value);
  const bytes = [];
  do {
    let byte = Number(number & 127n);
    number >>= 7n;
    if (number) byte |= 128;
    bytes.push(byte);
  } while (number);
  return Buffer.from(bytes);
}
function fields(bytes) {
  const result = [];
  const state = { offset: 0 };
  while (state.offset < bytes.length) {
    const start = state.offset;
    const tag = Number(readVarint(bytes, state));
    const wire = tag & 7;
    if (!(tag >> 3)) throw new Error('Invalid intent field.');
    let payload;
    if (wire === 2) {
      const size = Number(readVarint(bytes, state));
      if (!Number.isSafeInteger(size) || state.offset + size > bytes.length) throw new Error('Truncated intent field.');
      payload = bytes.subarray(state.offset, state.offset + size);
      state.offset += size;
    } else if (wire === 0) readVarint(bytes, state);
    else if (wire === 1 || wire === 5) state.offset += wire === 1 ? 8 : 4;
    else throw new Error('Unsupported intent field type.');
    if (state.offset > bytes.length) throw new Error('Truncated intent field.');
    result.push({ number: tag >> 3, wire, payload, original: bytes.subarray(start, state.offset) });
  }
  return result;
}
function field(list, number) {
  const matches = list.filter(item => item.number === number && item.wire === 2);
  if (matches.length !== 1) throw new Error('Unexpected intent template structure.');
  return matches[0];
}
function serialize(list) {
  return Buffer.concat(list.map(item => item.wire === 2
    ? Buffer.concat([varint((item.number << 3) | 2), varint(item.payload.length), item.payload])
    : item.original));
}
function build({ uri, title, shuffle, repeat }) {
  const archive = hydrate(template);
  const data = archive.$objects[3];
  const outer = fields(data.bytes);
  const intentField = field(outer, 2);
  const intent = fields(intentField.payload);
  const commandField = field(intent, 2);
  const command = commandField.payload.toString('utf8');
  const prefix = 'spotify:play-command:';
  if (!command.startsWith(prefix)) throw new Error('Unexpected command template.');
  const inner = JSON.parse(Buffer.from(command.slice(prefix.length), 'base64').toString('utf8'));
  inner.context.uri = uri;
  inner.context.url = 'context://' + uri;
  inner.feedback_details.uri = uri;
  inner.feedback_details.playlist_name = title;
  delete inner.feedback_details.artwork;
  delete inner.feedback_details._;
  const options = inner.play_options?.player_options_override || {};
  options.shuffling_context = shuffle;
  options.repeating_context = repeat;
  inner.play_options = { player_options_override: options };
  commandField.payload = Buffer.from(prefix + Buffer.from(JSON.stringify(inner), 'utf8').toString('base64'), 'utf8');
  field(intent, 3).payload = Buffer.from('Your ' + title, 'utf8');
  intentField.payload = serialize(intent);
  data.bytes = serialize(outer);
  return createPlist(archive).toString('base64');
}
window.SpotifyIntent = Object.freeze({ build });
