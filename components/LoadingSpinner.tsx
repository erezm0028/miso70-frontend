import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import CustomText from './CustomText';

const screenWidth = Dimensions.get('window').width;

interface LoadingSpinnerProps {
  visible?: boolean;
}

export default function LoadingSpinner({ visible = false }: LoadingSpinnerProps) {
  const steamAnim1 = useRef(new Animated.Value(0)).current;
  const steamAnim2 = useRef(new Animated.Value(0)).current;
  const steamAnim3 = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Steam animation - each steam line rises at different times
    const steam1 = Animated.loop(
      Animated.sequence([
        Animated.timing(steamAnim1, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(steamAnim1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const steam2 = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(steamAnim2, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(steamAnim2, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const steam3 = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(steamAnim3, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(steamAnim3, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Progress bar animation
    const progress = Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    );

    steam1.start();
    steam2.start();
    steam3.start();
    progress.start();

    return () => {
      steam1.stop();
      steam2.stop();
      steam3.stop();
      progress.stop();
    };
  }, [visible, steamAnim1, steamAnim2, steamAnim3, progressAnim]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.loadingContainer}>
        {/* Cooking Pot Icon */}
        <View style={styles.potContainer}>
          {/* Steam Lines */}
          <View style={styles.steamContainer}>
            <Animated.View 
              style={[
                styles.steamLine,
                {
                  transform: [
                    {
                      translateY: steamAnim1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }),
                    },
                  ],
                  opacity: steamAnim1.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            />
            <Animated.View 
              style={[
                styles.steamLine,
                {
                  transform: [
                    {
                      translateY: steamAnim2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }),
                    },
                  ],
                  opacity: steamAnim2.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            />
            <Animated.View 
              style={[
                styles.steamLine,
                {
                  transform: [
                    {
                      translateY: steamAnim3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }),
                    },
                  ],
                  opacity: steamAnim3.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            />
          </View>
          
          {/* Pot Body */}
          <View style={styles.pot}>
            {/* Pot Handles */}
            <View style={[styles.handle, { left: -7 }]} />
            <View style={[styles.handle, { right: -7 }]} />
          </View>
        </View>

        {/* Text Content */}
        <CustomText style={styles.mainText}>Simmering Something Good...</CustomText>
        <CustomText style={styles.subText}>Serving up in just a sec</CustomText>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View 
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  potContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  steamContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 30,
    marginBottom: 8,
  },
  steamLine: {
    width: 3,
    height: 12,
    backgroundColor: '#b6b7b3',
    marginHorizontal: 4,
    borderRadius: 2,
  },
  pot: {
    width: 60,
    height: 40,
    backgroundColor: '#4b6053',
    borderRadius: 8,
    position: 'relative',
    marginLeft: -4, // Move pot slightly to the left to center it
  },
  handle: {
    position: 'absolute',
    width: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4b6053',
    borderWidth: 2,
    borderColor: '#fff',
    top: 16,
  },
  mainText: {
    color: '#4b6053',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    color: '#768178',
    fontSize: 16,
    fontFamily: 'Bitter_400Regular',
    textAlign: 'center',
    marginBottom: 40,
  },
  progressContainer: {
    width: screenWidth * 0.6,
    height: 3,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4b6053',
    borderRadius: 2,
  },
}); 