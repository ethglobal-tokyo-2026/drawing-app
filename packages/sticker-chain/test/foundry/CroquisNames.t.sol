// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {NameCoder} from "ens-v2-lib/ens-contracts/contracts/utils/NameCoder.sol";
import {PermissionedRegistry} from "ens-v2/registry/PermissionedRegistry.sol";

import {CroquisNames} from "../../contracts/ens/CroquisNames.sol";
import {CroquisResolver, IGiftRecords, INameBook} from "../../contracts/ens/CroquisResolver.sol";
import {
    IEnsPermissionedResolver,
    IEnsRegistry,
    IExtendedResolver
} from "../../contracts/ens/EnsV2.sol";
import {CroquisFixture} from "./CroquisFixture.sol";

contract CroquisNamesTest is CroquisFixture {
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");
    uint256 private constant ALICE_ID = uint256(keccak256("alice"));

    function testPersonNameResolvesFromTheirOwnResolver() public {
        _namePerson("alice", alice);

        assertEq(croquis.names.nameOf(alice), "alice.croquis.eth");
        assertEq(croquis.croquisRegistry.getOwner(ALICE_ID), alice);
        assertEq(croquis.croquisRegistry.getExpiry(ALICE_ID), type(uint64).max);
        assertEq(_addr("alice.croquis.eth"), alice);
        assertEq(_text("alice.croquis.eth", "url"), "https://app/@x");
        assertEq(_text("alice.croquis.eth", "avatar"), "eip155:11155111/erc721:0x0/1");
    }

    function testNobodyCanTakeAPersonNameBackOrTransferIt() public {
        _namePerson("alice", alice);
        PermissionedRegistry registry = PermissionedRegistry(address(croquis.croquisRegistry));

        assertTrue(registry.isEmancipated());
        vm.expectRevert();
        registry.unregister(ALICE_ID);
        vm.expectRevert();
        _namePerson("alice", bob);

        uint256 tokenId = registry.getTokenId(ALICE_ID);
        vm.prank(alice);
        vm.expectRevert();
        registry.safeTransferFrom(alice, bob, tokenId, 1, "");
        assertEq(registry.getOwner(ALICE_ID), alice);
    }

    function testTheAppCanOnlyChangeAPersonsAvatar() public {
        _namePerson("alice", alice);
        IEnsPermissionedResolver resolver =
            IEnsPermissionedResolver(croquis.names.resolverOf(alice));
        bytes memory name = NameCoder.encode("alice.croquis.eth");

        vm.prank(relayer);
        croquis.names.setAvatar(alice, "eip155:11155111/erc721:0x0/2");
        assertEq(_text("alice.croquis.eth", "avatar"), "eip155:11155111/erc721:0x0/2");

        vm.prank(address(croquis.names));
        vm.expectRevert();
        resolver.setText(name, "url", "https://elsewhere");

        vm.prank(alice);
        resolver.setText(name, "url", "https://alice.example");
        assertEq(_text("alice.croquis.eth", "url"), "https://alice.example");
    }

    function testOnlyTheRelayerNamesPeopleAndStickers() public {
        vm.prank(bob);
        vm.expectRevert();
        croquis.names.claimPersonName("bob", bob, "", "");
    }

    function testNotEvenTheAdminCanRepointTheResolversSources() public {
        vm.expectRevert(CroquisResolver.SourcesAlreadySet.selector);
        croquis.resolver.setSources(INameBook(bob), IGiftRecords(bob));
    }

    function testAPersonWithoutAnOnchainNameResolvesThroughTheGateway() public {
        bytes memory name = NameCoder.encode("bob.croquis.eth");
        bytes memory call = abi.encodeWithSelector(ADDR, NameCoder.namehash(name, 0));
        bytes memory request = abi.encodeCall(IExtendedResolver.resolve, (name, call));
        string[] memory urls = new string[](1);
        urls[0] = GATEWAY_URL;

        assertEq(_resolverFor("bob.croquis.eth"), address(croquis.resolver));
        vm.expectRevert(
            abi.encodeWithSelector(
                CroquisResolver.OffchainLookup.selector,
                address(croquis.resolver),
                urls,
                request,
                CroquisResolver.resolveWithProof.selector,
                request
            )
        );
        croquis.resolver.resolve(name, call);

        bytes memory result = abi.encode(bob);
        uint64 expires = uint64(block.timestamp + 5 minutes);
        assertEq(
            croquis.resolver
                .resolveWithProof(_gatewayAnswer(GATEWAY_KEY, result, expires, request), request),
            result
        );

        bytes memory forged = _gatewayAnswer(0xBAD, result, expires, request);
        vm.expectRevert(
            abi.encodeWithSelector(CroquisResolver.UntrustedGatewaySigner.selector, vm.addr(0xBAD))
        );
        croquis.resolver.resolveWithProof(forged, request);

        bytes memory stale = _gatewayAnswer(GATEWAY_KEY, result, expires, request);
        vm.warp(expires + 1);
        vm.expectRevert(
            abi.encodeWithSelector(CroquisResolver.GatewayAnswerExpired.selector, expires)
        );
        croquis.resolver.resolveWithProof(stale, request);
    }

    function testStickerNameCarriesItsSealUnderItsArtist() public {
        _namePerson("alice", alice);
        uint256 tokenId = _seal(alice, "first");
        _nameSticker(tokenId, "0001");

        assertEq(croquis.names.stickerNameOf(tokenId), "0001.alice.croquis.eth");
        assertEq(_addr("0001.alice.croquis.eth"), alice);
        assertEq(_text("0001.alice.croquis.eth", "com.croquis.artist"), "alice.croquis.eth");
        assertEq(_text("0001.alice.croquis.eth", "avatar"), _nftUri(tokenId));
        assertEq(
            _text("0001.alice.croquis.eth", "com.croquis.content-hash"),
            vm.toString(keccak256("first"))
        );
    }

    function testStickerNameFollowsItsNft() public {
        _namePerson("alice", alice);
        uint256 tokenId = _seal(alice, "first");
        _nameSticker(tokenId, "0001");
        IEnsRegistry artistRegistry = IEnsRegistry(croquis.names.registryOf(alice));
        uint256 labelId = uint256(keccak256("0001"));

        vm.prank(alice);
        sticker.transferFrom(alice, bob, tokenId);
        croquis.names.syncSticker(tokenId);

        assertEq(artistRegistry.getOwner(labelId), bob);
        assertEq(_addr("0001.alice.croquis.eth"), bob);
        assertEq(_text("0001.alice.croquis.eth", "com.croquis.artist"), "alice.croquis.eth");

        vm.recordLogs();
        croquis.names.syncSticker(tokenId);
        assertEq(vm.getRecordedLogs().length, 0);
    }

    function testStickerNeedsItsArtistsNameAndIsNamedOnce() public {
        uint256 tokenId = _seal(alice, "first");
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(CroquisNames.ArtistHasNoName.selector, alice));
        croquis.names.nameSticker(tokenId, "0001");

        _namePerson("alice", alice);
        _nameSticker(tokenId, "0001");
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(CroquisNames.StickerAlreadyNamed.selector, tokenId));
        croquis.names.nameSticker(tokenId, "0002");
    }

    function _gatewayAnswer(uint256 key, bytes memory result, uint64 expires, bytes memory request)
        private
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(key, croquis.resolver.gatewayDigest(expires, request, result));
        return abi.encode(result, expires, abi.encodePacked(r, s, v));
    }
}
