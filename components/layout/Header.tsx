'use client'

import { useState } from 'react'
import { useWallet } from '@/components/providers/WalletProvider'
import { Wallet, User, LogOut, Users, Trash2, Check } from 'lucide-react'

interface HeaderProps {
  showInsights?: boolean
  onToggleInsights?: (show: boolean) => void
  onShowProfile?: () => void
  storeMemory?: boolean
  onToggleMemory?: (enabled: boolean) => void
  onClearChat?: () => void
  insights?: any
}

export function Header({ 
  showInsights = false,
  onToggleInsights,
  onShowProfile,
  storeMemory = true,
  onToggleMemory,
  onClearChat,
  insights
}: HeaderProps = {}) {
  const { isConnected, accountId, balance, connect, disconnect, isLoading, currentOperation } = useWallet()

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (num < 0.001) return '< 0.001'
    return num.toFixed(3)
  }

  const formatAccountId = (accountId: string | null) => {
    if (!accountId) return 'Unknown'
    if (accountId.length <= 12) return accountId
    return `${accountId.slice(0, 6)}...${accountId.slice(-4)}`
  }

  return (
    <header className="bg-white border-b-4 border-gray-500">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Enhanced with gradient */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border-3 border-gray-500 bg-blue-500 shadow-[3px_3px_0px_0px_rgba(107,114,128,1)]">
              <Users className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
            <h1 className="text-lg font-black text-gray-900">
              Amigo.ai
            </h1>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wide">Your AI Friend</p>
            </div>
          </div>

          {/* Right side - Enhanced controls */}
          <div className="flex items-center space-x-3">
            {/* Memory Toggle */}
            {onToggleMemory && (
              <button
                onClick={() => onToggleMemory(!storeMemory)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border-3 border-gray-500 ${
                  storeMemory
                    ? 'bg-blue-100 text-blue-600 shadow-[3px_3px_0px_0px_rgba(107,114,128,1)]'
                    : 'bg-gray-100 text-gray-500 shadow-[2px_2px_0px_0px_rgba(107,114,128,1)]'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${storeMemory ? 'opacity-100' : 'opacity-40'}`} strokeWidth={2.5} />
                <span>Remember</span>
              </button>
            )}

            {/* Clear Chat */}
              {onClearChat && (
                <button
                  onClick={onClearChat}
                  className="p-2.5 rounded-lg border-3 border-gray-500 bg-white hover:bg-red-50 text-gray-600 hover:text-red-500 transition-all shadow-[3px_3px_0px_0px_rgba(107,114,128,1)] hover:shadow-[4px_4px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                </button>
              )}

            {/* Wallet */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <div className="flex items-center space-x-2 px-4 py-2 rounded-lg border-3 border-gray-500 bg-white shadow-[3px_3px_0px_0px_rgba(107,114,128,1)]">
                    <User className="w-3.5 h-3.5 text-blue-600" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-gray-900">{formatAccountId(accountId)}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs font-bold text-blue-600">{formatBalance(balance)}</span>
                  </div>
                  <button
                    onClick={disconnect}
                    className="p-2.5 rounded-lg border-3 border-gray-500 bg-white hover:bg-red-50 text-gray-600 hover:text-red-500 transition-all shadow-[3px_3px_0px_0px_rgba(107,114,128,1)] hover:shadow-[4px_4px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                    disabled={isLoading}
                  >
                    <LogOut className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => connect('metamask')}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-lg text-white text-xs font-black transition-all border-3 border-gray-500 bg-blue-500 hover:bg-blue-600 shadow-[4px_4px_0px_0px_rgba(107,114,128,1)] hover:shadow-[6px_6px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] uppercase tracking-wide"
                  disabled={isLoading}
                >
                  <Wallet className="w-4 h-4" strokeWidth={3} />
                  <span>{isLoading ? 'Connecting...' : 'Connect'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
