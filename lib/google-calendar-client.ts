'use client';

import { getEncryptionService } from './encryption';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  visibility?: string;
  transparency?: string;
  recurrence?: string[];
  colorId?: string;
  status?: string;
  created?: string;
  updated?: string;
  htmlLink?: string;
  iCalUID?: string;
  sequence?: number;
  creator?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
}

interface CalendarConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export class GoogleCalendarClient {
  private config: CalendarConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private encryptionService = getEncryptionService();

  constructor(config: CalendarConfig) {
    this.config = config;
  }

  // Initialize the service
  async initialize(): Promise<void> {
    try {
      // Load stored credentials
      await this.loadCredentials();
      console.log('✅ Google Calendar client initialized');
    } catch (error) {
      console.error('Failed to initialize Google Calendar client:', error);
      throw error;
    }
  }

  // Generate authorization URL
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Handle OAuth callback and get tokens
  async handleAuthCallback(code: string): Promise<void> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth token request failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;

      // Save tokens to localStorage (simple storage)
      localStorage.setItem('google-calendar-tokens', JSON.stringify(tokens));

      console.log('✅ Google Calendar authentication successful');
    } catch (error) {
      console.error('Failed to handle auth callback:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  // Set tokens from OAuth callback
  setTokens(tokens: { access_token: string; refresh_token?: string; expires_in?: number }): void {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token || null;
    
    // Save tokens to localStorage
    localStorage.setItem('google-calendar-tokens', JSON.stringify(tokens));
    
    console.log('✅ Google Calendar tokens set successfully');
  }

  // Get user's calendar list
  async getCalendarList(): Promise<any[]> {
    try {
      const response = await this.makeRequest('https://www.googleapis.com/calendar/v3/users/me/calendarList');
      return response.items || [];
    } catch (error) {
      console.error('Failed to get calendar list:', error);
      throw error;
    }
  }

  // Create a calendar event
  async createEvent(
    event: CalendarEvent,
    calendarId: string = 'primary'
  ): Promise<any> {
    try {
      const response = await this.makeRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          body: JSON.stringify(event)
        }
      );

      console.log('✅ Calendar event created:', response.id);
      return response;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  // Update a calendar event
  async updateEvent(
    eventId: string,
    event: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<any> {
    try {
      const response = await this.makeRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(event)
        }
      );

      console.log('✅ Calendar event updated:', eventId);
      return response;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  // Delete a calendar event
  async deleteEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    try {
      await this.makeRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'DELETE'
        }
      );

      console.log('✅ Calendar event deleted:', eventId);
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  // Get events from calendar
  async getEvents(
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 100
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        singleEvents: 'true',
        orderBy: 'startTime'
      });

      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);

      const response = await this.makeRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
      );

      return response.items || [];
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      throw error;
    }
  }

  // Search calendar events
  async searchEvents(
    query: string,
    calendarId: string = 'primary',
    maxResults: number = 25
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        maxResults: maxResults.toString(),
        singleEvents: 'true',
        orderBy: 'startTime'
      });

      const response = await this.makeRequest(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
      );

      return response.items || [];
    } catch (error) {
      console.error('Failed to search calendar events:', error);
      throw error;
    }
  }

  // Make authenticated request to Google Calendar API
  private async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please connect to Google Calendar first.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        // Retry the request
        return this.makeRequest(url, options);
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      this.accessToken = tokens.access_token;

      // Update stored tokens
      const storedTokens = JSON.parse(localStorage.getItem('google-calendar-tokens') || '{}');
      storedTokens.access_token = tokens.access_token;
      localStorage.setItem('google-calendar-tokens', JSON.stringify(storedTokens));
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      // Clear tokens and require re-authentication
      this.accessToken = null;
      this.refreshToken = null;
      localStorage.removeItem('google-calendar-tokens');
      throw error;
    }
  }

  // Load credentials from localStorage
  private async loadCredentials(): Promise<void> {
    try {
      const storedTokens = localStorage.getItem('google-calendar-tokens');
      if (!storedTokens) {
        return;
      }

      const tokens = JSON.parse(storedTokens);
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      
      console.log('✅ Google Calendar credentials loaded');
    } catch (error) {
      console.warn('Failed to load credentials:', error);
    }
  }

  // Revoke access and clear credentials
  async revokeAccess(): Promise<void> {
    try {
      if (this.accessToken) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`, {
          method: 'POST',
        });
      }
      
      localStorage.removeItem('google-calendar-tokens');
      this.accessToken = null;
      this.refreshToken = null;
      
      console.log('✅ Google Calendar access revoked');
    } catch (error) {
      console.error('Failed to revoke access:', error);
    }
  }
}

// Factory function to create Google Calendar client
export function getGoogleCalendarClient(): GoogleCalendarClient {
  // Determine redirect URI based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isProduction ? 'https://better-half-ai.vercel.app' : 'http://localhost:3000');
  const defaultRedirectUri = `${baseUrl}/auth/google/callback`;
  
  const config: CalendarConfig = {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || defaultRedirectUri,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  };

  return new GoogleCalendarClient(config);
}