// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {IEnsRegistry, IVerifiableFactory} from "../contracts/ens/EnsV2.sol";
import {StickerNFT} from "../contracts/StickerNFT.sol";
import {CroquisSetup} from "./CroquisSetup.sol";

/// @notice Deploys the names under croquis.eth and the escrow on Ethereum Sepolia, and StickerNFT
///         unless STICKER_NFT_ADDRESS names one already there. The deployer should own croquis.eth;
///         otherwise croquis.eth's owner points it at the new registry and resolver afterwards.
contract DeployStickerContracts is Script, CroquisSetup {
    // ENSv2 on Sepolia, from contracts-v2 71a3b73's deployments/sepolia/addresses.md.
    address private constant VERIFIABLE_FACTORY = 0x9e726Eb570beb6BCEb495AB8cdA7df517d4e841C;
    address private constant USER_REGISTRY_IMPL = 0xA80338aAA8D23831cEa25E858D1774534aBb0263;
    address private constant PERMISSIONED_RESOLVER_IMPL =
        0x14F09Fd05d4585759e54844DC9B00147131Cf243;
    address private constant ETH_REGISTRY = 0x657eA849311d3D5823348ddEd7C2AaAFb3EDE09E;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address relayer = vm.addr(vm.envUint("STICKER_SEALER_PRIVATE_KEY"));
        string[] memory gatewayUrls = new string[](1);
        gatewayUrls[0] = vm.envString("ENS_GATEWAY_URL");
        address gatewaySigner = vm.addr(vm.envUint("ENS_GATEWAY_PRIVATE_KEY"));
        address existingSticker = vm.envOr("STICKER_NFT_ADDRESS", address(0));
        EnsV2 memory ens = EnsV2(
            IVerifiableFactory(VERIFIABLE_FACTORY),
            USER_REGISTRY_IMPL,
            PERMISSIONED_RESOLVER_IMPL,
            IEnsRegistry(ETH_REGISTRY)
        );

        vm.startBroadcast(deployerPrivateKey);
        address sticker = existingSticker;
        if (sticker == address(0)) {
            StickerNFT created = new StickerNFT(deployer);
            if (relayer != deployer) created.grantRole(created.SEALER_ROLE(), relayer);
            sticker = address(created);
        }
        Croquis memory c =
            _deployCroquis(ens, sticker, deployer, relayer, gatewayUrls, gatewaySigner);
        bool ownsCroquisEth = ens.ethRegistry.getOwner(uint256(keccak256("croquis"))) == deployer;
        if (ownsCroquisEth) _pointCroquisEth(ens, c);
        vm.stopBroadcast();

        console2.log("STICKER_NFT_ADDRESS=", sticker);
        console2.log("STICKER_GIFT_ESCROW_ADDRESS=", address(c.escrow));
        console2.log("CROQUIS_NAMES_ADDRESS=", address(c.names));
        console2.log("CROQUIS_RESOLVER_ADDRESS=", address(c.resolver));
        console2.log("Croquis registry:", address(c.croquisRegistry));
        console2.log("Gifts registry:", address(c.giftsRegistry));
        if (!ownsCroquisEth) {
            console2.log("croquis.eth is not the deployer's. Its owner must set, on ETHRegistry:");
            console2.log("  subregistry:", address(c.croquisRegistry));
            console2.log("  resolver:", address(c.resolver));
        }
    }
}
