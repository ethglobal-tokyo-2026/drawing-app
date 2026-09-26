// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {EnsNames, IExtendedResolver} from "./EnsV2.sol";

interface IStickerRecords {
    function ownerOf(uint256 tokenId) external view returns (address);
    function artistOf(uint256 tokenId) external view returns (address);
    function contentHashOf(uint256 tokenId) external view returns (bytes32);
}

interface INameBook {
    /// @dev "alice.croquis.eth", or "" when `account` has no name onchain.
    function nameOf(address account) external view returns (string memory);
    /// @dev "0042.alice.croquis.eth", or "" when the sticker has no name.
    function stickerNameOf(uint256 tokenId) external view returns (string memory);
}

interface IGiftRecords {
    function gifts(bytes32 giftId)
        external
        view
        returns (
            address sender,
            address recipient,
            uint256 tokenId,
            bytes32 claimCommitment,
            uint64 expiresAt,
            uint8 status
        );
}

/// @notice The resolver for croquis.eth, every sticker name and every gift name (ENSIP-10).
///         Sticker and gift records are read from StickerNFT and the escrow on every lookup, so they
///         can't drift from what they describe. Any other name under croquis.eth is a person without
///         an onchain name yet: the API answers for them through CCIP-Read (EIP-3668).
contract CroquisResolver is AccessControl, IExtendedResolver {
    /// @dev CroquisNames and the escrow, which point names at sticker and gift records.
    bytes32 public constant NAME_WRITER_ROLE = keccak256("NAME_WRITER_ROLE");

    uint256 private constant COIN_TYPE_ETH = 60;
    bytes4 private constant ADDR = 0x3b3b57de; // addr(bytes32)
    bytes4 private constant ADDR_COIN = 0xf1cb7e06; // addr(bytes32,uint256)
    bytes4 private constant TEXT = 0x59d1d43c; // text(bytes32,string)
    bytes4 private constant MULTICALL = 0xac9650d8; // multicall(bytes[])
    /// @dev StickerGiftEscrow.GiftStatus.Pending.
    uint8 private constant GIFT_PENDING = 1;

    enum Kind {
        None,
        Sticker,
        Gift
    }

    struct Target {
        Kind kind;
        /// @dev The token ID, or the gift ID.
        uint256 id;
    }

    IStickerRecords public immutable STICKERS;
    INameBook public names;
    IGiftRecords public giftRecords;
    string[] private _gatewayUrls;
    mapping(address signer => bool trusted) public isGatewaySigner;
    mapping(bytes32 node => Target target) private _targets;

    event NameTargetSet(bytes32 indexed node, Kind kind, uint256 id);
    event GatewayChanged(string[] urls, address signer, bool trusted);

    error OffchainLookup(
        address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData
    );
    error UnsupportedResolverProfile(bytes4 selector);
    error GatewayAnswerExpired(uint64 expires);
    error UntrustedGatewaySigner(address signer);

    constructor(
        address admin,
        IStickerRecords stickers,
        string[] memory gatewayUrls,
        address gatewaySigner
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        STICKERS = stickers;
        _gatewayUrls = gatewayUrls;
        isGatewaySigner[gatewaySigner] = true;
        emit GatewayChanged(gatewayUrls, gatewaySigner, true);
    }

    /// @dev Set once both exist; each needs this resolver's address to be built.
    function setSources(INameBook names_, IGiftRecords giftRecords_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        names = names_;
        giftRecords = giftRecords_;
    }

    function setGateway(string[] memory urls, address signer, bool trusted)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _gatewayUrls = urls;
        isGatewaySigner[signer] = trusted;
        emit GatewayChanged(urls, signer, trusted);
    }

    function setStickerTarget(bytes32 node, uint256 tokenId) external onlyRole(NAME_WRITER_ROLE) {
        _targets[node] = Target(Kind.Sticker, tokenId);
        emit NameTargetSet(node, Kind.Sticker, tokenId);
    }

    function setGiftTarget(bytes32 node, bytes32 giftId) external onlyRole(NAME_WRITER_ROLE) {
        _targets[node] = Target(Kind.Gift, uint256(giftId));
        emit NameTargetSet(node, Kind.Gift, uint256(giftId));
    }

    function targetOf(bytes32 node) external view returns (Target memory) {
        return _targets[node];
    }

    /// @inheritdoc IExtendedResolver
    function resolve(bytes calldata name, bytes calldata data)
        external
        view
        returns (bytes memory)
    {
        Target memory target = _targets[EnsNames.namehash(name, 0)];
        if (target.kind == Kind.None) {
            bytes memory callData = abi.encodeCall(IExtendedResolver.resolve, (name, data));
            revert OffchainLookup(
                address(this), _gatewayUrls, callData, this.resolveWithProof.selector, callData
            );
        }
        return _answer(target, data);
    }

    /// @notice CCIP-Read callback: the gateway's answer, if a trusted signer signed it and it's current.
    /// @param response abi.encode(bytes result, uint64 expires, bytes signature).
    /// @param extraData The call the gateway answered.
    function resolveWithProof(bytes calldata response, bytes calldata extraData)
        external
        view
        returns (bytes memory)
    {
        (bytes memory result, uint64 expires, bytes memory signature) =
            abi.decode(response, (bytes, uint64, bytes));
        if (expires < block.timestamp) revert GatewayAnswerExpired(expires);
        address signer = ECDSA.recover(gatewayDigest(expires, extraData, result), signature);
        if (!isGatewaySigner[signer]) revert UntrustedGatewaySigner(signer);
        return result;
    }

    /// @dev What the gateway signs, as ENS's OffchainResolver defines it (EIP-191 version 0).
    function gatewayDigest(uint64 expires, bytes memory request, bytes memory result)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                hex"1900", address(this), expires, keccak256(request), keccak256(result)
            )
        );
    }

    function addr(bytes32 node) external view returns (address) {
        return _holder(_targets[node]);
    }

    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _text(_targets[node], key);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IExtendedResolver).interfaceId || interfaceId == ADDR
            || interfaceId == ADDR_COIN || interfaceId == TEXT
            || super.supportsInterface(interfaceId);
    }

    function _answer(Target memory target, bytes memory data) private view returns (bytes memory) {
        bytes4 selector = bytes4(data);
        bytes memory args = _withoutSelector(data);
        if (selector == ADDR) return abi.encode(_holder(target));
        if (selector == ADDR_COIN) {
            (, uint256 coinType) = abi.decode(args, (bytes32, uint256));
            return abi.encode(
                coinType == COIN_TYPE_ETH ? abi.encodePacked(_holder(target)) : new bytes(0)
            );
        }
        if (selector == TEXT) {
            (, string memory key) = abi.decode(args, (bytes32, string));
            return abi.encode(_text(target, key));
        }
        if (selector == MULTICALL) {
            bytes[] memory calls = abi.decode(args, (bytes[]));
            bytes[] memory results = new bytes[](calls.length);
            for (uint256 i; i < calls.length; ++i) {
                results[i] = _answer(target, calls[i]);
            }
            return abi.encode(results);
        }
        revert UnsupportedResolverProfile(selector);
    }

    function _withoutSelector(bytes memory data) private pure returns (bytes memory args) {
        if (data.length < 4) revert UnsupportedResolverProfile(bytes4(0));
        args = new bytes(data.length - 4);
        for (uint256 i; i < args.length; ++i) {
            args[i] = data[i + 4];
        }
    }

    function _holder(Target memory target) private view returns (address) {
        if (target.kind == Kind.Sticker) return STICKERS.ownerOf(target.id);
        if (target.kind == Kind.Gift) {
            (address sender,,,, uint64 expiresAt, uint8 status) =
                giftRecords.gifts(bytes32(target.id));
            return _isWaiting(expiresAt, status) ? sender : address(0);
        }
        return address(0);
    }

    function _text(Target memory target, string memory key) private view returns (string memory) {
        bytes32 k = keccak256(bytes(key));
        if (target.kind == Kind.Sticker) {
            if (k == keccak256("avatar")) return _nftUri(target.id);
            if (k == keccak256("com.croquis.artist")) {
                return names.nameOf(STICKERS.artistOf(target.id));
            }
            if (k == keccak256("com.croquis.content-hash")) {
                return Strings.toHexString(uint256(STICKERS.contentHashOf(target.id)), 32);
            }
            return "";
        }
        if (target.kind == Kind.Gift) {
            // Like the gift message, a gift name never shows which sticker is inside.
            (address sender,,, bytes32 commitment, uint64 expiresAt, uint8 status) =
                giftRecords.gifts(bytes32(target.id));
            if (!_isWaiting(expiresAt, status)) return "";
            if (k == keccak256("com.croquis.from")) return names.nameOf(sender);
            if (k == keccak256("com.croquis.claim-commitment")) {
                return Strings.toHexString(uint256(commitment), 32);
            }
            if (k == keccak256("com.croquis.expires-at")) return Strings.toString(expiresAt);
            return "";
        }
        return "";
    }

    /// @dev A gift's name answers only while the gift waits, as its registry entry does. Lookups
    ///      after it ends still reach this resolver through croquis.eth.
    function _isWaiting(uint64 expiresAt, uint8 status) private view returns (bool) {
        return status == GIFT_PENDING && block.timestamp < expiresAt;
    }

    /// @dev ENSIP-12's NFT avatar.
    function _nftUri(uint256 tokenId) private view returns (string memory) {
        return string.concat(
            "eip155:",
            Strings.toString(block.chainid),
            "/erc721:",
            Strings.toHexString(address(STICKERS)),
            "/",
            Strings.toString(tokenId)
        );
    }
}
