// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {CroquisResolver, INameBook, IStickerRecords} from "./CroquisResolver.sol";
import {
    EnsGrant,
    EnsNames,
    EnsRoles,
    IEnsPermissionedResolver,
    IEnsRegistry,
    IEnsUserRegistry,
    IVerifiableFactory
} from "./EnsV2.sol";

/// @notice Makes the names under the parent name: a forever name for each person, and a name for
///         each sticker under its Original Artist that always belongs to whoever holds the
///         sticker's NFT.
contract CroquisNames is AccessControl, INameBook {
    /// @dev The relayer, which names people and stickers.
    bytes32 public constant NAMER_ROLE = keccak256("NAMER_ROLE");

    uint64 private constant FOREVER = type(uint64).max;
    uint256 private constant COIN_TYPE_ETH = 60;

    IEnsRegistry public immutable CROQUIS_REGISTRY;
    IStickerRecords public immutable STICKERS;
    CroquisResolver public immutable RESOLVER;
    IVerifiableFactory public immutable FACTORY;
    /// @dev ENSv2's deployed UserRegistry and PermissionedResolver implementations.
    address public immutable REGISTRY_IMPLEMENTATION;
    address public immutable RESOLVER_IMPLEMENTATION;
    bytes32 public immutable PARENT_NODE;
    /// @dev The parent name every name here sits under, DNS-encoded.
    bytes public parentName;

    struct Person {
        string label;
        IEnsRegistry registry;
        IEnsPermissionedResolver resolver;
    }

    mapping(address account => Person person) private _people;
    mapping(uint256 tokenId => string label) public stickerLabelOf;

    event PersonNamed(address indexed account, string label, address registry, address resolver);
    event StickerNamed(uint256 indexed tokenId, address indexed artist, string label);
    event StickerNameSynced(uint256 indexed tokenId, address indexed holder);

    error AlreadyNamed(address account);
    error ArtistHasNoName(address artist);
    error StickerAlreadyNamed(uint256 tokenId);
    error PersonHasNoName(address account);

    constructor(
        address admin,
        IEnsRegistry croquisRegistry,
        IStickerRecords stickers,
        CroquisResolver resolver,
        IVerifiableFactory factory,
        address registryImplementation,
        address resolverImplementation,
        bytes memory parentName_
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        CROQUIS_REGISTRY = croquisRegistry;
        STICKERS = stickers;
        RESOLVER = resolver;
        FACTORY = factory;
        REGISTRY_IMPLEMENTATION = registryImplementation;
        RESOLVER_IMPLEMENTATION = resolverImplementation;
        parentName = parentName_;
        PARENT_NODE = EnsNames.namehash(parentName_, 0);
    }

    /// @notice Gives `account` its forever name, `label`.croquis-app.eth, with its own registry for
    ///         its stickers' names and its own resolver for its records.
    function claimPersonName(
        string calldata label,
        address account,
        string calldata avatar,
        string calldata url
    ) external onlyRole(NAMER_ROLE) {
        Person storage person = _people[account];
        if (bytes(person.label).length != 0) revert AlreadyNamed(account);
        bytes memory name = EnsNames.child(label, parentName);

        IEnsRegistry registry = IEnsRegistry(
            _deploy(
                REGISTRY_IMPLEMENTATION,
                account,
                "registry",
                abi.encodeCall(
                    IEnsUserRegistry.initialize,
                    (_grant(
                            address(this),
                            EnsRoles.REGISTRAR | EnsRoles.UNREGISTER | EnsRoles.SET_PARENT
                        ))
                )
            )
        );
        registry.setParent(address(CROQUIS_REGISTRY), label);

        // This contract writes the first records, then keeps only the avatar.
        uint256 setup = EnsRoles.RESOLVER_SET_TEXT | EnsRoles.RESOLVER_SET_TEXT_ADMIN
            | EnsRoles.RESOLVER_SET_ADDRESS | EnsRoles.RESOLVER_SET_ADDRESS_ADMIN;
        EnsGrant[] memory resolverGrants = new EnsGrant[](2);
        resolverGrants[0] = EnsGrant(account, EnsRoles.ALL);
        resolverGrants[1] = EnsGrant(address(this), setup);
        IEnsPermissionedResolver resolver = IEnsPermissionedResolver(
            _deploy(
                RESOLVER_IMPLEMENTATION,
                account,
                "resolver",
                abi.encodeCall(
                    IEnsPermissionedResolver.initialize, (resolverGrants, new bytes[](0))
                )
            )
        );
        resolver.setAddress(name, COIN_TYPE_ETH, abi.encodePacked(account));
        resolver.setText(name, "url", url);
        resolver.grantSetterRoles(
            abi.encodeCall(IEnsPermissionedResolver.setText, (name, "avatar", "")), address(this)
        );
        resolver.setText(name, "avatar", avatar);
        resolver.revokeRootRoles(setup, address(this));

        person.label = label;
        person.registry = registry;
        person.resolver = resolver;
        CROQUIS_REGISTRY.register(
            label,
            account,
            address(registry),
            address(resolver),
            EnsRoles.SET_RESOLVER | EnsRoles.SET_RESOLVER_ADMIN,
            FOREVER
        );
        emit PersonNamed(account, label, address(registry), address(resolver));
    }

    /// @notice The app's one record on a person's name: their avatar, to their latest sticker.
    function setAvatar(address account, string calldata avatar) external onlyRole(NAMER_ROLE) {
        Person storage person = _people[account];
        if (bytes(person.label).length == 0) revert PersonHasNoName(account);
        person.resolver.setText(EnsNames.child(person.label, parentName), "avatar", avatar);
    }

    /// @notice Names a sticker `label`.<artist>.croquis-app.eth, held by whoever holds its NFT.
    function nameSticker(uint256 tokenId, string calldata label) external onlyRole(NAMER_ROLE) {
        if (bytes(stickerLabelOf[tokenId]).length != 0) revert StickerAlreadyNamed(tokenId);
        address artist = STICKERS.artistOf(tokenId);
        Person storage person = _people[artist];
        if (bytes(person.label).length == 0) revert ArtistHasNoName(artist);
        stickerLabelOf[tokenId] = label;
        person.registry
            .register(label, STICKERS.ownerOf(tokenId), address(0), address(RESOLVER), 0, FOREVER);
        RESOLVER.setStickerTarget(_stickerNode(person.label, label), tokenId);
        emit StickerNamed(tokenId, artist, label);
    }

    /// @notice Hands a sticker's name to whoever holds its NFT now. Anyone may call it; it does
    ///         nothing when the two already agree or the sticker has no name.
    function syncSticker(uint256 tokenId) external {
        string memory label = stickerLabelOf[tokenId];
        if (bytes(label).length == 0) return;
        IEnsRegistry registry = _people[STICKERS.artistOf(tokenId)].registry;
        address holder = STICKERS.ownerOf(tokenId);
        uint256 labelId = uint256(keccak256(bytes(label)));
        if (registry.getOwner(labelId) == holder) return;
        // Names carry no transfer role, so the name moves by being registered again.
        registry.unregister(labelId);
        registry.register(label, holder, address(0), address(RESOLVER), 0, FOREVER);
        emit StickerNameSynced(tokenId, holder);
    }

    function labelOf(address account) external view returns (string memory) {
        return _people[account].label;
    }

    function registryOf(address account) external view returns (address) {
        return address(_people[account].registry);
    }

    function resolverOf(address account) external view returns (address) {
        return address(_people[account].resolver);
    }

    /// @inheritdoc INameBook
    function nameOf(address account) public view returns (string memory) {
        string memory label = _people[account].label;
        if (bytes(label).length == 0) return "";
        return EnsNames.toText(EnsNames.child(label, parentName));
    }

    /// @inheritdoc INameBook
    function stickerNameOf(uint256 tokenId) external view returns (string memory) {
        string memory label = stickerLabelOf[tokenId];
        if (bytes(label).length == 0) return "";
        return string.concat(label, ".", nameOf(STICKERS.artistOf(tokenId)));
    }

    function _stickerNode(string memory artistLabel, string memory label)
        private
        view
        returns (bytes32)
    {
        return EnsNames.node(EnsNames.node(PARENT_NODE, artistLabel), label);
    }

    function _deploy(address implementation, address account, string memory kind, bytes memory init)
        private
        returns (address)
    {
        return
            FACTORY.deployProxy(implementation, uint256(keccak256(abi.encode(account, kind))), init);
    }

    function _grant(address account, uint256 roleBitmap)
        private
        pure
        returns (EnsGrant[] memory grants)
    {
        grants = new EnsGrant[](1);
        grants[0] = EnsGrant(account, roleBitmap);
    }
}
