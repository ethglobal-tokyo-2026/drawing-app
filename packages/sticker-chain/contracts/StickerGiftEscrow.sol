// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {CroquisNames} from "./ens/CroquisNames.sol";
import {CroquisResolver} from "./ens/CroquisResolver.sol";
import {EnsNames, IEnsRegistry} from "./ens/EnsV2.sol";

/// @notice Holds a sticker after Giving until it's received, its sender takes it out, or it expires.
///         While it waits, the gift has a name, g-<first 8 bytes of giftId>.gifts.croquis-app.eth,
///         that expires with it.
contract StickerGiftEscrow is AccessControl, EIP712, IERC721Receiver, ReentrancyGuard {
    bytes32 public constant CLAIM_SIGNER_ROLE = keccak256("CLAIM_SIGNER_ROLE");
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("GiftClaim(bytes32 giftId,address recipient,uint256 authorizationDeadline)");

    enum GiftStatus {
        Missing,
        Pending,
        Claimed,
        Rejected,
        ExpiredReturned
    }

    struct Gift {
        address sender;
        address recipient;
        uint256 tokenId;
        bytes32 claimCommitment;
        uint64 expiresAt;
        GiftStatus status;
    }

    IERC721 public immutable sticker;
    CroquisNames public immutable names;
    CroquisResolver public immutable resolver;
    /// @dev gifts.croquis-app.eth's subregistry. This contract holds its registrar and
    ///      unregister roles.
    IEnsRegistry public immutable giftsRegistry;
    bytes32 public immutable giftsNode;
    mapping(bytes32 giftId => Gift gift) public gifts;
    mapping(uint256 tokenId => bytes32 giftId) public pendingGiftForToken;

    event GiftStaged(
        bytes32 indexed giftId,
        uint256 indexed tokenId,
        address indexed sender,
        bytes32 claimCommitment,
        uint64 expiresAt
    );
    event GiftClaimed(bytes32 indexed giftId, uint256 indexed tokenId, address indexed recipient);
    event GiftTakenOut(bytes32 indexed giftId, uint256 indexed tokenId, address indexed sender);
    event ExpiredGiftReturned(
        bytes32 indexed giftId, uint256 indexed tokenId, address indexed sender
    );

    error AuthorizationExpired();
    error GiftAlreadyExists(bytes32 giftId);
    error GiftIsNotPending(bytes32 giftId);
    error GiftNotExpired(bytes32 giftId);
    error InvalidGift();
    error InvalidSigner();
    error NotGiftSender(bytes32 giftId, address caller);
    error StickerAlreadyPending(uint256 tokenId);
    error UnsupportedSticker(address token);

    constructor(
        address stickerAddress,
        address admin,
        address claimSigner,
        CroquisNames names_,
        IEnsRegistry giftsRegistry_
    ) EIP712("StickerGiftEscrow", "1") {
        if (stickerAddress == address(0) || admin == address(0) || claimSigner == address(0)) {
            revert InvalidGift();
        }
        sticker = IERC721(stickerAddress);
        names = names_;
        resolver = names_.RESOLVER();
        giftsRegistry = giftsRegistry_;
        giftsNode = EnsNames.node(names_.PARENT_NODE(), "gifts");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CLAIM_SIGNER_ROLE, claimSigner);
    }

    /// @dev data must encode (bytes32 giftId, bytes32 claimCommitment, uint64 expiresAt).
    function onERC721Received(address, address from, uint256 tokenId, bytes calldata data)
        external
        nonReentrant
        returns (bytes4)
    {
        if (msg.sender != address(sticker)) revert UnsupportedSticker(msg.sender);
        (bytes32 giftId, bytes32 claimCommitment, uint64 expiresAt) =
            abi.decode(data, (bytes32, bytes32, uint64));
        if (
            from == address(0) || giftId == bytes32(0) || claimCommitment == bytes32(0)
                || expiresAt <= block.timestamp
        ) {
            revert InvalidGift();
        }
        if (gifts[giftId].status != GiftStatus.Missing) revert GiftAlreadyExists(giftId);
        if (pendingGiftForToken[tokenId] != bytes32(0)) revert StickerAlreadyPending(tokenId);

        gifts[giftId] = Gift({
            sender: from,
            recipient: address(0),
            tokenId: tokenId,
            claimCommitment: claimCommitment,
            expiresAt: expiresAt,
            status: GiftStatus.Pending
        });
        pendingGiftForToken[tokenId] = giftId;
        string memory label = giftLabel(giftId);
        giftsRegistry.register(label, from, address(0), address(resolver), 0, expiresAt);
        resolver.setGiftTarget(EnsNames.node(giftsNode, label), giftId);
        emit GiftStaged(giftId, tokenId, from, claimCommitment, expiresAt);
        return IERC721Receiver.onERC721Received.selector;
    }

    function claimGift(
        bytes32 giftId,
        address recipient,
        uint256 authorizationDeadline,
        bytes calldata authorization
    ) external nonReentrant {
        Gift storage gift = _pendingGift(giftId);
        if (recipient == address(0)) revert InvalidGift();
        if (block.timestamp > gift.expiresAt || block.timestamp > authorizationDeadline) {
            revert AuthorizationExpired();
        }
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(CLAIM_TYPEHASH, giftId, recipient, authorizationDeadline))
        );
        if (!hasRole(CLAIM_SIGNER_ROLE, ECDSA.recover(digest, authorization))) {
            revert InvalidSigner();
        }

        gift.status = GiftStatus.Claimed;
        gift.recipient = recipient;
        delete pendingGiftForToken[gift.tokenId];
        _endGiftName(giftId);
        sticker.safeTransferFrom(address(this), recipient, gift.tokenId);
        names.syncSticker(gift.tokenId);
        emit GiftClaimed(giftId, gift.tokenId, recipient);
    }

    /// @notice Lets the original sender take a pending sticker back without a backend signature.
    function takeOut(bytes32 giftId) external nonReentrant {
        Gift storage gift = _pendingGift(giftId);
        if (msg.sender != gift.sender) revert NotGiftSender(giftId, msg.sender);

        // Rejected marks a take-out: the database mirrors GiftStatus and reads rejected as one.
        gift.status = GiftStatus.Rejected;
        delete pendingGiftForToken[gift.tokenId];
        _endGiftName(giftId);
        sticker.safeTransferFrom(address(this), gift.sender, gift.tokenId);
        names.syncSticker(gift.tokenId);
        emit GiftTakenOut(giftId, gift.tokenId, gift.sender);
    }

    function returnExpiredGift(bytes32 giftId) external nonReentrant {
        Gift storage gift = _pendingGift(giftId);
        if (block.timestamp <= gift.expiresAt) revert GiftNotExpired(giftId);

        gift.status = GiftStatus.ExpiredReturned;
        delete pendingGiftForToken[gift.tokenId];
        // The gift's name expired with it.
        sticker.safeTransferFrom(address(this), gift.sender, gift.tokenId);
        names.syncSticker(gift.tokenId);
        emit ExpiredGiftReturned(giftId, gift.tokenId, gift.sender);
    }

    /// @notice The gift name's label: g- and the first 8 bytes of the gift ID, in lowercase hex.
    function giftLabel(bytes32 giftId) public pure returns (string memory) {
        bytes memory label = new bytes(18);
        label[0] = "g";
        label[1] = "-";
        for (uint256 i; i < 8; ++i) {
            uint8 b = uint8(giftId[i]);
            label[2 + 2 * i] = _hexDigit(b >> 4);
            label[3 + 2 * i] = _hexDigit(b & 0x0f);
        }
        return string(label);
    }

    /// @dev Accepts a sticker's name, which follows the sticker here if someone syncs it mid-gift.
    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }

    /// @dev A gift name ends when the gift does; one past its expiry has already ended by itself.
    function _endGiftName(bytes32 giftId) private {
        uint256 labelId = uint256(keccak256(bytes(giftLabel(giftId))));
        if (giftsRegistry.getExpiry(labelId) > block.timestamp) giftsRegistry.unregister(labelId);
    }

    function _hexDigit(uint8 value) private pure returns (bytes1) {
        return bytes1(value < 10 ? value + 0x30 : value + 0x57);
    }

    function _pendingGift(bytes32 giftId) private view returns (Gift storage gift) {
        gift = gifts[giftId];
        if (gift.status != GiftStatus.Pending) revert GiftIsNotPending(giftId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return interfaceId == type(IERC721Receiver).interfaceId
            || interfaceId == this.onERC1155Received.selector
            || super.supportsInterface(interfaceId);
    }
}
