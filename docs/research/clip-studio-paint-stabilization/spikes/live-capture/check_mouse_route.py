"""Host-only mouse recorder checks; no CSP attachment or target operations."""

import io
import json
import struct

import capture_mouse_route as mouse
from capture_live_contract import CaptureError


def packet(kind, timestamp=1000):
    raw = bytearray(0x90)
    struct.pack_into('<i', raw, 0, kind)
    struct.pack_into('<dd', raw, 8, 12.25, -4.5)
    struct.pack_into('<i', raw, 0x18, 1)
    struct.pack_into('<q', raw, 0x50, timestamp)
    struct.pack_into('<d', raw, 0x58, 1.0)
    return bytes(raw)


class Thread:
    def __init__(self, tid=7):
        self.tid = tid

    def GetThreadID(self):
        return self.tid

    def GetFrameAtIndex(self, index):
        return object()


class HostMouse(mouse.MouseCapture):
    def __init__(self, max_events=128):
        super().__init__(None, 1, io.StringIO(), 30, max_events)
        self.registers = {'x0': 0x1000, 'x1': 0x2000, 'x8': 0x102222222, 'sp': 0x3000}
        self.raw_packet = packet(4)

    def reg(self, frame, name):
        return self.registers[name]

    def memory(self, address, size):
        assert address == 0x2000 and size <= len(self.raw_packet), 'Packet overread'
        return self.raw_packet[:size]

    def callback_address(self, address):
        return {'load_address': hex(address), 'file_address': '0x102111111',
                'module_path': '/example/research'}

    def arm_return(self):
        self.return_breakpoint_id = 44

    def send(self, label, kind, timestamp=1000, tid=7):
        self.raw_packet = packet(kind, timestamp)
        self.dispatch(Thread(tid), label)


def rejects(call, expected):
    try:
        call()
    except CaptureError as error:
        assert expected in str(error), (expected, str(error))
    else:
        raise AssertionError('Expected rejection: ' + expected)


def run_checks():
    test = HostMouse()
    test.send('down', 4)
    test.send('drag', 1, 1000)
    test.send('drag', 1, 1001)
    test.send('up', 6, 1002)
    assert not test.capture_complete and not test.up_return_observed
    test.returned(Thread())
    assert test.capture_complete and test.up_return_observed
    assert test.event_count == 4 and test.drag_count == 2
    rows = [json.loads(row) for row in test.output.getvalue().splitlines()]
    events = [row for row in rows if row['kind'] == 'mouse_dispatch']
    assert [row['label'] for row in events] == ['down', 'drag', 'drag', 'up']
    first = events[0]
    assert first['packet']['bytes_le'] == packet(4).hex()
    assert first['packet']['size'] == 144
    assert first['packet']['event_kind_i32'] == 4
    assert first['packet']['x']['value'] == 12.25
    assert first['packet']['y']['value'] == -4.5
    assert first['packet']['button_bits_i32'] == 1
    assert first['packet']['timestamp_ms_i64'] == 1000
    assert first['packet']['pressure']['value'] == 1.0
    assert first['callback']['file_address'] == '0x102111111'
    assert rows[-1]['kind'] == 'mouse_up_return'
    print('PASS: decoded packet, ordered mouse sequence, equal timestamps, and required up callback return')

    click = HostMouse()
    click.send('down', 5)
    click.send('up', 6, 1001)
    rejects(lambda: click.returned(Thread()), 'click_without_drag')
    assert click.up_return_observed and not click.capture_complete
    rejects(lambda: HostMouse().send('drag', 1), 'expected_mouse_down')
    rejects(lambda: HostMouse().send('up', 6), 'expected_mouse_down')
    for problem, expected in (
        (lambda t: t.send('drag', 1, 999), 'timestamp_regressed'),
        (lambda t: t.send('drag', 1, tid=8), 'mouse_thread_changed'),
        (lambda t: t.send('down', 4), 'unexpected_mouse_down'),
        (lambda t: t.send('drag', 6), 'mouse_packet_kind_mismatch'),
    ):
        invalid = HostMouse()
        invalid.send('down', 4)
        rejects(lambda: problem(invalid), expected)
        assert not invalid.capture_complete
    invalid = HostMouse()
    invalid.send('down', 4)
    invalid.registers['x0'] = 0x9000
    rejects(lambda: invalid.send('drag', 1), 'mouse_window_changed')
    print('PASS: click-only, missing down, timestamp regression, identity and packet-kind rejection')

    for wrong_thread, wrong_sp in ((True, False), (False, True)):
        invalid = HostMouse()
        invalid.send('down', 4)
        invalid.send('drag', 1)
        invalid.send('up', 6)
        if wrong_sp:
            invalid.registers['sp'] += 16
        rejects(lambda: invalid.returned(Thread(8 if wrong_thread else 7)),
                'mouse_up_return_thread_mismatch' if wrong_thread else 'mouse_up_return_stack_mismatch')
        assert not invalid.up_return_observed and not invalid.capture_complete
    limited = HostMouse(max_events=2)
    limited.send('down', 4)
    limited.send('drag', 1)
    rejects(lambda: limited.send('up', 6), 'mouse_event_limit_reached')
    assert not limited.capture_complete
    print('PASS: final-return thread/SP pairing and event limit cannot certify incomplete capture')
    print('No target behavior or native digitizer filter was tested.')


if __name__ == '__main__':
    run_checks()
