// Tale Forge - Create Story Edge Function
// Sophisticated story creation with proper database integration

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.5.0';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoryCreationRequest {
  title: string;
  description: string;
  genre: string;
  age_group: string;
  target_age?: number;
  theme: string;
  setting: string;
  characters: any[];
  conflict: string;
  quest: string;
  moralLesson: string;
  additional_details?: string;
  setting_description?: string;
  time_period?: string;
  atmosphere?: string;
  words_per_chapter?: number;
}

// Normalize age group values from frontend to database-compatible values
function normalizeAgeGroup(ageGroup: string, targetAge?: number): string {
  // Handle common frontend age group patterns
  switch (ageGroup) {
    case '4-6':
      return '4-6';
    case '7-9':
      return '7-9';
    case '7-12':
    case '10-12':
      return '10-12';
    case '13+':
    case '13-18':
      return '10-12'; // Database might not have 13+ category, using closest
    default:
      // If we have a specific target age, use it to determine the range
      if (targetAge) {
        if (targetAge <= 6) return '4-6';
        if (targetAge <= 9) return '7-9';
        return '10-12';
      }
      
      // Default fallback
      console.warn(`Unknown age group: ${ageGroup}, defaulting to 7-9`);
      return '7-9';
  }
}

console.log("Create Story function started");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    // Enhanced logging for debugging
    console.log('📥 Request method:', req.method);
    console.log('📥 Request URL:', req.url);
    console.log('📥 Request headers:', Object.fromEntries(req.headers.entries()));
    
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('🔍 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 401
      });
    }

    // Create Supabase clients
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(jwt);

    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      return new Response(JSON.stringify({
        error: 'Unauthorized - Invalid session',
        details: userError?.message || 'No user found'
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 401
      });
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const storyData: StoryCreationRequest = await req.json();
    console.log('📊 Parsed request body:', JSON.stringify(storyData, null, 2));
    console.log('📊 Request body keys:', Object.keys(storyData));

    // Validation
    if (!storyData.title || !storyData.genre || !storyData.age_group) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: title, genre, age_group',
        received: Object.keys(storyData)
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400
      });
    }

    // Normalize age group for database compatibility
    const normalizedAgeGroup = normalizeAgeGroup(storyData.age_group, storyData.target_age);
    
    console.log('📝 Creating story:', {
      title: storyData.title,
      genre: storyData.genre,
      age_group: storyData.age_group,
      normalized_age_group: normalizedAgeGroup,
      userId: user.id
    });

    // Create story record in database
    const { data: newStory, error: storyError } = await supabaseAdmin
      .from('stories')
      .insert({
        title: storyData.title,
        description: storyData.description,
        user_id: user.id,
        story_mode: storyData.genre,
        target_age: normalizedAgeGroup,
        is_public: false,
        is_completed: false,
        segment_count: 0,
        audio_generation_status: 'not_started',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (storyError) {
      console.error('❌ Database error creating story:', storyError);
      return new Response(JSON.stringify({
        error: 'Failed to create story in database',
        details: storyError.message
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500
      });
    }

    console.log('✅ Story record created:', newStory.id);

    // Generate first story segment using the optimized generate-story-segment function
    console.log('🤖 Generating first story segment with single API call optimization...');
    
    try {
      console.log('🔍 About to call generate-story-segment with:', {
        url: `${supabaseUrl}/functions/v1/generate-story-segment`,
        storyId: newStory.id,
        hasAuthHeader: !!authHeader
      });
      
      const segmentResponse = await fetch(`${supabaseUrl}/functions/v1/generate-story-segment`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: newStory.id,
          // choiceIndex is undefined for first segment (triggers first segment generation)
        })
      });
      
      console.log('📡 Segment generation response:', {
        status: segmentResponse.status,
        statusText: segmentResponse.statusText,
        ok: segmentResponse.ok
      });

      if (segmentResponse.ok) {
        const segmentData = await segmentResponse.json();
        console.log('✅ First segment generated successfully');
        
        // Update story segment count
        await supabaseAdmin
          .from('stories')
          .update({
            segment_count: 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', newStory.id);

        return new Response(JSON.stringify({
          success: true,
          story: {
            id: newStory.id,
            title: newStory.title,
            description: newStory.description,
            genre: storyData.genre,
            age_group: storyData.age_group,
            created_at: newStory.created_at,
            updated_at: newStory.updated_at
          },
          firstSegment: segmentData.segment,
          message: 'Story and first segment created successfully'
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200
        });

      } else {
        // Segment generation failed - this is a critical error
        const segmentError = await segmentResponse.text();
        console.error('🚨 CRITICAL: Segment generation failed:', {
          status: segmentResponse.status,
          statusText: segmentResponse.statusText,
          error: segmentError
        });
        
        // Delete the story since we can't generate the first segment
        await supabaseAdmin
          .from('stories')
          .delete()
          .eq('id', newStory.id);
        
        return new Response(JSON.stringify({
          error: 'Failed to generate first story segment',
          details: segmentError,
          status: segmentResponse.status
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 500
        });
      }
    } catch (segmentError) {
      console.error('🚨 CRITICAL: Error calling segment generation:', {
        message: segmentError.message,
        stack: segmentError.stack
      });
      
      // Delete the story since we can't generate the first segment  
      await supabaseAdmin
        .from('stories')
        .delete()
        .eq('id', newStory.id);
      
      return new Response(JSON.stringify({
        error: 'Segment generation service failed',
        details: segmentError.message
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500
      });
    }

  } catch (error) {
    console.error('❌ Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      success: false,
      details: error.stack?.substring(0, 500)
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 500
    });
  }
});