import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { Ionicons } from '@expo/vector-icons';
import CustomText from '../components/CustomText';
import LoadingSpinner from '../components/LoadingSpinner';
import { useDish } from '../contexts/DishContext';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { generateDish } from '../src/api';

import ErrorScreen from '../components/ErrorScreen';

const Checkbox = ({ label, isChecked, onToggle, style = {} }) => (
  <TouchableOpacity style={[styles.checkboxRow, style]} onPress={onToggle} activeOpacity={0.7}>
    <View style={[styles.checkboxBase, isChecked && styles.checkboxChecked]}>
      {isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
    </View>
    <CustomText style={styles.checkboxLabel}>{label}</CustomText>
  </TouchableOpacity>
);

const TwoColumnCheckboxGrid = ({ options, selectedOptions, onToggle, style = {} }) => {
  const leftColumn = options.slice(0, Math.ceil(options.length / 2));
  const rightColumn = options.slice(Math.ceil(options.length / 2));

  return (
    <View style={[styles.twoColumnGrid, style]}>
      <View style={styles.column}>
        {leftColumn.map(option => (
          <Checkbox
            key={option}
            label={option}
            isChecked={selectedOptions.includes(option)}
            onToggle={() => onToggle(option)}
            style={styles.gridCheckbox}
          />
        ))}
      </View>
      <View style={styles.column}>
        {rightColumn.map(option => (
          <Checkbox
            key={option}
            label={option}
            isChecked={selectedOptions.includes(option)}
            onToggle={() => onToggle(option)}
            style={styles.gridCheckbox}
          />
        ))}
      </View>
    </View>
  );
};

const CuisineAccordion = ({
  title, dishes, isOpen, onToggle, isChecked, onCheckChange, selectedDishes, onDishCheck
}) => (
  <View style={styles.accordionContainer}>
    <TouchableOpacity style={styles.accordionHeader} onPress={onToggle}>
      <View style={styles.accordionHeaderContent}>
        <Checkbox 
          label={title} 
          isChecked={isChecked} 
          onToggle={onCheckChange}
          style={styles.mainCheckbox}
        />
      </View>
      <Ionicons 
        name={isOpen ? "remove" : "add"} 
        size={20} 
        color="#878f89" 
      />
    </TouchableOpacity>
    {isOpen && (
      <View style={styles.accordionContent}>
        {dishes.map((dish, index) => (
          <Checkbox 
            key={index}
            label={dish} 
            isChecked={selectedDishes.includes(dish)}
            onToggle={() => onDishCheck(title, dish, dishes)}
            style={styles.subCheckbox}
          />
        ))}
      </View>
    )}
  </View>
);

// Dietary options
const dietOptions = [
  'Vegan',
  'Vegetarian',
  'Pescatarian',
  'Keto',
  'Paleo',
  'Low Carb',
  'Low Fat',
  'High Protein',
  'Diabetic-Friendly',
  'Gluten-Free',
];

// Plate style options
const plateStyleOptions = [
  'Comfort Plate',
  'Stir Fry / Noodles',
  'Salad Bowl',
  'Side Dish',
  'Wrap / Taco',
  'Soup / Stew',
  'Sandwich / Toast',
  'Dessert',
];

// Cuisines and classic dishes
const cuisineData = [
  {
    name: 'Italian',
    dishes: ['Spaghetti Carbonara', 'Margherita Pizza', 'Lasagna', 'Risotto', 'Tiramisu'],
  },
  {
    name: 'Japanese',
    dishes: ['Sushi', 'Ramen', 'Tempura', 'Okonomiyaki', 'Miso Soup'],
  },
  {
    name: 'Mexican',
    dishes: ['Tacos', 'Enchiladas', 'Guacamole', 'Chiles Rellenos', 'Tamales'],
  },
  {
    name: 'Indian',
    dishes: ['Butter Chicken', 'Biryani', 'Paneer Tikka', 'Chole', 'Naan'],
  },
  {
    name: 'Chinese',
    dishes: ['Kung Pao Chicken', 'Fried Rice', 'Sweet and Sour Pork', 'Dumplings', 'Hot Pot'],
  },
  {
    name: 'French',
    dishes: ['Coq au Vin', 'Croissant', 'Ratatouille', 'Quiche Lorraine', 'Crème Brûlée'],
  },
  {
    name: 'Thai',
    dishes: ['Pad Thai', 'Green Curry', 'Tom Yum', 'Massaman Curry', 'Mango Sticky Rice'],
  },
  {
    name: 'Greek',
    dishes: ['Moussaka', 'Souvlaki', 'Spanakopita', 'Greek Salad', 'Baklava'],
  },
  {
    name: 'American',
    dishes: ['Cheeseburger', 'Mac and Cheese', 'BBQ Ribs', 'Fried Chicken', 'Apple Pie'],
  },
  {
    name: 'Middle Eastern',
    dishes: ['Hummus', 'Falafel', 'Shawarma', 'Tabbouleh', 'Baklava'],
  },
  {
    name: 'Korean',
    dishes: ['Bibimbap', 'Kimchi', 'Bulgogi', 'Japchae', 'Tteokbokki'],
  },
  {
    name: 'Spanish',
    dishes: ['Paella', 'Tortilla Española', 'Gazpacho', 'Churros', 'Patatas Bravas'],
  },
  {
    name: 'Vietnamese',
    dishes: ['Pho', 'Banh Mi', 'Bun Cha', 'Goi Cuon', 'Com Tam'],
  },
  {
    name: 'Turkish',
    dishes: ['Doner Kebab', 'Lahmacun', 'Menemen', 'Simit', 'Turkish Delight'],
  },
  {
    name: 'Brazilian',
    dishes: ['Feijoada', 'Pão de Queijo', 'Moqueca', 'Coxinha', 'Brigadeiro'],
  },
];

export default function PreferencesScreen() {
  const { 
    preferences, 
    updatePreferences, 
    updatePreferencesOnly,
    generateDish, 
    currentDish, 
    modifyRecipe, 
    updateChatContextForModifiedDish,
    conversationContext,
    removeConversationPreference,
    addConversationPreference
  } = useDish();
  const navigation = useNavigation();
  const [error, setError] = useState(null);
  const [expandedCuisine, setExpandedCuisine] = useState<string | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedDishes, setSelectedDishes] = useState<{ [cuisine: string]: string[] }>({});
  const [selectedPlateStyles, setSelectedPlateStyles] = useState<string[]>([]);
  const [selectedDietaryRestrictions, setSelectedDietaryRestrictions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingPreferences, setPendingPreferences] = useState<{
    type: 'dietary' | 'cuisine' | 'plateStyle' | 'all';
    message: string;
  } | null>(null);

  // Check if user has any preferences set
  const hasAnyDiet = selectedDietaryRestrictions.length > 0;
  const hasAnyCuisine = selectedCuisines.length > 0;
  const hasAnyClassicDish = Object.values(selectedDishes).some(arr => arr.length > 0);
  const hasAnyPlateStyle = selectedPlateStyles.length > 0;
  const hasAnyPreference = hasAnyDiet || hasAnyCuisine || hasAnyClassicDish || hasAnyPlateStyle;

  // Check if there's a current dish loaded
  const hasCurrentDish = currentDish !== null;

  // Sync local state with global preferences when component mounts or preferences change
  useEffect(() => {
    console.log('Syncing local state with global preferences:', preferences);
    setSelectedDietaryRestrictions(preferences.dietaryRestrictions || []);
    setSelectedCuisines(preferences.cuisines || []);
    setSelectedPlateStyles(preferences.plateStyles || []);
    
    // Handle classic dishes - they're stored as a flat array in global state
    // but as an object in local state, so we need to reconstruct the object
    const classicDishesObject: { [cuisine: string]: string[] } = {};
    if (preferences.classicDishes && preferences.classicDishes.length > 0) {
      // Map classic dishes back to their respective cuisines
      preferences.classicDishes.forEach(dish => {
        for (const cuisine of cuisineData) {
          if (cuisine.dishes.includes(dish)) {
            if (!classicDishesObject[cuisine.name]) {
              classicDishesObject[cuisine.name] = [];
            }
            classicDishesObject[cuisine.name].push(dish);
            break;
          }
        }
      });
    }
    setSelectedDishes(classicDishesObject);
  }, [preferences]); // Run when preferences change (including when cleared by Start Fresh)

  // Force sync when component focuses (becomes active) to handle navigation timing issues
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('PreferencesScreen focused, forcing sync with global preferences');
      console.log('Current global preferences:', preferences);
      setSelectedDietaryRestrictions(preferences.dietaryRestrictions || []);
      setSelectedCuisines(preferences.cuisines || []);
      setSelectedPlateStyles(preferences.plateStyles || []);
      
      // Handle classic dishes - they're stored as a flat array in global state
      // but as an object in local state, so we need to reconstruct the object
      const classicDishesObject: { [cuisine: string]: string[] } = {};
      if (preferences.classicDishes && preferences.classicDishes.length > 0) {
        // Map classic dishes back to their respective cuisines
        preferences.classicDishes.forEach(dish => {
          for (const cuisine of cuisineData) {
            if (cuisine.dishes.includes(dish)) {
              if (!classicDishesObject[cuisine.name]) {
                classicDishesObject[cuisine.name] = [];
              }
              classicDishesObject[cuisine.name].push(dish);
              break;
            }
          }
        });
      }
      setSelectedDishes(classicDishesObject);
    });

    return unsubscribe;
  }, [navigation, preferences]);

  const handlePlateStyleToggle = (plateStyle: string) => {
    // Single selection logic - only one plate style can be selected at a time
    let newPlateStyles: string[];
    if (selectedPlateStyles.includes(plateStyle)) {
      // If already selected, deselect it
      newPlateStyles = [];
      // Remove from conversation context
      removeConversationPreference('style', plateStyle);
    } else {
      // If not selected, select only this one (deselect others)
      newPlateStyles = [plateStyle];
      // Remove any existing plate styles from conversation context first
      selectedPlateStyles.forEach(style => {
        console.log('PreferencesScreen: Auto-removing plate style from conversation context:', style);
        removeConversationPreference('style', style);
      });
      // Add the new plate style to conversation context
      addConversationPreference('style', plateStyle);
    }
    setSelectedPlateStyles(newPlateStyles);
    
    // Update global preferences immediately
    const newPreferences = {
      dietaryRestrictions: selectedDietaryRestrictions,
      cuisines: selectedCuisines,
      classicDishes: Object.values(selectedDishes).flat(),
      plateStyles: newPlateStyles
    };
    
    // Always use updatePreferencesOnly for plate styles since we handle conversation context manually
    updatePreferencesOnly(newPreferences);
  };

  const handleApplyAllChanges = () => {
    console.log('handleApplyAllChanges called');
    const selectedDiets = selectedDietaryRestrictions;
    const selectedCuisineList = selectedCuisines;
    const selectedDishesList = Object.values(selectedDishes).flat();
    const selectedPlateStylesList = selectedPlateStyles;
    
    console.log('Selected diets:', selectedDiets);
    console.log('Selected cuisines:', selectedCuisineList);
    console.log('Selected dishes:', selectedDishesList);
    console.log('Selected plate styles:', selectedPlateStylesList);
    
    if (selectedDiets.length > 0 || selectedCuisineList.length > 0 || selectedDishesList.length > 0 || selectedPlateStylesList.length > 0) {
      let message = 'Apply your preferences to ';
      
      const parts = [];
      if (selectedDiets.length > 0) {
        parts.push(`${selectedDiets.join(', ')} dietary preferences`);
      }
      if (selectedCuisineList.length > 0) {
        parts.push(`${selectedCuisineList.join(', ')} cuisine inspiration`);
      }
      if (selectedDishesList.length > 0) {
        parts.push(`${selectedDishesList.join(', ')} classic dishes`);
      }
      if (selectedPlateStylesList.length > 0) {
        parts.push(`${selectedPlateStylesList.join(', ')} plate styles`);
      }
      
      message += parts.join(', ') + '?';
      
      console.log('Setting pending preferences for all settings');
      setPendingPreferences({
        type: 'all',
        message
      });
      setShowConfirmation(true);
    } else {
      console.log('No preferences selected');
    }
  };

  const handleConfirmPreferences = async (action: 'modify' | 'new') => {
    console.log('handleConfirmPreferences called with action:', action);
    console.log('pendingPreferences:', pendingPreferences);
    console.log('selectedDietaryRestrictions:', selectedDietaryRestrictions);
    console.log('selectedCuisines:', selectedCuisines);
    console.log('selectedPlateStyles:', selectedPlateStyles);
    console.log('selectedDishes:', selectedDishes);
    if (pendingPreferences) {
      setLoading(true);
      
      try {
        // Prepare the preferences to apply - only send what's actually selected
        const selectedSpecificDishes = Object.values(selectedDishes).flat();
        const newPreferences = {
          dietaryRestrictions: selectedDietaryRestrictions,
          cuisines: selectedCuisines,
          classicDishes: selectedSpecificDishes,
          plateStyles: selectedPlateStyles
        };

        // Create enhanced preferences that include conversation context
        const enhancedPreferences = {
          ...newPreferences,
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

        console.log('Selected cuisines (inspiration):', selectedCuisines);
        console.log('Selected specific dishes (fusion base):', selectedSpecificDishes);
        console.log('Applying enhanced preferences:', enhancedPreferences);
        console.log('Conversation context preferences:', conversationContext.preferences);

        setShowConfirmation(false);
        setPendingPreferences(null);

        if (action === 'modify' && currentDish) {
          // For modification, directly modify the existing dish without generating a new one first
          let modificationPrompt = `Transform this dish to incorporate: `;
          
          if (enhancedPreferences.cuisines.length > 0) {
            modificationPrompt += `${enhancedPreferences.cuisines.join(' and ')} cuisine elements. `;
          }
          
          if (enhancedPreferences.classicDishes.length > 0) {
            modificationPrompt += `Incorporate elements from: ${enhancedPreferences.classicDishes.join(', ')}. `;
          }
          
          if (enhancedPreferences.dietaryRestrictions.length > 0) {
            modificationPrompt += `Make it ${enhancedPreferences.dietaryRestrictions.join(' and ').toLowerCase()}. `;
          }
          
          if (enhancedPreferences.plateStyles.length > 0) {
            modificationPrompt += `Adapt it to a ${enhancedPreferences.plateStyles.join(' and ')} style. `;
          }
          
          modificationPrompt += `Keep the core concept of "${currentDish.title}" but adapt it to these new requirements.`;
          
          console.log('Modification prompt:', modificationPrompt);
          
          try {
            // Update the global preferences first
            console.log('Calling updatePreferences with:', enhancedPreferences);
            console.log('About to call updatePreferences function (modify path)...');
            updatePreferences(enhancedPreferences);
            console.log('updatePreferences function called successfully (modify path)');
            
            // Modify the recipe and get the result
            const modificationResult = await modifyRecipe(modificationPrompt, currentDish);
            
            // Update chat context with the modification
            if (modificationResult && modificationResult.updatedDish) {
              updateChatContextForModifiedDish(modificationResult.updatedDish, modificationResult.summary);
            }
            
            navigation.navigate('Recipe' as never);
          } catch (error) {
            console.error('Error modifying recipe:', error);
            // Fallback to generating new dish if modification fails
            console.log('Calling updatePreferences with:', enhancedPreferences);
            console.log('About to call updatePreferences function (fallback path)...');
            updatePreferences(enhancedPreferences);
            console.log('updatePreferences function called successfully (fallback path)');
            await generateDish(enhancedPreferences);
            navigation.navigate('Recipe' as never);
          }
        } else {
          // For new dish, generate and navigate to Dish screen
          console.log('About to call generateDish with:', enhancedPreferences);
          
          // Update the global preferences first
          console.log('Calling updatePreferences with:', enhancedPreferences);
          console.log('About to call updatePreferences function...');
          updatePreferences(enhancedPreferences);
          console.log('updatePreferences function called successfully');
          
          // No delay - preferences are already updated
          
          const startTime = Date.now();
          await generateDish(enhancedPreferences);
          const elapsed = Date.now() - startTime;
          // No minimum loading time - navigate immediately
          console.log('generateDish completed');
          navigation.navigate('Dish' as never);
        }
        
      } catch (error) {
        console.error('Error applying preferences:', error);
        setError('Failed to apply preferences. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRejectPreferences = () => {
    setShowConfirmation(false);
    setPendingPreferences(null);
  };

  const handleCuisineToggle = (cuisine: string) => {
    setExpandedCuisine(expandedCuisine === cuisine ? null : cuisine);
  };

  const handleCuisineCheck = (cuisine: string, dishes: string[]) => {
    const isChecked = selectedCuisines.includes(cuisine);
    let newCuisines: string[];
    if (isChecked) {
      newCuisines = selectedCuisines.filter(c => c !== cuisine);
      // Remove from conversation context when unchecking
      removeConversationPreference('cuisine', cuisine);
      // Don't clear specific dishes when unchecking cuisine - let user manage them separately
    } else {
      newCuisines = [...selectedCuisines, cuisine];
      // Add to conversation context when checking
      addConversationPreference('cuisine', cuisine);
      // Don't auto-select all dishes when checking cuisine - let user choose specific ones
    }
    setSelectedCuisines(newCuisines);
    
    // Update global preferences immediately
    const newPreferences = {
      dietaryRestrictions: selectedDietaryRestrictions,
      cuisines: newCuisines,
      classicDishes: Object.values(selectedDishes).flat(),
      plateStyles: selectedPlateStyles
    };
    
    // Always use updatePreferencesOnly to avoid conversation context conflicts
    updatePreferencesOnly(newPreferences);
  };

  const handleDishCheck = (cuisine: string, dish: string, dishes: string[]) => {
    console.log('handleDishCheck called:', { cuisine, dish, currentSelectedDishes: selectedDishes });
    
    const current = selectedDishes[cuisine] || [];
    const isChecked = current.includes(dish);
    console.log('Current dishes for cuisine:', current, 'Is checked:', isChecked);
    
    let updated: string[];
    if (isChecked) {
      updated = current.filter(d => d !== dish);
      // Remove from conversation context when unchecking
      removeConversationPreference('classicDish', dish);
    } else {
      updated = [...current, dish];
      // Add to conversation context when checking
      addConversationPreference('classicDish', dish);
    }
    
    const newSelectedDishes = { ...selectedDishes, [cuisine]: updated };
    console.log('New selected dishes:', newSelectedDishes);
    setSelectedDishes(newSelectedDishes);
    
    // Keep cuisine selected even if not all dishes are selected
    let newCuisines = selectedCuisines;
    if (!selectedCuisines.includes(cuisine)) {
      newCuisines = [...selectedCuisines, cuisine];
      setSelectedCuisines(newCuisines);
      // Also add cuisine to conversation context if it wasn't there
      addConversationPreference('cuisine', cuisine);
    }
    
    // Update global preferences immediately
    const newPreferences = {
      dietaryRestrictions: selectedDietaryRestrictions,
      cuisines: newCuisines,
      classicDishes: Object.values(newSelectedDishes).flat(),
      plateStyles: selectedPlateStyles
    };
    console.log('Updating global preferences with:', newPreferences);
    
    // Always use updatePreferencesOnly to avoid conversation context conflicts
    updatePreferencesOnly(newPreferences);
  };

  // This useEffect is now redundant since we handle initialization in the mount useEffect above
  // Removing it to prevent conflicts

  // Add a generic error state and display the friendly message if needed
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <ErrorScreen
          title="Oops! Something Went Wrong"
          message="We couldn't apply your preferences. Please check your connection and try again."
          onRetry={() => setError(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Header />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 16, paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
        >
        <CustomText style={styles.pageTitle}>Mix & Match</CustomText>
        <CustomText style={styles.pageSubtitle}>
          Pick your style. Combine the unexpected.
        </CustomText>
        
        {/* Mix It Button */}
        <TouchableOpacity
          style={[
            styles.mixItButton,
            (!hasAnyPreference || loading) && { opacity: 0.5 }
          ]}
          onPress={handleApplyAllChanges}
          disabled={!hasAnyPreference || loading}
        >
                            <CustomText style={styles.mixItButtonText}>Mix It In</CustomText>
        </TouchableOpacity>

        {/* Section: Plate Style */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 32 }}>
          <CustomText style={{ fontSize: 22, fontWeight: '700', color: '#5b6e61', flex: 1 }}>
            Plate Style
          </CustomText>
        </View>
        <TwoColumnCheckboxGrid
          options={plateStyleOptions}
          selectedOptions={selectedPlateStyles}
          onToggle={handlePlateStyleToggle}
          style={{ marginBottom: 24 }}
        />

        {/* Section: Eating Styles */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <CustomText style={{ fontSize: 22, fontWeight: '700', color: '#5b6e61', flex: 1 }}>
            Eating Styles
          </CustomText>
        </View>
        <TwoColumnCheckboxGrid
          options={dietOptions}
          selectedOptions={selectedDietaryRestrictions}
          onToggle={(diet) => {
            const currentDiets = selectedDietaryRestrictions;
            const isCurrentlySelected = currentDiets.includes(diet);
            const newDiets = isCurrentlySelected
              ? currentDiets.filter(d => d !== diet)
              : [...currentDiets, diet];
            setSelectedDietaryRestrictions(newDiets);
            
            // Handle conversation context changes
            if (isCurrentlySelected) {
              // Removing - remove from conversation context
              console.log('PreferencesScreen: Removing dietary preference from conversation context:', diet);
              removeConversationPreference('dietary', diet);
            } else {
              // Adding - add to conversation context
              console.log('PreferencesScreen: Adding dietary preference to conversation context:', diet);
              addConversationPreference('dietary', diet);
            }
            
            // Update global preferences - use updatePreferencesOnly to avoid conversation context conflicts
            const newPreferences = {
              dietaryRestrictions: newDiets,
              cuisines: selectedCuisines,
              classicDishes: Object.values(selectedDishes).flat(),
              plateStyles: selectedPlateStyles
            };
            
            updatePreferencesOnly(newPreferences);
          }}
          style={{ marginBottom: 24 }}
        />

        {/* Section: Cuisines & Classic Dishes */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <CustomText style={{ fontSize: 22, fontWeight: '700', color: '#5b6e61', flex: 1 }}>
            Classic Dishes Inspiration
          </CustomText>
        </View>
        <View style={{ borderRadius: 0, overflow: 'visible' }}>
          <View style={{ marginBottom: 24 }}>
            {cuisineData.map((cuisine, idx) => (
              <CuisineAccordion
                key={cuisine.name}
                title={cuisine.name}
                dishes={cuisine.dishes}
                isOpen={expandedCuisine === cuisine.name}
                onToggle={() => handleCuisineToggle(cuisine.name)}
                isChecked={selectedCuisines.includes(cuisine.name)}
                onCheckChange={() => handleCuisineCheck(cuisine.name, cuisine.dishes)}
                selectedDishes={selectedDishes[cuisine.name] || []}
                onDishCheck={(cuisine, dish, dishes) => {
              console.log('CuisineAccordion onDishCheck called:', { cuisine, dish, dishes });
              handleDishCheck(cuisine, dish, dishes);
            }}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    
    {/* Loading Spinner - Outside ScrollView for full screen coverage */}
    <LoadingSpinner visible={loading} />
    
    {/* Confirmation Modal - Outside ScrollView for proper positioning */}
    {showConfirmation && pendingPreferences && (
      <View style={styles.confirmationOverlay}>
        <View style={styles.confirmationCard}>
          <CustomText style={styles.confirmationTitle}>
            {hasCurrentDish ? 'Modify Current Recipe or Create New Dish?' : 'Create New Dish?'}
          </CustomText>
          <CustomText style={styles.confirmationMessage}>
            {pendingPreferences.message}
            {hasCurrentDish 
              ? '\n\nWould you like to modify your current recipe, or create a brand new dish?'
              : '\n\nThis will create a new dish with your selected preferences.'
            }
          </CustomText>
          <View style={[styles.confirmationButtons, hasCurrentDish && styles.confirmationButtonsThree]}>
            <TouchableOpacity 
              style={[styles.confirmationButton, styles.rejectButton]} 
              onPress={handleRejectPreferences}
              disabled={loading}
            >
              <CustomText style={styles.rejectButtonText}>Cancel</CustomText>
            </TouchableOpacity>
            {hasCurrentDish ? (
              <>
                <TouchableOpacity 
                  style={[styles.confirmationButton, styles.modifyButton]} 
                  onPress={() => handleConfirmPreferences('modify')}
                  disabled={loading}
                >
                  <CustomText style={styles.modifyButtonText}>
                    Modify Recipe
                  </CustomText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmationButton, styles.acceptButton]} 
                  onPress={() => handleConfirmPreferences('new')}
                  disabled={loading}
                >
                  <CustomText style={styles.acceptButtonText}>
                    Create New Dish
                  </CustomText>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={[styles.confirmationButton, styles.acceptButton]} 
                onPress={() => handleConfirmPreferences('new')}
                disabled={loading}
              >
                <CustomText style={styles.acceptButtonText}>
                  Create New Dish
                </CustomText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    )}
    </>
  );
}

const styles = StyleSheet.create({
  unifiedApplyContainer: {
    marginTop: 32,
    marginBottom: 24,
    alignItems: 'center',
  },
  unifiedApplyButton: {
    backgroundColor: '#d46e57',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unifiedApplyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#d46e57',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginLeft: 12,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 24,
  },
  sectionTitle: {
    color: '#4b6053',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    lineHeight: 28,
    marginBottom: 8,
    textAlign: 'left',
  },
  checkboxGroup: {
    marginBottom: 24,
  },
  cuisineGroup: {
    marginBottom: 24,
  },
  container: { flex: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#4b6053',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
  },
  emptySubtitle: {
    color: '#878f89',
    fontSize: 14,
    marginTop: 4,
  },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  pageTitleContainer: { marginBottom: 24 },
  pageTitle: {
    color: '#4b6053',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    lineHeight: 30,
    marginBottom: 10,
    textAlign: 'left',
  },
  pageSubtitle: {
    color: '#b6b7b3',
    fontSize: 15,
    fontFamily: 'Bitter_400Regular',
    marginTop: 0,
    marginBottom: 20,
    marginLeft: 0,
    textAlign: 'left',
  },
  cuisineContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cuisineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  dishesContainer: {
    paddingLeft: 44,
    paddingBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    marginBottom: 3.5,
    marginLeft: 0,
  },
  checkboxBase: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#bcbebb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#d46e57',
    borderColor: '#d46e57',
  },
  checkboxLabel: {
    color: '#687568',
    fontSize: 16,
    marginLeft: 12,
    lineHeight: 24,
  },
  cuisineHeaderChecked: {
    backgroundColor: '#d46e57',
  },
  cuisineTitle: {
    flex: 1,
    color: '#5b6e61',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dishLabel: {
    color: '#687568',
    fontSize: 16,
    marginLeft: 12,
  },
  accordionContainer: {
    //borderRadius: 16,
    //overflow: 'hidden',
    //backgroundColor: '#fff',
    //marginBottom: 12,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    marginLeft: 0,
    marginRight: 0,
    backgroundColor: '#fff',
  },
  accordionHeaderContent: {
    flex: 1,
  },
  accordionContent: {
    paddingLeft: 0,
    paddingBottom: 8,
  },
  mainCheckbox: {
    marginBottom: 0,
    marginLeft: 0,
  },
  subCheckbox: {
    marginLeft: 32,
    marginBottom: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  confirmationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  confirmationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmationTitle: {
    color: '#4b6053',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationMessage: {
    color: '#768178',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  confirmationButtonsThree: {
    flexDirection: 'column',
    gap: 8,
  },
  confirmationButton: {
    width: '80%',
    maxWidth: 320,
    marginVertical: 6,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'center',
  },
  rejectButton: {
    backgroundColor: '#fff',
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
  modifyButton: {
    backgroundColor: '#d46e57',
  },
  modifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // New styles for 2-column grid
  twoColumnGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    marginRight: 12,
  },
  gridCheckbox: {
    marginBottom: 8,
  },
  // Mix It button styles
  mixItButton: {
    backgroundColor: '#d46e57',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mixItButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Updated confirmation modal styles
  viewRecipeButton: {
    backgroundColor: '#C07B6A',
  },
  viewRecipeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveForLaterButton: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E5E7E5',
  },
  saveForLaterButtonText: {
    color: '#4A6B5A',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E5E7E5',
  },
  cancelButtonText: {
    color: '#4A6B5A',
    fontSize: 14,
    fontWeight: '600',
  },
  // Disabled button styles
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.7,
  },
});
