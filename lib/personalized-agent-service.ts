import { ChatMessage } from '@/types/chat';
import { CalendarEvent, getGoogleCalendarClient } from './google-calendar-client';
import { getMemoryService } from './memory-service';
import { AIResponse } from './ai-service';

export interface PersonalInsights {
  scheduleAnalysis: {
    busyPeriods: string[];
    freeTimes: string[];
    upcomingImportantMeetings: string[];
    workloadLevel: 'light' | 'moderate' | 'heavy' | 'overwhelming';
  };
  recommendations: {
    meals: string[];
    workoutTimes: string[];
    breakSuggestions: string[];
    priorities: string[];
  };
  wellness: {
    stressIndicators: string[];
    energyOptimization: string[];
    balanceScore: number; // 1-10
  };
}

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

export class PersonalizedAgentService {
  private calendarClient: any = null;
  private memoryService = getMemoryService();
  private userProfile: UserProfile | null = null;

  constructor() {
    this.loadUserProfile();
    // Only initialize calendar client on client side
    if (typeof window !== 'undefined') {
      this.calendarClient = getGoogleCalendarClient();
    }
  }

  async initialize(): Promise<void> {
    try {
      if (this.calendarClient) {
        await this.calendarClient.initialize();
      }
      await this.memoryService.initialize();
      console.log('✅ PersonalizedAgentService initialized');
    } catch (error) {
      console.error('Failed to initialize PersonalizedAgentService:', error);
      // Don't throw error - continue with limited functionality
    }
  }

