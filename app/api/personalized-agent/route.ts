import { NextRequest, NextResponse } from 'next/server';
import { getPersonalizedAgent } from '@/lib/personalized-agent-service';
import { ChatMessage } from '@/types/chat';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput, previousMessages } = body;

    if (!userInput) {
      return NextResponse.json(
        { error: 'User input is required' },
        { status: 400 }
      );
    }

    // Initialize the personalized agent service
    const personalizedAgent = getPersonalizedAgent();
    
    try {
      await personalizedAgent.initialize();
    } catch (initError) {
      console.warn('Failed to fully initialize personalized agent, continuing with limited functionality:', initError);
    }

    // Generate personalized response
    const response = await personalizedAgent.generatePersonalizedResponse(
      userInput,
      previousMessages || []
    );

    // Get current insights for the response
    let insights = null;
    try {
      insights = await personalizedAgent.analyzeSchedule();
    } catch (insightsError) {
      console.warn('Failed to get schedule insights:', insightsError);
    }

    return NextResponse.json({
      content: response.content,
      shouldStore: response.shouldStore,
      insights,
      golemExplorerUrl: response.golemExplorerUrl, // Legacy field for backward compatibility
      entityUrl: response.entityUrl,
      transactionUrl: response.transactionUrl
    });

  } catch (error: any) {
    console.error('Personalized agent API error:', error);
    
    // Provide helpful error messages based on the error type
    let errorMessage = 'Failed to generate personalized response';
    let statusCode = 500;

    if (error.message.includes('API key')) {
      errorMessage = 'OpenAI API key is not configured properly';
      statusCode = 500;
    } else if (error.message.includes('401')) {
      errorMessage = 'Invalid OpenAI API credentials';
      statusCode = 500;
    } else if (error.message.includes('429')) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      statusCode = 429;
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error. Please check your internet connection.';
      statusCode = 503;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const personalizedAgent = getPersonalizedAgent();
    
    // Get user profile
    const profile = personalizedAgent.getUserProfile();
    
    // Get current schedule insights
    let insights = null;
    try {
      await personalizedAgent.initialize();
      insights = await personalizedAgent.analyzeSchedule();
    } catch (error) {
      console.warn('Failed to get insights for GET request:', error);
    }

    return NextResponse.json({
      profile,
      insights,
      status: 'ready'
    });

  } catch (error: any) {
    console.error('Failed to get personalized agent status:', error);
    
    return NextResponse.json(
      { error: 'Failed to get agent status' },
      { status: 500 }
    );
  }
}
