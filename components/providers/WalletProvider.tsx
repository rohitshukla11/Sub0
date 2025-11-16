'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getUnifiedWallet, WalletType } from '@/lib/unified-wallet'

interface WalletContextType {
  isConnected: boolean
  accountId: string | null
  balance: string
  walletType: WalletType | null
  connect: (walletType?: WalletType) => Promise<boolean>
  disconnect: () => Promise<void>
  isLoading: boolean
  currentOperation: 'connect' | 'disconnect' | 'idle'
  checkConnection: () => Promise<void>
  signMessage: (message: string) => Promise<string | null>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [balance, setBalance] = useState('0')
  const [walletType, setWalletType] = useState<WalletType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<'connect' | 'disconnect' | 'idle'>('idle')
  const unifiedWallet = getUnifiedWallet()

  // Initialize wallet on component mount
  useEffect(() => {
    const initializeWallet = async () => {
      try {
        console.log('🚀 [INIT] Initializing wallet on mount...')
        console.log('🔍 [INIT] Current URL:', window.location.href)
        console.log('🔍 [INIT] URL search params:', window.location.search)
        
        // Check localStorage for previous connection
        const savedAccountId = localStorage.getItem('metamask_wallet_account_id')
        const savedWalletType = localStorage.getItem('wallet_type')
        console.log('💾 [INIT] Saved connection data:', { savedAccountId, savedWalletType })
        
        await unifiedWallet.initialize()
        
        // MetaMask wallet initializes immediately
        
        // Check if already connected (after redirect or page refresh)
        const walletConnected = unifiedWallet.isWalletConnected()
        console.log('🔍 [INIT] Wallet connection check result:', walletConnected)
        
        if (walletConnected) {
          console.log('✅ [INIT] Wallet already connected, updating UI...')
          const currentWalletType = unifiedWallet.getCurrentWalletType()
          const currentAccountId = unifiedWallet.getAccountId()
          console.log('📋 [INIT] Account details:', { currentWalletType, currentAccountId })
          
          const currentBalance = await unifiedWallet.getAccountBalance()
          console.log('💰 [INIT] Balance retrieved:', currentBalance)
          
          setIsConnected(true)
          setAccountId(currentAccountId)
          setBalance(currentBalance)
          setWalletType(currentWalletType)
          setIsLoading(false)
          setCurrentOperation('idle')
          
          // Save to localStorage for persistence
          if (currentAccountId) {
            localStorage.setItem('metamask_wallet_account_id', currentAccountId)
            localStorage.setItem('wallet_type', currentWalletType || 'metamask')
            console.log('💾 [INIT] Connection saved to localStorage')
          }
          
          console.log('🔄 [INIT] UI updated for existing connection')
        } else if (savedAccountId && savedWalletType) {
          // Try to recover connection using saved data
          console.log('🔄 [INIT] Attempting to recover connection using saved data...')
          
          // Force a re-check after a longer delay
          setTimeout(async () => {
            console.log('🔄 [INIT] Delayed connection recovery check...')
            try {
              await unifiedWallet.initialize()
              
              if (unifiedWallet.isWalletConnected()) {
                const currentWalletType = unifiedWallet.getCurrentWalletType()
                const currentAccountId = unifiedWallet.getAccountId()
                const currentBalance = await unifiedWallet.getAccountBalance()
                
                setIsConnected(true)
                setAccountId(currentAccountId)
                setBalance(currentBalance)
                setWalletType(currentWalletType)
                setIsLoading(false)
                setCurrentOperation('idle')
                
                console.log('✅ [INIT] Connection recovered via delayed check')
              }
            } catch (error) {
              console.error('❌ [INIT] Delayed recovery failed:', error)
            }
          }, 2000)
        } else {
          console.log('ℹ️ [INIT] No existing wallet connection found')
          // Reset all states
          setIsConnected(false)
          setAccountId(null)
          setBalance('0')
          setWalletType(null)
          setIsLoading(false)
          setCurrentOperation('idle')
        }
      } catch (error) {
        console.error('❌ [INIT] Failed to initialize wallet:', error)
        setIsLoading(false)
        setCurrentOperation('idle')
      }
    }

    initializeWallet()
    
    // MetaMask doesn't use URL callbacks
    
    // Additional connection recovery mechanism for page refreshes
    const checkForExistingConnection = () => {
      let retryCount = 0
      const maxRetries = 5
      
      const retryConnection = async () => {
        retryCount++
        console.log(`🔄 [RECOVERY] Connection recovery attempt ${retryCount}/${maxRetries}`)
        
        try {
          // Force re-initialize wallet
          await unifiedWallet.initialize()
          
          const walletConnected = unifiedWallet.isWalletConnected()
          console.log(`🔍 [RECOVERY] Connection check #${retryCount}:`, walletConnected)
          
          if (walletConnected && !isConnected) {
            console.log('🎉 [RECOVERY] Connection recovered!')
            
            const currentWalletType = unifiedWallet.getCurrentWalletType()
            const currentAccountId = unifiedWallet.getAccountId()
            const currentBalance = await unifiedWallet.getAccountBalance()
            
            setIsConnected(true)
            setAccountId(currentAccountId)
            setBalance(currentBalance)
            setWalletType(currentWalletType)
            setIsLoading(false)
            setCurrentOperation('idle')
            
            // Save to localStorage for persistence
            if (currentAccountId) {
              localStorage.setItem('metamask_wallet_account_id', currentAccountId)
              localStorage.setItem('wallet_type', currentWalletType || 'metamask')
              console.log('💾 [RECOVERY] Connection saved to localStorage')
            }
            
            console.log('✅ [RECOVERY] Connection restored successfully')
            return true
          }
          
          if (retryCount < maxRetries) {
            setTimeout(retryConnection, 2000) // Try again in 2 seconds
          } else {
            console.log('⏰ [RECOVERY] Max retries reached, stopping')
          }
        } catch (error) {
          console.error(`❌ [RECOVERY] Error in attempt ${retryCount}:`, error)
          if (retryCount < maxRetries) {
            setTimeout(retryConnection, 2000)
          }
        }
        
        return false
      }
      
      // Start first retry after 3 seconds
      setTimeout(retryConnection, 3000)
    }
    
    // Start recovery mechanism
    checkForExistingConnection()
    
    // Check for connection when page regains focus
    const handleFocus = () => {
      console.log('👁️ [FOCUS] Page focused, checking for wallet connection...')
      console.log('🔍 [FOCUS] Current state:', { isConnected, isLoading, currentOperation, accountId })
      
      // Use multiple timeouts for better detection reliability
      setTimeout(async () => {
        try {
          const walletConnected = unifiedWallet.isWalletConnected()
          console.log('🔍 [FOCUS] Wallet status:', { walletConnected, uiConnected: isConnected, operation: currentOperation })
          
          if (walletConnected && !isConnected) {
            console.log('🔗 [FOCUS] NEW CONNECTION DETECTED! Updating UI...')
            const currentWalletType = unifiedWallet.getCurrentWalletType()
            const currentAccountId = unifiedWallet.getAccountId()
            const currentBalance = await unifiedWallet.getAccountBalance()
            
            setIsConnected(true)
            setAccountId(currentAccountId)
            setBalance(currentBalance)
            setWalletType(currentWalletType)
            setIsLoading(false)
            setCurrentOperation('idle')
            
            // Save to localStorage for persistence
            if (currentAccountId) {
              localStorage.setItem('metamask_wallet_account_id', currentAccountId)
              localStorage.setItem('wallet_type', currentWalletType || 'metamask')
              console.log('💾 [FOCUS] Connection saved to localStorage')
            }
            
            console.log('✅ [FOCUS] UI updated successfully:', { currentAccountId, currentBalance })
          } else if (!walletConnected && isConnected) {
            console.log('🔌 [FOCUS] Disconnection detected, updating UI...')
            setIsConnected(false)
            setAccountId(null)
            setBalance('0')
            setWalletType(null)
            setIsLoading(false)
            setCurrentOperation('idle')
            
            // Clear localStorage on disconnection
            localStorage.removeItem('metamask_wallet_account_id')
            localStorage.removeItem('wallet_type')
            console.log('💾 [FOCUS] localStorage cleared on disconnection')
          } else if (walletConnected && isConnected) {
            // Both are connected, ensure states are synchronized
            console.log('🔄 [FOCUS] Synchronizing connected state...')
            setIsLoading(false)
            setCurrentOperation('idle')
          } else {
            // Neither connected, ensure clean state
            console.log('🔄 [FOCUS] Ensuring clean disconnected state...')
            setIsLoading(false)
            setCurrentOperation('idle')
          }
        } catch (error) {
          console.error('❌ [FOCUS] Error during focus check:', error)
          setIsLoading(false)
          setCurrentOperation('idle')
        }
      }, 500) // First check after 500ms
      
      // Second check after 2 seconds for more reliable detection
      setTimeout(async () => {
        try {
          const walletConnected = unifiedWallet.isWalletConnected()
          if (walletConnected && !isConnected) {
            console.log('🔗 [FOCUS-2] Late connection detection, updating UI...')
            const currentWalletType = unifiedWallet.getCurrentWalletType()
            const currentAccountId = unifiedWallet.getAccountId()
            const currentBalance = await unifiedWallet.getAccountBalance()
            
            setIsConnected(true)
            setAccountId(currentAccountId)
            setBalance(currentBalance)
            setWalletType(currentWalletType)
            setIsLoading(false)
            setCurrentOperation('idle')
            
            // Save to localStorage for persistence
            if (currentAccountId) {
              localStorage.setItem('metamask_wallet_account_id', currentAccountId)
              localStorage.setItem('wallet_type', currentWalletType || 'metamask')
              console.log('💾 [FOCUS-2] Connection saved to localStorage')
            }
            
            console.log('✅ [FOCUS-2] Late UI update completed')
          }
        } catch (error) {
          console.warn('❌ [FOCUS-2] Error in late check:', error)
        }
      }, 2000)
    }
    
    // Add visibility change listener as well
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ [VISIBILITY] Page became visible')
        handleFocus() // Reuse the same logic
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isConnected])

