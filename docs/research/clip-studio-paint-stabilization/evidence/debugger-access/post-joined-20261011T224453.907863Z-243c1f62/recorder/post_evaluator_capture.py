"""Bounded, read-only CSP endpoint evaluator snapshot; no LLDB dependency.

The caller must supply reads from a stopped process, its verified image-address
translation, and a deadline check. This module neither attaches nor writes.
Layout provenance: post-evaluator/evidence/{1024c11e4,1024c0dc0,1024af65c,
1024a925c,1024c497c}.asm. Constructor allocation is 0x740 bytes; response objects
at +0x88/+0x630 are embedded, while each curve slot stores a nullable pointer.
"""
import math
import struct


SCHEMA = 'csp-post-evaluator/v1'
EVALUATOR_VTABLE = 0x104a495f0
RESPONSE_VTABLE = 0x104a493b0
CURVE_VTABLE = 0x104a491a0
PREFIX_SIZE = 0x630
RESPONSE_SIZE = 0x58
MAX_CONTROLS = 16


def require(condition, message):
    if not condition:
        raise ValueError(message)


def pointer(address):
    require(type(address) is int and 0 <= address < 2**64 and address % 8 == 0,
            'Expected aligned unsigned 64-bit object address')
    return address


def snapshot_evaluator(address, read_memory, load_address, budget):
    """Return raw evidence, explicit null states, and errors; never supply defaults.

    A missing historical snapshot is not represented by this function. Address
    zero means an observed null pointer. Invalid/unread nonzero addresses remain
    present and incomplete. Bounds: two embedded responses and at most six curves
    with 16 controls each. Each read is preceded by the caller's deadline check.
    """
    result = dict(schema=SCHEMA, address=hex(address), imageBase=hex(load_address(0x100000000)),
                  state='null' if address == 0 else 'present', prefixHex='',
                  main=None, secondary=None, complete=False, errors=[])

    def read_into(record, field, at, size):
        require(0 <= at < 2**64 and 0 < size and at + size <= 2**64,
                'Memory read range exceeds unsigned 64-bit address space')
        budget()
        raw = read_memory(at, size)
        require(isinstance(raw, (bytes, bytearray)), 'Memory reader did not return bytes')
        record[field] = bytes(raw).hex()
        require(len(raw) == size, f'Short memory read at {at:#x}: {len(raw)} != {size}')
        return raw

    def fail(record, error):
        record['errors'].append(f'{type(error).__name__}: {error}')

    def curve_snapshot(at):
        curve = dict(address=hex(at), state='null' if at == 0 else 'present',
                     headerHex='', countHex='', controlsHex='', complete=False, errors=[])
        try:
            pointer(at)
            if at:
                raw = read_into(curve, 'headerHex', at, 8)
                require(struct.unpack('<Q', raw)[0] == load_address(CURVE_VTABLE),
                        'Unsupported curve vtable; allocation size unknown')
                read_into(curve, 'headerHex', at, 0x68)
                raw = read_into(curve, 'countHex', at + 0x168, 4)
                count = struct.unpack('<i', raw)[0]
                require(0 <= count <= MAX_CONTROLS, f'Unsupported curve count: {count}')
                controls = read_into(curve, 'controlsHex', at + 0x68, count * 16) if count else b''
                points = list(struct.iter_unpack('<dd', controls))
                require(all(math.isfinite(x) and math.isfinite(y) for x, y in points),
                        'Nonfinite curve control')
                require(all(points[i - 1][0] <= points[i][0] for i in range(1, count)),
                        'Curve controls are not in nondecreasing x order')
            curve['complete'] = True
        except Exception as error:
            fail(curve, error)
        return curve

    def response_snapshot(at, raw=None):
        response = dict(address=hex(at), bytesHex='', curves=None, complete=False, errors=[])
        try:
            if raw is None:
                raw = read_into(response, 'bytesHex', at, RESPONSE_SIZE)
            else:
                response['bytesHex'] = bytes(raw).hex()
            require(len(raw) == RESPONSE_SIZE, 'Incomplete embedded response')
            require(struct.unpack_from('<Q', raw)[0] == load_address(RESPONSE_VTABLE),
                    'Unsupported response vtable')
            require(all(math.isfinite(value) for value in struct.unpack_from('<6f', raw, 0xc)),
                    'Nonfinite response float')
            # All unsigned flags are preserved. The recovered evaluator compares exactly 1
            # and tests known bits; unknown bits are not silently cleared or guessed invalid.
            response['curves'] = [curve_snapshot(struct.unpack_from('<Q', raw, offset)[0])
                                  for offset in (0x28, 0x38, 0x48)]
            require(all(curve['complete'] for curve in response['curves']),
                    'Incomplete response curve snapshot')
            response['complete'] = True
        except Exception as error:
            fail(response, error)
        return response

    try:
        pointer(address)
        if address:
            raw = read_into(result, 'prefixHex', address, 8)
            require(struct.unpack('<Q', raw)[0] == load_address(EVALUATOR_VTABLE),
                    'Unsupported evaluator vtable; allocation size unknown')
            prefix = read_into(result, 'prefixHex', address, PREFIX_SIZE)
            result['main'] = response_snapshot(address + 0x88, prefix[0x88:0xe0])
            result['secondary'] = response_snapshot(address + 0x630)
            require(math.isfinite(struct.unpack_from('<d', prefix, 0x628)[0]),
                    'Nonfinite secondary base')
            require(result['main']['complete'] and result['secondary']['complete'],
                    'Incomplete evaluator response snapshot')
        result['complete'] = True
    except Exception as error:
        fail(result, error)
    return result
