import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, Image, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import CustomText from '../components/CustomText';
import { FontAwesome } from '@expo/vector-icons';
import { useDish } from '../contexts/DishContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { chatWithChef, getChatDishSuggestion, generateImage as generateImageAPI, fuseDish } from '../src/api'; // Adjust path if your api.js is elsewhere
import TypingIndicator from '../components/TypingIndicator';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorScreen from '../components/ErrorScreen';
import ContextTags from '../components/ContextTags';
import * as Clipboard from 'expo-clipboard';
import { Keyboard } from 'react-native';
import ConfirmationModal from '../components/ConfirmationModal';

const screenWidth = Dimensions.get('window').width;

// Helper component to render action messages with icons
const ActionMessage = ({ type, message }: { type: 'loading' | 'success', message: string }) => {
  const iconName = type === 'loading' ? 'spinner' : 'check-circle';
  const iconColor = type === 'loading' ? '#67756a' : '#4CAF50';
  
  return (
    <View style={styles.messageBubble}>
      <View style={styles.actionMessageContent}>
        <View style={styles.actionIcon}>
          <FontAwesome name={iconName} size={16} color={iconColor} />
        </View>
        <CustomText style={styles.aiMessageText}>{message || ''}</CustomText>
      </View>
    </View>
  );
};

