// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CroquisNames} from "../../../contracts/ens/CroquisNames.sol";
import {CroquisResolver} from "../../../contracts/ens/CroquisResolver.sol";
import {IEnsRegistry, IVerifiableFactory} from "../../../contracts/ens/EnsV2.sol";
import {StickerGiftEscrow} from "../../../contracts/StickerGiftEscrow.sol";
import {CroquisSetup} from "../../../script/CroquisSetup.sol";

/// @dev Everything under croquis.eth in one deployment, for the TypeScript tests on Anvil. ENSv2's
///      own contracts are deployed first and passed in.
contract LocalCroquis is CroquisSetup {
    StickerGiftEscrow public immutable escrow;
    CroquisNames public immutable names;
    CroquisResolver public immutable resolver;

    constructor(
        address factory,
        address registryImplementation,
        address resolverImplementation,
        address sticker,
        address relayer,
        address gatewaySigner
    ) {
        string[] memory urls = new string[](1);
        urls[0] = "http://gateway.invalid/{sender}/{data}.json";
        Croquis memory c = _deployCroquis(
            EnsV2(
                IVerifiableFactory(factory),
                registryImplementation,
                resolverImplementation,
                IEnsRegistry(address(0))
            ),
            sticker,
            address(this),
            relayer,
            urls,
            gatewaySigner
        );
        escrow = c.escrow;
        names = c.names;
        resolver = c.resolver;
    }

    /// @dev Holds gifts.croquis.eth.
    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }
}
