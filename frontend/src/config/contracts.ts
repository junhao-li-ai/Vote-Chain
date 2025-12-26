export const DEFAULT_CONTRACT_ADDRESS = '0x05012E7445b8acD2A547C206357a1a02e18eFc65';

// ABI generated from `VoteChain` contract build artifacts.
export const VOTECHAIN_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'address', name: 'voter', type: 'address' },
    ],
    name: 'AlreadyVoted',
    type: 'error',
  },
  { inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'InvalidCleartextsSize', type: 'error' },
  { inputs: [], name: 'InvalidKMSSignatures', type: 'error' },
  { inputs: [{ internalType: 'uint8', name: 'optionIndex', type: 'uint8' }], name: 'InvalidOptionIndex', type: 'error' },
  { inputs: [{ internalType: 'uint256', name: 'optionsCount', type: 'uint256' }], name: 'InvalidOptionsCount', type: 'error' },
  {
    inputs: [
      { internalType: 'uint64', name: 'startTime', type: 'uint64' },
      { internalType: 'uint64', name: 'endTime', type: 'uint64' },
    ],
    name: 'InvalidTimeRange',
    type: 'error',
  },
  { inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'PollAlreadyEnded', type: 'error' },
  { inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'PollNotEnded', type: 'error' },
  { inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'PollNotFound', type: 'error' },
  { inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'PollNotOver', type: 'error' },
  { inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'PollNotStarted', type: 'error' },
  { inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'ResultsAlreadyPosted', type: 'error' },
  { inputs: [], name: 'ZamaProtocolUnsupported', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'uint8', name: 'optionsCount', type: 'uint8' },
      { indexed: false, internalType: 'uint64', name: 'startTime', type: 'uint64' },
      { indexed: false, internalType: 'uint64', name: 'endTime', type: 'uint64' },
    ],
    name: 'PollCreated',
    type: 'event',
  },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'PollEnded', type: 'event' },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'bytes32[]', name: 'handlesList', type: 'bytes32[]' },
      { indexed: false, internalType: 'bytes', name: 'abiEncodedCleartexts', type: 'bytes' },
    ],
    name: 'PublicDecryptionVerified',
    type: 'event',
  },
  { anonymous: false, inputs: [{ indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'ResultsPosted', type: 'event' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'voter', type: 'address' },
    ],
    name: 'VoteCast',
    type: 'event',
  },
  { inputs: [], name: 'confidentialProtocolId', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string[]', name: 'options', type: 'string[]' },
      { internalType: 'uint64', name: 'startTime', type: 'uint64' },
      { internalType: 'uint64', name: 'endTime', type: 'uint64' },
    ],
    name: 'createPoll',
    outputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }], name: 'endPoll', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'uint8', name: 'optionIndex', type: 'uint8' },
    ],
    name: 'getEncryptedTally',
    outputs: [{ internalType: 'euint32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'getPollCount', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ internalType: 'uint256', name: 'pollId', type: 'uint256' }],
    name: 'getPollMeta',
    outputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'uint8', name: 'optionsCount', type: 'uint8' },
      { internalType: 'uint64', name: 'startTime', type: 'uint64' },
      { internalType: 'uint64', name: 'endTime', type: 'uint64' },
      { internalType: 'bool', name: 'decryptable', type: 'bool' },
      { internalType: 'bool', name: 'resultsPosted', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'uint8', name: 'optionIndex', type: 'uint8' },
    ],
    name: 'getPollOption',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'uint8', name: 'optionIndex', type: 'uint8' },
    ],
    name: 'getPostedTally',
    outputs: [
      { internalType: 'bool', name: 'posted', type: 'bool' },
      { internalType: 'uint32', name: 'tally', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'address', name: 'voter', type: 'address' },
    ],
    name: 'hasVoted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'bytes', name: 'abiEncodedClearValues', type: 'bytes' },
      { internalType: 'bytes', name: 'decryptionProof', type: 'bytes' },
    ],
    name: 'publishResults',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pollId', type: 'uint256' },
      { internalType: 'externalEuint8', name: 'encryptedOptionIndex', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

