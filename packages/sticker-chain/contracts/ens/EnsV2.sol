// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev The parts of ENSv2 this package calls, as deployed on Sepolia at contracts-v2 71a3b73.
///      Declared here rather than imported, so our contracts build on our own OpenZeppelin.

/// @dev ENSv2's `Grant`, for `UserRegistry.initialize` and `PermissionedResolver.initialize`.
struct EnsGrant {
    address account;
    uint256 roleBitmap;
}

interface IEnsRegistry {
    function register(
        string calldata label,
        address owner,
        address registry,
        address resolver,
        uint256 roleBitmap,
        uint64 expiry
    ) external returns (uint256 tokenId);
    function unregister(uint256 anyId) external;
    function setParent(address parent, string calldata label) external;
    function setSubregistry(uint256 anyId, address registry) external;
    function setResolver(uint256 anyId, address resolver) external;
    function grantRootRoles(uint256 roleBitmap, address account) external returns (bool);
    function revokeRootRoles(uint256 roleBitmap, address account) external returns (bool);
    function getOwner(uint256 anyId) external view returns (address);
    function getExpiry(uint256 anyId) external view returns (uint64);
}

interface IEnsUserRegistry {
    function initialize(EnsGrant[] calldata grants) external;
}

interface IEnsPermissionedResolver {
    function initialize(EnsGrant[] calldata grants, bytes[] calldata calls) external;
    function setText(bytes calldata name, string calldata key, string calldata value) external;
    function setAddress(bytes calldata name, uint256 coinType, bytes calldata addressBytes) external;
    function grantSetterRoles(bytes calldata setter, address account) external returns (bool);
    function revokeRootRoles(uint256 roleBitmap, address account) external returns (bool);
}

interface IVerifiableFactory {
    function deployProxy(address implementation, uint256 salt, bytes calldata data)
        external
        returns (address proxy);
}

/// @dev ENSIP-10.
interface IExtendedResolver {
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory);
}

/// @dev ENSv2 role bits: RegistryRolesLib and PermissionedResolverLib.
library EnsRoles {
    uint256 internal constant REGISTRAR = 1 << 0;
    uint256 internal constant REGISTRAR_ADMIN = REGISTRAR << 128;
    uint256 internal constant SET_PARENT = 1 << 8;
    uint256 internal constant SET_PARENT_ADMIN = SET_PARENT << 128;
    uint256 internal constant UNREGISTER = 1 << 12;
    uint256 internal constant UNREGISTER_ADMIN = UNREGISTER << 128;
    uint256 internal constant SET_RESOLVER = 1 << 24;
    uint256 internal constant SET_RESOLVER_ADMIN = SET_RESOLVER << 128;

    uint256 internal constant RESOLVER_SET_ADDRESS = 1 << 0;
    uint256 internal constant RESOLVER_SET_ADDRESS_ADMIN = RESOLVER_SET_ADDRESS << 128;
    uint256 internal constant RESOLVER_SET_TEXT = 1 << 4;
    uint256 internal constant RESOLVER_SET_TEXT_ADMIN = RESOLVER_SET_TEXT << 128;

    /// @dev EACBaseRolesLib.ALL_ROLES: every role and every admin role.
    uint256 internal constant ALL =
        0x1111111111111111111111111111111111111111111111111111111111111111;
}

/// @dev ENS names as DNS-encoded bytes (a length byte before each label, then 0) and namehashes.
library EnsNames {
    error InvalidLabel(string label);

    /// @dev `label` prefixed to the DNS-encoded `parent`.
    function child(string memory label, bytes memory parent) internal pure returns (bytes memory) {
        bytes memory raw = bytes(label);
        if (raw.length == 0 || raw.length > 255) revert InvalidLabel(label);
        for (uint256 i; i < raw.length; ++i) {
            if (raw[i] == ".") revert InvalidLabel(label);
        }
        return abi.encodePacked(uint8(raw.length), raw, parent);
    }

    function node(bytes32 parentNode, string memory label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(parentNode, keccak256(bytes(label))));
    }

    /// @dev The namehash of the DNS-encoded `name`, from `offset`.
    function namehash(bytes memory name, uint256 offset) internal pure returns (bytes32 hash) {
        uint256 length = uint8(name[offset]);
        if (length == 0) return bytes32(0);
        bytes32 labelHash;
        assembly {
            labelHash := keccak256(add(add(name, 0x21), offset), length)
        }
        return keccak256(abi.encodePacked(namehash(name, offset + 1 + length), labelHash));
    }

    /// @dev The DNS-encoded `name` as dotted text.
    function toText(bytes memory name) internal pure returns (string memory text) {
        bytes memory out = new bytes(name.length > 1 ? name.length - 2 : 0);
        uint256 offset;
        uint256 written;
        while (offset < name.length) {
            uint256 length = uint8(name[offset]);
            if (length == 0) break;
            if (written != 0) out[written++] = ".";
            for (uint256 i; i < length; ++i) {
                out[written++] = name[offset + 1 + i];
            }
            offset += 1 + length;
        }
        return string(out);
    }
}
