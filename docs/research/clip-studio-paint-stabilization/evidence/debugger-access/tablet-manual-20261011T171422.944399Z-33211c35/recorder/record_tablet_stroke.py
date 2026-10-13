"""Start one bounded recording of the already-open approved CSP research copy.

Run with Python 3. This launcher never opens CSP or changes brush settings.
The recorder uses hardware breakpoints and read-only inspection; timing is altered.
"""

import argparse
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time
import uuid


ACTIVE_MARKER = 'CSP tablet capture active; waiting for one new pen stroke.'
EXECUTABLE = Path.home() / ('Applications/CSP Research/'
                          'CLIP STUDIO PAINT Research.app/Contents/MacOS/CLIP STUDIO PAINT')
ORIGINAL = Path.home() / 'Applications/CSP Research/original-arm64'
HERE = Path(__file__).resolve().parent
OUTPUT_ROOT = HERE.parents[1] / 'evidence/debugger-access'


def process_rows(text):
    rows = []
    for line in text.splitlines():
        fields = line.strip().split(None, 2)
        if len(fields) == 3 and fields[0].isdigit():
            rows.append((int(fields[0]), fields[1], fields[2]))
    return rows


def process_resumed(text, pid, executable):
    return any(number == pid and path == str(executable) and not any(c in status for c in 'TtZX')
               for number, status, path in process_rows(text))


def choose_pid(text, executable):
    matches = [pid for pid, _, path in process_rows(text) if path == str(executable)]
    if len(matches) != 1:
        raise RuntimeError(f'Expected one running research copy; found {len(matches)}. '
                           'Open the research copy first.')
    if not process_resumed(text, matches[0], executable):
        raise RuntimeError('The research process is stopped or exiting; no recording was started.')
    return matches[0]


def read_processes():
    result = subprocess.run(['/bin/ps', '-axo', 'pid=,stat=,comm='],
                            capture_output=True, text=True, timeout=5, check=True)
    return result.stdout


def monitor(process, log_path, cue, *, clock=time.monotonic, sleeper=time.sleep):
    started = clock()
    announced = False
    pending = ''
    with log_path.open(encoding='utf-8', errors='replace') as log:
        while True:
            exit_code = process.poll()
            pending += log.read()
            if exit_code is not None:
                return {'debugger_exit_code': exit_code, 'outer_timeout': False,
                        'recording_cue_emitted': announced}
            if clock() - started >= 45:
                process.kill()
                exit_code = process.wait(timeout=5)
                return {'debugger_exit_code': exit_code, 'outer_timeout': True,
                        'recording_cue_emitted': announced}
            if not announced and ACTIVE_MARKER in pending:
                cue()
                announced = True
            # The complete log remains on disk; retain only a possible split cue here.
            pending = pending[-len(ACTIVE_MARKER):]
            sleeper(0.05)


def capture_result(path):
    result = {'fixture_complete': False, 'summary': None, 'capture_errors': []}
    if not path.is_file():
        result['capture_errors'].append({'error': 'Recorder did not create tablet.jsonl.'})
        return result
    with path.open(encoding='utf-8') as source:
        for number, line in enumerate(source, 1):
            try:
                row = json.loads(line)
            except json.JSONDecodeError as error:
                result['capture_errors'].append({'error': f'Invalid JSON at line {number}: {error}'})
                continue
            if row.get('kind') == 'summary':
                result['summary'] = row
            elif row.get('kind') == 'capture_error':
                result['capture_errors'].append(row)
    summary = result['summary']
    result['fixture_complete'] = bool(summary and summary.get('fixture_complete') is True
                                      and not result['capture_errors'])
    if summary is None:
        result['capture_errors'].append({'error': 'Recorder summary is missing.'})
    return result


def write_json(path, value):
    with path.open('x', encoding='utf-8') as target:
        json.dump(value, target, indent=2)
        target.write('\n')