  const connect = async (preferredWalletType: WalletType = 'metamask'): Promise<boolean> => {
    try {
      console.log('🔌 [CONNECT] Starting wallet connection...')
      console.log('🔍 [CONNECT] Current state:', { isConnected, isLoading, currentOperation, accountId })
      
      // Set operation state immediately
      setCurrentOperation('connect')
      
      // Don't set loading immediately if already connected
      if (unifiedWallet.isWalletConnected()) {
        console.log('✅ [CONNECT] Wallet already connected, updating UI...')
        const currentWalletType = unifiedWallet.getCurrentWalletType()
        const currentAccountId = unifiedWallet.getAccountId()
        const currentBalance = await unifiedWallet.getAccountBalance()
        
        setIsConnected(true)
        setAccountId(currentAccountId)
        setBalance(currentBalance)
        setWalletType(currentWalletType)
        setCurrentOperation('idle')
        return true
      }
      
      // Set loading state for new connection
      console.log('⏳ [CONNECT] Setting loading state for new connection...')
      setIsLoading(true)
      
      // Try to connect with the preferred wallet type
      const connected = await unifiedWallet.connectWallet(preferredWalletType)
      console.log('📱 [CONNECT] Connect wallet result:', connected)
      
      if (connected) {
        // For NEAR wallet, check if we're already signed in after the call
        if (unifiedWallet.isWalletConnected()) {
          console.log('✅ [CONNECT] Wallet connected immediately, updating UI...')
          const account = unifiedWallet.getAccount()
          
          if (account) {
      setIsConnected(true)
            setAccountId(account.address)
            setBalance(account.balance)
            setWalletType(account.walletType)
            
            // Update balance
            try {
              const freshBalance = await unifiedWallet.getAccountBalance()
              setBalance(freshBalance)
              console.log('💰 [CONNECT] Balance updated:', freshBalance)
            } catch (error) {
              console.warn('Failed to fetch balance:', error)
            }
            
            setIsLoading(false)
            setCurrentOperation('idle')
            
            // Save to localStorage for persistence
            if (account.address) {
              localStorage.setItem('metamask_wallet_account_id', account.address)
              localStorage.setItem('wallet_type', account.walletType || 'metamask')
              console.log('💾 [CONNECT] Connection saved to localStorage')
            }
            
      return true
          }
        } else {
          // For NEAR wallet redirect, set up periodic checks
          console.log('🔄 [CONNECT] NEAR wallet redirect in progress...')
          setTimeout(() => {
            console.log('⏰ [CONNECT] Clearing loading state after redirect')
            setIsLoading(false)
            // Keep operation as 'connect' until we detect actual connection
          }, 1000)
          
          // Set up periodic check for connection detection
          let checkCount = 0
          const maxChecks = 30 // Check for 30 seconds
          const checkInterval = setInterval(async () => {
            checkCount++
            console.log(`🔍 [CONNECT] Periodic check #${checkCount}/30`)
            
            try {
              if (unifiedWallet.isWalletConnected() && !isConnected) {
                console.log('🎉 [CONNECT] Connection detected via periodic check!')
                
                const currentWalletType = unifiedWallet.getCurrentWalletType()
                const currentAccountId = unifiedWallet.getAccountId()
                const currentBalance = await unifiedWallet.getAccountBalance()
                
                setIsConnected(true)
                setAccountId(currentAccountId)
                setBalance(currentBalance)
                setWalletType(currentWalletType)
                setIsLoading(false)
                setCurrentOperation('idle')
                
                // Save to localStorage for persistence
                if (currentAccountId) {
                  localStorage.setItem('metamask_wallet_account_id', currentAccountId)
                  localStorage.setItem('wallet_type', currentWalletType || 'metamask')
                  console.log('💾 [CONNECT] Periodic check - Connection saved to localStorage')
                }
                
                console.log('✅ [CONNECT] Periodic check - UI updated successfully')
                clearInterval(checkInterval)
              } else if (checkCount >= maxChecks) {
                console.log('⏰ [CONNECT] Periodic check timeout, stopping')
                setCurrentOperation('idle')
                clearInterval(checkInterval)
              }
    } catch (error) {
              console.error('❌ [CONNECT] Error in periodic check:', error)
            }
          }, 1000) // Check every second
          
          return true
        }
      }
      
      console.log('❌ [CONNECT] Connection failed')
      setIsLoading(false)
      setCurrentOperation('idle')
      return false
    } catch (error) {
      console.error('❌ [CONNECT] Failed to connect wallet:', error)
      setIsLoading(false)
      setCurrentOperation('idle')
      return false
    }
  }

