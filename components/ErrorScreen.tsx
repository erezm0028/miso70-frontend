import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import CustomText from './CustomText';
import { FontAwesome } from '@expo/vector-icons';

interface ErrorScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

export default function ErrorScreen({ 
  title = "Oops! Something Went Wrong",
  message = "We couldn't load your dish. Please check your connection and try again, or explore other recipes.",
  onRetry,
  showRetryButton = true
}: ErrorScreenProps) {
  return (
    <View style={styles.container}>
      {/* Error Icon */}
      <View style={styles.iconContainer}>
        <FontAwesome name="exclamation-triangle" size={48} color="#d46e57" />
      </View>
      
      {/* Main Heading */}
      <CustomText style={styles.title}>{title}</CustomText>
      
      {/* Descriptive Text */}
      <CustomText style={styles.message}>{message}</CustomText>
      
      {/* Retry Button */}
      {showRetryButton && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <View style={styles.retryIcon}>
            <FontAwesome name="refresh" size={16} color="#4b6053" />
          </View>
          <CustomText style={styles.retryText}>Try Again</CustomText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#4b6053',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Bitter_700Bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 26,
  },
  message: {
    color: '#768178',
    fontSize: 16,
    fontFamily: 'Bitter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 300,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7e5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#4b6053',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Bitter_600SemiBold',
  },
}); 