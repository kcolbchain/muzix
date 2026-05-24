// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MuzixRightsOffering} from "../src/MuzixRightsOffering.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title  DeploySaptaPilot
 * @notice Deploys MuzixRightsOffering and seeds two draft offerings for artist
 *         Sapta: one for a single album, one catalogue-wide. Both drafts are
 *         created but not published — the artist (or their representative)
 *         calls `publishOffering` from their own wallet to make them visible
 *         to bidders.
 *
 *         Numbers below are placeholders for the pilot; tune in the env vars
 *         or directly here before broadcasting.
 *
 *         Required env:
 *           - SAPTA_ARTIST     : EOA that the offerings will be created under
 *                                (script `prank`s to this address so artist
 *                                identity is correct in storage).
 *           - MUSD_TOKEN       : settlement-token address (MUSD on the target
 *                                chain — create-protocol L1 in production,
 *                                muzix L1 in early testnet runs).
 *           - SAPTA_ALBUM_URI  : ipfs:// manifest URI for the album subject.
 *           - SAPTA_ALBUM_HASH : keccak256 of the album manifest.
 *           - SAPTA_CAT_URI    : ipfs:// manifest URI for the catalogue subject.
 *           - SAPTA_CAT_HASH   : keccak256 of the catalogue manifest.
 *
 *         Usage:
 *           forge script script/DeploySaptaPilot.s.sol \
 *               --rpc-url $RPC_URL \
 *               --broadcast \
 *               --private-key $DEPLOYER_KEY
 */
contract DeploySaptaPilot is Script {
    struct PilotConfig {
        address sapta;
        IERC20 musd;
        bytes32 albumSubjectHash;
        string albumSubjectURI;
        bytes32 catalogueSubjectHash;
        string catalogueSubjectURI;
    }

    function run() external {
        PilotConfig memory cfg = _loadConfig();

        vm.startBroadcast();
        MuzixRightsOffering offering = new MuzixRightsOffering();
        vm.stopBroadcast();

        // Author the two drafts under Sapta's identity. In a broadcast run
        // these calls must be signed by Sapta's wallet — typically a separate
        // forge script invocation from the artist's key. For the pilot
        // bootstrap we surface the parameters here so they live in version
        // control as the canonical reference; the artist (or a delegated
        // operator with their key) then runs `publishOffering` to flip status.
        vm.startBroadcast(cfg.sapta);

        uint256 albumId = offering.createOffering(
            cfg.albumSubjectHash,
            cfg.albumSubjectURI,
            _albumRights(),
            _albumEconomics(),
            cfg.musd,
            5_000e6, // 5,000 MUSD minimum bond
            uint64(block.timestamp + 30 days)
        );

        uint256 catalogueId = offering.createOffering(
            cfg.catalogueSubjectHash,
            cfg.catalogueSubjectURI,
            _catalogueRights(),
            _catalogueEconomics(),
            cfg.musd,
            25_000e6, // 25,000 MUSD minimum bond for the bigger deal
            uint64(block.timestamp + 45 days)
        );

        vm.stopBroadcast();

        console2.log("MuzixRightsOffering deployed at:", address(offering));
        console2.log("Sapta album draft id:", albumId);
        console2.log("Sapta catalogue draft id:", catalogueId);
    }

    function _loadConfig() internal view returns (PilotConfig memory cfg) {
        cfg.sapta = vm.envAddress("SAPTA_ARTIST");
        cfg.musd = IERC20(vm.envAddress("MUSD_TOKEN"));
        cfg.albumSubjectHash = vm.envBytes32("SAPTA_ALBUM_HASH");
        cfg.albumSubjectURI = vm.envString("SAPTA_ALBUM_URI");
        cfg.catalogueSubjectHash = vm.envBytes32("SAPTA_CAT_HASH");
        cfg.catalogueSubjectURI = vm.envString("SAPTA_CAT_URI");
    }

    // -----------------------------------------------------------------------
    // Pilot terms — tune before broadcasting
    // -----------------------------------------------------------------------

    function _albumRights() internal pure returns (MuzixRightsOffering.RightsBundle memory) {
        return MuzixRightsOffering.RightsBundle({
            rightsType: MuzixRightsOffering.RightsType.Distribution,
            exclusive: true,
            territoryHash: bytes32(0),       // 0 = worldwide
            termSeconds: uint64(365 days * 3) // 3 years
        });
    }

    function _albumEconomics() internal pure returns (MuzixRightsOffering.Economics memory) {
        return MuzixRightsOffering.Economics({
            upfrontUsd: 25_000e6,            // $25,000 upfront (MUSD 6dp)
            minGuaranteeUsd: 50_000e6,       // $50,000 MG over term
            artistRoyaltyBps: 6500,          // 65% to artist, 35% to label
            advanceRecoupCapUsd: 25_000e6    // advance recoups against royalty stream
        });
    }

    function _catalogueRights() internal pure returns (MuzixRightsOffering.RightsBundle memory) {
        return MuzixRightsOffering.RightsBundle({
            rightsType: MuzixRightsOffering.RightsType.FullRights,
            exclusive: true,
            territoryHash: bytes32(0),
            termSeconds: uint64(365 days * 5)
        });
    }

    function _catalogueEconomics() internal pure returns (MuzixRightsOffering.Economics memory) {
        return MuzixRightsOffering.Economics({
            upfrontUsd: 150_000e6,           // $150,000 upfront
            minGuaranteeUsd: 400_000e6,      // $400,000 MG over 5 years
            artistRoyaltyBps: 7000,          // 70% to artist
            advanceRecoupCapUsd: 150_000e6
        });
    }
}
