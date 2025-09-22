import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import CustomText from '../components/CustomText';
import { FontAwesome } from '@expo/vector-icons';
import { useDish } from '../contexts/DishContext';
import { generateDish, generateShareText } from '../src/api'; // Adjust path if needed
import { Share } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorScreen from '../components/ErrorScreen';
import ContextTags from '../components/ContextTags';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ConfirmationModal from '../components/ConfirmationModal';

const screenWidth = Dimensions.get('window').width;


export default function DishScreen() {
  const { 
    currentDish, 
    generateDish, 
    preferences, 
    generateRecipeInfo, 
    finalizeDish, 
    clearPreferences, 
    setCurrentDish,
    clearConversationContext,
    clearChatMessages,
    imageError,
    setImageError,
    clearImageError,
    clearImageGeneration,
    isGeneratingImage,
    isGeneratingDish,
    setIsGeneratingDish,
    cookDish,
    regenerateDishWithContext,
    conversationContext,
    removeConversationPreference
  } = useDish();
  const navigation = useNavigation();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showStartFreshModal, setShowStartFreshModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [lastDishId, setLastDishId] = useState<string | null>(null);

  // Debug loading state changes
  useEffect(() => {
    console.log('DishScreen - Loading states changed:');
    console.log('  - isGeneratingDish:', isGeneratingDish);
    console.log('  - isGeneratingImage:', isGeneratingImage);
    console.log('  - imageLoaded:', imageLoaded);
    console.log('  - currentDish exists:', !!currentDish);
    if (currentDish) {
      console.log('  - currentDish.image:', currentDish.image ? 'Has image' : 'No image');
      console.log('  - currentDish.image URL:', currentDish.image);
      console.log('  - currentDish.title:', currentDish.title);
    }
    const shouldShowSpinner = isGeneratingDish || isGeneratingImage || (currentDish && !imageLoaded);
    console.log('  - Loading spinner visible:', shouldShowSpinner);
    console.log('  - Spinner reason:', {
      isGeneratingDish,
      isGeneratingImage,
      waitingForImageLoad: currentDish && !imageLoaded
    });
  }, [isGeneratingDish, isGeneratingImage, imageLoaded, currentDish]);

  // Reset image error and image loaded state when dish changes
  useEffect(() => {
    if (currentDish) {
      clearImageError(); // Clear any previous image errors
      
      // Check if this is a new dish or the same dish
      const isNewDish = lastDishId !== currentDish.id;
      
      if (isNewDish) {
        // For new dishes, reset image loaded state and wait for image to load
        setImageLoaded(false);
        setLastDishId(currentDish.id);
        
        // Preload the image if URL exists
        if (currentDish.image) {
          console.log('DishScreen: Preloading image for faster display...');
          Image.prefetch(currentDish.image)
            .then(() => {
              console.log('DishScreen: Image preloaded successfully');
            })
            .catch((error) => {
              console.log('DishScreen: Image preload failed:', error);
            });
        }
      } else {
        // For existing dishes (same ID), still wait for image to load to ensure spinner shows
        setImageLoaded(false);
      }
    }
  }, [currentDish?.id, currentDish?.image, clearImageError, lastDishId]);

  // Fallback timeout for image loading - if image doesn't load within 10 seconds, assume it's loaded
  useEffect(() => {
    if (currentDish && currentDish.image && !imageLoaded) {
      console.log('DishScreen: Setting up 10s fallback timeout for image loading');
      const timeoutId = setTimeout(() => {
        console.log('DishScreen: Image loading timeout reached, forcing imageLoaded=true');
        setImageLoaded(true);
        clearImageGeneration(); // Also clear the generation state
      }, 10000); // 10 second timeout

      return () => {
        console.log('DishScreen: Clearing image loading timeout');
        clearTimeout(timeoutId);
      };
    }
  }, [currentDish?.image, imageLoaded, clearImageGeneration]);

  const handleGenerateDish = async () => {
    clearImageError();
    setLastDishId(null); // Reset last dish ID to ensure new dish is treated as new
    try {
      // Generate dish with current preferences (preserve them)
      console.log('DishScreen: Current preferences before generation:', preferences);
      console.log('DishScreen: Has dietary restrictions:', preferences.dietaryRestrictions?.length > 0);
      console.log('DishScreen: Has cuisines:', preferences.cuisines?.length > 0);
      console.log('DishScreen: Has plate styles:', preferences.plateStyles?.length > 0);
      console.log('DishScreen: Has classic dishes:', preferences.classicDishes?.length > 0);
      console.log('DishScreen: Has ingredient preferences:', preferences.ingredientPreferences?.length > 0);
      await generateDish(preferences);
    } catch (err) {
      // Error is handled by the context, no need to set local error
    }
  };

  const handleReDish = async () => {
    clearImageError();
    setLastDishId(null); // Reset last dish ID to ensure regenerated dish is treated as new
    try {
      // Save current dish to history before regenerating
      if (currentDish) {
        finalizeDish();
      }
      

      
      // Use the new context-aware regeneration function
      console.log('DishScreen: Using context-aware re-dish generation');
      console.log('DishScreen: Current dish chat context:', currentDish?.chatContext);
      console.log('DishScreen: Current preferences for re-dish:', preferences);
      await regenerateDishWithContext();
    } catch (err) {
      // Error is handled by the context, no need to set local error
    }
  };

  const handleRemoveContext = (type: string, value: string) => {
    console.log('DishScreen: handleRemoveContext called with type:', type, 'value:', value);
    console.log('DishScreen: About to call removeConversationPreference');
    removeConversationPreference(type, value);
    console.log('DishScreen: removeConversationPreference called');
  };

  const handleStartCooking = async () => {
    if (!currentDish) return;
    
    console.log('DishScreen: handleStartCooking called for dish:', currentDish.title);
    console.log('DishScreen: Current recipe exists:', !!currentDish.recipe);
    console.log('DishScreen: Current recipe ingredients:', currentDish.recipe?.ingredients?.length || 0);
    
    // Always finalize dish and navigate first
    finalizeDish();
    navigation.navigate('Recipe' as never);
    
    // If recipe doesn't exist, generate it in background
    if (!currentDish.recipe || !Array.isArray(currentDish.recipe.ingredients) || currentDish.recipe.ingredients.length === 0) {
      console.log('DishScreen: Recipe not found, generating recipe in background...');
      
      try {
        // Generate recipe in background (don't set loading state here)
        await generateRecipeInfo(currentDish.title);
        console.log('DishScreen: Recipe generation completed in background');
      } catch (error) {
        console.error('Error generating recipe in background:', error);
        // Error will be handled by the Recipe screen's loading state
      }
    } else {
      // Recipe already exists
      console.log('DishScreen: Recipe exists, navigation complete');
    }
  };

  const handleConfirmStartCooking = async () => {
    setShowConfirmation(false);
    navigation.navigate('Recipe' as never);
  };

  const handleRejectStartCooking = () => {
    setShowConfirmation(false);
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

  // Show error screen if there's an error
  if (imageError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
        <Header />
        <ErrorScreen
          title="Oops! Something Went Wrong"
          message={imageError}
          onRetry={handleGenerateDish}
        />
      </SafeAreaView>
    );
  }

  // Loading state when generating a dish
  if (!currentDish && isGeneratingDish) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
        <LoadingSpinner visible={true} />
        <Header />
        <View style={styles.emptyContainer}>
          <View style={styles.circleButtonShadow}>
            <View style={styles.circleButton}>
              <CustomText style={styles.circleButtonText}>
                {"Cooking\nup..."}
              </CustomText>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state - only show if not generating a dish
  if (!currentDish && !isGeneratingDish) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
        <LoadingSpinner visible={isGeneratingDish || isGeneratingImage || (currentDish && !imageLoaded)} />
        <Header />
        <View style={styles.emptyContainer}>
          <View style={styles.circleButtonShadow}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={handleGenerateDish}
              activeOpacity={0.85}
            >
              <CustomText style={styles.circleButtonText}>
                {"Whats\ncookin'"}
              </CustomText>
            </TouchableOpacity>
          </View>
          
          {/* Show current context tags in empty state */}
          <ContextTags 
            chatContext={undefined}
            preferences={preferences}
            conversationContext={conversationContext}
            onRemoveContext={handleRemoveContext}
          />
          
          <View style={styles.emptySubtitleContainer}>
            <Text style={styles.emptySubtitle}>
              Remix cooking{' '}
              <Text 
                style={styles.linkText} 
                onPress={() => navigation.navigate('Preferences' as never)}
              >
                styles
              </Text>
              ,{' '}
              <Text 
                style={styles.linkText} 
                onPress={() => navigation.navigate('Preferences' as never)}
              >
                inspirations
              </Text>
              {' '}and{' '}
              <Text 
                style={styles.linkText} 
                onPress={() => navigation.navigate('Chat' as never)}
              >
                preferred ingredients
              </Text>
              {' '}—{'\n'}or just click above to get lucky.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

    // Content state
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
      <LoadingSpinner visible={isGeneratingDish || isGeneratingImage || (currentDish && !imageLoaded)} />
      <Header />
      <View style={styles.mainContainer}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {/* Dish Image */}
          <View style={styles.imageCard}>
            {currentDish.image && !imageError ? (
              <Image
                source={{ 
                  uri: currentDish.image,
                  cache: 'force-cache' // Enable aggressive caching
                }}
                style={styles.dishImage}
                resizeMode="cover"
                loadingIndicatorSource={{ uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }} // Transparent placeholder
                onLoad={() => {
                  console.log('DishScreen: Image onLoad called for:', currentDish?.title);
                  console.log('DishScreen: Image URL that loaded:', currentDish?.image);
                  if (imageError) {
                    clearImageError();
                  }
                  // Mark image as loaded - this will hide the main loading spinner
                  console.log('DishScreen: Setting imageLoaded=true');
                  setImageLoaded(true);
                  // Use requestAnimationFrame to ensure the image is fully rendered before clearing loading state
                  requestAnimationFrame(() => {
                    console.log('DishScreen: Calling clearImageGeneration()');
                    clearImageGeneration(); // Clear the image generation state when image loads
                  });
                }}
                onError={(error) => {
                  console.log('DishScreen: Image onError called:', error);
                  console.log('DishScreen: Image URL that failed:', currentDish?.image);
                  setImageError('Image not available');
                  setImageLoaded(true); // Clear loading state even if image fails
                }}
              />
            ) : (
              <View style={[styles.dishImage, styles.imageLoadingContainer]}>
                <CustomText style={styles.imageLoadingText}>
                  {isGeneratingDish || isGeneratingImage ? 'Generating your dish...' : 'Loading image...'}
                </CustomText>
              </View>
            )}
          </View>
            {/* Dish Info */}
            <View style={styles.infoSection}>
              <View style={styles.titleRow}>
                <CustomText style={styles.dishTitle}>{currentDish.title}</CustomText>
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
              <CustomText style={styles.dishDesc}>
                {currentDish.description}
              </CustomText>
              
              {/* Context Tags */}
              <ContextTags 
                chatContext={currentDish.chatContext}
                preferences={currentDish.preferences}
                conversationContext={conversationContext}
                onRemoveContext={handleRemoveContext}
              />
              

            </View>
          </ScrollView>
          {/* Fixed Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.buttonRowCentered}>
              <TouchableOpacity style={styles.redishButton} onPress={handleReDish} activeOpacity={0.85}>
                <CustomText style={styles.redishButtonText}>Re-dish</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cookCircleButton} onPress={handleStartCooking} activeOpacity={0.85}>
                <View style={styles.cookContentRow}>
                  <CustomText style={styles.cookCircleButtonText}>Cook</CustomText>
                  <View style={{ marginLeft: 6, marginTop: 1 }}>
                    <FontAwesome name="arrow-right" size={16} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Confirmation Modal */}
        {showConfirmation && (
          <View style={styles.confirmationOverlay}>
            <View style={styles.confirmationCard}>
              <CustomText style={styles.confirmationTitle}>
                Load Recipe Details?
              </CustomText>
              <CustomText style={styles.confirmationMessage}>
                This will load the full recipe information including ingredients, instructions, and nutrition details into the Recipe tab.
              </CustomText>
              <View style={styles.confirmationButtons}>
                <TouchableOpacity 
                  style={[styles.confirmationButton, styles.rejectButton]} 
                  onPress={handleRejectStartCooking}
                >
                  <CustomText style={styles.rejectButtonText}>Cancel</CustomText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmationButton, styles.acceptButton]} 
                  onPress={handleConfirmStartCooking}
                >
                  <CustomText style={styles.acceptButtonText}>
                    Load Recipe
                  </CustomText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        
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

const IMAGE_SIDE_MARGIN = 24; // matches header/logo margin

const styles = StyleSheet.create({
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  circleButtonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 25,
    elevation: 8,
    marginBottom: 40,
  },
  circleButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonText: {
    color: '#5b6e61',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
    fontFamily: 'Bitter_700Bold',
  },
  emptySubtitle: {
    color: '#b6b7b3',
    fontSize: 17,
    textAlign: 'center',
    marginTop: 36,
    lineHeight: 23,
    fontFamily: 'Bitter_400Regular',
  },
  emptySubtitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: '#5b6e61',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },

  // Content state
  mainContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 10,
  },
  buttonContainer: {
    paddingTop: 10,
    paddingBottom: 110,
    marginTop: -20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  imageCard: {
    width: screenWidth - IMAGE_SIDE_MARGIN * 3,
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eae2dc',
    backgroundColor: '#fff',
    marginTop: 0,
    marginBottom: 24,
    alignSelf: 'center',
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingContainer: {
    backgroundColor: '#f8f9f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLoadingText: {
    color: '#67756a',
    fontSize: 16,
    fontFamily: 'Bitter_400Regular',
    marginTop: 12,
    textAlign: 'center',
  },
  infoSection: {
    marginLeft: IMAGE_SIDE_MARGIN * 2,
    marginRight: IMAGE_SIDE_MARGIN * 1 + 16, // reduced margin to give more space for buttons
    marginBottom: 8,
    marginTop: -10,
  },
  dishTitle: {
    color: '#4b6053',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    lineHeight: 30,
    marginBottom: 4,
    marginLeft: -8,
    flex: 1, // Allow title to take available space
    marginRight: 12, // Add space between title and buttons
  },
  dishDesc: {
    color: '#4b6053',
    fontSize: 16,
    fontFamily: 'Bitter_700SemiBold',
    marginBottom: 8,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  dishHint: {
    color: '#b6b7b3',
    fontSize: 16,
    fontFamily: 'Bitter_400Regular',
    marginTop: 4,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 4,
  },
  redishButton: {
    backgroundColor: '#fff',
    borderColor: '#f3f4f6',
    borderWidth: 1,
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginRight: 0,
    paddingHorizontal: 0,
  },
  redishButtonText: {
    color: '#5b6e61',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    textAlign: 'center',
    lineHeight: 62,
  },
  cookButton: {
    backgroundColor: '#d46e57',
    borderRadius: 22,
    minWidth: 84,
    height: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d46e57',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
    paddingHorizontal: 13,
  },
  cookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
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
  buttonRowCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 36,
    marginTop: 4,
  },
  cookCircleButton: {
    backgroundColor: '#d46e57',
    borderColor: '#d46e57',
    borderWidth: 2,
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    shadowColor: '#d46e57',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
    marginLeft: 0,
    paddingHorizontal: 0,
  },
  cookCircleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  cookContentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  cookContentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingRight: 8, // Add some padding to prevent buttons from being cut off
  },

  titleButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0, // Prevent buttons from shrinking
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
    marginTop: 0,
  },
  // Preferences indicator styles
  preferencesIndicator: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7e5',
  },
  preferencesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5b6e61',
    marginBottom: 8,
    fontFamily: 'Bitter_600SemiBold',
  },
  preferencesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  preferenceTag: {
    backgroundColor: '#d46e57',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  preferenceTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Bitter_500Medium',
  },

});