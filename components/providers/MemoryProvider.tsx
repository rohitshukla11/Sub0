'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getMemoryService } from '@/lib/memory-service'
import { MemoryEntry, MemoryType } from '@/types/memory'

interface MemoryContextType {
  memories: MemoryEntry[]
  isLoading: boolean
  createMemory: (data: {
    content: string
    type: MemoryType
    category: string
    tags: string[]
    encrypt?: boolean
  }) => Promise<MemoryEntry | null>
  updateMemory: (memoryId: string, updates: Partial<MemoryEntry>) => Promise<MemoryEntry | null>
  deleteMemory: (memoryId: string) => Promise<boolean>
  searchMemories: (query: string, type?: MemoryType) => Promise<MemoryEntry[]>
  refreshMemories: () => Promise<void>
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined)

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const memoryService = getMemoryService()

  useEffect(() => {
    // Initialize memory service
    memoryService.initialize().catch(console.error)
  }, [])

  const refreshMemories = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const userMemories = await memoryService.getAllMemories()
      setMemories(userMemories)
    } catch (error) {
      console.error('Failed to refresh memories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createMemory = async (data: {
    content: string
    type: MemoryType
    category: string
    tags: string[]
    encrypt?: boolean
  }): Promise<MemoryEntry | null> => {
    try {
      const memory = await memoryService.createMemory({
        content: data.content,
        type: data.type,
        category: data.category,
        tags: data.tags,
        encrypted: data.encrypt ?? true
      })
      
      if (memory) {
        setMemories(prev => [memory, ...prev])
      }
      
      return memory
    } catch (error) {
      console.error('Failed to create memory:', error)
      return null
    }
  }

  const updateMemory = async (
    memoryId: string, 
    updates: Partial<MemoryEntry>
  ): Promise<MemoryEntry | null> => {
    try {
      const updatedMemory = await memoryService.updateMemory(memoryId, updates)
      
      if (updatedMemory) {
        setMemories(prev => 
          prev.map(m => m.id === memoryId ? updatedMemory : m)
        )
      }
      
      return updatedMemory
    } catch (error) {
      console.error('Failed to update memory:', error)
      return null
    }
  }

  const deleteMemory = async (memoryId: string): Promise<boolean> => {
    try {
      const success = await memoryService.deleteMemory(memoryId)
      
      if (success) {
        setMemories(prev => prev.filter(m => m.id !== memoryId))
      }
      
      return success
    } catch (error) {
      console.error('Failed to delete memory:', error)
      return false
    }
  }

  const searchMemories = async (
    query: string, 
    type?: MemoryType
  ): Promise<MemoryEntry[]> => {
    try {
      const results = await memoryService.searchMemories({
        query,
        type,
      })
      return results.memories
    } catch (error) {
      console.error('Failed to search memories:', error)
      return []
    }
  }

  const value: MemoryContextType = {
    memories,
    isLoading,
    createMemory,
    updateMemory,
    deleteMemory,
    searchMemories,
    refreshMemories,
  }

  return (
    <MemoryContext.Provider value={value}>
      {children}
    </MemoryContext.Provider>
  )
}

export function useMemory() {
  const context = useContext(MemoryContext)
  if (context === undefined) {
    throw new Error('useMemory must be used within a MemoryProvider')
  }
  return context
}



