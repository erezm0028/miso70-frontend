import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';

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
    clearImageError,
    isGeneratingImage,
    isGeneratingDish
  } = useDish();
  const navigation = useNavigation();
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Debug loading state changes
  React.useEffect(() => {
    console.log('DishScreen - Loading states changed:');
    console.log('  - isGeneratingDish:', isGeneratingDish);
    console.log('  - isGeneratingImage:', isGeneratingImage);
    console.log('  - currentDish exists:', !!currentDish);
    if (currentDish) {
      console.log('  - currentDish.image:', currentDish.image ? 'Has image' : 'No image');
    }
  }, [isGeneratingDish, isGeneratingImage, currentDish]);

  const handleGenerateDish = async () => {
    clearImageError();
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
    try {
      // Save current dish to history before regenerating
      if (currentDish) {
        finalizeDish();
      }
      
      // Generate new dish with current preferences (don't clear them)
      console.log('DishScreen: Current preferences for re-dish:', preferences);
      console.log('DishScreen: Re-dish - Has dietary restrictions:', preferences.dietaryRestrictions?.length > 0);
      console.log('DishScreen: Re-dish - Has cuisines:', preferences.cuisines?.length > 0);
      console.log('DishScreen: Re-dish - Has plate styles:', preferences.plateStyles?.length > 0);
      console.log('DishScreen: Re-dish - Has classic dishes:', preferences.classicDishes?.length > 0);
      console.log('DishScreen: Re-dish - Has ingredient preferences:', preferences.ingredientPreferences?.length > 0);
      await generateDish(preferences);
    } catch (err) {
      // Error is handled by the context, no need to set local error
    }
  };

  const handleStartCooking = () => {
    // Finalize the dish before navigating to recipe
    if (currentDish) {
      finalizeDish();
    }
    
    if (currentDish && currentDish.recipe && Array.isArray(currentDish.recipe.ingredients) && currentDish.recipe.ingredients.length > 0) {
      navigation.navigate('Recipe' as never);
    } else {
      setShowConfirmation(true);
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
        <LoadingSpinner visible={isGeneratingDish || isGeneratingImage} />
        <Header />
        <ErrorScreen
          title="Oops! Something Went Wrong"
          message={imageError}
          onRetry={handleGenerateDish}
        />
      </SafeAreaView>
    );
  }

  // Empty state
  if (!currentDish) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
        <LoadingSpinner visible={isGeneratingDish || isGeneratingImage} />
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
      <LoadingSpinner visible={isGeneratingDish || isGeneratingImage} />
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
            {currentDish.image ? (
              <Image
                source={{ uri: currentDish.image }}
                style={styles.dishImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.dishImage, styles.imageLoadingContainer]}>
                <CustomText style={styles.imageLoadingText}>
                  {isGeneratingDish ? 'Generating your dish...' : 'Loading...'}
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
                    <FontAwesome name="share" size={16} color="#67756a" />
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
              
              {/* Removed preferences display */}
              
              <CustomText style={styles.dishHint}>
                Hit the Cook button to load the full dish info into the recipe tab.
              </CustomText>
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