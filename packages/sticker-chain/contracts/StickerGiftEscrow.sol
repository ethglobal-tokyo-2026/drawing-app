// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Holds a sticker after Giving until the recipient accepts or rejects it.
contract StickerGiftEscrow is AccessControl, EIP712, IERC721Receiver, ReentrancyGuard {
    bytes32 public constant CLAIM_SIGNER_ROLE = keccak256("CLAIM_SIGNER_ROLE");
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("GiftClaim(bytes32 giftId,address recipient,uint256 authorizationDeadline)");
    bytes32 public constant REJECT_TYPEHASH =
        keccak256("GiftReject(bytes32 giftId,uint256 authorizationDeadline)");

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
    event GiftRejected(bytes32 indexed giftId, uint256 indexed tokenId, address indexed sender);
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

    constructor(address stickerAddress, address admin, address claimSigner)
        EIP712("StickerGiftEscrow", "1")
    {
        if (stickerAddress == address(0) || admin == address(0) || claimSigner == address(0)) {
            revert InvalidGift();
        }
        sticker = IERC721(stickerAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CLAIM_SIGNER_ROLE, claimSigner);
    }

    /// @dev data must encode (bytes32 giftId, bytes32 claimCommitment, uint64 expiresAt).
    function onERC721Received(address, address from, uint256 tokenId, bytes calldata data)
        external
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
        sticker.safeTransferFrom(address(this), recipient, gift.tokenId);
        emit GiftClaimed(giftId, gift.tokenId, recipient);
    }

    function rejectGift(bytes32 giftId, uint256 authorizationDeadline, bytes calldata authorization)
        external
        nonReentrant
    {
        Gift storage gift = _pendingGift(giftId);
        if (block.timestamp > gift.expiresAt || block.timestamp > authorizationDeadline) {
            revert AuthorizationExpired();
        }
        bytes32 digest =
            _hashTypedDataV4(keccak256(abi.encode(REJECT_TYPEHASH, giftId, authorizationDeadline)));
        if (!hasRole(CLAIM_SIGNER_ROLE, ECDSA.recover(digest, authorization))) {
            revert InvalidSigner();
        }

        gift.status = GiftStatus.Rejected;
        delete pendingGiftForToken[gift.tokenId];
        sticker.safeTransferFrom(address(this), gift.sender, gift.tokenId);
        emit GiftRejected(giftId, gift.tokenId, gift.sender);
    }

    /// @notice Lets the original sender take a pending sticker back without a backend signature.
    function takeOut(bytes32 giftId) external nonReentrant {
        Gift storage gift = _pendingGift(giftId);
        if (msg.sender != gift.sender) revert NotGiftSender(giftId, msg.sender);

        // The database already uses Rejected for every sender return before expiry. The dedicated
        // event distinguishes a take-out from a backend-authorized rejection.
        gift.status = GiftStatus.Rejected;
        delete pendingGiftForToken[gift.tokenId];
        sticker.safeTransferFrom(address(this), gift.sender, gift.tokenId);
        emit GiftTakenOut(giftId, gift.tokenId, gift.sender);
    }

    function returnExpiredGift(bytes32 giftId) external nonReentrant {
        Gift storage gift = _pendingGift(giftId);
        if (block.timestamp <= gift.expiresAt) revert GiftNotExpired(giftId);

        gift.status = GiftStatus.ExpiredReturned;
        delete pendingGiftForToken[gift.tokenId];
        sticker.safeTransferFrom(address(this), gift.sender, gift.tokenId);
        emit ExpiredGiftReturned(giftId, gift.tokenId, gift.sender);
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
            || super.supportsInterface(interfaceId);
    }
}
