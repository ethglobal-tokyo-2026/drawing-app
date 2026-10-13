# Persistent research locations

The research files were preserved outside temporary storage on 2026-10-10 before the user's reboot. Both preservation passes compared every copied regular file by SHA256, checked file modes and directory/symlink structure, and retained verification manifests.

| Material                                                                     | Persistent location                                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Current reconstruction, recorder, analyzer, reports and retained evidence    | This repository directory: `/Users/adoll/projects/drawing-app/docs/research/clip-studio-paint-stabilization` |
| Approved research app                                                        | `/Users/adoll/Applications/CSP Research/CLIP STUDIO PAINT Research.app`                                      |
| Pinned original ARM64 image                                                  | `/Users/adoll/Applications/CSP Research/original-arm64`                                                      |
| Original static-analysis working directory                                   | `/Users/adoll/Applications/CSP Research/static-analysis`                                                     |
| Remaining disassembly, probes, drafts, experiments and capture working files | `/Users/adoll/Applications/CSP Research/research-files`                                                      |
| New research output                                                          | `/Users/adoll/Applications/CSP Research/outputs`                                                             |

The first preservation pass saved 811 files (782,552,918 bytes), including the app and original static analysis. App signature verification passed. The second saved 227 additional files (1,237,273,130 bytes) from 41 remaining research entries. The second pass found no symlinks. All files matched their sources.

- [App/support preservation manifest](evidence/debugger-access/persistent-copy-20261010.json).
- [Recorder default-path checks](evidence/debugger-access/persistent-copy-20261010-checks.txt).
- [Remaining research preservation manifest](evidence/debugger-access/research-files-preservation-20261010.json).

## Cleanup after preservation

The user subsequently approved removing redundant research material. On 2026-10-10, the cleanup removed 176 files totaling 1,225,957,393 bytes from `research-files`: verified exact duplicates, generated disassembly/index/bundle caches, compiled probes, and independently reviewed superseded drafts. The archive now retains 51 distinct files totaling 11,315,737 bytes, excluding its inventory records. The unique `csp-cleanroom/EditImageTool.todb` settings snapshot remains preserved.

The [cleanup record](evidence/debugger-access/research-cleanup-20261010.json) lists every removed file, its hash and reason, retained counterparts where applicable, and every surviving archive file. Each survivor was verified against its original hash; the app executable, original ARM64 image, and settings snapshot were also checked unchanged. The earlier preservation manifests describe the original copy and must be interpreted alongside this cleanup record. Temporary source copies were already absent when cleanup ran.

## Finding a historical temporary path

- `/private/tmp/csp-debug-research-20261009/<relative path>` maps to `/Users/adoll/Applications/CSP Research/<relative path>`.
- `/private/tmp/csp-stabilization-research/<relative path>` maps to `/Users/adoll/Applications/CSP Research/static-analysis/<relative path>`.
- Other retained `/private/tmp/csp-<name>` entries map to `/Users/adoll/Applications/CSP Research/research-files/csp-<name>`, retaining their internal relative paths. For entries removed during cleanup, consult the cleanup record for the retained counterpart or regeneration reason.

The source scan covered CSP-prefixed entries in both the shared and per-user temporary roots, plus temporary paths cited anywhere in the research source, reports, and logs. No existing cited temporary entry outside that prefix was found. Unrelated application work and disposable test databases were not part of this CSP investigation.

Current research tools live in the repository. Older helper copies inside the preserved working directories are historical snapshots; use the repository versions when resuming work. Their original paths and captured logs remain unchanged to preserve provenance. The capture helper defaults to the persistent app/reference, and both Croquis replay commands default to persistent output. Tests may still create disposable temporary directories, and the binary verifier may regenerate temporary scratch files; neither depends on pre-reboot contents.

Temporary originals were retained for any already-running process. They are no longer required for future research. After reboot, launch the persistent app and obtain its new process ID before attaching a recorder. The files preserve research evidence, not unsaved canvas documents or live process memory.
