// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StickerNFT} from "../../contracts/StickerNFT.sol";

contract StickerNFTTest is Test {
    StickerNFT private sticker;

    address private artist = makeAddr("artist");
    address private recipient = makeAddr("recipient");
    address private stranger = makeAddr("stranger");

    bytes32 private constant STICKER_ID = keccak256("sticker-123");
    bytes32 private constant CONTENT_HASH = keccak256("sealed-sticker-bytes");
    string private constant STICKER_URI = "ipfs://bafybeigdyrzt5sticker/metadata.json";

    function setUp() public {
        sticker = new StickerNFT(address(this));
    }

    function testSealStickerMintsToArtistWithProvenance() public {
        uint256 tokenId = sticker.sealSticker(artist, STICKER_ID, CONTENT_HASH, STICKER_URI);

        assertEq(tokenId, 1);
        assertEq(sticker.ownerOf(tokenId), artist);
        assertEq(sticker.artistOf(tokenId), artist);
        assertEq(sticker.contentHashOf(tokenId), CONTENT_HASH);
        assertEq(sticker.tokenURI(tokenId), STICKER_URI);
    }

    function testOnlyApprovedSealerCanSeal() public {
        vm.prank(stranger);
        vm.expectRevert();
        sticker.sealSticker(artist, STICKER_ID, CONTENT_HASH, STICKER_URI);
    }

    function testStickerCanOnlyBeSealedOnce() public {
        sticker.sealSticker(artist, STICKER_ID, CONTENT_HASH, STICKER_URI);

        vm.expectRevert(
            abi.encodeWithSelector(StickerNFT.StickerAlreadySealed.selector, STICKER_ID)
        );
        sticker.sealSticker(artist, STICKER_ID, CONTENT_HASH, STICKER_URI);
        assertEq(sticker.balanceOf(artist), 1);
    }

    function testTransferKeepsOriginalArtistAndContent() public {
        uint256 tokenId = sticker.sealSticker(artist, STICKER_ID, CONTENT_HASH, STICKER_URI);

        vm.prank(artist);
        sticker.safeTransferFrom(artist, recipient, tokenId);

        assertEq(sticker.ownerOf(tokenId), recipient);
        assertEq(sticker.artistOf(tokenId), artist);
        assertEq(sticker.contentHashOf(tokenId), CONTENT_HASH);
    }
}
