import { motion } from 'motion/react';
import { X, Trophy, Zap, TrendingUp } from 'lucide-react';

interface PivotModalProps {
  onClose: () => void;
  onPivot: () => void;
  reputation: number;
  reputationGain: number;
  lifetimeUsers: number;
  lifetimeRevenue: number;
}

export default function PivotModal({
  onClose,
  onPivot,
  reputation,
  reputationGain,
  lifetimeUsers,
  lifetimeRevenue
}: PivotModalProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toString();
  };

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
        className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border-4 border-yellow-300"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="text-5xl">🏆</div>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-800">
                Ready to Pivot?
              </h2>
              <p className="text-gray-600">You've reached IPO - time for a new venture!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-5">
            <div className="text-gray-700 font-bold mb-3">📊 This Run's Performance</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-600 text-sm mb-1">Total Users</div>
                <div className="text-purple-600 text-2xl font-bold tabular-nums">{formatNumber(lifetimeUsers)}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm mb-1">Total Revenue</div>
                <div className="text-green-600 text-2xl font-bold tabular-nums">${formatNumber(lifetimeRevenue)}</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-3xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">⚡</div>
              <div className="text-yellow-700 font-bold text-lg">Reputation Earned</div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-yellow-600 tabular-nums">{reputationGain}</span>
              <span className="text-yellow-700 text-sm font-bold">points!</span>
            </div>
            <div className="text-yellow-700 text-sm font-bold mt-2">
              Total after pivot: {reputation + reputationGain} reputation
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl">✅</div>
              <div className="text-green-700 font-bold">What Carries Over</div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-xl">✓</span>
                <span className="font-medium">All reputation and purchased upgrades</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-xl">✓</span>
                <span className="font-medium">Permanent bonuses from reputation upgrades</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-3xl p-5">
            <div className="text-red-700 font-bold mb-2">What Resets</div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-xl">×</span>
                <span className="font-medium">All cash, users, and agents</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-xl">×</span>
                <span className="font-medium">Funding stage progress</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-xl">×</span>
                <span className="font-medium">Manager purchases and model unlocks (unless upgraded)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPivot}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
          >
            🚀 Pivot & Start Fresh
          </motion.button>
          <button
            onClick={onClose}
            className="px-8 py-4 rounded-2xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
          >
            Keep Playing
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
