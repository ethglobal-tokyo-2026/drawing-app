// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice One NFT for each sealed sticker. The artist receives it first.
contract StickerNFT is ERC721, AccessControl {
    bytes32 public constant SEALER_ROLE = keccak256("SEALER_ROLE");

    uint256 private _nextTokenId = 1;
    mapping(bytes32 stickerId => uint256 tokenId) public tokenIdForSticker;
    mapping(uint256 tokenId => bytes32 contentHash) public contentHashOf;
    mapping(uint256 tokenId => address artist) public artistOf;
    mapping(uint256 tokenId => string stickerURI) private _stickerURIs;

    event StickerSealed(
        bytes32 indexed stickerId,
        uint256 indexed tokenId,
        address indexed artist,
        bytes32 contentHash,
        string stickerURI
    );

    error InvalidSticker();
    error StickerAlreadySealed(bytes32 stickerId);

    constructor(address admin) ERC721("Sticker", "STICKER") {
        if (admin == address(0)) revert InvalidSticker();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SEALER_ROLE, admin);
    }

    /// @dev The caller verifies that the sticker is sealed and belongs to the artist.
    function sealSticker(
        address artist,
        bytes32 stickerId,
        bytes32 contentHash,
        string calldata stickerURI
    ) external onlyRole(SEALER_ROLE) returns (uint256 tokenId) {
        if (
            artist == address(0) || stickerId == bytes32(0) || contentHash == bytes32(0)
                || bytes(stickerURI).length == 0
        ) revert InvalidSticker();
        if (tokenIdForSticker[stickerId] != 0) revert StickerAlreadySealed(stickerId);

        tokenId = _nextTokenId++;
        tokenIdForSticker[stickerId] = tokenId;
        contentHashOf[tokenId] = contentHash;
        artistOf[tokenId] = artist;
        _stickerURIs[tokenId] = stickerURI;

        _safeMint(artist, tokenId);
        emit StickerSealed(stickerId, tokenId, artist, contentHash, stickerURI);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _stickerURIs[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
