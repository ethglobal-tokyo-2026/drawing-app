"""Standalone syscall-step reproduction; never attach or open CSP.

Select only an executable named benchmark_thread_creation, then call
run(lldb.debugger, 'workqueue' or 'pthread', fresh_report_path).
The caller must enforce a 30-second outer subprocess timeout.
Every unexpected stop remains fatal; no recovery or debug-register writes.
"""
import json
from pathlib import Path
import time

import lldb


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def run(debugger, mode, output):
    require(mode in ('pthread', 'workqueue'), 'Unknown creation mode')
    require(not Path(output).exists(), 'Report already exists')
    target = debugger.GetSelectedTarget()
    require(Path(target.GetExecutable().fullpath).name == 'benchmark_thread_creation',
            'Only the disposable thread-creation program may be launched')
    result = {'mode': mode, 'stops': [], 'events': [], 'expected_retired_stops': 64 if mode == 'pthread' else 8,
              'unexpected_stops_are_fatal': True}
    ids = []
    process = lldb.SBProcess()
    started = time.monotonic()
    deadline = started + 20
    try:
        # StopAtEntry stops in dyld before libsystem symbols are loaded. A
        # hardware main breakpoint supplies a verified, library-ready boundary.
        before = target.GetNumBreakpoints()
        command = lldb.SBCommandReturnObject()
        debugger.GetCommandInterpreter().HandleCommand(
            'breakpoint set --hardware --name main', command, False)
        for index in range(before, target.GetNumBreakpoints()):
            ids.append(target.GetBreakpointAtIndex(index).GetID())
        require(command.Succeeded() and len(ids) == 1, str(command.GetError()))
        bootstrap = target.FindBreakpointByID(ids[0])
        require(bootstrap.IsHardware(), 'Hardware main bootstrap required')
        debugger.SetAsync(False)
        error = lldb.SBError()
        launch = lldb.SBLaunchInfo([mode])
        launch.SetLaunchFlags(0)
        process = target.Launch(launch, error)
        require(error.Success() and process.IsValid(), str(error))
        require(process.GetState() == lldb.eStateStopped, 'Launch did not stop at main')
        result['bootstrap_stops'] = []
        for index in range(process.GetNumThreads()):
            thread = process.GetThreadAtIndex(index)
            if thread.GetStopReason() == lldb.eStopReasonNone:
                continue
            result['bootstrap_stops'].append({
                'thread_id': thread.GetThreadID(), 'reason': int(thread.GetStopReason()),
                'data': [thread.GetStopReasonDataAtIndex(i) for i in range(thread.GetStopReasonDataCount())],
                'pc': hex(thread.GetFrameAtIndex(0).GetPC()),
                'function': thread.GetFrameAtIndex(0).GetFunctionName()})
        require(len(result['bootstrap_stops']) == 1, 'Unexpected secondary bootstrap stop')
        stopped = result['bootstrap_stops'][0]
        require(stopped['reason'] == int(lldb.eStopReasonBreakpoint) and
                len(stopped['data']) == 2 and stopped['data'][0] == bootstrap.GetID(),
                'Main bootstrap did not stop at its owned hardware breakpoint')
        require(target.BreakpointDelete(bootstrap.GetID()), 'Failed deleting hardware main bootstrap')
        ids.clear()
        require(time.monotonic() < deadline, 'Creation experiment bootstrap deadline exceeded')
        debugger.SetAsync(True)
        listener = lldb.SBListener('creation-step-' + mode)
        broadcaster = process.GetBroadcaster()
        mask = lldb.SBProcess.eBroadcastBitStateChanged
        require(listener.StartListeningForEvents(broadcaster, mask) & mask, 'Event subscription failed')

        def symbol_address(name, module_name=None):
            matches = target.FindSymbols(name, lldb.eSymbolTypeCode)
            candidates = []
            for i in range(matches.GetSize()):
                context = matches.GetContextAtIndex(i)
                if module_name is None or context.GetModule().GetFileSpec().GetFilename() == module_name:
                    candidates.append(context.GetSymbol().GetStartAddress())
            unique = {address.GetLoadAddress(target): address for address in candidates}
            require(len(unique) == 1, 'Expected exactly one loaded code symbol: ' + name)
            return next(iter(unique.values()))

        name = '__bsdthread_create' if mode == 'pthread' else '__workq_kernreturn'
        address = symbol_address(name, 'libsystem_kernel.dylib')
        instructions = target.ReadInstructions(address, 8)
        syscalls = [instructions.GetInstructionAtIndex(i) for i in range(instructions.GetSize())
                    if instructions.GetInstructionAtIndex(i).GetMnemonic(target) == 'svc']
        require(len(syscalls) == 1, 'Expected one SVC in verified system wrapper window')
        syscall_address = syscalls[0].GetAddress().GetLoadAddress(target)
        require(syscall_address == address.GetLoadAddress(target) + 4, 'Unexpected wrapper SVC offset')
        raw = process.ReadMemory(syscall_address, 4, error)
        require(error.Success() and raw == bytes.fromhex('011000d4'), 'Expected ARM64 SVC #0x80 bytes')
        retired_address = symbol_address('sample_retired').GetLoadAddress(target)
        probes = [('creation_syscall', syscall_address), ('sample_retired', retired_address)]
        for label, load in probes:
            before = target.GetNumBreakpoints()
            command = lldb.SBCommandReturnObject()
            debugger.GetCommandInterpreter().HandleCommand(
                f'breakpoint set --hardware --address {load:#x}', command, False)
            require(command.Succeeded() and target.GetNumBreakpoints() == before + 1,
                    str(command.GetError()))
            breakpoint = target.GetBreakpointAtIndex(before)
            require(breakpoint.IsHardware(), 'Hardware breakpoint required')
            ids.append(breakpoint.GetID())
            result.setdefault('probes', []).append({'label': label, 'address': hex(load),
                                                    'breakpoint_id': breakpoint.GetID()})
        result['system_symbol'] = name
        result['system_instruction_bytes_le'] = raw.hex()
        data = target.FindFirstGlobalVariable('samples').GetLoadAddress()
        require(data != lldb.LLDB_INVALID_ADDRESS, 'Missing sample data')
        last_stop = process.GetStopID()
        seen_threads = set()
        retired_count = 0
        while True:
            require(time.monotonic() < deadline, 'Creation experiment deadline exceeded')
            require(len(result['stops']) < 4096, 'Creation experiment stop bound exceeded')
            error = process.Continue()
            require(error.Success(), str(error))
            while True:
                require(time.monotonic() < deadline, 'Creation experiment deadline exceeded')
                event = lldb.SBEvent()
                if not listener.WaitForEventForBroadcasterWithType(1, broadcaster, mask, event):
                    continue
                require(lldb.SBProcess.EventIsProcessEvent(event), 'Unexpected event type')
                require(lldb.SBProcess.GetProcessFromEvent(event).GetUniqueID() == process.GetUniqueID(),
                        'Foreign process event')
                state = lldb.SBProcess.GetStateFromEvent(event)
                restarted = lldb.SBProcess.GetRestartedFromEvent(event)
                result['events'].append({'elapsed_seconds': time.monotonic() - started,
                                         'state': int(state), 'restarted': restarted})
                if state == lldb.eStateExited:
                    result['exit_status'] = process.GetExitStatus()
                    require(result['exit_status'] == 0, 'Disposable process failed')
                    require(retired_count == result['expected_retired_stops'], 'Missing retirement stops')
                    result['completed_without_unexpected_stop'] = True
                    return
                if state in (lldb.eStateRunning, lldb.eStateStepping) or restarted:
                    continue
                require(state == lldb.eStateStopped, 'Unexpected process state')
                require(process.GetStopID() > last_stop, 'Non-advancing stop')
                last_stop = process.GetStopID()
                break
            stop = {'elapsed_seconds': time.monotonic() - started, 'stop_id': last_stop, 'threads': []}
            result['stops'].append(stop)
            for i in range(process.GetNumThreads()):
                thread = process.GetThreadAtIndex(i)
                frame = thread.GetFrameAtIndex(0)
                identifier = thread.GetThreadID()
                row = {'thread_id': identifier, 'first_seen': identifier not in seen_threads,
                       'reason': int(thread.GetStopReason()),
                       'data': [thread.GetStopReasonDataAtIndex(j) for j in range(thread.GetStopReasonDataCount())],
                       'pc': hex(frame.GetPC()), 'function': frame.GetFunctionName(),
                       'module': frame.GetModule().GetFileSpec().fullpath,
                       'description': thread.GetStopDescription(4096), 'registers': {}}
                seen_threads.add(identifier)
                stop['threads'].append(row)
                for register in ('x0', 'x1', 'x2', 'x3', 'sp', 'cpsr'):
                    value = frame.FindRegister(register)
                    row['registers'][register] = value.GetValue() if value.IsValid() else None
                instruction_error = lldb.SBError()
                code = process.ReadMemory(frame.GetPC(), 4, instruction_error)
                row['instruction_bytes_le'] = code.hex() if instruction_error.Success() else None
                if not instruction_error.Success(): row['instruction_read_error'] = str(instruction_error)
            # Preserve every thread before applying the same fail-closed rule.
            owned_hits = 0
            for thread in stop['threads']:
                if thread['reason'] == int(lldb.eStopReasonNone):
                    continue
                require(thread['reason'] == int(lldb.eStopReasonBreakpoint),
                        'Unexpected secondary thread stop; full stop preserved')
                data_values = thread['data']
                require(len(data_values) >= 2 and len(data_values) % 2 == 0 and
                        all(data_values[j] in ids for j in range(0, len(data_values), 2)),
                        'Unowned breakpoint')
                owned_hits += 1
                if ids[1] in data_values[::2]: retired_count += 1
            require(owned_hits > 0, 'Stop contained no owned hardware breakpoint')
            raw = process.ReadMemory(data, 236, error)
            require(error.Success() and len(raw) == 236, 'Sample memory read failed')
            stop['samples_bytes_le'] = raw.hex()
            result['retired_stops'] = retired_count
            if any(ids[1] in thread['data'][::2] for thread in stop['threads']):
                stop['task_state_snapshots'] = {}
                for name, size in (('task_step_bits', 512), ('task_state_results', 256)):
                    location = target.FindFirstGlobalVariable(name).GetLoadAddress()
                    require(location != lldb.LLDB_INVALID_ADDRESS, 'Missing self-read state array: ' + name)
                    snapshot = process.ReadMemory(location, size, error)
                    require(error.Success() and len(snapshot) == size, 'Self-read snapshot capture failed: ' + name)
                    stop['task_state_snapshots'][name] = snapshot.hex()
    except BaseException as caught:
        result['error'] = repr(caught)
        raise
    finally:
        result['elapsed_seconds'] = time.monotonic() - started
        result['cleanup_errors'] = []
        for identifier in ids:
            if not target.BreakpointDelete(identifier):
                result['cleanup_errors'].append('Failed deleting breakpoint ' + str(identifier))
        if process.IsValid() and process.GetState() not in (lldb.eStateExited, lldb.eStateDetached):
            result['kill_error'] = str(process.Kill())
        with open(output, 'x') as destination:
            json.dump(result, destination, indent=2)
            destination.write('\n')
