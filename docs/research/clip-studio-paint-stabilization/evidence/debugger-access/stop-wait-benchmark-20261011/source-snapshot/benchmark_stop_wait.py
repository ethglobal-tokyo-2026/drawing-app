"""Compare event waits on a disposable native program, never on CSP.

Run in LLDB with a selected benchmark target. Uses three hardware probes and
identical register/memory reads in both modes. An outer subprocess timeout is
also required because native SB calls have no per-call timeout.
"""

import json
from pathlib import Path
import statistics
import time

import lldb


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def run(debugger, mode, output, workers=0):
    require(mode in ('poll', 'event'), 'Unknown wait mode')
    target = debugger.GetSelectedTarget()
    require(Path(target.GetExecutable().fullpath).name == 'benchmark_stop_wait',
            'Only the disposable benchmark program may be launched')
    debugger.SetAsync(True)
    error = lldb.SBError()
    launch = lldb.SBLaunchInfo([str(workers)])
    launch.SetLaunchFlags(lldb.eLaunchFlagStopAtEntry)
    process = target.Launch(launch, error)
    require(error.Success() and process.IsValid(), str(error))
    result = {'mode': mode, 'workers': workers, 'stops': [], 'events': []}
    ids = []
    started = time.monotonic()
    deadline = started + 20
    try:
        require(process.GetState() == lldb.eStateStopped, 'Launch did not stop')
        listener = lldb.SBListener('benchmark-' + mode)
        broadcaster = process.GetBroadcaster()
        mask = lldb.SBProcess.eBroadcastBitStateChanged
        require(listener.StartListeningForEvents(broadcaster, mask) & mask,
                'State-event subscription failed')
        for name in ('sample_source', 'sample_entry', 'sample_exit'):
            matches = target.FindFunctions(name)
            require(matches.GetSize() == 1, 'Expected one function: ' + name)
            address = matches.GetContextAtIndex(0).GetFunction().GetStartAddress()
            load = address.GetLoadAddress(target)
            before = target.GetNumBreakpoints()
            command = lldb.SBCommandReturnObject()
            debugger.GetCommandInterpreter().HandleCommand(
                f'breakpoint set --hardware --address {load:#x}', command, False)
            require(command.Succeeded(), str(command.GetError()))
            require(target.GetNumBreakpoints() == before + 1, 'Unexpected breakpoint count')
            breakpoint = target.GetBreakpointAtIndex(before)
            ids.append(breakpoint.GetID())
            require(breakpoint.IsHardware(), 'Hardware breakpoint required')
        data = target.FindFirstGlobalVariable('samples').GetLoadAddress()
        require(data != lldb.LLDB_INVALID_ADDRESS, 'Missing benchmark data')
        last_stop = process.GetStopID()
        while True:
            resumed = time.monotonic()
            error = process.Continue()
            require(error.Success(), str(error))
            while True:
                require(time.monotonic() < deadline, 'Benchmark deadline exceeded')
                event = lldb.SBEvent()
                if mode == 'poll':
                    ready = listener.GetNextEventForBroadcasterWithType(broadcaster, mask, event)
                    if not ready:
                        time.sleep(0.005)
                else:
                    ready = listener.WaitForEventForBroadcasterWithType(1, broadcaster, mask, event)
                if not ready:
                    continue
                require(lldb.SBProcess.EventIsProcessEvent(event), 'Unexpected event')
                require(lldb.SBProcess.GetProcessFromEvent(event).GetUniqueID() == process.GetUniqueID(),
                        'Foreign process event')
                state = lldb.SBProcess.GetStateFromEvent(event)
                restarted = lldb.SBProcess.GetRestartedFromEvent(event)
                result['events'].append({'seconds': time.monotonic() - started,
                                         'state': int(state), 'restarted': restarted})
                if state == lldb.eStateExited:
                    result['exit_status'] = process.GetExitStatus()
                    require(result['exit_status'] == 0, 'Benchmark process failed')
                    require(len(result['stops']) == 192, 'Missing benchmark stops')
                    return
                if state in (lldb.eStateRunning, lldb.eStateStepping) or restarted:
                    continue
                require(state == lldb.eStateStopped, 'Unexpected process state')
                stop_id = process.GetStopID()
                require(stop_id > last_stop, 'Non-advancing stop')
                last_stop = stop_id
                break
            stopped = time.monotonic()
            threads = [process.GetThreadAtIndex(i) for i in range(process.GetNumThreads())]
            hits = [t for t in threads if t.GetStopReason() == lldb.eStopReasonBreakpoint]
            require(len(hits) == 1, 'Expected one breakpoint thread')
            frame = hits[0].GetFrameAtIndex(0)
            x0 = frame.FindRegister('x0').GetValueAsUnsigned(error, 0)
            require(error.Success(), 'Register read failed')
            raw = process.ReadMemory(data, 236, error)
            require(error.Success() and len(raw) == 236, 'Memory read failed')
            result['stops'].append({'resume_to_stop_seconds': stopped - resumed,
                                    'read_seconds': time.monotonic() - stopped,
                                    'stop_id': stop_id, 'x0': x0,
                                    'function': frame.GetFunctionName(), 'bytes_le': raw.hex()})
    except BaseException as error:
        result['error'] = repr(error)
        raise
    finally:
        result['elapsed_seconds'] = time.monotonic() - started
        for identifier in ids:
            target.BreakpointDelete(identifier)
        if process.IsValid() and process.GetState() not in (lldb.eStateExited, lldb.eStateDetached):
            result['kill_error'] = str(process.Kill())
        gaps = [s['resume_to_stop_seconds'] for s in result['stops']]
        result['stop_count'] = len(gaps)
        result['median_resume_to_stop_seconds'] = statistics.median(gaps) if gaps else None
        with open(output, 'x') as destination:
            json.dump(result, destination, indent=2)
            destination.write('\n')
