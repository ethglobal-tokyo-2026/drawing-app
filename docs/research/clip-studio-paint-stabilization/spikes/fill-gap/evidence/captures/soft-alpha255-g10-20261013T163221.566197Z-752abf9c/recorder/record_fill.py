"""Root-controlled launcher for one bounded capture of the open research app.

Never opens the app, changes its settings, or synthesizes input. The root agent
starts this launcher only after confirming the scratch document and settings.
"""

import argparse
import datetime
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import uuid

HERE = Path(__file__).resolve().parent
LIVE = HERE.parent / 'live-capture'
sys.path.insert(0, str(LIVE))
import record_tablet_stroke as existing_launcher

READY_MARKER = 'CSP fill capture active'
EXPECTED_TIMEOUT = 'CaptureError: capture_deadline_reached'


def classify_capture_rows(rows, preflight=False):
    errors = []
    summaries = [row for row in rows if row.get('kind') == 'summary']
    if len(summaries) != 1:
        return {'captureComplete': False, 'preflightVerified': False,
                'errors': [f'Expected one summary; found {len(summaries)}.'], 'summary': None}
    summary = summaries[0]
    headers = [row for row in rows if row.get('kind') == 'header']
    verified = [row for row in rows if row.get('kind') == 'instruction_verified']
    armed = [row for row in rows if row.get('kind') == 'capture_started']
    boundaries = [row for row in rows if row.get('kind') == 'boundary']
    recorded_errors = [row.get('message', 'Unspecified recorder error')
                       for row in rows if row.get('kind') == 'error']
    setup_valid = bool(len(headers) == 1 and headers[0].get('schema') == 'csp-fill-capture/v1'
                       and len(verified) == 1 and verified[0].get('size') == 2348
                       and len(armed) == 1 and len(armed[0].get('breakpointIds', [])) == 3)
    if not setup_valid:
        errors.append('Full fill instruction verification and three armed probes were not retained.')
    clean = bool(summary.get('detachRequestSucceeded') is True
                 and summary.get('detachedStateObserved') is True
                 and summary.get('cleanupErrors') == []
                 and summary.get('watchdogError') is None
                 and summary.get('deadlineExceeded') is False
                 and summary.get('unmatchedEntries') == 0)
    if not clean:
        errors.append('Recorder cleanup or detached state was not verified within its deadline.')
    expected_preflight = bool(preflight and setup_valid and clean and not boundaries
                              and summary.get('entries') == summary.get('pairs') == 0
                              and summary.get('stopReason') == EXPECTED_TIMEOUT
                              and summary.get('captureErrors') == [EXPECTED_TIMEOUT]
                              and recorded_errors == [EXPECTED_TIMEOUT])
    if not expected_preflight:
        errors.extend(recorded_errors)
    calls = summary.get('requestedCalls')
    ordered = [] if type(calls) is not int or not 1 <= calls <= 64 else [
        (str(call), phase) for call in range(1, calls + 1)
        for phase in ('entry', 'initial', 'return')]
    observed = [(row.get('callId'), row.get('phase')) for row in boundaries]
    complete = bool(not preflight and setup_valid and clean and not recorded_errors
                    and summary.get('captureComplete') is True
                    and summary.get('captureErrors') == [] and ordered and observed == ordered
                    and all(row.get('snapshot', {}).get('complete') is True for row in boundaries))
    if not preflight and not complete and not errors:
        errors.append('Requested complete fill calls were not observed in entry/initial/return order.')
    if preflight and not expected_preflight and not errors:
        errors.append('No-input preflight did not end in the expected timeout with zero calls.')
    return {'captureComplete': complete, 'preflightVerified': expected_preflight,
            'errors': errors, 'summary': summary}


