import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { Contract, hexlify, isAddress as ethersIsAddress } from 'ethers';

import { Header } from './Header';
import { DEFAULT_CONTRACT_ADDRESS, VOTECHAIN_ABI } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/VoteChainApp.css';

type PollView = {
  id: bigint;
  name: string;
  optionsCount: number;
  options: string[];
  startTime: bigint;
  endTime: bigint;
  decryptable: boolean;
  resultsPosted: boolean;
  hasVoted?: boolean;
  postedTallies?: number[];
};

type DecryptedPoll = {
  pollId: bigint;
  clearTallies: bigint[];
  abiEncodedClearValues: `0x${string}`;
  decryptionProof: `0x${string}`;
};

function formatTime(seconds: bigint) {
  const ms = Number(seconds) * 1000;
  if (!Number.isFinite(ms)) return String(seconds);
  return new Date(ms).toLocaleString();
}

function toHex(value: string | Uint8Array): `0x${string}` {
  if (typeof value === 'string') {
    return (value.startsWith('0x') ? value : `0x${value}`) as `0x${string}`;
  }
  return hexlify(value) as `0x${string}`;
}

export function VoteChainApp() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const signerPromise = useEthersSigner({ chainId: sepolia.id });
  const { instance: zama, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [signer, setSigner] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_CONTRACT_ADDRESS);
  const [polls, setPolls] = useState<PollView[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, DecryptedPoll>>({});

  const isSepolia = chainId === sepolia.id;
  const isContractReady = useMemo(() => ethersIsAddress(contractAddress), [contractAddress]);

  useEffect(() => {
    let mounted = true;
    if (!signerPromise) {
      setSigner(null);
      return;
    }
    signerPromise
      .then((s) => {
        if (mounted) setSigner(s);
      })
      .catch(() => {
        if (mounted) setSigner(null);
      });
    return () => {
      mounted = false;
    };
  }, [signerPromise]);

  const refresh = async () => {
    if (!publicClient || !isContractReady) return;
    setIsRefreshing(true);
    setActionError(null);
    try {
      const pollCount = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: VOTECHAIN_ABI,
        functionName: 'getPollCount',
      })) as bigint;

      const pollIds = Array.from({ length: Number(pollCount) }, (_, i) => BigInt(i));
      const nextPolls = await Promise.all(
        pollIds.map(async (pollId): Promise<PollView> => {
          const meta = (await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: VOTECHAIN_ABI,
            functionName: 'getPollMeta',
            args: [pollId],
          })) as unknown as readonly [string, number | bigint, number | bigint, number | bigint, boolean, boolean];

          const optionsCount = Number(meta[1]);
          const options = await Promise.all(
            Array.from({ length: optionsCount }, (_, idx) =>
              publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: VOTECHAIN_ABI,
                functionName: 'getPollOption',
                args: [pollId, idx],
              }) as Promise<string>,
            ),
          );

          let hasVoted: boolean | undefined;
          if (address) {
            hasVoted = (await publicClient.readContract({
              address: contractAddress as `0x${string}`,
              abi: VOTECHAIN_ABI,
              functionName: 'hasVoted',
              args: [pollId, address],
            })) as boolean;
          }

          let postedTallies: number[] | undefined;
          if (meta[5]) {
            const values = await Promise.all(
              Array.from({ length: optionsCount }, (_, idx) =>
                publicClient.readContract({
                  address: contractAddress as `0x${string}`,
                  abi: VOTECHAIN_ABI,
                  functionName: 'getPostedTally',
                  args: [pollId, idx],
                }) as unknown as Promise<readonly [boolean, number | bigint]>,
              ),
            );
            postedTallies = values.map((v) => Number(v[1]));
          }

          return {
            id: pollId,
            name: meta[0],
            optionsCount,
            options,
            startTime: BigInt(meta[2]),
            endTime: BigInt(meta[3]),
            decryptable: meta[4],
            resultsPosted: meta[5],
            hasVoted,
            postedTallies,
          };
        }),
      );

      setPolls(nextPolls);
    } catch (e: any) {
      setActionError(e?.shortMessage || e?.message || 'Failed to load polls');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, contractAddress, address, isContractReady]);

  const writeContract = useMemo(() => {
    if (!signer || !isContractReady) return null;
    return new Contract(contractAddress, VOTECHAIN_ABI as any, signer);
  }, [signer, contractAddress, isContractReady]);

  const [newPollName, setNewPollName] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
  const [newPollStart, setNewPollStart] = useState<string>('');
  const [newPollEnd, setNewPollEnd] = useState<string>('');

  const canWrite = Boolean(isConnected && isSepolia && writeContract);

  const createPoll = async () => {
    if (!writeContract) return;
    setActionError(null);

    const options = newPollOptions.map((o) => o.trim()).filter(Boolean);
    if (newPollName.trim().length === 0) {
      setActionError('Poll name is required');
      return;
    }
    if (options.length < 2 || options.length > 4) {
      setActionError('Options must be 2 to 4 items');
      return;
    }
    if (!newPollStart || !newPollEnd) {
      setActionError('Start and end time are required');
      return;
    }
    const startTime = BigInt(Math.floor(new Date(newPollStart).getTime() / 1000));
    const endTime = BigInt(Math.floor(new Date(newPollEnd).getTime() / 1000));
    if (endTime <= startTime) {
      setActionError('End time must be after start time');
      return;
    }

    const tx = await writeContract.createPoll(newPollName.trim(), options, startTime, endTime);
    await tx.wait();

    setNewPollName('');
    setNewPollOptions(['', '']);
    setNewPollStart('');
    setNewPollEnd('');
    await refresh();
  };

  const vote = async (pollId: bigint, optionIndex: number) => {
    if (!writeContract || !zama || !address) return;
    setActionError(null);

    const input = zama.createEncryptedInput(contractAddress, address);
    input.add8(BigInt(optionIndex));
    const encrypted = await input.encrypt();

    const handle = toHex(encrypted.handles[0]);
    const proof = toHex(encrypted.inputProof);
    const tx = await writeContract.vote(pollId, handle, proof);
    await tx.wait();

    await refresh();
  };

  const endPoll = async (pollId: bigint) => {
    if (!writeContract) return;
    setActionError(null);
    const tx = await writeContract.endPoll(pollId);
    await tx.wait();
    await refresh();
  };

  const decryptResults = async (poll: PollView) => {
    if (!publicClient || !zama) return;
    setActionError(null);

    const handles = await Promise.all(
      Array.from({ length: poll.optionsCount }, (_, idx) =>
        publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: VOTECHAIN_ABI,
          functionName: 'getEncryptedTally',
          args: [poll.id, idx],
        }) as Promise<`0x${string}`>,
      ),
    );

    const result = await zama.publicDecrypt(handles);
    const tallies = handles.map((h) => (result.clearValues[h] as bigint) ?? 0n);

    setDecrypted((prev) => ({
      ...prev,
      [poll.id.toString()]: {
        pollId: poll.id,
        clearTallies: tallies,
        abiEncodedClearValues: result.abiEncodedClearValues,
        decryptionProof: result.decryptionProof,
      },
    }));
  };

  const publishResults = async (pollId: bigint) => {
    if (!writeContract) return;
    const d = decrypted[pollId.toString()];
    if (!d) return;
    setActionError(null);
    const tx = await writeContract.publishResults(pollId, d.abiEncodedClearValues, d.decryptionProof);
    await tx.wait();
    await refresh();
  };

  const nowSec = Math.floor(Date.now() / 1000);

  return (
    <div className="votechain-app">
      <Header />
      <main className="votechain-main">
        <section className="card">
          <h2 className="card-title">Contract</h2>
          <div className="row">
            <input
              className="input"
              placeholder="VoteChain contract address on Sepolia (0x...)"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value.trim())}
            />
            <button className="button" onClick={refresh} disabled={!isContractReady || isRefreshing}>
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <div className="hint">
            {isConnected ? (
              isSepolia ? (
                <span>Connected to Sepolia as {address}</span>
              ) : (
                <span className="error">Switch your wallet network to Sepolia.</span>
              )
            ) : (
              <span>Connect your wallet to use the app.</span>
            )}
          </div>
          <div className="hint">
            {zamaLoading ? <span>Initializing encryption service…</span> : null}
            {zamaError ? <span className="error">{zamaError}</span> : null}
          </div>
          {!isContractReady && contractAddress.length > 0 ? <div className="error">Invalid contract address</div> : null}
        </section>

        <section className="card">
          <h2 className="card-title">Create Poll</h2>
          <div className="grid">
            <label className="label">
              Name
              <input className="input" value={newPollName} onChange={(e) => setNewPollName(e.target.value)} />
            </label>
            <label className="label">
              Start
              <input className="input" type="datetime-local" value={newPollStart} onChange={(e) => setNewPollStart(e.target.value)} />
            </label>
            <label className="label">
              End
              <input className="input" type="datetime-local" value={newPollEnd} onChange={(e) => setNewPollEnd(e.target.value)} />
            </label>
          </div>
          <div className="options">
            {newPollOptions.map((opt, idx) => (
              <div className="row" key={idx}>
                <input
                  className="input"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const next = [...newPollOptions];
                    next[idx] = e.target.value;
                    setNewPollOptions(next);
                  }}
                />
                <button
                  className="button button-secondary"
                  onClick={() => {
                    const next = newPollOptions.filter((_, i) => i !== idx);
                    if (next.length >= 2) setNewPollOptions(next);
                  }}
                  disabled={newPollOptions.length <= 2}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="button button-secondary"
              onClick={() => {
                if (newPollOptions.length < 4) setNewPollOptions([...newPollOptions, '']);
              }}
              disabled={newPollOptions.length >= 4}
            >
              Add Option
            </button>
          </div>
          <button className="button" onClick={createPoll} disabled={!canWrite || !isContractReady || zamaLoading}>
            Create
          </button>
          {!canWrite ? <div className="hint">Writing requires a connected wallet on Sepolia.</div> : null}
        </section>

        {actionError ? (
          <section className="card">
            <div className="error">{actionError}</div>
          </section>
        ) : null}

        <section className="card">
          <div className="row row-space">
            <h2 className="card-title">Polls</h2>
            <button className="button button-secondary" onClick={refresh} disabled={!isContractReady || isRefreshing}>
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {polls.length === 0 ? <div className="hint">No polls found.</div> : null}

          <div className="polls">
            {polls.map((poll) => {
              const started = nowSec >= Number(poll.startTime);
              const endedByTime = nowSec >= Number(poll.endTime);
              const active = started && !endedByTime && !poll.decryptable;
              const canEnd = endedByTime && !poll.decryptable;
              const canDecrypt = poll.decryptable && !poll.resultsPosted;
              const decryptedPoll = decrypted[poll.id.toString()];

              return (
                <div className="poll" key={poll.id.toString()}>
                  <div className="row row-space">
                    <div>
                      <div className="poll-title">{poll.name}</div>
                      <div className="poll-meta">
                        #{poll.id.toString()} • {poll.optionsCount} options • Start {formatTime(poll.startTime)} • End {formatTime(poll.endTime)}
                      </div>
                      <div className="poll-meta">
                        Status:{' '}
                        {poll.resultsPosted
                          ? 'Results posted'
                          : poll.decryptable
                            ? 'Decryptable (waiting for results)'
                            : endedByTime
                              ? 'Ended (not finalized)'
                              : active
                                ? 'Active'
                                : started
                                  ? 'Pending end'
                                  : 'Scheduled'}
                      </div>
                    </div>
                    <div className="row">
                      {canEnd ? (
                        <button className="button" onClick={() => endPoll(poll.id)} disabled={!canWrite}>
                          End Poll
                        </button>
                      ) : null}
                      {canDecrypt ? (
                        <button className="button button-secondary" onClick={() => decryptResults(poll)} disabled={!zama || zamaLoading}>
                          Decrypt
                        </button>
                      ) : null}
                      {canDecrypt && decryptedPoll ? (
                        <button className="button" onClick={() => publishResults(poll.id)} disabled={!canWrite}>
                          Post On-Chain
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="option-grid">
                    {poll.options.map((opt, idx) => (
                      <div className="option" key={idx}>
                        <div className="option-name">{opt}</div>
                        {active ? (
                          <button className="button" onClick={() => vote(poll.id, idx)} disabled={!canWrite || poll.hasVoted || !zama || zamaLoading}>
                            {poll.hasVoted ? 'Voted' : `Vote (encrypted)`}
                          </button>
                        ) : null}
                        {poll.resultsPosted && poll.postedTallies ? (
                          <div className="result">
                            On-chain tally: <strong>{poll.postedTallies[idx]}</strong>
                          </div>
                        ) : null}
                        {!poll.resultsPosted && decryptedPoll ? (
                          <div className="result">
                            Decrypted tally: <strong>{decryptedPoll.clearTallies[idx].toString()}</strong>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
