// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {IEnsRegistry} from "../../contracts/ens/EnsV2.sol";
import {StickerGiftEscrow} from "../../contracts/StickerGiftEscrow.sol";
import {CroquisFixture} from "./CroquisFixture.sol";

contract StickerGiftEscrowTest is CroquisFixture {
    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant NAME_HASH = keccak256("StickerGiftEscrow");
    bytes32 private constant VERSION_HASH = keccak256("1");
    bytes32 private constant GIFT_ID = keccak256("gift-1");
    bytes32 private constant CLAIM_TOKEN = keccak256("claim-token");
    bytes32 private constant CLAIM_COMMITMENT = keccak256(abi.encode(CLAIM_TOKEN));

    uint256 private constant STRANGER_KEY = 0xB0B;

    StickerGiftEscrow private escrow;
    address private artist = makeAddr("artist");
    address private recipient = makeAddr("recipient");
    string private giftName;
    uint256 private giftLabelId;

    function setUp() public override {
        super.setUp();
        escrow = croquis.escrow;
        _namePerson("alice", artist);
        _nameSticker(_seal(artist, "sticker-for-giving"), "0001");
        giftName = string.concat(escrow.giftLabel(GIFT_ID), ".gifts.croquis.eth");
        giftLabelId = uint256(keccak256(bytes(escrow.giftLabel(GIFT_ID))));
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

    function testGiftNameResolvesToTheGiverWhileTheGiftWaits() public {
        uint64 expiresAt = uint64(block.timestamp + 1 hours);
        _stageGift(expiresAt);

        assertEq(escrow.giftLabel(GIFT_ID), _expectedLabel(GIFT_ID));
        assertEq(croquis.giftsRegistry.getOwner(giftLabelId), artist);
        assertEq(croquis.giftsRegistry.getExpiry(giftLabelId), expiresAt);
        assertEq(_addr(giftName), artist);
        assertEq(_text(giftName, "com.croquis.from"), "alice.croquis.eth");
        assertEq(_text(giftName, "com.croquis.claim-commitment"), vm.toString(CLAIM_COMMITMENT));
        assertEq(_text(giftName, "com.croquis.expires-at"), vm.toString(expiresAt));
        assertEq(_text(giftName, "avatar"), "");
    }

    function testRelayerClaimsForLaterCreatedAccount() public {
        uint256 authorizationDeadline = block.timestamp + 10 minutes;
        _stageGift(uint64(block.timestamp + 1 hours));
        bytes memory authorization =
            _claimAuthorization(RELAYER_KEY, recipient, authorizationDeadline);

        vm.prank(relayer);
        escrow.claimGift(GIFT_ID, recipient, authorizationDeadline, authorization);

        assertEq(sticker.ownerOf(1), recipient);
        assertEq(escrow.pendingGiftForToken(1), bytes32(0));
        _assertGiftNameEnded();
        _assertStickerNameHeldBy(recipient);
    }

    function testClaimRejectsUnauthorizedSigner() public {
        uint256 authorizationDeadline = block.timestamp + 10 minutes;
        _stageGift(uint64(block.timestamp + 1 hours));
        bytes memory authorization =
            _claimAuthorization(STRANGER_KEY, recipient, authorizationDeadline);

        vm.expectRevert(StickerGiftEscrow.InvalidSigner.selector);
        escrow.claimGift(GIFT_ID, recipient, authorizationDeadline, authorization);
    }

    function testSenderCanTakeStickerOut() public {
        _stageGift(uint64(block.timestamp + 1 hours));

        vm.prank(artist);
        escrow.takeOut(GIFT_ID);

        assertEq(sticker.ownerOf(1), artist);
        assertEq(escrow.pendingGiftForToken(1), bytes32(0));
        (,,,,, StickerGiftEscrow.GiftStatus status) = escrow.gifts(GIFT_ID);
        assertEq(uint8(status), uint8(StickerGiftEscrow.GiftStatus.Rejected));
        _assertGiftNameEnded();
    }

    function testOnlySenderCanTakeStickerOut() public {
        _stageGift(uint64(block.timestamp + 1 hours));

        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(StickerGiftEscrow.NotGiftSender.selector, GIFT_ID, relayer)
        );
        escrow.takeOut(GIFT_ID);

        assertEq(sticker.ownerOf(1), address(escrow));
    }

    function testGiftNameEndsWhenTheGiftExpires() public {
        uint64 expiresAt = uint64(block.timestamp + 1 minutes);
        _stageGift(expiresAt);
        vm.warp(expiresAt);

        _assertGiftNameEnded();

        vm.warp(expiresAt + 1);
        vm.prank(makeAddr("stranger"));
        escrow.returnExpiredGift(GIFT_ID);

        assertEq(sticker.ownerOf(1), artist);
        assertEq(escrow.pendingGiftForToken(1), bytes32(0));
        _assertStickerNameHeldBy(artist);
    }

    function testClaimAtTheLastSecondEndsTheGift() public {
        uint64 expiresAt = uint64(block.timestamp + 1 minutes);
        _stageGift(expiresAt);
        vm.warp(expiresAt);
        bytes memory authorization = _claimAuthorization(RELAYER_KEY, recipient, expiresAt);

        escrow.claimGift(GIFT_ID, recipient, expiresAt, authorization);

        assertEq(sticker.ownerOf(1), recipient);
        _assertStickerNameHeldBy(recipient);
    }

    function testGiftFromSomeoneWithoutANameStillStages() public {
        address holder = makeAddr("holder");
        vm.prank(artist);
        sticker.transferFrom(artist, holder, 1);

        bytes memory data = abi.encode(GIFT_ID, CLAIM_COMMITMENT, uint64(block.timestamp + 1 hours));
        vm.prank(holder);
        sticker.safeTransferFrom(holder, address(escrow), 1, data);

        assertEq(_addr(giftName), holder);
        assertEq(_text(giftName, "com.croquis.from"), "");
    }

    function _assertGiftNameEnded() private view {
        assertEq(croquis.giftsRegistry.getOwner(giftLabelId), address(0));
        assertEq(_addr(giftName), address(0));
        assertEq(_text(giftName, "com.croquis.from"), "");
    }

    function _assertStickerNameHeldBy(address holder) private view {
        assertEq(
            IEnsRegistry(croquis.names.registryOf(artist)).getOwner(uint256(keccak256("0001"))),
            holder
        );
        assertEq(_addr("0001.alice.croquis.eth"), holder);
    }

    function _expectedLabel(bytes32 giftId) private pure returns (string memory) {
        bytes memory hexId = bytes(vm.toString(giftId));
        bytes memory label = new bytes(18);
        label[0] = "g";
        label[1] = "-";
        for (uint256 i; i < 16; ++i) {
            label[2 + i] = hexId[2 + i];
        }
        return string(label);
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

