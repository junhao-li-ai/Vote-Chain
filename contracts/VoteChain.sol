// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title VoteChain
/// @notice Confidential voting with encrypted ballots and encrypted tallies using Zama FHEVM.
/// @dev Tallies are not decryptable until the poll is ended and made publicly decryptable.
contract VoteChain is ZamaEthereumConfig {
    uint8 internal constant MAX_OPTIONS = 4;
    uint8 internal constant MIN_OPTIONS = 2;

    struct Poll {
        string name;
        uint8 optionsCount;
        string[MAX_OPTIONS] options;
        uint64 startTime;
        uint64 endTime;
        bool decryptable;
        bool resultsPosted;
        euint32[MAX_OPTIONS] encryptedTallies;
        uint32[MAX_OPTIONS] clearTallies;
    }

    uint256 private _pollCount;
    mapping(uint256 pollId => Poll) private _polls;
    mapping(uint256 pollId => mapping(address voter => bool)) private _hasVoted;

    event PollCreated(
        uint256 indexed pollId,
        address indexed creator,
        string name,
        uint8 optionsCount,
        uint64 startTime,
        uint64 endTime
    );
    event VoteCast(uint256 indexed pollId, address indexed voter);
    event PollEnded(uint256 indexed pollId);
    event ResultsPosted(uint256 indexed pollId);

    error PollNotFound(uint256 pollId);
    error InvalidOptionsCount(uint256 optionsCount);
    error InvalidTimeRange(uint64 startTime, uint64 endTime);
    error PollNotStarted(uint256 pollId);
    error PollAlreadyEnded(uint256 pollId);
    error PollNotEnded(uint256 pollId);
    error PollNotOver(uint256 pollId);
    error AlreadyVoted(uint256 pollId, address voter);
    error InvalidOptionIndex(uint8 optionIndex);
    error ResultsAlreadyPosted(uint256 pollId);
    error InvalidCleartextsSize(uint256 pollId);

    function getPollCount() external view returns (uint256) {
        return _pollCount;
    }

    function getPollMeta(
        uint256 pollId
    )
        external
        view
        returns (string memory name, uint8 optionsCount, uint64 startTime, uint64 endTime, bool decryptable, bool resultsPosted)
    {
        Poll storage poll = _getPollOrRevert(pollId);
        return (poll.name, poll.optionsCount, poll.startTime, poll.endTime, poll.decryptable, poll.resultsPosted);
    }

    function getPollOption(uint256 pollId, uint8 optionIndex) external view returns (string memory) {
        Poll storage poll = _getPollOrRevert(pollId);
        if (optionIndex >= poll.optionsCount) revert InvalidOptionIndex(optionIndex);
        return poll.options[optionIndex];
    }

    function hasVoted(uint256 pollId, address voter) external view returns (bool) {
        _getPollOrRevert(pollId);
        return _hasVoted[pollId][voter];
    }

    function getEncryptedTally(uint256 pollId, uint8 optionIndex) external view returns (euint32) {
        Poll storage poll = _getPollOrRevert(pollId);
        if (optionIndex >= poll.optionsCount) revert InvalidOptionIndex(optionIndex);
        return poll.encryptedTallies[optionIndex];
    }

    function getPostedTally(uint256 pollId, uint8 optionIndex) external view returns (bool posted, uint32 tally) {
        Poll storage poll = _getPollOrRevert(pollId);
        if (optionIndex >= poll.optionsCount) revert InvalidOptionIndex(optionIndex);
        return (poll.resultsPosted, poll.clearTallies[optionIndex]);
    }

    function createPoll(
        string calldata name,
        string[] calldata options,
        uint64 startTime,
        uint64 endTime
    ) external returns (uint256 pollId) {
        uint256 optionsCount = options.length;
        if (optionsCount < MIN_OPTIONS || optionsCount > MAX_OPTIONS) revert InvalidOptionsCount(optionsCount);
        if (endTime <= startTime) revert InvalidTimeRange(startTime, endTime);

        pollId = _pollCount;
        _pollCount = pollId + 1;

        Poll storage poll = _polls[pollId];
        poll.name = name;
        poll.optionsCount = uint8(optionsCount);
        poll.startTime = startTime;
        poll.endTime = endTime;

        for (uint8 i = 0; i < optionsCount; i++) {
            poll.options[i] = options[i];
        }

        emit PollCreated(pollId, msg.sender, name, uint8(optionsCount), startTime, endTime);
    }

    /// @notice Cast an encrypted vote for a poll.
    /// @dev The option index is encrypted; invalid indices simply do not increment any option.
    function vote(uint256 pollId, externalEuint8 encryptedOptionIndex, bytes calldata inputProof) external {
        Poll storage poll = _getPollOrRevert(pollId);

        if (poll.decryptable) revert PollAlreadyEnded(pollId);
        if (block.timestamp < poll.startTime) revert PollNotStarted(pollId);
        if (block.timestamp >= poll.endTime) revert PollNotOver(pollId);
        if (_hasVoted[pollId][msg.sender]) revert AlreadyVoted(pollId, msg.sender);
        _hasVoted[pollId][msg.sender] = true;

        euint8 optionIndex = FHE.fromExternal(encryptedOptionIndex, inputProof);

        for (uint8 i = 0; i < poll.optionsCount; i++) {
            ebool isSelected = FHE.eq(optionIndex, i);
            euint32 increment = FHE.select(isSelected, FHE.asEuint32(1), FHE.asEuint32(0));
            poll.encryptedTallies[i] = FHE.add(poll.encryptedTallies[i], increment);
            FHE.allowThis(poll.encryptedTallies[i]);
        }

        emit VoteCast(pollId, msg.sender);
    }

    /// @notice Ends a poll after its end time and makes encrypted tallies publicly decryptable.
    function endPoll(uint256 pollId) external {
        Poll storage poll = _getPollOrRevert(pollId);
        if (poll.decryptable) revert PollAlreadyEnded(pollId);
        if (block.timestamp < poll.endTime) revert PollNotOver(pollId);

        poll.decryptable = true;

        for (uint8 i = 0; i < poll.optionsCount; i++) {
            FHE.makePubliclyDecryptable(poll.encryptedTallies[i]);
        }

        emit PollEnded(pollId);
    }

    /// @notice Post decrypted results on-chain with Zama signature verification.
    /// @param abiEncodedClearValues ABI-encoded clear values returned by the Relayer SDK public decryption.
    /// @param decryptionProof Proof returned by the Relayer SDK public decryption.
    function publishResults(uint256 pollId, bytes calldata abiEncodedClearValues, bytes calldata decryptionProof) external {
        Poll storage poll = _getPollOrRevert(pollId);
        if (!poll.decryptable) revert PollNotEnded(pollId);
        if (poll.resultsPosted) revert ResultsAlreadyPosted(pollId);

        bytes32[] memory handles = new bytes32[](poll.optionsCount);
        for (uint8 i = 0; i < poll.optionsCount; i++) {
            handles[i] = euint32.unwrap(poll.encryptedTallies[i]);
        }

        FHE.checkSignatures(handles, abiEncodedClearValues, decryptionProof);

        if (poll.optionsCount == 2) {
            (uint32 a, uint32 b) = abi.decode(abiEncodedClearValues, (uint32, uint32));
            poll.clearTallies[0] = a;
            poll.clearTallies[1] = b;
        } else if (poll.optionsCount == 3) {
            (uint32 a, uint32 b, uint32 c) = abi.decode(abiEncodedClearValues, (uint32, uint32, uint32));
            poll.clearTallies[0] = a;
            poll.clearTallies[1] = b;
            poll.clearTallies[2] = c;
        } else if (poll.optionsCount == 4) {
            (uint32 a, uint32 b, uint32 c, uint32 d) = abi.decode(abiEncodedClearValues, (uint32, uint32, uint32, uint32));
            poll.clearTallies[0] = a;
            poll.clearTallies[1] = b;
            poll.clearTallies[2] = c;
            poll.clearTallies[3] = d;
        } else {
            revert InvalidCleartextsSize(pollId);
        }

        poll.resultsPosted = true;
        emit ResultsPosted(pollId);
    }

    function _getPollOrRevert(uint256 pollId) internal view returns (Poll storage poll) {
        if (pollId >= _pollCount) revert PollNotFound(pollId);
        return _polls[pollId];
    }
}

