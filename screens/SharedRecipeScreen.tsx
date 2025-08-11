import React, { useState, useEffect } from 'react';
import { View, Image, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import CustomText from '../components/CustomText';
import { FontAwesome, FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { parseShareUrl } from '../src/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorScreen from '../components/ErrorScreen';

const screenWidth = Dimensions.get('window').width;

export default function SharedRecipeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [instructionsOpen, setInstructionsOpen] = useState(true);
  const [nutritionOpen, setNutritionOpen] = useState(false);

  useEffect(() => {
    const loadSharedRecipe = () => {
      try {
        const { url } = route.params || {};
        if (!url) {
          setError('No recipe URL provided');
          setLoading(false);
          return;
        }

        const recipeData = parseShareUrl(url);
        if (!recipeData) {
          setError('Invalid recipe URL');
          setLoading(false);
          return;
        }

        setRecipe(recipeData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading shared recipe:', err);
        setError('Failed to load recipe');
        setLoading(false);
      }
    };

    loadSharedRecipe();
  }, [route.params]);

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

  if (loading) {
    return <LoadingSpinner visible={true} />;
  }

  if (error || !recipe) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <ErrorScreen
          title="Recipe Not Found"
          message={error || "The shared recipe could not be loaded. Please check the link and try again."}
          onRetry={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  // Extract recipe data
  const ingredients = recipe.recipe?.ingredients || [];
  const instructions = recipe.recipe?.instructions || [];
  const nutrition = recipe.recipe?.nutrition ? Object.entries(recipe.recipe.nutrition) : [];

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
        {/* Recipe Image */}
        {recipe.image && (
          <View style={styles.imageCard}>
            <Image
              source={{ uri: recipe.image }}
              style={styles.recipeImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Recipe Title and Description */}
        <View style={styles.recipeHeader}>
          <CustomText style={styles.recipeTitle}>{recipe.title}</CustomText>
          <CustomText style={styles.recipeDescription}>{recipe.description}</CustomText>
          <View style={styles.sharedBadge}>
            <FontAwesome name="share" size={12} color="#d46e57" />
            <CustomText style={styles.sharedBadgeText}>Shared Recipe</CustomText>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageCard: {
    backgroundColor: '#f8f9f8',
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recipeImage: {
    width: '100%',
    height: 200,
  },
  recipeHeader: {
    marginBottom: 24,
  },
  recipeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4b6053',
    marginBottom: 12,
    fontFamily: 'Bitter_700Bold',
  },
  recipeDescription: {
    fontSize: 16,
    color: '#878f89',
    lineHeight: 24,
    marginBottom: 16,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  sharedBadgeText: {
    fontSize: 12,
    color: '#d46e57',
    fontWeight: '600',
    marginLeft: 6,
  },
  accordionCard: {
    backgroundColor: '#f8f9f8',
    borderRadius: 24,
    marginBottom: 10,
    padding: 0,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  accordionTitle: {
    color: '#5b6e61',
    fontSize: 18,
    fontWeight: '600',
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientText: {
    color: '#687568',
    fontSize: 14,
    marginLeft: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d46e57',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#687568',
    fontSize: 14,
    flex: 1,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 16,
  },
  nutritionValue: {
    color: '#d46e57',
    fontSize: 22,
    fontWeight: 'bold',
  },
  nutritionLabel: {
    color: '#878f89',
    fontSize: 12,
  },
}); 