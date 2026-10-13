"""Record one bounded mouse/pen source group in the approved CSP research copy.

Settings remain operator-controlled. This launcher does not synthesize input.
The armed cue follows actual hardware-breakpoint installation, never attachment.
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

from record_tablet_stroke import (EXECUTABLE, ORIGINAL, HERE, OUTPUT_ROOT,
                                choose_pid, read_processes, process_resumed, write_json)

ACTIVE_MARKER = 'CSP joined post-correction capture active;'
FILES = ('capture_joined_post.py', 'capture_post_correction.py',
         'capture_live_contract.py', 'post_evaluator_capture.py',
         'record_joined_post.py', 'record_tablet_stroke.py')


def result_from_capture(path):
    errors, summaries = [], []
    if not path.is_file():
        return {'captureComplete': False, 'errors': ['Capture file was not created.']}
    with path.open(encoding='utf-8') as source:
        for number, line in enumerate(source, 1):
            try:
                row = json.loads(line)
            except json.JSONDecodeError as error:
                errors.append(f'Invalid capture JSON at line {number}: {error}')
                continue
            if row.get('kind') == 'error':
                errors.append(row.get('message', 'Unspecified capture error'))
            if row.get('kind') == 'summary':
                summaries.append(row)
    if len(summaries) != 1:
        errors.append(f'Expected one capture summary; found {len(summaries)}.')
    summary = summaries[0] if len(summaries) == 1 else {}
    complete = bool(summary.get('captureComplete') is True
                    and summary.get('sourceEntryComplete') is True
                    and summary.get('detachedStateObserved') is True
                    and summary.get('detachRequestSucceeded') is True
                    and not summary.get('cleanupErrors')
                    and not summary.get('deadlineExceeded') and not errors)
    return {'captureComplete': complete, 'summary': summary, 'errors': errors}


def wait_for_capture(process, log_path, *, clock=time.monotonic, sleeper=time.sleep):
    started, announced, pending = clock(), False, ''
    with log_path.open(encoding='utf-8', errors='replace') as log:
        while True:
            exit_code = process.poll()
            pending += log.read()
            if exit_code is not None:
                return {'debuggerExitCode': exit_code, 'outerTimeout': False, 'armedCue': announced}
            if clock() - started >= 45:
                process.kill()
                return {'debuggerExitCode': process.wait(timeout=5), 'outerTimeout': True,
                        'armedCue': announced}
            if not announced and ACTIVE_MARKER in pending:
                print('RECORDING NOW — joined source and post correction are armed.', flush=True)
                announced = True
            # Full output persists on disk; this buffer only recognizes a split cue.
            pending = pending[-len(ACTIVE_MARKER):]
            sleeper(0.02)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device', choices=('mouse', 'tablet', 'unknown'), default='mouse')
    args = parser.parse_args(argv)
    if not EXECUTABLE.is_file() or not ORIGINAL.is_file():
        raise RuntimeError('Persistent research copy or original ARM64 reference is missing.')
    pid = choose_pid(read_processes(), EXECUTABLE)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    folder = OUTPUT_ROOT / f'post-joined-{stamp}-{uuid.uuid4().hex[:8]}'
    folder.mkdir(parents=True, exist_ok=False)
    snapshot = folder / 'recorder'
    snapshot.mkdir()
    hashes = {}
    for name in FILES:
        raw = (HERE / name).read_bytes()
        with (snapshot / name).open('xb') as target:
            target.write(raw)
        hashes[name] = hashlib.sha256(raw).hexdigest()
    write_json(folder / 'launcher-metadata.json', {
        'pid': pid, 'executable': str(EXECUTABLE), 'original': str(ORIGINAL),
        'recorderSha256': hashes, 'captureSeconds': 30, 'outerSeconds': 45,
        'deviceDeclaration': args.device, 'settings': 'Read actual captured inputs; no UI values assumed.',
    })
    if choose_pid(read_processes(), EXECUTABLE) != pid:
        raise RuntimeError('Research PID changed during preparation; no attachment attempted.')
    capture_path, log_path = folder / 'joined.jsonl', folder / 'debugger.log'
    script = (f'import sys; sys.dont_write_bytecode=True; sys.path.insert(0, {str(snapshot)!r}); '
              f'import capture_joined_post as capture; capture.run(lldb.debugger, {pid}, '
              f'{str(capture_path)!r}, timeout_seconds=30, device={args.device!r}, '
              f'research_executable={str(EXECUTABLE)!r}, original_arm64={str(ORIGINAL)!r})')
    command = ['/usr/bin/xcrun', 'lldb', '--batch', '-o', f'process attach --pid {pid}',
               '-o', 'script ' + script, '-o', 'quit']
    print(f'Capture files: {folder}', flush=True)
    process, outcome = None, {}
    with log_path.open('xb') as log:
        try:
            process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                       stdin=subprocess.DEVNULL, start_new_session=True)
            outcome = wait_for_capture(process, log_path)
        except BaseException as error:
            outcome['launcherError'] = f'{type(error).__name__}: {error}'
            if process is not None and process.poll() is None:
                process.kill()
                outcome['debuggerExitCode'] = process.wait(timeout=5)
    try:
        rows = read_processes()
        with (folder / 'process-resume.txt').open('x') as output:
            output.write('\n'.join(row for row in rows.splitlines()
                                   if row.strip().split(None, 1)[0] == str(pid)) + '\n')
        outcome['resumeIndependentlyVerified'] = process_resumed(rows, pid, EXECUTABLE)
    except (OSError, subprocess.SubprocessError) as error:
        outcome['resumeIndependentlyVerified'] = False
        outcome['resumeCheckError'] = str(error)
    outcome.update(result_from_capture(capture_path))
    outcome['recordingSucceeded'] = bool(outcome['captureComplete']
        and outcome.get('resumeIndependentlyVerified') and outcome.get('debuggerExitCode') == 0
        and not outcome.get('outerTimeout') and not outcome.get('launcherError'))
    write_json(folder / 'launcher-result.json', outcome)
    print(json.dumps(outcome, indent=2), flush=True)
    print(f'Recording ended. Saved at {folder}. Formula replay has not been run.', flush=True)
    return 0 if outcome['recordingSucceeded'] else 1


if __name__ == '__main__':
    sys.exit(main())
