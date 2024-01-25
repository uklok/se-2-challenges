import { useEffect, useRef, useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { Amount } from "~~/components/Amount";
import { MetaHeader } from "~~/components/MetaHeader";
import { Roll, RollEvents } from "~~/components/RollEvents";
import { Winner, WinnerEvents } from "~~/components/WinnerEvents";
import { Address } from "~~/components/scaffold-eth";
import {
  useScaffoldContract,
  useScaffoldContractRead,
  useScaffoldContractWrite,
  useScaffoldEventHistory,
  useScaffoldEventSubscriber,
} from "~~/hooks/scaffold-eth";

// const ROLLING_TIME_MS = 500;
const MAX_TABLE_ROWS = 10;

const DiceGame: NextPage = () => {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);

  const [rolled, setRolled] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  const [isRiggedRollOwner, setIsRiggedRollOwner] = useState(false);

  const { data: riggedRollContract } = useScaffoldContract({ contractName: "RiggedRoll" });
  const { data: riggedRollBalance } = useBalance({
    address: riggedRollContract?.address,
    watch: true,
  });
  const { data: prize } = useScaffoldContractRead({ contractName: "DiceGame", functionName: "prize" });

  const { data: rollsHistoryData, isLoading: rollsHistoryLoading } = useScaffoldEventHistory({
    contractName: "DiceGame",
    eventName: "Roll",
  });

  useEffect(() => {
    if (!rolls.length && !!rollsHistoryData?.length && !rollsHistoryLoading) {
      setRolls(
        (
          rollsHistoryData?.map(({ args }) => ({
            address: args.player,
            amount: Number(args.amount),
            roll: args.roll.toString(16).toUpperCase(),
          })) || []
        ).slice(0, MAX_TABLE_ROWS),
      );
    }
  }, [rolls, rollsHistoryData, rollsHistoryLoading]);

  useScaffoldEventSubscriber({
    contractName: "DiceGame",
    eventName: "Roll",
    listener: logs => {
      logs.map(log => {
        const { player, amount, roll } = log.args;

        if (player && amount && roll) {
          // setTimeout(() => {
          setIsRolling(false);
          setRolls(rolls =>
            [{ address: player, amount: Number(amount), roll: roll.toString(16).toUpperCase() }, ...rolls].slice(
              0,
              MAX_TABLE_ROWS,
            ),
          );
          // }, ROLLING_TIME_MS);
        }
      });
    },
  });

  const { data: winnerHistoryData, isLoading: winnerHistoryLoading } = useScaffoldEventHistory({
    contractName: "DiceGame",
    eventName: "Winner",
  });

  useEffect(() => {
    if (!winners.length && !!winnerHistoryData?.length && !winnerHistoryLoading) {
      setWinners(
        (
          winnerHistoryData?.map(({ args }) => ({
            address: args.winner,
            amount: args.amount,
          })) || []
        ).slice(0, MAX_TABLE_ROWS),
      );
    }
  }, [winnerHistoryData, winnerHistoryLoading, winners.length]);

  useScaffoldEventSubscriber({
    contractName: "DiceGame",
    eventName: "Winner",
    listener: logs => {
      logs.map(log => {
        const { winner, amount } = log.args;

        if (winner && amount) {
          // setTimeout(() => {
          setIsRolling(false);
          setWinners(winners => [{ address: winner, amount }, ...winners].slice(0, MAX_TABLE_ROWS));
          // }, ROLLING_TIME_MS);
        }
      });
    },
  });

  const { data: MIN_ROLL_PRICE } = useScaffoldContractRead({
    contractName: "DiceGame",
    functionName: "MIN_ROLL_PRICE",
  });
  const ROLL_ETH_VALUE = MIN_ROLL_PRICE ? formatEther(MIN_ROLL_PRICE) : 0n;
  const { writeAsync: randomDiceRoll, isError: rollTheDiceError } = useScaffoldContractWrite({
    contractName: "DiceGame",
    functionName: "rollTheDice",
    value: ROLL_ETH_VALUE,
  });

  const { data: riggedRollOwner } = useScaffoldContractRead({ contractName: "RiggedRoll", functionName: "owner" });
  const account = useAccount();
  useEffect(() => {
    setIsRiggedRollOwner(riggedRollOwner === account?.address);
  }, [riggedRollOwner, account]);

  const { writeAsync: riggedRoll, isError: riggedRollError } = useScaffoldContractWrite({
    contractName: "RiggedRoll",
    functionName: "riggedRoll",
    gas: 1_000_000n,
  });

  const withdrawAmount = parseEther(riggedRollBalance?.formatted || "0");
  const { writeAsync: riggedRollWithdraw } = useScaffoldContractWrite({
    contractName: "RiggedRoll",
    functionName: "withdraw",
    args: [account?.address, withdrawAmount],
  });

  useEffect(() => {
    if (rollTheDiceError || riggedRollError) {
      setIsRolling(false);
      setRolled(false);
    }
  }, [riggedRollError, rollTheDiceError]);

  useEffect(() => {
    if (videoRef.current && !isRolling) {
      // show last frame
      videoRef.current.currentTime = 9999;
    }
  }, [isRolling]);

  return (
    <>
      <MetaHeader />
      <div className="py-10 px-10">
        <div className="grid grid-cols-3 max-lg:grid-cols-1">
          <div className="max-lg:row-start-2">
            <RollEvents rolls={rolls} />
          </div>

          <div className="flex flex-col items-center pt-4 max-lg:row-start-1">
            <div className="flex w-full justify-center">
              <span className="text-xl">{`Roll between 0 and 5 to win the prize!`}</span>
            </div>

            <div className="flex items-center mt-1 text-amber-400">
              <span className="text-lg mr-2 font-bold text-xl">Prize:</span>
              <Amount amount={prize ? Number(formatEther(prize)) : 0} showUsdPrice className="text-lg"/>
            </div>

            <div className="flex items-center mt-1">
              <span className="text-lg mr-2">Roll Price:</span>
              <Amount amount={Number(ROLL_ETH_VALUE)} showUsdPrice className="text-lg"/>
            </div>

            <button
                onClick={() => {
                  if (!rolled) {
                    setRolled(true);
                  }
                  setIsRolling(true);
                  randomDiceRoll();
                }}
                disabled={isRolling}
                className="mt-2 btn btn-secondary btn-xl normal-case font-xl text-lg"
            >
              Roll the dice!
            </button>
            {isRiggedRollOwner && (
                <div className="flex flex-col w-full mt-4 pt-2 border-t-4 border-primary items-center">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl">Rigged Roll</span>
                    <div className="flex mt-2 items-center">
                      <span className="mr-2 text-lg">Address:</span>{" "}
                      <Address size="lg" address={riggedRollContract?.address}/>{" "}
                    </div>
                    <div className="flex mt-1 items-center">
                      <span className="text-lg mr-2">Balance:</span>
                      <Amount amount={Number(riggedRollBalance?.formatted || 0)} showUsdPrice className="text-lg"/>
                    </div>
                  </div>
                  <button
                      onClick={() => {
                        if (!rolled) {
                          setRolled(true);
                        }
                        setIsRolling(true);
                        riggedRoll();
                      }}
                      disabled={isRolling}
                      className="mt-2 btn btn-secondary btn-xl normal-case font-xl text-lg"
                  >
                    Rigged Roll!
                  </button>
                  <button
                      onClick={() => riggedRollWithdraw()}
                      disabled={isRolling || withdrawAmount === 0n}
                      className="mt-2 btn btn-secondary btn-xl normal-case font-xl text-lg"
                  >
                    Withdraw!
                  </button>
                </div>
            )}

            <div className="flex mt-8">
              {rolled ? (
                  isRolling ? (
                      <video key="rolling" width={300} height={300} loop src="/rolls/Spin.webm" autoPlay/>
                  ) : (
                      <video key="rolled" width={300} height={300} src={`/rolls/${rolls[0]?.roll || "0"}.webm`}
                             autoPlay/>
                  )
              ) : (
                  <video
                      ref={videoRef}
                      key="last"
                      width={300}
                      height={300}
                      src={`/rolls/${rolls[0]?.roll || "0"}.webm`}
                  />
              )}
            </div>
          </div>

          <div className="max-lg:row-start-3">
            <WinnerEvents winners={winners}/>
          </div>
        </div>
      </div>
    </>
  );
};

export default DiceGame;
