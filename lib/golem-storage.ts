import { MemoryEntry } from '@/types/memory'
import { createPublicClient, createWalletClient, http, type Attribute, type Entity } from '@arkiv-network/sdk'
import { privateKeyToAccount } from '@arkiv-network/sdk/accounts'
import { mendoza } from '@arkiv-network/sdk/chains'
import { ExpirationTime, jsonToPayload } from '@arkiv-network/sdk/utils'
import type { Hex } from 'viem'

interface ArkivConfig {
  privateKey: string
  rpcUrl?: string
  wsUrl?: string
  explorerUrl?: string
  chainId?: number
  defaultExpirationSeconds?: number
}

interface ArkivUploadResult {
  entityKey: string
  size: number
  timestamp: number
  chainId: number
  transactionUrl?: string
  transactionHash?: string
}

export class ArkivStorageService {
  private config: ArkivConfig
  private isInitialized = false
  private walletClient: any = null
  private publicClient: any = null
  private ownerAddress: string | null = null
  private explorerUrl: string
  private entityKeys: Set<string> = new Set()
  private defaultExpirationSeconds: number
  private individualFetchFailures = 0 // Track consecutive failures
  private skipIndividualFetch = false // Skip individual fetches if consistently failing

  constructor(config: ArkivConfig) {
    this.config = config
    this.explorerUrl = config.explorerUrl || 'https://explorer.mendoza.hoodi.arkiv.network'
    this.defaultExpirationSeconds = config.defaultExpirationSeconds || ExpirationTime.fromDays(30)
  }

  private get rpcUrl(): string {
    return this.config.rpcUrl || mendoza.rpcUrls.default.http[0]
  }

