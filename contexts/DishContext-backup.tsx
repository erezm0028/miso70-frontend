import React, { createContext, useContext, useState, useEffect } from 'react';
import { Image } from 'react-native';
import { generateDish as generateDishAPI, generateImage as generateImageAPI, getRecipeInfo as getRecipeInfoAPI, modifyRecipe as modifyRecipeAPI, cookDish as cookDishAPI, remixDish as remixDishAPI, fuseDish as fuseDishAPI } from '../src/api';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase';
import { useAuth } from './AuthContext';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import BASE_URL from api.js
const getBaseUrl = () => {
  return 'http://192.168.1.107:3001';
};
const API_BASE_URL = getBaseUrl();

type Dish = {
  id: string;
  image: string;
  title: string;
  description: string;
  recipe?: {
    ingredients: string[];
    instructions: string[];
    nutrition: any;
  };
  timestamp: Date;
  modificationType?: 'transformative' | 'minor' | 'remix' | 'fusion';
  originalDishId?: string;
  preferences?: Partial<Preferences>; // Store the preferences used to create this dish
  chatContext?: string; // Store the original chat context that created this dish
};

type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

type Preferences = {
  dietaryRestrictions: string[];
  cuisines: string[];
  classicDishes: string[];
  plateStyles: string[];
  ingredientPreferences: string[];
};

type ConversationContext = {
  modifications: Array<{ originalDish: any; modification: string; timestamp: Date; }>;
      preferences: Array<{ type: 'dietary' | 'cuisine' | 'style' | 'ingredient' | 'dishType' | 'classicDish' | 'userWord'; value: string; timestamp: Date; }>;
  dishHistory: Array<{ title: string; description: string; timestamp: Date; }>;
  lastUpdate?: number;
};

type DishContextType = {
  // Current dish state
  currentDish: Dish | null;
  setCurrentDish: React.Dispatch<React.SetStateAction<Dish | null>>;
  dishHistory: Dish[];
  setDishHistory: React.Dispatch<React.SetStateAction<Dish[]>>;
  
  // Chat state
  chatMessages: ChatMessage[];
  
  // Conversation context state
  conversationContext: ConversationContext;
  
  // Preferences state
  preferences: Preferences;
  hasPreferences: () => boolean;
  
  // Loading states
  isGeneratingDish: boolean;
  setIsGeneratingDish: React.Dispatch<React.SetStateAction<boolean>>;
  isGeneratingSpecificDish: boolean;
  isModifyingRecipe: boolean;
  isGeneratingRecipe: boolean;
  setIsGeneratingRecipe: React.Dispatch<React.SetStateAction<boolean>>;
  isGeneratingImage: boolean;
  isLoadingHistory: boolean;
  
  // Error state
  imageError: string | null;
  setImageError: React.Dispatch<React.SetStateAction<string | null>>;
  clearImageError: () => void;
  clearImageGeneration: () => void;
  
  // Dish lifecycle state
  isDishFinal: boolean;
  setIsDishFinal: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  generateDish: (preferences?: Partial<Preferences>) => Promise<void>;
  generateSpecificDish: (dishName: string, chatContext?: string, preferences?: Partial<Preferences>) => Promise<void>;
  regenerateDishWithContext: () => Promise<void>;
  updateRecipe: (recipeChanges: Partial<Dish['recipe']>) => void;
  addChatMessage: (text: string, isUser: boolean) => void;
  updatePreferences: (newPreferences: Partial<Preferences>) => void;
  updatePreferencesOnly: (newPreferences: Partial<Preferences>) => void;
  saveDishToHistory: (dish: Dish) => void;
  saveDishHistoryToFirestore: (history: Dish[]) => Promise<void>;
  saveCurrentDishHistoryToLocalStorage: () => Promise<void>;
  loadDishFromHistory: (dishId: string) => Promise<void>;
  generateRecipeInfo: (dishTitle: string) => Promise<void>;
  cookDish: (dishTitle: string) => Promise<void>;
  modifyRecipe: (modification: string, dishToModify?: any) => Promise<{ isTransformative: boolean; summary: string; updatedDish: any } | void>;
  remixDish: (userRequest: string, preferences?: Partial<Preferences>) => Promise<{ summary: string; updatedDish: any } | void>;
  fuseDish: (modification: string, dishToModify?: any) => Promise<{ summary: string; updatedDish: any } | void>;
  finalizeDish: () => void;
  clearPreferences: () => void;
  clearChatMessages: () => void;
  updateChatContextForModifiedDish: (modifiedDish: any, modificationSummary: string) => void;
  updateConversationContext: (updates: Partial<ConversationContext>) => void;
  addConversationPreference: (type: 'dietary' | 'cuisine' | 'style' | 'ingredient' | 'dishType' | 'classicDish' | 'userWord', value: string) => void;
  removeConversationPreference: (type: string, value: string) => void;
  clearConversationContext: () => void;
};

const DishContext = createContext<DishContextType>({
  currentDish: null,
  setCurrentDish: () => {},
  dishHistory: [],
  setDishHistory: () => {},
  chatMessages: [],
  conversationContext: {
    modifications: [],
    preferences: [],
    dishHistory: [],
  },
  preferences: {
    dietaryRestrictions: [],
    cuisines: [],
    classicDishes: [],
    plateStyles: [],
    ingredientPreferences: [],
  },
  hasPreferences: () => false,
  isGeneratingDish: false,
  setIsGeneratingDish: () => {},
  isGeneratingSpecificDish: false,
  isModifyingRecipe: false,
  isGeneratingRecipe: false,
  setIsGeneratingRecipe: () => {},
  isGeneratingImage: false,
  isLoadingHistory: false,
  imageError: null,
  setImageError: () => {},
  clearImageError: () => {},
  clearImageGeneration: () => {},
  isDishFinal: false,
  setIsDishFinal: () => {},
  generateDish: async () => {},
  generateSpecificDish: async () => {},
  regenerateDishWithContext: async () => {},
  updateRecipe: () => {},
  addChatMessage: () => {},
  updatePreferences: () => {},
  updatePreferencesOnly: () => {},
  saveDishToHistory: () => {},
  saveDishHistoryToFirestore: async () => {},
  saveCurrentDishHistoryToLocalStorage: async () => {},
      loadDishFromHistory: async () => {},
  generateRecipeInfo: async () => {},
  cookDish: async () => {},
  modifyRecipe: async () => {},
  remixDish: async () => {},
  fuseDish: async () => {},
  finalizeDish: () => {},
  clearPreferences: () => {},
  clearChatMessages: () => {},
  updateChatContextForModifiedDish: () => {},
  updateConversationContext: () => {},
  addConversationPreference: () => {},
  removeConversationPreference: () => {},
  clearConversationContext: () => {},
});

export const useDish = () => useContext(DishContext);

