import React, { useState } from 'react';
import { HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    question: 'What is Nexus One-Shot?',
    answer: 'Nexus One-Shot is a provably fair betting game where players can place bets with a 50/50 chance of winning. Each bet costs 0.01 NEX, and winning doubles your bet. From every bet, 2% goes to the jackpot pool and 5% to stakers. The game uses blockchain-based randomness to ensure complete fairness and transparency.'
  },
  {
    question: 'How does the Jackpot System work?',
    answer: 'The Jackpot System rewards players for consecutive wins. 2% of every bet is added to a progressive jackpot pool. There are three tiers: Mini Jackpot (4 consecutive wins) pays 10% of the pool, Major Jackpot (6 consecutive wins) pays 25%, and Grand Jackpot (8 consecutive wins) pays 100%. Your win streak resets if you lose a bet, and the pool automatically reseeds after a Grand Jackpot win.'
  },
  {
    question: 'How does staking work in Nexus One-Shot?',
    answer: 'When you stake NEX tokens, you earn a proportional share of the platform fees. 5% of all bets are distributed to stakers based on their share of the staking pool. Your rewards accumulate automatically and can be withdrawn along with your staked tokens at any time.'
  },
  {
    question: 'What are the minimum bet and stake amounts?',
    answer: 'The minimum bet in Nexus One-Shot is fixed at 0.01 NEX tokens. For staking, the minimum amount is 100 NEX tokens. These limits are designed to maintain game balance and ensure meaningful staking rewards for participants.'
  },
  {
    question: 'How are winners determined in Nexus One-Shot?',
    answer: 'Winners in Nexus One-Shot are determined using blockchain-based randomness. This ensures that each bet has exactly a 50% chance of winning and results cannot be manipulated by anyone, including the developers.'
  },
  {
    question: 'Can I withdraw my staked tokens anytime?',
    answer: 'Yes, you can withdraw your staked NEX tokens and accumulated rewards at any time. There is no lockup period in Nexus One-Shot, giving you complete flexibility with your funds. Withdrawals include both your original staked amount and any rewards you\'ve earned.'
  },
  {
    question: 'What happens if I lose connection during a bet?',
    answer: 'All bets in Nexus One-Shot are processed on the blockchain, so connection issues will not affect the outcome. If you disconnect, the transaction will either complete or fail based on blockchain conditions. You can check your bet history or wallet transactions to see the result once you reconnect.'
  },
  {
    question: 'How do I increase my chances of winning the Grand Jackpot?',
    answer: 'The Grand Jackpot requires 8 consecutive wins, which is based on probability. Each bet has an independent 50% chance of winning, and you need to win 8 times in a row to claim the Grand Jackpot. While this is challenging (1 in 256 chance), consistent play increases your opportunities to build winning streaks.'
  }
];

type FAQItemProps = {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
};

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="font-medium">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-primary" />
        ) : (
          <ChevronDown className="w-5 h-5 text-primary" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-48' : 'max-h-0'
        }`}
      >
        <p className="p-4 pt-0 text-foreground/70 text-sm">
          {answer}
        </p>
      </div>
    </div>
  );
}

type FAQsProps = {
  isConnected?: boolean;
};

export function FAQs({ isConnected }: FAQsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openItems, setOpenItems] = useState<number[]>([]);

  if (!isConnected) return null;

  const toggleItem = (index: number) => {
    setOpenItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 w-12 h-12 flex items-center justify-center neo-button rounded-full z-50 hover:scale-110 transition-transform"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold mb-1">Frequently Asked Questions</h2>
                <p className="text-sm text-foreground/70">
                  Everything you need to know about Nexus One-Shot
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar p-6 space-y-3">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openItems.includes(index)}
                  onToggle={() => toggleItem(index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}