  // Enhanced AI response with personalized context
  async generatePersonalizedResponse(userInput: string, previousMessages: ChatMessage[]): Promise<AIResponse> {
    try {
      // Get calendar insights
      const insights = await this.analyzeSchedule();
      
      // Build personalized context
      const personalContext = this.buildPersonalContext(insights, userInput);
      
      // Enhanced system prompt for personalized agent
      const enhancedMessages = [
        {
          role: 'system',
          content: this.getPersonalizedSystemPrompt(personalContext)
        },
        ...previousMessages.slice(-8).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: userInput
        }
      ];

      // Generate response using OpenAI
      const response = await this.callOpenAI(enhancedMessages);
      
      // Learn from interaction and get Arkiv explorer URL
      try {
        const learningResult = await this.learnFromInteraction(userInput, response);
        return {
          content: response,
          shouldStore: true,
          golemExplorerUrl: learningResult?.golemExplorerUrl, // Legacy field for backward compatibility
          entityUrl: learningResult?.entityUrl,
          transactionUrl: learningResult?.transactionUrl
        };
      } catch (learningError) {
        console.error('❌ LEARNING FAILED - Returning response without learning:', learningError);
        // Return response without learning if learning fails
        return {
          content: response,
          shouldStore: false,
          golemExplorerUrl: undefined,
          entityUrl: undefined,
          transactionUrl: undefined
        };
      }
    } catch (error) {
      console.error('Failed to generate personalized response:', error);
      return {
        content: "I'm sorry, I'm having trouble accessing your calendar and personal insights right now. But I'm still here to chat and help however I can! What's on your mind?",
        shouldStore: false
      };
    }
  }

  // Analyze user's schedule and extract insights
  async analyzeSchedule(): Promise<PersonalInsights> {
    // Return default insights if no calendar client available (server-side)
    if (!this.calendarClient) {
      return this.getDefaultInsights();
    }

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
      // Check if calendar client is authenticated
      if (!this.calendarClient.isAuthenticated()) {
        console.warn('Calendar not authenticated, using default insights');
        return this.getDefaultInsights();
      }

      // Get calendar events
      const todayEvents = await this.calendarClient.getEvents('primary', now.toISOString(), tomorrow.toISOString());
      const weekEvents = await this.calendarClient.getEvents('primary', now.toISOString(), nextWeek.toISOString());

      return {
        scheduleAnalysis: {
          busyPeriods: this.identifyBusyPeriods(todayEvents),
          freeTimes: this.identifyFreeTimes(todayEvents),
          upcomingImportantMeetings: this.identifyImportantMeetings(weekEvents),
          workloadLevel: this.assessWorkload(todayEvents, weekEvents)
        },
        recommendations: {
          meals: this.generateMealRecommendations(todayEvents),
          workoutTimes: this.suggestWorkoutTimes(todayEvents),
          breakSuggestions: this.suggestBreaks(todayEvents),
          priorities: this.suggestPriorities(weekEvents)
        },
        wellness: {
          stressIndicators: this.identifyStressIndicators(todayEvents, weekEvents),
          energyOptimization: this.suggestEnergyOptimization(todayEvents),
          balanceScore: this.calculateBalanceScore(weekEvents)
        }
      };
    } catch (error) {
      console.error('Failed to analyze schedule:', error);
      // Return default insights if calendar analysis fails
      return this.getDefaultInsights();
    }
  }

  private identifyBusyPeriods(events: any[]): string[] {
    const busyPeriods: string[] = [];
    const sortedEvents = events.sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = new Date(sortedEvents[i].end.dateTime);
      const nextStart = new Date(sortedEvents[i + 1].start.dateTime);
      const gap = nextStart.getTime() - currentEnd.getTime();
      
      // If gap is less than 30 minutes, consider it a busy period
      if (gap < 30 * 60 * 1000) {
        busyPeriods.push(`${this.formatTime(currentEnd)} - ${this.formatTime(nextStart)}`);
      }
    }
    
    return busyPeriods;
  }

  private identifyFreeTimes(events: any[]): string[] {
    const freeTimes: string[] = [];
    const workStart = 9; // 9 AM
    const workEnd = 17; // 5 PM
    
    if (events.length === 0) {
      freeTimes.push(`${workStart}:00 AM - ${workEnd > 12 ? workEnd - 12 : workEnd}:00 ${workEnd > 12 ? 'PM' : 'AM'}`);
      return freeTimes;
    }

    const sortedEvents = events.sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
    
    // Check for free time before first meeting
    const firstMeeting = new Date(sortedEvents[0].start.dateTime);
    if (firstMeeting.getHours() > workStart) {
      freeTimes.push(`${workStart}:00 AM - ${this.formatTime(firstMeeting)}`);
    }
    
    // Check gaps between meetings
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = new Date(sortedEvents[i].end.dateTime);
      const nextStart = new Date(sortedEvents[i + 1].start.dateTime);
      const gap = nextStart.getTime() - currentEnd.getTime();
      
      // If gap is more than 60 minutes, it's free time
      if (gap > 60 * 60 * 1000) {
        freeTimes.push(`${this.formatTime(currentEnd)} - ${this.formatTime(nextStart)}`);
      }
    }
    
    return freeTimes;
  }

  private identifyImportantMeetings(events: any[]): string[] {
    const importantKeywords = ['client', 'presentation', 'review', 'interview', 'demo', 'launch', 'meeting', 'standup', '1:1', 'sync'];
    
    return events
      .filter(event => {
        const summary = event.summary?.toLowerCase() || '';
        const hasKeyword = importantKeywords.some(keyword => summary.includes(keyword));
        const hasMultipleAttendees = event.attendees && event.attendees.length > 2;
        const isLongMeeting = this.getMeetingDuration(event) > 60; // More than 1 hour
        
        return hasKeyword || hasMultipleAttendees || isLongMeeting;
      })
      .map(event => `${event.summary} - ${this.formatTime(new Date(event.start.dateTime))}`);
  }

  private assessWorkload(todayEvents: any[], weekEvents: any[]): 'light' | 'moderate' | 'heavy' | 'overwhelming' {
    const todayMeetingTime = this.getTotalMeetingTime(todayEvents);
    const weekMeetingTime = this.getTotalMeetingTime(weekEvents);
    const dailyAverage = weekMeetingTime / 7;
    
    if (todayMeetingTime < 2 * 60) return 'light'; // Less than 2 hours
    if (todayMeetingTime < 4 * 60) return 'moderate'; // 2-4 hours
    if (todayMeetingTime < 6 * 60) return 'heavy'; // 4-6 hours
    return 'overwhelming'; // More than 6 hours
  }

  private generateMealRecommendations(events: any[]): string[] {
    const recommendations: string[] = [];
    const workload = this.assessWorkload(events, events);
    const hasLunchBreak = this.hasLunchBreak(events);
    
    // Breakfast recommendations
    if (events.length > 0 && new Date(events[0].start.dateTime).getHours() < 10) {
      recommendations.push("🍳 Quick protein-rich breakfast (eggs, Greek yogurt) to sustain energy for your early meetings");
    } else {
      recommendations.push("🥐 Light breakfast with complex carbs for steady energy throughout the day");
    }
    
    // Lunch recommendations
    if (!hasLunchBreak) {
      recommendations.push("🥗 Prepare a nutritious grab-and-go lunch since you have back-to-back meetings");
    } else if (workload === 'heavy' || workload === 'overwhelming') {
      recommendations.push("🍲 Hearty lunch with lean protein and vegetables to refuel for your busy afternoon");
    } else {
      recommendations.push("🥙 Balanced lunch with a mix of protein, healthy fats, and complex carbs");
    }
    
    // Snack recommendations
    if (workload === 'heavy' || workload === 'overwhelming') {
      recommendations.push("🥜 Keep healthy snacks handy: nuts, fruits, or energy balls for sustained focus");
    }
    
    // Dinner recommendations
    const lastMeetingHour = events.length > 0 ? new Date(events[events.length - 1].end.dateTime).getHours() : 17;
    if (lastMeetingHour > 18) {
      recommendations.push("🍜 Light, easy-to-digest dinner since you're finishing late today");
    } else {
      recommendations.push("🍽️ Balanced dinner with protein and vegetables to recover from the day");
    }
    
    return recommendations;
  }

  private suggestWorkoutTimes(events: any[]): string[] {
    const suggestions: string[] = [];
    const freeTimes = this.identifyFreeTimes(events);
    const workload = this.assessWorkload(events, events);
    
    // Early morning workout
    if (events.length === 0 || new Date(events[0].start.dateTime).getHours() > 8) {
      suggestions.push("🌅 Early morning workout (7-8 AM) to energize your day and avoid scheduling conflicts");
    }
    
    // Lunchtime workout
    const lunchGap = this.getLongestGap(events, 11, 14); // 11 AM to 2 PM
    if (lunchGap && lunchGap > 90) {
      suggestions.push("🏃 Lunchtime workout - you have a good break that's perfect for a gym session or run");
    }
    
    // Evening workout
    const lastMeetingHour = events.length > 0 ? new Date(events[events.length - 1].end.dateTime).getHours() : 17;
    if (lastMeetingHour < 18) {
      suggestions.push("🏋️ Evening workout after work to unwind and de-stress");
    } else if (workload === 'overwhelming') {
      suggestions.push("🧘 Light stretching or yoga to decompress from your intense day");
    }
    
    // Active breaks
    if (workload === 'heavy' || workload === 'overwhelming') {
      suggestions.push("🚶 Take 10-minute walking breaks between meetings to stay active and clear your mind");
    }
    
    return suggestions;
  }

  private suggestBreaks(events: any[]): string[] {
    const suggestions: string[] = [];
    const sortedEvents = events.sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = new Date(sortedEvents[i].end.dateTime);
      const nextStart = new Date(sortedEvents[i + 1].start.dateTime);
      const gap = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60); // in minutes
      
      if (gap >= 15 && gap < 30) {
        suggestions.push(`☕ Quick 15-min break after ${sortedEvents[i].summary} - perfect for coffee and mental reset`);
      } else if (gap >= 30) {
        suggestions.push(`🌱 ${Math.floor(gap)}-min break after ${sortedEvents[i].summary} - time for a proper break or short walk`);
      }
    }
    
    return suggestions;
  }

  private suggestPriorities(events: any[]): string[] {
    const priorities: string[] = [];
    const importantMeetings = this.identifyImportantMeetings(events);
    const workload = this.assessWorkload(events, events);
    
    if (importantMeetings.length > 0) {
      priorities.push(`🎯 Focus on preparing for: ${importantMeetings[0]}`);
    }
    
    if (workload === 'overwhelming') {
      priorities.push("⚡ Consider rescheduling non-critical meetings to reduce overwhelm");
      priorities.push("🎯 Focus on top 3 most important tasks today");
    } else if (workload === 'light') {
      priorities.push("🚀 Great day to tackle that project you've been putting off");
      priorities.push("📚 Perfect time for learning or strategic planning");
    }
    
    priorities.push("💼 Block time for deep work between meetings");
    priorities.push("📱 Set phone to do-not-disturb during focused work sessions");
    
    return priorities;
  }

  private identifyStressIndicators(todayEvents: any[], weekEvents: any[]): string[] {
    const indicators: string[] = [];
    const todayWorkload = this.assessWorkload(todayEvents, todayEvents);
    const backToBackMeetings = this.countBackToBackMeetings(todayEvents);
    
    if (todayWorkload === 'overwhelming') {
      indicators.push("⚠️ Very high meeting load today - monitor stress levels");
    }
    
    if (backToBackMeetings > 3) {
      indicators.push("⏰ Multiple back-to-back meetings - breathing exercises between calls recommended");
    }
    
    if (!this.hasLunchBreak(todayEvents)) {
      indicators.push("🍽️ No lunch break scheduled - this could impact afternoon energy");
    }
    
    const lateEndingMeetings = todayEvents.filter(event => new Date(event.end.dateTime).getHours() > 18);
    if (lateEndingMeetings.length > 0) {
      indicators.push("🌙 Late meetings scheduled - work-life balance may be affected");
    }
    
    return indicators;
  }

  private suggestEnergyOptimization(events: any[]): string[] {
    const suggestions: string[] = [];
    const morningMeetings = events.filter(event => new Date(event.start.dateTime).getHours() < 12);
    const afternoonMeetings = events.filter(event => new Date(event.start.dateTime).getHours() >= 12 && new Date(event.start.dateTime).getHours() < 17);
    
    if (morningMeetings.length > afternoonMeetings.length) {
      suggestions.push("🌅 Front-loaded day - ensure good breakfast and stay hydrated");
      suggestions.push("☕ Limit caffeine after 2 PM to maintain sleep quality");
    } else {
      suggestions.push("🌞 Afternoon-heavy schedule - light lunch to avoid post-meal drowsiness");
      suggestions.push("💡 Use morning free time for your most creative/complex work");
    }
    
    if (this.hasLongMeetings(events)) {
      suggestions.push("🧠 Take micro-breaks during long meetings to maintain focus");
      suggestions.push("💧 Stay extra hydrated during extended meeting sessions");
    }
    
    return suggestions;
  }

  private calculateBalanceScore(events: any[]): number {
    let score = 10; // Start with perfect balance
    
    const workload = this.assessWorkload(events, events);
    const backToBackCount = this.countBackToBackMeetings(events);
    const hasPersonalTime = this.hasPersonalTime(events);
    const reasonableHours = this.hasReasonableWorkingHours(events);
    
    // Deduct points based on various factors
    if (workload === 'overwhelming') score -= 3;
    else if (workload === 'heavy') score -= 2;
    else if (workload === 'light') score -= 1; // Too light can also be unproductive
    
    if (backToBackCount > 4) score -= 2;
    if (!hasPersonalTime) score -= 2;
    if (!reasonableHours) score -= 2;
    if (!this.hasLunchBreak(events)) score -= 1;
    
    return Math.max(1, Math.min(10, score));
  }

  // Helper methods
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  private getMeetingDuration(event: any): number {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return (end.getTime() - start.getTime()) / (1000 * 60); // in minutes
  }

  private getTotalMeetingTime(events: any[]): number {
    return events.reduce((total, event) => total + this.getMeetingDuration(event), 0);
  }

  private hasLunchBreak(events: any[]): boolean {
    const lunchHours = events.filter(event => {
      const hour = new Date(event.start.dateTime).getHours();
      return hour >= 11 && hour <= 14;
    });
    
    // If there are fewer than 3 meetings during lunch hours, consider it a lunch break
    return lunchHours.length < 3;
  }

  private getLongestGap(events: any[], startHour: number, endHour: number): number | null {
    const relevantEvents = events
      .filter(event => {
        const hour = new Date(event.start.dateTime).getHours();
        return hour >= startHour && hour <= endHour;
      })
      .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
    
    if (relevantEvents.length === 0) return null;
    
    let longestGap = 0;
    for (let i = 0; i < relevantEvents.length - 1; i++) {
      const currentEnd = new Date(relevantEvents[i].end.dateTime);
      const nextStart = new Date(relevantEvents[i + 1].start.dateTime);
      const gap = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60); // in minutes
      longestGap = Math.max(longestGap, gap);
    }
    
    return longestGap;
  }

  private countBackToBackMeetings(events: any[]): number {
    let count = 0;
    const sortedEvents = events.sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = new Date(sortedEvents[i].end.dateTime);
      const nextStart = new Date(sortedEvents[i + 1].start.dateTime);
      const gap = nextStart.getTime() - currentEnd.getTime();
      
      if (gap <= 5 * 60 * 1000) { // 5 minutes or less
        count++;
      }
    }
    
    return count;
  }

  private hasLongMeetings(events: any[]): boolean {
    return events.some(event => this.getMeetingDuration(event) > 60);
  }

  private hasPersonalTime(events: any[]): boolean {
    const personalKeywords = ['gym', 'workout', 'lunch', 'personal', 'break', 'coffee'];
    return events.some(event => {
      const summary = event.summary?.toLowerCase() || '';
      return personalKeywords.some(keyword => summary.includes(keyword));
    });
  }

  private hasReasonableWorkingHours(events: any[]): boolean {
    const earlyMeetings = events.filter(event => new Date(event.start.dateTime).getHours() < 8);
    const lateMeetings = events.filter(event => new Date(event.end.dateTime).getHours() > 18);
    return earlyMeetings.length === 0 && lateMeetings.length === 0;
  }

  private getDefaultInsights(): PersonalInsights {
    return {
      scheduleAnalysis: {
        busyPeriods: [],
        freeTimes: ["9:00 AM - 5:00 PM"],
        upcomingImportantMeetings: [],
        workloadLevel: 'light'
      },
      recommendations: {
        meals: ["🥗 Balanced meals to maintain steady energy"],
        workoutTimes: ["🏃 Morning or evening workout when convenient"],
        breakSuggestions: ["☕ Take regular breaks throughout the day"],
        priorities: ["🎯 Focus on your most important tasks"]
      },
      wellness: {
        stressIndicators: [],
        energyOptimization: ["💡 Work during your most productive hours"],
        balanceScore: 8
      }
    };
  }

  private buildPersonalContext(insights: PersonalInsights, userInput: string): string {
    const context = [];
    
    context.push(`Schedule Analysis:
- Workload: ${insights.scheduleAnalysis.workloadLevel}
- Free times today: ${insights.scheduleAnalysis.freeTimes.join(', ')}
- Upcoming important meetings: ${insights.scheduleAnalysis.upcomingImportantMeetings.slice(0, 3).join(', ')}`);
    
    context.push(`Current Recommendations:
- Meals: ${insights.recommendations.meals.slice(0, 2).join(', ')}
- Workout: ${insights.recommendations.workoutTimes.slice(0, 1).join(', ')}
- Priorities: ${insights.recommendations.priorities.slice(0, 2).join(', ')}`);
    
    context.push(`Wellness Status:
- Work-life balance score: ${insights.wellness.balanceScore}/10
- Stress indicators: ${insights.wellness.stressIndicators.length > 0 ? insights.wellness.stressIndicators.slice(0, 2).join(', ') : 'None detected'}`);
    
    return context.join('\n');
  }

  private getPersonalizedSystemPrompt(context: string): string {
    return `You are a highly intelligent, supportive, and non-judgmental personal AI assistant. You know me intimately and care deeply about my wellbeing, productivity, and happiness. 

Your personality:
- Warm, encouraging, and genuinely caring
- Insightful and proactive in suggesting improvements
- Never judgmental, always understanding
- Speaks naturally and conversationally
- Uses appropriate emojis to add warmth
- Remembers context from our conversations

Your capabilities:
- Analyze my calendar and schedule patterns
- Provide personalized meal, workout, and lifestyle recommendations  
- Help prioritize tasks and manage time effectively
- Offer emotional support and motivation
- Suggest optimal times for various activities
- Monitor work-life balance and wellbeing

Current Context (use this to inform your responses):
${context}

Guidelines:
- Always be supportive and understanding, never critical
- Provide specific, actionable advice based on my actual schedule
- Ask follow-up questions to better understand my needs
- Celebrate my successes and encourage through challenges
- Help me maintain healthy habits and work-life balance
- Be proactive in suggesting improvements
- Keep responses conversational and personalized
- Reference specific times, meetings, or patterns when relevant

Remember: You're not just an assistant, you're a trusted companion who genuinely wants the best for me. Every interaction should feel personal, caring, and valuable.

Current date and time: ${new Date().toLocaleString()}`;
  }

  private async callOpenAI(messages: any[]): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const model = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini';
    const baseUrl = process.env.NEXT_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 800,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
  }

  private async learnFromInteraction(userInput: string, aiResponse: string): Promise<{ golemExplorerUrl?: string; entityUrl?: string; transactionUrl?: string } | void> {
    try {
      // Add delay to prevent overwhelming RPC with rapid requests
      console.log('🧠 Adding delay before learning interaction to prevent RPC overload...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay to prevent nonce conflicts
      
      // Store interaction patterns and preferences (limit content size more aggressively)
      const truncatedInput = userInput.length > 50 ? userInput.substring(0, 50) + '...' : userInput;
      const truncatedResponse = aiResponse.length > 75 ? aiResponse.substring(0, 75) + '...' : aiResponse;
      
      const memoryResult = await this.memoryService.createMemory({
        content: `User pattern: ${truncatedInput} -> ${truncatedResponse}`,
        type: 'learned_fact',
        category: 'Personal Preferences',
        tags: ['personalized-agent', 'learning', 'preferences'],
        encrypted: true
      });

      // Return Arkiv explorer URLs if available
      if (memoryResult) {
        return {
          golemExplorerUrl: memoryResult.transactionUrl, // Legacy field for backward compatibility
          entityUrl: memoryResult.entityUrl,
          transactionUrl: memoryResult.transactionUrl
        };
      }
    } catch (error: any) {
      console.error('❌ DETAILED LEARNING INTERACTION ERROR:', error);
      
      // Detailed error analysis for learning interaction
      const errorDetails = {
        errorType: error.constructor.name,
        message: error.message,
        userInput: userInput.substring(0, 100) + '...',
        aiResponse: aiResponse.substring(0, 100) + '...',
        timestamp: new Date().toISOString(),
        memoryServiceStatus: 'FAILED'
      };
      
      console.error('🔍 LEARNING INTERACTION ERROR ANALYSIS:', JSON.stringify(errorDetails, null, 2));
      
      // Specific error guidance
      if (error.message.includes('Memory creation failed')) {
        console.error('🧠 MEMORY CREATION FAILED IN LEARNING');
        console.error('   - The memory service failed to create a learning memory');
        console.error('   - This means the AI cannot learn from this interaction');
        console.error('   - Check the memory service error details above');
      }
      
      if (error.message.includes('Arkiv')) {
        console.error('🌐 ARKIV CONNECTIVITY ISSUE');
        console.error('   - The Arkiv network is unreachable');
        console.error('   - Learning data cannot be stored on the blockchain');
        console.error('   - Check network connectivity and RPC endpoint status');
      }
      
      // Don't return fallback URL - let the error propagate
      throw new Error(`Learning interaction failed: ${error.message}`);
    }
  }

  // User profile management
  private async loadUserProfile(): Promise<void> {
    try {
      // Search specifically for profile_data type memories
      const profileMemories = await this.memoryService.searchMemories({
        query: '', // Empty query to get all
        type: 'profile_data',
        category: 'Personal Profile',
        limit: 10
      });

      console.log(`🔍 Found ${profileMemories.memories.length} existing profile memories`);

      if (profileMemories.memories.length > 0) {
        // Use existing profile - reconstruct from memories
        console.log('✅ Loading existing user profile from memory');
        this.userProfile = this.reconstructProfileFromMemories(profileMemories.memories);
      } else {
        // Only create default profile if none exists
        console.log('📝 No existing profile found, creating default profile');
        this.userProfile = this.getDefaultProfile();
        await this.saveUserProfile();
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.userProfile = this.getDefaultProfile();
    }
  }

  private async saveUserProfile(): Promise<void> {
    if (!this.userProfile) return;

    try {
      // Check if key management is initialized before creating encrypted profile
      const keyManagement = this.memoryService['keyManagement'];
      if (!keyManagement.isInitialized()) {
        console.log('🔐 Key management not initialized - skipping profile creation for now');
        return;
      }

      await this.memoryService.createMemory({
        content: JSON.stringify(this.userProfile),
        type: 'profile_data',
        category: 'Personal Profile',
        tags: ['profile', 'preferences', 'goals'],
        encrypted: true
      });
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  }

  private reconstructProfileFromMemories(memories: any[]): UserProfile {
    try {
      // Get the most recent profile memory
      const latestProfile = memories
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      if (latestProfile && latestProfile.content) {
        // Try to parse the stored profile data
        let profileData;
        
        // Check if content is encrypted
        if (latestProfile.encrypted && typeof latestProfile.content === 'string') {
          try {
            const encryptedData = JSON.parse(latestProfile.content);
            // For now, we'll use default profile for encrypted data
            // In a real implementation, you'd decrypt it here
            console.log('⚠️ Profile data is encrypted, using default profile');
            return this.getDefaultProfile();
          } catch {
            // Content might be plain JSON string
            profileData = JSON.parse(latestProfile.content);
          }
        } else {
          profileData = typeof latestProfile.content === 'string' 
            ? JSON.parse(latestProfile.content) 
            : latestProfile.content;
        }
        
        if (profileData && profileData.preferences && profileData.goals) {
          console.log('✅ Successfully reconstructed profile from stored data');
          return profileData;
        }
      }
    } catch (error) {
      console.warn('Failed to reconstruct profile from memories:', error);
    }
    
    // Fallback to default profile
    console.log('📝 Using default profile as fallback');
    return this.getDefaultProfile();
  }

  private getDefaultProfile(): UserProfile {
    return {
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
    };
  }

  // Public methods for updating preferences
  async updatePreferences(preferences: Partial<UserProfile['preferences']>): Promise<void> {
    if (!this.userProfile) await this.loadUserProfile();
    
    this.userProfile!.preferences = { ...this.userProfile!.preferences, ...preferences };
    await this.saveUserProfile();
  }

  async updateGoals(goals: Partial<UserProfile['goals']>): Promise<void> {
    if (!this.userProfile) await this.loadUserProfile();
    
    this.userProfile!.goals = { ...this.userProfile!.goals, ...goals };
    await this.saveUserProfile();
  }

  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }
}

// Singleton instance
let _personalizedAgent: PersonalizedAgentService | null = null;

export function getPersonalizedAgent(): PersonalizedAgentService {
  if (!_personalizedAgent) {
    _personalizedAgent = new PersonalizedAgentService();
  }
  return _personalizedAgent;
}