export const DishProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentDish, setCurrentDish] = useState<Dish | null>(null);
  const [dishHistory, setDishHistory] = useState<Dish[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Check network connectivity
  const checkNetworkStatus = async () => {
    try {
      const state = await NetInfo.fetch();
      console.log('Network status:', state.isConnected);
      return state.isConnected;
    } catch (error) {
      console.log('Error checking network status:', error);
      return false;
    }
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    modifications: [],
    preferences: [],
    dishHistory: [],
  });
  const [preferences, setPreferences] = useState<Preferences>({
    dietaryRestrictions: [],
    cuisines: [],
    classicDishes: [],
    plateStyles: [],
    ingredientPreferences: [],
  });
  const [imageError, setImageError] = useState<string | null>(null);
  const [isGeneratingDish, setIsGeneratingDish] = useState(false);
  const [isGeneratingSpecificDish, setIsGeneratingSpecificDish] = useState(false);
  const [isModifyingRecipe, setIsModifyingRecipe] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isDishFinal, setIsDishFinal] = useState(false);

  // Helper function to check if any preferences are set
  const hasPreferences = () => {
    return preferences.dietaryRestrictions.length > 0 || 
           preferences.cuisines.length > 0 || 
           preferences.classicDishes.length > 0 ||
           preferences.plateStyles.length > 0 ||
           preferences.ingredientPreferences.length > 0;
  };

  // Helper function to generate AI response based on user message and preferences
  const generateAIResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();

    // --- Classic Dishes and Cuisines Keywords ---
    const cuisineKeywords = {
      'Italian': ['pasta', 'pizza', 'risotto', 'italian', 'carbonara', 'pomodoro', 'bolognese', 'parmesan', 'basil', 'oregano'],
      'Japanese': ['sushi', 'ramen', 'japanese', 'asian', 'miso', 'dashi', 'nori', 'wasabi', 'ginger', 'soy sauce'],
      'Mexican': ['taco', 'burrito', 'mexican', 'salsa', 'guacamole', 'jalapeño', 'cilantro', 'lime', 'corn', 'beans'],
      'Indian': ['curry', 'indian', 'spice', 'masala', 'tikka', 'biryani', 'naan', 'cardamom', 'cumin', 'turmeric'],
      'French': ['french', 'bistro', 'sauce', 'beurre', 'wine', 'shallot', 'herbs', 'dijon', 'béchamel'],
      'Thai': ['thai', 'pad thai', 'curry', 'lemongrass', 'fish sauce', 'coconut milk', 'lime', 'basil', 'chili'],
      'Mediterranean': ['mediterranean', 'feta', 'olive', 'za\'atar', 'hummus', 'tahini', 'eggplant', 'cucumber', 'tomato', 'pita']
    };

    const classicDishKeywords = {
      'Pasta Carbonara': ['carbonara', 'pasta', 'eggs', 'bacon', 'pecorino'],
      'Margherita Pizza': ['pizza', 'margherita', 'mozzarella', 'tomato', 'basil'],
      'Risotto Milanese': ['risotto', 'milanese', 'saffron', 'rice', 'parmesan'],
      'Osso Buco': ['osso buco', 'veal', 'braised', 'gremolata', 'white wine'],
      'Tiramisu': ['tiramisu', 'dessert', 'coffee', 'mascarpone', 'ladyfingers'],
      'Sushi Roll': ['sushi', 'roll', 'fish', 'rice', 'nori'],
      'Ramen Bowl': ['ramen', 'noodles', 'broth', 'egg', 'pork'],
      'Taco': ['taco', 'tortilla', 'meat', 'vegetables', 'salsa'],
      'Burrito': ['burrito', 'wrap', 'beans', 'rice', 'guacamole'],
      'Curry': ['curry', 'spices', 'sauce', 'rice', 'naan'],
      'Biryani': ['biryani', 'rice', 'spices', 'meat', 'saffron'],
      'Coq au Vin': ['coq au vin', 'chicken', 'wine', 'bacon', 'mushrooms'],
      'Beef Bourguignon': ['beef bourguignon', 'beef', 'wine', 'vegetables', 'braised'],
      'Pad Thai': ['pad thai', 'noodles', 'shrimp', 'peanuts', 'tamarind'],
      'Green Curry': ['green curry', 'coconut', 'vegetables', 'spicy', 'thai']
    };

    // --- Detect matches ---
    const matchedClassicDishes = Object.entries(classicDishKeywords)
      .filter(([_, keywords]) => keywords.some(keyword => message.includes(keyword)))
      .map(([dish]) => dish);

    const matchedCuisines = Object.entries(cuisineKeywords)
      .filter(([_, keywords]) => keywords.some(keyword => message.includes(keyword)))
      .map(([cuisine]) => cuisine);

    const userCuisines = preferences.cuisines;
    const userDiets = preferences.dietaryRestrictions;
    const userClassics = preferences.classicDishes;

    // --- Dietary restriction conflict detection ---
    const dietConflicts: string[] = [];
    if (userDiets.includes('Diabetic-Friendly') && (message.includes('sugar') || message.includes('sweet') || message.includes('dessert'))) {
      dietConflicts.push('diabetic-friendly');
    }
    if (userDiets.includes('Vegan') && (message.match(/meat|chicken|beef|fish|dairy|cheese|eggs|milk/))) {
      dietConflicts.push('vegan');
    }
    if (userDiets.includes('Vegetarian') && (message.match(/meat|chicken|beef|fish|pork/))) {
      dietConflicts.push('vegetarian');
    }
    if (userDiets.includes('Gluten-Free') && (message.match(/pasta|bread|flour|wheat|gluten/))) {
      dietConflicts.push('gluten-free');
    }
    if (userDiets.includes('Keto') && (message.match(/pasta|rice|bread|potato|sugar|carb/))) {
      dietConflicts.push('keto');
    }
    if (dietConflicts.length > 0) {
      // Respond with a substitution suggestion
      const conflict = dietConflicts[0];
      switch (conflict) {
        case 'diabetic-friendly':
          return "Since you have diabetic-friendly preferences, I suggest using natural sweeteners like stevia, erythritol, or monk fruit instead of sugar. Want to see a diabetic-friendly version?";
        case 'vegan':
          return "You're vegan, so I'll suggest plant-based alternatives (like tofu for meat, or plant milk for dairy). Want a vegan version?";
        case 'vegetarian':
          return "You're vegetarian, so I'll suggest plant-based alternatives for meat. Want a vegetarian version?";
        case 'gluten-free':
          return "You're gluten-free, so I'll suggest alternatives like rice, quinoa, or gluten-free pasta. Want a gluten-free version?";
        case 'keto':
          return "You're keto, so I'll suggest low-carb alternatives like cauliflower rice or zucchini noodles. Want a keto version?";
        default:
          return "I'll help you find alternatives that fit your dietary preferences. What would you like to substitute?";
      }
    }

    // --- Fusion logic: everything can be mixed with everything! ---
    if (matchedClassicDishes.length > 0) {
      const dish = matchedClassicDishes[0];
      let fusionCuisine = userCuisines.length > 0 ? userCuisines[0] : null;
      let fusionText = fusionCuisine && !dish.toLowerCase().includes(fusionCuisine.toLowerCase())
        ? `Let's make a ${fusionCuisine}-inspired ${dish}!`
        : `Let's make a creative take on ${dish}!`;

      let dietText = '';
      if (userDiets.length > 0) {
        dietText = ` I'll also make sure it's ${userDiets.join(' and ').toLowerCase()}.`;
      }

      return `${fusionText}${dietText} Would you like to see the recipe?`;
    }

    if (matchedCuisines.length > 0) {
      const cuisine = matchedCuisines[0];
      let dietText = userDiets.length > 0 ? ` and make it ${userDiets.join(' and ').toLowerCase()}` : '';
      return `Let's create a unique ${cuisine} dish${dietText}! What main ingredient would you like to use?`;
    }

    if (userClassics.length > 0) {
      // If user has favorite classic dishes, suggest a fusion with their cuisine/diet
      let classic = userClassics[0];
      let fusionCuisine = userCuisines.length > 0 ? userCuisines[0] : null;
      let fusionText = fusionCuisine
        ? `How about a ${fusionCuisine}-inspired version of your favorite, ${classic}?`
        : `How about a creative version of your favorite, ${classic}?`;
      let dietText = userDiets.length > 0 ? ` I'll make it ${userDiets.join(' and ').toLowerCase()}.` : '';
      return `${fusionText}${dietText} Want to see the recipe?`;
    }

    if (userCuisines.length > 0 && userDiets.length > 0) {
      return `Let's invent a new dish that's both ${userCuisines.join(' and ')} and ${userDiets.join(' and ').toLowerCase()}! What are you in the mood for?`;
    }

    if (userCuisines.length > 0) {
      return `What kind of ${userCuisines[0]} dish are you craving?`;
    }

    if (userDiets.length > 0) {
      return `Let's come up with a delicious recipe that's ${userDiets.join(' and ').toLowerCase()}. Any cuisine or dish in mind?`;
    }

    // General helpful responses
    if (message.includes('quick') || message.includes('fast') || message.includes('30 minute')) {
      return "I can suggest some quick 30-minute recipes! What ingredients do you have on hand?";
    }
    if (message.includes('healthy') || message.includes('low calorie')) {
      return "I can help you find healthy, low-calorie options. What type of cuisine or ingredients do you prefer?";
    }
    if (message.includes('ingredient') || message.includes('substitute')) {
      return "I can help you find ingredient substitutes! What ingredient are you looking to replace?";
    }

    // Default
    return "Tell me what you're craving, and I'll mix up something special using your preferences!";
  };



  function parseDishString(dishString: string) {
    // Try to match "Dish Name: ..." or fallback to first non-empty line
    const titleMatch = dishString.match(/Dish Name: (.*)/i);
    let title = titleMatch ? titleMatch[1].trim() : '';
    if (!title) {
      // Use the first non-empty line as the title
      const firstLine = dishString.split('\n').find(line => line.trim().length > 0);
      title = firstLine ? firstLine.trim() : 'Generated Dish';
    }
    // Remove any 'Dish Name:' prefix if still present
    title = title.replace(/^Dish Name:\s*/i, '').trim();
    const descriptionMatch = dishString.match(/Description:([\s\S]*?)(Main Ingredients:|$)/);
    let description = descriptionMatch ? descriptionMatch[1].replace(/\n/g, ' ').trim() : '';
    if (!description) {
      // Try to use the second non-empty line as description
      const lines = dishString.split('\n').filter(line => line.trim().length > 0);
      description = lines[1] ? lines[1].trim() : 'A delicious dish generated just for you.';
    }
    return {
      title,
      description,
      image: '', // Don't set fallback image - let image generation handle it
      recipe: {},
    };
  }

  // New function for re-dish generation that preserves chat context
  const regenerateDishWithContext = async (): Promise<void> => {
    if (!currentDish) return;
    
    console.log('regenerateDishWithContext called with current dish:', currentDish.title);
    console.log('Current dish chat context:', currentDish.chatContext);
    console.log('Current dish preferences:', currentDish.preferences);
    console.log('Current conversation context:', conversationContext);
    
    // Get the most up-to-date conversation context by accessing it directly
    // This ensures we have the latest state after any recent updates
    const currentConversationContext = conversationContext;
    console.log('RegenerateDishWithContext: Using conversation context with', currentConversationContext.preferences.length, 'preferences');
    
    // Preserve ALL context: chat context + conversation context + preferences
    let preservedContext = '';
    
    // Add user words from conversation context
    const userWords = currentConversationContext.preferences
      .filter(pref => pref.type === 'userWord')
      .map(pref => pref.value);
    
    // Add preferences context
    const preferenceContexts = [
      ...(currentConversationContext.preferences.filter(pref => pref.type === 'dietary').map(pref => pref.value)),
      ...(currentConversationContext.preferences.filter(pref => pref.type === 'cuisine').map(pref => pref.value)),
      ...(currentConversationContext.preferences.filter(pref => pref.type === 'classicDish').map(pref => pref.value)),
      ...(currentConversationContext.preferences.filter(pref => pref.type === 'style').map(pref => pref.value)),
      ...(currentConversationContext.preferences.filter(pref => pref.type === 'ingredient').map(pref => pref.value))
    ];
    
    // Combine all context - ONLY use current conversation context, not the original dish context
    const allContexts = [...userWords, ...preferenceContexts];
    preservedContext = allContexts.join(' ');
    
    console.log('RegenerateDishWithContext: Preserved context:', preservedContext);
    console.log('RegenerateDishWithContext: User words from conversation context:', userWords);
    console.log('RegenerateDishWithContext: Preference contexts:', preferenceContexts);
    console.log('RegenerateDishWithContext: All contexts combined:', allContexts);
    
    if (preservedContext.trim()) {
      // Create a new dish with the current title but updated context
      console.log('RegenerateDishWithContext: Creating new dish with updated context');
      
      // Instead of creating a generic title, call the backend to generate a proper dish
      console.log('RegenerateDishWithContext: Calling backend to generate dish with context:', preservedContext);
      
      setIsGeneratingDish(true);
      setIsGeneratingImage(false);
      
      try {
        // Call the backend to generate a dish with the preserved context
        const response = await fetch(`${API_BASE_URL}/generate-dish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dish: preservedContext,
            preferences: currentDish?.preferences || {}
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('RegenerateDishWithContext: Backend response:', data);
        
        // Parse the dish data like the regular generateDish function does
        let parsed = data.dish;
        if (typeof data.dish === 'string') {
          // Detect backend error message strings
          const errorPatterns = [
            /^I'm sorry/i,
            /^Sorry/i,
            /^Could you please provide/i,
            /^It seems like/i,
            /^It looks like/i,
          ];
          if (errorPatterns.some((pat) => pat.test(data.dish.trim()))) {
            setImageError("🥲 Emm... I guess cooking is postponed by a bit, try again soon.");
            setIsGeneratingDish(false);
            return;
          }
          parsed = parseDishString(data.dish);
        }
        
        // Create a new dish object with the backend-generated content
        const newDish: Dish = {
          id: Date.now().toString(),
          image: '', // Start with empty image
          title: parsed.title || `${preservedContext} Dish`,
          description: parsed.description || `A delicious ${preservedContext} dish`,
          recipe: parsed.recipe || { ingredients: [], instructions: [], nutrition: {} },
          timestamp: new Date(),
          chatContext: preservedContext, // Use the updated context
          preferences: currentDish.preferences
        };
        
        // Set the dish immediately
        setCurrentDish(newDish);
        setIsGeneratingDish(false);
        setIsGeneratingImage(true);
        
        // Generate image for the new dish
        const imagePrompt = `${newDish.title}. ${newDish.description}`;
        console.log('RegenerateDishWithContext: Starting image generation with prompt:', imagePrompt);
        
        // Set a timeout to prevent infinite loading
        const imageTimeout = setTimeout(() => {
          console.warn('RegenerateDishWithContext: Image generation timeout, stopping loading');
          setIsGeneratingImage(false);
        }, 30000); // 30 second timeout
        
        generateImageAPI(imagePrompt)
          .then(generatedImage => {
            clearTimeout(imageTimeout);
            console.log('RegenerateDishWithContext: Image generation completed, result:', generatedImage);
            if (generatedImage && generatedImage.trim()) {
              setCurrentDish(prev => prev ? { ...prev, image: generatedImage.trim() } : null);
              console.log('RegenerateDishWithContext: Image set successfully');
            } else {
              console.warn('RegenerateDishWithContext: No image generated, keeping empty image');
            }
            setIsGeneratingImage(false);
          })
          .catch(imgErr => {
            clearTimeout(imageTimeout);
            console.error('RegenerateDishWithContext: Image generation failed:', imgErr);
            console.error('RegenerateDishWithContext: Error details:', imgErr.message);
            // Set a fallback image or keep empty
            setCurrentDish(prev => prev ? { ...prev, image: '' } : null);
            setIsGeneratingImage(false);
          });
      } catch (error) {
        console.error('RegenerateDishWithContext: Backend dish generation failed:', error);
        setIsGeneratingDish(false);
        setIsGeneratingImage(false);
        setImageError('Failed to generate dish. Please try again.');
      }
    } else {
      // Fallback to regular generateDish with current preferences
      console.log('No preserved context, using regular generateDish');
      await generateDish();
    }
  };

  const generateDish = async (preferencesOverride?: Partial<Preferences>): Promise<void> => {
    setImageError(null);
    setIsGeneratingDish(true);
    // Clear current dish to prevent flash of old image
    setCurrentDish(null);
    try {
      console.log('generateDish called with preferencesOverride:', preferencesOverride);
      console.log('generateDish - current preferences from context:', preferences);
      console.log('generateDish - conversation context:', conversationContext);
      
      // Create enhanced preferences that include conversation context
      const enhancedPreferences = {
        ...preferences,
        ...preferencesOverride,
        // Add wanted ingredients from conversation context
        wantedIngredients: conversationContext.preferences
          .filter(p => p.type === 'ingredient')
          .map(p => p.value),
        // Add style preferences from conversation context
        wantedStyles: conversationContext.preferences
          .filter(p => p.type === 'style')
          .map(p => p.value),
        // Add dish type preferences from conversation context
        wantedDishTypes: conversationContext.preferences
          .filter(p => p.type === 'dishType')
          .map(p => p.value),
        // Add classic dish references from conversation context
        wantedClassicDishes: conversationContext.preferences
          .filter(p => p.type === 'classicDish')
          .map(p => p.value),
        // Add dietary preferences from conversation context
        wantedDietary: conversationContext.preferences
          .filter(p => p.type === 'dietary')
          .map(p => p.value)
      };
      
      console.log('generateDish - enhanced preferences:', enhancedPreferences);
      console.log('Calling backend for dish generation', enhancedPreferences);
      
      // If all preferences are empty, send an empty object or special flag for random dish
      const isAllEmpty =
        (!enhancedPreferences.dietaryRestrictions || enhancedPreferences.dietaryRestrictions.length === 0) &&
        (!enhancedPreferences.cuisines || enhancedPreferences.cuisines.length === 0) &&
        (!enhancedPreferences.classicDishes || enhancedPreferences.classicDishes.length === 0) &&
        (!enhancedPreferences.plateStyles || enhancedPreferences.plateStyles.length === 0) &&
        (!enhancedPreferences.ingredientPreferences || enhancedPreferences.ingredientPreferences.length === 0) &&
        (!enhancedPreferences.wantedIngredients || enhancedPreferences.wantedIngredients.length === 0) &&
        (!enhancedPreferences.wantedStyles || enhancedPreferences.wantedStyles.length === 0) &&
        (!enhancedPreferences.wantedDishTypes || enhancedPreferences.wantedDishTypes.length === 0) &&
        (!enhancedPreferences.wantedClassicDishes || enhancedPreferences.wantedClassicDishes.length === 0) &&
        (!enhancedPreferences.wantedDietary || enhancedPreferences.wantedDietary.length === 0);
      
      console.log('generateDish - isAllEmpty:', isAllEmpty);
      const backendPrefs = isAllEmpty ? { random: true } : enhancedPreferences;
      console.log('generateDish - backendPrefs:', backendPrefs);
      const dishData = await generateDishAPI(backendPrefs);
      console.log('Backend response:', dishData);
      let parsed = dishData;
      if (typeof dishData === 'string') {
        // Detect backend error message strings
        const errorPatterns = [
          /^I'm sorry/i,
          /^Sorry/i,
          /^Could you please provide/i,
          /^It seems like/i,
          /^It looks like/i,
        ];
        if (errorPatterns.some((pat) => pat.test(dishData.trim()))) {
          setImageError("🥲 Emm... I guess cooking is postponed by a bit, try again soon.");
          return;
        }
        parsed = parseDishString(dishData);
      }
      // Create the dish immediately with a loading state
      const newDish: Dish = {
        id: Date.now().toString(),
        image: '', // Start with empty image to show loading state
        title: parsed.title || 'Generated Dish',
        description: parsed.description || 'A delicious dish generated just for you.',
        recipe: parsed.recipe || { ingredients: [], instructions: [], nutrition: {} },
        timestamp: new Date(),
        preferences: enhancedPreferences, // Store the preferences used to create this dish
        chatContext: conversationContext.preferences.length > 0 ? 
          conversationContext.preferences.map(p => `${p.type}: ${p.value}`).join(', ') : undefined,
      };
      
      // Show the dish immediately but don't save to history until image generation succeeds
      setCurrentDish(newDish);
      console.log('Dish generation complete, setting isGeneratingDish to false');
      setIsGeneratingDish(false); // Dish generation is complete, now only image generation
      console.log('Starting image generation, setting isGeneratingImage to true');
      setIsGeneratingImage(true);
      
      // Generate image in the background (don't block the UI)
      const imagePrompt = parsed.title + '. ' + parsed.description;
      console.log('Starting image generation for:', imagePrompt);
      console.log('DishContext: Starting image generation promise...');
      
      // No timeout - let image generation complete naturally
      
      generateImageAPI(imagePrompt)
        .then(generatedImage => {
          if (generatedImage && generatedImage.trim()) {
            setCurrentDish(prev => prev ? { ...prev, image: generatedImage.trim() } : null);
          }
          setIsGeneratingImage(false);
        })
        .catch(imgErr => {
          console.error('DishContext: Image generation failed:', imgErr);
          setIsGeneratingImage(false);
        });
    } catch (error: any) {
      console.error('Error generating dish:', error);
      setImageError(error?.message || 'Unknown error generating dish');
      // Don't create a fallback dish - let the error screen handle it
      setCurrentDish(null);
      setIsGeneratingDish(false);
    }
  };

  const generateSpecificDish = async (dishName: string, chatContext?: string, preferencesOverride?: Partial<Preferences>, skipImageGeneration: boolean = false): Promise<void> => {
    setImageError(null);
    setIsGeneratingSpecificDish(true);
    // Clear current dish to prevent flash of old image
    setCurrentDish(null);
    try {
      console.log('Generating specific dish:', dishName, 'with context:', chatContext);
      
      // Check if the requested dish conflicts with current preferences
      const currentPrefs = preferencesOverride || preferences;
      if (hasPreferences() && currentPrefs.dietaryRestrictions.length > 0) {
        const dishLower = dishName.toLowerCase();
        const conflicts = [];
        
        if (currentPrefs.dietaryRestrictions.includes('Vegan') && 
            dishLower.match(/meat|chicken|beef|fish|dairy|cheese|eggs|milk/)) {
          conflicts.push('vegan');
        }
        if (currentPrefs.dietaryRestrictions.includes('Vegetarian') && 
            dishLower.match(/meat|chicken|beef|fish|pork/)) {
          conflicts.push('vegetarian');
        }
        if (currentPrefs.dietaryRestrictions.includes('Gluten-Free') && 
            dishLower.match(/pasta|bread|flour|wheat|gluten/)) {
          conflicts.push('gluten-free');
        }
        
        if (conflicts.length > 0) {
          const conflict = conflicts[0];
          const suggestion = conflict === 'vegan' ? 'plant-based alternatives' :
                           conflict === 'vegetarian' ? 'vegetarian alternatives' :
                           'gluten-free alternatives';
          setImageError(`😅 Emm... that dish doesn't fit your ${conflict} preferences. Try asking for ${suggestion} instead.`);
          return;
        }
      }
      
      // Parse the dish details from chat context if available
      let title = dishName;
      let description = `A delicious ${dishName} recipe`;
      
      if (chatContext) {
        // Try to extract more details from the chat context
        const contextLower = chatContext.toLowerCase();
        
        // Look for specific details mentioned in the chat
        const details = [];
        if (contextLower.includes('creamy')) details.push('creamy');
        if (contextLower.includes('spicy')) details.push('spicy');
        if (contextLower.includes('fresh')) details.push('fresh');
        if (contextLower.includes('traditional')) details.push('traditional');
        if (contextLower.includes('modern')) details.push('modern');
        if (contextLower.includes('authentic')) details.push('authentic');
        if (contextLower.includes('homemade')) details.push('homemade');
        if (contextLower.includes('gourmet')) details.push('gourmet');
        
        // Look for specific ingredients mentioned
        const ingredients = [];
        if (contextLower.includes('pancetta')) ingredients.push('pancetta');
        if (contextLower.includes('parmesan')) ingredients.push('parmesan');
        if (contextLower.includes('black pepper')) ingredients.push('black pepper');
        if (contextLower.includes('basil')) ingredients.push('basil');
        if (contextLower.includes('garlic')) ingredients.push('garlic');
        if (contextLower.includes('olive oil')) ingredients.push('olive oil');
        if (contextLower.includes('tomato')) ingredients.push('tomato');
        if (contextLower.includes('mushroom')) ingredients.push('mushroom');
        if (contextLower.includes('chicken')) ingredients.push('chicken');
        if (contextLower.includes('seafood')) ingredients.push('seafood');
        
        // Build a richer description
        if (details.length > 0 || ingredients.length > 0) {
          const detailText = details.length > 0 ? details.join(', ') : '';
          const ingredientText = ingredients.length > 0 ? ` with ${ingredients.join(', ')}` : '';
          description = `A ${detailText} ${dishName}${ingredientText}`;
        }
      }
      
      // Generate the dish using the backend API with preferences
      console.log('generateSpecificDish: Calling backend with preferences:', preferencesOverride || preferences);
      const prefs = preferencesOverride || preferences;
      const isAllEmpty =
        (!prefs.dietaryRestrictions || prefs.dietaryRestrictions.length === 0) &&
        (!prefs.cuisines || prefs.cuisines.length === 0) &&
        (!prefs.classicDishes || prefs.classicDishes.length === 0) &&
        (!prefs.plateStyles || prefs.plateStyles.length === 0) &&
        (!prefs.ingredientPreferences || prefs.ingredientPreferences.length === 0);
      
      const backendPrefs = isAllEmpty ? { random: true } : prefs;
      
      // Add the specific dish request to the preferences
      const enhancedPrefs = {
        ...backendPrefs,
        specificDish: dishName,
        chatContext: chatContext || undefined
      };
      
      const dishData = await generateDishAPI(enhancedPrefs);
      console.log('generateSpecificDish: Backend response:', dishData);
      
      let parsed = dishData;
      if (typeof dishData === 'string') {
        // Detect backend error message strings
        const errorPatterns = [
          /^I'm sorry/i,
          /^Sorry/i,
          /^Could you please provide/i,
          /^It seems like/i,
          /^It looks like/i,
        ];
        if (errorPatterns.some((pat) => pat.test(dishData.trim()))) {
          setImageError("🥲 Emm... I guess cooking is postponed by a bit, try again soon.");
          return;
        }
        parsed = parseDishString(dishData);
      }
      
      // Create a dish object with the backend response
      const newDish: Dish = {
        id: Date.now().toString(),
        image: '', // Start with empty image to show loading state
        title: parsed.title || title.charAt(0).toUpperCase() + title.slice(1),
        description: parsed.description || description,
        recipe: parsed.recipe || { ingredients: [], instructions: [], nutrition: {} },
        timestamp: new Date(),
        chatContext: chatContext, // Store the original chat context
        preferences: preferencesOverride || preferences, // Store the preferences used
      };
      
      // Set the dish immediately but don't save to history until image generation succeeds
      setCurrentDish(newDish);
      
      if (skipImageGeneration) {
        console.log('DishContext: Skipping image generation for generateSpecificDish');
        // Save to history immediately without image
        setDishHistory(historyPrev => {
          const newHistory = [newDish, ...historyPrev.slice(1)]; // Replace the first item
          // Save to storage in background
          saveDishHistoryToFirestore(newHistory);
          saveDishHistoryToLocalStorage(newHistory);
          return newHistory;
        });
        return;
      }
      
      setIsGeneratingImage(true);
      
      // Generate image in the background (don't block the UI)
      const imagePrompt = chatContext ? `${chatContext}. A beautiful food photograph` : `${dishName}. A beautiful food photograph`;
      generateImageAPI(imagePrompt)
        .then(generatedImage => {
          if (generatedImage && generatedImage.trim()) {
            // Update the dish with the generated image and save to history
            setCurrentDish(prev => {
              if (prev) {
                const updatedDish = { ...prev, image: generatedImage.trim() };
                
                // Extract and add context from the original chat context AFTER dish is created
                if (chatContext) {
                  console.log('DishContext: Extracting context from chat context after dish creation:', chatContext);
                  // Preprocess text to handle contractions like "let's" -> "lets"
                  const preprocessedText = chatContext.toLowerCase()
                    .replace(/let's/g, 'lets')
                    .replace(/don't/g, 'dont')
                    .replace(/can't/g, 'cant')
                    .replace(/won't/g, 'wont')
                    .replace(/it's/g, 'its')
                    .replace(/that's/g, 'thats')
                    .replace(/what's/g, 'whats')
                    .replace(/how's/g, 'hows')
                    .replace(/where's/g, 'wheres')
                    .replace(/when's/g, 'whens')
                    .replace(/why's/g, 'whys')
                    .replace(/who's/g, 'whos');
                  const words = preprocessedText.split(/\s+/);
                  console.log('DishContext: All words from chat context:', words);
                  const meaningfulWords = words.filter(word => 
                    word.length > 2 && 
                    !['the', 'in', 'with', 'and', 'or', 'a', 'an', 'to', 'for', 'of', 'on', 'at', 'by', 'style', 'make', 'want', 'about', 'some', 'that', 'this', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'let', 'lets', 'let\'s', 's'].includes(word)
                  );
                  
                  console.log('DishContext: Extracted meaningful words after dish creation:', meaningfulWords);
                  
                  // Clear existing userWord context and add all meaningful words at once
                  const existingContext = conversationContext.preferences.filter(pref => pref.type !== 'userWord');
                  const userWordContexts = meaningfulWords.map(word => {
                    let displayWord = word;
                    if (word === 'tamales') displayWord = 'tamale';
                    if (word === 'tomatoes') displayWord = 'tomato';
                    if (word === 'cheeses') displayWord = 'cheese';
                    if (word === 'pizzas') displayWord = 'pizza';
                    if (word === 'soups') displayWord = 'soup';
                    
                    return {
                      type: 'userWord' as const,
                      value: displayWord,
                      timestamp: new Date()
                    };
                  });
                  
                  const finalContext = [...existingContext, ...userWordContexts];
                  console.log('DishContext: Final context after dish creation:', finalContext);
                  updateConversationContext({
                    preferences: finalContext
                  });
                }
                
                // Save to history now that we have the complete dish with image
                setDishHistory(historyPrev => {
                  const newHistory = [updatedDish, ...historyPrev.slice(1)]; // Replace the first item
                  // Save to storage in background
                  saveDishHistoryToFirestore(newHistory);
                  saveDishHistoryToLocalStorage(newHistory);
                  return newHistory;
                });
                
                return updatedDish;
              }
              return prev;
            });
          } else {
            // Remove the dish from current state and trigger general error handling
            setCurrentDish(null);
            setImageError('Image generation failed: Empty or invalid image');
          }
        })
        .catch(imgErr => {
          console.error('Image generation failed:', imgErr);
          // Remove the dish from current state and trigger general error handling
          setCurrentDish(null);
          setImageError(imgErr?.message || 'Image generation failed');
          setIsGeneratingImage(false);
        })
        .finally(() => {
          setIsGeneratingImage(false);
        });
      
    } catch (error: any) {
      console.error('Error generating specific dish:', error);
      setImageError(error?.message || 'Unknown error generating dish');
      // Don't create a fallback dish - let the error screen handle it
      setCurrentDish(null);
    } finally {
      setIsGeneratingSpecificDish(false);
    }
  };

  const updateRecipe = (recipeChanges: Partial<Dish['recipe']>) => {
    setCurrentDish(prev => {
      if (!prev) return prev;
      const updatedDish = {
        ...prev,
        recipe: {
          ...prev.recipe,
          ...recipeChanges,
        },
      };
      
      // Update the dish in history as well
      setDishHistory(historyPrev => {
        const updatedHistory = historyPrev.map(dish => 
          dish.id === prev.id ? updatedDish : dish
        );
        return updatedHistory;
      });
      
      return updatedDish;
    });
  };

  const addChatMessage = (text, isUser) => {
    setChatMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        text,
        isUser,
        timestamp: new Date(),
      }
    ]);
  };

  const updatePreferences = (newPreferences: Partial<Preferences>) => {
    console.log('updatePreferences called with:', newPreferences);
    console.log('updatePreferences - current preferences before update:', preferences);
    
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      console.log('updatePreferences - updated preferences:', updated);
      console.log('updatePreferences - hasPreferences after update:', 
        updated.dietaryRestrictions.length > 0 || 
        updated.cuisines.length > 0 || 
        updated.classicDishes.length > 0 ||
        updated.plateStyles.length > 0 ||
        updated.ingredientPreferences.length > 0
      );
      
      // Update conversation context to reflect preference changes
      const newContextItems = [];
      
      // Add dietary restrictions
      if (newPreferences.dietaryRestrictions) {
        newPreferences.dietaryRestrictions.forEach(diet => {
          newContextItems.push({
            type: 'dietary' as const,
            value: diet,
            timestamp: new Date()
          });
        });
      }
      
      // Add cuisines
      if (newPreferences.cuisines) {
        newPreferences.cuisines.forEach(cuisine => {
          newContextItems.push({
            type: 'cuisine' as const,
            value: cuisine,
            timestamp: new Date()
          });
        });
      }
      
      // Add classic dishes
      if (newPreferences.classicDishes) {
        newPreferences.classicDishes.forEach(dish => {
          newContextItems.push({
            type: 'classicDish' as const,
            value: dish,
            timestamp: new Date()
          });
        });
      }
      
      // Add plate styles
      if (newPreferences.plateStyles) {
        newPreferences.plateStyles.forEach(style => {
          newContextItems.push({
            type: 'style' as const,
            value: style,
            timestamp: new Date()
          });
        });
      }
      
      // Add ingredient preferences
      if (newPreferences.ingredientPreferences) {
        newPreferences.ingredientPreferences.forEach(ingredient => {
          newContextItems.push({
            type: 'ingredient' as const,
            value: ingredient,
            timestamp: new Date()
          });
        });
      }
      
      // Update conversation context while preserving existing context
      console.log('updatePreferences: Adding new context items:', newContextItems);
      
      // Preserve all existing context types that are not being updated
      const existingContext = conversationContext.preferences.filter(pref => {
        // Keep userWord context
        if (pref.type === 'userWord') return true;
        
        // Keep other context types that are not being updated
        const isBeingUpdated = newContextItems.some(newItem => newItem.type === pref.type && newItem.value === pref.value);
        return !isBeingUpdated;
      });
      
      // Only add new items that don't already exist in the conversation context
      const newItemsToAdd = newContextItems.filter(newItem => 
        !conversationContext.preferences.some(existing => 
          existing.type === newItem.type && existing.value === newItem.value
        )
      );
      
      const updatedContext = [...existingContext, ...newItemsToAdd];
      console.log('updatePreferences: New items to add:', newItemsToAdd);
      console.log('updatePreferences: Updated conversation context:', updatedContext);
      updateConversationContext({
        preferences: updatedContext
      });
      
      return updated;
    });
  };

  // Function to update preferences without updating conversation context
  const updatePreferencesOnly = (newPreferences: Partial<Preferences>) => {
    console.log('updatePreferencesOnly called with:', newPreferences);
    console.log('updatePreferencesOnly - current preferences before update:', preferences);
    
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      console.log('updatePreferencesOnly - updated preferences:', updated);
      return updated;
    });
  };

  const saveDishToHistory = (dish: Dish) => {
    setDishHistory(prev => {
      const newHistory = [dish, ...prev];
      // Save to Firestore in background
      saveDishHistoryToFirestore(newHistory);
      // Also save to local storage as backup
      saveDishHistoryToLocalStorage(newHistory);
      return newHistory;
    });
  };

  // Save dish history to local storage as backup
  const saveDishHistoryToLocalStorage = async (history: Dish[]) => {
    try {
      const historyData = history.map(dish => ({
        ...dish,
        timestamp: dish.timestamp.toISOString() // Convert Date to string for storage
      }));
      await AsyncStorage.setItem('dishHistory', JSON.stringify(historyData));
      console.log('Saved dish history to local storage');
    } catch (error) {
      console.log('Error saving to local storage:', error);
    }
  };

  // Public function to save current dish history to local storage
  const saveCurrentDishHistoryToLocalStorage = async () => {
    await saveDishHistoryToLocalStorage(dishHistory);
  };

  // Load dish history from local storage
  const loadDishHistoryFromLocalStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem('dishHistory');
      if (stored) {
        const historyData = JSON.parse(stored);
        const history = historyData.map((dish: any) => ({
          ...dish,
          timestamp: new Date(dish.timestamp) // Convert string back to Date
        }));
        console.log('Loaded dish history from local storage:', history.length, 'dishes');
        return history;
      }
    } catch (error) {
      console.log('Error loading from local storage:', error);
    }
    return [];
  };

  // Save dish history to Firestore
  const saveDishHistoryToFirestore = async (history: Dish[]) => {
    if (!user) {
      console.log('No user, cannot save dish history');
      return;
    }
    
    console.log('Saving dish history to Firestore for user:', user.uid);
    console.log('History to save:', history.length, 'dishes');
    
    try {
      // Check network connectivity first
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        console.log('No network connection, skipping Firestore save');
        return;
      }
      
      const historyData = history.map(dish => ({
        ...dish,
        timestamp: dish.timestamp.toISOString() // Convert Date to string for Firestore
      }));
      
      console.log('Processed history data:', historyData);
      
      await setDoc(doc(db, 'users', user.uid), {
        dishHistory: historyData
      }, { merge: true });
      
      console.log('Successfully saved dish history to Firestore');
    } catch (error) {
      console.log('Error saving dish history (this is normal if offline):', error.message);
      // Don't throw error, just continue
    }
  };

  // Load dish history from Firestore
  const loadDishHistoryFromFirestore = async () => {
    if (!user) {
      console.log('No user, cannot load dish history');
      return;
    }
    
    console.log('Loading dish history from Firestore for user:', user.uid);
    console.log('User object:', { uid: user.uid, email: user.email });
    setIsLoadingHistory(true);
    
    try {
      // Check network connectivity first
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        console.log('No network connection, skipping Firestore load');
        setIsLoadingHistory(false);
        return;
      }
      
      // Add timeout to prevent long waits
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 10000)
      );
      
      const fetchPromise = getDoc(doc(db, 'users', user.uid));
      const userDoc = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('User document data:', data);
        
        if (data.dishHistory) {
          console.log('Found dish history in Firestore:', data.dishHistory.length, 'dishes');
          const history = data.dishHistory.map((dish: any) => ({
            ...dish,
            timestamp: new Date(dish.timestamp) // Convert string back to Date
          }));
          console.log('Processed history:', history);
          setDishHistory(history);
        } else {
          console.log('No dish history found in user document');
          setDishHistory([]); // Explicitly set empty array
        }
      } else {
        console.log('User document does not exist');
        setDishHistory([]); // Explicitly set empty array
      }
      
      // Only set loading to false if we successfully completed the operation
      setIsLoadingHistory(false);
    } catch (error) {
      console.log('Error loading dish history from Firestore (this is normal if offline):', error.message);
      console.log('Full error object:', error);
      console.log('Error stack:', error.stack);
      
      // Try to load from local storage as fallback
      console.log('Trying to load from local storage as fallback...');
      try {
        const localHistory = await loadDishHistoryFromLocalStorage();
        if (localHistory.length > 0) {
          console.log('Successfully loaded dish history from local storage');
          setDishHistory(localHistory);
        } else {
          console.log('No dish history found in local storage either');
          setDishHistory([]);
        }
      } catch (localError) {
        console.log('Error loading from local storage:', localError);
        setDishHistory([]);
      }
      
      // Set loading to false so user doesn't see endless loading
      setIsLoadingHistory(false);
    }
  };

  // Load dish history when user changes
  useEffect(() => {
    console.log('User changed, loading dish history. User:', user ? user.uid : 'None');
    if (user) {
      loadDishHistoryFromFirestore();
      
      // Fallback: clear loading state after 10 seconds if it gets stuck
      const fallbackTimeout = setTimeout(() => {
        console.log('Fallback: clearing loading state after timeout');
        setIsLoadingHistory(false);
      }, 10000);
      
      return () => clearTimeout(fallbackTimeout);
    } else {
      console.log('No user, clearing dish history');
      // Clear history when no user
      setDishHistory([]);
      setIsLoadingHistory(false);
    }
  }, [user]);

  // Simple image generation when dish is set with empty image
  useEffect(() => {
    // Only generate image if:
    // 1. We have a current dish
    // 2. The dish has no image (empty string or null/undefined)
    // 3. We're not already generating an image
    // 4. The dish has a title and description (basic validation)
    // 5. Add a small delay to prevent rapid-fire requests
    if (currentDish && 
        (!currentDish.image || currentDish.image.trim() === '') && 
        !isGeneratingImage &&
        currentDish.title && 
        currentDish.description) {
      console.log('DishContext: Auto-generating image for dish:', currentDish.title);
      console.log('DishContext: Starting image generation at:', new Date().toISOString());
      console.log('DishContext: Current dish image state:', currentDish.image);
      
      // Add a small delay to prevent rapid-fire requests
      const generateImageWithDelay = async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        
        // Double-check conditions after delay
        if (!currentDish || currentDish.image || isGeneratingImage) {
          console.log('DishContext: Skipping image generation after delay - conditions changed');
          return;
        }
        
        setIsGeneratingImage(true);
        
        const imagePrompt = `${currentDish.title}. ${currentDish.description}`;
        
        // Set a timeout to prevent infinite loading
        const imageTimeout = setTimeout(() => {
          console.warn('DishContext: Auto-image generation timeout, stopping loading');
          setIsGeneratingImage(false);
        }, 30000); // 30 second timeout
      
        generateImageAPI(imagePrompt)
        .then(generatedImage => {
          clearTimeout(imageTimeout);
          console.log('DishContext: Image generation completed at:', new Date().toISOString());
          console.log('DishContext: Generated image URL:', generatedImage);
          if (generatedImage && generatedImage.trim()) {
            // Prefetch the image for better performance
            Image.prefetch(generatedImage.trim()).catch(err => {
              console.warn('DishContext: Image prefetch failed:', err);
              // Continue anyway - prefetch failure shouldn't block the flow
            });
            
            setCurrentDish(prev => prev ? { ...prev, image: generatedImage.trim() } : null);
            // Keep isGeneratingImage true until image is actually loaded in UI
            // It will be set to false when the image loads in DishScreen
          } else {
            console.warn('DishContext: No image generated, stopping loading');
            setIsGeneratingImage(false);
          }
        })
        .catch(imgErr => {
          clearTimeout(imageTimeout);
          console.error('DishContext: Auto-image generation failed at:', new Date().toISOString());
          console.error('DishContext: Error details:', imgErr);
          setIsGeneratingImage(false);
        });
      };
      
      // Call the async function
      generateImageWithDelay();
    } else {
      console.log('DishContext: Skipping auto-image generation:', {
        hasCurrentDish: !!currentDish,
        hasImage: !!currentDish?.image,
        imageValue: currentDish?.image,
        isGeneratingImage,
        hasTitle: !!currentDish?.title,
        hasDescription: !!currentDish?.description
      });
    }
  }, [currentDish?.id]);

  const loadDishFromHistory = async (dishId: string) => {
    const dish = dishHistory.find(d => d.id === dishId);
    if (dish) {
      console.log('Loading dish from history:', dish.title);
      
      // Set the current dish
      setCurrentDish(dish);
      
      // Restore the preferences that were used to create this dish
      if (dish.preferences) {
        console.log('Restoring preferences from history:', dish.preferences);
        updatePreferences(dish.preferences);
      }
      
      // Check if the dish has a valid recipe with ingredients
      const hasValidRecipe = dish.recipe && 
                            dish.recipe.ingredients && 
                            Array.isArray(dish.recipe.ingredients) && 
                            dish.recipe.ingredients.length > 0;
      
      if (!hasValidRecipe) {
        console.log('Dish has no valid recipe, automatically cooking dish...');
        await cookDish(dish.title);
        console.log('Recipe generation completed for history dish');
      } else {
        console.log('Dish already has complete recipe, no need to regenerate');
      }
    }
  };

  const generateRecipeInfo = async (dishTitle: string): Promise<void> => {
    try {
      console.log('Generating recipe info for:', dishTitle);
      const recipe = await getRecipeInfoAPI(dishTitle);
      console.log('Recipe info received:', recipe);
      
      setCurrentDish(prev => {
        if (!prev) return prev;
        const updatedDish = { ...prev, recipe };
        
        // Update the dish in history as well
        setDishHistory(historyPrev => {
          const updatedHistory = historyPrev.map(dish => 
            dish.id === prev.id ? updatedDish : dish
          );
          return updatedHistory;
        });
        
        return updatedDish;
      });
    } catch (error) {
      console.error('Error generating recipe info for dish:', error);
      // Provide a fallback recipe structure
      const fallbackRecipe = {
        ingredients: ["ingredient 1", "ingredient 2", "ingredient 3"],
        instructions: ["Step 1: Prepare ingredients", "Step 2: Cook according to taste", "Step 3: Serve hot"],
        nutrition: {
          calories: 300,
          protein: 25,
          carbs: 30,
          fat: 12,
          fiber: 5,
          sugar: 8,
          sodium: 400
        },
        estimated_time: "30 minutes",
        description: `A delicious ${dishTitle} recipe`
      };
      
      setCurrentDish(prev => {
        if (!prev) return prev;
        const updatedDish = { ...prev, recipe: fallbackRecipe };
        
        // Update the dish in history as well
        setDishHistory(historyPrev => {
          const updatedHistory = historyPrev.map(dish => 
            dish.id === prev.id ? updatedDish : dish
          );
          return updatedHistory;
        });
        
        return updatedDish;
      });
    }
  };

  const cookDish = async (dishTitle: string): Promise<void> => {
    try {
      console.log('Cooking dish:', dishTitle);
      setIsGeneratingRecipe(true);
      const recipe = await cookDishAPI(dishTitle);
      console.log('Cook dish recipe received:', recipe);
      
      setCurrentDish(prev => {
        if (!prev) return prev;
        const updatedDish = { ...prev, recipe };
        
        // Update the dish in history as well
        setDishHistory(historyPrev => {
          const updatedHistory = historyPrev.map(dish => 
            dish.id === prev.id ? updatedDish : dish
          );
          return updatedHistory;
        });
        
        return updatedDish;
      });
    } catch (error) {
      console.error('Error cooking dish:', error);
      // Provide a fallback recipe structure
      const fallbackRecipe = {
        ingredients: ["ingredient 1", "ingredient 2", "ingredient 3"],
        instructions: ["Step 1: Prepare ingredients", "Step 2: Cook according to taste", "Step 3: Serve hot"],
        nutrition: {
          calories: 300,
          protein: 25,
          carbs: 30,
          fat: 12,
          fiber: 5,
          sugar: 8,
          sodium: 400
        },
        estimated_time: "30 minutes",
        description: `A delicious ${dishTitle} recipe`
      };
      
      setCurrentDish(prev => {
        if (!prev) return prev;
        const updatedDish = { ...prev, recipe: fallbackRecipe };
        
        // Update the dish in history as well
        setDishHistory(historyPrev => {
          const updatedHistory = historyPrev.map(dish => 
            dish.id === prev.id ? updatedDish : dish
          );
          return updatedHistory;
        });
        
        return updatedDish;
      });
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const modifyRecipe = async (modification: string, dishToModify?: any) => {
    console.log('DishContext: modifyRecipe called with modification:', modification);
    console.log('DishContext: currentDish exists:', !!currentDish);
    console.log('DishContext: currentDish title:', currentDish?.title);
    console.log('DishContext: dishToModify provided:', !!dishToModify);
    console.log('DishContext: dishToModify title:', dishToModify?.title);
    
    setIsModifyingRecipe(true);
    try {
      const currentDishSnapshot = dishToModify || currentDish;
      if (!currentDishSnapshot) {
        console.log('DishContext: No current dish snapshot, returning undefined');
        return;
      }
      
      console.log('DishContext: Calling modifyRecipeAPI with dish:', currentDishSnapshot.title);
      const response = await modifyRecipeAPI(currentDishSnapshot, modification);
      console.log('DishContext: modifyRecipeAPI response:', response);
      
      const { recipe, isTransformative, transformationSummary, modificationSummary, newImageUrl, updatedDish: backendUpdatedDish } = response;
      
      let updatedDish;
      
      if (isTransformative) {
        // For transformative changes, use backend-provided updated dish info
        updatedDish = { 
          ...currentDishSnapshot, 
          title: backendUpdatedDish?.title || recipe.title || currentDishSnapshot.title,
          description: backendUpdatedDish?.description || recipe.description || currentDishSnapshot.description,
          recipe,
          image: newImageUrl || currentDishSnapshot.image // Use new image if provided
        };
      } else {
        // For minor modifications, use backend-provided updated dish info if available
        updatedDish = { 
          ...currentDishSnapshot, 
          title: backendUpdatedDish?.title || currentDishSnapshot.title,
          description: backendUpdatedDish?.description || currentDishSnapshot.description,
          recipe,
          image: newImageUrl || currentDishSnapshot.image // Use new image if provided
        };
      }
      
      // Create a new dish entry with a unique ID for the modification
      const modifiedDish: Dish = {
        ...updatedDish,
        id: Date.now().toString(), // Generate new ID for the modification
        timestamp: new Date(),
        modificationType: isTransformative ? 'transformative' : 'minor',
        originalDishId: currentDishSnapshot.id, // Keep reference to original dish
        preferences: currentDishSnapshot.preferences // Inherit preferences from original dish
      };
      
      setCurrentDish(modifiedDish);
      
      // If no new image was provided by the backend, generate one
      if (!newImageUrl && modifiedDish.image === currentDishSnapshot.image) {
        console.log('DishContext: No new image provided by backend, generating one...');
        setIsGeneratingImage(true);
        const imagePrompt = `${modifiedDish.title}. ${modifiedDish.description}`;
        
        // Set a timeout to prevent infinite loading
        const imageTimeout = setTimeout(() => {
          console.warn('DishContext: Image generation timeout for modified dish, stopping loading');
          setIsGeneratingImage(false);
        }, 30000); // 30 second timeout
        
        generateImageAPI(imagePrompt)
          .then(generatedImage => {
            clearTimeout(imageTimeout);
            console.log('DishContext: Generated image for modified dish:', generatedImage);
            if (generatedImage && generatedImage.trim()) {
              setCurrentDish(prev => prev ? { ...prev, image: generatedImage.trim() } : null);
            }
            setIsGeneratingImage(false);
          })
          .catch(imgErr => {
            clearTimeout(imageTimeout);
            console.error('DishContext: Image generation for modified dish failed:', imgErr);
            setIsGeneratingImage(false);
          });
      }
      
      // Add the modified dish as a new entry in history and save to storage
      setDishHistory(prev => {
        const newHistory = [modifiedDish, ...prev];
        // Save to storage in background
        saveDishHistoryToFirestore(newHistory);
        saveDishHistoryToLocalStorage(newHistory);
        return newHistory;
      });
      
      // Extract context from the modification and add to conversation context
      const modificationLower = modification.toLowerCase();
      
      // Check for style modifications (American, Mexican, Italian, etc.)
      if (modificationLower.includes('american') || modificationLower.includes('american style')) {
        addConversationPreference('style', 'American');
      } else if (modificationLower.includes('mexican') || modificationLower.includes('mexican style')) {
        addConversationPreference('style', 'Mexican');
      } else if (modificationLower.includes('italian') || modificationLower.includes('italian style')) {
        addConversationPreference('style', 'Italian');
      } else if (modificationLower.includes('asian') || modificationLower.includes('asian style')) {
        addConversationPreference('style', 'Asian');
      } else if (modificationLower.includes('indian') || modificationLower.includes('indian style')) {
        addConversationPreference('style', 'Indian');
      } else if (modificationLower.includes('french') || modificationLower.includes('french style')) {
        addConversationPreference('style', 'French');
      } else if (modificationLower.includes('mediterranean') || modificationLower.includes('mediterranean style')) {
        addConversationPreference('style', 'Mediterranean');
      } else if (modificationLower.includes('thai') || modificationLower.includes('thai style')) {
        addConversationPreference('style', 'Thai');
      } else if (modificationLower.includes('chinese') || modificationLower.includes('chinese style')) {
        addConversationPreference('style', 'Chinese');
      } else if (modificationLower.includes('japanese') || modificationLower.includes('japanese style')) {
        addConversationPreference('style', 'Japanese');
      } else if (modificationLower.includes('korean') || modificationLower.includes('korean style')) {
        addConversationPreference('style', 'Korean');
      } else if (modificationLower.includes('greek') || modificationLower.includes('greek style')) {
        addConversationPreference('style', 'Greek');
      } else if (modificationLower.includes('spanish') || modificationLower.includes('spanish style')) {
        addConversationPreference('style', 'Spanish');
      } else if (modificationLower.includes('middle eastern') || modificationLower.includes('middle eastern style')) {
        addConversationPreference('style', 'Middle Eastern');
      } else if (modificationLower.includes('caribbean') || modificationLower.includes('caribbean style')) {
        addConversationPreference('style', 'Caribbean');
      } else if (modificationLower.includes('southern') || modificationLower.includes('southern style')) {
        addConversationPreference('style', 'Southern');
      } else if (modificationLower.includes('cajun') || modificationLower.includes('cajun style')) {
        addConversationPreference('style', 'Cajun');
      } else if (modificationLower.includes('tex-mex') || modificationLower.includes('tex-mex style')) {
        addConversationPreference('style', 'Tex-Mex');
      } else if (modificationLower.includes('fusion') || modificationLower.includes('fusion style')) {
        addConversationPreference('style', 'Fusion');
      }
      
      // Check for cooking method modifications
      if (modificationLower.includes('grilled') || modificationLower.includes('grill')) {
        addConversationPreference('style', 'Grilled');
      } else if (modificationLower.includes('roasted') || modificationLower.includes('roast')) {
        addConversationPreference('style', 'Roasted');
      } else if (modificationLower.includes('fried') || modificationLower.includes('fry')) {
        addConversationPreference('style', 'Fried');
      } else if (modificationLower.includes('baked') || modificationLower.includes('bake')) {
        addConversationPreference('style', 'Baked');
      } else if (modificationLower.includes('steamed') || modificationLower.includes('steam')) {
        addConversationPreference('style', 'Steamed');
      } else if (modificationLower.includes('braised') || modificationLower.includes('braise')) {
        addConversationPreference('style', 'Braised');
      } else if (modificationLower.includes('sautéed') || modificationLower.includes('sauté') || modificationLower.includes('sauteed') || modificationLower.includes('saute')) {
        addConversationPreference('style', 'Sautéed');
      }
      
      // Check for dietary modifications
      if (modificationLower.includes('vegetarian') || modificationLower.includes('veggie')) {
        addConversationPreference('dietary', 'Vegetarian');
      } else if (modificationLower.includes('vegan')) {
        addConversationPreference('dietary', 'Vegan');
      } else if (modificationLower.includes('gluten-free') || modificationLower.includes('gluten free')) {
        addConversationPreference('dietary', 'Gluten-Free');
      } else if (modificationLower.includes('dairy-free') || modificationLower.includes('dairy free')) {
        addConversationPreference('dietary', 'Dairy-Free');
      } else if (modificationLower.includes('keto') || modificationLower.includes('ketogenic')) {
        addConversationPreference('dietary', 'Keto');
      } else if (modificationLower.includes('paleo')) {
        addConversationPreference('dietary', 'Paleo');
      } else if (modificationLower.includes('low-carb') || modificationLower.includes('low carb')) {
        addConversationPreference('dietary', 'Low-Carb');
      } else if (modificationLower.includes('low-fat') || modificationLower.includes('low fat')) {
        addConversationPreference('dietary', 'Low-Fat');
      } else if (modificationLower.includes('high-protein') || modificationLower.includes('high protein')) {
        addConversationPreference('dietary', 'High-Protein');
      }
      
      // Check for ingredient modifications
      if (modificationLower.includes('spicy') || modificationLower.includes('hot')) {
        addConversationPreference('ingredient', 'Spicy');
      } else if (modificationLower.includes('mild') || modificationLower.includes('not spicy')) {
        addConversationPreference('ingredient', 'Mild');
      } else if (modificationLower.includes('extra spicy') || modificationLower.includes('very spicy')) {
        addConversationPreference('ingredient', 'Extra Spicy');
      } else if (modificationLower.includes('cheese') || modificationLower.includes('cheesy')) {
        addConversationPreference('ingredient', 'Cheese');
      } else if (modificationLower.includes('garlic') || modificationLower.includes('garlicky')) {
        addConversationPreference('ingredient', 'Garlic');
      } else if (modificationLower.includes('herbs') || modificationLower.includes('herby')) {
        addConversationPreference('ingredient', 'Herbs');
      } else if (modificationLower.includes('citrus') || modificationLower.includes('lemon') || modificationLower.includes('lime')) {
        addConversationPreference('ingredient', 'Citrus');
      } else if (modificationLower.includes('nuts') || modificationLower.includes('nutty')) {
        addConversationPreference('ingredient', 'Nuts');
      } else if (modificationLower.includes('seafood') || modificationLower.includes('fish')) {
        addConversationPreference('ingredient', 'Seafood');
      } else if (modificationLower.includes('vegetables') || modificationLower.includes('veggies')) {
        addConversationPreference('ingredient', 'Vegetables');
      }
      
      // Check for dish type modifications
      if (modificationLower.includes('soup') || modificationLower.includes('soupy')) {
        addConversationPreference('dishType', 'Soup');
      } else if (modificationLower.includes('salad') || modificationLower.includes('salady')) {
        addConversationPreference('dishType', 'Salad');
      } else if (modificationLower.includes('sandwich') || modificationLower.includes('wrap')) {
        addConversationPreference('dishType', 'Sandwich');
      } else if (modificationLower.includes('pasta') || modificationLower.includes('noodles')) {
        addConversationPreference('dishType', 'Pasta');
      } else if (modificationLower.includes('rice') || modificationLower.includes('rice dish')) {
        addConversationPreference('dishType', 'Rice');
      } else if (modificationLower.includes('pizza') || modificationLower.includes('pizza style')) {
        addConversationPreference('dishType', 'Pizza');
      } else if (modificationLower.includes('burger') || modificationLower.includes('burger style')) {
        addConversationPreference('dishType', 'Burger');
      } else if (modificationLower.includes('taco') || modificationLower.includes('taco style')) {
        addConversationPreference('dishType', 'Taco');
      } else if (modificationLower.includes('bowl') || modificationLower.includes('bowl style')) {
        addConversationPreference('dishType', 'Bowl');
      } else if (modificationLower.includes('skillet') || modificationLower.includes('skillet style')) {
        addConversationPreference('dishType', 'Skillet');
      }
      
      // If no specific pattern matches, add the modification as a user word
      if (!modificationLower.includes('american') && !modificationLower.includes('mexican') && 
          !modificationLower.includes('italian') && !modificationLower.includes('asian') &&
          !modificationLower.includes('indian') && !modificationLower.includes('french') &&
          !modificationLower.includes('mediterranean') && !modificationLower.includes('thai') &&
          !modificationLower.includes('chinese') && !modificationLower.includes('japanese') &&
          !modificationLower.includes('korean') && !modificationLower.includes('greek') &&
          !modificationLower.includes('spanish') && !modificationLower.includes('middle eastern') &&
          !modificationLower.includes('caribbean') && !modificationLower.includes('southern') &&
          !modificationLower.includes('cajun') && !modificationLower.includes('tex-mex') &&
          !modificationLower.includes('fusion') && !modificationLower.includes('grilled') &&
          !modificationLower.includes('roasted') && !modificationLower.includes('fried') &&
          !modificationLower.includes('baked') && !modificationLower.includes('steamed') &&
          !modificationLower.includes('braised') && !modificationLower.includes('sautéed') &&
          !modificationLower.includes('sauteed') && !modificationLower.includes('vegetarian') &&
          !modificationLower.includes('vegan') && !modificationLower.includes('gluten-free') &&
          !modificationLower.includes('dairy-free') && !modificationLower.includes('keto') &&
          !modificationLower.includes('paleo') && !modificationLower.includes('low-carb') &&
          !modificationLower.includes('low-fat') && !modificationLower.includes('high-protein') &&
          !modificationLower.includes('spicy') && !modificationLower.includes('mild') &&
          !modificationLower.includes('cheese') && !modificationLower.includes('garlic') &&
          !modificationLower.includes('herbs') && !modificationLower.includes('citrus') &&
          !modificationLower.includes('nuts') && !modificationLower.includes('seafood') &&
          !modificationLower.includes('vegetables') && !modificationLower.includes('soup') &&
          !modificationLower.includes('salad') && !modificationLower.includes('sandwich') &&
          !modificationLower.includes('pasta') && !modificationLower.includes('rice') &&
          !modificationLower.includes('pizza') && !modificationLower.includes('burger') &&
          !modificationLower.includes('taco') && !modificationLower.includes('bowl') &&
          !modificationLower.includes('skillet')) {
        // Extract key words from the modification
        const words = modification.split(' ').filter(word => 
          word.length > 3 && 
          !['make', 'this', 'that', 'more', 'less', 'add', 'remove', 'change', 'modify', 'style', 'version'].includes(word.toLowerCase())
        );
        if (words.length > 0) {
          addConversationPreference('userWord', words[0]);
        }
      }
      
      // Return the summary for the chat
      return {
        isTransformative,
        summary: isTransformative ? transformationSummary : modificationSummary,
        updatedDish: modifiedDish // Return the modified dish data
      };
    } catch (error) {
      console.error('Error modifying recipe:', error);
      throw error;
    } finally {
      setIsModifyingRecipe(false);
    }
  };

  const finalizeDish = () => {
    if (currentDish) {
      // Save the current dish to history as final version
      setDishHistory(prev => {
        const existingIndex = prev.findIndex(dish => dish.id === currentDish.id);
        if (existingIndex >= 0) {
          // Update existing dish in history
          const updatedHistory = [...prev];
          updatedHistory[existingIndex] = currentDish;
          return updatedHistory;
        } else {
          // Add new dish to history
          return [currentDish, ...prev];
        }
      });
      setIsDishFinal(true);
    }
  };

  const clearPreferences = () => {
    console.log('clearPreferences called - clearing all preferences');
    console.log('clearPreferences - stack trace:', new Error().stack);
    setPreferences({
      dietaryRestrictions: [],
      cuisines: [],
      classicDishes: [],
      plateStyles: [],
      ingredientPreferences: [],
    });
    setIsDishFinal(false);
  };

  const clearChatMessages = () => {
    setChatMessages([]);
  };

  // Add a function to update chat context when dish is modified
  const updateChatContextForModifiedDish = (modifiedDish: any, modificationSummary: string) => {
    // Add a message to chat about the modification
    addChatMessage(`✨ ${modificationSummary}`, false);
    
    // Add a message indicating the dish has been updated
    addChatMessage(`Your dish has been updated to: "${modifiedDish.title}". You can now ask me to modify this new version!`, false);
  };

  // Function to update conversation context
  const updateConversationContext = (updates: Partial<ConversationContext>) => {
    setConversationContext(prev => ({ ...prev, ...updates }));
  };

  // Function to add a preference to conversation context
  const addConversationPreference = (type: 'dietary' | 'cuisine' | 'style' | 'ingredient' | 'dishType' | 'classicDish' | 'userWord', value: string) => {
    setConversationContext(prev => ({
      ...prev,
      preferences: [...prev.preferences, { type, value, timestamp: new Date() }]
    }));
  };

  // Function to remove a preference from conversation context
  const removeConversationPreference = (type: string, value: string) => {
    console.log('DishContext: removeConversationPreference called with type:', type, 'value:', value);
    console.log('DishContext: Current conversation context before removal:', conversationContext);
    console.log('DishContext: About to remove preference with exact match:', { type, value });
    
    setConversationContext(prev => {
      console.log('DishContext: Previous preferences:', prev.preferences);
      console.log('DishContext: Looking to remove:', { type, value });
      
      // Debug: Log each preference to see its structure
      prev.preferences.forEach((pref, index) => {
        console.log(`DishContext: Preference ${index}:`, pref);
        console.log(`DishContext: Comparing pref.type (${pref.type}) === type (${type}):`, pref.type === type);
        console.log(`DishContext: Comparing pref.value (${pref.value}) === value (${value}):`, pref.value === value);
        console.log(`DishContext: Should remove this preference:`, pref.type === type && pref.value === value);
      });
      
      const filteredPreferences = prev.preferences.filter(pref => !(pref.type === type && pref.value === value));
      console.log('DishContext: Previous preferences count:', prev.preferences.length);
      console.log('DishContext: Filtered preferences count:', filteredPreferences.length);
      console.log('DishContext: Removed preference:', { type, value });
      console.log('DishContext: Remaining preferences:', filteredPreferences);
      
      const newContext = {
        ...prev,
        preferences: filteredPreferences,
        lastUpdate: Date.now() // Force re-render
      };
      
      console.log('DishContext: New conversation context:', newContext);
      return newContext;
    });
    
    // Also update global preferences to keep them in sync
    console.log('DishContext: Updating global preferences to sync with conversation context removal');
    setPreferences(prev => {
      let updated = { ...prev };
      
      // Remove from the appropriate preference array based on type
      if (type === 'dietary') {
        updated.dietaryRestrictions = prev.dietaryRestrictions.filter(item => item !== value);
      } else if (type === 'cuisine') {
        updated.cuisines = prev.cuisines.filter(item => item !== value);
      } else if (type === 'classicDish') {
        updated.classicDishes = prev.classicDishes.filter(item => item !== value);
      } else if (type === 'style') {
        updated.plateStyles = prev.plateStyles.filter(item => item !== value);
      } else if (type === 'ingredient') {
        updated.ingredientPreferences = prev.ingredientPreferences.filter(item => item !== value);
      }
      
      console.log('DishContext: Updated global preferences after removal:', updated);
      return updated;
    });
  };

  // Function to clear conversation context
  const clearConversationContext = () => {
    setConversationContext({
      modifications: [],
      preferences: [],
      dishHistory: [],
    });
  };

  const clearImageError = () => {
    setImageError(null);
  };

  const clearImageGeneration = () => {
    setIsGeneratingImage(false);
  };

  const remixDish = async (userRequest: string, preferences?: Partial<Preferences>) => {
    console.log('DishContext: remixDish called with request:', userRequest);
    
    if (!currentDish) {
      console.log('DishContext: No current dish, returning undefined');
      return;
    }
    
    setIsModifyingRecipe(true);
    try {
      console.log('DishContext: Calling remixDishAPI');
      const response = await remixDishAPI(currentDish, userRequest, preferences);
      console.log('DishContext: remixDishAPI response:', response);
      
      const { recipe, remixSummary, newImageUrl, updatedDish: backendUpdatedDish } = response;
      
      const updatedDish = {
        ...currentDish,
        title: backendUpdatedDish?.title || recipe.title || currentDish.title,
        description: backendUpdatedDish?.description || recipe.description || currentDish.description,
        recipe,
        image: newImageUrl || currentDish.image
      };
      
      // Create a new dish entry with a unique ID for the remix
      const remixedDish: Dish = {
        ...updatedDish,
        id: Date.now().toString(), // Generate new ID for the remix
        timestamp: new Date(),
        modificationType: 'remix',
        originalDishId: currentDish.id, // Keep reference to original dish
        preferences: currentDish.preferences // Inherit preferences from original dish
      };
      
      setCurrentDish(remixedDish);
      
      // If no new image was provided by the backend, generate one
      if (!newImageUrl && remixedDish.image === currentDish.image) {
        console.log('DishContext: No new image provided by backend for remix, generating one...');
        setIsGeneratingImage(true);
        const imagePrompt = `${remixedDish.title}. ${remixedDish.description}`;
        
        // Set a timeout to prevent infinite loading
        const imageTimeout = setTimeout(() => {
          console.warn('DishContext: Image generation timeout for remixed dish, stopping loading');
          setIsGeneratingImage(false);
        }, 30000); // 30 second timeout
        
        generateImageAPI(imagePrompt)
          .then(generatedImage => {
            clearTimeout(imageTimeout);
            console.log('DishContext: Generated image for remixed dish:', generatedImage);
            if (generatedImage && generatedImage.trim()) {
              setCurrentDish(prev => prev ? { ...prev, image: generatedImage.trim() } : null);
            }
            setIsGeneratingImage(false);
          })
          .catch(imgErr => {
            clearTimeout(imageTimeout);
            console.error('DishContext: Image generation for remixed dish failed:', imgErr);
            setIsGeneratingImage(false);
          });
      }
      
      // Add the remixed dish as a new entry in history and save to storage
      setDishHistory(prev => {
        const newHistory = [remixedDish, ...prev];
        // Save to storage in background
        saveDishHistoryToFirestore(newHistory);
        saveDishHistoryToLocalStorage(newHistory);
        return newHistory;
      });
      
      // Extract context from the remix request and add to conversation context
      const requestLower = userRequest.toLowerCase();
      
      // Check for style modifications (American, Mexican, Italian, etc.)
      if (requestLower.includes('american') || requestLower.includes('american style')) {
        addConversationPreference('style', 'American');
      } else if (requestLower.includes('mexican') || requestLower.includes('mexican style')) {
        addConversationPreference('style', 'Mexican');
      } else if (requestLower.includes('italian') || requestLower.includes('italian style')) {
        addConversationPreference('style', 'Italian');
      } else if (requestLower.includes('asian') || requestLower.includes('asian style')) {
        addConversationPreference('style', 'Asian');
      } else if (requestLower.includes('indian') || requestLower.includes('indian style')) {
        addConversationPreference('style', 'Indian');
      } else if (requestLower.includes('french') || requestLower.includes('french style')) {
        addConversationPreference('style', 'French');
      } else if (requestLower.includes('mediterranean') || requestLower.includes('mediterranean style')) {
        addConversationPreference('style', 'Mediterranean');
      } else if (requestLower.includes('thai') || requestLower.includes('thai style')) {
        addConversationPreference('style', 'Thai');
      } else if (requestLower.includes('chinese') || requestLower.includes('chinese style')) {
        addConversationPreference('style', 'Chinese');
      } else if (requestLower.includes('japanese') || requestLower.includes('japanese style')) {
        addConversationPreference('style', 'Japanese');
      } else if (requestLower.includes('korean') || requestLower.includes('korean style')) {
        addConversationPreference('style', 'Korean');
      } else if (requestLower.includes('greek') || requestLower.includes('greek style')) {
        addConversationPreference('style', 'Greek');
      } else if (requestLower.includes('spanish') || requestLower.includes('spanish style')) {
        addConversationPreference('style', 'Spanish');
      } else if (requestLower.includes('middle eastern') || requestLower.includes('middle eastern style')) {
        addConversationPreference('style', 'Middle Eastern');
      } else if (requestLower.includes('caribbean') || requestLower.includes('caribbean style')) {
        addConversationPreference('style', 'Caribbean');
      } else if (requestLower.includes('southern') || requestLower.includes('southern style')) {
        addConversationPreference('style', 'Southern');
      } else if (requestLower.includes('cajun') || requestLower.includes('cajun style')) {
        addConversationPreference('style', 'Cajun');
      } else if (requestLower.includes('tex-mex') || requestLower.includes('tex-mex style')) {
        addConversationPreference('style', 'Tex-Mex');
      } else if (requestLower.includes('fusion') || requestLower.includes('fusion style')) {
        addConversationPreference('style', 'Fusion');
      }
      
      // Check for cooking method modifications
      if (requestLower.includes('grilled') || requestLower.includes('grill')) {
        addConversationPreference('style', 'Grilled');
      } else if (requestLower.includes('roasted') || requestLower.includes('roast')) {
        addConversationPreference('style', 'Roasted');
      } else if (requestLower.includes('fried') || requestLower.includes('fry')) {
        addConversationPreference('style', 'Fried');
      } else if (requestLower.includes('baked') || requestLower.includes('bake')) {
        addConversationPreference('style', 'Baked');
      } else if (requestLower.includes('steamed') || requestLower.includes('steam')) {
        addConversationPreference('style', 'Steamed');
      } else if (requestLower.includes('braised') || requestLower.includes('braise')) {
        addConversationPreference('style', 'Braised');
      } else if (requestLower.includes('sautéed') || requestLower.includes('sauté') || requestLower.includes('sauteed') || requestLower.includes('saute')) {
        addConversationPreference('style', 'Sautéed');
      }
      
      // Check for dietary modifications
      if (requestLower.includes('healthier') || requestLower.includes('healthy') || requestLower.includes('health')) {
        addConversationPreference('dietary', 'Healthy');
      } else if (requestLower.includes('vegetarian') || requestLower.includes('veggie')) {
        addConversationPreference('dietary', 'Vegetarian');
      } else if (requestLower.includes('vegan')) {
        addConversationPreference('dietary', 'Vegan');
      } else if (requestLower.includes('gluten-free') || requestLower.includes('gluten free')) {
        addConversationPreference('dietary', 'Gluten-Free');
      } else if (requestLower.includes('dairy-free') || requestLower.includes('dairy free')) {
        addConversationPreference('dietary', 'Dairy-Free');
      } else if (requestLower.includes('keto') || requestLower.includes('ketogenic')) {
        addConversationPreference('dietary', 'Keto');
      } else if (requestLower.includes('paleo')) {
        addConversationPreference('dietary', 'Paleo');
      } else if (requestLower.includes('low-carb') || requestLower.includes('low carb')) {
        addConversationPreference('dietary', 'Low-Carb');
      } else if (requestLower.includes('low-fat') || requestLower.includes('low fat')) {
        addConversationPreference('dietary', 'Low-Fat');
      } else if (requestLower.includes('high-protein') || requestLower.includes('high protein')) {
        addConversationPreference('dietary', 'High-Protein');
      }
      
      // Check for ingredient modifications
      if (requestLower.includes('spicy') || requestLower.includes('hot') || requestLower.includes('spice')) {
        addConversationPreference('ingredient', 'Spicy');
      } else if (requestLower.includes('mild') || requestLower.includes('not spicy')) {
        addConversationPreference('ingredient', 'Mild');
      } else if (requestLower.includes('extra spicy') || requestLower.includes('very spicy')) {
        addConversationPreference('ingredient', 'Extra Spicy');
      } else if (requestLower.includes('cheese') || requestLower.includes('cheesy')) {
        addConversationPreference('ingredient', 'Cheese');
      } else if (requestLower.includes('garlic') || requestLower.includes('garlicky')) {
        addConversationPreference('ingredient', 'Garlic');
      } else if (requestLower.includes('herbs') || requestLower.includes('herby')) {
        addConversationPreference('ingredient', 'Herbs');
      } else if (requestLower.includes('citrus') || requestLower.includes('lemon') || requestLower.includes('lime')) {
        addConversationPreference('ingredient', 'Citrus');
      } else if (requestLower.includes('nuts') || requestLower.includes('nutty')) {
        addConversationPreference('ingredient', 'Nuts');
      } else if (requestLower.includes('seafood') || requestLower.includes('fish')) {
        addConversationPreference('ingredient', 'Seafood');
      } else if (requestLower.includes('vegetables') || requestLower.includes('veggies')) {
        addConversationPreference('ingredient', 'Vegetables');
      }
      
      // Check for dish type modifications
      if (requestLower.includes('soup') || requestLower.includes('soupy')) {
        addConversationPreference('dishType', 'Soup');
      } else if (requestLower.includes('salad') || requestLower.includes('salady')) {
        addConversationPreference('dishType', 'Salad');
      } else if (requestLower.includes('sandwich') || requestLower.includes('wrap')) {
        addConversationPreference('dishType', 'Sandwich');
      } else if (requestLower.includes('pasta') || requestLower.includes('noodles')) {
        addConversationPreference('dishType', 'Pasta');
      } else if (requestLower.includes('rice') || requestLower.includes('rice dish')) {
        addConversationPreference('dishType', 'Rice');
      } else if (requestLower.includes('pizza') || requestLower.includes('pizza style')) {
        addConversationPreference('dishType', 'Pizza');
      } else if (requestLower.includes('burger') || requestLower.includes('burger style')) {
        addConversationPreference('dishType', 'Burger');
      } else if (requestLower.includes('taco') || requestLower.includes('taco style')) {
        addConversationPreference('dishType', 'Taco');
      } else if (requestLower.includes('bowl') || requestLower.includes('bowl style')) {
        addConversationPreference('dishType', 'Bowl');
      } else if (requestLower.includes('skillet') || requestLower.includes('skillet style')) {
        addConversationPreference('dishType', 'Skillet');
      }
      
      // If no specific pattern matches, add the request as a user word
      if (!requestLower.includes('american') && !requestLower.includes('mexican') && 
          !requestLower.includes('italian') && !requestLower.includes('asian') &&
          !requestLower.includes('indian') && !requestLower.includes('french') &&
          !requestLower.includes('mediterranean') && !requestLower.includes('thai') &&
          !requestLower.includes('chinese') && !requestLower.includes('japanese') &&
          !requestLower.includes('korean') && !requestLower.includes('greek') &&
          !requestLower.includes('spanish') && !requestLower.includes('middle eastern') &&
          !requestLower.includes('caribbean') && !requestLower.includes('southern') &&
          !requestLower.includes('cajun') && !requestLower.includes('tex-mex') &&
          !requestLower.includes('fusion') && !requestLower.includes('grilled') &&
          !requestLower.includes('roasted') && !requestLower.includes('fried') &&
          !requestLower.includes('baked') && !requestLower.includes('steamed') &&
          !requestLower.includes('braised') && !requestLower.includes('sautéed') &&
          !requestLower.includes('sauteed') && !requestLower.includes('healthier') &&
          !requestLower.includes('healthy') && !requestLower.includes('vegetarian') &&
          !requestLower.includes('vegan') && !requestLower.includes('gluten-free') &&
          !requestLower.includes('dairy-free') && !requestLower.includes('keto') &&
          !requestLower.includes('paleo') && !requestLower.includes('low-carb') &&
          !requestLower.includes('low-fat') && !requestLower.includes('high-protein') &&
          !requestLower.includes('spicy') && !requestLower.includes('mild') &&
          !requestLower.includes('cheese') && !requestLower.includes('garlic') &&
          !requestLower.includes('herbs') && !requestLower.includes('citrus') &&
          !requestLower.includes('nuts') && !requestLower.includes('seafood') &&
          !requestLower.includes('vegetables') && !requestLower.includes('soup') &&
          !requestLower.includes('salad') && !requestLower.includes('sandwich') &&
          !requestLower.includes('pasta') && !requestLower.includes('rice') &&
          !requestLower.includes('pizza') && !requestLower.includes('burger') &&
          !requestLower.includes('taco') && !requestLower.includes('bowl') &&
          !requestLower.includes('skillet')) {
        // Extract key words from the request
        const words = userRequest.split(' ').filter(word => 
          word.length > 3 && 
          !['make', 'this', 'that', 'more', 'less', 'add', 'remove', 'change', 'modify', 'style', 'version', 'remix', 'transform'].includes(word.toLowerCase())
        );
        if (words.length > 0) {
          addConversationPreference('userWord', words[0]);
        }
      }
      
      return {
        summary: remixSummary,
        updatedDish: remixedDish
      };
    } catch (error) {
      console.error('Error remixing dish:', error);
      throw error;
    } finally {
      setIsModifyingRecipe(false);
    }
  };

  const fuseDish = async (modification: string, dishToModify?: any) => {
    console.log('DishContext: fuseDish called with modification:', modification);
    
    const currentDishSnapshot = dishToModify || currentDish;
    if (!currentDishSnapshot) {
      console.log('DishContext: No current dish snapshot, returning undefined');
      return;
    }
    
    setIsModifyingRecipe(true);
    try {
      console.log('DishContext: Calling fuseDishAPI');
      const response = await fuseDishAPI(currentDishSnapshot, modification);
      console.log('DishContext: fuseDishAPI response:', response);
      
      const { recipe, summary, newImageUrl, updatedDish: backendUpdatedDish } = response;
      
      const updatedDish = {
        ...currentDishSnapshot,
        title: backendUpdatedDish?.title || recipe.title || currentDishSnapshot.title,
        description: backendUpdatedDish?.description || recipe.description || currentDishSnapshot.description,
        recipe,
        image: newImageUrl || currentDishSnapshot.image
      };
      
      // Create a new dish entry with a unique ID for the fusion
      const fusedDish: Dish = {
        ...updatedDish,
        id: Date.now().toString(), // Generate new ID for the fusion
        timestamp: new Date(),
        modificationType: 'fusion',
        originalDishId: currentDishSnapshot.id, // Keep reference to original dish
        preferences: currentDishSnapshot.preferences // Inherit preferences from original dish
      };
      
      setCurrentDish(fusedDish);
      
      // If no new image was provided by the backend, generate one
      if (!newImageUrl && fusedDish.image === currentDishSnapshot.image) {
        console.log('DishContext: No new image provided by backend for fusion, generating one...');
        setIsGeneratingImage(true);
        const imagePrompt = `${fusedDish.title}. ${fusedDish.description}`;
        
        // Set a timeout to prevent infinite loading
        const imageTimeout = setTimeout(() => {
          console.warn('DishContext: Image generation timeout for fused dish, stopping loading');
          setIsGeneratingImage(false);
        }, 30000); // 30 second timeout
        
        generateImageAPI(imagePrompt)
          .then(generatedImage => {
            clearTimeout(imageTimeout);
            console.log('DishContext: Generated image for fused dish:', generatedImage);
            if (generatedImage && generatedImage.trim()) {
              setCurrentDish(prev => prev ? { ...prev, image: generatedImage.trim() } : null);
            }
            setIsGeneratingImage(false);
          })
          .catch(imgErr => {
            clearTimeout(imageTimeout);
            console.error('DishContext: Image generation for fused dish failed:', imgErr);
            setIsGeneratingImage(false);
          });
      }
      
      // Add the fused dish as a new entry in history and save to storage
      setDishHistory(prev => {
        const newHistory = [fusedDish, ...prev];
        // Save to storage in background
        saveDishHistoryToFirestore(newHistory);
        saveDishHistoryToLocalStorage(newHistory);
        return newHistory;
      });
      
      // Extract context from the fusion request and add to conversation context
      const modificationLower = modification.toLowerCase();
      
      // Check for style modifications (American, Mexican, Italian, etc.)
      if (modificationLower.includes('american') || modificationLower.includes('american style')) {
        addConversationPreference('style', 'American');
      } else if (modificationLower.includes('mexican') || modificationLower.includes('mexican style')) {
        addConversationPreference('style', 'Mexican');
      } else if (modificationLower.includes('italian') || modificationLower.includes('italian style')) {
        addConversationPreference('style', 'Italian');
      } else if (modificationLower.includes('asian') || modificationLower.includes('asian style')) {
        addConversationPreference('style', 'Asian');
      } else if (modificationLower.includes('indian') || modificationLower.includes('indian style')) {
        addConversationPreference('style', 'Indian');
      } else if (modificationLower.includes('french') || modificationLower.includes('french style')) {
        addConversationPreference('style', 'French');
      } else if (modificationLower.includes('mediterranean') || modificationLower.includes('mediterranean style')) {
        addConversationPreference('style', 'Mediterranean');
      } else if (modificationLower.includes('thai') || modificationLower.includes('thai style')) {
        addConversationPreference('style', 'Thai');
      } else if (modificationLower.includes('chinese') || modificationLower.includes('chinese style')) {
        addConversationPreference('style', 'Chinese');
      } else if (modificationLower.includes('japanese') || modificationLower.includes('japanese style')) {
        addConversationPreference('style', 'Japanese');
      } else if (modificationLower.includes('korean') || modificationLower.includes('korean style')) {
        addConversationPreference('style', 'Korean');
      } else if (modificationLower.includes('greek') || modificationLower.includes('greek style')) {
        addConversationPreference('style', 'Greek');
      } else if (modificationLower.includes('spanish') || modificationLower.includes('spanish style')) {
        addConversationPreference('style', 'Spanish');
      } else if (modificationLower.includes('middle eastern') || modificationLower.includes('middle eastern style')) {
        addConversationPreference('style', 'Middle Eastern');
      } else if (modificationLower.includes('caribbean') || modificationLower.includes('caribbean style')) {
        addConversationPreference('style', 'Caribbean');
      } else if (modificationLower.includes('southern') || modificationLower.includes('southern style')) {
        addConversationPreference('style', 'Southern');
      } else if (modificationLower.includes('cajun') || modificationLower.includes('cajun style')) {
        addConversationPreference('style', 'Cajun');
      } else if (modificationLower.includes('tex-mex') || modificationLower.includes('tex-mex style')) {
        addConversationPreference('style', 'Tex-Mex');
      } else if (modificationLower.includes('fusion') || modificationLower.includes('fusion style')) {
        addConversationPreference('style', 'Fusion');
      }
      
      // Check for cooking method modifications
      if (modificationLower.includes('grilled') || modificationLower.includes('grill')) {
        addConversationPreference('style', 'Grilled');
      } else if (modificationLower.includes('roasted') || modificationLower.includes('roast')) {
        addConversationPreference('style', 'Roasted');
      } else if (modificationLower.includes('fried') || modificationLower.includes('fry')) {
        addConversationPreference('style', 'Fried');
      } else if (modificationLower.includes('baked') || modificationLower.includes('bake')) {
        addConversationPreference('style', 'Baked');
      } else if (modificationLower.includes('steamed') || modificationLower.includes('steam')) {
        addConversationPreference('style', 'Steamed');
      } else if (modificationLower.includes('braised') || modificationLower.includes('braise')) {
        addConversationPreference('style', 'Braised');
      } else if (modificationLower.includes('sautéed') || modificationLower.includes('sauté') || modificationLower.includes('sauteed') || modificationLower.includes('saute')) {
        addConversationPreference('style', 'Sautéed');
      }
      
      // Check for dietary modifications
      if (modificationLower.includes('healthier') || modificationLower.includes('healthy') || modificationLower.includes('health')) {
        addConversationPreference('dietary', 'Healthy');
      } else if (modificationLower.includes('vegetarian') || modificationLower.includes('veggie')) {
        addConversationPreference('dietary', 'Vegetarian');
      } else if (modificationLower.includes('vegan')) {
        addConversationPreference('dietary', 'Vegan');
      } else if (modificationLower.includes('gluten-free') || modificationLower.includes('gluten free')) {
        addConversationPreference('dietary', 'Gluten-Free');
      } else if (modificationLower.includes('dairy-free') || modificationLower.includes('dairy free')) {
        addConversationPreference('dietary', 'Dairy-Free');
      } else if (modificationLower.includes('keto') || modificationLower.includes('ketogenic')) {
        addConversationPreference('dietary', 'Keto');
      } else if (modificationLower.includes('paleo')) {
        addConversationPreference('dietary', 'Paleo');
      } else if (modificationLower.includes('low-carb') || modificationLower.includes('low carb')) {
        addConversationPreference('dietary', 'Low-Carb');
      } else if (modificationLower.includes('low-fat') || modificationLower.includes('low fat')) {
        addConversationPreference('dietary', 'Low-Fat');
      } else if (modificationLower.includes('high-protein') || modificationLower.includes('high protein')) {
        addConversationPreference('dietary', 'High-Protein');
      }
      
      // Check for ingredient modifications
      if (modificationLower.includes('spicy') || modificationLower.includes('hot') || modificationLower.includes('spice')) {
        addConversationPreference('ingredient', 'Spicy');
      } else if (modificationLower.includes('mild') || modificationLower.includes('not spicy')) {
        addConversationPreference('ingredient', 'Mild');
      } else if (modificationLower.includes('extra spicy') || modificationLower.includes('very spicy')) {
        addConversationPreference('ingredient', 'Extra Spicy');
      } else if (modificationLower.includes('cheese') || modificationLower.includes('cheesy')) {
        addConversationPreference('ingredient', 'Cheese');
      } else if (modificationLower.includes('garlic') || modificationLower.includes('garlicky')) {
        addConversationPreference('ingredient', 'Garlic');
      } else if (modificationLower.includes('herbs') || modificationLower.includes('herby')) {
        addConversationPreference('ingredient', 'Herbs');
      } else if (modificationLower.includes('citrus') || modificationLower.includes('lemon') || modificationLower.includes('lime')) {
        addConversationPreference('ingredient', 'Citrus');
      } else if (modificationLower.includes('nuts') || modificationLower.includes('nutty')) {
        addConversationPreference('ingredient', 'Nuts');
      } else if (modificationLower.includes('seafood') || modificationLower.includes('fish')) {
        addConversationPreference('ingredient', 'Seafood');
      } else if (modificationLower.includes('vegetables') || modificationLower.includes('veggies')) {
        addConversationPreference('ingredient', 'Vegetables');
      }
      
      // Check for dish type modifications
      if (modificationLower.includes('soup') || modificationLower.includes('soupy')) {
        addConversationPreference('dishType', 'Soup');
      } else if (modificationLower.includes('salad') || modificationLower.includes('salady')) {
        addConversationPreference('dishType', 'Salad');
      } else if (modificationLower.includes('sandwich') || modificationLower.includes('wrap')) {
        addConversationPreference('dishType', 'Sandwich');
      } else if (modificationLower.includes('pasta') || modificationLower.includes('noodles')) {
        addConversationPreference('dishType', 'Pasta');
      } else if (modificationLower.includes('rice') || modificationLower.includes('rice dish')) {
        addConversationPreference('dishType', 'Rice');
      } else if (modificationLower.includes('pizza') || modificationLower.includes('pizza style')) {
        addConversationPreference('dishType', 'Pizza');
      } else if (modificationLower.includes('burger') || modificationLower.includes('burger style')) {
        addConversationPreference('dishType', 'Burger');
      } else if (modificationLower.includes('taco') || modificationLower.includes('taco style')) {
        addConversationPreference('dishType', 'Taco');
      } else if (modificationLower.includes('bowl') || modificationLower.includes('bowl style')) {
        addConversationPreference('dishType', 'Bowl');
      } else if (modificationLower.includes('skillet') || modificationLower.includes('skillet style')) {
        addConversationPreference('dishType', 'Skillet');
      }
      
      // If no specific pattern matches, add the modification as a user word
      if (!modificationLower.includes('american') && !modificationLower.includes('mexican') && 
          !modificationLower.includes('italian') && !modificationLower.includes('asian') &&
          !modificationLower.includes('indian') && !modificationLower.includes('french') &&
          !modificationLower.includes('mediterranean') && !modificationLower.includes('thai') &&
          !modificationLower.includes('chinese') && !modificationLower.includes('japanese') &&
          !modificationLower.includes('korean') && !modificationLower.includes('greek') &&
          !modificationLower.includes('spanish') && !modificationLower.includes('middle eastern') &&
          !modificationLower.includes('caribbean') && !modificationLower.includes('southern') &&
          !modificationLower.includes('cajun') && !modificationLower.includes('tex-mex') &&
          !modificationLower.includes('fusion') && !modificationLower.includes('grilled') &&
          !modificationLower.includes('roasted') && !modificationLower.includes('fried') &&
          !modificationLower.includes('baked') && !modificationLower.includes('steamed') &&
          !modificationLower.includes('braised') && !modificationLower.includes('sautéed') &&
          !modificationLower.includes('sauteed') && !modificationLower.includes('healthier') &&
          !modificationLower.includes('healthy') && !modificationLower.includes('vegetarian') &&
          !modificationLower.includes('vegan') && !modificationLower.includes('gluten-free') &&
          !modificationLower.includes('dairy-free') && !modificationLower.includes('keto') &&
          !modificationLower.includes('paleo') && !modificationLower.includes('low-carb') &&
          !modificationLower.includes('low-fat') && !modificationLower.includes('high-protein') &&
          !modificationLower.includes('spicy') && !modificationLower.includes('mild') &&
          !modificationLower.includes('cheese') && !modificationLower.includes('garlic') &&
          !modificationLower.includes('herbs') && !modificationLower.includes('citrus') &&
          !modificationLower.includes('nuts') && !modificationLower.includes('seafood') &&
          !modificationLower.includes('vegetables') && !modificationLower.includes('soup') &&
          !modificationLower.includes('salad') && !modificationLower.includes('sandwich') &&
          !modificationLower.includes('pasta') && !modificationLower.includes('rice') &&
          !modificationLower.includes('pizza') && !modificationLower.includes('burger') &&
          !modificationLower.includes('taco') && !modificationLower.includes('bowl') &&
          !modificationLower.includes('skillet')) {
        // Extract key words from the modification
        const words = modification.split(' ').filter(word => 
          word.length > 3 && 
          !['make', 'this', 'that', 'more', 'less', 'add', 'remove', 'change', 'modify', 'style', 'version', 'fuse', 'combine', 'with'].includes(word.toLowerCase())
        );
        if (words.length > 0) {
          addConversationPreference('userWord', words[0]);
        }
      }
      
      return {
        summary: summary,
        updatedDish: fusedDish
      };
    } catch (error) {
      console.error('Error fusing dish:', error);
      throw error;
    } finally {
      setIsModifyingRecipe(false);
    }
  };

  return (
    <DishContext.Provider value={{
      currentDish,
      setCurrentDish,
      dishHistory,
      setDishHistory,
      chatMessages,
      conversationContext,
      preferences,
      hasPreferences,
      isGeneratingDish,
      setIsGeneratingDish,
      isGeneratingSpecificDish,
      isModifyingRecipe,
      isGeneratingRecipe,
      setIsGeneratingRecipe,
      isGeneratingImage,
      isLoadingHistory,
          imageError,
    setImageError,
    clearImageError,
    clearImageGeneration,
      isDishFinal,
      setIsDishFinal,
      generateDish,
      generateSpecificDish,
      regenerateDishWithContext,
      updateRecipe,
      addChatMessage,
      updatePreferences,
      updatePreferencesOnly,
      saveDishToHistory,
      saveDishHistoryToFirestore,
      saveCurrentDishHistoryToLocalStorage,
      loadDishFromHistory,
      generateRecipeInfo,
      cookDish,
      modifyRecipe,
      remixDish,
      fuseDish,
      finalizeDish,
      clearPreferences,
      clearChatMessages,
      updateChatContextForModifiedDish,
      updateConversationContext,
      addConversationPreference,
      removeConversationPreference,
      clearConversationContext,
    }}>
      {children}
    </DishContext.Provider>
  );
};