  private get chainId(): number {
    return this.config.chainId || mendoza.id
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    const privateKey = (this.config.privateKey || '').trim()
    if (!privateKey || privateKey === '0x' || privateKey.length !== 66) {
      throw new Error('Invalid Arkiv private key. Please set NEXT_PUBLIC_ARKIV_PRIVATE_KEY in your environment variables.')
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`)

    this.publicClient = createPublicClient({
      chain: mendoza,
      transport: http(this.rpcUrl)
    })

    this.walletClient = createWalletClient({
      chain: mendoza,
      transport: http(this.rpcUrl),
      account
    })

    this.ownerAddress = account.address
    this.isInitialized = true

    this.loadEntityKeysFromStorage()
    console.log('✅ Arkiv storage initialized', {
      chainId: this.chainId,
      rpcUrl: this.rpcUrl,
      owner: this.ownerAddress
    })
  }

  private loadEntityKeysFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('arkiv-entity-keys')
        if (raw) {
          this.entityKeys = new Set(JSON.parse(raw))
        }
      }
    } catch (error) {
      console.warn('Failed to load entity keys from storage:', error)
    }
  }

  private saveEntityKeysToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('arkiv-entity-keys', JSON.stringify(Array.from(this.entityKeys)))
      }
    } catch (error) {
      console.warn('Failed to persist entity keys:', error)
    }
  }

  private ensureClients() {
    if (!this.walletClient || !this.publicClient || !this.ownerAddress) {
      throw new Error('Arkiv storage not initialized')
    }
  }

  private async entityToMemory(entity: Entity): Promise<MemoryEntry | null> {
    // If entity doesn't have value, try to fetch it individually (unless we've determined it's not working)
    if (!entity?.value) {
      // Skip individual fetching if it's been consistently failing (performance optimization)
      if (this.skipIndividualFetch) {
        return null
      }
      
      // Only log details for the first few failures
      if (this.individualFetchFailures < 3) {
        console.log('🔄 [Arkiv] Entity missing value, fetching individually:', entity.key)
        console.log('🔍 [Arkiv] Entity properties:', {
          key: entity.key,
          hasValue: !!entity.value,
          hasToText: typeof (entity as any).toText === 'function',
          hasToJson: typeof (entity as any).toJson === 'function',
        })
      }
      
      try {
        const fullEntity = await this.publicClient.getEntity(entity.key as Hex)
        
        if (!fullEntity?.value) {
          this.individualFetchFailures++
          
          // After 5 failures, skip individual fetching for performance
          if (this.individualFetchFailures >= 5) {
            console.warn('⚠️ [Arkiv] Individual entity fetching consistently failing. Skipping for performance.')
            this.skipIndividualFetch = true
          }
          
          // Try toText() method as alternative
          if (typeof (fullEntity as any).toText === 'function') {
            try {
              const text = (fullEntity as any).toText()
              if (text) {
                this.individualFetchFailures = 0 // Reset on success
                const data = JSON.parse(text)
                return {
                  id: data.id,
                  content: data.content,
                  type: data.type || 'conversation',
                  category: data.category || 'general',
                  tags: data.tags || [],
                  createdAt: new Date(data.createdAt),
                  updatedAt: new Date(data.updatedAt),
                  encrypted: Boolean(data.encrypted),
                  accessPolicy: data.accessPolicy,
                  metadata: data.metadata || {},
                  ipfsHash: fullEntity.key,
                  entityUrl: `${this.explorerUrl}/entity/${fullEntity.key}`,
                  transactionUrl: data.transactionUrl || `${this.explorerUrl}/tx/${data.transactionHash || ''}`,
                }
              }
            } catch (e: any) {
              // Silently fail
            }
          }
          
          return null
        }
        
        // Success! Reset failure counter
        this.individualFetchFailures = 0
        entity = fullEntity
      } catch (error: any) {
        this.individualFetchFailures++
        if (this.individualFetchFailures >= 5) {
          this.skipIndividualFetch = true
        }
        return null
      }
    }

    try {
      // Try using entity.toText() if available (Arkiv SDK method)
      let payloadText: string
      
      if (typeof (entity as any).toText === 'function') {
        payloadText = (entity as any).toText()
      } else if (entity.value) {
        const hexValue = entity.value.startsWith('0x') ? entity.value.slice(2) : entity.value
        if (!hexValue) {
          console.warn('⚠️ [Arkiv] Entity value is empty:', entity.key)
          return null
        }
        const buffer = Buffer.from(hexValue, 'hex')
        payloadText = buffer.toString('utf-8')
      } else {
        console.warn('⚠️ [Arkiv] Entity has no value or toText method:', entity.key)
        return null
      }

      if (!payloadText) {
        console.warn('⚠️ [Arkiv] Failed to decode entity payload:', entity.key)
        return null
      }

      const data = JSON.parse(payloadText)
      
      if (!data.id) {
        console.warn('⚠️ [Arkiv] Entity data missing ID:', entity.key)
        return null
      }
      
      return {
        id: data.id,
        content: data.content,
        type: data.type || 'conversation',
        category: data.category || 'general',
        tags: data.tags || [],
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        encrypted: Boolean(data.encrypted),
        accessPolicy: data.accessPolicy,
        metadata: data.metadata || {},
        ipfsHash: entity.key,
        entityUrl: `${this.explorerUrl}/entity/${entity.key}`,
        transactionUrl: data.transactionUrl || `${this.explorerUrl}/tx/${data.transactionHash || ''}`,
      }
    } catch (error: any) {
      console.warn('⚠️ [Arkiv] Failed to parse entity:', entity.key, error.message)
      return null
    }
  }

  private buildAttributes(memory: MemoryEntry): Attribute[] {
    return [
      { key: 'memoryId', value: memory.id },
      { key: 'type', value: memory.type },
      { key: 'category', value: memory.category },
      { key: 'owner', value: memory.accessPolicy.owner },
      { key: 'createdAt', value: memory.createdAt.toISOString() },
      { key: 'updatedAt', value: memory.updatedAt.toISOString() }
    ]
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    this.ensureClients()
  }

  async getOwnerAddress(): Promise<string | null> {
    await this.ensureInitialized()
    return this.ownerAddress
  }

  async uploadMemory(memory: MemoryEntry): Promise<ArkivUploadResult> {
    await this.ensureInitialized()

    const payload = jsonToPayload({ ...memory, createdAt: memory.createdAt.toISOString(), updatedAt: memory.updatedAt.toISOString() })
    const { entityKey, txHash } = await this.walletClient.createEntity({
      payload,
      contentType: 'application/json',
      attributes: this.buildAttributes(memory),
      expiresIn: this.defaultExpirationSeconds
    })

    const size = payload.length
    this.entityKeys.add(entityKey)
    this.saveEntityKeysToStorage()

    return {
      entityKey,
      size,
      timestamp: Date.now(),
      chainId: this.chainId,
      transactionHash: txHash,
      transactionUrl: txHash ? `${this.explorerUrl}/tx/${txHash}` : undefined
    }
  }

  async retrieveMemory(entityKey: string): Promise<MemoryEntry | null> {
    await this.ensureInitialized()
    try {
      const entity = await this.publicClient.getEntity(entityKey as Hex)
      return await this.entityToMemory(entity)
    } catch (error) {
      console.warn('Failed to retrieve Arkiv entity', error)
      return null
    }
  }

  async updateMemory(entityKey: string, updatedMemory: MemoryEntry): Promise<ArkivUploadResult> {
    await this.ensureInitialized()

    const payload = jsonToPayload({ ...updatedMemory, createdAt: updatedMemory.createdAt.toISOString(), updatedAt: updatedMemory.updatedAt.toISOString() })
    const { txHash } = await this.walletClient.updateEntity({
      entityKey: entityKey as Hex,
      payload,
      contentType: 'application/json',
      attributes: this.buildAttributes(updatedMemory),
      expiresIn: this.defaultExpirationSeconds
    })

    return {
      entityKey,
      size: payload.length,
      timestamp: Date.now(),
      chainId: this.chainId,
      transactionHash: txHash,
      transactionUrl: txHash ? `${this.explorerUrl}/tx/${txHash}` : undefined
    }
  }

  async deleteMemory(entityKey: string): Promise<boolean> {
    await this.ensureInitialized()
    try {
      console.log(`🗑️ [Arkiv] Deleting entity: ${entityKey}`)
      await this.walletClient.deleteEntity({ entityKey: entityKey as Hex })
      console.log(`✅ [Arkiv] Entity deleted from blockchain`)
      
      this.entityKeys.delete(entityKey)
      this.saveEntityKeysToStorage()
      console.log(`✅ [Arkiv] Entity key removed from local cache`)
      
      return true
    } catch (error: any) {
      console.error('❌ [Arkiv] Failed to delete entity:', error)
      console.error('❌ [Arkiv] Error details:', {
        message: error.message,
        entityKey,
        ownerAddress: this.ownerAddress
      })
      return false
    }
  }

  private async fetchOwnedEntities(options: { includePayload?: boolean; limit?: number; fetchAll?: boolean } = {}): Promise<Entity[]> {
    await this.ensureInitialized()
    
    if (!this.ownerAddress) {
      console.error('❌ [Arkiv] Owner address not set!')
      throw new Error('Owner address not initialized')
    }
    
    const limit = options.limit || 50
    
    try {
      const query = this.publicClient
        .buildQuery()
        .ownedBy(this.ownerAddress as Hex)
        .withAttributes(true)
        .withPayload(Boolean(options.includePayload))
        .limit(limit)

      const result = await query.fetch()
      const entities: Entity[] = [...result.entities]
      
      if (options.fetchAll && result.hasNextPage()) {
        while (result.hasNextPage()) {
          await result.next()
          entities.push(...result.entities)
        }
      }
      
      console.log('✅ [Arkiv] Fetched', entities.length, 'entities')
      return entities
    } catch (error: any) {
      console.error('❌ [Arkiv] fetchOwnedEntities error:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        ownerAddress: this.ownerAddress
      })
      throw error
    }
  }

  async searchMemories(searchText: string, owner?: string, limit: number = 20): Promise<MemoryEntry[]> {
    await this.ensureInitialized()
    
    try {
      const entities = await this.fetchOwnedEntities({ includePayload: true, limit: Math.max(limit, 50), fetchAll: false })
      
      const memoryPromises = entities.map(async (entity) => {
        try {
          return await this.entityToMemory(entity)
        } catch (error) {
          return null
        }
      })
      
      const memoryResults = await Promise.all(memoryPromises)
      const memories = memoryResults.filter(Boolean) as MemoryEntry[]
      
      console.log('🔍 [Arkiv] Converted', memories.length, 'of', entities.length, 'entities to memories')

      const filtered = memories.filter(memory => {
        if (!searchText) return true
        const haystack = [memory.content, memory.category, memory.type, ...(memory.tags || [])].join(' ').toLowerCase()
        return haystack.includes(searchText.toLowerCase())
      })

      if (owner) {
        const ownerFiltered = filtered.filter(memory => memory.accessPolicy.owner.toLowerCase() === owner.toLowerCase()).slice(0, limit)
        console.log('🔍 [Arkiv] Filtered by owner:', ownerFiltered.length)
        return ownerFiltered
      }

      const result = filtered.slice(0, limit)
      console.log('🔍 [Arkiv] Final result:', result.length, 'memories')
      
      // Skip fallback if individual fetching is already known to fail (performance optimization)
      if (result.length === 0 && !this.skipIndividualFetch) {
        console.log('⚠️ [Arkiv] No results from query, trying fallback method...')
        try {
          const fallbackMemories = await this.searchMemoriesFallback(searchText, limit)
          if (fallbackMemories.length > 0) {
            console.log('✅ [Arkiv] Fallback method found:', fallbackMemories.length, 'memories')
            return fallbackMemories
          }
        } catch (fallbackError) {
          console.warn('⚠️ [Arkiv] Fallback method also failed:', fallbackError)
        }
      }
      
      return result
    } catch (error: any) {
      console.error('❌ [Arkiv] searchMemories error:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        ownerAddress: this.ownerAddress
      })
      
      // Try fallback method on error
      try {
        console.log('🔄 [Arkiv] Trying fallback method after error...')
        const fallbackMemories = await this.searchMemoriesFallback(searchText, limit)
        if (fallbackMemories.length > 0) {
          console.log('✅ [Arkiv] Fallback method found:', fallbackMemories.length, 'memories')
          return fallbackMemories
        }
      } catch (fallbackError) {
        console.error('❌ [Arkiv] Fallback method also failed:', fallbackError)
      }
      
      return []
    }
  }

  private async searchMemoriesFallback(searchText: string, limit: number): Promise<MemoryEntry[]> {
    try {
      console.log('🔄 [Arkiv] Using fallback method to retrieve memories...')
      const allMemories = await this.getAllMemoriesDirectly()
      console.log('🔄 [Arkiv] Retrieved all memories:', allMemories.length)
      
      // Apply search filter
      const filtered = allMemories.filter(memory => {
        if (!searchText) return true
        const haystack = [memory.content, memory.category, memory.type, ...(memory.tags || [])].join(' ').toLowerCase()
        return haystack.includes(searchText.toLowerCase())
      })
      
      console.log('🔄 [Arkiv] Fallback method filtered:', filtered.length, 'memories')
      return filtered.slice(0, limit)
    } catch (error) {
      console.error('❌ [Arkiv] Fallback method error:', error)
      return []
    }
  }

  async queryEntities(rawQuery: string = ''): Promise<Entity[]> {
    await this.ensureInitialized()
    try {
      if (!rawQuery) {
        return await this.fetchOwnedEntities({ includePayload: true, fetchAll: true })
      }
      return await this.publicClient.query(rawQuery)
    } catch (error) {
      console.warn('Arkiv query failed', error)
      return []
    }
  }

  async getAllEntityKeys(): Promise<string[]> {
    try {
      console.log('🔑 [Arkiv] Getting all entity keys...')
      const entities = await this.fetchOwnedEntities({ fetchAll: true })
      const keys = entities.map(entity => entity.key)
      this.entityKeys = new Set(keys)
      this.saveEntityKeysToStorage()
      console.log('🔑 [Arkiv] Found entity keys:', keys.length)
      return keys
    } catch (error: any) {
      console.error('❌ [Arkiv] Failed to get entity keys from query:', error)
      
      // Try to use cached keys from localStorage
      if (this.entityKeys.size > 0) {
        console.log('🔄 [Arkiv] Using cached entity keys:', this.entityKeys.size)
        return Array.from(this.entityKeys)
      }
      
      console.warn('⚠️ [Arkiv] No cached keys available')
      return []
    }
  }
  
  async getAllMemoriesDirectly(): Promise<MemoryEntry[]> {
    try {
      console.log('🔄 [Arkiv] Getting all memories directly...')
      const entityKeys = await this.getAllEntityKeys()
      console.log('🔄 [Arkiv] Retrieved entity keys:', entityKeys.length)
      
      const memories: MemoryEntry[] = []
      for (const key of entityKeys) {
        try {
          const memory = await this.retrieveMemory(key)
          if (memory) {
            memories.push(memory)
          }
        } catch (error) {
          console.warn('⚠️ [Arkiv] Failed to retrieve memory:', key, error)
        }
      }
      
      console.log('✅ [Arkiv] Retrieved memories directly:', memories.length)
      return memories
    } catch (error) {
      console.error('❌ [Arkiv] Failed to get all memories directly:', error)
      return []
    }
  }

  async getStorageStats(): Promise<{ totalMemories: number; totalSize: number; pinnedMemories: number; chainId: number }> {
    const keys = await this.getAllEntityKeys()
    const sampleKeys = keys.slice(0, 20)
    let size = 0

    for (const key of sampleKeys) {
      const memory = await this.retrieveMemory(key)
      if (memory?.metadata?.size) {
        size += memory.metadata.size
      }
    }

    const averageSize = sampleKeys.length ? Math.round(size / sampleKeys.length) : 0
    const estimatedTotalSize = averageSize * keys.length

    return {
      totalMemories: keys.length,
      totalSize: estimatedTotalSize,
      pinnedMemories: keys.length,
      chainId: this.chainId
    }
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false
    this.walletClient = null
    this.publicClient = null
  }
}

export function getGolemStorage(config: ArkivConfig): ArkivStorageService {
  return new ArkivStorageService(config)
}