def finish_audio(processes):
    """Reap speech after recording ends; failures do not change captured evidence."""
    deadline = time.monotonic() + 3
    results = []
    for message, process in processes:
        result = {'message': message, 'timed_out': False, 'error': None}
        try:
            result['exit_code'] = process.wait(timeout=max(0, deadline - time.monotonic()))
        except subprocess.TimeoutExpired:
            result['timed_out'] = True
            result['error'] = 'Speech exceeded the bounded completion wait.'
            process.kill()
            try:
                result['exit_code'] = process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                result['error'] += ' Speech process did not exit after termination.'
        except OSError as error:
            result['error'] = str(error)
        if result.get('exit_code') not in (None, 0):
            result['error'] = result['error'] or f'Speech exited with status {result["exit_code"]}.'
        results.append(result)
    return results


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--silent', action='store_true', help='Use printed cues without speech or bell.')
    args = parser.parse_args(argv)
    try:
        if not EXECUTABLE.is_file() or not ORIGINAL.is_file():
            raise RuntimeError('Persistent research executable or original-arm64 is missing.')
        pid = choose_pid(read_processes(), EXECUTABLE)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
        folder = OUTPUT_ROOT / f'tablet-manual-{stamp}-{uuid.uuid4().hex[:8]}'
        folder.mkdir(parents=True, exist_ok=False)
        snapshot = folder / 'recorder'
        snapshot.mkdir()
        files = {}
        for name in ('capture_tablet_stroke.py', 'capture_live_contract.py', 'record_tablet_stroke.py'):
            raw = (HERE / name).read_bytes()
            with (snapshot / name).open('xb') as target:
                target.write(raw)
            files[name] = {'source': str(HERE / name), 'sha256': hashlib.sha256(raw).hexdigest()}
        write_json(folder / 'launcher-metadata.json', {
            'pid': pid, 'executable': str(EXECUTABLE), 'original_arm64': str(ORIGINAL),
            'recorder_snapshot': files, 'outer_timeout_seconds': 45, 'capture_timeout_seconds': 30,
            'settings': 'Operator-controlled; inspect captured configuration before comparison.',
        })
        # Check the PID again immediately before attachment; the recorder also verifies its identity.
        if choose_pid(read_processes(), EXECUTABLE) != pid:
            raise RuntimeError('The research process changed during setup; no attachment attempted.')
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        print(f'Recording setup failed: {error}', file=sys.stderr, flush=True)
        return 2

    tablet = folder / 'tablet.jsonl'
    log_path = folder / 'debugger.log'
    script = (f'import sys; sys.dont_write_bytecode=True; sys.path.insert(0, {str(snapshot)!r}); '
              f'import capture_tablet_stroke as tablet; tablet.run(lldb.debugger, {pid}, '
              f'{str(tablet)!r}, timeout_seconds=30, max_calls=512, '
              f'research_executable={str(EXECUTABLE)!r}, original_arm64={str(ORIGINAL)!r})')
    command = ['/usr/bin/xcrun', 'lldb', '--batch', '-o', f'process attach --pid {pid}',
               '-o', 'script ' + script, '-o', 'quit']
    print('Keep the pen lifted. Switch to the research canvas and wait for “Recording now.”', flush=True)
    print(f'Recording files: {folder}', flush=True)
    announcements = []
    audio_processes = []

    def announce(message):
        print(message.upper(), flush=True)
        if args.silent:
            return
        print('\a', end='', flush=True)
        try:
            audio_processes.append((message, subprocess.Popen(['/usr/bin/say', message],
                                    stdout=subprocess.DEVNULL, stderr=audio_log)))
        except OSError as error:
            announcements.append(str(error))
            print(f'Audio cue failed; follow the printed cue: {error}', file=sys.stderr, flush=True)

    outcome = {}
    process = None
    with log_path.open('xb') as log, (folder / 'audio.log').open('xb') as audio_log:
        try:
            process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                       stdin=subprocess.DEVNULL, start_new_session=True)
            outcome = monitor(process, log_path, lambda: announce('Recording now'))
        except (Exception, KeyboardInterrupt) as error:
            outcome['launcher_error'] = f'{type(error).__name__}: {error}'
            if process is not None and process.poll() is None:
                process.kill()
                outcome['debugger_exit_code'] = process.wait(timeout=5)
        try:
            rows = read_processes()
            with (folder / 'process-resume.txt').open('x') as target:
                target.write('\n'.join(line for line in rows.splitlines()
                                       if line.strip().split(None, 1)[0] == str(pid)) + '\n')
            outcome['resume_independently_verified'] = process_resumed(rows, pid, EXECUTABLE)
        except (OSError, subprocess.SubprocessError) as error:
            outcome['resume_independently_verified'] = False
            outcome['resume_check_error'] = str(error)
        result = capture_result(tablet)
        outcome.update(result)
        summary = result['summary'] or {}
        outcome['recording_succeeded'] = bool(
            result['fixture_complete'] and summary.get('detached_state_observed') is True
            and outcome.get('resume_independently_verified') is True
            and outcome.get('debugger_exit_code') == 0 and not outcome.get('outer_timeout')
            and not outcome.get('launcher_error'))
        if outcome['recording_succeeded']:
            announce('Recording stopped')
            print(f'Complete stroke saved; {summary.get("paired_calls")} paired calls. '
                  'Formula comparison has not been run.', flush=True)
        else:
            announce('Recording ended. Check the terminal.')
            print('A complete, safely detached recording was not verified.', flush=True)
            print(f'Reason: {summary.get("stop_reason") or outcome.get("launcher_error") or "See saved logs"}',
                  flush=True)
            if not outcome.get('resume_independently_verified'):
                print('CSP running state is unverified. Do not start another recording; ask Codex to inspect it.',
                      flush=True)
        outcome['audio_launch_errors'] = announcements
        outcome['audio_results'] = finish_audio(audio_processes)
        for result in outcome['audio_results']:
            if result['error']:
                print(f'Audio cue failed ({result["message"]}): {result["error"]} '
                      f'See {folder / "audio.log"}.', file=sys.stderr, flush=True)
        write_json(folder / 'launcher-result.json', outcome)
    print(f'Results: {folder / "launcher-result.json"}', flush=True)
    return 0 if outcome['recording_succeeded'] else 1


if __name__ == '__main__':
    sys.exit(main())