  const disconnect = async (): Promise<void> => {
    console.log('🔌 [DISCONNECT] Starting wallet disconnect...')
    console.log('🔍 [DISCONNECT] Current state:', { isConnected, isLoading, currentOperation, accountId })
    
    // Set operation and loading state
    setCurrentOperation('disconnect')
    setIsLoading(true)
    
    try {
      const currentType = unifiedWallet.getCurrentWalletType()
      console.log('💼 [DISCONNECT] Current wallet type:', currentType)
      
      // Reset UI state immediately
      setIsConnected(false)
      setAccountId(null)
      setBalance('0')
      setWalletType(null)
      
      // Clear localStorage
      localStorage.removeItem('metamask_wallet_account_id')
      localStorage.removeItem('wallet_type')
      console.log('💾 [DISCONNECT] localStorage cleared')
      console.log('🔄 [DISCONNECT] UI state reset completed')
      
      // Quick reset of loading and operation state
      setTimeout(() => {
        setIsLoading(false)
        setCurrentOperation('idle')
        console.log('✅ [DISCONNECT] Operation completed')
      }, 250)
      
      // Handle wallet-specific disconnect logic in background
      unifiedWallet.disconnectWallet().catch(error => {
        console.warn('⚠️ [DISCONNECT] Background wallet disconnect error:', error)
      })
      
    } catch (error) {
      console.error('❌ [DISCONNECT] Failed to disconnect wallet:', error)
      
      // Reset all states on error
      setIsLoading(false)
      setCurrentOperation('idle')
      setIsConnected(false)
      setAccountId(null)
      setBalance('0')
      setWalletType(null)
    }
  }

