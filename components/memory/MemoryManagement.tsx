'use client'

import React, { useState, useEffect } from 'react'
import { Search, Trash2, Database, Lock, Unlock, RefreshCw } from 'lucide-react'
import { MemoryEntry, MemoryType } from '@/types/memory'
import { getEncryptionService } from '@/lib/encryption'
import { getKeyManagementService } from '@/lib/key-management'
import MemoryToCalendar from '@/components/calendar/MemoryToCalendar'

interface MemoryManagementProps {
  memories: MemoryEntry[]
  onSearchMemories: (query: string) => void
  onDeleteMemory: (id: string) => void
  onRefresh?: () => void
  totalMemories: number
  memoryTypes: number
  onGrantPermission?: (memoryId: string, agentId: string, actions: string[]) => void
  onRevokePermission?: (memoryId: string, agentId: string) => void
}

export function MemoryManagement({
  memories,
  onSearchMemories,
  onDeleteMemory,
  onRefresh,
  totalMemories,
  memoryTypes,
  onGrantPermission,
  onRevokePermission
}: MemoryManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [decryptedMemories, setDecryptedMemories] = useState<Map<string, string>>(new Map())
  const [decryptionStatus, setDecryptionStatus] = useState<Map<string, 'decrypting' | 'decrypted' | 'failed'>>(new Map())
  const [showDecrypted, setShowDecrypted] = useState(true)
  const [selectedMemoryForCalendar, setSelectedMemoryForCalendar] = useState<MemoryEntry | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchMemories(searchQuery)
  }

  const decryptMemory = async (memory: MemoryEntry) => {
    if (!memory.encrypted || decryptedMemories.has(memory.id)) {
      return
    }

    setDecryptionStatus(prev => new Map(prev).set(memory.id, 'decrypting'))

    try {
      const encryptionService = getEncryptionService()
      const keyManagement = getKeyManagementService()
      
      if (!keyManagement.isInitialized()) {
        const defaultPassword = process.env.NEXT_PUBLIC_DEFAULT_ENCRYPTION_PASSWORD || 'default-encryption-key-2024'
        await keyManagement.initializeWithPassword(defaultPassword)
      }

      const encryptedData = JSON.parse(memory.content)
      const encryptionKeyId = memory.metadata?.encryptionKeyId
      const encryptionSalt = memory.metadata?.encryptionSalt
      
      let decrypted
      
      if (encryptionKeyId) {
        const key = keyManagement.getKey(encryptionKeyId)
        if (key) {
          decrypted = await encryptionService.decrypt(encryptedData, encryptionKeyId, keyManagement)
        } else {
          const regeneratedKey = await keyManagement.generateMemoryKey(memory.id, encryptionSalt)
          decrypted = await encryptionService.decrypt(encryptedData, regeneratedKey.keyId, keyManagement)
        }
      } else {
        const regeneratedKey = await keyManagement.generateMemoryKey(memory.id, encryptionSalt)
        decrypted = await encryptionService.decrypt(encryptedData, regeneratedKey.keyId, keyManagement)
      }
      
      setDecryptedMemories(prev => new Map(prev).set(memory.id, decrypted.content))
      setDecryptionStatus(prev => new Map(prev).set(memory.id, 'decrypted'))
    } catch (error) {
      setDecryptedMemories(prev => new Map(prev).set(memory.id, `[Decryption failed]`))
      setDecryptionStatus(prev => new Map(prev).set(memory.id, 'failed'))
    }
  }

  useEffect(() => {
    const decryptAllMemories = async () => {
      for (const memory of memories) {
        if (memory.encrypted && !decryptedMemories.has(memory.id)) {
          await decryptMemory(memory)
        }
      }
    }

    if (showDecrypted && memories.length > 0) {
      decryptAllMemories()
    }
  }, [memories, showDecrypted])

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Compact Neo-Brutalism */}
      <div className="p-2.5 border-b-4 border-gray-500">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-[#3b82f6]" strokeWidth={2.5} />
              <span className="text-[10px] font-bold text-gray-800">{totalMemories} Memories</span>
            </div>
            <div className="flex items-center space-x-1.5">
              {onRefresh && (
                <button
                  onClick={async () => {
                    setIsRefreshing(true)
                    try {
                      await onRefresh()
                    } finally {
                      setTimeout(() => setIsRefreshing(false), 500)
                    }
                  }}
                  className="p-1.5 rounded-lg border-2 border-gray-500 bg-white hover:bg-blue-50 text-blue-600 transition-all shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:shadow-[2.5px_2.5px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] disabled:opacity-50"
                  title="Refresh memories"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                </button>
              )}
              <button
                onClick={() => setShowDecrypted(!showDecrypted)}
                className="p-1.5 rounded-lg border-2 border-gray-500 bg-white hover:bg-gray-50 text-gray-600 transition-all shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:shadow-[2.5px_2.5px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]"
                title={showDecrypted ? "Hide decrypted content" : "Show decrypted content"}
              >
                {showDecrypted ? (
                  <Unlock className="w-3 h-3 text-[#3b82f6]" strokeWidth={2.5} />
                ) : (
                  <Lock className="w-3 h-3 text-gray-500" strokeWidth={2.5} />
                )}
              </button>
            </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" strokeWidth={2.5} />
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-[10px] placeholder-gray-500 focus:outline-none transition-all border-2 border-gray-500 bg-white font-medium"
            />
          </form>
        </div>
      </div>

      {/* Memory List - Compact */}
      <div className="flex-1 overflow-y-auto p-2">
        {memories.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border-3 border-gray-500 bg-blue-500 shadow-[3px_3px_0px_0px_rgba(107,114,128,1)]">
              <Database className="w-6 h-6 text-white" strokeWidth={3} />
            </div>
            <p className="text-[10px] text-gray-500 font-semibold">No memories yet</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Start chatting to create</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="group p-2 bg-white border-2 border-gray-500 rounded-lg shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:shadow-[2.5px_2.5px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] transition-all"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        memory.type === 'learned_fact' 
                          ? 'badge-success' 
                          : memory.type === 'user_preference'
                          ? 'badge-warning'
                          : 'badge-primary'
                      }`}>
                        {memory.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-700 leading-snug font-medium line-clamp-2">
                      {showDecrypted && memory.encrypted && decryptedMemories.has(memory.id) 
                        ? truncateContent(decryptedMemories.get(memory.id) || memory.content)
                        : truncateContent(memory.content)
                      }
                    </p>
                      {(memory.entityUrl || memory.transactionUrl) && (
                        <div className="mt-1 flex gap-1">
                          {memory.entityUrl && (
                            <a
                              href={memory.entityUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#eff6ff] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white transition-all"
                            >
                              Entity
                            </a>
                          )}
                          {memory.transactionUrl && (
                            <a
                              href={memory.transactionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#eff6ff] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white transition-all"
                            >
                              TX
                            </a>
                          )}
                        </div>
                      )}
                  </div>
                  <button
                    onClick={() => onDeleteMemory(memory.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded border-2 border-gray-500 bg-white hover:bg-red-50 text-red-500 transition-all shadow-[1.5px_1.5px_0px_0px_rgba(107,114,128,1)] hover:shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] flex-shrink-0"
                  >
                    <Trash2 className="w-2.5 h-2.5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMemoryForCalendar && (
        <MemoryToCalendar
          memory={selectedMemoryForCalendar}
          onEventCreated={(eventId) => {
            console.log('Event created:', eventId);
            setSelectedMemoryForCalendar(null);
          }}
          onClose={() => setSelectedMemoryForCalendar(null)}
        />
      )}
    </div>
  )
}
