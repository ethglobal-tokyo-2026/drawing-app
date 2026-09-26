// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StickerGiftEscrow} from "../../contracts/StickerGiftEscrow.sol";
import {StickerNFT} from "../../contracts/StickerNFT.sol";

contract StickerGiftEscrowTest is Test {
    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant NAME_HASH = keccak256("StickerGiftEscrow");
    bytes32 private constant VERSION_HASH = keccak256("1");
    bytes32 private constant GIFT_ID = keccak256("gift-1");
    bytes32 private constant CLAIM_TOKEN = keccak256("claim-token");
    bytes32 private constant CLAIM_COMMITMENT = keccak256(abi.encode(CLAIM_TOKEN));
    bytes32 private constant CONTENT_HASH = keccak256("sealed-sticker-bytes");

    uint256 private constant CLAIM_SIGNER_KEY = 0xA11CE;
    uint256 private constant STRANGER_KEY = 0xB0B;

    StickerNFT private sticker;
    StickerGiftEscrow private escrow;
    address private artist = makeAddr("artist");
    address private recipient = makeAddr("recipient");
    address private relayer = makeAddr("relayer");
    address private claimSigner;

    function setUp() public {
        vm.warp(1_000_000);
        claimSigner = vm.addr(CLAIM_SIGNER_KEY);
        sticker = new StickerNFT(address(this));
        escrow = new StickerGiftEscrow(address(sticker), address(this), claimSigner);
        sticker.sealSticker(
            artist, keccak256("sticker-for-giving"), CONTENT_HASH, "ipfs://sticker/metadata.json"
        );
    }

    function testStagesGiftBeforeRecipientHasAccount() public {
        uint64 expiresAt = uint64(block.timestamp + 1 hours);
        _stageGift(expiresAt);

        assertEq(sticker.ownerOf(1), address(escrow));
        (
            address sender,
            address storedRecipient,
            uint256 tokenId,
            bytes32 claimCommitment,
            uint64 storedExpiresAt,
            StickerGiftEscrow.GiftStatus status
        ) = escrow.gifts(GIFT_ID);
        assertEq(sender, artist);
        assertEq(storedRecipient, address(0));
        assertEq(tokenId, 1);
        assertEq(claimCommitment, CLAIM_COMMITMENT);
        assertEq(storedExpiresAt, expiresAt);
        assertEq(uint8(status), uint8(StickerGiftEscrow.GiftStatus.Pending));
    }

    function testRelayerClaimsForLaterCreatedAccount() public {
        uint64 expiresAt = uint64(block.timestamp + 1 hours);
        uint256 authorizationDeadline = block.timestamp + 10 minutes;
        _stageGift(expiresAt);
        bytes memory authorization =
            _claimAuthorization(CLAIM_SIGNER_KEY, recipient, authorizationDeadline);

        vm.prank(relayer);
        escrow.claimGift(GIFT_ID, recipient, authorizationDeadline, authorization);

        assertEq(sticker.ownerOf(1), recipient);
        assertEq(escrow.pendingGiftForToken(1), bytes32(0));
    }

    function testClaimRejectsUnauthorizedSigner() public {
        uint64 expiresAt = uint64(block.timestamp + 1 hours);
        uint256 authorizationDeadline = block.timestamp + 10 minutes;
        _stageGift(expiresAt);
        bytes memory authorization =
            _claimAuthorization(STRANGER_KEY, recipient, authorizationDeadline);

        vm.expectRevert(StickerGiftEscrow.InvalidSigner.selector);
        escrow.claimGift(GIFT_ID, recipient, authorizationDeadline, authorization);
    }

    function testRejectionReturnsStickerToSender() public {
        uint64 expiresAt = uint64(block.timestamp + 1 hours);
        uint256 authorizationDeadline = block.timestamp + 10 minutes;
        _stageGift(expiresAt);
        bytes memory authorization = _rejectAuthorization(CLAIM_SIGNER_KEY, authorizationDeadline);

        vm.prank(relayer);
        escrow.rejectGift(GIFT_ID, authorizationDeadline, authorization);

        assertEq(sticker.ownerOf(1), artist);
        assertEq(escrow.pendingGiftForToken(1), bytes32(0));
    }

    function testAnyoneCanReturnExpiredGift() public {
        uint64 expiresAt = uint64(block.timestamp + 1 minutes);
        _stageGift(expiresAt);
        vm.warp(expiresAt + 1);

        vm.prank(makeAddr("stranger"));
        escrow.returnExpiredGift(GIFT_ID);

        assertEq(sticker.ownerOf(1), artist);
        assertEq(escrow.pendingGiftForToken(1), bytes32(0));
    }

    function _stageGift(uint64 expiresAt) private {
        bytes memory data = abi.encode(GIFT_ID, CLAIM_COMMITMENT, expiresAt);
        vm.prank(artist);
        sticker.safeTransferFrom(artist, address(escrow), 1, data);
    }

    function _claimAuthorization(
        uint256 signerKey,
        address claimRecipient,
        uint256 authorizationDeadline
    ) private view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(escrow.CLAIM_TYPEHASH(), GIFT_ID, claimRecipient, authorizationDeadline)
        );
        return _sign(signerKey, _typedDataHash(structHash));
    }

    function _rejectAuthorization(uint256 signerKey, uint256 authorizationDeadline)
        private
        view
        returns (bytes memory)
    {
        bytes32 structHash =
            keccak256(abi.encode(escrow.REJECT_TYPEHASH(), GIFT_ID, authorizationDeadline));
        return _sign(signerKey, _typedDataHash(structHash));
    }

    function _typedDataHash(bytes32 structHash) private view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(escrow))
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _sign(uint256 signerKey, bytes32 digest) private pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
