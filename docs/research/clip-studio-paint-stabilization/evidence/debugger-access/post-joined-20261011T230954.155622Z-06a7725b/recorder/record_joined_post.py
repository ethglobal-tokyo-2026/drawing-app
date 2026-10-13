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
SETUP_TIMEOUT_SECONDS = 45
ARMED_TIMEOUT_SECONDS = 45
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


def wait_for_capture(process, log_path, *, clock=time.monotonic, sleeper=time.sleep, on_armed=None):
    started, armed_at, announced, pending = clock(), None, False, ''
    with log_path.open(encoding='utf-8', errors='replace') as log:
        while True:
            exit_code = process.poll()
            pending += log.read()
            if exit_code is not None:
                return {'debuggerExitCode': exit_code, 'outerTimeout': False,
                        'timeoutPhase': None, 'armedCue': announced}
            now = clock()
            deadline = (started + SETUP_TIMEOUT_SECONDS if armed_at is None
                        else armed_at + ARMED_TIMEOUT_SECONDS)
            if now >= deadline:
                # Cleanup may finish between the first poll and this deadline check.
                exit_code = process.poll()
                if exit_code is not None:
                    return {'debuggerExitCode': exit_code, 'outerTimeout': False,
                            'timeoutPhase': None, 'armedCue': announced}
                process.kill()
                return {'debuggerExitCode': process.wait(timeout=5), 'outerTimeout': True,
                        'timeoutPhase': 'setup' if armed_at is None else 'recording',
                        'armedCue': announced}
            if not announced and ACTIVE_MARKER in pending:
                armed_at = now
                print('RECORDING NOW — joined source and post correction are armed.', flush=True)
                announced = True
                if on_armed is not None:
                    on_armed()
            # Full output persists on disk; this buffer only recognizes a split cue.
            pending = pending[-len(ACTIVE_MARKER):]
            sleeper(0.02)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--device', choices=('mouse', 'tablet', 'unknown'), default='mouse')
    parser.add_argument('--announce', action='store_true', help='Speak the cue after recording is armed.')
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
        'recorderSha256': hashes, 'captureSeconds': 30,
        'setupTimeoutSeconds': SETUP_TIMEOUT_SECONDS,
        'armedTimeoutSeconds': ARMED_TIMEOUT_SECONDS,
        'maximumDebuggerSeconds': SETUP_TIMEOUT_SECONDS + ARMED_TIMEOUT_SECONDS,
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
    process, outcome, audio = None, {}, []
    cue_errors = []
    with log_path.open('xb') as log:
        def announce():
            if args.announce:
                try:
                    audio.append(subprocess.Popen(['/usr/bin/say', 'Recording now'],
                                 stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL))
                except OSError as error:
                    cue_errors.append(str(error))
                    print(f'Audio cue failed; follow the printed cue: {error}', flush=True)
        try:
            process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                       stdin=subprocess.DEVNULL, start_new_session=True)
            outcome = wait_for_capture(process, log_path, on_armed=announce)
        except BaseException as error:
            outcome['launcherError'] = f'{type(error).__name__}: {error}'
            if process is not None and process.poll() is None:
                process.kill()
                outcome['debuggerExitCode'] = process.wait(timeout=5)
        for cue in audio:
            try:
                code = cue.wait(timeout=3)
                if code:
                    cue_errors.append(f'Audio cue exited with status {code}.')
            except subprocess.TimeoutExpired:
                cue.kill()
                cue.wait(timeout=1)
                cue_errors.append('Audio cue exceeded its completion limit.')
        outcome['audioCueErrors'] = cue_errors
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
