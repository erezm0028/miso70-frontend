import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../components/CustomText';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDish } from '../contexts/DishContext';
import { FontAwesome } from '@expo/vector-icons';
import { getRecipeInfo, generateShareText } from '../src/api';
import { Share } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorScreen from '../components/ErrorScreen';
import ConfirmationModal from '../components/ConfirmationModal';


const Accordion = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity style={styles.accordionHeader} onPress={() => setIsOpen(!isOpen)}>
        <CustomText style={styles.accordionTitle}>{title}</CustomText>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={24} color="#878f89" />
      </TouchableOpacity>
      {isOpen && <View style={styles.accordionContent}>{children}</View>}
    </View>
  );
};

export default function RecipesScreen() {
  const { currentDish, generateDish, generateRecipeInfo, setCurrentDish, preferences, finalizeDish, clearPreferences, clearConversationContext, clearChatMessages, isGeneratingDish, isGeneratingImage, isGeneratingRecipe } = useDish();
  const navigation = useNavigation();

  // If there is a current dish but no recipe, treat as pending
  const hasPendingDish = !!currentDish && (!currentDish.recipe || !Array.isArray(currentDish.recipe.ingredients) || currentDish.recipe.ingredients.length === 0);
  const recipeEmpty = !currentDish;

  // Accordion state: all collapsed by default
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [nutritionOpen, setNutritionOpen] = useState(false);

  // Track which dish we've already set up accordions for
  const [lastDishId, setLastDishId] = useState<string | null>(null);

  // Only reset accordions when we get a new dish, not when navigating back
  React.useEffect(() => {
    if (currentDish && currentDish.id !== lastDishId) {
      setIngredientsOpen(false); // All start collapsed for new dishes
      setInstructionsOpen(false);
      setNutritionOpen(false);
      setLastDishId(currentDish.id);
    }
  }, [currentDish, lastDishId]);

  // Debug preferences changes
  React.useEffect(() => {
    console.log('RecipesScreen: Preferences changed:', preferences);
  }, [preferences]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showStartFreshModal, setShowStartFreshModal] = useState(false);

  // Use these for rendering, always as arrays
  const ingredients =
    currentDish && currentDish.recipe && Array.isArray(currentDish.recipe.ingredients)
      ? currentDish.recipe.ingredients
      : [];

  const instructions =
    currentDish && currentDish.recipe && Array.isArray(currentDish.recipe.instructions)
      ? currentDish.recipe.instructions
      : [];

  // Nutrition: treat as object, display as label-value pairs
  const nutrition =
    currentDish && currentDish.recipe && currentDish.recipe.nutrition && typeof currentDish.recipe.nutrition === 'object'
      ? Object.entries(currentDish.recipe.nutrition)
      : [];

  // Remove auto-fetching recipe info on mount
  // React.useEffect(() => {
  //   if (
  //     currentDish &&
  //     (!currentDish.recipe || !Array.isArray(currentDish.recipe.ingredients) || currentDish.recipe.ingredients.length === 0)
  //   ) {
  //     if (!loading) {
  //       setLoading(true);
  //       setError(null);
  //       generateRecipeInfo(currentDish.title)
  //         .catch(() => setError('Failed to load recipe. Please try again.'))
  //         .finally(() => setLoading(false));
  //     }
  //   }
  //   // Only run when currentDish changes, not on every render
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [currentDish]);

  const handleRetry = async () => {
    if (currentDish) {
      setLoading(true);
      setError(null);
      try {
        await generateRecipeInfo(currentDish.title);
      } catch (err) {
        setError('Failed to load recipe. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleLoadCurrentDish = async () => {
    if (currentDish) {
      setLoading(true);
      setError(null);
      try {
        await generateRecipeInfo(currentDish.title);
      } catch (err) {
        setError('Failed to load recipe. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleRandomDish = async () => {
    setLoading(true);
    setError(null);
    try {
      // No delay - preferences are already updated
      
      // Generate a random dish with current preferences
      console.log('RecipesScreen: Generating random dish with preferences:', preferences);
      console.log('RecipesScreen: Has dietary restrictions:', preferences.dietaryRestrictions?.length > 0);
      console.log('RecipesScreen: Has cuisines:', preferences.cuisines?.length > 0);
      console.log('RecipesScreen: Has plate styles:', preferences.plateStyles?.length > 0);
      console.log('RecipesScreen: Has classic dishes:', preferences.classicDishes?.length > 0);
      console.log('RecipesScreen: Has ingredient preferences:', preferences.ingredientPreferences?.length > 0);
      await generateDish(preferences);
      // Navigate to Dish screen after generation
      navigation.navigate('Dish' as never);
    } catch (err) {
      setError('Failed to generate random dish. Please try again.');
    }
    setLoading(false);
  };

  const handleShareRecipe = async () => {
    if (!currentDish) return;
    
    try {
      const shareText = generateShareText(currentDish);
      if (shareText) {
        await Share.share({
          message: shareText,
          title: currentDish.title
        });
      }
    } catch (error) {
      console.error('Error sharing recipe:', error);
      Alert.alert(
        'Share Failed',
        'Unable to share recipe. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStartFresh = () => {
    setShowStartFreshModal(true);
  };

  const handleConfirmStartFresh = () => {
    setShowStartFreshModal(false);
    // Save current dish to history
    finalizeDish();
    // Clear preferences, chat messages, and reset
    clearPreferences();
    clearConversationContext();
    clearChatMessages();
    setCurrentDish(null);
  };

  const handleCancelStartFresh = () => {
    setShowStartFreshModal(false);
  };

  // Show loading spinner when generating dish or recipe
  if (loading || isGeneratingDish || isGeneratingImage || isGeneratingRecipe) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <LoadingSpinner visible={true} />
        <View style={styles.loadingContainer}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="utensils" size={56} color="#67756a" />
          </View>
          <CustomText style={styles.emptyTitle}>
            {isGeneratingDish ? 'Cooking up your dish...' : isGeneratingRecipe ? 'Generating recipe...' : 'Loading recipe...'}
          </CustomText>
          <CustomText style={styles.emptySubtitle}>
            Please wait while we prepare your recipe with all the details.
          </CustomText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <ErrorScreen
          title="Oops! Something Went Wrong"
          message="We couldn't load your recipe. Please check your connection and try again, or explore other recipes."
          onRetry={handleRetry}
        />
      </SafeAreaView>
    );
  }

  if (recipeEmpty || hasPendingDish) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <View style={styles.emptyState}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="utensils" size={56} color="#67756a" />
          </View>
          <CustomText style={styles.emptyTitle}>No Recipes Yet</CustomText>
          <CustomText style={styles.emptySubtitle}>
            Start your culinary journey by exploring new recipes or chat with an AI chef for personalized suggestions.
          </CustomText>
          <TouchableOpacity style={styles.actionButton} onPress={hasPendingDish ? handleLoadCurrentDish : handleRandomDish}>
            <CustomText style={styles.actionButtonText}>{hasPendingDish ? 'Hit to Load Current Dish' : 'Hit For a Random Dish'}</CustomText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Chat' as never)}>
            <CustomText style={styles.actionButtonText}>Chat with Chef Miso</CustomText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Dynamic food icon selection based on ingredient keywords
  const getIngredientIcon = (ingredientName: string) => {
    const name = ingredientName.toLowerCase();
    
    // Define keyword-to-icon mappings for common ingredient types
    const iconMappings = {
      // Fruits
      'apple': 'apple-alt',
      'banana': 'apple-alt',
      'orange': 'lemon',
      'lemon': 'lemon',
      'lime': 'lemon',
      'mango': 'apple-alt',
      'strawberry': 'apple-alt',
      'berry': 'apple-alt',
      'grape': 'apple-alt',
      'peach': 'apple-alt',
      'pear': 'apple-alt',
      
      // Vegetables
      'carrot': 'carrot',
      'onion': 'carrot',
      'garlic': 'carrot',
      'tomato': 'carrot',
      'potato': 'carrot',
      'bell': 'carrot',
      'cucumber': 'carrot',
      'lettuce': 'leaf',
      'spinach': 'leaf',
      'kale': 'leaf',
      'cabbage': 'leaf',
      'broccoli': 'seedling',
      'cauliflower': 'seedling',
      'mushroom': 'seedling',
      
      // Proteins
      'chicken': 'drumstick-bite',
      'turkey': 'drumstick-bite',
      'beef': 'drumstick-bite',
      'pork': 'drumstick-bite',
      'lamb': 'drumstick-bite',
      'fish': 'fish',
      'salmon': 'fish',
      'tuna': 'fish',
      'shrimp': 'fish',
      'egg': 'egg',
      'tofu': 'egg',
      
      // Dairy
      'milk': 'wine-bottle',
      'cheese': 'cheese',
      'yogurt': 'cheese',
      'butter': 'cheese',
      
      // Grains
      'bread': 'bread-slice',
      'rice': 'bread-slice',
      'pasta': 'bread-slice',
      'flour': 'bread-slice',
      'oat': 'bread-slice',
      'wheat': 'bread-slice',
      
      // Spices & Herbs
      'salt': 'pepper-hot',
      'pepper': 'pepper-hot',
      'chili': 'pepper-hot',
      'spice': 'pepper-hot',
      'herb': 'leaf',
      'basil': 'leaf',
      'oregano': 'leaf',
      'thyme': 'leaf',
      'rosemary': 'leaf',
      
      // Oils & Liquids
      'oil': 'wine-bottle',
      'vinegar': 'wine-bottle',
      'sauce': 'wine-bottle',
      'soy': 'wine-bottle',
      'water': 'wine-bottle',
      
      // Nuts & Seeds
      'nut': 'seedling',
      'almond': 'seedling',
      'walnut': 'seedling',
      'seed': 'seedling',
      'sesame': 'seedling',
      
      // Sweeteners
      'sugar': 'candy-cane',
      'honey': 'candy-cane',
      'syrup': 'candy-cane',
      'chocolate': 'candy-cane',
      
      // Beverages
      'wine': 'wine-bottle',
      'beer': 'wine-bottle',
      'juice': 'wine-bottle',
      'tea': 'mug-hot',
      'coffee': 'mug-hot',
      
      // Generic food items
      'soup': 'utensils',
      'salad': 'utensils',
      'sandwich': 'hamburger',
      'burger': 'hamburger',
      'pizza': 'pizza-slice',
      'cake': 'birthday-cake',
      'cookie': 'cookie-bite',
      'ice': 'ice-cream'
    };
    
    // Search for matching keywords in the ingredient name
    for (const [keyword, icon] of Object.entries(iconMappings)) {
      if (name.includes(keyword)) {
        return icon;
      }
    }
    
    // Fallback to a hash-based selection from common food icons
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackIcons = ['utensils', 'apple-alt', 'carrot', 'fish', 'cheese', 'bread-slice', 'egg', 'leaf', 'seedling', 'lemon'];
    const iconIndex = hash % fallbackIcons.length;
    return fallbackIcons[iconIndex];
  };

  const renderIngredientIcon = (ingredientName: string) => {
    const iconName = getIngredientIcon(ingredientName);
    return <FontAwesome5 name={iconName} size={22} color="#d46e57" />;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Header />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: 24,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.recipeTitleRow}>
          <CustomText style={styles.recipeTitle}>{currentDish.title}</CustomText>
          <View style={styles.titleButtons}>
            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={handleShareRecipe}
              activeOpacity={0.7}
            >
              <FontAwesome name="share" size={16} color="#5b6e61" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.startFreshButton} 
              onPress={handleStartFresh}
              activeOpacity={0.7}
            >
              <FontAwesome name="times-circle" size={16} color="#67756a" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Ingredients Accordion */}
        {ingredients.length > 0 && (
          <View style={styles.accordionCard}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => setIngredientsOpen(open => !open)}>
              <CustomText style={styles.accordionTitle}>Ingredients</CustomText>
              <FontAwesome name={ingredientsOpen ? "chevron-up" : "chevron-down"} size={24} color="#878f89" />
            </TouchableOpacity>
            {ingredientsOpen && (
              <View style={styles.accordionContent}>
                {ingredients.map((item, idx) => (
                  <View key={idx} style={styles.ingredientRow}>
                    {renderIngredientIcon(typeof item === 'string' ? item : '')}
                    <CustomText style={styles.ingredientText}>{typeof item === 'string' ? item : ''}</CustomText>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {/* Instructions Accordion */}
        {instructions.length > 0 && (
          <View style={styles.accordionCard}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => setInstructionsOpen(open => !open)}>
              <CustomText style={styles.accordionTitle}>Instructions</CustomText>
              <FontAwesome name={instructionsOpen ? "chevron-up" : "chevron-down"} size={24} color="#878f89" />
            </TouchableOpacity>
            {instructionsOpen && (
              <View style={styles.accordionContent}>
                {instructions.map((step, idx) => (
                  <View key={idx} style={styles.instructionRow}>
                    <View style={styles.instructionNumber}>
                      <CustomText style={styles.instructionNumberText}>{idx + 1}</CustomText>
                    </View>
                    <CustomText style={styles.instructionText}>{step}</CustomText>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {/* Nutrition Accordion */}
        {nutrition.length > 0 && (
          <View style={styles.accordionCard}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => setNutritionOpen(open => !open)}>
              <CustomText style={styles.accordionTitle}>Nutrition Values</CustomText>
              <FontAwesome name={nutritionOpen ? "chevron-up" : "chevron-down"} size={24} color="#878f89" />
            </TouchableOpacity>
            {nutritionOpen && (
              <View style={styles.accordionContent}>
                <View style={styles.nutritionGrid}>
                  {nutrition.map(([label, value], idx) => (
                    <View key={idx} style={styles.nutritionItem}>
                      <CustomText style={styles.nutritionValue}>{String(value) || ''}</CustomText>
                      <CustomText style={styles.nutritionLabel}>{String(label) || ''}</CustomText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recipe Illustration - Show when all accordions are closed */}
        {!ingredientsOpen && !instructionsOpen && !nutritionOpen && (
          <View style={styles.recipeIllustrationContainer}>
            <View style={styles.illustrationCircle}>
              <View style={styles.ramenIconContainer}>
                <FontAwesome5 name="hamburger" size={60} color="#d46e57" />
                <FontAwesome name="arrow-up" size={30} color="#d46e57" style={styles.arrowOverlay} />
              </View>
            </View>
            <CustomText style={styles.illustrationTitle}>Your Recipe Awaits</CustomText>
            <CustomText style={styles.illustrationSubtitle}>
              Tap on any section above to explore the ingredients, instructions, and nutrition details of your dish.
            </CustomText>
          </View>
        )}
      </ScrollView>
      
      {/* Start Fresh Confirmation Modal */}
      <ConfirmationModal
        visible={showStartFreshModal}
        title="Start Fresh?"
        message="This will save your current dish to history and clear all preferences and chat. Are you sure?"
        confirmText="Start Fresh"
        cancelText="Cancel"
        onConfirm={handleConfirmStartFresh}
        onCancel={handleCancelStartFresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    marginTop: 100,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#f8f9f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
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
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7e5',
    marginBottom: 16,
    width: '100%',
  },
  actionButtonText: {
    color: '#4b6053',
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  recipeTitleContainer: { marginBottom: 24 },
  recipeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  recipeTitle: {
    color: '#4b6053',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    lineHeight: 30,
    flex: 1,
    textAlign: 'left',
  },
  titleButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7e5',
  },
  startFreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7e5',
  },
  recipeSubtitle: { color: '#878f89', fontSize: 14, marginTop: 4 },
  accordionContainer: { backgroundColor: '#f8f9f8', borderRadius: 20, marginBottom: 16 },
  // Only one definition for each style key below
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  accordionTitle: { color: '#5b6e61', fontSize: 18, fontWeight: '600' },
  accordionContent: { paddingHorizontal: 16, paddingBottom: 16 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  ingredientText: { color: '#687568', fontSize: 14, marginLeft: 12 },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  instructionNumber: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#d46e57',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  instructionNumberText: { color: '#fff', fontWeight: 'bold' },
  instructionText: { color: '#687568', fontSize: 14, flex: 1 },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  nutritionItem: { alignItems: 'center', width: '45%', marginBottom: 16 },
  nutritionValue: { color: '#d46e57', fontSize: 22, fontWeight: 'bold' },
  nutritionLabel: { color: '#878f89', fontSize: 12 },
  accordionCard: {
    backgroundColor: '#f8f9f8',
    borderRadius: 24,
    marginBottom: 10,
    padding: 0,
    overflow: 'hidden',
  },
  ingredientsOpen: {
    // Add this style if needed
  },
  recipeMeta: {
    fontSize: 18,
    color: '#7a857e',
    marginBottom: 24,
  },
  // Recipe Illustration Styles
  recipeIllustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  illustrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#f8f9f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  illustrationTitle: {
    color: '#4b6053',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    lineHeight: 30,
    marginBottom: 12,
    textAlign: 'center',
  },
  illustrationSubtitle: {
    color: '#878f89',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  ramenIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOverlay: {
    position: 'absolute',
    top: -15,
    alignSelf: 'center',
  },

});
