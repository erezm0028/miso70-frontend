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
import { FontAwesome6 } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getRecipeInfo, generateShareUrl, copyToClipboard } from '../src/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorScreen from '../components/ErrorScreen';


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
  const { currentDish, generateDish, generateRecipeInfo, setCurrentDish, preferences, finalizeDish, clearPreferences, clearConversationContext, clearChatMessages } = useDish();
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
      // Small delay to ensure preferences are updated from other screens
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
      const shareUrl = generateShareUrl(currentDish);
      if (shareUrl) {
        const success = await copyToClipboard(shareUrl);
        if (success) {
          Alert.alert(
            'Recipe Copied!',
            'The recipe has been copied to your clipboard. You can now paste it anywhere!',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Copy Failed',
            'Unable to copy to clipboard. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error sharing recipe:', error);
      Alert.alert(
        'Copy Failed',
        'Unable to generate recipe text. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStartFresh = () => {
    Alert.alert(
      'Start Fresh?',
      'This will save your current dish to history and clear all preferences and chat. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Fresh', 
          style: 'destructive',
          onPress: () => {
            // Save current dish to history
            finalizeDish();
            // Clear preferences, chat messages, and reset
            clearPreferences();
            clearConversationContext();
            clearChatMessages();
            setCurrentDish(null);
          }
        }
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner visible={true} />;
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
            {/* Use FontAwesome6 bowl-food if available, else utensils */}
            {FontAwesome6 ? (
              <FontAwesome6 name="bowl-food" size={56} color="#67756a" />
            ) : (
              <FontAwesome5 name="utensils" size={56} color="#67756a" />
            )}
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

  // Enhanced getIngredientIcon with better icon library selection
  const getIngredientIcon = (ingredientName: string) => {
    const name = ingredientName.toLowerCase();
    
    // Proteins - using MaterialCommunityIcons for better food icons
    if (name.includes('chicken')) return { icon: 'food-drumstick', library: 'MaterialCommunityIcons' };
    if (name.includes('beef') || name.includes('steak') || name.includes('meat')) return { icon: 'food-steak', library: 'MaterialCommunityIcons' };
    if (name.includes('pork') || name.includes('bacon') || name.includes('ham')) return { icon: 'food-bacon', library: 'MaterialCommunityIcons' };
    if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) return { icon: 'fish', library: 'FontAwesome5' };
    if (name.includes('shrimp') || name.includes('prawn')) return { icon: 'fish', library: 'FontAwesome5' };
    if (name.includes('egg')) return { icon: 'egg', library: 'FontAwesome5' };
    if (name.includes('tofu')) return { icon: 'cube', library: 'FontAwesome5' };
    if (name.includes('tempeh')) return { icon: 'cube', library: 'FontAwesome5' };
    if (name.includes('lamb')) return { icon: 'food-steak', library: 'MaterialCommunityIcons' };
    if (name.includes('turkey')) return { icon: 'food-drumstick', library: 'MaterialCommunityIcons' };
    if (name.includes('duck')) return { icon: 'food-drumstick', library: 'MaterialCommunityIcons' };
    if (name.includes('seafood')) return { icon: 'fish', library: 'FontAwesome5' };
    if (name.includes('crab')) return { icon: 'fish', library: 'FontAwesome5' };
    if (name.includes('lobster')) return { icon: 'fish', library: 'FontAwesome5' };
    if (name.includes('clam') || name.includes('mussel') || name.includes('oyster')) return { icon: 'fish', library: 'FontAwesome5' };
    
    // Vegetables - using MaterialCommunityIcons for better veggie icons
    if (name.includes('tomato') || name.includes('tomatoes')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('onion') || name.includes('onions')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('garlic')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('carrot') || name.includes('carrots')) return { icon: 'carrot', library: 'FontAwesome5' };
    if (name.includes('pepper') || name.includes('bell pepper') || name.includes('chili')) return { icon: 'pepper-hot', library: 'FontAwesome5' };
    if (name.includes('mushroom') || name.includes('mushrooms')) return { icon: 'mushroom', library: 'FontAwesome5' };
    if (name.includes('lettuce') || name.includes('salad') || name.includes('greens')) return { icon: 'leaf', library: 'FontAwesome5' };
    if (name.includes('spinach') || name.includes('kale')) return { icon: 'leaf', library: 'FontAwesome5' };
    if (name.includes('broccoli') || name.includes('cauliflower')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('potato') || name.includes('potatoes')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('sweet potato') || name.includes('yam')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('avocado')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('cucumber')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('zucchini') || name.includes('squash')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('eggplant') || name.includes('aubergine')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('corn')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('pea') || name.includes('peas')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('bean') || name.includes('beans')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('lentil') || name.includes('lentils')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('asparagus')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('artichoke')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('brussels sprout') || name.includes('brussels sprouts')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('cabbage')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('celery')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('radish')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('turnip')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('beet') || name.includes('beets')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('parsnip')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('rutabaga')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('leek') || name.includes('leeks')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('shallot') || name.includes('shallots')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('scallion') || name.includes('scallions') || name.includes('green onion')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    
    // Herbs and Spices
    if (name.includes('basil') || name.includes('oregano') || name.includes('thyme') || name.includes('rosemary')) return { icon: 'leaf', library: 'FontAwesome5' };
    if (name.includes('cilantro') || name.includes('coriander') || name.includes('parsley')) return { icon: 'leaf', library: 'FontAwesome5' };
    if (name.includes('mint')) return { icon: 'leaf', library: 'FontAwesome5' };
    if (name.includes('ginger')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('turmeric')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('cinnamon')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('nutmeg')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('paprika')) return { icon: 'pepper-hot', library: 'FontAwesome5' };
    if (name.includes('cumin')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    
    // Fruits
    if (name.includes('apple')) return { icon: 'apple-alt', library: 'FontAwesome5' };
    if (name.includes('banana')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('orange')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('lemon')) return { icon: 'lemon', library: 'FontAwesome5' };
    if (name.includes('lime')) return { icon: 'lemon', library: 'FontAwesome5' };
    if (name.includes('pineapple')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('mango')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('strawberry') || name.includes('berries')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('grape')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('peach')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('pear')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('plum')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('cherry')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('blueberry')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('raspberry')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    if (name.includes('blackberry')) return { icon: 'food-apple', library: 'MaterialCommunityIcons' };
    
    // Grains and Starches
    if (name.includes('rice')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('pasta') || name.includes('noodle') || name.includes('spaghetti')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('bread')) return { icon: 'bread-slice', library: 'FontAwesome5' };
    if (name.includes('tortilla') || name.includes('wrap')) return { icon: 'bread-slice', library: 'FontAwesome5' };
    if (name.includes('quinoa')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('oat') || name.includes('oats')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('flour')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    
    // Dairy and Alternatives
    if (name.includes('cheese')) return { icon: 'cheese', library: 'FontAwesome5' };
    if (name.includes('milk')) return { icon: 'cup-water', library: 'MaterialCommunityIcons' };
    if (name.includes('cream')) return { icon: 'cup-water', library: 'MaterialCommunityIcons' };
    if (name.includes('yogurt') || name.includes('yoghurt')) return { icon: 'cup-water', library: 'MaterialCommunityIcons' };
    if (name.includes('butter')) return { icon: 'cheese', library: 'FontAwesome5' };
    if (name.includes('sour cream')) return { icon: 'cup-water', library: 'MaterialCommunityIcons' };
    if (name.includes('cream cheese')) return { icon: 'cheese', library: 'FontAwesome5' };
    if (name.includes('parmesan') || name.includes('cheddar') || name.includes('mozzarella')) return { icon: 'cheese', library: 'FontAwesome5' };
    
    // Oils and Fats
    if (name.includes('olive oil')) return { icon: 'tint', library: 'FontAwesome5' };
    if (name.includes('vegetable oil') || name.includes('canola oil')) return { icon: 'tint', library: 'FontAwesome5' };
    if (name.includes('coconut oil')) return { icon: 'tint', library: 'FontAwesome5' };
    if (name.includes('sesame oil')) return { icon: 'tint', library: 'FontAwesome5' };
    if (name.includes('oil')) return { icon: 'tint', library: 'FontAwesome5' };
    
    // Condiments and Sauces
    if (name.includes('soy sauce') || name.includes('tamari')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    if (name.includes('vinegar')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    if (name.includes('hot sauce') || name.includes('sriracha')) return { icon: 'pepper-hot', library: 'FontAwesome5' };
    if (name.includes('ketchup')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    if (name.includes('mustard')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    if (name.includes('mayonnaise') || name.includes('mayo')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    if (name.includes('sauce')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    if (name.includes('dressing')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    
    // Sweeteners
    if (name.includes('sugar')) return { icon: 'cube', library: 'FontAwesome5' };
    if (name.includes('honey')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('maple syrup')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('agave')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('stevia')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    
    // Seasonings
    if (name.includes('salt')) return { icon: 'cube', library: 'FontAwesome5' };
    if (name.includes('pepper')) return { icon: 'pepper-hot', library: 'FontAwesome5' };
    if (name.includes('black pepper')) return { icon: 'pepper-hot', library: 'FontAwesome5' };
    if (name.includes('white pepper')) return { icon: 'pepper-hot', library: 'FontAwesome5' };
    if (name.includes('sea salt')) return { icon: 'cube', library: 'FontAwesome5' };
    if (name.includes('kosher salt')) return { icon: 'cube', library: 'FontAwesome5' };
    
    // Nuts and Seeds
    if (name.includes('almond') || name.includes('almonds')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('walnut') || name.includes('walnuts')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('pecan') || name.includes('pecans')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('cashew') || name.includes('cashews')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('peanut') || name.includes('peanuts')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('sunflower seed') || name.includes('sunflower seeds')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('sesame seed') || name.includes('sesame seeds')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('chia seed') || name.includes('chia seeds')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('flax seed') || name.includes('flax seeds')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    
    // Broth and Liquids
    if (name.includes('broth') || name.includes('stock')) return { icon: 'cup-water', library: 'MaterialCommunityIcons' };
    if (name.includes('water')) return { icon: 'tint', library: 'FontAwesome5' };
    if (name.includes('wine')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    if (name.includes('beer')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    if (name.includes('juice')) return { icon: 'cup-water', library: 'MaterialCommunityIcons' };
    
    // Default fallback - use more specific icons based on common patterns
    if (name.includes('fresh') || name.includes('raw')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('organic')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('dried')) return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('frozen')) return { icon: 'snowflake', library: 'FontAwesome5' };
    if (name.includes('canned') || name.includes('can')) return { icon: 'package-variant', library: 'MaterialCommunityIcons' };
    if (name.includes('jar')) return { icon: 'bottle-wine', library: 'MaterialCommunityIcons' };
    if (name.includes('package') || name.includes('pack')) return { icon: 'package-variant', library: 'MaterialCommunityIcons' };
    
    // If no specific match, return a more appropriate default
    return { icon: 'food-variant', library: 'MaterialCommunityIcons' };
  };

  // Helper function to render the appropriate icon component
  const renderIngredientIcon = (ingredientName: string) => {
    const iconInfo = getIngredientIcon(ingredientName);
    const iconProps = { size: 22, color: "#d46e57" };
    
    switch (iconInfo.library) {
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={iconInfo.icon as any} {...iconProps} />;
      case 'FontAwesome6':
        return <FontAwesome6 name={iconInfo.icon as any} {...iconProps} />;
      case 'FontAwesome':
        return <FontAwesome name={iconInfo.icon as any} {...iconProps} />;
      case 'FontAwesome5':
      default:
        return <FontAwesome5 name={iconInfo.icon as any} {...iconProps} />;
    }
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
              <FontAwesome name="share" size={16} color="#4CAF50" />
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
                <FontAwesome6 name="bowl-food" size={60} color="#d46e57" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
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