def read_capture(path, preflight):
    if not path.is_file():
        return {'captureComplete': False, 'preflightVerified': False,
                'errors': ['Recorder did not create fill.jsonl.'], 'summary': None}
    rows, errors = [], []
    with path.open(encoding='utf-8') as source:
        for number, line in enumerate(source, 1):
            try:
                row = json.loads(line)
                if not isinstance(row, dict):
                    raise ValueError('Capture row is not an object')
                rows.append(row)
            except (ValueError, json.JSONDecodeError) as error:
                errors.append(f'Invalid capture JSON at line {number}: {error}')
    result = classify_capture_rows(rows, preflight)
    if errors:
        result.update(captureComplete=False, preflightVerified=False,
                      errors=errors + result['errors'])
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--calls', type=int, default=1)
    parser.add_argument('--timeout', type=float, default=30)
    parser.add_argument('--preflight', action='store_true')
    parser.add_argument('--label', default='fill')
    parser.add_argument('--metadata-file', type=Path)
    args = parser.parse_args(argv)
    if not 1 <= args.calls <= 64 or not 5 <= args.timeout <= 30:
        parser.error('Calls must be in [1,64] and timeout in [5,30].')
    if not re.fullmatch('[a-z0-9][a-z0-9-]{0,63}', args.label):
        parser.error('Label must contain 1 to 64 lowercase letters, digits, or hyphens.')
    metadata = {} if args.metadata_file is None else json.loads(args.metadata_file.read_text())
    if not isinstance(metadata, dict):
        parser.error('Metadata file must contain one JSON object.')
    executable, original = existing_launcher.EXECUTABLE, existing_launcher.ORIGINAL
    if not executable.is_file() or not original.is_file():
        raise RuntimeError('Persistent research executable or reference is missing.')
    pid = existing_launcher.choose_pid(existing_launcher.read_processes(), executable)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
    folder = HERE / 'evidence' / 'captures' / f'{args.label}-{stamp}-{uuid.uuid4().hex[:8]}'
    folder.mkdir(parents=True, exist_ok=False)
    snapshot = folder / 'recorder'
    snapshot.mkdir()
    hashes = {}
    for source in (HERE / 'capture_fill.py', HERE / 'record_fill.py',
                   LIVE / 'capture_live_contract.py', LIVE / 'record_tablet_stroke.py'):
        raw = source.read_bytes()
        with (snapshot / source.name).open('xb') as target:
            target.write(raw)
        hashes[source.name] = hashlib.sha256(raw).hexdigest()
    existing_launcher.write_json(folder / 'launcher-metadata.json', {
        'pid': pid, 'executable': str(executable), 'original': str(original),
        'recorderSha256': hashes, 'requestedCalls': args.calls,
        'captureSeconds': args.timeout, 'outerGuardSeconds': 45,
        'preflight': args.preflight, 'metadata': metadata,
    })
    if existing_launcher.choose_pid(existing_launcher.read_processes(), executable) != pid:
        raise RuntimeError('Research PID changed during preparation; no attachment attempted.')
    capture_path, log_path = folder / 'fill.jsonl', folder / 'debugger.log'
    script = (f'import sys; sys.dont_write_bytecode=True; sys.path.insert(0, {str(snapshot)!r}); '
              f'import capture_fill as fill; fill.run(lldb.debugger, {pid}, '
              f'{str(capture_path)!r}, timeout_seconds={args.timeout!r}, max_calls={args.calls}, '
              f'metadata={metadata!r}, research_executable={str(executable)!r}, '
              f'original_arm64={str(original)!r})')
    command = ['/usr/bin/xcrun', 'lldb', '--batch', '-o', f'process attach --pid {pid}',
               '-o', 'script ' + script, '-o', 'quit']
    print(f'Capture files: {folder}', flush=True)
    process, outcome = None, {}
    with log_path.open('xb') as log:
        try:
            process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                       stdin=subprocess.DEVNULL, start_new_session=True)
            # This separate launcher process uses the established single 45-second
            # debugger guard; its cue changes only to recognize the fill observer.
            existing_launcher.ACTIVE_MARKER = READY_MARKER
            outcome = existing_launcher.monitor(
                process, log_path, lambda: print('RECORDING NOW — fill probes are armed.', flush=True))
        except BaseException as error:
            outcome['launcherError'] = f'{type(error).__name__}: {error}'
            if process is not None and process.poll() is None:
                process.kill()
                outcome['debugger_exit_code'] = process.wait(timeout=5)
    try:
        rows = existing_launcher.read_processes()
        with (folder / 'process-resume.txt').open('x') as output:
            output.write('\n'.join(row for row in rows.splitlines()
                                   if row.strip().split(None, 1)[0] == str(pid)) + '\n')
        outcome['resumeIndependentlyVerified'] = existing_launcher.process_resumed(rows, pid, executable)
    except (OSError, subprocess.SubprocessError) as error:
        outcome['resumeIndependentlyVerified'] = False
        outcome['resumeCheckError'] = str(error)
    outcome.update(read_capture(capture_path, args.preflight))
    outcome['recordingSucceeded'] = bool(
        (outcome['preflightVerified'] if args.preflight else outcome['captureComplete'])
        and outcome.get('resumeIndependentlyVerified')
        and outcome.get('debugger_exit_code') == 0
        and not outcome.get('outer_timeout') and not outcome.get('launcherError'))
    existing_launcher.write_json(folder / 'launcher-result.json', outcome)
    print(json.dumps(outcome, indent=2), flush=True)
    print(f'Recording ended. Saved at {folder}. No algorithm equality or timing claim.', flush=True)
    return 0 if outcome['recordingSucceeded'] else 1


if __name__ == '__main__':
    sys.exit(main())
