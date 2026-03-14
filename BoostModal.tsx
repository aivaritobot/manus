  boostType?: BoostType;
  matchId?: number; // for private_session
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BoostModal({ boostType, matchId, onClose, onSuccess }: BoostModalProps) {
  const [selectedBoost, setSelectedBoost] = useState<BoostType>(boostType ?? "spotlight");
  const [chain, setChain] = useState<"sol" | "eth" | "bnb">("sol");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);