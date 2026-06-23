import { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  CreditCard,
  IndianRupee,
  Plus,
  X,
  Loader2,
  Wallet as WalletIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { WalletTransaction, TransactionType } from '../lib/types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const TransactionIcon = ({ type }: { type: TransactionType }) => {
  const iconConfig = {
    deposit: { bg: 'bg-success-100', icon: ArrowDownLeft, color: 'text-success-600' },
    withdrawal: { bg: 'bg-error-100', icon: ArrowUpRight, color: 'text-error-600' },
    earning: { bg: 'bg-success-100', icon: ArrowDownLeft, color: 'text-success-600' },
    escrow_hold: { bg: 'bg-warning-100', icon: Lock, color: 'text-warning-600' },
    escrow_release: { bg: 'bg-primary-100', icon: Unlock, color: 'text-primary-600' },
    subscription: { bg: 'bg-gray-100', icon: CreditCard, color: 'text-gray-600' },
  };

  const config = iconConfig[type];
  const Icon = config.icon;

  return (
    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
      <Icon className={`w-5 h-5 ${config.color}`} />
    </div>
  );
};

const WithdrawModal = ({
  isOpen,
  onClose,
  onSuccess,
  availableBalance,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance: number;
}) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const presetAmounts = [500, 1000, 2000, 5000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount > availableBalance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: -numAmount,
        description: `Withdrawal to UPI / Bank`,
        status: 'completed',
      });

      if (insertError) throw insertError;

      setAmount('');
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to withdraw. Please try again.');
      console.error('Withdrawal error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-error-100 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-error-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Withdraw Funds</h2>
              <p className="text-sm text-gray-500">Transfer to bank account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-sm text-gray-500">Available Balance</p>
          <p className="text-xl font-bold text-gray-900 flex items-center">
            <IndianRupee className="w-5 h-5 mr-1 text-gray-400" />
            {availableBalance.toLocaleString('en-IN')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (INR)</label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={availableBalance}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg font-semibold"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                disabled={preset > availableBalance}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 ${
                  amount === preset.toString()
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                ₹{preset}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-xl text-sm text-error-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>Withdraw Funds</>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            Simulated withdrawal — no real money is transferred
          </p>
        </form>
      </div>
    </div>
  );
};

const AddFundsModal = ({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const presetAmounts = [500, 1000, 2000, 5000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount: numAmount,
        description: `Added funds via UPI / Bank`,
        status: 'completed',
      });

      if (insertError) throw insertError;

      setAmount('');
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to add funds. Please try again.');
      console.error('Deposit error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-100 flex items-center justify-center">
              <Plus className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add Funds</h2>
              <p className="text-sm text-gray-500">Top up your wallet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (INR)</label>
            <div className="relative">
              <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg font-semibold"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  amount === preset.toString()
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                ₹{preset}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-xl text-sm text-error-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>Add Funds</>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            Simulated payment — no real money is charged
          </p>
        </form>
      </div>
    </div>
  );
};

const Wallet = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [escrowBalance, setEscrowBalance] = useState(0);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    if (user) loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);

      // Calculate balances properly
      // Available = deposits + earnings + escrow_releases - withdrawals - escrow_holds
      // Escrow = escrow_holds (held status) - escrow_releases (completed)
      let available = 0;
      let escrow = 0;

      data?.forEach((tx) => {
        const amount = Math.abs(tx.amount);

        if (tx.type === 'deposit' && tx.status === 'completed') {
          available += amount;
        } else if (tx.type === 'earning' && tx.status === 'completed') {
          available += amount;
        } else if (tx.type === 'withdrawal' && tx.status === 'completed') {
          available -= amount;
        } else if (tx.type === 'subscription' && tx.status === 'completed') {
          available -= amount;
        } else if (tx.type === 'escrow_hold') {
          if (tx.status === 'held') {
            // Money held in escrow, deducted from available
            available -= amount;
            escrow += amount;
          } else if (tx.status === 'completed') {
            // Escrow released (money sent to workers)
            escrow -= amount;
          }
        } else if (tx.type === 'escrow_release' && tx.status === 'completed') {
          // This is for workers receiving funds from escrow
          available += amount;
        }
      });

      setAvailableBalance(Math.max(0, available));
      setEscrowBalance(Math.max(0, escrow));
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Wallet</h1>
            <p className="text-sm text-gray-500">Manage your earnings</p>
          </div>
          <button
            onClick={() => setShowAddFunds(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium text-sm hover:bg-primary-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Funds
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 text-white">
            <p className="text-sm opacity-80 mb-1">Available Balance</p>
            <p className="text-2xl font-bold flex items-center">
              <IndianRupee className="w-5 h-5 mr-1" />
              {availableBalance.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border-2 border-warning-200">
            <div className="flex items-center gap-1 text-warning-600 mb-1">
              <Lock className="w-4 h-4" />
              <p className="text-sm font-medium">Funds in Escrow</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 flex items-center">
              <IndianRupee className="w-5 h-5 mr-1 text-gray-400" />
              {escrowBalance.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setShowAddFunds(true)}
            className="flex items-center justify-center gap-2 py-3 bg-success-50 text-success-700 rounded-xl font-medium hover:bg-success-100 transition-colors border border-success-200"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Add Funds
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={availableBalance === 0}
            className="flex items-center justify-center gap-2 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </button>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Recent Transactions</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 h-16 animate-pulse">
                  <div className="bg-gray-200 h-4 w-32 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 w-48 rounded"></div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <WalletIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-2">No transactions yet</p>
              <button
                onClick={() => setShowAddFunds(true)}
                className="text-primary-600 font-medium text-sm hover:underline"
              >
                Add your first funds
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-white rounded-xl p-4 flex items-center gap-3">
                  <TransactionIcon type={tx.type} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.amount >= 0 ? 'text-success-600' : 'text-gray-900'
                      }`}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p
                      className={`text-xs ${
                        tx.status === 'completed'
                          ? 'text-success-600'
                          : tx.status === 'held'
                          ? 'text-warning-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddFundsModal
        isOpen={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        onSuccess={loadTransactions}
      />

      <WithdrawModal
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onSuccess={loadTransactions}
        availableBalance={availableBalance}
      />
    </div>
  );
};

export default Wallet;
