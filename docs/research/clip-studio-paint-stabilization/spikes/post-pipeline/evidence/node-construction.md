# Node construction and open adjacency

The pinned original ARM64 image was read without attaching to CSP. Fresh
function bytes and assembly hashes are recorded in [node-extraction.json](node-extraction.json).

Both the quadratic constructor `0x1027647c0` and spline constructor
`0x102788840` call the base constructor [0x10276ae48](10276ae48.asm).
The quadratic constructor additionally clears the stored control at `+0x78`.
The base constructor clears node flags, ownership and adjacent pointers, and
initializes scalar and endpoint fields from these original image constants:

| Address       | Raw little-endian bytes            | Four binary32 values |
| ------------- | ---------------------------------- | -------------------- |
| `0x104483980` | `0000803f0000803f0000000000000000` | 1, 1, 0, 0           |
| `0x104486040` | `0000803f0000803f0000803f00000000` | 1, 1, 1, 0           |

The second constant is stored at node `+0x54`; its final lane clears `+0x60`.
Separate zero stores clear `+0x64` and `+0x68`. Therefore all twelve endpoint
bytes at `+0x60..+0x6b` are zero after allocation. The import operation
`0x10276b190` writes positions, seven scalar floats, and flag bits 12/13; it
does not copy endpoint data. Thus cloned output spline nodes have zero
endpoint data even when an original source node's retained bytes are nonzero.
Inserted quadratic source nodes also begin with zero endpoint data. The
reconstruction preserves the original source bytes and models the constructor
zeros for new nodes explicitly.

[0x102781770](102781770.asm) appends a newly allocated node, setting its owner
and repairing the previous node and path tail. [0x1027817d0](1027817d0.asm)
inserts before a supplied node and repairs both adjacent links. Both obtain
freshly constructed objects through the path pool's virtual `+0x10` method.

[0x10276af54](10276af54.asm) and [0x10276afac](10276afac.asm) return the raw next
and previous nodes when present. At a missing link they wrap only when path
flag `0x100` is set. The companion [next](10276af80.asm) and
[previous](10276afd8.asm) accessors used by spline context follow the same
open-path null behavior. The reconstruction explicitly rejects closed input,
so its null links reproduce this branch without supplying fictitious neighbors.
