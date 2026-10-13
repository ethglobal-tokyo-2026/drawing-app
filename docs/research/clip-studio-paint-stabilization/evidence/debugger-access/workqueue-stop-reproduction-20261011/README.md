# Bounded workqueue-thread reproduction attempt

Six standalone native runs completed on 2026-10-11: four using bounded event
waits and two using the old polling wait. Each observed all 192 expected hardware
probe stops and exited normally. None reproduced the unexpected secondary-thread
step exception seen in CSP. No CSP process was attached or changed for this test.

The program submits four background dispatch jobs per iteration, with probes
already installed. Each job sleeps for 20 ms. There are 64 iterations, three
probe stops per iteration, and a three-second limit when waiting for remaining
jobs at exit. The debugger checks every nonempty thread stop reason and saves
its exception data, address, module, and function. Unexpected secondary stops
remain fatal. Each run has a 20-second internal and 30-second outer deadline.

The JSON reports, full debugger logs, program, source snapshots, and hash
manifest are preserved here. The exact sources for the earlier wait benchmark
were saved separately before adding this scenario and stronger thread checks.
There is no tablet-recorder behavior change in this experiment.

This unsuccessful reproduction does not rule out a timing-dependent debugger
problem in CSP, verify complete tablet capture, or justify ignoring unknown
exceptions. See the [actual stop diagnosis](../tablet-manual-20261011T173815.294680Z-bf864636/stop-diagnosis.md).
