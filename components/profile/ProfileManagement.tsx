'use client'

import { useState, useEffect } from 'react'
import { User, Edit3, Save, X, Heart, Target, Clock, Utensils, Dumbbell, Brain } from 'lucide-react'

export interface UserProfile {
  preferences: {
    workoutTypes: string[];
    dietaryRestrictions: string[];
    workingHours: { start: string; end: string };
    mealTimes: { breakfast: string; lunch: string; dinner: string };
  };
  goals: {
    fitness: string[];
    productivity: string[];
    wellness: string[];
  };
  personalityTraits: {
    energyPeaks: 'morning' | 'afternoon' | 'evening';
    workStyle: 'focused-blocks' | 'frequent-breaks' | 'flexible';
    stressManagement: string[];
  };
}

interface ProfileManagementProps {
  profile: UserProfile | null
  onUpdateProfile: (profile: UserProfile) => void
  onClose: () => void
}

export function ProfileManagement({ profile, onUpdateProfile, onClose }: ProfileManagementProps) {
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (profile) {
      setEditingProfile({ ...profile })
    } else {
      setEditingProfile(getDefaultProfile())
    }
  }, [profile])

  const getDefaultProfile = (): UserProfile => ({
    preferences: {
      workoutTypes: ['cardio', 'strength training'],
      dietaryRestrictions: [],
      workingHours: { start: '9:00', end: '17:00' },
      mealTimes: { breakfast: '8:00', lunch: '12:00', dinner: '19:00' }
    },
    goals: {
      fitness: ['stay active', 'maintain health'],
      productivity: ['focused work', 'work-life balance'],
      wellness: ['manage stress', 'adequate rest']
    },
    personalityTraits: {
      energyPeaks: 'morning',
      workStyle: 'focused-blocks',
      stressManagement: ['breaks', 'exercise', 'breathing']
    }
  })

  const handleSave = () => {
    if (editingProfile) {
      onUpdateProfile(editingProfile)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditingProfile(profile || getDefaultProfile())
    setIsEditing(false)
  }

  const addItem = (category: keyof UserProfile, subcategory: string, item: string) => {
    if (!editingProfile || !item.trim()) return
    
    setEditingProfile(prev => {
      if (!prev) return prev
      const updated = { ...prev }
      const target = updated[category] as any
      if (target && target[subcategory] && Array.isArray(target[subcategory])) {
        target[subcategory] = [...target[subcategory], item.trim()]
      }
      return updated
    })
  }

  const removeItem = (category: keyof UserProfile, subcategory: string, index: number) => {
    if (!editingProfile) return
    
    setEditingProfile(prev => {
      if (!prev) return prev
      const updated = { ...prev }
      const target = updated[category] as any
      if (target && target[subcategory] && Array.isArray(target[subcategory])) {
        target[subcategory] = target[subcategory].filter((_: any, i: number) => i !== index)
      }
      return updated
    })
  }

  const updateSimpleField = (category: keyof UserProfile, subcategory: string, value: any) => {
    if (!editingProfile) return
    
    setEditingProfile(prev => {
      if (!prev) return prev
      const updated = { ...prev }
      const target = updated[category] as any
      if (target) {
        target[subcategory] = value
      }
      return updated
    })
  }

  if (!editingProfile) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="text-center">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">Your Profile</h3>
            <p className="text-sm text-slate-500">Help me understand you better</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Personality Traits */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h4 className="text-lg font-semibold text-slate-800">Personality & Work Style</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Energy Peaks</label>
              {isEditing ? (
                <select
                  value={editingProfile.personalityTraits.energyPeaks}
                  onChange={(e) => updateSimpleField('personalityTraits', 'energyPeaks', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="morning">Morning Person 🌅</option>
                  <option value="afternoon">Afternoon Peak 🌞</option>
                  <option value="evening">Night Owl 🌙</option>
                </select>
              ) : (
                <div className="px-3 py-2 bg-slate-50 rounded-lg">
                  {editingProfile.personalityTraits.energyPeaks === 'morning' && '🌅 Morning Person'}
                  {editingProfile.personalityTraits.energyPeaks === 'afternoon' && '🌞 Afternoon Peak'}
                  {editingProfile.personalityTraits.energyPeaks === 'evening' && '🌙 Night Owl'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Work Style</label>
              {isEditing ? (
                <select
                  value={editingProfile.personalityTraits.workStyle}
                  onChange={(e) => updateSimpleField('personalityTraits', 'workStyle', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="focused-blocks">Focused Time Blocks 🎯</option>
                  <option value="frequent-breaks">Frequent Breaks ⏱️</option>
                  <option value="flexible">Flexible Schedule 🔄</option>
                </select>
              ) : (
                <div className="px-3 py-2 bg-slate-50 rounded-lg">
                  {editingProfile.personalityTraits.workStyle === 'focused-blocks' && '🎯 Focused Time Blocks'}
                  {editingProfile.personalityTraits.workStyle === 'frequent-breaks' && '⏱️ Frequent Breaks'}
                  {editingProfile.personalityTraits.workStyle === 'flexible' && '🔄 Flexible Schedule'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Heart className="w-5 h-5 text-pink-600" />
            <h4 className="text-lg font-semibold text-slate-800">Preferences</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Working Hours */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Working Hours
              </label>
              {isEditing ? (
                <div className="flex space-x-2">
                  <input
                    type="time"
                    value={editingProfile.preferences.workingHours.start}
                    onChange={(e) => updateSimpleField('preferences', 'workingHours', {
                      ...editingProfile.preferences.workingHours,
                      start: e.target.value
                    })}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="px-3 py-2 text-slate-500">to</span>
                  <input
                    type="time"
                    value={editingProfile.preferences.workingHours.end}
                    onChange={(e) => updateSimpleField('preferences', 'workingHours', {
                      ...editingProfile.preferences.workingHours,
                      end: e.target.value
                    })}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              ) : (
                <div className="px-3 py-2 bg-slate-50 rounded-lg">
                  {editingProfile.preferences.workingHours.start} - {editingProfile.preferences.workingHours.end}
                </div>
              )}
            </div>

            {/* Workout Types */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Dumbbell className="w-4 h-4 inline mr-1" />
                Workout Types
              </label>
              <TagList
                items={editingProfile.preferences.workoutTypes}
                onAdd={(item) => addItem('preferences', 'workoutTypes', item)}
                onRemove={(index) => removeItem('preferences', 'workoutTypes', index)}
                isEditing={isEditing}
                placeholder="Add workout type..."
                suggestions={['cardio', 'strength training', 'yoga', 'pilates', 'running', 'swimming', 'cycling', 'sports']}
              />
            </div>
          </div>

          {/* Meal Times */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Utensils className="w-4 h-4 inline mr-1" />
              Meal Times
            </label>
            {isEditing ? (
              <div className="grid grid-cols-3 gap-4">
                {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                  <div key={meal}>
                    <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">
                      {meal}
                    </label>
                    <input
                      type="time"
                      value={editingProfile.preferences.mealTimes[meal]}
                      onChange={(e) => updateSimpleField('preferences', 'mealTimes', {
                        ...editingProfile.preferences.mealTimes,
                        [meal]: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                  <div key={meal} className="text-center">
                    <div className="text-xs font-medium text-slate-600 capitalize mb-1">{meal}</div>
                    <div className="px-3 py-2 bg-slate-50 rounded-lg">
                      {editingProfile.preferences.mealTimes[meal]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dietary Restrictions */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Dietary Restrictions</label>
            <TagList
              items={editingProfile.preferences.dietaryRestrictions}
              onAdd={(item) => addItem('preferences', 'dietaryRestrictions', item)}
              onRemove={(index) => removeItem('preferences', 'dietaryRestrictions', index)}
              isEditing={isEditing}
              placeholder="Add dietary restriction..."
              suggestions={['vegetarian', 'vegan', 'gluten-free', 'lactose-intolerant', 'keto', 'paleo', 'low-carb', 'nut allergy']}
            />
          </div>
        </div>

        {/* Goals */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-slate-800">Goals</h4>
          </div>
          
          <div className="space-y-6">
            {(['fitness', 'productivity', 'wellness'] as const).map((goalType) => (
              <div key={goalType}>
                <label className="block text-sm font-medium text-slate-700 mb-2 capitalize">
                  {goalType} Goals
                </label>
                <TagList
                  items={editingProfile.goals[goalType]}
                  onAdd={(item) => addItem('goals', goalType, item)}
                  onRemove={(index) => removeItem('goals', goalType, index)}
                  isEditing={isEditing}
                  placeholder={`Add ${goalType} goal...`}
                  suggestions={
                    goalType === 'fitness' ? ['lose weight', 'build muscle', 'improve endurance', 'stay active', 'flexibility'] :
                    goalType === 'productivity' ? ['time management', 'focus', 'organization', 'work-life balance', 'skill development'] :
                    ['stress management', 'better sleep', 'mindfulness', 'emotional wellbeing', 'self-care']
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for managing tag lists
interface TagListProps {
  items: string[]
  onAdd: (item: string) => void
  onRemove: (index: number) => void
  isEditing: boolean
  placeholder: string
  suggestions?: string[]
}

function TagList({ items, onAdd, onRemove, isEditing, placeholder, suggestions = [] }: TagListProps) {
  const [newItem, setNewItem] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleAdd = (item: string) => {
    if (item.trim() && !items.includes(item.trim())) {
      onAdd(item.trim())
      setNewItem('')
      setShowSuggestions(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd(newItem)
    }
  }

  const filteredSuggestions = suggestions.filter(
    (suggestion) => 
      !items.includes(suggestion) && 
      suggestion.toLowerCase().includes(newItem.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
          >
            {item}
            {isEditing && (
              <button
                onClick={() => onRemove(index)}
                className="ml-2 text-purple-600 hover:text-purple-800"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      
      {isEditing && (
        <div className="relative">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleAdd(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-purple-50 text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
