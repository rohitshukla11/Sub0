'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { CalendarEvent, getGoogleCalendarClient } from '@/lib/google-calendar-client'

interface CalendarInterfaceProps {
  onEventCreate?: (event: CalendarEvent) => void
  onEventUpdate?: (eventId: string, event: Partial<CalendarEvent>) => void
  onEventDelete?: (eventId: string) => void
}

export default function CalendarInterface({
  onEventCreate,
  onEventUpdate,
  onEventDelete
}: CalendarInterfaceProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    summary: '',
    description: '',
    start: { dateTime: '', timeZone: 'UTC' },
    end: { dateTime: '', timeZone: 'UTC' },
    location: '',
    attendees: []
  })

  const calendarService = getGoogleCalendarClient()

  useEffect(() => {
    initializeCalendar()
    handleAuthCallback()
  }, [])

  useEffect(() => {
    if (isAuthenticated && selectedDate) {
      loadEvents(selectedDate)
    }
  }, [selectedDate, isAuthenticated])

  const handleAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const authStatus = urlParams.get('calendar_auth')
    const tokens = urlParams.get('tokens')
    const error = urlParams.get('error')

    if (authStatus === 'success' && tokens) {
      try {
        const tokenData = JSON.parse(decodeURIComponent(tokens))
        calendarService.setTokens(tokenData)
        setIsAuthenticated(true)
        loadEvents()
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (error) {
        console.error('Failed to parse tokens:', error)
      }
    } else if (error) {
      console.error('OAuth error:', error)
    }
  }

  const initializeCalendar = async () => {
    try {
      await calendarService.initialize()
      const authenticated = calendarService.isAuthenticated()
      setIsAuthenticated(authenticated)
      
      if (authenticated) {
        await loadEvents()
      }
    } catch (error) {
      console.error('Failed to initialize calendar:', error)
    }
  }

  const loadEvents = async (date?: Date) => {
    try {
      setIsLoading(true)
      const targetDate = date || selectedDate
      
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      const calendarEvents = await calendarService.getEvents(
        'primary',
        startOfDay.toISOString(),
        endOfDay.toISOString()
      )
      
      setEvents(calendarEvents as CalendarEvent[])
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuth = async () => {
    try {
      const authUrl = calendarService.getAuthUrl()
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to initiate auth:', error)
    }
  }

  const handleCreateEvent = async () => {
    if (!newEvent.summary || !newEvent.start?.dateTime || !newEvent.end?.dateTime) {
      return
    }

    try {
      const createdEvent = await calendarService.createEvent(newEvent as CalendarEvent)
      await loadEvents()
      setShowCreateForm(false)
      setNewEvent({
        summary: '',
        description: '',
        start: { dateTime: '', timeZone: 'UTC' },
        end: { dateTime: '', timeZone: 'UTC' },
        location: '',
        attendees: []
      })
      onEventCreate?.(createdEvent)
    } catch (error) {
      console.error('Failed to create event:', error)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await calendarService.deleteEvent(eventId)
      await loadEvents()
      onEventDelete?.(eventId)
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const navigateDate = async (direction: 'prev' | 'next' | 'today') => {
    let newDate = new Date(selectedDate)
    
    switch (direction) {
      case 'prev':
        newDate.setDate(newDate.getDate() - 1)
        break
      case 'next':
        newDate.setDate(newDate.getDate() + 1)
        break
      case 'today':
        newDate = new Date()
        break
    }
    
    setSelectedDate(newDate)
    
    if (isAuthenticated) {
      await loadEvents(newDate)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 border-3 border-gray-500 bg-blue-500 shadow-[3px_3px_0px_0px_rgba(107,114,128,1)]">
          <Calendar className="w-6 h-6 text-white" strokeWidth={3} />
        </div>
        <h3 className="text-xs font-black text-gray-900 mb-1.5">Connect Calendar</h3>
        <p className="text-[10px] text-gray-600 mb-3 max-w-xs leading-relaxed font-medium">
          Connect Google Calendar to view events
        </p>
          <button
            onClick={handleAuth}
            className="px-4 py-2 rounded-lg text-white text-[10px] font-black transition-all border-2 border-gray-500 bg-blue-500 hover:bg-blue-600 shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:shadow-[3px_3px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(107,114,128,1)] uppercase tracking-wide"
          >
          Connect Google
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Date Navigation - Compact Neo-Brutalism */}
      <div className="p-2.5 border-b-4 border-gray-500">
        <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => navigateDate('prev')}
              className="p-1.5 rounded-lg border-2 border-gray-500 bg-white hover:bg-gray-50 text-blue-600 transition-all shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:shadow-[2.5px_2.5px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]"
            >
              <ChevronLeft className="w-3 h-3" strokeWidth={3} />
            </button>
          <div className="text-center">
            <div className="text-sm font-black text-gray-900">
              {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="text-xs text-gray-600 font-bold">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
          </div>
            <button
              onClick={() => navigateDate('next')}
              className="p-1.5 rounded-lg border-2 border-gray-500 bg-white hover:bg-gray-50 text-blue-600 transition-all shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:shadow-[2.5px_2.5px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]"
            >
              <ChevronRight className="w-3 h-3" strokeWidth={3} />
            </button>
        </div>
        <button
          onClick={() => navigateDate('today')}
          className="w-full text-xs font-black text-blue-600 rounded-lg py-1.5 transition-all border-2 border-gray-500 bg-white hover:bg-blue-50 shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:shadow-[2.5px_2.5px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px]"
        >
          Today
        </button>
      </div>

      {/* Events List - Compact */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-[#3b82f6] border-t-transparent rounded-full"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-gray-400 font-medium">No events</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-2 bg-white border-2 border-gray-500 rounded-lg shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:shadow-[2.5px_2.5px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-0.5px] hover:translate-y-[-0.5px] transition-all"
              >
                <div className="text-xs font-bold text-gray-800 mb-0.5 line-clamp-1">
                  {event.summary}
                </div>
                  {event.start?.dateTime && (
                    <div className="text-[11px] text-[#3b82f6] font-semibold">
                      {formatTime(event.start.dateTime)}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Event Button - Compact Neo-Brutalism */}
      <div className="p-2 border-t-4 border-gray-500">
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg text-white text-[10px] font-black transition-all border-2 border-gray-500 bg-blue-500 hover:bg-blue-600 shadow-[2px_2px_0px_0px_rgba(107,114,128,1)] hover:shadow-[3px_3px_0px_0px_rgba(107,114,128,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(107,114,128,1)] uppercase tracking-wide"
          >
          <Plus className="w-3 h-3" strokeWidth={3} />
          <span>Add Event</span>
        </button>
      </div>

      {/* Create Event Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md soft-shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">New Event</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" strokeWidth={2} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <input
                type="text"
                value={newEvent.summary}
                onChange={(e) => setNewEvent({...newEvent, summary: e.target.value})}
                placeholder="Event title"
                className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={newEvent.start?.dateTime?.slice(0, 16)}
                    onChange={(e) => setNewEvent({
                      ...newEvent,
                      start: { ...newEvent.start, dateTime: e.target.value + ':00.000Z' }
                    })}
                    className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={newEvent.end?.dateTime?.slice(0, 16)}
                    onChange={(e) => setNewEvent({
                      ...newEvent,
                      end: { ...newEvent.end, dateTime: e.target.value + ':00.000Z' }
                    })}
                    className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                placeholder="Location (optional)"
                className="w-full px-4 py-2 bg-gray-50 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!newEvent.summary || !newEvent.start?.dateTime || !newEvent.end?.dateTime}
                className="px-4 py-2 argentina-blue text-white text-xs font-medium rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
