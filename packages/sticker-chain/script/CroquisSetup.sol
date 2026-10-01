// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CroquisNames} from "../contracts/ens/CroquisNames.sol";
import {CroquisResolver, IGiftRecords, IStickerRecords} from "../contracts/ens/CroquisResolver.sol";
import {
    EnsGrant,
    EnsNames,
    EnsRoles,
    IEnsRegistry,
    IEnsUserRegistry,
    IVerifiableFactory
} from "../contracts/ens/EnsV2.sol";
import {StickerGiftEscrow} from "../contracts/StickerGiftEscrow.sol";

/// @dev Builds everything under the parent name, `parentLabel`.eth, and the escrow. The deploy
///      script and the tests share it, so tests deploy and grant roles exactly as production does.
///      `self` is the account that sends each call.
abstract contract CroquisSetup {
    uint64 internal constant FOREVER = type(uint64).max;

    struct EnsV2 {
        IVerifiableFactory factory;
        address registryImplementation;
        address resolverImplementation;
        /// @dev .eth's registry, where the parent name is registered.
        IEnsRegistry ethRegistry;
    }

    struct Croquis {
        CroquisResolver resolver;
        CroquisNames names;
        IEnsRegistry croquisRegistry;
        IEnsRegistry giftsRegistry;
        StickerGiftEscrow escrow;
    }

    function _deployCroquis(
        EnsV2 memory ens,
        string memory parentLabel,
        address sticker,
        address self,
        address relayer,
        string[] memory gatewayUrls,
        address gatewaySigner
    ) internal returns (Croquis memory c) {
        c.resolver = new CroquisResolver(self, IStickerRecords(sticker), gatewayUrls, gatewaySigner);

        uint256 croquisSetup = EnsRoles.REGISTRAR | EnsRoles.REGISTRAR_ADMIN | EnsRoles.SET_PARENT
            | EnsRoles.SET_PARENT_ADMIN;
        c.croquisRegistry = _registry(ens, c.resolver, parentLabel, self, croquisSetup);
        c.croquisRegistry.setParent(address(ens.ethRegistry), parentLabel);
        c.names = new CroquisNames(
            self,
            c.croquisRegistry,
            IStickerRecords(sticker),
            c.resolver,
            ens.factory,
            ens.registryImplementation,
            ens.resolverImplementation,
            EnsNames.child(parentLabel, EnsNames.child("eth", hex"00"))
        );

        uint256 giftsSetup = croquisSetup | EnsRoles.UNREGISTER | EnsRoles.UNREGISTER_ADMIN;
        c.giftsRegistry = _registry(ens, c.resolver, "gifts", self, giftsSetup);
        c.giftsRegistry.setParent(address(c.croquisRegistry), "gifts");
        c.croquisRegistry
            .register("gifts", self, address(c.giftsRegistry), address(c.resolver), 0, FOREVER);

        c.escrow = new StickerGiftEscrow(sticker, self, relayer, c.names, c.giftsRegistry);
        c.giftsRegistry.grantRootRoles(EnsRoles.REGISTRAR | EnsRoles.UNREGISTER, address(c.escrow));
        c.giftsRegistry.revokeRootRoles(giftsSetup, self);

        // With only a registrar on its root, the croquis registry is emancipated: nobody can take
        // back or repoint a name once it's registered.
        c.croquisRegistry.grantRootRoles(EnsRoles.REGISTRAR, address(c.names));
        c.croquisRegistry.revokeRootRoles(croquisSetup, self);

        c.resolver.grantRole(c.resolver.NAME_WRITER_ROLE(), address(c.names));
        c.resolver.grantRole(c.resolver.NAME_WRITER_ROLE(), address(c.escrow));
        c.resolver.setSources(c.names, IGiftRecords(address(c.escrow)));
        c.names.grantRole(c.names.NAMER_ROLE(), relayer);
    }

    /// @dev Points `parentLabel`.eth at its registry and resolver. `self` must own that name.
    function _pointCroquisEth(EnsV2 memory ens, string memory parentLabel, Croquis memory c)
        internal
    {
        uint256 labelId = uint256(keccak256(bytes(parentLabel)));
        ens.ethRegistry.setSubregistry(labelId, address(c.croquisRegistry));
        ens.ethRegistry.setResolver(labelId, address(c.resolver));
    }

    /// @dev The factory salts only by sender, so the salt takes this run's resolver: a second deploy
    ///      from the same account gets new registries instead of reverting on the first run's.
    function _registry(
        EnsV2 memory ens,
        CroquisResolver resolver,
        string memory kind,
        address self,
        uint256 roles
    ) private returns (IEnsRegistry) {
        EnsGrant[] memory grants = new EnsGrant[](1);
        grants[0] = EnsGrant(self, roles);
        return IEnsRegistry(
            ens.factory
                .deployProxy(
                    ens.registryImplementation,
                    uint256(keccak256(abi.encode(address(resolver), kind))),
                    abi.encodeCall(IEnsUserRegistry.initialize, (grants))
                )
        );
    }
}
