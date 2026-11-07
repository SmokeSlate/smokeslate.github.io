import base64, json, plistlib, sys

def varint(data, offset):
    value = 0
    shift = 0
    while offset < len(data):
        byte = data[offset]
        offset += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, offset
        shift += 7
        assert shift < 70
    raise ValueError('Truncated varint')

def fields(data):
    result = {}
    offset = 0
    while offset < len(data):
        tag, offset = varint(data, offset)
        number, wire = tag >> 3, tag & 7
        assert number > 0
        if wire == 2:
            length, offset = varint(data, offset)
            assert offset + length <= len(data)
            result[number] = data[offset:offset + length]
            offset += length
        elif wire == 0:
            _, offset = varint(data, offset)
        elif wire in (1, 5):
            offset += 8 if wire == 1 else 4
            assert offset <= len(data)
        else:
            raise ValueError('Unsupported wire type')
    assert offset == len(data)
    return result

action = json.load(sys.stdin)
archive = plistlib.loads(base64.b64decode(action['WFWorkflowActionParameters']['IntentData']['__value__']))
intent = fields(fields(archive['$objects'][3]['bytes'])[2])
command = intent[2].decode('utf8')
prefix = 'spotify:play-command:'
assert command.startswith(prefix)
payload = json.loads(base64.b64decode(command[len(prefix):]).decode('utf8'))
print(json.dumps({'title': payload['feedback_details']['playlist_name'], 'uri': payload['context']['uri'], 'displayTitle': intent[3].decode('utf8'), 'archive': archive['$archiver']}, ensure_ascii=False))
