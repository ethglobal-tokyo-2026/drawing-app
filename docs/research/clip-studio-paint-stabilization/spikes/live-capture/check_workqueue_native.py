"""Validate recovery location reads on real system frames in a disposable app.

This does not synthesize or reproduce the exceptional stop. It verifies the
shared recorder's native symbol/module/instruction checks at a hardware stop.
The calling subprocess must impose a 30-second outer timeout.
"""

import io
import json
from pathlib import Path
import time

import lldb
import capture_live_contract as shared


def run(debugger, output):
    target = debugger.GetSelectedTarget()
    shared.require(Path(target.GetExecutable().fullpath).name == 'benchmark_thread_creation',
                   'Only the standalone thread-creation test may be launched')
    shared.require(not Path(output).exists(), 'Output already exists')
    result = {'scope': 'Native startup-location inspection, not an exception reproduction.',
              'contexts': [], 'cleanup_errors': []}
    identifiers = []
    process = None
    started = time.monotonic()
    old_async = debugger.GetAsync()

    def breakpoint(command):
        before = target.GetNumBreakpoints()
        response = lldb.SBCommandReturnObject()
        debugger.GetCommandInterpreter().HandleCommand(command, response, False)
        new = [target.GetBreakpointAtIndex(i) for i in range(before, target.GetNumBreakpoints())]
        identifiers.extend(b.GetID() for b in new)
        shared.require(response.Succeeded() and len(new) == 1 and new[0].IsHardware(),
                       'Expected one hardware breakpoint: ' + str(response.GetError()))
        return new[0]

    try:
        main = breakpoint('breakpoint set --hardware --name main')
        debugger.SetAsync(False)
        launch = lldb.SBLaunchInfo(['workqueue'])
        launch.SetLaunchFlags(0)
        error = lldb.SBError()
        process = target.Launch(launch, error)
        shared.check_error(error, 'Launch standalone program')
        shared.require(process.GetState() == lldb.eStateStopped, 'Expected main bootstrap stop')
        selected = process.GetSelectedThread()
        shared.require(selected.GetStopReason() == lldb.eStopReasonBreakpoint
                       and selected.GetStopReasonDataAtIndex(0) == main.GetID(),
                       'Wrong main bootstrap stop')
        shared.require(target.BreakpointDelete(main.GetID()), 'Delete main breakpoint failed')
        identifiers.remove(main.GetID())
        symbols = target.FindSymbols('start_wqthread', lldb.eSymbolTypeCode)
        candidates = [symbols.GetContextAtIndex(i) for i in range(symbols.GetSize())
                      if symbols.GetContextAtIndex(i).GetModule().GetFileSpec().GetFilename()
                      == 'libsystem_pthread.dylib']
        shared.require(len(candidates) == 1, 'Expected one system workqueue startup symbol')
        start = candidates[0].GetSymbol().GetStartAddress().GetLoadAddress(target)
        probe = breakpoint(f'breakpoint set --hardware --address {start + 4:#x}')
        shared.check_error(process.Continue(), 'Continue to native startup')
        shared.require(process.GetState() == lldb.eStateStopped, 'Expected startup stop')
        inspector = shared.Capture(debugger, process.GetProcessID(), io.StringIO(), 20, 8)
        inspector.process, inspector.target = process, target
        for i in range(process.GetNumThreads()):
            thread = process.GetThreadAtIndex(i)
            if thread.GetStopReason() == lldb.eStopReasonNone:
                continue
            shared.require(thread.GetStopReason() == lldb.eStopReasonBreakpoint
                           and thread.GetStopReasonDataAtIndex(0) == probe.GetID(),
                           'Unexpected native startup stop')
            result['contexts'].append(inspector.workqueue_step_context(thread))
        shared.require(bool(result['contexts']), 'No startup contexts inspected')
        shared.require(target.BreakpointDelete(probe.GetID()), 'Delete startup breakpoint failed')
        identifiers.remove(probe.GetID())
        shared.check_error(process.Continue(), 'Continue after startup inspection')
        shared.require(process.GetState() == lldb.eStateExited and process.GetExitStatus() == 0,
                       'Standalone program did not complete normally')
        result['exit_status'] = process.GetExitStatus()
        result['passed'] = True
    except BaseException as error:
        result['error'] = repr(error)
        raise
    finally:
        for identifier in identifiers:
            if not target.BreakpointDelete(identifier):
                result['cleanup_errors'].append(f'Could not delete breakpoint {identifier}')
        if process and process.IsValid() and process.GetState() not in (lldb.eStateExited, lldb.eStateDetached):
            error = process.Kill()
            if not error.Success():
                result['cleanup_errors'].append(str(error))
        debugger.SetAsync(old_async)
        result['elapsed_seconds'] = time.monotonic() - started
        with open(output, 'x') as destination:
            json.dump(result, destination, indent=2)
            destination.write('\n')
