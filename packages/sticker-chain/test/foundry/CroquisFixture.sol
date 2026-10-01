// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {Test} from "forge-std/Test.sol";
import {NameCoder} from "ens-v2-lib/ens-contracts/contracts/utils/NameCoder.sol";
import {VerifiableFactory} from "ens-v2-lib/verifiable-factory/src/VerifiableFactory.sol";
import {PermissionedRegistry} from "ens-v2/registry/PermissionedRegistry.sol";
import {UserRegistry} from "ens-v2/registry/UserRegistry.sol";
import {IRegistry} from "ens-v2/registry/interfaces/IRegistry.sol";
import {PermissionedResolver} from "ens-v2/resolver/PermissionedResolver.sol";
import {LibResolution} from "ens-v2/universalResolver/libraries/LibResolution.sol";
import {LabelStore} from "ens-v2/utils/LabelStore.sol";
import {IContractNamer} from "ens-v2/reverse-registrar/interfaces/IContractNamer.sol";
import {ILabelStore} from "ens-v2/utils/interfaces/ILabelStore.sol";

import {CroquisResolver} from "../../contracts/ens/CroquisResolver.sol";
import {
    EnsRoles,
    IEnsRegistry,
    IExtendedResolver,
    IVerifiableFactory
} from "../../contracts/ens/EnsV2.sol";
import {StickerNFT} from "../../contracts/StickerNFT.sol";
import {CroquisSetup} from "../../script/CroquisSetup.sol";

/// @dev A local ENS built from ENSv2's own contracts (a root, .eth, croquis.eth), with everything
///      under croquis.eth deployed the way the deploy script does it.
abstract contract CroquisFixture is Test, CroquisSetup {
    string internal constant PARENT_LABEL = "croquis";
    uint256 internal constant GATEWAY_KEY = 0x6A7E;
    uint256 internal constant RELAYER_KEY = 0xA11CE;
    string internal constant GATEWAY_URL = "https://app.example/api/ens/{sender}/{data}.json";
    bytes4 internal constant ADDR = 0x3b3b57de;
    bytes4 internal constant TEXT = 0x59d1d43c;

    PermissionedRegistry internal root;
    PermissionedRegistry internal ethRegistry;
    StickerNFT internal sticker;
    Croquis internal croquis;
    address internal relayer;

    function setUp() public virtual {
        vm.warp(1_000_000);
        relayer = vm.addr(RELAYER_KEY);
        ILabelStore labelStore = new LabelStore(IContractNamer(address(0)));
        root = new PermissionedRegistry(labelStore, address(this), EnsRoles.ALL);
        ethRegistry = new PermissionedRegistry(labelStore, address(this), EnsRoles.ALL);
        root.register("eth", address(this), ethRegistry, address(0), 0, FOREVER);
        ethRegistry.register(
            PARENT_LABEL, address(this), IRegistry(address(0)), address(0), EnsRoles.ALL, FOREVER
        );

        sticker = new StickerNFT(address(this));
        EnsV2 memory ens = EnsV2(
            IVerifiableFactory(address(new VerifiableFactory())),
            address(new UserRegistry(labelStore, address(this))),
            address(new PermissionedResolver(address(this))),
            IEnsRegistry(address(ethRegistry))
        );
        string[] memory urls = new string[](1);
        urls[0] = GATEWAY_URL;
        croquis = _deployCroquis(
            ens, PARENT_LABEL, address(sticker), address(this), relayer, urls, vm.addr(GATEWAY_KEY)
        );
        _pointCroquisEth(ens, PARENT_LABEL, croquis);
        sticker.grantRole(sticker.SEALER_ROLE(), relayer);
    }

    /// @dev Registry names are ERC-1155 tokens; this contract holds croquis.eth and gifts.croquis.eth.
    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }

    function _seal(address artist, string memory stickerKey) internal returns (uint256 tokenId) {
        vm.prank(relayer);
        tokenId = sticker.sealSticker(
            artist,
            keccak256(bytes(stickerKey)),
            keccak256(bytes(stickerKey)),
            "https://cdn/meta.json"
        );
    }

    function _namePerson(string memory label, address account) internal {
        vm.prank(relayer);
        croquis.names
            .claimPersonName(label, account, "eip155:11155111/erc721:0x0/1", "https://app/@x");
    }

    function _nameSticker(uint256 tokenId, string memory label) internal {
        vm.prank(relayer);
        croquis.names.nameSticker(tokenId, label);
    }

    /// @dev What the Universal Resolver finds for `name`: the nearest resolver up the registries,
    ///      asked through ENSIP-10 when it supports it.
    function _resolve(string memory name, bytes memory call) internal view returns (bytes memory) {
        address resolver = _resolverFor(name);
        require(resolver != address(0), "no resolver");
        return IExtendedResolver(resolver).resolve(NameCoder.encode(name), call);
    }

    function _resolverFor(string memory name) internal view returns (address resolver) {
        (, resolver,,) =
            LibResolution.findResolver(IRegistry(address(root)), NameCoder.encode(name), 0);
    }

    function _addr(string memory name) internal view returns (address) {
        return abi.decode(
            _resolve(
                name, abi.encodeWithSelector(ADDR, NameCoder.namehash(NameCoder.encode(name), 0))
            ),
            (address)
        );
    }

    function _text(string memory name, string memory key) internal view returns (string memory) {
        return abi.decode(
            _resolve(
                name,
                abi.encodeWithSelector(TEXT, NameCoder.namehash(NameCoder.encode(name), 0), key)
            ),
            (string)
        );
    }

    function _nftUri(uint256 tokenId) internal view returns (string memory) {
        return string.concat(
            "eip155:31337/erc721:",
            vm.toLowercase(vm.toString(address(sticker))),
            "/",
            vm.toString(tokenId)
        );
    }
}