// Helper component to render affirmation buttons in chat
const AffirmationButtons = ({ 
  onConfirm, 
  onCancel, 
  confirmIcon = 'check' as const, 
  confirmColor = '#d46e57',
  showCancel = true 
}: {
  onConfirm: () => void;
  onCancel: () => void;
  confirmIcon?: 'check' | 'plus' | 'arrow-right';
  confirmColor?: string;
  showCancel?: boolean;
}) => {
  return (
    <View style={styles.affirmationButtonsContainer}>
      {showCancel && (
        <TouchableOpacity style={styles.affirmationButton} onPress={onCancel}>
          <FontAwesome name="times" size={20} color="#67756a" />
        </TouchableOpacity>
      )}
      <TouchableOpacity 
        style={[styles.affirmationButton, { backgroundColor: confirmColor }]} 
        onPress={onConfirm}
      >
        <FontAwesome name={confirmIcon} size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default function ChatScreen() {
  const { 
    currentDish, 
    setCurrentDish, 
    chatMessages, 
    addChatMessage, 
    preferences, 
    generateDish, 
    generateSpecificDish,
    modifyRecipe,
    conversationContext,
    updateConversationContext,
    addConversationPreference,
    removeConversationPreference,
    clearConversationContext,
    isGeneratingDish,
    isGeneratingSpecificDish,
    isModifyingRecipe,
    setDishHistory,
    updatePreferences,
    finalizeDish,
    clearPreferences,
    clearChatMessages,
    imageError,
    setImageError,
    clearImageError,
    setIsPendingConfirmation
  } = useDish();
  const navigation = useNavigation();
  const [input, setInput] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showStartFreshModal, setShowStartFreshModal] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    type: 'dish' | 'dietary' | 'cuisine' | 'plate_style' | 'classic_dish' | 'ingredient' | 'cooking_method' | 'ingredient_preference';
    dishName?: string;
    description?: string;
    diet?: string;
    cuisine?: string;
    plateStyle?: string;
    classicDish?: string;
    ingredientPreference?: string;
    message: string;
    modification?: string; // Store the actual modification instruction
    completeDish?: any; // Store the complete dish data for new dish suggestions
    userInput?: string; // Store the original user input for clarification
    showViewRecipe?: boolean; // Show view recipe option in confirmation
    originalUserMessage?: string; // Store the original user message for context
  } | null>(null);
  
  // Track the pending dish for context preservation
  const [pendingDishContext, setPendingDishContext] = useState<any>(null);
  
  // Track conversation context for future dish generations and modifications
  const [isTyping, setIsTyping] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isProcessingModification, setIsProcessingModification] = useState(false);
  const [isProcessingFusion, setIsProcessingFusion] = useState(false);
  const [readyToNavigate, setReadyToNavigate] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingDish, setIsConfirmingDish] = useState(false);
  const [isLoadingDish, setIsLoadingDish] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [paddingAnimation] = useState(new Animated.Value(65));
  const scrollViewRef = useRef(null);

  // Consolidate all waiting states
  const isAnyWaiting = isWaitingForResponse || isProcessingModification || isProcessingFusion || isGeneratingDish || isGeneratingSpecificDish || isModifyingRecipe || isConfirmingDish || isLoadingDish;

  // Show TypingIndicator for at least 600ms
  useEffect(() => {
    if (isAnyWaiting) {
      setShowTypingIndicator(true);
      if (typingTimeout) clearTimeout(typingTimeout);
    } else if (showTypingIndicator) {
      // Wait at least 600ms before hiding
      const timeout = setTimeout(() => setShowTypingIndicator(false), 600);
      setTypingTimeout(timeout);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line
  }, [isAnyWaiting]);

  // Add keyboard listeners to adjust padding dynamically
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
      
      // Animate input padding
      Animated.timing(paddingAnimation, {
        toValue: 10,
        duration: 0,  // Instant change since keyboard hasn't started animating yet
        useNativeDriver: false,
      }).start();
    });
    
    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      
      // Animate input padding back
      Animated.timing(paddingAnimation, {
        toValue: 65,
        duration: 0,  // Instant change
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const insets = useSafeAreaInsets();
  const route = useRoute();

  useEffect(() => {
    if (
      route.params?.starterMessages &&
      chatMessages.length === 0
    ) {
      let i = 0;
      setIsTyping(true);

      function typeNext() {
        if (i < route.params.starterMessages.length) {
          addChatMessage(route.params.starterMessages[i].text, route.params.starterMessages[i].isUser);
          i++;
          setTimeout(typeNext, 900); // 900ms between messages, adjust as needed
        } else {
          setIsTyping(false);
        }
      }

      typeNext();
    }
    // eslint-disable-next-line
  }, [route.params, chatMessages.length]);

  // Function to parse chat response for various suggestions and changes
  const parseChatResponse = (message: string, userInput: string) => {
    const lowerMessage = message.toLowerCase();
    const lowerUserInput = userInput.toLowerCase();
    
    // Get the current dish context (either currentDish or pendingDishContext)
    const dishContext = currentDish || pendingDishContext;
    
    // 0. Check if this is a modification request for current dish
    if (dishContext && (
      lowerUserInput.includes('make this') || 
      lowerUserInput.includes('make it') || 
      lowerUserInput.includes('0 carbs') || 
      lowerUserInput.includes('no carbs') ||
      lowerUserInput.includes('low carb') ||
      lowerUserInput.includes('high protein') ||
      lowerUserInput.includes('gluten free') ||
      lowerUserInput.includes('dairy free') ||
      lowerUserInput.includes('vegan') ||
      lowerUserInput.includes('vegetarian') ||
      lowerUserInput.includes('spicy') ||
      lowerUserInput.includes('mexican style') ||
      lowerUserInput.includes('italian style') ||
      lowerUserInput.includes('asian style') ||
      lowerUserInput.includes('style') ||
      // Add specific modification phrases
      lowerUserInput.includes('use my') ||
      lowerUserInput.includes('use the') ||
      lowerUserInput.includes('add my') ||
      lowerUserInput.includes('add the') ||
      lowerUserInput.includes('include my') ||
      lowerUserInput.includes('include the') ||
      lowerUserInput.includes('put my') ||
      lowerUserInput.includes('put the') ||
      lowerUserInput.includes('add to this') ||
      lowerUserInput.includes('add to the current') ||
      lowerUserInput.includes('use in this') ||
      lowerUserInput.includes('use in the current') ||
      lowerUserInput.includes('with this dish') ||
      lowerUserInput.includes('in this dish') ||
      lowerUserInput.includes('to this dish') ||
      lowerUserInput.includes('in the current dish') ||
      lowerUserInput.includes('to the current dish') ||
      lowerUserInput.includes('modify this') ||
      lowerUserInput.includes('change this') ||
      lowerUserInput.includes('update this') ||
      lowerUserInput.includes('adjust this')
    )) {
      return {
        type: 'ingredient' as const,
        message: `I can modify your current ${dishContext.title} based on your request. This will update the recipe. Would you like me to apply this change?`,
        modification: userInput
      };
    }

    // 0.5. Check if AI response indicates a modification acknowledgment
    if (dishContext && (
      lowerMessage.includes('modify') || 
      lowerMessage.includes('change') || 
      lowerMessage.includes('adjust') ||
      lowerMessage.includes('update') ||
      (lowerMessage.includes('current') && lowerMessage.includes(dishContext.title.toLowerCase()))
    )) {
      return {
        type: 'ingredient' as const,
        message: `I can modify your current ${dishContext.title} based on your request. This will update the recipe. Would you like me to apply this change?`,
        modification: userInput
      };
    }
    
    // 1. Dish suggestions - but check if this is a modification request first
    const dishSuggestionPatterns = [
      /(?:how about|what about) (?:a |an )?([^!?.]+)/i,
      /(?:i suggest|i recommend) (?:a |an )?([^!?.]+)/i,
      /(?:want to see|would you like to see) (?:the recipe for )?([^!?.]+)/i,
    ];

    for (const pattern of dishSuggestionPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const dishName = match[1].trim();
        if (dishName.length > 3 && !['it', 'this', 'that', 'one'].includes(dishName.toLowerCase())) {
          // If user asked for a modification but AI suggested a new dish, redirect to modification
          if (dishContext && (
            lowerUserInput.includes('make this') || 
            lowerUserInput.includes('make it') || 
            lowerUserInput.includes('0 carbs') || 
            lowerUserInput.includes('no carbs') ||
            lowerUserInput.includes('low carb') ||
            lowerUserInput.includes('high protein') ||
            lowerUserInput.includes('gluten free') ||
            lowerUserInput.includes('dairy free') ||
            lowerUserInput.includes('vegan') ||
            lowerUserInput.includes('vegetarian') ||
            // Add specific modification phrases
            lowerUserInput.includes('use my') ||
            lowerUserInput.includes('use the') ||
            lowerUserInput.includes('add my') ||
            lowerUserInput.includes('add the') ||
            lowerUserInput.includes('include my') ||
            lowerUserInput.includes('include the') ||
            lowerUserInput.includes('put my') ||
            lowerUserInput.includes('put the') ||
            lowerUserInput.includes('add to this') ||
            lowerUserInput.includes('add to the current') ||
            lowerUserInput.includes('use in this') ||
            lowerUserInput.includes('use in the current') ||
            lowerUserInput.includes('with this dish') ||
            lowerUserInput.includes('in this dish') ||
            lowerUserInput.includes('to this dish') ||
            lowerUserInput.includes('in the current dish') ||
            lowerUserInput.includes('to the current dish') ||
            lowerUserInput.includes('modify this') ||
            lowerUserInput.includes('change this') ||
            lowerUserInput.includes('update this') ||
            lowerUserInput.includes('adjust this')
          )) {
            return {
              type: 'ingredient' as const,
              message: `I can modify your current ${dishContext.title} based on your request. This will update the recipe. Would you like me to apply this change?`,
              modification: userInput
            };
          }
          
          return {
            type: 'dish' as const,
            dishName,
            description: `A delicious ${dishName} recipe`,
            message: `I can create a recipe for ${dishName}. Would you like me to assign this to your current dish?`
          };
        }
      }
    }

    // 2. Dietary changes - only if there's no current dish context
    const dietaryKeywords = {
      'vegan': ['vegan', 'plant-based', 'no animal products'],
      'vegetarian': ['vegetarian', 'no meat'],
      'gluten-free': ['gluten-free', 'gluten free', 'no gluten'],
      'keto': ['keto', 'ketogenic', 'low carb'],
      'diabetic': ['diabetic', 'diabetes', 'low sugar'],
      'dairy-free': ['dairy-free', 'dairy free', 'no dairy', 'lactose'],
    };

    for (const [diet, keywords] of Object.entries(dietaryKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        // Check if this is a modification request for current dish
        if (dishContext && (lowerUserInput.includes('make this') || lowerUserInput.includes('make it') || lowerUserInput.includes('0 carbs') || lowerUserInput.includes('no carbs'))) {
          return {
            type: 'ingredient' as const,
            message: `I can modify your current ${dishContext.title} to be ${diet}. This will update the recipe. Would you like me to apply this change?`,
            modification: `make it ${diet}`
          };
        } else {
          return {
            type: 'dietary' as const,
            diet,
            message: `I can generate a ${diet} dish for you. This will create a new dish with ${diet} requirements. Would you like me to generate this?`,
            modification: `make it ${diet}`
          };
        }
      }
    }

    // 3. Cuisine style changes
    const cuisineKeywords = {
      'italian': ['italian', 'pasta', 'pizza', 'risotto'],
      'japanese': ['japanese', 'sushi', 'ramen', 'miso'],
      'mexican': ['mexican', 'taco', 'burrito', 'salsa'],
      'indian': ['indian', 'curry', 'biryani', 'masala'],
      'thai': ['thai', 'pad thai', 'curry', 'lemongrass'],
      'french': ['french', 'bistro', 'sauce', 'wine'],
    };

    for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return {
          type: 'cuisine' as const,
          cuisine,
          message: `I can generate a ${cuisine} dish for you. This will create a new dish with ${cuisine} flavors and techniques. Would you like me to generate this?`,
          modification: `make it ${cuisine} style`
        };
      }
    }

    // 4. Plate style changes
    const plateStyleKeywords = {
      'salad bowl': ['salad bowl', 'bowl', 'salad'],
      'comfort plate': ['comfort plate', 'comfort food', 'hearty'],
      'stir fry / noodles': ['stir fry', 'wok', 'stir-fry', 'noodles', 'pasta'],
      'side dish': ['side dish', 'side', 'accompaniment', 'bento box', 'bento', 'divided plate'],
      'wrap / taco': ['wrap', 'tortilla', 'flatbread', 'taco', 'burrito'],
      'soup / stew': ['soup', 'stew', 'broth'],
      'sandwich / toast': ['sandwich', 'toast', 'bread'],
      'dessert': ['dessert', 'sweet', 'cake', 'cookie', 'pie', 'finger food', 'skewers', 'appetizer', 'small bites'],
    };

    for (const [plateStyle, keywords] of Object.entries(plateStyleKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        // Check if this is a modification request for current dish
        if (dishContext && (lowerUserInput.includes('change to') || lowerUserInput.includes('make it a') || lowerUserInput.includes('serve as'))) {
          // Determine if this is a transformative change
          const isTransformative = plateStyle === 'salad bowl' || plateStyle === 'bento box' || plateStyle === 'finger food';
          
          return {
            type: 'plate_style' as const,
            plateStyle,
            message: isTransformative 
              ? `I can transform your ${dishContext.title} into a ${plateStyle}. This will create a new dish concept. Would you like me to apply this change?`
              : `I can modify your ${dishContext.title} to be served as a ${plateStyle}. This will adjust the presentation. Would you like me to apply this change?`,
            modification: `change to ${plateStyle}`
          };
        } else {
          return {
            type: 'plate_style' as const,
            plateStyle,
            message: `I can generate a ${plateStyle} dish for you. This will create a new dish served as a ${plateStyle}. Would you like me to generate this?`,
            modification: `serve it as a ${plateStyle}`
          };
        }
      }
    }

    // 4. Ingredient substitutions and modifications
    const substitutionKeywords = ['don\'t have', 'don\'t got', 'no', 'instead of', 'substitute', 'replace', 'alternative'];
    const additionKeywords = ['have', 'got', 'need to use', 'want to use', 'need to get rid of', 'want to finish', 'need to finish', 'add', 'include'];
    
    // Common ingredients people often substitute or add
    const commonIngredients = [
      'maple', 'syrup', 'honey', 'sugar', 'brown sugar', 'agave',
      'bacon', 'pancetta', 'ham', 'prosciutto',
      'cheese', 'cheddar', 'parmesan', 'mozzarella',
      'milk', 'cream', 'butter', 'oil', 'olive oil',
      'garlic', 'onion', 'shallot',
      'salt', 'pepper', 'spices', 'herbs',
      'vinegar', 'lemon', 'lime', 'soy sauce', 'hot sauce',
      'tomato', 'tomatoes', 'mushroom', 'mushrooms'
    ];

    // Check for ingredient substitutions in user input
    for (const ingredient of commonIngredients) {
      if (lowerUserInput.includes(ingredient)) {
        // Check if it's a substitution request ("I don't have maple", "make it with tofu")
        const substitutionPatterns = [
          ...substitutionKeywords,
          'make it with', 'use instead', 'replace with', 'substitute with'
        ];
        if (substitutionPatterns.some(keyword => lowerUserInput.includes(keyword))) {
          return {
            type: 'ingredient' as const,
            message: `I can modify the dish to use ${ingredient} instead. This will adapt the recipe while keeping the same dish concept. Would you like me to apply this change?`,
            modification: `substitute the main protein with ${ingredient}`
          };
        }
        
        // Check if it's an ingredient addition ("I have cheddar cheese")
        if (additionKeywords.some(keyword => lowerUserInput.includes(keyword))) {
          return {
            type: 'ingredient' as const,
            message: `I can add ${ingredient} to your current dish. This will modify the recipe to include ${ingredient}. Would you like me to apply this change?`,
            modification: `add ${ingredient} to the dish`
          };
        }
      }
    }

    // 5. Ingredient preferences (dislikes, avoidances, preferences)
    const ingredientPreferenceKeywords = {
      'dislike': ['don\'t like', 'dislike', 'hate', 'can\'t stand', 'not a fan of'],
      'avoid': ['avoid', 'without', 'skip', 'exclude'],
      'prefer': ['prefer', 'rather', 'better without'],
      'allergic': ['allergic', 'allergy', 'intolerant', 'sensitivity']
    };

    // Check for ingredient preferences in user input
    for (const ingredient of commonIngredients) {
      if (lowerUserInput.includes(ingredient)) {
        // Check if it's a preference (dislike, avoid, etc.)
        for (const [preferenceType, keywords] of Object.entries(ingredientPreferenceKeywords)) {
          if (keywords.some(keyword => lowerUserInput.includes(keyword))) {
            return {
              type: 'ingredient_preference' as const,
              ingredientPreference: ingredient,
              message: `I can generate a dish without ${ingredient} for you. This will create a new dish that avoids ${ingredient}. Would you like me to generate this?`,
              modification: `${preferenceType} ${ingredient}`
            };
          }
        }
      }
    }

    // 6. Ingredient changes - improved to catch additions
    const ingredientKeywords = [
      'substitute', 'replace', 'instead of', 'alternative', 'swap',
      'allergic', 'allergy', 'intolerant', 'sensitivity'
    ];

    // Check for ingredient additions (add, include, put in, etc.)
    const addKeywords = ['add', 'include', 'put in', 'throw in', 'mix in', 'incorporate'];
    const hasAddKeyword = addKeywords.some(keyword => lowerUserInput.includes(keyword));
    
    if (ingredientKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'ingredient' as const,
        message: `I can help you substitute ingredients in the current dish. This will modify the recipe. Would you like me to suggest alternatives?`,
        modification: userInput
      };
    }

    // 7. Cooking method changes
    const cookingKeywords = [
      'grill', 'bake', 'fry', 'steam', 'roast', 'braise', 'sauté',
      'quick', 'slow', 'pressure cook', 'air fry'
    ];

    if (cookingKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: 'cooking_method' as const,
        message: `I can modify the cooking method for the current dish. This will change the recipe instructions. Would you like me to apply this change?`,
        modification: userInput
      };
    }

    // 8. Specific dish names (check both user input and AI response)
    const dishKeywords = [
      'carbonara', 'pizza', 'risotto', 'sushi', 'ramen', 'taco', 'curry', 'biryani',
      'pad thai', 'coq au vin', 'beef bourguignon', 'tiramisu', 'lasagna', 'enchiladas',
      'pasta', 'noodles', 'soup', 'salad', 'stew', 'casserole'
    ];

    // Check user input first for specific dish requests
    for (const keyword of dishKeywords) {
      if (lowerUserInput.includes(keyword)) {
        return {
          type: 'dish' as const,
          dishName: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          description: `A delicious ${keyword} recipe`,
          message: `I can create a recipe for ${keyword}. Would you like me to assign this to your current dish?`,
          modification: userInput // Pass the original user request
        };
      }
    }

    // Then check AI response for dish suggestions
    for (const keyword of dishKeywords) {
      if (lowerMessage.includes(keyword)) {
        return {
          type: 'dish' as const,
          dishName: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          description: `A delicious ${keyword} recipe`,
          message: `I can create a recipe for ${keyword}. Would you like me to assign this to your current dish?`
        };
      }
    }

    // 9. Classic dish preferences (for inspiration, not specific dish generation)
    const classicDishKeywords = {
      'carbonara': ['carbonara', 'pasta carbonara'],
      'pizza': ['pizza', 'margherita', 'pepperoni'],
      'risotto': ['risotto', 'mushroom risotto'],
      'sushi': ['sushi', 'maki', 'nigiri'],
      'ramen': ['ramen', 'noodle soup'],
      'taco': ['taco', 'tacos'],
      'curry': ['curry', 'curries'],
      'biryani': ['biryani', 'rice dish'],
      'pad thai': ['pad thai', 'thai noodles'],
      'lasagna': ['lasagna', 'lasagne'],
      'enchiladas': ['enchiladas', 'mexican wrap'],
    };

    // Check if user is asking for inspiration from classic dishes
    for (const [classicDish, keywords] of Object.entries(classicDishKeywords)) {
      if (keywords.some(keyword => lowerUserInput.includes(keyword) || lowerMessage.includes(keyword))) {
        // Check if this is a preference request (not a specific dish request)
        const preferenceKeywords = ['inspired by', 'like', 'similar to', 'based on', 'inspired'];
        const isPreferenceRequest = preferenceKeywords.some(pref => 
          lowerUserInput.includes(pref) || lowerMessage.includes(pref)
        );
        
        if (isPreferenceRequest) {
          return {
            type: 'classic_dish' as const,
            classicDish,
            message: `I can generate a dish inspired by ${classicDish} for you. This will create a new dish with ${classicDish} elements. Would you like me to generate this?`,
            modification: `inspired by ${classicDish}`
          };
        }
      }
    }

    // 7. Generic ingredient modifications (catch-all for additions)
    if (hasAddKeyword || lowerUserInput.includes('banana') || lowerUserInput.includes('spicy') || lowerUserInput.includes('sweet')) {
      return {
        type: 'ingredient' as const,
        message: `I can modify the current dish with your requested changes. This will update the recipe. Would you like me to apply this modification?`,
        modification: userInput
      };
    }

    return null;
  };



  const handleSend = async () => {
    if (!input.trim() || isAnyWaiting) return;
    
    const userMessage = input.trim();
    console.log('ChatScreen: handleSend called with:', userMessage);
    

    
    setIsWaitingForResponse(true);
    addChatMessage(userMessage, true);
    
    try {
      // Get the current dish context (either currentDish or pendingDishContext)
      const dishContext = currentDish || pendingDishContext;
      console.log('ChatScreen: dishContext:', dishContext?.title);
      console.log('ChatScreen: currentDish:', currentDish?.title);
      console.log('ChatScreen: pendingDishContext:', pendingDishContext?.title);
      console.log('ChatScreen: Full dishContext object:', dishContext);
      
      // Handle off-topic conversations
      if (detectConversationType(userMessage) === 'off_topic') {
        addChatMessage("I'm here to help with cooking and recipes! Let's talk about food, ingredients, or cooking techniques. What would you like to know?", false);
        setIsWaitingForResponse(false);
        setInput('');
        return;
      }
      
      // Check if user is asking for a new dish idea
      const conversationType = detectConversationType(userMessage);
      console.log('ChatScreen: Conversation type detected:', conversationType);
      
      if (conversationType === 'recipe_request') {
        // Use the new dish suggestion endpoint
        const suggestionData = await getChatDishSuggestion(userMessage, preferences);
        
        console.log('ChatScreen: Backend suggestion data:', suggestionData);
        console.log('ChatScreen: Has completeDish?', !!suggestionData.completeDish);
        console.log('ChatScreen: Has chatSummary?', !!suggestionData.chatSummary);
        
        // Check if we have complete dish data
        if (suggestionData.completeDish) {
          // Create a proper dish suggestion message using the complete dish data
          const dishSuggestionMessage = `How about trying "${suggestionData.completeDish.title}"? ${suggestionData.completeDish.description}`;
          addChatMessage(dishSuggestionMessage, false);
          // Store the pending dish context for future modifications
          setPendingDishContext(suggestionData.completeDish);
          
          // Store the original user message for later context extraction after dish generation
          console.log('ChatScreen: Storing original user message for context:', userMessage);
          
          // Set up the suggestion with complete dish data and original user message
          setPendingSuggestion({
            type: 'dish',
            dishName: suggestionData.completeDish.title,
            message: `Load "${suggestionData.completeDish.title}" into the app?`,
            completeDish: suggestionData.completeDish,
            originalUserMessage: userMessage // Store the original user message for context
          });
          setShowConfirmation(true);
        } else {
          console.error('ChatScreen: Backend did not return completeDish data');
          addChatMessage("I couldn't generate a complete dish suggestion. Please try again.", false);
        }
      } else if (conversationType === 'recipe_modification') {
        // Handle recipe modifications
        console.log('ChatScreen: Processing recipe modification');
        console.log('ChatScreen: Current dish exists:', !!currentDish);
        console.log('ChatScreen: Pending dish context exists:', !!pendingDishContext);
        
        if (currentDish) {
          // There's a current dish, modify it
          console.log('ChatScreen: Modifying current dish:', currentDish.title);
          setIsProcessingModification(true);
          
          try {
            const modificationResult = await modifyRecipe(userMessage, currentDish);
            
            console.log('Modification result:', modificationResult); // Debug log
            
            if (modificationResult) {
              const { isTransformative, summary, updatedDish } = modificationResult;
              
              console.log('Modification successful:', { isTransformative, summary, updatedDish }); // Debug log
              
              // Add detailed success message to chat with specific changes
              const successMessage = isTransformative 
                ? `✨ ${summary}`
                : `✅ ${summary}`;
              
              addChatMessage(successMessage, false);
              
              // Set up the suggestion like regular dish creation (no View Recipe button)
              const confirmationMessage = `Load "${updatedDish.title}" into the app?`;
              setPendingSuggestion({
                type: 'dish',
                dishName: updatedDish.title,
                message: confirmationMessage,
                completeDish: updatedDish,
                originalUserMessage: userMessage
              });
              setShowConfirmation(true);
            } else {
              // Fallback message - but this should rarely happen if modification was successful
              console.warn('Modification result was null/undefined'); // Debug log
              addChatMessage(`I've updated your ${currentDish.title} recipe based on your request.`, false);
            }
          } catch (error) {
            console.error('Modification error:', error);
            setError('We couldn\'t process your request. Please try again.');
          } finally {
            setIsProcessingModification(false);
          }
        } else if (pendingDishContext) {
          // There's a pending dish suggestion, modify it instead of creating a new dish
          console.log('ChatScreen: Modifying pending dish context:', pendingDishContext.title);
          setIsProcessingModification(true);
          
          try {
            // Create a temporary dish object from the pending context
            const tempDish = {
              id: 'temp-' + Date.now(),
              title: pendingDishContext.title,
              description: pendingDishContext.description,
              image: pendingDishContext.image,
              // Handle both flat structure (from backend) and nested structure (from frontend)
              recipe: pendingDishContext.recipe || {
                ingredients: pendingDishContext.ingredients || [],
                instructions: pendingDishContext.instructions || [],
                nutrition: pendingDishContext.nutrition || {},
                estimated_time: pendingDishContext.estimated_time || '30 minutes'
              },
              timestamp: new Date()
            };
            
            console.log('ChatScreen: pendingDishContext structure:', pendingDishContext);
            console.log('ChatScreen: tempDish structure:', tempDish);
            
            // Temporarily set the current dish to modify it
            setCurrentDish(tempDish);
            
            const modificationResult = await modifyRecipe(userMessage, tempDish);
            
            console.log('Pending dish modification result:', modificationResult); // Debug log
            
            if (modificationResult) {
              const { isTransformative, summary, updatedDish } = modificationResult;
              
              console.log('Pending dish modification successful:', { isTransformative, summary }); // Debug log
              
              // Add detailed success message to chat with specific changes
              const successMessage = isTransformative 
                ? `✨ ${summary}`
                : `✅ ${summary}`;
              
              addChatMessage(successMessage, false);
              
              // Get the updated recipe data from the modification result
              // The modifyRecipe function now returns the updated dish data
              const updatedRecipe = updatedDish?.recipe || tempDish.recipe;
              
              // Update the pending dish context with the modified version
              setPendingDishContext({
                ...pendingDishContext,
                title: updatedDish?.title || tempDish.title,
                description: updatedDish?.description || tempDish.description,
                image: updatedDish?.image || tempDish.image,
                recipe: updatedRecipe // Use the updated recipe from the modification result
              });
              
              console.log('ChatScreen: Updated pendingDishContext with recipe:', updatedRecipe);
              
              // Set up the suggestion for the inline buttons with specific change context
              // Set up the suggestion like regular dish creation (no View Recipe button)
              const confirmationMessage = `Load "${updatedDish.title}" into the app?`;
              setPendingSuggestion({
                type: 'dish',
                dishName: updatedDish.title,
                message: confirmationMessage,
                completeDish: updatedDish,
                originalUserMessage: userMessage
              });
              setShowConfirmation(true);
            } else {
              // Fallback message - but this should rarely happen if modification was successful
              console.warn('Pending dish modification result was null/undefined'); // Debug log
              addChatMessage(`I've updated your ${tempDish.title} recipe based on your request.`, false);
            }
          } catch (error) {
            console.error('Modification error:', error);
            setError('We couldn\'t process your request. Please try again.');
          } finally {
            setIsProcessingModification(false);
            // Clear the temporary current dish
            setCurrentDish(null);
          }
        } else {
          // No current dish or pending context, treat as a new dish request with modification preferences
          console.log('ChatScreen: No dish context found, treating as new dish request');
          
          // Include conversation context for better dish generation
          const conversationSummary = generateConversationSummary();
          const enhancedUserMessage = conversationSummary 
            ? `${userMessage} (Context: ${conversationSummary})`
            : userMessage;
          
          // Create enhanced preferences that include ingredient preferences from conversation context
          const enhancedPreferences = {
            ...preferences,
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
          
          console.log('ChatScreen: Enhanced preferences:', enhancedPreferences);
          console.log('ChatScreen: Enhanced user message:', enhancedUserMessage);
          
          const suggestionData = await getChatDishSuggestion(enhancedUserMessage, enhancedPreferences);
          
          // Add the chat summary to the conversation
          addChatMessage(suggestionData.chatSummary, false);
          
          // Set up the suggestion with complete dish data
          setPendingSuggestion({
            type: 'dish',
            dishName: suggestionData.completeDish.title,
            message: `Load "${suggestionData.completeDish.title}" into the app?`,
            completeDish: suggestionData.completeDish
          });
          setShowConfirmation(true);
        }
      } else {
        // Force all other conversation types to use dish suggestion flow
        // This ensures we never return full recipes directly in chat
        console.log('ChatScreen: Forcing dish suggestion flow for conversation type:', conversationType);
        
        try {
          // Include conversation context for better AI responses
          const conversationSummary = generateConversationSummary();
          const enhancedUserMessage = conversationSummary 
            ? `${userMessage} (Context: ${conversationSummary})`
            : userMessage;
          
          // Use the dish suggestion endpoint instead of direct chat
          const suggestionData = await getChatDishSuggestion(enhancedUserMessage, preferences);
          
          console.log('ChatScreen: Backend suggestion data (else clause):', suggestionData);
          console.log('ChatScreen: Has completeDish?', !!suggestionData.completeDish);
          console.log('ChatScreen: Has chatSummary?', !!suggestionData.chatSummary);
          
          // Check if we have complete dish data
          if (suggestionData.completeDish) {
            // Create a proper dish suggestion message using the complete dish data
            const dishSuggestionMessage = `How about trying "${suggestionData.completeDish.title}"? ${suggestionData.completeDish.description}`;
            addChatMessage(dishSuggestionMessage, false);
            // Store the pending dish context for future modifications
            setPendingDishContext(suggestionData.completeDish);
            
            // Store the original user message for later context extraction after dish generation
            setPendingSuggestion({
              type: 'dish',
              dishName: suggestionData.completeDish.title,
              message: `Load "${suggestionData.completeDish.title}" into the app?`,
              completeDish: suggestionData.completeDish,
              originalUserMessage: userMessage
            });
            setShowConfirmation(true);
          } else {
            console.error('ChatScreen: Backend did not return completeDish data (else clause)');
            addChatMessage("I couldn't generate a complete dish suggestion. Please try again.", false);
          }
        } catch (error) {
          console.error('ChatScreen: Error in dish suggestion flow:', error);
          addChatMessage("I'm having trouble processing your request. Please try again.", false);
        }
      }
      
      // Old logic removed - all conversation types now use dish suggestion flow
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setIsWaitingForResponse(false);
    setInput('');
  };

  const handleConfirmSuggestion = async () => {
    if (pendingSuggestion) {
      setShowConfirmation(false);
      setPendingSuggestion(null);
      
      // Clear pending confirmation to allow auto-generation
      setIsPendingConfirmation(false);
      console.log('ChatScreen: Set isPendingConfirmation=false to allow auto-generation');
      
      // Clear pending dish context when confirming a dish
      if (pendingSuggestion.type === 'dish') {
        setPendingDishContext(null);
      }
      
      // Show loading message for dish loading
      if (pendingSuggestion.type === 'dish') {
        setIsLoadingDish(true);
        addChatMessage("Loading dish into the app...", false);
      } else {
        setIsConfirmingDish(true);
      }
      
      // Add loading message based on the type
      switch (pendingSuggestion.type) {
        case 'dish':
          if (pendingSuggestion.completeDish) {
            // We have complete dish data, create the dish directly
            const completeDish = pendingSuggestion.completeDish;
            const newDish = {
              id: Date.now().toString(),
              image: '', // Will be generated when dish is loaded
              title: completeDish.title,
              description: completeDish.description,
              recipe: {
                ingredients: completeDish.ingredients,
                instructions: completeDish.instructions,
                nutrition: completeDish.nutrition,
                estimated_time: completeDish.estimated_time
              },
              timestamp: new Date(),
            };
            console.log('ChatScreen: Created new dish with image URL:', newDish.image);
            console.log('ChatScreen: Full dish object:', newDish);
            setCurrentDish(newDish);
            setDishHistory(prev => [newDish, ...prev]);
            trackDishInHistory(newDish); // Track in conversation history
            
            // Extract and add context from the original user message AFTER dish is created
            if (pendingSuggestion.originalUserMessage) {
              console.log('ChatScreen: Extracting context from original message after dish creation:', pendingSuggestion.originalUserMessage);
              // Preprocess text to handle contractions like "let's" -> "lets"
              const preprocessedText = pendingSuggestion.originalUserMessage.toLowerCase()
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
              console.log('ChatScreen: All words from original message:', words);
              // Create a comprehensive list of known food ingredients and terms
              const knownFoodItems = [
                // Proteins
                'beef', 'pork', 'chicken', 'turkey', 'lamb', 'duck', 'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallops', 'mussels', 'clams', 'oysters', 'tofu', 'tempeh', 'seitan', 'eggs',
                // Vegetables
                'tomato', 'tomatoes', 'onion', 'onions', 'garlic', 'ginger', 'carrot', 'carrots', 'celery', 'bell pepper', 'peppers', 'mushrooms', 'mushroom', 'spinach', 'kale', 'lettuce', 'cabbage', 'broccoli', 'cauliflower', 'zucchini', 'eggplant', 'potato', 'potatoes', 'sweet potato', 'corn', 'peas', 'beans', 'lentils', 'chickpeas', 'avocado', 'cucumber', 'radish',
                // Fruits
                'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'lemon', 'lemons', 'lime', 'limes', 'mango', 'mangoes', 'pineapple', 'strawberry', 'strawberries', 'blueberry', 'blueberries', 'raspberry', 'raspberries', 'blackberry', 'blackberries', 'cherry', 'cherries', 'grape', 'grapes', 'peach', 'peaches', 'pear', 'pears',
                // Dairy
                'cheese', 'cheddar', 'mozzarella', 'parmesan', 'brie', 'camembert', 'goat cheese', 'feta', 'ricotta', 'cream cheese', 'butter', 'milk', 'cream', 'yogurt', 'sour cream',
                // Grains & Carbs
                'rice', 'pasta', 'noodles', 'bread', 'quinoa', 'barley', 'oats', 'wheat', 'flour', 'tortilla', 'tortillas', 'baguette', 'bagel', 'croissant',
                // Herbs & Spices
                'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'parsley', 'cilantro', 'mint', 'dill', 'chives', 'paprika', 'cumin', 'turmeric', 'cinnamon', 'nutmeg', 'cardamom', 'coriander', 'fennel', 'anise',
                // Nuts & Seeds
                'almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans', 'cashew', 'cashews', 'pistachio', 'pistachios', 'peanut', 'peanuts', 'sunflower seeds', 'pumpkin seeds', 'sesame', 'tahini',
                // Condiments & Sauces
                'olive oil', 'coconut oil', 'vinegar', 'balsamic', 'soy sauce', 'fish sauce', 'hot sauce', 'sriracha', 'mustard', 'ketchup', 'mayo', 'mayonnaise', 'pesto', 'salsa', 'hummus',
                // Other
                'honey', 'maple syrup', 'sugar', 'salt', 'pepper', 'vanilla', 'chocolate', 'cocoa', 'coconut', 'wine', 'beer', 'stock', 'broth'
              ];
              
              // Detect if this is a modification request
              const isModification = /\b(replace|change|swap|substitute|instead of|with)\b/i.test(userMessage);
              
              let meaningfulWords = words.filter(word => {
                const lowerWord = word.toLowerCase();
                // Only include words that are known food items and longer than 2 characters
                return word.length > 2 && knownFoodItems.includes(lowerWord);
              });
              
              // For modifications, remove the old ingredient being replaced
              if (isModification) {
                console.log('ChatScreen: Detected modification, filtering out old ingredients');
                
                // Common modification patterns to identify old vs new ingredients
                const modificationPatterns = [
                  /replace\s+(?:the\s+)?(\w+)\s+with\s+(\w+)/i,
                  /change\s+(?:the\s+)?(\w+)\s+to\s+(\w+)/i, 
                  /swap\s+(?:the\s+)?(\w+)\s+for\s+(\w+)/i,
                  /substitute\s+(?:the\s+)?(\w+)\s+with\s+(\w+)/i,
                  /(\w+)\s+instead\s+of\s+(?:the\s+)?(\w+)/i, // new instead of old
                  /use\s+(\w+)\s+instead\s+of\s+(?:the\s+)?(\w+)/i, // new instead of old
                  /only\s+with\s+(\w+)\s+instead\s+of\s+(?:the\s+)?(\w+)/i, // new instead of old
                  /(?:make\s+)?(?:this\s+)?(?:dish\s+)?only\s+with\s+(\w+)/i // only with new ingredient
                ];
                
                let oldIngredients = [];
                let newIngredients = [];
                
                for (const pattern of modificationPatterns) {
                  const match = userMessage.match(pattern);
                  if (match) {
                    if (pattern.source.includes('instead of')) {
                      // For "instead of" patterns, the order is reversed
                      newIngredients.push(match[1].toLowerCase());
                      oldIngredients.push(match[2].toLowerCase());
                    } else {
                      // For other patterns, first capture is old, second is new
                      oldIngredients.push(match[1].toLowerCase());
                      newIngredients.push(match[2].toLowerCase());
                    }
                    break;
                  }
                }
                
                console.log('ChatScreen: Detected old ingredients to remove:', oldIngredients);
                console.log('ChatScreen: Detected new ingredients to keep:', newIngredients);
                
                // Filter out old ingredients, keep new ones
                meaningfulWords = meaningfulWords.filter(word => {
                  const lowerWord = word.toLowerCase();
                  return !oldIngredients.includes(lowerWord);
                });
                
                console.log('ChatScreen: Filtered meaningful words after removing old ingredients:', meaningfulWords);
              }
              
              console.log('ChatScreen: Final meaningful words for context:', meaningfulWords);
              
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
              console.log('ChatScreen: Final context after dish creation:', finalContext);
              updateConversationContext({
                preferences: finalContext
              });
            }
            
            setReadyToNavigate(true);
            setIsConfirmingDish(false);
            setIsLoadingDish(false); // Clear loading state when dish is loaded
            break;
          } else if (pendingSuggestion.dishName) {
            // Handle specific dish requests
            if (pendingSuggestion.modification) {
              // User asked for a specific dish with modifications
              console.log('ChatScreen: Generating specific dish with modification and preferences:', preferences);
              await generateSpecificDish(pendingSuggestion.dishName, pendingSuggestion.modification, preferences);
            } else {
              // User asked for a specific dish without modifications
              // Use the stored original user message as chat context
              const chatContext = pendingSuggestion.originalUserMessage || undefined;
              console.log('ChatScreen: Generating specific dish with original user message as context:', chatContext);
              await generateSpecificDish(pendingSuggestion.dishName, chatContext, preferences);
            }
            setIsConfirmingDish(false);
            setIsLoadingDish(false); // Clear loading state
          } else {
            await generateDish();
            setIsConfirmingDish(false);
            setIsLoadingDish(false); // Clear loading state
          }
          if (navigation && navigation.navigate) navigation.navigate('Dish' as never);
          break;
        case 'dietary':
          // Apply dietary preference for this generation only
          if (pendingSuggestion.diet) {
            const dietMapping = {
              'vegan': 'Vegan',
              'vegetarian': 'Vegetarian', 
              'gluten-free': 'Gluten-Free',
              'keto': 'Low Carb',
              'diabetic': 'Low Sugar',
              'dairy-free': 'Dairy-Free'
            };
            const mappedDiet = dietMapping[pendingSuggestion.diet];
            if (mappedDiet) {
              // Merge with existing preferences to preserve all preferences
              const mergedPreferences = {
                ...preferences,
                dietaryRestrictions: [...(preferences.dietaryRestrictions || []), mappedDiet]
              };
              console.log('ChatScreen: Merged preferences for dietary change:', mergedPreferences);
              // Save the merged preferences to global state so they persist
              updatePreferences(mergedPreferences);
              await generateDish(mergedPreferences);
            } else {
              await generateDish();
            }
          } else {
            await generateDish();
          }
          setIsConfirmingDish(false);
          setIsLoadingDish(false); // Clear loading state
          if (navigation && navigation.navigate) navigation.navigate('Dish' as never);
          break;
        case 'cuisine':
          // Apply cuisine preference for this generation only
          if (pendingSuggestion.cuisine) {
            const cuisineMapping = {
              'italian': 'Italian',
              'japanese': 'Japanese',
              'mexican': 'Mexican',
              'indian': 'Indian',
              'thai': 'Thai',
              'french': 'French'
            };
            const mappedCuisine = cuisineMapping[pendingSuggestion.cuisine];
            if (mappedCuisine) {
              // Merge with existing preferences to preserve all preferences
              const mergedPreferences = {
                ...preferences,
                cuisines: [...(preferences.cuisines || []), mappedCuisine]
              };
              console.log('ChatScreen: Merged preferences for cuisine change:', mergedPreferences);
              // Save the merged preferences to global state so they persist
              updatePreferences(mergedPreferences);
              await generateDish(mergedPreferences);
            } else {
              await generateDish();
            }
          } else {
            await generateDish();
          }
          setIsConfirmingDish(false);
          setIsLoadingDish(false); // Clear loading state
          if (navigation && navigation.navigate) navigation.navigate('Dish' as never);
          break;
        case 'plate_style':
          // Apply plate style preference by modifying the current dish
          const dishContext = currentDish || pendingDishContext;
          if (pendingSuggestion.plateStyle && dishContext) {
            // Modify the current dish instead of generating a new one
            const modification = `Change to ${pendingSuggestion.plateStyle}`;
            const modificationResult = await modifyRecipe(modification, dishContext);
            
            if (modificationResult) {
              const { isTransformative, summary } = modificationResult;
              
              // Add detailed success message to chat with specific changes
              const successMessage = isTransformative 
                ? `✨ ${summary}`
                : `✅ ${summary}`;
              
              addChatMessage(successMessage, false);
            } else {
              addChatMessage(`Updated your ${dishContext.title} to be served as a ${pendingSuggestion.plateStyle}.`, false);
            }
            
            setIsConfirmingDish(false);
          } else {
            // Fallback to generating new dish if no current dish
            if (pendingSuggestion.plateStyle) {
              const plateStyleMapping = {
                'salad bowl': 'Salad Bowl',
                'comfort plate': 'Comfort Plate',
                'stir fry plate': 'Stir Fry Plate',
                'bento box': 'Bento Box',
                'wrap': 'Wrap',
                'soup / stew': 'Soup / Stew',
                'sandwich / toast': 'Sandwich / Toast',
                'finger food': 'Finger Food'
              };
              const mappedPlateStyle = plateStyleMapping[pendingSuggestion.plateStyle];
              if (mappedPlateStyle) {
                const mergedPreferences = {
                  ...preferences,
                  plateStyles: [...(preferences.plateStyles || []), mappedPlateStyle]
                };
                updatePreferences(mergedPreferences);
                await generateDish(mergedPreferences);
              } else {
                await generateDish();
              }
            } else {
              await generateDish();
            }
            setIsConfirmingDish(false);
            setIsLoadingDish(false); // Clear loading state
            if (navigation && navigation.navigate) navigation.navigate('Dish' as never);
          }
          break;
        case 'classic_dish':
          // Apply classic dish preference for this generation only
          if (pendingSuggestion.classicDish) {
            const classicDishMapping = {
              'carbonara': 'Carbonara',
              'pizza': 'Pizza',
              'risotto': 'Risotto',
              'sushi': 'Sushi',
              'ramen': 'Ramen',
              'taco': 'Taco',
              'curry': 'Curry',
              'biryani': 'Biryani',
              'pad thai': 'Pad Thai',
              'lasagna': 'Lasagna',
              'enchiladas': 'Enchiladas'
            };
            const mappedClassicDish = classicDishMapping[pendingSuggestion.classicDish];
            if (mappedClassicDish) {
              // Merge with existing preferences to preserve all preferences
              const mergedPreferences = {
                ...preferences,
                classicDishes: [...(preferences.classicDishes || []), mappedClassicDish]
              };
              console.log('ChatScreen: Merged preferences for classic dish change:', mergedPreferences);
              // Save the merged preferences to global state so they persist
              updatePreferences(mergedPreferences);
              await generateDish(mergedPreferences);
            } else {
              await generateDish();
            }
          } else {
            await generateDish();
          }
          setIsConfirmingDish(false);
          setIsLoadingDish(false); // Clear loading state
          if (navigation && navigation.navigate) navigation.navigate('Dish' as never);
          break;
        case 'ingredient_preference':
          // Apply ingredient preference for this generation only
          if (pendingSuggestion.ingredientPreference) {
            // Merge with existing preferences to preserve other preferences
            const mergedPreferences = {
              ...preferences,
              ingredientPreferences: [...(preferences.ingredientPreferences || []), pendingSuggestion.ingredientPreference]
            };
            console.log('ChatScreen: Merged preferences for ingredient preference:', mergedPreferences);
            // Save the merged preferences to global state so they persist
            updatePreferences(mergedPreferences);
            await generateDish(mergedPreferences);
          } else {
            await generateDish();
          }
          setIsConfirmingDish(false);
          setIsLoadingDish(false); // Clear loading state
          if (navigation && navigation.navigate) navigation.navigate('Dish' as never);
          break;
        case 'ingredient':
          // Handle ingredient modifications - load the modified dish into the app
          console.log('ChatScreen: handleConfirmSuggestion - ingredient case');
          console.log('ChatScreen: pendingSuggestion:', pendingSuggestion);
          console.log('ChatScreen: showViewRecipe:', pendingSuggestion.showViewRecipe);
          console.log('ChatScreen: modification:', pendingSuggestion.modification);
          
          if (pendingSuggestion.showViewRecipe) {
            // This is a "View Recipe" action after a modification
            setIsLoadingDish(true);
            addChatMessage("Loading modified dish into the app...", false);
            
            // Get the current dish context (either currentDish or pendingDishContext)
            // For modifications, prefer pendingDishContext as it contains the updated recipe
            const dishContext = pendingDishContext || currentDish;
            
            console.log('ChatScreen: View Recipe - dishContext:', dishContext?.title);
            console.log('ChatScreen: View Recipe - dishContext.recipe:', dishContext?.recipe);
            console.log('ChatScreen: View Recipe - dishContext.image:', dishContext?.image ? 'Has image' : 'No image');
            
            if (dishContext) {
              // Create a new dish from the modified context
              const newDish = {
                id: Date.now().toString(),
                image: dishContext.image || dishContext.newImageUrl || '', // Preserve existing image from modification
                title: dishContext.title,
                description: dishContext.description,
                recipe: dishContext.recipe || {
                  ingredients: dishContext.ingredients || ["Modified ingredients"],
                  instructions: dishContext.instructions || ["Modified instructions"],
                  nutrition: dishContext.nutrition || {
                    calories: 300,
                    protein: 25,
                    carbs: 30,
                    fat: 12,
                    fiber: 5,
                    sugar: 8,
                    sodium: 400
                  },
                  estimated_time: dishContext.estimated_time || "30 minutes"
                },
                timestamp: new Date(),
              };
              
              console.log('ChatScreen: View Recipe - newDish.recipe:', newDish.recipe);
              console.log('ChatScreen: View Recipe - newDish.image:', newDish.image ? 'Has image' : 'No image');
              console.log('ChatScreen: View Recipe - newDish.image URL:', newDish.image);
              
              setCurrentDish(newDish);
              setDishHistory(prev => [newDish, ...prev]);
              trackDishInHistory(newDish); // Track in conversation history
              setReadyToNavigate(true);
              setIsLoadingDish(false);
              
              // Clear the pending dish context since we've now loaded it into the app
              setPendingDishContext(null);
            } else {
              // Fallback: generate a new dish
              await generateDish();
              setIsLoadingDish(false);
            }
          } else if (pendingSuggestion.modification) {
            // This is a regular modification confirmation - apply the modification
            const dishContext = currentDish || pendingDishContext;
            if (dishContext) {
              console.log('ChatScreen: Applying ingredient modification:', pendingSuggestion.modification);
              
              try {
                const modificationResult = await modifyRecipe(pendingSuggestion.modification, dishContext);
                
                if (modificationResult) {
                  const { isTransformative, summary, updatedDish } = modificationResult;
                  
                  // Add detailed success message to chat with specific changes
                  const successMessage = isTransformative 
                    ? `✨ ${summary}`
                    : `✅ ${summary}`;
                  
                  addChatMessage(successMessage, false);
                  
                  // Update the pending dish context with the modified version
                  setPendingDishContext({
                    ...dishContext,
                    title: updatedDish?.title || dishContext.title,
                    description: updatedDish?.description || dishContext.description,
                    image: updatedDish?.image || dishContext.image,
                    recipe: updatedDish?.recipe || dishContext.recipe
                  });
                  
                  // Set up the suggestion like regular dish creation (no View Recipe button)
                  const confirmationMessage = `Load "${updatedDish?.title || dishContext.title}" into the app?`;
                  setPendingSuggestion({
                    type: 'dish',
                    dishName: updatedDish?.title || dishContext.title,
                    message: confirmationMessage,
                    completeDish: {
                      ...dishContext,
                      title: updatedDish?.title || dishContext.title,
                      description: updatedDish?.description || dishContext.description,
                      image: updatedDish?.image || dishContext.image,
                      recipe: updatedDish?.recipe || dishContext.recipe
                    },
                    originalUserMessage: pendingSuggestion.modification
                  });
                  setShowConfirmation(true);
                } else {
                  addChatMessage(`I've updated your ${dishContext.title} recipe based on your request.`, false);
                }
              } catch (error) {
                console.error('Modification error:', error);
                addChatMessage(`Sorry, I couldn't apply that modification. Please try again.`, false);
              }
            } else {
              addChatMessage(`Sorry, I couldn't find a dish to modify. Please try again.`, false);
            }
          } else {
            // This is a regular modification confirmation, just continue chatting
            setIsConfirmingDish(false);
          }
          break;
        case 'cooking_method':
          if (pendingSuggestion && pendingSuggestion.modification) {
            await modifyRecipe(pendingSuggestion.modification, currentDish);
            setIsConfirmingDish(false);
            
            // If this is a modification confirmation, just close it (the success message was already shown)
            if (pendingSuggestion.showViewRecipe) {
              // The modification was already applied, just navigate to recipe if requested
              if (navigation && navigation.navigate) navigation.navigate('Recipe' as never);
            }
          }
          break;
      }
    }
  };

  const handleRejectSuggestion = () => {
    // If this is a modification confirmation and user chose "Continue Chatting"
    if (pendingSuggestion?.type === 'ingredient' && pendingSuggestion?.modification) {
      // Preserve the modification context for future interactions
      const modificationContext = {
        originalDish: pendingDishContext,
        modification: pendingSuggestion.modification,
        timestamp: new Date()
      };
      
      // Store modification context for future use
      updateConversationContext({
        modifications: [...conversationContext.modifications, modificationContext]
      });
      
      // Add the modification to chat history as context
      addChatMessage(`💡 Modification context saved: "${pendingSuggestion.modification}" applied to ${pendingDishContext?.title || 'the dish'}. Future requests will consider this preference.`, false);
      
      console.log('ChatScreen: Preserved modification context:', modificationContext);
    }
    
    setShowConfirmation(false);
    setPendingSuggestion(null);
    setPendingDishContext(null); // Clear pending dish context on rejection
    
    // Clear pending confirmation to restore normal state
    setIsPendingConfirmation(false);
    console.log('ChatScreen: Set isPendingConfirmation=false after rejection');
  };

  const handleRetry = () => {
    setError(null);
    setInput('');
  };

  const handleSaveWork = () => {
    if (currentDish) {
      finalizeDish();
      Alert.alert('Work Saved!', 'Your current dish has been saved to history.');
    }
  };

  const handleStartFresh = () => {
    setShowStartFreshModal(true);
  };

  const handleConfirmStartFresh = () => {
    setShowStartFreshModal(false);
    // Save current dish to history if it exists
    if (currentDish) {
      finalizeDish();
    }
    // Clear preferences, chat messages, and reset
    clearPreferences();
    clearChatMessages();
    clearConversationContext();
    setInput('');
    setCurrentDish(null);
    setPendingDishContext(null); // Clear pending dish context
  };

  const handleCancelStartFresh = () => {
    setShowStartFreshModal(false);
  };



  const handleCopyMessage = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      // Text copied silently without system popup
    } catch (error) {
      // Silent error handling - could add a toast notification here if needed
      console.error('Failed to copy message:', error);
    }
  };

  // Generate conversation summary for future context
  const generateConversationSummary = () => {
    const { modifications, preferences, dishHistory } = conversationContext;
    
    let summary = '';
    
    // Add modification history
    if (modifications.length > 0) {
      summary += 'Recent modifications: ';
      summary += modifications.map(m => `"${m.modification}" to ${m.originalDish?.title || 'dish'}`).join(', ');
      summary += '. ';
    }
    
    // Add preference history (including all preference types)
    if (preferences.length > 0) {
      const ingredientPrefs = preferences.filter(p => p.type === 'ingredient').map(p => p.value);
      const stylePrefs = preferences.filter(p => p.type === 'style').map(p => p.value);
      const dishTypePrefs = preferences.filter(p => p.type === 'dishType').map(p => p.value);
      const classicDishPrefs = preferences.filter(p => p.type === 'classicDish').map(p => p.value);
      const dietaryPrefs = preferences.filter(p => p.type === 'dietary').map(p => p.value);
      
      if (ingredientPrefs.length > 0) {
        summary += `User wants to use: ${ingredientPrefs.join(', ')}. `;
      }
      
      if (stylePrefs.length > 0) {
        summary += `User prefers: ${stylePrefs.join(', ')} style. `;
      }
      
      if (dishTypePrefs.length > 0) {
        summary += `User wants: ${dishTypePrefs.join(', ')} format. `;
      }
      
      if (classicDishPrefs.length > 0) {
        summary += `User mentioned: ${classicDishPrefs.join(', ')} dishes. `;
      }
      
      if (dietaryPrefs.length > 0) {
        summary += `User dietary preference: ${dietaryPrefs.join(', ')}. `;
      }
    }
    
    // Add dish history
    if (dishHistory.length > 0) {
      summary += 'Recent dishes: ';
      summary += dishHistory.map(d => d.title).join(', ');
      summary += '. ';
    }
    
    return summary;
  };

  // Track dish in conversation history when loaded into app
  const trackDishInHistory = (dish: any) => {
    if (dish?.title) {
      updateConversationContext({
        dishHistory: [
          {
            title: dish.title,
            description: dish.description || '',
            timestamp: new Date()
          },
          ...conversationContext.dishHistory.slice(0, 4) // Keep only last 5 dishes
        ]
      });
    }
  };

  // Detect and store ingredient preferences from user messages
  const detectAndStoreIngredientPreference = (userMessage: string) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Common ingredient keywords
    const ingredientKeywords = [
      'eggplant', 'eggplants', 'aubergine', 'aubergines',
      'tomato', 'tomatoes', 'potato', 'potatoes',
      'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna',
      'rice', 'pasta', 'bread', 'cheese', 'milk', 'eggs',
      'onion', 'onions', 'garlic', 'carrot', 'carrots',
      'spinach', 'kale', 'lettuce', 'cucumber', 'cucumbers',
      'bell pepper', 'bell peppers', 'mushroom', 'mushrooms',
      'zucchini', 'zucchinis', 'squash', 'pumpkin',
      'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges',
      'lemon', 'lemons', 'lime', 'limes', 'avocado', 'avocados'
    ];
    
    // Style and cuisine keywords
    const styleKeywords = [
      'spicy', 'mild', 'sweet', 'savory', 'creamy', 'crunchy', 'crispy',
      'italian', 'mexican', 'asian', 'indian', 'mediterranean', 'french', 'japanese', 'thai',
      'style', 'flavor', 'taste', 'cuisine'
    ];
    
    // Dish type and plate style keywords
    const dishTypeKeywords = [
      'sandwich', 'toast', 'wrap', 'salad', 'soup', 'stew', 'pasta', 'pizza',
      'bowl', 'plate', 'finger food', 'appetizer', 'main course', 'dessert',
      'breakfast', 'lunch', 'dinner', 'snack'
    ];
    
    // Classic dish references
    const classicDishKeywords = [
      'carbonara', 'risotto', 'paella', 'curry', 'pad thai', 'sushi', 'ramen',
      'lasagna', 'enchiladas', 'biryani', 'tacos', 'burger', 'pizza',
      'parmesan', 'alfredo', 'marinara', 'pesto'
    ];
    
    // Dietary preference keywords
    const dietaryKeywords = [
      'vegan', 'vegetarian', 'pescatarian', 'keto', 'paleo', 'low carb',
      'low fat', 'high protein', 'gluten free', 'dairy free', 'low sugar'
    ];
    
    const foundIngredients = ingredientKeywords.filter(ingredient => 
      lowerMessage.includes(ingredient)
    );
    
    const foundStyles = styleKeywords.filter(style => 
      lowerMessage.includes(style)
    );
    
    const foundDishTypes = dishTypeKeywords.filter(dishType => 
      lowerMessage.includes(dishType)
    );
    
    const foundClassicDishes = classicDishKeywords.filter(dish => 
      lowerMessage.includes(dish)
    );
    
    const foundDietary = dietaryKeywords.filter(diet => 
      lowerMessage.includes(diet)
    );
    
    // Store all detected preferences
    const newPreferences = [];
    
    if (foundIngredients.length > 0) {
      newPreferences.push(...foundIngredients.map(ingredient => ({
        type: 'ingredient' as const,
        value: ingredient,
        timestamp: new Date()
      })));
    }
    
    if (foundStyles.length > 0) {
      newPreferences.push(...foundStyles.map(style => ({
        type: 'style' as const,
        value: style,
        timestamp: new Date()
      })));
    }
    
    if (foundDishTypes.length > 0) {
      newPreferences.push(...foundDishTypes.map(dishType => ({
        type: 'dishType' as const,
        value: dishType,
        timestamp: new Date()
      })));
    }
    
    if (foundClassicDishes.length > 0) {
      newPreferences.push(...foundClassicDishes.map(dish => ({
        type: 'classicDish' as const,
        value: dish,
        timestamp: new Date()
      })));
    }
    
    if (foundDietary.length > 0) {
      newPreferences.push(...foundDietary.map(diet => ({
        type: 'dietary' as const,
        value: diet,
        timestamp: new Date()
      })));
    }
    
    if (newPreferences.length > 0) {
      updateConversationContext({
        preferences: [
          ...conversationContext.preferences.filter(p => !newPreferences.some(np => np.type === p.type && np.value === p.value)), // Remove duplicates
          ...newPreferences
        ]
      });
      
      console.log('ChatScreen: Stored preferences:', newPreferences);
    }
  };

  // Function to detect conversation type
  const detectConversationType = (message: string): 'recipe_request' | 'recipe_modification' | 'remix_transform' | 'general_chat' | 'off_topic' => {
    const lowerMessage = message.toLowerCase();
    
    // Check for off-topic first
    const offTopicKeywords = [
      'meaning of life', 'philosophy', 'politics', 'weather', 'sports',
      'movies', 'music', 'books', 'travel', 'work', 'job', 'school',
      'relationship', 'dating', 'marriage', 'family', 'kids',
      'health', 'medical', 'doctor', 'hospital', 'therapy'
    ];
    
    if (offTopicKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'off_topic';
    }
    
    // Recipe modification keywords (small tweaks) - CHECK THESE FIRST for current dish context
    const modificationKeywords = [
      'replace', 'change', 'modify', 'instead of', 'substitute', 'swap',
      'add more', 'less', 'remove', 'omit', 'skip', 'avoid',
      'prefer', 'like', 'don\'t like', 'hate', 'love', 'favorite',
      'make this', 'make it', 'turn this', 'adjust', 'tweak',
      '0 carbs', 'no carbs', 'low carb', 'high protein', 'low fat',
      'gluten free', 'dairy free', 'vegan', 'vegetarian', 'keto',
      'without', 'with less', 'with more', 'extra', 'additional',
      'spicy', 'mild', 'sweet', 'savory', 'creamy', 'crunchy',
      'italian style', 'mexican style', 'asian style', 'indian style', 'mediterranean style',
      'flavor', 'taste',
      // Add specific modification phrases
      'use my', 'use the', 'add my', 'add the', 'include my', 'include the',
      'put my', 'put the', 'add to this', 'add to the current', 'use in this', 'use in the current',
      'with this dish', 'in this dish', 'to this dish', 'in the current dish', 'to the current dish',
      'modify this', 'change this', 'update this', 'adjust this'
    ];
    
    // Check for recipe modifications FIRST (small tweaks to current dish)
    if (modificationKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'recipe_modification';
    }
    
    // Remix/transform keywords (creative transformations)
    // Only include specific phrases that clearly indicate transformations
    const remixKeywords = [
      'make it a', 'turn this into', 'transform', 'remix', 'remake',
      'make this a', 'convert this to', 'change this to',
      // Only include specific transformation phrases, not generic food words
    ];
    
    // Check for remix/transform requests (creative transformations)
    const matchingRemixKeywords = remixKeywords.filter(keyword => lowerMessage.includes(keyword));
    if (matchingRemixKeywords.length > 0) {
      console.log('ChatScreen: Remix keywords matched:', matchingRemixKeywords);
      console.log('ChatScreen: Message:', lowerMessage);
      return 'remix_transform';
    }
    
    // Recipe-related keywords (for new dish requests) - CHECK THESE LAST
    // Only include specific phrases that clearly indicate recipe requests
    const recipeKeywords = [
      'give me a recipe', 'suggest a dish', 'recommend a dish',
      'i need a recipe', 'i want a recipe', 'show me a recipe',
      'what can i make', 'what should i cook', 'what should i make',
      'new recipe', 'new dish', 'recipe for',
      'quick dinner', 'easy dinner', 'simple dinner',
      'lunch idea', 'breakfast idea', 'dinner idea',
      'make me', 'cook me',
      // Specific dish names that clearly indicate recipe requests
      'carbonara', 'pizza', 'risotto', 'sushi', 'ramen', 'taco', 'curry',
      'lasagna', 'enchiladas', 'pad thai', 'biryani'
    ];
    
    // Check for recipe requests LAST (new dishes)
    const matchingKeywords = recipeKeywords.filter(keyword => lowerMessage.includes(keyword));
    if (matchingKeywords.length > 0) {
      console.log('ChatScreen: Recipe keywords matched:', matchingKeywords);
      console.log('ChatScreen: Message:', lowerMessage);
      return 'recipe_request';
    }
    
    // Default to general chat
    return 'general_chat';
  };

  // Function to detect if user is asking for a new dish idea (not a specific dish)
  const isAskingForNewDish = (message: string): boolean => {
    const conversationType = detectConversationType(message);
    return conversationType === 'recipe_request';
  };

  const chatEmpty = chatMessages.length === 0;

  // Force ScrollView to update when keyboard state changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({
        contentContainerStyle: {
          flexGrow: 1,
          justifyContent: chatEmpty ? 'flex-start' : 'flex-end',
          paddingBottom: isKeyboardVisible ? keyboardHeight + 20 : 20,
          paddingHorizontal: 24,
          paddingTop: 10,
        }
      });
    }
  }, [isKeyboardVisible, keyboardHeight, chatEmpty]);

  const suggestedQuestions = [
    'What can I make with chicken and vegetables?',
    'I need a quick 30-minute dinner idea',
  ];

  // Show active preferences in the chat
  const activePreferences = [
    ...preferences.dietaryRestrictions,
    ...preferences.cuisines
  ].filter(Boolean);

  // Navigate to Dish screen only after dish is set and readyToNavigate is true
  useEffect(() => {
    if (readyToNavigate) {
      if (navigation && navigation.navigate) navigation.navigate('Dish' as never);
      setReadyToNavigate(false);
    }
  }, [readyToNavigate, navigation]);

  // Add navigation effect to clear loading states when leaving chat screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      // Clear all loading states when navigating away from chat screen
      setIsWaitingForResponse(false);
      setIsProcessingModification(false);
      setIsProcessingFusion(false);
      setIsConfirmingDish(false);
      setIsLoadingDish(false);
      setShowTypingIndicator(false);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    });

    return unsubscribe;
  }, [navigation, typingTimeout]);

  // Show error screen if there's an error
  if (error || imageError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <ErrorScreen
          title="Oops! Something Went Wrong"
          message={error || imageError || 'Unknown error occurred'}
          onRetry={() => {
            clearImageError();
            if (error) handleRetry();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} >
        <Header />
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: chatEmpty ? 'flex-start' : 'flex-end',
                paddingBottom: 20,  // Start with default, will be updated by useEffect
                paddingHorizontal: 24,
                paddingTop: 10,
              }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"  
            showsVerticalScrollIndicator={false}
          >
              <View style={styles.headerRow}>
                <CustomText style={styles.pageSubtitle}>
                  Let's talk about recipes!
                </CustomText>
              </View>
              {chatEmpty ? (
                <View style={styles.emptyState}>
                  <View style={styles.iconCircle}>
                    <FontAwesome name="comments" size={56} color="#67756a" />
                  </View>
                  <CustomText style={styles.emptyTitle}>Start a conversation</CustomText>
                  <CustomText style={styles.emptySubtitle}>
                    Ask me for a recipe. Or toss in your fridge contents. Let's build a dish.
                  </CustomText>
                  
                  <View style={styles.suggestedContainer}>
                    {suggestedQuestions.map((q, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.suggestedButton}
                        onPress={() => setInput(q)}
                      >
                        <CustomText style={styles.suggestedText}>"{q}"</CustomText>
                      </TouchableOpacity>
                    ))}
                    
                    {/* Context Tags - positioned below examples, near Start Fresh */}
                    {!showConfirmation && (
                      <ContextTags 
                        chatContext={currentDish?.chatContext}
                        preferences={currentDish?.preferences}
                        conversationContext={conversationContext}
                        onRemoveContext={(type, value) => {
                          console.log('ChatScreen: Removing context:', type, value);
                          removeConversationPreference(type, value);
                        }}
                      />
                    )}
                    
                    {/* Action buttons for clear */}
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.clearButton]}
                        onPress={handleStartFresh}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <FontAwesome name="times-circle" size={16} color="#67756a" />
                          <CustomText style={[styles.actionButtonText, styles.clearButtonText, { marginLeft: 8 }]}>Start Fresh</CustomText>
                        </View>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={{ height: 60 }} />
                  </View>
                </View>
              ) : (
                <>
                  {chatMessages.map((msg) => {
                    // Ensure message object is valid
                    if (!msg || typeof msg !== 'object') {
                      console.warn('Invalid message object:', msg);
                      return null;
                    }
                    
                    // Ensure text is a string
                    const messageText = msg.text || '';
                    if (!messageText || !messageText.trim()) {
                      console.warn('Empty message text:', msg);
                      return null;
                    }
                    
                    // Detect if this is a known success message
                    const isSuccessMsg = (
                      messageText.startsWith("I've modified the recipe with your changes:") ||
                      messageText === 'Dish loaded successfully!' ||
                      messageText === 'Dish generated successfully!' ||
                      messageText === 'New dish generated!' ||
                      messageText === 'Dish generated with your preferences!' ||
                      messageText === 'Recipe modified successfully!'
                    );
                    if (!msg.isUser && isSuccessMsg) {
                      return <ActionMessage key={msg.id} type="success" message={messageText} />;
                    }
                    return (
                      <View key={msg.id} style={[
                        styles.messageContainer,
                        msg.isUser ? styles.userMessageContainer : styles.aiMessageContainer
                      ]}>
                        {!msg.isUser && !isSuccessMsg && (
                          <TouchableOpacity 
                            style={styles.copyButton}
                            onPress={() => handleCopyMessage(messageText)}
                          >
                            <FontAwesome name="copy" size={14} color="#67756a" />
                          </TouchableOpacity>
                        )}
                        <View style={[
                          styles.messageBubble,
                          msg.isUser ? styles.userMessage : styles.aiMessage
                        ]}>
                          <CustomText style={[
                            styles.messageText,
                            msg.isUser ? styles.userMessageText : styles.aiMessageText
                          ]}>
                            {messageText}
                          </CustomText>
                        </View>
                        {msg.isUser && (
                          <TouchableOpacity 
                            style={styles.copyButton}
                            onPress={() => handleCopyMessage(messageText)}
                          >
                            <FontAwesome name="copy" size={14} color="#d46e57" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                  {showTypingIndicator && !error && <TypingIndicator />}
                  
                  {showConfirmation && pendingSuggestion && (
                    <>
                      {/* AI message asking for confirmation */}
                      <View style={styles.messageContainer}>
                        <View style={styles.aiMessage}>
                          <CustomText style={styles.aiMessageText}>
                            {pendingSuggestion.message || 'Load this dish into the app?'}
                          </CustomText>
                        </View>
                      </View>
                      
                      {/* Affirmation buttons */}
                      <View style={styles.affirmationButtonsContainer}>
                        {pendingSuggestion.showViewRecipe ? (
                          // Show "Continue Chatting" and "View Recipe" buttons for modifications
                          <>
                            <TouchableOpacity 
                              style={[styles.affirmationButton, { backgroundColor: '#f8f9f8', borderWidth: 1, borderColor: '#e5e7e5', paddingHorizontal: 16, width: 'auto', minWidth: 120, height: 40, borderRadius: 20 }]} 
                              onPress={handleRejectSuggestion}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <FontAwesome name="comments" size={16} color="#67756a" />
                                <CustomText style={{ color: '#67756a', fontSize: 14, fontWeight: '500', marginLeft: 8 }}>Continue Chatting</CustomText>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.affirmationButton, { backgroundColor: '#d46e57', paddingHorizontal: 16, width: 'auto', minWidth: 120, height: 40, borderRadius: 20 }]} 
                              onPress={handleConfirmSuggestion}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <FontAwesome name="book" size={16} color="#fff" />
                                <CustomText style={{ color: '#fff', fontSize: 14, fontWeight: '500', marginLeft: 8 }}>View Recipe</CustomText>
                              </View>
                            </TouchableOpacity>
                          </>
                        ) : (
                          // Show standard confirm/cancel buttons
                          <>
                            <TouchableOpacity style={styles.affirmationButton} onPress={handleRejectSuggestion}>
                              <FontAwesome name="times" size={20} color="#67756a" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.affirmationButton, { backgroundColor: '#d46e57', paddingHorizontal: 16, width: 'auto', minWidth: 120, height: 40, borderRadius: 20 }]} 
                              onPress={handleConfirmSuggestion}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <FontAwesome name="check" size={16} color="#fff" />
                                <CustomText style={{ color: '#fff', fontSize: 14, fontWeight: '500', marginLeft: 8 }}>Confirm</CustomText>
                              </View>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </>
                  )}
                </>
              )}
              
            </ScrollView>
            
            {/* Context Tags for non-empty chat - OUTSIDE ScrollView */}
            {!chatEmpty && !showConfirmation && (
              <View style={styles.contextTagsContainer}>
                <ContextTags 
                  chatContext={currentDish?.chatContext}
                  preferences={currentDish?.preferences}
                  conversationContext={conversationContext}
                  onRemoveContext={(type, value) => {
                    console.log('ChatScreen: Removing context:', type, value);
                    removeConversationPreference(type, value);
                  }}
                />
              </View>
            )}
            
            {/* Start Fresh button for non-empty chat - OUTSIDE ScrollView */}
            {!chatEmpty && (
              <View style={styles.startFreshContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.clearButton]}
                  onPress={handleStartFresh}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FontAwesome name="times-circle" size={16} color="#67756a" />
                    <CustomText style={[styles.actionButtonText, styles.clearButtonText, { marginLeft: 8 }]}>Start Fresh</CustomText>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Input Section - OUTSIDE ScrollView */}
            <Animated.View style={[
              styles.inputSection, 
              { paddingBottom: paddingAnimation }
            ]}>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, isAnyWaiting && styles.inputDisabled]}
                  placeholder="Ask about recipes..."
                  placeholderTextColor="#b6b7b3"
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  multiline={true}
                  textAlignVertical="center"
                  editable={!isAnyWaiting}
                />
                <TouchableOpacity 
                  style={[styles.sendButton, isAnyWaiting && styles.sendButtonDisabled]} 
                  onPress={handleSend}
                  disabled={isAnyWaiting}
                >
                  <FontAwesome name="chevron-right" size={20} color={isAnyWaiting ? "#ccc" : "#fff"} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
        
        {/* Start Fresh Confirmation Modal */}
        <ConfirmationModal
          visible={showStartFreshModal}
          title="Start Fresh?"
          message="This will save your current work to history and clear all preferences and chat. Are you sure?"
          confirmText="Start Fresh"
          cancelText="Cancel"
          onConfirm={handleConfirmStartFresh}
          onCancel={handleCancelStartFresh}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 10,
    paddingBottom: 0,  // ← Reduce from 5 to 0
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#f8f9f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,  // ← Reduce from 32 to 20
  },
  emptyTitle: {
    color: '#4b6053',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    lineHeight: 30,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#878f89',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,  // ← Reduce from 32 to 20
    maxWidth: 280,
},
  suggestedContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: -5,
    marginBottom: 20,  // ← Reduce from 60 to 20
},
  suggestedButton: {
    backgroundColor: '#f8f9f8',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: screenWidth * 0.78,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  suggestedText: {
    color: '#687568',
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'Bitter_400Regular',
  },
  inputSection: {
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9f8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 48,
    maxHeight: 120,
    color: '#5b6e61',
    fontSize: 15,
    fontFamily: 'Bitter_400Regular',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: '#d46e57',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: '#d46e57',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  messagesContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 80,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userMessageContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  aiMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  messageBubble: {
    backgroundColor: '#f8f9f8',
    borderRadius: 16,
    padding: 14,
    alignSelf: 'flex-start',
    color: '#4b6053',
    fontSize: 15,
    maxWidth: '80%',
    flex: 1,
  },
  userMessage: {
    backgroundColor: '#d46e57',
    borderRadius: 16,
    padding: 14,
    alignSelf: 'flex-end',
    color: '#fff',
    fontSize: 15,
    maxWidth: '80%',
    flex: 1,
  },
  aiMessage: {
    backgroundColor: '#f8f9f8',
    borderRadius: 16,
    padding: 14,
    alignSelf: 'flex-start',
    color: '#4b6053',
    fontSize: 15,
    maxWidth: '80%',
    marginLeft: 16,
    marginRight: 16,
    flex: 1,
  },
  messageText: {
    color: '#4b6053',
    fontSize: 15,
    textAlign: 'left',
  },
  confirmationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 24,
    alignSelf: 'center',
    maxWidth: 420,
  },
  confirmationTitle: {
    color: '#4b6053',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  confirmationMessage: {
    color: '#768178',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#f8f9f8',
    borderWidth: 1,
    borderColor: '#e5e7e5',
  },
  acceptButton: {
    backgroundColor: '#d46e57',
  },
  rejectButtonText: {
    color: '#768178',
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#4b6053',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  copyButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  actionMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 8,
  },
  affirmationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  affirmationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9f8',
    borderWidth: 1,
    borderColor: '#e5e7e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  preferencesContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  preferencesTitle: {
    color: '#768178',
    fontSize: 14,
    marginBottom: 8,
  },
  preferencesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  preferenceTag: {
    backgroundColor: '#d46e57',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  preferenceTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  pageSubtitle: {
    color: '#768178',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Bitter_400Regular',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d46e57',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#f8f9f8',
    borderWidth: 1,
    borderColor: '#e5e7e5',
  },
  clearButtonText: {
    color: '#67756a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  startFreshIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7e5',
  },
  startFreshContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  contextTagsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
