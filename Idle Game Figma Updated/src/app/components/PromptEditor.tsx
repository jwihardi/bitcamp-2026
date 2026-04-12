import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, AlertCircle } from 'lucide-react';

interface PromptEditorProps {
  agentName: string;
  currentQuality: number;
  onClose: () => void;
  onImprove: (improvement: number) => void;
}

const PROMPT_CHALLENGES = [
  {
    task: "Get the agent to summarize a document",
    goodKeywords: ["summarize", "key points", "concise", "brief", "main ideas"],
    badKeywords: ["maybe", "kind of", "sort of", "i think", "please try"],
    hints: ["Be specific", "Use action verbs", "Avoid filler words"]
  },
  {
    task: "Generate creative content",
    goodKeywords: ["create", "generate", "format", "tone", "audience", "specific"],
    badKeywords: ["just", "something", "anything", "whatever", "random"],
    hints: ["Define format", "Specify tone", "Set constraints"]
  },
  {
    task: "Analyze data patterns",
    goodKeywords: ["analyze", "identify", "patterns", "metrics", "compare", "quantify"],
    badKeywords: ["look at", "check", "see if", "try to find", "maybe"],
    hints: ["Be precise", "Request specific metrics", "Define success"]
  }
];

export default function PromptEditor({ agentName, currentQuality, onClose, onImprove }: PromptEditorProps) {
  const [prompt, setPrompt] = useState("");
  const [currentChallenge] = useState(() =>
    PROMPT_CHALLENGES[Math.floor(Math.random() * PROMPT_CHALLENGES.length)]
  );
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);

  const analyzePrompt = () => {
    if (!prompt.trim()) {
      setResult({ score: 0, feedback: "Please write a prompt first!" });
      return;
    }

    const lowerPrompt = prompt.toLowerCase();
    let score = 40;
    const feedback: string[] = [];

    const goodMatches = currentChallenge.goodKeywords.filter(kw => lowerPrompt.includes(kw));
    const badMatches = currentChallenge.badKeywords.filter(kw => lowerPrompt.includes(kw));

    score += goodMatches.length * 10;
    score -= badMatches.length * 8;

    if (prompt.length < 20) {
      score -= 15;
      feedback.push("Too short - be more specific");
    } else if (prompt.length > 200) {
      score -= 10;
      feedback.push("Too long - be more concise");
    }

    if (prompt.includes("?")) {
      score += 5;
      feedback.push("Good use of questions");
    }

    if (lowerPrompt.includes("step") || lowerPrompt.includes("format") || lowerPrompt.includes("structure")) {
      score += 8;
      feedback.push("Clear structure requested");
    }

    if (badMatches.length > 0) {
      feedback.push(`Avoid: ${badMatches.join(", ")}`);
    }

    if (goodMatches.length < 2) {
      feedback.push(`Try using: ${currentChallenge.goodKeywords.slice(0, 3).join(", ")}`);
    }

    score = Math.max(0, Math.min(100, score));

    const improvement = Math.floor(score / 5);

    setResult({
      score,
      feedback: feedback.join(" • ")
    });

    if (score >= 50) {
      onImprove(improvement);
    }
  };

  const tokenEstimate = Math.floor(prompt.length * 0.75);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl border-4 border-purple-300"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2">
              <span className="text-4xl">✍️</span>
              Prompt Engineering
            </h2>
            <p className="text-gray-600 mt-1">{agentName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-3xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">💡</div>
            <div>
              <div className="text-gray-800 font-bold mb-1">Challenge: {currentChallenge.task}</div>
              <div className="text-gray-600 text-sm mb-3">
                Write an efficient prompt. Good prompts use fewer tokens and get better results!
              </div>
              <div className="flex flex-wrap gap-2">
                {currentChallenge.hints.map((hint, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-white border-2 border-blue-200 text-blue-700 font-bold">
                    {hint}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="font-bold text-gray-800">Your Prompt</label>
              <span className="text-xs text-gray-500">~{tokenEstimate} tokens</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Write your prompt here..."
              className="w-full h-32 bg-white border-2 border-gray-300 rounded-2xl p-4 text-gray-800 placeholder-gray-400 focus:border-purple-400 focus:outline-none resize-none font-medium"
            />
          </div>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border-2 rounded-3xl p-5 ${
                result.score >= 70 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' :
                result.score >= 50 ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300' :
                'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">
                  {result.score >= 70 ? '🎉' : result.score >= 50 ? '👍' : '😅'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800 text-lg">Score: {result.score}/100</span>
                    {result.score >= 50 && (
                      <span className="px-3 py-1 rounded-full bg-green-400 text-white text-sm font-bold">
                        +{Math.floor(result.score / 5)} quality!
                      </span>
                    )}
                  </div>
                  {result.feedback && (
                    <div className="text-sm text-gray-700">{result.feedback}</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={analyzePrompt}
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Analyze Prompt
            </motion.button>
            <button
              onClick={onClose}
              className="px-8 py-4 rounded-2xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
            >
              Done
            </button>
          </div>

          <div className="bg-gray-50 border-2 border-gray-200 rounded-3xl p-5">
            <div className="text-sm font-bold text-gray-700 mb-3">Current Prompt Quality</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${currentQuality}%` }}
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                />
              </div>
              <span className="font-bold text-gray-800 tabular-nums text-lg w-16 text-right">{currentQuality}%</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
