// Unified wallet service supporting MetaMask
import { getMetaMaskWallet, MetaMaskAccount } from './metamask-wallet';

export type WalletType = 'metamask';

export interface UnifiedWalletAccount {
  address: string;
  balance: string;
  isConnected: boolean;
  walletType: WalletType;
}

export class UnifiedWalletService {
  private metaMaskWallet = getMetaMaskWallet();
  private currentWalletType: WalletType | null = null;

  async initialize(): Promise<void> {
    // MetaMask wallet doesn't need explicit initialization
    console.log('🦊 MetaMask wallet service ready');
  }

  async connectWallet(walletType: WalletType = 'metamask'): Promise<boolean> {
    try {
      this.currentWalletType = walletType;

      if (walletType === 'metamask') {
        return await this.metaMaskWallet.connect();
      }

      return false;
    } catch (error) {
      console.error(`Failed to connect ${walletType} wallet:`, error);
      return false;
    }
  }

  async disconnectWallet(): Promise<void> {
    console.log('🔌 UnifiedWallet disconnect started')
    console.log('💼 Current wallet type:', this.currentWalletType)
    
    const walletType = this.currentWalletType
    
    // Reset state immediately
    this.currentWalletType = null
    console.log('🔄 UnifiedWallet state reset immediately')
    
    // Trigger MetaMask disconnect in background (non-blocking)
    if (walletType === 'metamask') {
      console.log('🦊 Triggering MetaMask wallet disconnect...')
      this.metaMaskWallet.disconnect().catch(error => {
        console.warn('⚠️ MetaMask wallet background disconnect error:', error)
      })
    } else {
      console.log('ℹ️  No wallet type was set')
    }
    
    console.log('✅ UnifiedWallet disconnect completed (non-blocking)')
  }

  isWalletConnected(): boolean {
    if (this.currentWalletType === 'metamask') {
      return this.metaMaskWallet.isConnected();
    }
    
    return false;
  }

  getAccountId(): string | null {
    if (this.currentWalletType === 'metamask') {
      return this.metaMaskWallet.getAccountId();
    }
    
    return null;
  }

  getAccount(): UnifiedWalletAccount | null {
    if (this.currentWalletType === 'metamask') {
      const account = this.metaMaskWallet.getAccount();
      if (!account) return null;
      
      return {
        address: account.address,
        balance: account.balance,
        isConnected: account.isConnected,
        walletType: 'metamask',
      };
    }
    
    return null;
  }

  async getAccountBalance(): Promise<string> {
    if (this.currentWalletType === 'metamask') {
      return await this.metaMaskWallet.getBalance();
    }
    
    return '0';
  }

  getCurrentWalletType(): WalletType | null {
    return this.currentWalletType;
  }

  async isMetaMaskInstalled(): Promise<boolean> {
    return await this.metaMaskWallet.isInstalled();
  }

  async switchToEthereumNetwork(): Promise<boolean> {
    if (this.currentWalletType === 'metamask') {
      // MetaMask is already on Ethereum network
      return true;
    }
    return false;
  }

  async signMessage(message: string): Promise<string | null> {
    if (this.currentWalletType === 'metamask') {
      return await this.metaMaskWallet.signMessage(message);
    }
    
    return null;
  }
}

// Singleton instance
let unifiedWalletInstance: UnifiedWalletService | null = null;

export const getUnifiedWallet = (): UnifiedWalletService => {
  if (!unifiedWalletInstance) {
    unifiedWalletInstance = new UnifiedWalletService();
  }
  return unifiedWalletInstance;
};






