// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {StickerGiftEscrow} from "../contracts/StickerGiftEscrow.sol";
import {StickerNFT} from "../contracts/StickerNFT.sol";

contract DeployStickerContracts is Script {
    function run() external returns (StickerNFT sticker, StickerGiftEscrow escrow) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address sealer = vm.addr(vm.envUint("STICKER_SEALER_PRIVATE_KEY"));
        address claimSigner = sealer;

        vm.startBroadcast(deployerPrivateKey);

        sticker = new StickerNFT(deployer);
        if (sealer != deployer) sticker.grantRole(sticker.SEALER_ROLE(), sealer);

        escrow = new StickerGiftEscrow(address(sticker), deployer, claimSigner);

        vm.stopBroadcast();

        console2.log("StickerNFT:", address(sticker));
        console2.log("StickerGiftEscrow:", address(escrow));
        console2.log("Admin:", deployer);
        console2.log("Sealer:", sealer);
        console2.log("Claim signer:", claimSigner);
    }
}
