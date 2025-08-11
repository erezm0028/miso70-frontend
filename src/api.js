// Dynamic BASE_URL configuration for different environments
const getBaseUrl = () => {
  // For development with Expo Go or development client
  if (__DEV__) {
    // Use your local IP for development
    return 'http://10.100.102.9:3001';
  }
  
  // For production/standalone app, use a deployed backend URL
  // You'll need to deploy your backend to a service like Heroku, Railway, or Vercel
  return 'https://your-deployed-backend-url.com'; // TODO: Replace with your deployed backend URL
};

const BASE_URL = getBaseUrl();
import * as Clipboard from 'expo-clipboard';

export async function chatWithChef(messages, currentDish = null) {
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, currentDish }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API: Chat error response:', errorText);
      throw new Error(`Chat failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.reply;
  } catch (error) {
    console.error('API: Chat request failed:', error);
    throw error;
  }
}

export async function generateDish(preferences) {
  console.log('API: Sending preferences to backend:', JSON.stringify({ preferences }, null, 2));
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const res = await fetch(`${BASE_URL}/generate-dish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API: Generate dish error response:', errorText);
      throw new Error(`Failed to generate dish: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('API: Backend response:', data);
    return data.dish;
  } catch (error) {
    console.error('API: Generate dish request failed:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 60 seconds');
    }
    throw error;
  }
}

export async function getRecipeInfo(dishName) {
  try {
    console.log('API: Sending recipe info request for:', dishName);
    const res = await fetch(`${BASE_URL}/recipe-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishName }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API: Recipe info error response:', errorText);
      throw new Error(`Recipe Info API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('API: Recipe info response received:', data);
    return data.recipe;
  } catch (error) {
    console.error('API: Recipe info request failed:', error);
    throw error;
  }
}

export async function generateImage(dish) {
  try {
    console.log('API: Starting image generation for dish:', dish);
    
    // Create a controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const res = await fetch(`${BASE_URL}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dish }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API: Image generation error response:', errorText);
      throw new Error(`Image generation failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('API: Image generation response received:', data);
    console.log('API: Image URL extracted:', data.imageUrl);
    return data.imageUrl;
  } catch (error) {
    console.error('API: Image generation request failed:', error);
    throw error;
  }
}

export async function modifyRecipe(currentDish, modification) {
  console.log('API: modifyRecipe called with dish:', currentDish?.title);
  console.log('API: modification:', modification);
  
  const res = await fetch(`${BASE_URL}/modify-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dish: currentDish, modification }),
  });
  
  console.log('API: modifyRecipe response status:', res.status);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('API: modifyRecipe error response:', errorText);
    
    // Try to parse the error response as JSON for more details
    try {
      const errorData = JSON.parse(errorText);
      console.error('API: Parsed error data:', errorData);
      throw new Error(`Modify Recipe API error: ${errorData.error || 'Unknown error'}`);
    } catch (parseError) {
      // If we can't parse the error as JSON, use the raw text
      throw new Error(`Modify Recipe API error: ${res.status} ${res.statusText}`);
    }
  }
  
  const data = await res.json();
  console.log('API: modifyRecipe response data:', data);
  return data;
}

export async function getChatDishSuggestion(userMessage, preferences) {
  try {
    const res = await fetch(`${BASE_URL}/chat-dish-suggestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, preferences }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API: Chat dish suggestion error response:', errorText);
      throw new Error(`Chat dish suggestion failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('API: Chat dish suggestion request failed:', error);
    throw error;
  }
}

export async function fuseDish(currentDish, modification) {
  try {
    const res = await fetch(`${BASE_URL}/fuse-dish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentDish, modification }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API: Fuse dish error response:', errorText);
      throw new Error(`Fuse dish failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('API: Fuse dish request failed:', error);
    throw error;
  }
}

// Share recipe functionality
export const generateShareText = (dish) => {
  if (!dish) return null;
  
  // Create a nicely formatted share text with MisoToast branding at the top
  const shareText = `🍽️ MisoToast\nRemixing meals, daily 🍽️\n\n---\n\n🍽️ ${dish.title}\n\n${dish.description}\n\n📋 Ingredients:\n${(dish.recipe?.ingredients || []).map((ing, i) => `${i + 1}. ${ing}`).join('\n')}\n\n👨‍🍳 Instructions:\n${(dish.recipe?.instructions || []).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n📊 Nutrition:\n${dish.recipe?.nutrition ? Object.entries(dish.recipe.nutrition).map(([key, value]) => `${key}: ${value}`).join('\n') : 'Not available'}`;
  
  return shareText;
};

export const parseShareUrl = (url) => {
  try {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const encodedData = urlParams.get('recipe');
    
    if (!encodedData) return null;
    
    const decodedData = atob(encodedData);
    return JSON.parse(decodedData);
  } catch (error) {
    console.error('Error parsing share URL:', error);
    return null;
  }
};

export const copyToClipboard = async (text) => {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};
