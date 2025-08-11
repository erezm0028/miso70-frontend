import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateDish as generateDishAPI, generateImage as generateImageAPI, getRecipeInfo as getRecipeInfoAPI, modifyRecipe as modifyRecipeAPI } from '../src/api';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase';
import { useAuth } from './AuthContext';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  preferences: Array<{ type: 'dietary' | 'cuisine' | 'style' | 'ingredient' | 'dishType' | 'classicDish'; value: string; timestamp: Date; }>;
  dishHistory: Array<{ title: string; description: string; timestamp: Date; }>;
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
  isGeneratingSpecificDish: boolean;
  isModifyingRecipe: boolean;
  isGeneratingImage: boolean;
  isLoadingHistory: boolean;
  
  // Error state
  imageError: string | null;
  clearImageError: () => void;
  
  // Dish lifecycle state
  isDishFinal: boolean;
  setIsDishFinal: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Actions
  generateDish: (preferences?: Partial<Preferences>) => Promise<void>;
  generateSpecificDish: (dishName: string, chatContext?: string, preferences?: Partial<Preferences>) => Promise<void>;
  updateRecipe: (recipeChanges: Partial<Dish['recipe']>) => void;
  addChatMessage: (text: string, isUser: boolean) => void;
  updatePreferences: (newPreferences: Partial<Preferences>) => void;
  saveDishToHistory: (dish: Dish) => void;
  saveDishHistoryToFirestore: (history: Dish[]) => Promise<void>;
  saveCurrentDishHistoryToLocalStorage: () => Promise<void>;
  loadDishFromHistory: (dishId: string) => void;
  generateRecipeInfo: (dishTitle: string) => Promise<void>;
  modifyRecipe: (modification: string, dishToModify?: any) => Promise<{ isTransformative: boolean; summary: string; updatedDish: any } | void>;
  finalizeDish: () => void;
  clearPreferences: () => void;
  clearChatMessages: () => void;
  updateChatContextForModifiedDish: (modifiedDish: any, modificationSummary: string) => void;
  updateConversationContext: (updates: Partial<ConversationContext>) => void;
  addConversationPreference: (type: 'dietary' | 'cuisine' | 'style' | 'ingredient' | 'dishType' | 'classicDish', value: string) => void;
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
  isGeneratingSpecificDish: false,
  isModifyingRecipe: false,
  isGeneratingImage: false,
  isLoadingHistory: false,
  imageError: null,
  clearImageError: () => {},
  isDishFinal: false,
  setIsDishFinal: () => {},
  generateDish: async () => {},
  generateSpecificDish: async () => {},
  updateRecipe: () => {},
  addChatMessage: () => {},
  updatePreferences: () => {},
  saveDishToHistory: () => {},
  saveDishHistoryToFirestore: async () => {},
  saveCurrentDishHistoryToLocalStorage: async () => {},
  loadDishFromHistory: () => {},
  generateRecipeInfo: async () => {},
  modifyRecipe: async () => {},
  finalizeDish: () => {},
  clearPreferences: () => {},
  clearChatMessages: () => {},
  updateChatContextForModifiedDish: () => {},
  updateConversationContext: () => {},
  addConversationPreference: () => {},
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

  // Helper to get a random fallback image - using consistent, app-style placeholder images
  const fallbackImages = [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?auto=format&fit=crop&w=800&q=80', // Pizza
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80', // Sushi
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', // Salad
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=800&q=80', // Pasta
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?auto=format&fit=crop&w=800&q=80', // Burger
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80', // Asian dish
  ];
  function getRandomFallbackImage() {
    return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
  }

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
      image: getRandomFallbackImage(),
      recipe: {},
    };
  }

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
      };
      
      // Show the dish immediately and set image loading state
      setCurrentDish(newDish);
      setDishHistory(prev => [newDish, ...prev]);
      console.log('Dish generation complete, setting isGeneratingDish to false');
      setIsGeneratingDish(false); // Dish generation is complete, now only image generation
      console.log('Starting image generation, setting isGeneratingImage to true');
      setIsGeneratingImage(true);
      
      // Generate image in the background (don't block the UI)
      const imagePrompt = parsed.title + '. ' + parsed.description;
      console.log('Starting image generation for:', imagePrompt);
      generateImageAPI(imagePrompt)
        .then(generatedImage => {
          console.log('Image generation completed:', generatedImage ? 'Success' : 'No image');
          if (generatedImage && generatedImage.trim()) {
            // Update the dish with the generated image immediately
            setCurrentDish(prev => {
              if (prev) {
                console.log('Updating current dish with image:', generatedImage.substring(0, 50) + '...');
                return { ...prev, image: generatedImage.trim() };
              }
              return prev;
            });
            setDishHistory(prev => {
              if (prev.length > 0) {
                console.log('Updating dish history with image');
                return [{ ...prev[0], image: generatedImage.trim() }, ...prev.slice(1)];
              }
              return prev;
            });
          } else {
            console.warn('Generated image is empty or invalid:', generatedImage);
          }
        })
        .catch(imgErr => {
          console.warn('Image generation failed, using fallback image:', imgErr);
          // Use fallback image if generation fails
          const fallbackImage = getRandomFallbackImage();
          setCurrentDish(prev => prev ? { ...prev, image: fallbackImage } : prev);
          setDishHistory(prev => prev.length > 0 ? [{ ...prev[0], image: fallbackImage }, ...prev.slice(1)] : prev);
        })
        .finally(() => {
          console.log('Image generation process finished, setting isGeneratingImage to false');
          setIsGeneratingImage(false);
        });
      
      // Generate recipe info in parallel (don't wait for it)
      getRecipeInfoAPI(newDish.title)
        .then(recipe => {
          setCurrentDish(prev => prev ? { ...prev, recipe } : prev);
          setDishHistory(prev => prev.length > 0 ? [{ ...prev[0], recipe }, ...prev.slice(1)] : prev);
        })
        .catch(recipeError => {
          console.error('Error generating recipe info for dish:', recipeError);
          // Don't fail the whole process if recipe generation fails
        });
    } catch (error: any) {
      console.error('Error generating dish:', error);
      setImageError(error?.message || 'Unknown error generating dish');
      // Don't create a fallback dish - let the error screen handle it
      setCurrentDish(null);
      setIsGeneratingDish(false);
    }
  };

  const generateSpecificDish = async (dishName: string, chatContext?: string, preferencesOverride?: Partial<Preferences>): Promise<void> => {
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
      };
      
      // Set the dish immediately and set image loading state
      setCurrentDish(newDish);
      setDishHistory(prev => [newDish, ...prev.slice(1)]); // Replace the first item
      setIsGeneratingImage(true);
      
      // Generate image in the background (don't block the UI)
      const imagePrompt = chatContext ? `${chatContext}. A beautiful food photograph` : `${dishName}. A beautiful food photograph`;
      generateImageAPI(imagePrompt)
        .then(generatedImage => {
          if (generatedImage) {
            // Update the dish with the generated image
            setCurrentDish(prev => prev ? { ...prev, image: generatedImage } : prev);
            setDishHistory(prev => prev.length > 0 ? [{ ...prev[0], image: generatedImage }, ...prev.slice(1)] : prev);
          }
        })
        .catch(imgErr => {
          console.warn('Image generation failed, using fallback image:', imgErr);
          // Use fallback image if generation fails
          const fallbackImage = getRandomFallbackImage();
          setCurrentDish(prev => prev ? { ...prev, image: fallbackImage } : prev);
          setDishHistory(prev => prev.length > 0 ? [{ ...prev[0], image: fallbackImage }, ...prev.slice(1)] : prev);
        })
        .finally(() => {
          setIsGeneratingImage(false);
        });
      
      // Generate recipe info for the specific dish
      try {
        const recipe = await getRecipeInfoAPI(newDish.title);
        setCurrentDish(prev => prev ? { ...prev, recipe } : prev);
        setDishHistory(prev => prev.length > 0 ? [{ ...prev[0], recipe }, ...prev.slice(1)] : prev);
      } catch (recipeError) {
        console.error('Error generating recipe info for specific dish:', recipeError);
        // Don't fail the whole process if recipe generation fails
      }
      
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

  const loadDishFromHistory = (dishId: string) => {
    const dish = dishHistory.find(d => d.id === dishId);
    if (dish) {
      setCurrentDish(dish);
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
      
      const { recipe, isTransformative, transformationSummary, modificationSummary } = response;
      
      let updatedDish;
      
      if (isTransformative) {
        // For transformative changes, update title, description, and image
        updatedDish = { 
          ...currentDishSnapshot, 
          title: recipe.title || currentDishSnapshot.title,
          description: recipe.description || currentDishSnapshot.description,
          recipe 
        };
        
        // Generate new image for transformative changes
        try {
          const imageUrl = await generateImageAPI(`${recipe.title}. ${recipe.description}`);
          updatedDish.image = imageUrl;
        } catch (imgErr) {
          console.warn('Image generation failed for transformative change:', imgErr);
        }
      } else {
        // For minor modifications, keep the same title and description
        updatedDish = { ...currentDishSnapshot, recipe };
      }
      
      setCurrentDish(updatedDish);
      
      // Update the dish in history as well
      setDishHistory(prev => {
        const updatedHistory = prev.map(dish => 
          dish.id === currentDishSnapshot.id ? updatedDish : dish
        );
        return updatedHistory;
      });
      
      // Return the summary for the chat
      return {
        isTransformative,
        summary: isTransformative ? transformationSummary : modificationSummary,
        updatedDish: updatedDish // Return the updated dish data
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
  const addConversationPreference = (type: 'dietary' | 'cuisine' | 'style' | 'ingredient' | 'dishType' | 'classicDish', value: string) => {
    setConversationContext(prev => ({
      ...prev,
      preferences: [...prev.preferences, { type, value, timestamp: new Date() }]
    }));
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
      isGeneratingSpecificDish,
      isModifyingRecipe,
      isGeneratingImage,
      isLoadingHistory,
      imageError,
      clearImageError,
      isDishFinal,
      setIsDishFinal,
      generateDish,
      generateSpecificDish,
      updateRecipe,
      addChatMessage,
      updatePreferences,
      saveDishToHistory,
      saveDishHistoryToFirestore,
      saveCurrentDishHistoryToLocalStorage,
      loadDishFromHistory,
      generateRecipeInfo,
      modifyRecipe,
      finalizeDish,
      clearPreferences,
      clearChatMessages,
      updateChatContextForModifiedDish,
      updateConversationContext,
      addConversationPreference,
      clearConversationContext,
    }}>
      {children}
    </DishContext.Provider>
  );
};