  const checkConnection = async (): Promise<void> => {
    try {
      console.log('🔍 [CHECK] Manual connection check triggered')
      console.log('🔍 [CHECK] Current UI state:', { isConnected, isLoading, currentOperation, accountId })
      
      const walletConnected = unifiedWallet.isWalletConnected()
      console.log('🔍 [CHECK] Wallet connection status:', walletConnected)
      
      if (walletConnected && !isConnected) {
        console.log('🔗 [CHECK] Connection found! Updating UI...')
        
        const currentWalletType = unifiedWallet.getCurrentWalletType()
        const currentAccountId = unifiedWallet.getAccountId()
        const currentBalance = await unifiedWallet.getAccountBalance()
        
        setIsConnected(true)
        setAccountId(currentAccountId)
        setBalance(currentBalance)
        setWalletType(currentWalletType)
        setIsLoading(false)
        setCurrentOperation('idle')
        
        // Save to localStorage for persistence
        if (currentAccountId) {
          localStorage.setItem('metamask_wallet_account_id', currentAccountId)
          localStorage.setItem('wallet_type', currentWalletType || 'near')
          console.log('💾 [CHECK] Connection saved to localStorage')
        }
        
        console.log('✅ [CHECK] Manual check - UI updated successfully')
      } else if (!walletConnected && isConnected) {
        console.log('🔌 [CHECK] Disconnection detected, updating UI...')
        
        setIsConnected(false)
        setAccountId(null)
        setBalance('0')
        setWalletType(null)
        setIsLoading(false)
        setCurrentOperation('idle')
        
        // Clear localStorage on disconnection
        localStorage.removeItem('metamask_wallet_account_id')
        localStorage.removeItem('wallet_type')
        console.log('💾 [CHECK] localStorage cleared on disconnection')
      } else {
        console.log('ℹ️ [CHECK] No state change needed')
      }
    } catch (error) {
      console.error('❌ [CHECK] Error during manual check:', error)
    }
  }

  const signMessage = async (message: string): Promise<string | null> => {
    try {
      return await unifiedWallet.signMessage(message)
    } catch (error) {
      console.error('Failed to sign message:', error)
      return null
    }
  }

  const value: WalletContextType = {
    isConnected,
    accountId,
    balance,
    walletType,
    connect,
    disconnect,
    isLoading,
    currentOperation,
    checkConnection,
    signMessage
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}