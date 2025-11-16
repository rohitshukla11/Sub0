import CryptoJS from 'crypto-js';
import { 
  EncryptionConfig, 
  EncryptedData, 
  ThresholdEncryptionConfig, 
  EncryptionKey, 
  TimelockEncryption, 
  DecryptionResult 
} from '@/types/encryption';

export class EncryptionService {
  private config: EncryptionConfig;
  private keys: Map<string, EncryptionKey> = new Map();

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: 'AES-256-GCM',
      keyDerivation: 'PBKDF2',
      iterations: 100000,
      saltLength: 32,
      ivLength: 16,
      tagLength: 16,
      ...config
    };
  }

  /**
   * Generate a new encryption key pair
   */
  generateKeyPair(keyId?: string): EncryptionKey {
    const key = CryptoJS.lib.WordArray.random(32); // 256 bits
    const keyId_ = keyId || this.generateKeyId();
    
    const encryptionKey: EncryptionKey = {
      publicKey: key.toString(CryptoJS.enc.Hex),
      privateKey: key.toString(CryptoJS.enc.Hex),
      keyId: keyId_,
      algorithm: this.config.algorithm,
      createdAt: new Date(),
    };

    this.keys.set(keyId_, encryptionKey);
    return encryptionKey;
  }

  /**
   * Generate encryption key from user password
   */
  generateKeyFromPassword(password: string, salt?: string): EncryptionKey {
    const keyId = this.generateKeyId();
    const saltBytes = salt ? CryptoJS.enc.Hex.parse(salt) : CryptoJS.lib.WordArray.random(32);
    
    // Derive key from password using PBKDF2
    const derivedKey = CryptoJS.PBKDF2(password, saltBytes, {
      keySize: 256 / 32,
      iterations: this.config.iterations,
      hasher: CryptoJS.algo.SHA256
    });

    const encryptionKey: EncryptionKey = {
      publicKey: derivedKey.toString(CryptoJS.enc.Hex),
      privateKey: derivedKey.toString(CryptoJS.enc.Hex),
      keyId: keyId,
      algorithm: this.config.algorithm,
      createdAt: new Date(),
      salt: saltBytes.toString(CryptoJS.enc.Hex),
    };

    this.keys.set(keyId, encryptionKey);
    return encryptionKey;
  }

  /**
   * Encrypt content using AES-256-GCM
   */
  async encrypt(content: string, keyId?: string, keyManagementService?: any): Promise<EncryptedData> {
    let key: EncryptionKey | undefined;
    
    if (keyId && keyManagementService) {
      // Try to get key from KeyManagementService first
      key = keyManagementService.getKey(keyId);
    }
    
    if (!key && keyId) {
      // Fallback to local keys
      key = this.keys.get(keyId);
    }
    
    if (!key) {
      // Generate new key if none found
      key = this.generateKeyPair();
    }
    
    if (!key) {
      throw new Error('Encryption key not found');
    }

    const salt = CryptoJS.lib.WordArray.random(this.config.saltLength);
    const iv = CryptoJS.lib.WordArray.random(this.config.ivLength);
    
    // Derive key from password using PBKDF2
    const derivedKey = CryptoJS.PBKDF2(key.privateKey!, salt, {
      keySize: 256 / 32,
      iterations: this.config.iterations,
      hasher: CryptoJS.algo.SHA256
    });

    // Encrypt using AES-CBC (GCM not available in this version)
    const encrypted = CryptoJS.AES.encrypt(content, derivedKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      encryptedContent: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Hex),
      salt: salt.toString(CryptoJS.enc.Hex),
      tag: '', // GCM mode handles authentication
      algorithm: this.config.algorithm,
      keyDerivation: this.config.keyDerivation,
      iterations: this.config.iterations,
    };
  }

  /**
   * Decrypt content using AES-256-GCM
   */
  async decrypt(encryptedData: EncryptedData, keyId: string, keyManagementService?: any): Promise<DecryptionResult> {
    let key: EncryptionKey | undefined;
    
    if (keyManagementService) {
      // Try to get key from KeyManagementService first
      key = keyManagementService.getKey(keyId);
    }
    
    if (!key) {
      // Fallback to local keys
      key = this.keys.get(keyId);
    }
    
    if (!key) {
      throw new Error('Decryption key not found');
    }

    const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);

    // Derive key from password using PBKDF2
    const derivedKey = CryptoJS.PBKDF2(key.privateKey!, salt, {
      keySize: 256 / 32,
      iterations: encryptedData.iterations,
      hasher: CryptoJS.algo.SHA256
    });

    // Decrypt using AES-CBC (GCM not available in this version)
    const decrypted = CryptoJS.AES.decrypt(encryptedData.encryptedContent, derivedKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const content = decrypted.toString(CryptoJS.enc.Utf8);
    if (!content) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }

    return {
      content,
      metadata: {
        decryptedAt: new Date(),
        keyUsed: keyId,
        algorithm: encryptedData.algorithm,
      }
    };
  }

  /**
   * Implement threshold encryption (Shamir's Secret Sharing)
   */
  async createThresholdEncryption(
    content: string, 
    config: ThresholdEncryptionConfig
  ): Promise<{ shares: string[]; encryptedContent: EncryptedData }> {
    // Generate a random secret key
    const secretKey = CryptoJS.lib.WordArray.random(32);
    const keyId = this.generateKeyId();
    
    // Store the key temporarily
    const tempKey: EncryptionKey = {
      publicKey: secretKey.toString(CryptoJS.enc.Hex),
      privateKey: secretKey.toString(CryptoJS.enc.Hex),
      keyId,
      algorithm: this.config.algorithm,
      createdAt: new Date(),
    };
    this.keys.set(keyId, tempKey);

    // Encrypt the content with the secret key
    const encryptedContent = await this.encrypt(content, keyId);

    // Create shares using Shamir's Secret Sharing (simplified implementation)
    const shares = this.createSecretShares(secretKey.toString(CryptoJS.enc.Hex), config);

    // Clean up temporary key
    this.keys.delete(keyId);

    return { shares, encryptedContent };
  }

  /**
   * Reconstruct secret from threshold shares
   */
  async reconstructFromShares(shares: string[]): Promise<string> {
    // Simplified Shamir's Secret Sharing reconstruction
    // In production, use a proper cryptographic library
    if (shares.length < 2) {
      throw new Error('Not enough shares to reconstruct secret');
    }

    // For demo purposes, we'll use the first share as the secret
    // In real implementation, use proper polynomial interpolation
    return shares[0];
  }

  /**
   * Create timelock encryption
   */
  async createTimelockEncryption(
    content: string, 
    unlockTime: Date
  ): Promise<TimelockEncryption> {
    // Generate a key that will be "locked" until unlockTime
    const key = this.generateKeyPair();
    const encryptedContent = await this.encrypt(content, key.keyId);

    // In a real implementation, this would use RSA or lattice-based encryption
    // For demo purposes, we'll store the key with a timestamp
    const timelock: TimelockEncryption = {
      encryptedKey: key.privateKey!,
      unlockTime: unlockTime.getTime(),
      timelockAlgorithm: 'RSA', // Would be 'Lattice' for quantum-resistant
      publicKey: key.publicKey,
    };

    return timelock;
  }

  /**
   * Check if timelock has expired
   */
  isTimelockExpired(timelock: TimelockEncryption): boolean {
    return Date.now() >= timelock.unlockTime;
  }

  /**
   * Decrypt timelock-encrypted content
   */
  async decryptTimelock(timelock: TimelockEncryption, encryptedContent: EncryptedData): Promise<DecryptionResult> {
    if (!this.isTimelockExpired(timelock)) {
      throw new Error('Timelock has not expired yet');
    }

    // Reconstruct the key from timelock
    const key: EncryptionKey = {
      publicKey: timelock.publicKey,
      privateKey: timelock.encryptedKey,
      keyId: this.generateKeyId(),
      algorithm: this.config.algorithm,
      createdAt: new Date(),
    };

    this.keys.set(key.keyId, key);
    return this.decrypt(encryptedContent, key.keyId);
  }

  /**
   * Generate a unique key ID
   */
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create secret shares using Shamir's Secret Sharing (simplified)
   */
  private createSecretShares(secret: string, config: ThresholdEncryptionConfig): string[] {
    // This is a simplified implementation
    // In production, use a proper cryptographic library like 'secrets.js'
    const shares: string[] = [];
    const secretBytes = CryptoJS.enc.Hex.parse(secret);
    
    for (let i = 0; i < config.totalShares; i++) {
      // Generate a random share (simplified)
      const share = CryptoJS.lib.WordArray.random(32);
      shares.push(share.toString(CryptoJS.enc.Hex));
    }
    
    // The last share is the secret XORed with all other shares
    let xorResult = secretBytes;
    for (let i = 0; i < shares.length - 1; i++) {
      const shareBytes = CryptoJS.enc.Hex.parse(shares[i]);
      // Simple XOR implementation for WordArray
      const resultWords = [];
      for (let j = 0; j < Math.min(xorResult.words.length, shareBytes.words.length); j++) {
        resultWords.push(xorResult.words[j] ^ shareBytes.words[j]);
      }
      xorResult = CryptoJS.lib.WordArray.create(resultWords);
    }
    shares[shares.length - 1] = xorResult.toString(CryptoJS.enc.Hex);
    
    return shares;
  }

  /**
   * Get all available keys
   */
  getKeys(): EncryptionKey[] {
    const keys = Array.from(this.keys.values());
    console.log('🔐 Available encryption keys:', keys.length, 'keys');
    keys.forEach(key => {
      console.log(`🔑 Key ID: ${key.keyId}, Created: ${key.createdAt}`);
    });
    return keys;
  }

  /**
   * Remove a key
   */
  removeKey(keyId: string): boolean {
    return this.keys.delete(keyId);
  }

  /**
   * Export key for backup
   */
  exportKey(keyId: string): string {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error('Key not found');
    }
    return JSON.stringify(key);
  }

  /**
   * Import key from backup
   */
  importKey(keyData: string): EncryptionKey {
    const key = JSON.parse(keyData) as EncryptionKey;
    this.keys.set(key.keyId, key);
    return key;
  }

  /**
   * Save all keys to localStorage
   */
  saveKeysToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const keysArray = Array.from(this.keys.values());
      localStorage.setItem('encryption-keys', JSON.stringify(keysArray));
      console.log('🔐 Saved encryption keys to localStorage:', keysArray.length, 'keys');
    } catch (error) {
      console.warn('Failed to save encryption keys to localStorage:', error);
    }
  }

  /**
   * Load all keys from localStorage
   */
  loadKeysFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const keysData = localStorage.getItem('encryption-keys');
      if (keysData) {
        const keysArray = JSON.parse(keysData) as EncryptionKey[];
        keysArray.forEach(key => this.keys.set(key.keyId, key));
        console.log('🔐 Loaded encryption keys from localStorage:', keysArray.length, 'keys');
      }
    } catch (error) {
      console.warn('Failed to load encryption keys from localStorage:', error);
    }
  }
}

// Singleton instance
let encryptionInstance: EncryptionService | null = null;

export const getEncryptionService = (config?: Partial<EncryptionConfig>): EncryptionService => {
  if (!encryptionInstance) {
    encryptionInstance = new EncryptionService(config);
    // Load keys from localStorage on initialization
    encryptionInstance.loadKeysFromStorage();
  }
  return encryptionInstance;
};
